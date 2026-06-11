import * as THREE from 'three';
import { FACEMESH_LANDMARK_COUNT, type LandmarkStream } from './FaceTracker';
import { FaceMeshBuilder } from './FaceMeshBuilder';
import { FaceTextureCompositor } from './FaceTextureCompositor';

export interface AvatarRendererOptions {
  // How strongly audio energy opens the jaw (in normalized face units).
  jawOpenAmount: number;
  // Light Laplacian smoothing iterations to suppress landmark noise.
  // 0 disables (faster, but more "polygon jitter" under tracking noise).
  smoothingIterations: number;
  // Smoothing blend [0..1]. Typical range: 0.08–0.22.
  smoothingAlpha: number;
  // Video fuente para textura UV en vivo (webcam).
  videoElement?: HTMLVideoElement;
  // MediaPipe selfieMode: invierte U del UV para alinear con píxeles del video.
  selfieMode?: boolean;
  // Anisotropía de la textura (calidad en ángulo).
  textureAnisotropy?: number;
}

/**
 * AvatarRenderer
 * - Owns a THREE.Mesh built from the procedural FaceMeshBuilder geometry.
 * - Updates vertex positions in real time (landmark-driven deformation).
 * - Applies audio-driven mouth/jaw deformation for speech emphasis.
 * - Applies blink deformation driven by eyelid landmark ratios.
 * - Recomputes normals efficiently for smooth shading.
 *
 * WebRTC-ready design:
 * - This class consumes a `LandmarkStream` interface, not MediaPipe directly.
 * - Local and remote users can be added without refactoring avatar deformation logic.
 */
export class AvatarRenderer {
  public readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  private readonly builder: FaceMeshBuilder;
  private readonly jawOpenAmount: number;
  private readonly smoothingIterations: number;
  private readonly smoothingAlpha: number;
  private uvSelfieMode: boolean;
  private readonly faceCompositor: FaceTextureCompositor;
  private faceTextureSource: HTMLVideoElement | null;
  private lastLandmarks2D: { x: number; y: number }[] | null = null;

  // We cache the last valid landmark frame so rendering can continue briefly through dropouts.
  private readonly lastLandmarks = new Float32Array(FACEMESH_LANDMARK_COUNT * 3);
  private hasLast = false;

  // Blink state smoothing (avoids twitchy eyelids).
  private blinkL = 0;
  private blinkR = 0;

  public constructor(builder: FaceMeshBuilder, options: AvatarRendererOptions) {
    this.builder = builder;
    this.jawOpenAmount = Math.max(0, options.jawOpenAmount);
    this.smoothingIterations = clampInt(options.smoothingIterations, 0, 4);
    this.smoothingAlpha = clamp01(options.smoothingAlpha);
    this.uvSelfieMode = options.selfieMode ?? true;

    this.faceTextureSource = options.videoElement ?? null;
    this.faceCompositor = new FaceTextureCompositor(this.uvSelfieMode);
    this.faceCompositor.setVideoSource(this.faceTextureSource);
    if (options.textureAnisotropy) {
      this.faceCompositor.setAnisotropy(options.textureAnisotropy);
    }

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: this.faceCompositor.texture,
      metalness: 0.0,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(builder.geometry, material);
    this.mesh.frustumCulled = false;
  }

  /**
   * Updates from a generic landmark stream (local MediaPipe now; WebRTC remote later).
   * If the stream is inactive for a frame, we keep the last valid mesh.
   */
  public updateFromStream(stream: LandmarkStream, audioEnergy: number): void {
    const lm = stream.getLatestLandmarks();
    const landmarksToUse = lm ?? (this.hasLast ? this.lastLandmarks : null);
    if (!landmarksToUse) return;

    // Cache last valid landmarks so transient drops don't "explode" the mesh.
    if (lm) {
      this.lastLandmarks.set(lm);
      this.hasLast = true;
    }

    // Derive blink from eyelid ratios BEFORE any mesh smoothing (more robust).
    // 0 = open, 1 = closed
    const targetBlinkL = blinkFromEye(landmarksToUse, 33, 133, 159, 145);
    const targetBlinkR = blinkFromEye(landmarksToUse, 263, 362, 386, 374);
    this.updateBlinkState(targetBlinkL, targetBlinkR);

    // Base geometry update: pass both 3D positions and original 2D landmarks for correct UVs
    // landmarksToUse: Float32Array (3D positions)
    // originalLandmarks2D: {x, y}[] (from MediaPipe, in [0,1])
    // We expect the caller to provide both; if not available, skip update
    const originalLandmarks2D = stream.getLatestLandmarks2D();
    if (landmarksToUse) {
      this.builder.setPositionsFromLandmarks(landmarksToUse);
    }

    // Optional Laplacian smoothing for more continuous, skin-like surface.
    this.builder.smoothPositions(this.smoothingIterations, this.smoothingAlpha);

    // Deformations (in-place, allocation-free).
    const energy = clamp01(audioEnergy);
    this.applyBlinkDeformation(this.blinkL, this.blinkR);
    this.applyAudioLipDeformation(energy);
    this.applyAudioJawDeformation(energy);

    // UV al final: proyección 1:1 con el frame de video (máxima fidelidad).
    if (originalLandmarks2D) {
      this.lastLandmarks2D = [...originalLandmarks2D];
      this.builder.setUvsFromLandmarks2D(this.lastLandmarks2D, {
        selfieMode: this.uvSelfieMode
      });
    }

    // Update normals for smooth shading (cheap at this mesh size).
    this.builder.recomputeNormals();
  }

  /** Actualiza la textura de video cada frame (independiente del mesh). */
  public updateFaceTexture(landmarks2D?: ReadonlyArray<{ x: number; y: number }> | null): void {
    if (landmarks2D && landmarks2D.length >= 468) {
      this.lastLandmarks2D = landmarks2D.map((lm) => ({ x: lm.x, y: lm.y }));
    }
    this.faceCompositor.update(this.lastLandmarks2D);
    // If the compositor recreated its CanvasTexture (on resize), make sure
    // the mesh material uses the new texture object.
    const mat = this.mesh.material as THREE.MeshStandardMaterial;
    if (mat.map !== this.faceCompositor.texture) {
      mat.map = this.faceCompositor.texture;
    }
    if (mat.map) {
      mat.map.needsUpdate = true;
      mat.needsUpdate = true;
    }
  }

  private updateBlinkState(targetL: number, targetR: number): void {
    // Exponential smoothing to remove eyelid jitter while preserving blink speed.
    // A higher alpha gives smoother but slower blinks.
    const a = 0.85;
    this.blinkL = a * this.blinkL + (1 - a) * targetL;
    this.blinkR = a * this.blinkR + (1 - a) * targetR;
  }

  private applyAudioJawDeformation(energy: number): void {
    if (energy <= 1e-5 || this.jawOpenAmount <= 1e-8) return;

    // Positions are stored in the BufferAttribute array. We mutate in-place.
    const pos = this.builder.position.array as Float32Array;

    // Estimate mouth Y level from two stable lip landmarks:
    // 13 = upper inner lip, 14 = lower inner lip (MediaPipe indexing).
    const mouthY = 0.5 * (pos[3 * 13 + 1]! + pos[3 * 14 + 1]!);

    // Jaw influence region: vertices below mouth line are affected smoothly.
    // We use a smoothstep on the distance below mouthY:
    //   t = clamp((mouthY - y) / jawRange, 0..1)
    // where jawRange is a tunable "height" of the lower face region in model units.
    const jawRange = 0.85; // empirically stable after FaceTracker's eye-distance normalization
    const amount = this.jawOpenAmount * energy;

    for (let i = 0; i < FACEMESH_LANDMARK_COUNT; i++) {
      const bi = 3 * i;
      const y = pos[bi + 1]!;

      const t = clamp01((mouthY - y) / jawRange);
      if (t <= 0) continue;

      // Smoothstep for C1 continuity: t^2 (3 - 2t)
      const s = t * t * (3 - 2 * t);

      // Downward jaw motion: -Y opens the mouth in our coordinate convention (+Y up).
      pos[bi + 1] = y - amount * s;

      // Small forward bias improves the perception of jaw rotation.
      pos[bi + 2] = pos[bi + 2]! + 0.08 * amount * s;
    }

    this.builder.position.needsUpdate = true;
  }

  private applyAudioLipDeformation(energy: number): void {
    if (energy <= 1e-5) return;
    const pos = this.builder.position.array as Float32Array;

    // Mouth landmarks (MediaPipe indexing):
    // 13: upper inner lip, 14: lower inner lip, 61/291: mouth corners.
    const iUpper = 13;
    const iLower = 14;
    const iLeftCorner = 61;
    const iRightCorner = 291;

    const u = 3 * iUpper;
    const l = 3 * iLower;
    const lc = 3 * iLeftCorner;
    const rc = 3 * iRightCorner;

    const lcX = pos[lc]!;
    const lcY = pos[lc + 1]!;
    const lcZ = pos[lc + 2]!;
    const rcX = pos[rc]!;
    const rcY = pos[rc + 1]!;
    const rcZ = pos[rc + 2]!;

    const uX = pos[u]!;
    const uY = pos[u + 1]!;
    const uZ = pos[u + 2]!;
    const lX = pos[l]!;
    const lY = pos[l + 1]!;
    const lZ = pos[l + 2]!;

    const mouthCenterX = 0.5 * (lcX + rcX);
    const mouthCenterY = 0.5 * (lcY + rcY);
    const mouthCenterZ = 0.5 * (lcZ + rcZ);

    // Open mouth vertically and slightly forward. Values are tuned for the normalized face space.
    const open = 0.10 * energy;
    pos[u + 1] = uY + 0.35 * open; // upper lip up (small)
    pos[l + 1] = lY - 1.0 * open; // lower lip down (larger)
    pos[l + 2] = lZ + 0.06 * open; // forward bias for perceived jaw rotation

    // Widen corners slightly (speech articulation cue).
    const widen = 0.06 * energy;
    pos[lc] = lcX + (lcX - mouthCenterX) * widen;
    pos[rc] = rcX + (rcX - mouthCenterX) * widen;
    pos[lc + 1] = lcY + (lcY - mouthCenterY) * (0.02 * energy);
    pos[rc + 1] = rcY + (rcY - mouthCenterY) * (0.02 * energy);

    // Small forward shift for the mouth region to avoid "flat mask" look.
    pos[u] = uX + (uX - mouthCenterX) * (0.01 * energy);
    pos[l] = lX + (lX - mouthCenterX) * (0.01 * energy);

    pos[u + 1] = (pos[u + 1] ?? uY) + ((pos[u + 1] ?? uY) - mouthCenterY) * (0.01 * energy);
    pos[l + 1] = (pos[l + 1] ?? lY) + ((pos[l + 1] ?? lY) - mouthCenterY) * (0.01 * energy);

    pos[u + 2] = (uZ + 0.04 * open) + ((uZ + 0.04 * open) - mouthCenterZ) * (0.01 * energy);
    pos[l + 2] = (pos[l + 2] ?? lZ) + ((pos[l + 2] ?? lZ) - mouthCenterZ) * (0.01 * energy);

    this.builder.position.needsUpdate = true;
  }

  private applyBlinkDeformation(blinkL: number, blinkR: number): void {
    // blink: 0 = open, 1 = closed
    if (blinkL <= 1e-4 && blinkR <= 1e-4) return;
    const pos = this.builder.position.array as Float32Array;

    // Compute eye centers from corners (stable anchors).
    const lcA = 3 * 33;
    const lcB = 3 * 133;
    const leftCx = 0.5 * (pos[lcA]! + pos[lcB]!);
    const leftCy = 0.5 * (pos[lcA + 1]! + pos[lcB + 1]!);
    const leftCz = 0.5 * (pos[lcA + 2]! + pos[lcB + 2]!);

    const rcA = 3 * 263;
    const rcB = 3 * 362;
    const rightCx = 0.5 * (pos[rcA]! + pos[rcB]!);
    const rightCy = 0.5 * (pos[rcA + 1]! + pos[rcB + 1]!);
    const rightCz = 0.5 * (pos[rcA + 2]! + pos[rcB + 2]!);

    // Closing motion scales vertical distance from center. Upper eyelid moves more than lower.
    deformEyeRing(pos, leftCx, leftCy, leftCz, blinkL, LEFT_EYE_RING);
    deformEyeRing(pos, rightCx, rightCy, rightCz, blinkR, RIGHT_EYE_RING);

    this.builder.position.needsUpdate = true;
  }

  /** Cambia la fuente de video para el UV map (remoto del otro peer). */
  public setFaceTextureSource(video: HTMLVideoElement | null, selfieMode = true): void {
    this.faceTextureSource = video;
    this.uvSelfieMode = selfieMode;
    this.faceCompositor.setVideoSource(video);
    this.faceCompositor.setSelfieMode(selfieMode);
  }

  public updateFromVertices(vertices: Float32Array): void {
    const pos = this.mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.length; i++) {
      pos.array[i] = vertices[i] * 0.01;
    }
    pos.needsUpdate = true;
  }
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function clampInt(v: number, min: number, max: number): number {
  if (v < min) return min;
  if (v > max) return max;
  return v | 0;
}

// ---------------------------
// Blink model (landmark-driven)
// ---------------------------

// Eye ring indices (MediaPipe FaceMesh, 468-landmark model).
// These are the standard eye contour landmarks used across many FaceMesh implementations.
const LEFT_EYE_RING: ReadonlyArray<number> = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
const RIGHT_EYE_RING: ReadonlyArray<number> = [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466];

function blinkFromEye(lm: Float32Array, cornerA: number, cornerB: number, lidUpper: number, lidLower: number): number {
  const ax = lm[3 * cornerA]!;
  const ay = lm[3 * cornerA + 1]!;
  const az = lm[3 * cornerA + 2]!;
  const bx = lm[3 * cornerB]!;
  const by = lm[3 * cornerB + 1]!;
  const bz = lm[3 * cornerB + 2]!;

  const ux = lm[3 * lidUpper]!;
  const uy = lm[3 * lidUpper + 1]!;
  const uz = lm[3 * lidUpper + 2]!;
  const lx = lm[3 * lidLower]!;
  const ly = lm[3 * lidLower + 1]!;
  const lz = lm[3 * lidLower + 2]!;

  const eyeWidth = dist3(ax, ay, az, bx, by, bz);
  const lidGap = dist3(ux, uy, uz, lx, ly, lz);
  const openness = eyeWidth > 1e-6 ? lidGap / eyeWidth : 0;

  // Thresholds tuned for the normalized coordinate space from FaceTracker:
  // - openness ~0.30–0.38: eyes open
  // - openness ~0.08–0.12: eyes closed
  const openT = 0.32;
  const closedT = 0.11;

  // Map openness to [0..1] closure:
  // open -> 0, closed -> 1
  const t = clamp01((openness - closedT) / Math.max(1e-6, openT - closedT));
  const blink = 1.0 - t;
  // Smooth nonlinearity: emphasizes fully closed states during a blink.
  return blink * blink;
}

function dist3(ax: number, ay: number, az: number, bx: number, by: number, bz: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function deformEyeRing(pos: Float32Array, cx: number, cy: number, cz: number, blink: number, ring: ReadonlyArray<number>): void {
  if (blink <= 1e-6) return;

  // Vertical compression around eye center.
  // Upper lid is weighted more than lower lid to mimic natural blinking.
  const upperStrength = 0.92 * blink;
  const lowerStrength = 0.62 * blink;

  // Slight backward motion during closure improves perceived depth (eyelids "wrap" around eyeball).
  const back = 0.03 * blink;

  for (let k = 0; k < ring.length; k++) {
    const i = ring[k]!;
    const bi = 3 * i;
    const x = pos[bi]!;
    const y = pos[bi + 1]!;
    const z = pos[bi + 2]!;

    const dy = y - cy;
    const s = dy >= 0 ? upperStrength : lowerStrength;
    pos[bi + 1] = cy + dy * (1 - s);

    // Pull slightly toward eye center in Z to reduce "lid floating" artifacts.
    pos[bi + 2] = z - back + 0.15 * back * (cz - z);

    // Mild X pull reduces corner tearing under extreme blinks.
    pos[bi] = cx + (x - cx) * (1 - 0.12 * blink);
  }
}
