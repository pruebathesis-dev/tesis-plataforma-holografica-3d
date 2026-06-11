import * as THREE from 'three';

/**
 * Genera una textura de iris con fibras radiales, anillo limbal y pupila.
 */
export function createIrisTexture(
  hue = 210,
  saturation = 42,
  size = 512
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size * 0.46;
  const pupilR = size * 0.14;

  // Base radial del iris
  const base = ctx.createRadialGradient(cx, cy, pupilR, cx, cy, outerR);
  base.addColorStop(0, `hsl(${hue}, ${saturation + 8}%, 18%)`);
  base.addColorStop(0.35, `hsl(${hue}, ${saturation}%, 38%)`);
  base.addColorStop(0.72, `hsl(${hue - 6}, ${saturation + 4}%, 52%)`);
  base.addColorStop(0.92, `hsl(${hue - 12}, ${saturation + 10}%, 28%)`);
  base.addColorStop(1, `hsl(${hue - 18}, ${saturation + 14}%, 16%)`);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Fibras radiales del estroma
  const fiberCount = 140;
  for (let i = 0; i < fiberCount; i++) {
    const angle = (i / fiberCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.08;
    const inner = pupilR + Math.random() * size * 0.04;
    const outer = outerR * (0.82 + Math.random() * 0.16);
    const w = 0.6 + Math.random() * 1.8;
    ctx.strokeStyle = `hsla(${hue + (Math.random() - 0.5) * 18}, ${saturation + 10}%, ${38 + Math.random() * 22}%, ${0.12 + Math.random() * 0.28})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    ctx.stroke();
  }

  // Anillo limbal oscuro
  ctx.strokeStyle = `hsl(${hue - 20}, ${saturation + 18}%, 14%)`;
  ctx.lineWidth = size * 0.028;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.97, 0, Math.PI * 2);
  ctx.stroke();

  // Collarette (anillo interior)
  ctx.strokeStyle = `hsla(${hue}, ${saturation}%, 55%, 0.35)`;
  ctx.lineWidth = size * 0.012;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR * 0.42, 0, Math.PI * 2);
  ctx.stroke();

  // Pupila
  const pupilGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, pupilR);
  pupilGrad.addColorStop(0, '#000000');
  pupilGrad.addColorStop(0.85, '#050505');
  pupilGrad.addColorStop(1, '#111111');
  ctx.fillStyle = pupilGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, pupilR, 0, Math.PI * 2);
  ctx.fill();

  // Brillo especular suave
  const spec = ctx.createRadialGradient(cx - size * 0.08, cy - size * 0.1, 0, cx, cy, size * 0.22);
  spec.addColorStop(0, 'rgba(255,255,255,0.55)');
  spec.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = spec;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Esclerótica con variación sutil y venas finas.
 */
export function createScleraTexture(size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.5);
  grad.addColorStop(0, '#f8f6f2');
  grad.addColorStop(0.55, '#f2f0ec');
  grad.addColorStop(1, '#e6e2dc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Micro-ruido para evitar aspecto plástico
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 6;
    img.data[i] = clampByte(img.data[i]! + n);
    img.data[i + 1] = clampByte(img.data[i + 1]! + n);
    img.data[i + 2] = clampByte(img.data[i + 2]! + n);
  }
  ctx.putImageData(img, 0, 0);

  // Venas delicadas
  ctx.lineCap = 'round';
  for (let v = 0; v < 18; v++) {
    const angle = Math.random() * Math.PI * 2;
    const startR = size * (0.08 + Math.random() * 0.12);
    const len = size * (0.18 + Math.random() * 0.22);
    const sx = size / 2 + Math.cos(angle) * startR;
    const sy = size / 2 + Math.sin(angle) * startR;
    ctx.strokeStyle = `rgba(180, 60, 50, ${0.08 + Math.random() * 0.14})`;
    ctx.lineWidth = 0.6 + Math.random() * 1.2;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    let x = sx;
    let y = sy;
    for (let s = 0; s < 5; s++) {
      x += Math.cos(angle + (Math.random() - 0.5) * 0.9) * (len / 5);
      y += Math.sin(angle + (Math.random() - 0.5) * 0.9) * (len / 5);
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Textura de video en vivo para proyectar la cara sobre el mesh.
 */
export function createVideoTexture(video: HTMLVideoElement): THREE.VideoTexture {
  const tex = new THREE.VideoTexture(video);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, v));
}
