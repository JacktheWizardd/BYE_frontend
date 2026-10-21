import type { AppRuntime, AppSettings } from '../runtime'
import { DEFAULT_SETTINGS, PREVIEW_VERSION, isApprovedLink, validateSettings } from '../preferences'
import type { ChoiceStore } from '@bye/api-client/live-bridge'
import { ensureAbortSignals } from '@bye/api-client/signals'

export interface BrowserRuntimeOptions { demo: boolean; storage?: Storage; request?: typeof fetch; open?: (url: string) => void }
export async function createBrowserRuntime(options: BrowserRuntimeOptions): Promise<AppRuntime> {
  ensureAbortSignals()
  const storage = options.storage ?? globalThis.localStorage
  const prefix = 'bye-preview:v1:'
  const choices: ChoiceStore = { getItem: key => storage.getItem(prefix + key), setItem: (key, value) => storage.setItem(prefix + key, value), removeItem: key => storage.removeItem(prefix + key) }
  const open = (url: string) => { if (!isApprovedLink(url)) throw new Error('This link is not permitted.'); (options.open ?? (value => { window.open(value, '_blank', 'noopener,noreferrer') }))(url) }
  const bridge = options.demo ? new (await import('@bye/api-client/demo-bridge')).DemoBridge()
    : new (await import('@bye/api-client/live-bridge')).LiveBridge(options.request ?? fetch, choices, open)
  let pending = Promise.resolve()
  const load = (): AppSettings => {
    const value = storage.getItem(prefix + 'settings')
    return value ? validateSettings(JSON.parse(value)) : structuredClone(DEFAULT_SETTINGS)
  }
  return {
    bridge, demo: options.demo, platform: 'browser', request: options.request ?? fetch,
    app: {
      info: async () => ({ version: PREVIEW_VERSION }), getSettings: async () => load(),
      setSettings: update => {
        const task = pending.catch(() => {}).then(() => { const next = validateSettings({ ...load(), ...update }); storage.setItem(prefix + 'settings', JSON.stringify(next)); return next })
        pending = task.then(() => {}, () => {}); return task
      },
      checkForUpdate: async () => ({ status: 'error', version: PREVIEW_VERSION, message: 'Preview updates are manual. Existing BYE update channels are unchanged.' }),
      openDownload: async url => { open(url) },
    },
    dispose: () => { void bridge.command({ kind: 'stop' }); if ('dispose' in bridge && typeof bridge.dispose === 'function') bridge.dispose() },
  }
}
