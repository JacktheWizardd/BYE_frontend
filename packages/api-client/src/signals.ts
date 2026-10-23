/** WKWebView on earlier supported macOS versions may lack AbortSignal.any. */
export function ensureAbortSignals() {
  if (typeof AbortSignal.any !== 'function') Object.defineProperty(AbortSignal, 'any', { configurable: true, writable: true, value: (signals: AbortSignal[]) => {
    const controller = new AbortController()
    const finish = (signal: AbortSignal) => {
      if (!controller.signal.aborted) controller.abort(signal.reason)
      for (const [source, listener] of listeners) source.removeEventListener('abort', listener)
    }
    const listeners = new Map<AbortSignal, () => void>()
    for (const signal of new Set(signals)) {
      if (signal.aborted) { finish(signal); break }
      const listener = () => finish(signal); listeners.set(signal, listener); signal.addEventListener('abort', listener, { once: true })
    }
    return controller.signal
  } })
  if (typeof AbortSignal.timeout !== 'function') Object.defineProperty(AbortSignal, 'timeout', { configurable: true, writable: true, value: (ms: number) => {
    if (!Number.isFinite(ms) || ms < 0) throw new RangeError('Invalid timeout.')
    const controller = new AbortController()
    setTimeout(() => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')), ms)
    return controller.signal
  } })
}
