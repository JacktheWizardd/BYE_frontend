import { build } from 'vite'
import { readFile, writeFile, copyFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
execFileSync(process.execPath, ['node_modules/typescript/bin/tsc', '--noEmit'], { stdio: 'inherit' })
for (const mode of ['demo', 'live']) {
  await build({ configFile: 'apps/web/vite.config.ts', mode })
  if (mode === 'live') {
    const file = 'public/app/index.html'
    const html = await readFile(file, 'utf8')
    await writeFile(file, html.replace('<title>BYE Demo</title>', '<title>BYE · PCC beta</title>').replace('Before You Enroll web demo. Compare PCC professors with sample data.', 'Before You Enroll. Compare PCC sections, professor ratings and student reviews.'))
  }
}
await build({ configFile: 'apps/web/vite.reviews.config.ts' })
// Home page: apps/landing prerendered into public/index.html and public/site/.
await import('./build-landing.mjs')
await copyFile('THIRD_PARTY_NOTICES.md', 'public/licenses.txt')
await import('./verify-static.mjs')
