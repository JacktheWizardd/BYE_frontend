/** Isolated built shared-app preview; no student/source services or deployed changes. */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import assert from 'node:assert/strict'
import { chromium, webkit } from 'playwright'
const root = resolve('apps/preview/dist')
const mime: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf' }
const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url!, 'http://localhost')
    if (url.pathname.startsWith('/api/')) { response.writeHead(503); response.end('Sample preview must not request APIs'); return }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''))
    if (!path.startsWith(root + sep)) { response.writeHead(403); response.end(); return }
    response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream'); response.end(await readFile(path))
  } catch { response.writeHead(404); response.end() }
})
await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`
await mkdir('test-results/shared-app', { recursive: true })
const results: unknown[] = []
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]] as const) {
    const browser = await engine.launch()
    try {
      for (const width of [390, 1280]) {
        const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce' })
        const page = await context.newPage(), errors: string[] = [], forbidden: string[] = []
        page.on('pageerror', error => errors.push(error.message))
        page.on('request', request => { if (request.url().includes('/api/') || !request.url().startsWith(origin)) forbidden.push(request.url()) })
        await page.goto(origin)
        await page.getByRole('button', { name: /let.*go|get started|continue|next/i }).first().click()
        await page.locator('input').first().fill('Student')
        await page.getByRole('button', { name: 'That’s me →' }).click()
        const course = page.getByRole('combobox', { name: 'Class', exact: true })
        await course.waitFor()
        await course.fill('MATH5A')
        await page.getByRole('button', { name: /find professors/i }).click()
        await page.locator('.prof-card').first().waitFor()
        assert.equal(await page.locator('.report-name').count(), 0, 'A professor must not open automatically')
        await page.locator('.prof-card').filter({ hasText: 'Lena Whitcombe' }).click()
        await page.getByRole('heading', { name: 'Lena Whitcombe', exact: true }).waitFor()
        await page.locator('.review-card').first().waitFor()
        assert.match(await page.locator('.preview-banner').innerText(), /fictional/)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Horizontal overflow at ${width}`)
        await page.screenshot({ path: `test-results/shared-app/${name}-${width}-report.png`, fullPage: true })
        if (width === 390) {
          await page.goBack()
          await page.locator('.sidebar-list').waitFor({ state: 'visible' })
          assert.equal(await page.locator('.detail').isVisible(), false)
          await page.goBack(); await course.waitFor({ state: 'visible' })
        }
        await page.screenshot({ path: `test-results/shared-app/${name}-${width}.png`, fullPage: true })
        assert.deepEqual(errors, []); assert.deepEqual(forbidden, [])
        results.push({ engine: name, width, noOverflow: true, noExternalOrApiRequests: true, noAutomaticSelection: true })
        await context.close()
      }
    } finally { await browser.close() }
  }
  console.log(JSON.stringify(results, null, 2))
} finally { await new Promise<void>(resolve => server.close(() => resolve())) }
