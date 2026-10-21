/** Windows-only local trial. Node drives QA; it is not bundled with BYE Preview. */
import { spawn, execFileSync } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdir, stat, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import assert from 'node:assert/strict'

if (process.platform !== 'win32') throw new Error('This native harness is for Windows WebView2. Use the documented real-Mac acceptance checklist on macOS.')
const executable = process.env.BYE_PREVIEW_EXE
if (!executable) throw new Error('Set BYE_PREVIEW_EXE to the explicitly selected isolated preview executable.')
const file = resolve(executable); await stat(file)
const socket = createServer(); await new Promise<void>(r => socket.listen(0, '127.0.0.1', r))
const port = (socket.address() as { port: number }).port; await new Promise<void>(r => socket.close(() => r()))
const started = performance.now()
const app = spawn(file, [], { windowsHide: true, env: { ...process.env, WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${port}` }, stdio: 'ignore' })
let browser: Awaited<ReturnType<typeof chromium.connectOverCDP>> | undefined
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`); break } catch { if (app.exitCode !== null) throw new Error('The isolated preview exited during startup.'); await new Promise(r => setTimeout(r, 250)) }
  }
  if (!browser) throw new Error('The preview WebView2 debugging endpoint did not become available.')
  const page = browser.contexts()[0].pages()[0]
  try { await page.locator('.preview-banner').waitFor() } catch (error) {
    console.error('Native startup page:', await page.locator('body').innerText())
    console.error('Native startup URL:', page.url())
    throw error
  }
  const startupMs = performance.now() - started
  const native = <T>(command: string, args?: Record<string, unknown>) => page.evaluate(async ({ command, args }) => {
    return (window as unknown as { __TAURI_INTERNALS__: { invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> } }).__TAURI_INTERNALS__.invoke(command, args)
  }, { command, args }) as Promise<T>
  const original = await native('load_state')
  try {
    if (await page.getByRole('button', { name: 'Let’s go →' }).count()) {
      await page.getByRole('button', { name: 'Let’s go →' }).click()
      await page.getByRole('textbox', { name: 'Your name', exact: true }).fill('Student')
      await page.getByRole('button', { name: 'That’s me →' }).click()
    }
    const course = page.getByRole('combobox', { name: 'Class', exact: true })
    await course.fill('MATH5A'); await page.getByRole('button', { name: 'Find professors', exact: false }).click()
    await page.locator('.prof-card').first().waitFor()
    assert.equal(await page.locator('.report-name').count(), 0)
    await page.locator('.prof-card').filter({ hasText: 'Lena Whitcombe' }).click()
    await page.getByRole('heading', { name: 'Lena Whitcombe', exact: true }).waitFor()
    await page.locator('.review-card').first().waitFor()
    const stored = await native<{ settings: { recent: string[] } }>('load_state')
    assert(stored.settings.recent.includes('MATH 5A'))
    await assert.rejects(native('api_get', { path: 'https://evil.example/', requestId: 'test-invalid-route' }))
    await assert.rejects(native('open_source', { url: 'javascript:alert(1)' }))
    await assert.rejects(native('save_state', { state: { settings: { name: '<script>', onboarded: true, recent: [] }, choices: {} } }))
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
    await mkdir('test-results/shared-app', { recursive: true })
    await page.screenshot({ path: 'test-results/shared-app/native-windows.png' })
    const metrics = JSON.parse(execFileSync('powershell', ['-NoProfile', '-Command', `$rootProcess=${app.pid}; $allProcesses=Get-CimInstance Win32_Process; $ids=@($rootProcess); do {$more=@($allProcesses | Where-Object { $ids -contains $_.ParentProcessId -and $ids -notcontains $_.ProcessId } | Select-Object -ExpandProperty ProcessId); $ids+=$more} while($more.Count); $rss=(Get-Process -Id $ids -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum; @{processCount=$ids.Count;sampledWorkingSetBytes=$rss} | ConvertTo-Json -Compress`], { encoding: 'utf8', windowsHide: true }))
    const result = { platform: 'Windows x64', executableBytes: (await stat(file)).size, instrumentedStartupMs: Math.round(startupMs), ...metrics, selectionAndPersistence: 'passed', invalidNativeCommands: 'rejected', notes: 'One local instrumented run, not a cold-start benchmark or Electron comparison. WebView2 instrumentation affects resource use. Mac acceptance is pending.' }
    await writeFile('test-results/shared-app/native-windows.json', JSON.stringify(result, null, 2) + '\n')
    console.log(JSON.stringify(result, null, 2))
  } finally { await native('save_state', { state: original }) }
} finally { await browser?.close(); app.kill() }
