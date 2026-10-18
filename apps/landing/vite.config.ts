import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

// The landing page builds into a temporary folder; scripts/build-landing.mjs prerenders it
// and copies index.html plus site/ into public/. public/ itself is never emptied.
const root = fileURLToPath(new URL('./', import.meta.url))
export default defineConfig({
  root,
  base: '/',
  plugins: [react(), tailwindcss()],
  // Dev serves the real public/ so /fonts, /favicon.png, /demo/ and /reviews/ resolve.
  publicDir: fileURLToPath(new URL('../../public', import.meta.url)),
  server: { host: '127.0.0.1', port: 5174 },
  build: {
    target: 'es2022',
    outDir: fileURLToPath(new URL('../../.landing-build', import.meta.url)),
    emptyOutDir: true,
    copyPublicDir: false,
    assetsDir: 'site',
    sourcemap: false,
  },
})
