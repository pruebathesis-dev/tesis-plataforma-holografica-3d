import * as THREE from 'three';
import { FaceMask } from './FaceMask';
import './styles.css';
import { PeerClient } from './PeerClient';
import { Renderer } from './Renderer';
import { FaceTracker, type LandmarkStream } from './FaceTracker';
import { AvatarRenderer } from './AvatarRenderer';
import { FaceMeshBuilder } from './FaceMeshBuilder';
import { VideoInput } from './VideoInput';

console.log('🚀 main.ts loaded');

// Optional: upload a photo to preview a static face mask on a separate scene
const upload = document.getElementById('upload') as HTMLInputElement | null;
if (upload) {
  const previewScene = new THREE.Scene();
  const previewCamera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  previewCamera.position.z = 3;
  const previewRenderer = new THREE.WebGLRenderer({ antialias: true });
  previewRenderer.setSize(200, 200);
  previewRenderer.domElement.style.cssText = 'position:absolute;bottom:8px;right:8px;z-index:5;';
  document.body.appendChild(previewRenderer.domElement);
  previewScene.add(new THREE.DirectionalLight(0xffffff, 1));
  previewScene.add(new THREE.AmbientLight(0xffffff, 0.6));

  upload.addEventListener('change', async () => {
    const file = upload.files?.[0];
    if (!file) return;
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const mask = new FaceMask();
    const mesh = await mask.buildFromImage(img);
    previewScene.add(mesh);
    (function animatePreview() {
      requestAnimationFrame(animatePreview);
      previewRenderer.render(previewScene, previewCamera);
    })();
  });
}

function getOrCreateRoomId(): string {
  const params = new URLSearchParams(window.location.search);
  let roomId = params.get('room');

  if (!roomId) {
    roomId = Math.random().toString(36).substring(2, 10);
    params.set('room', roomId);
    window.history.replaceState({}, '', `?${params.toString()}`);
  }

  return roomId;
}

class RemoteLandmarkStream implements LandmarkStream {
  readonly id = 'remote';
  readonly landmarkCount = 468;
  private lm: Float32Array | null = null;
  private lm2D: { x: number; y: number }[] = [];
  private _isActive = false;

  set(lm: Float32Array, lm2D?: { x: number; y: number }[]): void {
    this.lm = lm;
    if (lm2D?.length) this.lm2D = lm2D;
    this._isActive = true;
  }

  getLatestLandmarks(): Float32Array | null {
    return this.lm;
  }

  getLatestLandmarks2D(): ReadonlyArray<{ x: number; y: number }> | null {
    return this.lm2D.length > 0 ? this.lm2D : null;
  }

  isActive(): boolean {
    return this._isActive;
  }

  clear(): void {
    this.lm = null;
    this.lm2D = [];
    this._isActive = false;
  }
}

const peerClient = new PeerClient();

const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
const callBtn = document.getElementById('callBtn') as HTMLButtonElement;
const hangupBtn = document.getElementById('hangupBtn') as HTMLButtonElement;
const threeCanvas = document.getElementById('threeCanvas') as HTMLCanvasElement;
const overlay2d = document.getElementById('overlay2d') as HTMLCanvasElement;
const noteV = document.querySelector('#noteV') as HTMLElement;
const roomId = document.getElementById('roomId') as HTMLElement;
const peerIdEl = document.getElementById('peerId') as HTMLElement;
// Video off-screen a resolución completa (1px rompe drawImage / UV map).
const remoteTextureVideo = document.createElement('video');
remoteTextureVideo.autoplay = true;
remoteTextureVideo.playsInline = true;
remoteTextureVideo.muted = true;
remoteTextureVideo.style.cssText =
  'position:fixed;left:-9999px;top:0;width:1280px;height:720px;opacity:0;pointer-events:none;';
document.body.appendChild(remoteTextureVideo);

const currentRoomId = getOrCreateRoomId();
roomId.textContent = currentRoomId;

peerClient.onOpen = (id) => {
  noteV.textContent = `🔗 Share your Peer ID to connect: ${id}`;
  if (peerIdEl) peerIdEl.textContent = id;
};

const renderer = new Renderer(threeCanvas);
const meshBuilder = new FaceMeshBuilder(0.18);
const videoInput = new VideoInput();

const avatar = new AvatarRenderer(meshBuilder, {
  jawOpenAmount: 0.18,
  smoothingIterations: 0,
  smoothingAlpha: 0.1,
  videoElement: videoInput.video,
  selfieMode: true,
  textureAnisotropy: renderer.getMaxAnisotropy()
});
avatar.mesh.position.set(0, 0, 0);
avatar.mesh.visible = false;
renderer.scene.add(avatar.mesh);
const faceTracker = new FaceTracker({
  id: 'local',
  landmarkSmoothing: 0.75,
  refineLandmarks: false,
  selfieMode: true
});

let localStream: MediaStream | null = null;
let isRunning = false;
let isInCall = false;
let sendInterval: ReturnType<typeof setInterval> | null = null;
const remoteStream = new RemoteLandmarkStream();

function startSendingFaceData(): void {
  stopSendingFaceData();
  sendInterval = setInterval(() => {
    const landmarks = faceTracker.getLatestLandmarks();
    const landmarks2D = faceTracker.getLatestLandmarks2D();
    if (landmarks && peerClient.isDataConnected()) {
      peerClient.sendFaceData({
        t: performance.now(),
        landmarks: Array.from(landmarks),
        landmarks2D: landmarks2D ? landmarks2D.map((lm) => [lm.x, lm.y]) : undefined,
      });
    }
  }, 50);
}

function stopSendingFaceData(): void {
  if (sendInterval) {
    clearInterval(sendInterval);
    sendInterval = null;
  }
}

function endCall(): void {
  stopSendingFaceData();
  peerClient.hangup();
  remoteTextureVideo.srcObject = null;
  remoteStream.clear();
  isInCall = false;
  avatar.mesh.visible = false;
  hangupBtn.disabled = true;
  callBtn.disabled = !isRunning;
  noteV.textContent = '❌ Llamada terminada';
}

async function renderLoop() {
  if (!isRunning) return;

  // Tracking local solo para ENVIAR al remoto — nunca se muestra en pantalla.
  if (videoInput.video.readyState === HTMLMediaElement.HAVE_ENOUGH_DATA) {
    try {
      await faceTracker.processFrame(videoInput.video);
    } catch (err) {
      console.warn('FaceTracker error:', err);
    }
  }

  const hasRemoteVideo = remoteTextureVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  const showRemote = isInCall && remoteStream.isActive() && hasRemoteVideo;
  avatar.mesh.visible = showRemote;

  if (isInCall && hasRemoteVideo) {
    avatar.setFaceTextureSource(remoteTextureVideo, true);
    avatar.updateFaceTexture(remoteStream.getLatestLandmarks2D());
  }

  if (showRemote) {
    avatar.updateFromStream(remoteStream, 0);
  }

  renderer.renderFrame();
  requestAnimationFrame(renderLoop);
}

startBtn.onclick = async () => {
  try {
    startBtn.disabled = true;
    noteV.textContent = '⏳ Iniciando tracking facial...';

    localStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: true
    });
    videoInput.video.srcObject = localStream;
    await videoInput.video.play();

    noteV.textContent = '⏳ Cargando MediaPipe...';
    await faceTracker.init();

    const rect = threeCanvas.parentElement?.getBoundingClientRect() || { width: 640, height: 480 };
    threeCanvas.width = rect.width;
    threeCanvas.height = rect.height;
    overlay2d.width = rect.width;
    overlay2d.height = rect.height;
    renderer.resize(rect.width, rect.height);

    isRunning = true;
    requestAnimationFrame(renderLoop);

    callBtn.disabled = false;
    noteV.textContent = '✅ Tracking activo. Tu cara NO se muestra aquí — solo la del otro al llamar.';
  } catch (err) {
    noteV.textContent = `❌ Error: ${(err as Error)?.message}`;
    startBtn.disabled = false;
  }
};

callBtn.onclick = () => {
  const remoteId = prompt('🔗 Ingresa el Peer ID del otro usuario:');
  if (!remoteId || !localStream) {
    noteV.textContent = '❌ Falta Peer ID o cámara';
    return;
  }

  try {
    isInCall = true;
    peerClient.connect(remoteId);
    peerClient.callPeer(remoteId, localStream);

    hangupBtn.disabled = false;
    callBtn.disabled = true;
    noteV.textContent = '📞 Llamando... (no verás tu cara, solo la del otro)';
  } catch (err) {
    isInCall = false;
    noteV.textContent = `❌ Error al llamar: ${(err as Error)?.message}`;
  }
};

hangupBtn.onclick = () => endCall();

peerClient.onIncomingCall = () => {
  if (!localStream) {
    noteV.textContent = '⚠️ Llamada entrante — inicia la cámara primero';
    return;
  }
  isInCall = true;
  peerClient.answerCall(localStream);
  hangupBtn.disabled = false;
  callBtn.disabled = true;
  noteV.textContent = '📞 Llamada entrante — conectando...';
};

peerClient.onDataConnected = () => {
  startSendingFaceData();
  if (isInCall) {
    noteV.textContent = '✅ Conectado — viendo avatar del otro usuario';
  }
};

peerClient.onDisconnected = () => {
  if (isInCall) endCall();
};

peerClient.onRemoteStream = (stream) => {
  remoteTextureVideo.srcObject = stream;
  remoteTextureVideo.play().catch(() => {});
};

peerClient.onFaceData = (data) => {
  if (data?.landmarks) {
    try {
      const lm2D = Array.isArray(data.landmarks2D)
        ? data.landmarks2D.map((pair: [number, number]) => ({ x: pair[0], y: pair[1] }))
        : undefined;
      remoteStream.set(new Float32Array(data.landmarks), lm2D);
    } catch (err) {
      console.warn('Error processing remote landmarks:', err);
    }
  }
};

window.addEventListener('beforeunload', () => {
  isRunning = false;
  endCall();
  localStream?.getTracks().forEach((t) => t.stop());
});

console.log('✅ App ready');
