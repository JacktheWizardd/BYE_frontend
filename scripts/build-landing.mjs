// Builds the home page from apps/landing and prerenders it into public/index.html.
// Only public/index.html and public/site/ are written; every other file in public/ is left alone.
import { build } from 'vite'
import { cp, readFile, rm, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const out = resolve('.landing-build')
const config = 'apps/landing/vite.config.ts'

// 1. Client bundle (hashed assets in site/).
await build({ configFile: config, logLevel: 'warn' })
// 2. Server bundle used only here, to render the page to static HTML.
await build({ configFile: config, logLevel: 'warn', build: { ssr: 'src/entry-server.tsx', outDir: resolve(out, 'server'), emptyOutDir: true, copyPublicDir: false } })

const { render } = await import(pathToFileURL(resolve(out, 'server/entry-server.js')).href)
const template = await readFile(resolve(out, 'index.html'), 'utf8')
if (!template.includes('<!--app-html-->')) throw new Error('apps/landing/index.html is missing the <!--app-html--> placeholder')
const html = template.replace('<!--app-html-->', render())

await rm('public/site', { recursive: true, force: true })
await cp(resolve(out, 'site'), 'public/site', { recursive: true })
await writeFile('public/index.html', html)
await rm(out, { recursive: true, force: true })
console.log('Landing page prerendered into public/index.html and public/site/.')
