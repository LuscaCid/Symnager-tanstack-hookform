import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // caminho absoluto: rotas aninhadas (/ordens/12) na web e o protocolo app:// do Electron resolvem /assets igual
  base: '/',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    // em desenvolvimento web, /api vai para a API Nest local
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API ?? 'http://127.0.0.1:3333',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
})
