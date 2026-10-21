import { invoke } from '@tauri-apps/api/core'
import type { ChoiceStore } from '@bye/api-client/live-bridge'
import type { AppRuntime, AppSettings } from '../runtime'
import { PREVIEW_VERSION, validateSettings } from '../preferences'
import { ensureAbortSignals } from '@bye/api-client/signals'
export interface NativeResponse { status: number; body: string; headers: Record<string, string> }
export interface NativeState { settings: AppSettings; choices: Record<string, string> }
export type NativeInvoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>

/** Keep HTTP errors intact; an aborted JS operation also cancels the native request. */
export function createNativeFetch(call: NativeInvoke): typeof fetch {
  return async (input, init) => {
    const path = String(input)
    if (!/^\/api\/(?:v1\/(status|terms|courses|sections|candidates|profile|reviews)|reviews\/(resolve|profile|list))(\?[^#]*)?$/.test(path)) throw new Error('Unsupported API route.')
    if (init?.method && init.method !== 'GET') throw new Error('Unsupported API method.')
    const signal = init?.signal
    signal?.throwIfAborted()
    const requestId = crypto.randomUUID()
    const abort = () => { void call('cancel_request', { requestId }).catch(() => {}) }
    signal?.addEventListener('abort', abort, { once: true })
    try {
      const response = await call<NativeResponse>('api_get', { path, requestId })
      signal?.throwIfAborted()
      return new Response(response.body, { status: response.status, headers: response.headers })
    } finally { signal?.removeEventListener('abort', abort) }
  }
}
export async function createTauriRuntime(options: { demo: boolean }, call: NativeInvoke = invoke): Promise<AppRuntime> {
  ensureAbortSignals()
  const state = await call<NativeState>('load_state')
  state.settings = validateSettings(state.settings)
  let pending = Promise.resolve()
  let settingsPending = Promise.resolve()
  const persist = () => {
    const snapshot = structuredClone(state)
    const task = pending.catch(() => {}).then(() => call<void>('save_state', { state: snapshot }))
    pending = task.then(() => {}, () => {}); return task
  }
  let persistenceError: unknown
  const choices: ChoiceStore = {
    getItem: key => state.choices[key] ?? null,
    setItem: (key, value) => { state.choices[key] = value; void persist().catch(error => { persistenceError = error }) },
    removeItem: key => { delete state.choices[key]; void persist().catch(error => { persistenceError = error }) },
  }
  const open = (url: string) => { void call('open_source', { url }).catch(() => {}) }
  const bridge = options.demo ? new (await import('@bye/api-client/demo-bridge')).DemoBridge()
    : new (await import('@bye/api-client/live-bridge')).LiveBridge(createNativeFetch(call), choices, open)
  return {
    bridge, demo: options.demo, platform: 'tauri', request: createNativeFetch(call),
    app: {
      info: async () => ({ version: PREVIEW_VERSION }), getSettings: async () => structuredClone(state.settings),
      setSettings: update => {
        const task = settingsPending.catch(() => {}).then(async () => {
        if (persistenceError) { const error = persistenceError; persistenceError = undefined; throw error }
        const previous = state.settings; state.settings = validateSettings({ ...previous, ...update })
        try { await persist(); return structuredClone(state.settings) } catch (error) { state.settings = previous; throw error }
        })
        settingsPending = task.then(() => {}, () => {}); return task
      },
      checkForUpdate: async () => ({ status: 'error', version: PREVIEW_VERSION, message: 'Preview updates are manual. Existing BYE update channels are unchanged.' }),
      openDownload: async url => { await call('open_source', { url }) },
    },
    dispose: () => { void bridge.command({ kind: 'stop' }); if ('dispose' in bridge && typeof bridge.dispose === 'function') bridge.dispose() },
  }
}
