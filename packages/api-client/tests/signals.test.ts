import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ensureAbortSignals } from '../src/signals'
test('older WebKit cancellation fallback preserves the first abort reason', () => {
  const original = Object.getOwnPropertyDescriptor(AbortSignal, 'any')!
  try {
    Object.defineProperty(AbortSignal, 'any', { value: undefined, configurable: true })
    ensureAbortSignals()
    const first = new AbortController(), second = new AbortController()
    const combined = AbortSignal.any([first.signal, second.signal])
    second.abort('selection changed'); first.abort('later')
    assert.equal(combined.reason, 'selection changed')
    assert.equal(AbortSignal.any([second.signal]).reason, 'selection changed')
  } finally { Object.defineProperty(AbortSignal, 'any', original) }
})
