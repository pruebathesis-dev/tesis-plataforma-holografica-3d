import * as THREE from 'three';
import { createIrisTexture, createScleraTexture } from './ProceduralTextures';

interface Landmark2D {
  x: number;
  y: number;
}

/**
 * Textura facial en resolución nativa del video (1:1 píxeles).
 * Ojos procedurales (iris/esclerótica) + post-procesado suave del frame de video.
 */
export class FaceTextureCompositor {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  public texture: THREE.CanvasTexture;
  private video: HTMLVideoElement | null = null;
  private selfieMode: boolean;
  private lastLandmarks2D: Landmark2D[] | null = null;
  private lastVideoTime = -1;
  private lastFrameReceivedAt = 0;
  private rvfcHandle: number | null = null;
  private pollHandle: number | null = null;
  private readonly irisCanvas: HTMLCanvasElement;
  private readonly scleraCanvas: HTMLCanvasElement;
  public constructor(selfieMode = true) {
    this.selfieMode = selfieMode;
    this.canvas = document.createElement('canvas');
    this.canvas.width = 640;
    this.canvas.height = 480;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    this.irisCanvas = createIrisTexture(218, 48, 256).image as HTMLCanvasElement;
    this.scleraCanvas = createScleraTexture(256).image as HTMLCanvasElement;

    paintDarkPlaceholder(this.ctx, this.canvas.width, this.canvas.height);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
  }

  /** Indica si hay frames de video recientes (para evitar material blanco sin textura). */
  public get hasActiveFrame(): boolean {
    if (!this.video || this.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
    return performance.now() - this.lastFrameReceivedAt < 250;
  }

  public setAnisotropy(value: number): void {
    this.texture.anisotropy = value;
  }

  public setVideoSource(video: HTMLVideoElement | null): void {
    this.stopFrameMonitor();
    this.video = video;
    if (video) this.startFrameMonitor(video);
  }

  public setSelfieMode(enabled: boolean): void {
    this.selfieMode = enabled;
  }

  private startFrameMonitor(video: HTMLVideoElement): void {
    this.lastFrameReceivedAt = performance.now();
    this.lastVideoTime = -1;

    const v = video as HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: VideoFrameCallbackMetadata) => void) => number;
      cancelVideoFrameCallback?: (handle: number) => void;
    };

    if (typeof v.requestVideoFrameCallback === 'function') {
      const cb = (_now: number, meta: VideoFrameCallbackMetadata) => {
        this.lastFrameReceivedAt = performance.now();
        this.lastVideoTime =
          meta.presentationTime ?? meta.presentedFrames ?? meta.expectedDisplayTime ?? video.currentTime;
        this.rvfcHandle = v.requestVideoFrameCallback!(cb);
      };
      try {
        this.rvfcHandle = v.requestVideoFrameCallback(cb);
      } catch {
        // fallback to polling below
      }
    }

    if (this.rvfcHandle == null) {
      let last = video.currentTime;
      this.pollHandle = window.setInterval(() => {
        try {
          const t = video.currentTime;
          if (t !== last) {
            last = t;
            this.lastFrameReceivedAt = performance.now();
            this.lastVideoTime = t;
          }
        } catch {
          // video element disconnected
        }
      }, 100);
    }
  }

  private stopFrameMonitor(): void {
    const v = this.video as HTMLVideoElement & {
      cancelVideoFrameCallback?: (handle: number) => void;
    } | null;
    if (this.rvfcHandle != null && typeof v?.cancelVideoFrameCallback === 'function') {
      try {
        v.cancelVideoFrameCallback(this.rvfcHandle);
      } catch {
        // ignore
      }
    }
    this.rvfcHandle = null;
    if (this.pollHandle != null) {
      clearInterval(this.pollHandle);
      this.pollHandle = null;
    }
    this.lastVideoTime = -1;
    this.lastFrameReceivedAt = 0;
  }

  public update(landmarks2D: ReadonlyArray<Landmark2D> | null | undefined): void {
    const video = this.video;
    const w = Math.max(1, video?.videoWidth || this.canvas.width || 640);
    const h = Math.max(1, video?.videoHeight || this.canvas.height || 480);

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      try {
        this.texture.dispose();
      } catch {
        // ignore
      }
      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.texture.minFilter = THREE.LinearFilter;
      this.texture.magFilter = THREE.LinearFilter;
      this.texture.generateMipmaps = false;
      paintDarkPlaceholder(this.ctx, w, h);
    }

    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      paintDarkPlaceholder(this.ctx, w, h);
      this.texture.needsUpdate = true;
      return;
    }

    const now = performance.now();
    const FROZEN_MS = 250;
    if (now - this.lastFrameReceivedAt > FROZEN_MS) {
      paintDarkPlaceholder(this.ctx, w, h);
      this.texture.needsUpdate = true;
      return;
    }

    if (landmarks2D && landmarks2D.length >= 468) {
      this.lastLandmarks2D = landmarks2D.map((lm) => ({ x: lm.x, y: lm.y }));
    }

    const lm = this.lastLandmarks2D;

    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.ctx.filter = 'contrast(1.06) saturate(1.1) brightness(1.02)';
    this.ctx.drawImage(video, 0, 0, w, h);
    this.ctx.filter = 'none';

    if (lm) {
      drawRealisticEye(
        this.ctx,
        lm,
        33,
        133,
        159,
        145,
        w,
        h,
        this.selfieMode,
        this.irisCanvas,
        this.scleraCanvas
      );
      drawRealisticEye(
        this.ctx,
        lm,
        263,
        362,
        386,
        374,
        w,
        h,
        this.selfieMode,
        this.irisCanvas,
        this.scleraCanvas
      );
    }

    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

function paintDarkPlaceholder(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const g = ctx.createRadialGradient(w * 0.5, h * 0.45, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.72);
  g.addColorStop(0, '#1a2540');
  g.addColorStop(0.55, '#0b1020');
  g.addColorStop(1, '#050810');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Silueta sutil para que GitHub Pages no muestre un bloque blanco vacío
  const cx = w * 0.5;
  const cy = h * 0.48;
  const faceR = Math.min(w, h) * 0.22;
  const faceG = ctx.createRadialGradient(cx, cy, faceR * 0.2, cx, cy, faceR);
  faceG.addColorStop(0, 'rgba(80, 100, 140, 0.18)');
  faceG.addColorStop(0.7, 'rgba(40, 55, 85, 0.08)');
  faceG.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = faceG;
  ctx.beginPath();
  ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
  ctx.fill();
}

function drawRealisticEye(
  ctx: CanvasRenderingContext2D,
  lm: ReadonlyArray<Landmark2D>,
  cornerA: number,
  cornerB: number,
  lidUpper: number,
  lidLower: number,
  w: number,
  h: number,
  selfieMode: boolean,
  irisTex: HTMLCanvasElement,
  scleraTex: HTMLCanvasElement
): void {
  const a = lm[cornerA];
  const b = lm[cornerB];
  const u = lm[lidUpper];
  const l = lm[lidLower];
  if (!a || !b || !u || !l) return;

  const cxNorm = 0.5 * (a.x + b.x);
  const cyNorm = 0.5 * (u.y + l.y);
  const eyeW = Math.hypot(a.x - b.x, a.y - b.y);
  const lidH = Math.abs(u.y - l.y);

  const cx = (selfieMode ? 1 - cxNorm : cxNorm) * w;
  const cy = (1 - cyNorm) * h;
  const rx = eyeW * w * 0.58;
  const ry = Math.max(lidH * h * 1.08, eyeW * w * 0.44);
  const irisR = eyeW * w * 0.44;
  const scleraR = Math.max(rx, ry) * 1.12;

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.clip();

  const scleraPattern = ctx.createPattern(scleraTex, 'no-repeat');
  if (scleraPattern) {
    ctx.fillStyle = scleraPattern;
    ctx.fillRect(cx - scleraR, cy - scleraR, scleraR * 2, scleraR * 2);
  }

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.clip();

  const irisPattern = ctx.createPattern(irisTex, 'no-repeat');
  if (irisPattern) {
    ctx.fillStyle = irisPattern;
    ctx.fillRect(cx - irisR, cy - irisR, irisR * 2, irisR * 2);
  }

  const spec = ctx.createRadialGradient(
    cx - irisR * 0.28,
    cy - irisR * 0.32,
    0,
    cx,
    cy,
    irisR
  );
  spec.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
  spec.addColorStop(0.35, 'rgba(255, 255, 255, 0.14)');
  spec.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Borde suave entre ojo y piel del video
  const edge = ctx.createRadialGradient(cx, cy, irisR * 0.85, cx, cy, scleraR);
  edge.addColorStop(0, 'rgba(0, 0, 0, 0)');
  edge.addColorStop(0.85, 'rgba(0, 0, 0, 0.06)');
  edge.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
  ctx.fillStyle = edge;
  ctx.beginPath();
  ctx.arc(cx, cy, scleraR, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
