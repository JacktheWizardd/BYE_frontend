import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
// The review page shares the home page's design system (apps/landing/src/styles.css, Tailwind v4).
export default defineConfig({
  root:fileURLToPath(new URL('./reviews/',import.meta.url)), base:'/reviews/', plugins:[react(), tailwindcss()],
  server:{ host:'127.0.0.1', fs:{ allow:[fileURLToPath(new URL('../..',import.meta.url))] }, proxy:{ '/api':'http://127.0.0.1:8788' } },
  build:{ target:'es2022', outDir:'../../../public/reviews', emptyOutDir:true, sourcemap:false },
})
