import { createContext, useContext } from 'react'
import type { Bridge } from '@bye/core/types'

export interface AppSettings { name: string; onboarded: boolean; recent: string[] }
export type UpdateCheck = { status: 'current'; version: string } | { status: 'available'; version: string; latest: string; downloadUrl: string } | { status: 'error'; version: string; message: string }
export interface AppBridge {
  info(): Promise<{ version: string }>
  getSettings(): Promise<AppSettings>
  setSettings(update: Partial<AppSettings>): Promise<AppSettings>
  checkForUpdate(): Promise<UpdateCheck>
  openDownload(url: string): Promise<void>
}
export interface AppRuntime {
  platform: 'browser' | 'tauri'
  request: typeof fetch
  bridge: Bridge
  app: AppBridge
  demo: boolean
  dispose(): void
}
const context = createContext<AppRuntime | null>(null)
export const RuntimeProvider = context.Provider
export function useRuntime() {
  const runtime = useContext(context)
  if (!runtime) throw new Error('The shared app requires a runtime adapter.')
  return runtime
}
