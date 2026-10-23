import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)), base: './', publicDir: false,
  plugins: [react()], clearScreen: false,
  server: { host: '127.0.0.1', port: 5175, strictPort: true, fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] }, proxy: { '/api': 'http://127.0.0.1:8788' } },
  build: { target: 'es2022', outDir: 'dist', emptyOutDir: true },
})
