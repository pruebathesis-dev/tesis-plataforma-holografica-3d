import * as THREE from 'three';

export interface RendererOptions {
  // If provided, this element will be updated with FPS text.
  fpsElement?: HTMLElement;
}

/**
 * Renderer
 * - Owns the Three.js renderer, scene, camera, and lighting.
 * - Provides resize + render loop helpers.
 * - Measures FPS with a low-overhead running estimate.
 */
export class Renderer {
  public readonly three: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.OrthographicCamera;
  private readonly canvas: HTMLCanvasElement;

  private readonly fpsEl: HTMLElement | undefined;
  private lastFpsUpdateMs = performance.now();
  private frameCount = 0;
  private fps = 0;

  public constructor(canvas: HTMLCanvasElement, options: RendererOptions = {}) {
    this.canvas = canvas;
    this.fpsEl = options.fpsElement;

    // Ask Three.js for WebGL2 by default; modern browsers will provide it.
    // (Three internally requests "webgl2" when available.)
    this.three = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.three.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.three.setClearColor(0x000000, 0); // transparent over CSS background
    this.three.shadowMap.enabled = false; // faces look good without shadows; saves GPU time

    // Physically-based lighting configuration (thesis requirement).
    // In current Three.js releases, lights/materials follow a PBR workflow by default.
    this.three.outputColorSpace = THREE.SRGBColorSpace;
    this.three.toneMapping = THREE.ACESFilmicToneMapping;
    this.three.toneMappingExposure = 1.0;

    this.scene = new THREE.Scene();

    // Use an orthographic camera so the avatar placement is stable and UI-like.
    const aspect = canvas.width / Math.max(1, canvas.height);
    this.camera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 10);
    this.camera.position.set(0, 0, 2.0);
    this.camera.lookAt(0, 0, 0);

    this.addDefaultLights();
  }

  private addDefaultLights(): void {
    // Face-optimized lighting rig (physically-based, cheap):
    // - Key: warm, above and to one side (main shape)
    // - Fill: cool, opposite side (softens contrast)
    // - Rim: cool/neutral from behind (separates silhouette)
    // - Catchlight: small point near camera for eye highlights
    // - Ambient: very low to prevent crushed blacks
    const ambient = new THREE.AmbientLight(0xffffff, 0.32);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff1e0, 2.2);
    key.position.set(1.2, 1.4, 1.8);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0xd7e8ff, 1.0);
    fill.position.set(-1.4, 0.4, 1.2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0xe6f2ff, 1.1);
    rim.position.set(0.0, 0.9, -1.6);
    this.scene.add(rim);

    const catchLight = new THREE.PointLight(0xffffff, 0.55, 10, 2);
    catchLight.position.set(0.0, 0.12, 2.0);
    this.scene.add(catchLight);
  }

  public resize(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));

    // For orthographic camera update left/right based on aspect while keeping top/bottom fixed.
    const aspect = w / h;
    this.camera.left = -aspect;
    this.camera.right = aspect;
    this.camera.top = 0.72;
    this.camera.bottom = -0.72;
    this.camera.updateProjectionMatrix();

    this.three.setSize(w, h, false);
  }

  public getMaxAnisotropy(): number {
    return this.three.capabilities.getMaxAnisotropy();
  }

  public renderFrame(): void {
    this.three.render(this.scene, this.camera);
    this.updateFps();
  }

  public getFps(): number {
    return this.fps;
  }

  private updateFps(): void {
    this.frameCount++;
    const now = performance.now();
    const dt = now - this.lastFpsUpdateMs;

    // Update at ~4Hz to avoid DOM churn.
    if (dt < 250) return;

    this.fps = (1000 * this.frameCount) / dt;
    this.frameCount = 0;
    this.lastFpsUpdateMs = now;

    if (this.fpsEl) {
      this.fpsEl.textContent = `${this.fps.toFixed(1)} fps`;
    }
  }

  // Store previous landmarks for smooth interpolation
  private prevLandmarks: any[] | null = null;

  public drawFace(landmarks: any[]): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = 'lime';

    for (const p of landmarks) {
      ctx.beginPath();
      ctx.arc(
        p.x * this.canvas.width,
        p.y * this.canvas.height,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  /**
   * updateFace: Renders landmarks with smooth interpolation (lerp)
   * between previous and current frames for fluid motion.
   * 
   * @param landmarks - Array of NormalizedLandmark objects with x, y properties
   * @param lerp - Linear interpolation function (prev, next, alpha) => number
   */
  public updateFace(landmarks: any[], lerp: (prev: number, next: number, alpha: number) => number): void {
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = 'lime';
    const alpha = 0.6;

    for (let i = 0; i < landmarks.length; i++) {
      const currentLm = landmarks[i];
      let interpX = currentLm.x;
      let interpY = currentLm.y;

      // If we have previous landmarks, interpolate smoothly
      if (this.prevLandmarks && i < this.prevLandmarks.length) {
        const prevLm = this.prevLandmarks[i];
        interpX = lerp(prevLm.x, currentLm.x, alpha);
        interpY = lerp(prevLm.y, currentLm.y, alpha);
      }

      ctx.beginPath();
      ctx.arc(
        interpX * this.canvas.width,
        interpY * this.canvas.height,
        2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    // Store current landmarks for next frame interpolation
    this.prevLandmarks = [...landmarks];
  }
}
