export async function init3DDFA() {
  console.log("3DDFA mock iniciado");
  return {};
}

export async function predict3D(model: any, video: HTMLVideoElement) {
  // ⚠️ Esto es FAKE para que no truene
  // luego metes el modelo real

  const vertices = new Float32Array(468 * 3);

  for (let i = 0; i < vertices.length; i++) {
    vertices[i] = Math.random() * 0.1;
  }

  return { vertices };
}