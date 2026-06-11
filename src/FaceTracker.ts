  // Últimos landmarks 2D originales (MediaPipe)
// Types from MediaPipe FaceMesh (imported dynamically in init())
  // Types from MediaPipe FaceMesh (imported dynamically in init())
  import type { NormalizedLandmark, Results } from '@mediapipe/face_mesh';

export const FACEMESH_LANDMARK_COUNT = 468;

// Adjustable vertical offset (higher = avatar moves up). Tweak this value as needed.
// Start with a stronger offset; increase if avatar still sits too low in the viewport.
// Negative values move the avatar down; make it strongly negative for "super abajo".

export interface FaceTrackerOptions {
  // Temporal smoothing of landmark positions to reduce jitter.
  // 0 = no smoothing, 0.7–0.9 = stable but responsive.
  landmarkSmoothing: number;
  // If true, MediaPipe adds iris landmarks (not used here). Keeping false is faster.
  refineLandmarks: boolean;
  // For most "selfie" experiences we want mirrored behavior.
  selfieMode: boolean;
}

/**
 * LandmarkStream
 *
 * A minimal, WebRTC-ready abstraction for feeding avatars:
 * - **Local**: produced by `FaceTracker` (MediaPipe).
 * - **Remote (future)**: produced by a WebRTC DataChannel receiver that fills a Float32Array.
 *
 * The key architectural property is that the consumer (the avatar) depends only on this
 * interface, not on MediaPipe nor webcam state.
 */
export interface LandmarkStream {
  readonly id: string;
  readonly landmarkCount: number;
  /**
   * Returns the latest landmarks buffer (packed xyzxyz...) or null if not active.
   * Implementations should return a stable, internally-owned buffer to avoid per-frame allocations.
   */
  getLatestLandmarks(): Float32Array | null;
  /**
   * Landmarks 2D originales de MediaPipe [0..1] para mapeo UV sobre textura de video.
   */
  getLatestLandmarks2D(): ReadonlyArray<{ x: number; y: number }> | null;
  isActive(): boolean;
}

/**
 * FaceTracker: wraps MediaPipe FaceMesh and outputs a normalized landmark buffer every time
 * MediaPipe produces a result.
 *
 * Output convention (per landmark i):
 * - xyz are in a **face-centered** coordinate system
 * - units are arbitrary but scaled to keep a consistent head size (based on inter-ocular distance)
 * - +X is to the right, +Y is up, +Z is forward (towards the camera)
 */
export class FaceTracker implements LandmarkStream {
  private faceMesh: FaceMesh | null = null;
  private readonly smoothing: number;
  private readonly refineLandmarks: boolean;
  private readonly selfieMode: boolean;

  // Últimos landmarks 2D originales (MediaPipe)
  public latestLandmarks2D: { x: number; y: number }[] = [];
  // Latest normalized and smoothed landmarks, packed xyzxyz...
  private readonly landmarks = new Float32Array(FACEMESH_LANDMARK_COUNT * 3);
  private hasFace = false;
  private inFlight = false;
  // Reused input object for `faceMesh.send(...)` to avoid per-frame allocations.
  private readonly sendInput: { image: CanvasImageSource } = { image: null as unknown as CanvasImageSource };

  // "Pose" stabilizers for face-centric normalization.
  // These are smoothed separately from per-vertex smoothing to reduce apparent jitter in scale/translation.
  private poseScale = 1;
  private poseCx = 0;
  private poseCy = 0;
  private poseCz = 0;

  public readonly id: string;
  public readonly landmarkCount = FACEMESH_LANDMARK_COUNT;

  public onFaceData?: (data: any) => void;

  // Serializes raw face detection results into transmittable format
  public serializeFace(results: any): any {
    if (!results.multiFaceLandmarks?.[0]) return null;
    return {
      t: performance.now(),
      landmarks: results.multiFaceLandmarks[0],
      rotation: results.faceLandmarks ? { yaw: 0, pitch: 0, roll: 0 } : undefined
    };
  }

  public constructor(options: FaceTrackerOptions & { id?: string }) {
    this.id = options.id ?? 'local';
    this.smoothing = clamp01(options.landmarkSmoothing);
    this.refineLandmarks = options.refineLandmarks;
    this.selfieMode = options.selfieMode;
  }

  public get isTracking(): boolean {
    return this.hasFace;
  }

  public getLandmarks(): Float32Array {
    return this.landmarks;
  }

  public getLatestLandmarks(): Float32Array | null {
    return this.hasFace ? this.landmarks : null;
  }

  public getLatestLandmarks2D(): ReadonlyArray<{ x: number; y: number }> | null {
    return this.hasFace && this.latestLandmarks2D.length > 0 ? this.latestLandmarks2D : null;
  }

  public isActive(): boolean {
    return this.hasFace;
  }

  public async init(): Promise<void> {
    this.dispose();

    // Use unpkg.com for better UMD module support
    const cdnBase = 'https://unpkg.com/@mediapipe/face_mesh@0.4.1633559619/';

    // Load the UMD bundle
    await this.loadScript(cdnBase + 'face_mesh.js');

    // Get FaceMesh from global window object
    const FaceMeshClass = (window as any).FaceMesh;
    if (!FaceMeshClass) {
      throw new Error('Failed to load FaceMesh: window.FaceMesh is not defined');
    }

    const faceMesh = new FaceMeshClass({
      locateFile: (file: string) => `${cdnBase}${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: this.refineLandmarks,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6,
      selfieMode: this.selfieMode
    });

    faceMesh.onResults((results: Results) => this.onResults(results));
    this.faceMesh = faceMesh;
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.defer = true;
      
      const timeoutId = setTimeout(() => {
        document.head.removeChild(script);
        reject(new Error(`Timeout loading script: ${src}`));
      }, 30000);
      
      script.onload = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      script.onerror = () => {
        clearTimeout(timeoutId);
        document.head.removeChild(script);
        reject(new Error(`Failed to load script: ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  public dispose(): void {
    if (this.faceMesh) {
      this.faceMesh.close();
    }
    this.faceMesh = null;
    this.hasFace = false;
    this.inFlight = false;
    this.poseScale = 1;
    this.poseCx = 0;
    this.poseCy = 0;
    this.poseCz = 0;
    this.landmarks.fill(0);
  }

  /**
   * Triggers FaceMesh inference on the provided video frame.
   * This is async and relatively expensive; call it at most once per rendered frame.
   */
  public async processFrame(video: HTMLVideoElement): Promise<void> {
    const faceMesh = this.faceMesh;
    if (!faceMesh) throw new Error('FaceTracker.init() must be called before processFrame().');

    // Avoid queueing async work. If inference is still running, skip this frame.
    if (this.inFlight) return;
    if (video.readyState < 2) return; // not enough data

    this.inFlight = true;
    try {
      // Avoid per-frame object allocation: reuse the same input object.
      this.sendInput.image = video;
      await faceMesh.send(this.sendInput);
    } finally {
      this.inFlight = false;
    }
  }

  private onResults(results: Results): void {
    const face = results.multiFaceLandmarks?.[0];
    if (!face || face.length < FACEMESH_LANDMARK_COUNT) {
      this.hasFace = false;
      this.latestLandmarks2D = [];
      return;
    }
  // Guardar landmarks 2D originales para UVs
  this.latestLandmarks2D = face.map(lm => ({ x: lm.x, y: lm.y }));

    // We normalize landmarks into a stable "model space":
    // 1) Convert from image-normalized coordinates to an aspect-correct centered space.
    // 2) Compute a per-frame face scale using inter-ocular distance (33 ↔ 263).
    // 3) Recenter around a stable point (nose bridge: 168).
    //
    // This yields a consistent mesh size regardless of how close the face is to the camera.
    const imgW = getImageWidth(results.image);
    const imgH = getImageHeight(results.image);
    const aspect = imgW / Math.max(1, imgH);

    // Landmark normalization (allocation-free):
    // x = (lm.x - 0.5) * aspect
    // y = -(lm.y - 0.5)
    // z = -lm.z
    const lm33 = face[33] as NormalizedLandmark;
    const lm263 = face[263] as NormalizedLandmark;
    const x33 = (lm33.x - 0.5) * aspect;
    const y33 = -(lm33.y - 0.5);
    const x263 = (lm263.x - 0.5) * aspect;
    const y263 = -(lm263.y - 0.5);

    const dxEye = x33 - x263;
    const dyEye = y33 - y263;
    const eyeDist = Math.sqrt(dxEye * dxEye + dyEye * dyEye);
    // Normalize so the eye-to-eye distance is approximately 1.0 unit.
    // This provides a natural "unit scale" for the avatar regardless of webcam resolution.
    const rawScale = eyeDist > 1e-5 ? (0.45 / eyeDist) : 0.45;

    const lmCenter = face[168] as NormalizedLandmark;
    const centerX = (lmCenter.x - 0.5) * aspect;
    const centerY = -(lmCenter.y - 0.5);
    const centerZ = -lmCenter.z;

    const rawCx = centerX * rawScale;
    const rawCy = centerY * rawScale;
    const rawCz = centerZ * rawScale;

    // Smooth the pose normalization parameters to reduce visible jitter in scale/translation.
    // We use a slightly stronger smoothing than per-vertex smoothing to avoid "breathing" artifacts.
    const poseA = clamp01(Math.min(0.92, this.smoothing + 0.12));
    this.poseScale = poseA * this.poseScale + (1 - poseA) * rawScale;
    this.poseCx = poseA * this.poseCx + (1 - poseA) * rawCx;
    this.poseCy = poseA * this.poseCy + (1 - poseA) * rawCy;
    this.poseCz = poseA * this.poseCz + (1 - poseA) * rawCz;

    const scale = this.poseScale;
    const cx = this.poseCx;
    const cy = this.poseCy;
    const cz = this.poseCz;

    // Update smoothed landmark buffer in-place. No allocations in the hot path.
    for (let i = 0; i < FACEMESH_LANDMARK_COUNT; i++) {
      const lm = face[i] as NormalizedLandmark;
      const nx = (lm.x - 0.5) * aspect;
      const ny = -(lm.y - 0.5);
      const nz = -lm.z;

      const x = nx * scale - cx;
      const y = ny * scale - cy;
      const z = nz * scale - cz;

      const bi = 3 * i;
      // Exponential smoothing per component:
      // out = a*out + (1-a)*in
      const a = this.smoothing;
      this.landmarks[bi + 0] = a * this.landmarks[bi + 0]! + (1 - a) * x;
      this.landmarks[bi + 1] = a * this.landmarks[bi + 1]! + (1 - a) * y;
      this.landmarks[bi + 2] = a * this.landmarks[bi + 2]! + (1 - a) * z;
    }

    this.hasFace = true;

    // Invoke face data callback if registered (useful for sending landmarks via WebRTC DataChannel)
    if (this.onFaceData && results.multiFaceLandmarks?.[0]) {
      const faceData = {
        t: performance.now(),
        landmarks: results.multiFaceLandmarks[0]
      };
      this.onFaceData(faceData);
    }
  }
}

function clamp01(v: number): number {
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function getImageWidth(img: CanvasImageSource): number {
  // CanvasImageSource is a union, so we duck-type.
  const anyImg = img as unknown as { videoWidth?: number; width?: number; naturalWidth?: number };
  return anyImg.videoWidth ?? anyImg.naturalWidth ?? anyImg.width ?? 1;
}

function getImageHeight(img: CanvasImageSource): number {
  const anyImg = img as unknown as { videoHeight?: number; height?: number; naturalHeight?: number };
  return anyImg.videoHeight ?? anyImg.naturalHeight ?? anyImg.height ?? 1;
}


