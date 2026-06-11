import * as THREE from 'three';

interface Landmark2D {
  x: number;
  y: number;
}

/**
 * Textura facial en resolución nativa del video (1:1 píxeles).
 * Cubre solo las pupilas/iris; el resto del frame se usa sin reescalar.
 */
export class FaceTextureCompositor {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  public readonly texture: THREE.CanvasTexture;
  private video: HTMLVideoElement | null = null;
  private selfieMode: boolean;
  private lastLandmarks2D: Landmark2D[] | null = null;

  public constructor(selfieMode = true) {
    this.selfieMode = selfieMode;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  public setAnisotropy(value: number): void {
    this.texture.anisotropy = value;
  }

  public setVideoSource(video: HTMLVideoElement | null): void {
    this.video = video;
  }

  public setSelfieMode(enabled: boolean): void {
    this.selfieMode = enabled;
  }

  public update(landmarks2D: ReadonlyArray<Landmark2D> | null | undefined): void {
    const video = this.video;
    if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

    if (landmarks2D && landmarks2D.length >= 468) {
      this.lastLandmarks2D = landmarks2D.map((lm) => ({ x: lm.x, y: lm.y }));
    }

    const lm = this.lastLandmarks2D;
    const w = Math.max(1, video.videoWidth || 640);
    const h = Math.max(1, video.videoHeight || 480);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }

    this.ctx.drawImage(video, 0, 0, w, h);

    if (lm) {
      coverEye(this.ctx, lm, 33, 133, 159, 145, 23, w, h, this.selfieMode);
      coverEye(this.ctx, lm, 263, 362, 386, 374, 253, w, h, this.selfieMode);
    }

    this.texture.needsUpdate = true;
  }

  public dispose(): void {
    this.texture.dispose();
  }
}

function toPixel(
  lm: Landmark2D,
  w: number,
  h: number,
  selfieMode: boolean
): { x: number; y: number } {
  const x = (selfieMode ? 1 - lm.x : lm.x) * w;
  const y = (1 - lm.y) * h;
  return { x, y };
}

function sampleSkin(
  ctx: CanvasRenderingContext2D,
  lm: ReadonlyArray<Landmark2D>,
  indices: number[],
  w: number,
  h: number,
  selfieMode: boolean
): string {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;

  for (const idx of indices) {
    const p = lm[idx];
    if (!p) continue;
    const { x, y } = toPixel(p, w, h, selfieMode);
    const px = clampInt(x, 0, w - 1);
    const py = clampInt(y, 0, h - 1);
    const data = ctx.getImageData(px, py, 1, 1).data;
    r += data[0]!;
    g += data[1]!;
    b += data[2]!;
    n++;
  }

  if (n === 0) return 'rgb(210, 175, 155)';
  return `rgb(${Math.round(r / n)}, ${Math.round(g / n)}, ${Math.round(b / n)})`;
}

function coverEye(
  ctx: CanvasRenderingContext2D,
  lm: ReadonlyArray<Landmark2D>,
  cornerA: number,
  cornerB: number,
  lidUpper: number,
  lidLower: number,
  browIdx: number,
  w: number,
  h: number,
  selfieMode: boolean
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
  const rx = eyeW * w * 0.55;
  const ry = Math.max(lidH * h * 1.05, eyeW * w * 0.42);

  const skin = sampleSkin(ctx, lm, [lidUpper, browIdx, cornerA, cornerB], w, h, selfieMode);

  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, skin);
  grad.addColorStop(0.75, skin);
  grad.addColorStop(0.95, toRgba(skin, 0.92));
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.save();
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function clampInt(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}

function toRgba(rgb: string, alpha: number): string {
  const m = rgb.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!m) return `rgba(210, 175, 155, ${alpha})`;
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`;
}
