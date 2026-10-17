/** Local QA only: the production bundles talk to a loopback fixture API, never PCC/RMP. */
import { createServer } from 'node:http'
import { readFile, mkdir } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { chromium, webkit } from 'playwright'
import assert from 'node:assert/strict'
import { setup } from '../tests/fixtures'
import { errorResponse } from '../server/service'
import type { ApiResults } from '../packages/core/api'
let fixture = setup(), enabled = true
const publicRoot = resolve('public'), reports: unknown[] = []
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url!, 'http://localhost')
    if (url.pathname.startsWith('/api/v1/')) {
      const kind = url.pathname.split('/').at(-1)!
      if (kind === 'status') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ enabled, rmpConfigured: enabled })); return }
      try { const result = await fixture.service.operation(kind as keyof ApiResults, url.searchParams, 'browser-test'); res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result)); return } catch (error) { const r = errorResponse(error); res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(await r.text()); return }
    }
    const file = resolve(publicRoot, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''))
    if (!file.startsWith(publicRoot + sep)) { res.writeHead(403); res.end(); return }
    const body = await readFile(file)
    const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png' }
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream'); res.end(body)
  } catch { res.writeHead(404); res.end() }
})
await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
const address = server.address() as { port: number }, origin = `http://127.0.0.1:${address.port}`
await mkdir('test-results', { recursive: true })
try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]] as const) {
    const browser = await engine.launch()
    try {
      for (const width of [375, 390, 1280]) {
        fixture = setup(); enabled = true
        const context = await browser.newContext({ viewport: { width, height: width < 760 ? 844 : 800 }, ...(width < 760 ? { isMobile: true, hasTouch: true } : {}) })
        const page = await context.newPage(), errors: string[] = [], outside: string[] = []
        page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (!r.url().startsWith(origin)) outside.push(r.url()) })
        await page.clock.install()
        await page.goto(origin + '/')
        await page.goto(origin + '/app/')
        await page.waitForFunction(() => !!document.querySelector('#term:not(:disabled), [role=alert]')); if (await page.getByRole('alert').count()) throw new Error(await page.getByRole('alert').innerText()); await page.getByLabel('Semester', { exact: true }).selectOption('202670')
        await page.getByRole('combobox', { name: 'Class', exact: true }).fill('math5a')
        await page.getByRole('option').filter({ hasText: 'MATH 5A' }).waitFor()
        await page.getByRole('combobox', { name: 'Class', exact: true }).press('ArrowDown')
        await page.getByRole('combobox', { name: 'Class', exact: true }).press('Enter')
        await page.locator('.prof-card').filter({ hasText: 'Lena Whitcombe' }).waitFor()
        if (width >= 760) await page.getByRole('heading', { name: 'Compare professors' }).waitFor()
        assert.equal(await page.locator('.report-name').count(), 0, 'No report selected automatically')
        await page.locator('.prof-card').filter({ hasText: 'Lena Whitcombe' }).click()
        await page.getByRole('heading', { name: 'Lena Whitcombe', exact: true }).waitFor()
        await page.locator('.review-card').first().waitFor()
        await page.getByRole('button', { name: 'All', exact: true }).click()
        await page.getByLabel('Sort reviews').selectOption('lowest')
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`)
        const small = await page.locator('button:visible').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height < 43.9).map(el => ({ text: el.textContent, height: el.getBoundingClientRect().height })))
        assert.deepEqual(small, [], 'Visible buttons meet the 44px target')
        await page.screenshot({ path: `test-results/${name}-${width}-report.png`, fullPage: true })
        await page.clock.fastForward(300_001)
        await page.getByText('Older schedule · seat counts hidden', { exact: false }).first().waitFor()
        assert.equal(await page.locator('.seats:visible').count(), 0, 'Expired seat counts disappear while the report remains open')
        if (width < 760) { await page.goBack(); await page.locator('.list-pane:visible').waitFor(); await page.goBack() }
        else await page.getByRole('button', { name: 'Change search' }).click()
        await page.getByRole('heading', { name: 'Find your professor.' }).waitFor()
        await page.getByRole('combobox', { name: 'Class', exact: true }).fill('ETH014')
        await page.getByRole('button', { name: 'Find professors' }).click()
        await page.locator('.prof-card').filter({ hasText: 'Daniel Reyes' }).waitFor()
        await page.locator('.prof-card').filter({ hasText: 'Daniel Reyes' }).click()
        await page.getByRole('dialog').waitFor(); assert.equal(await page.getByRole('button', { name: 'Use this profile' }).count(), 2)
        await page.getByRole('button', { name: 'Not now' }).click()
        await page.locator('.prof-card').filter({ hasText: 'Daniel Reyes' }).click()
        await page.getByRole('button', { name: 'Use this profile' }).first().click()
        await page.getByRole('heading', { name: 'Daniel Reyes', exact: true }).waitFor()
        await page.getByRole('button', { name: 'Rate My Professors ↗', exact: true }).waitFor()
        assert.deepEqual(errors, []); assert.deepEqual(outside, [])
        reports.push({ engine: name, width, passed: true }); await context.close()
      }
      enabled = false
      const page = await browser.newPage()
      await page.goto(origin + '/app/'); await page.getByRole('alert').filter({ hasText: 'not available yet' }).waitFor()
      assert.equal(await page.getByRole('button', { name: 'Find professors' }).isEnabled(), false)
      await page.getByRole('link', { name: 'Use the sample demo' }).click(); await page.getByRole('note').filter({ hasText: 'sample data' }).waitFor(); await page.close()
    } finally { await browser.close() }
  }
  console.log(JSON.stringify({ fixtureOnly: true, physicalSafariGestureVerified: false, reports }, null, 2))
} finally { await new Promise<void>(r => server.close(() => r())) }
