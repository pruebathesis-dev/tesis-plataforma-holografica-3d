import { defineConfig } from 'vite'

export default defineConfig({
  base: '/tesis-plataforma-holografica-3d/',

  build: {
    outDir: 'docs',
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['three', '@mediapipe/face_mesh', '@mediapipe/camera_utils'],
          peerjs: ['peerjs', 'simple-peer']
        }
      }
    }
  }
})

