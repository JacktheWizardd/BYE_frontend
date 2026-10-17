import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('./', import.meta.url))
export default defineConfig(({ mode }) => ({
  root, base: mode === 'live' ? '/app/' : '/demo/', plugins: [react()],
  resolve: { alias: { '@shared': fileURLToPath(new URL('../../packages/core', import.meta.url)) } },
  server: { host: '127.0.0.1', fs: { allow: [fileURLToPath(new URL('../..', import.meta.url))] }, proxy: { '/api': 'http://127.0.0.1:8788' } },
  build: { target: 'es2022', outDir: mode === 'live' ? '../../public/app' : '../../public/demo', emptyOutDir: true, sourcemap: false },
}))
