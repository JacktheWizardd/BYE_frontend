import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createBrowserRuntime } from '../src/adapters/browser'
import { createNativeFetch, createTauriRuntime, type NativeInvoke } from '../src/adapters/tauri'
import { validateSettings, isApprovedLink } from '../src/preferences'

class MemoryStorage implements Storage {
  values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
  removeItem(key: string) { this.values.delete(key) }
}
test('preview preferences are bounded, validated and deduplicated', () => {
  assert.deepEqual(validateSettings({ name: '  Student  ', onboarded: true, recent: ['MATH 005A', 'MATH 005A'] }), { name: 'Student', onboarded: true, recent: ['MATH 005A'] })
  for (const input of [{ name: '<script>', onboarded: true, recent: [] }, { name: 'A'.repeat(21), onboarded: false, recent: [] }, { name: 'A', onboarded: true, recent: Array(6).fill('ETH 014') }]) assert.throws(() => validateSettings(input))
})
test('browser preview persists only its own namespace and never fetches sample data', async () => {
  const storage = new MemoryStorage(); storage.setItem('bye-existing-name', 'untouched')
  const runtime = await createBrowserRuntime({ demo: true, storage, request: async () => { throw new Error('Sample data must never request an API') } })
  try {
    await Promise.all([runtime.app.setSettings({ name: 'Student' }), runtime.app.setSettings({ onboarded: true })])
    assert.equal((await runtime.app.getSettings()).name, 'Student')
    assert.equal((await runtime.app.getSettings()).onboarded, true)
    const terms = await runtime.bridge.command({ kind: 'terms' }) as { termCode: string }[]
    assert.ok(terms.length)
    assert.equal(storage.getItem('bye-existing-name'), 'untouched')
    assert.ok([...storage.values.keys()].filter(k => k !== 'bye-existing-name').every(k => k.startsWith('bye-preview:')))
  } finally { runtime.dispose() }
})
test('live preview preserves disabled source errors without fictional fallback', async () => {
  const runtime = await createBrowserRuntime({ demo: false, storage: new MemoryStorage(), request: async () => Response.json({ enabled: false, rmpConfigured: false }) })
  try { await assert.rejects(runtime.bridge.command({ kind: 'terms' }), /live beta is not available/) } finally { runtime.dispose() }
})
test('native transport rejects arbitrary URLs, traversal and write routes before invoking Rust', async () => {
  let calls = 0
  const request = createNativeFetch((async () => { calls++; throw new Error('Unexpected native invocation') }) as NativeInvoke)
  for (const path of ['https://evil.example/api/v1/status', '//evil.example', '/api/v1/../submit', '/api/reviews/submit']) await assert.rejects(request(path), /Unsupported API route/)
  assert.equal(calls, 0)
})
test('native transport preserves status, retry headers and error bodies', async () => {
  const request = createNativeFetch((async () => ({ status: 429, headers: { 'retry-after': '60' }, body: '{"error":{"code":"RATE_LIMITED"}}' })) as NativeInvoke)
  const response = await request('/api/v1/sections?term=202670&query=MATH5A')
  assert.equal(response.status, 429); assert.equal(response.headers.get('retry-after'), '60')
  assert.equal((await response.json() as { error: { code: string } }).error.code, 'RATE_LIMITED')
})
test('aborting a preview request cancels native work and ignores late results', async () => {
  const calls: string[] = []; let finish!: (value: unknown) => void
  const call = (async (command: string): Promise<unknown> => { calls.push(command); if (command === 'cancel_request') return; return new Promise<unknown>(resolve => { finish = resolve }) }) as NativeInvoke
  const run = new AbortController(), pending = createNativeFetch(call)('/api/v1/status', { signal: run.signal })
  run.abort(); finish({ status: 200, headers: {}, body: '{}' })
  await assert.rejects(pending, { name: 'AbortError' }); assert.deepEqual(calls, ['api_get', 'cancel_request'])
})
test('Tauri preview reads only the dedicated state command and rolls back failed saves', async () => {
  const calls: string[] = []
  const call = (async (command: string) => { calls.push(command); if (command === 'load_state') return { settings: { name: 'Student', onboarded: true, recent: [] }, choices: {} }; if (command === 'save_state') throw new Error('Disk full') }) as NativeInvoke
  const runtime = await createTauriRuntime({ demo: true }, call)
  try {
    await assert.rejects(runtime.app.setSettings({ name: 'New' }), /Disk full/)
    assert.equal((await runtime.app.getSettings()).name, 'Student')
    assert.deepEqual(calls, ['load_state', 'save_state'])
  } finally { runtime.dispose() }
})
test('preview links exclude scripts, files, lookalike hosts and unapproved routes', () => {
  assert.ok(isApprovedLink('https://bye-before-you-enroll.pages.dev/reviews/'))
  assert.ok(isApprovedLink('https://findclasses.pasadena.edu/?term=202670'))
  for (const url of ['javascript:alert(1)', 'file:///C:/Windows', 'https://bye-before-you-enroll.pages.dev.evil.example/', 'https://name@bye-before-you-enroll.pages.dev/', 'https://www.ratemyprofessors.com/admin']) assert.equal(isApprovedLink(url), false)
})
