import type { AppSettings } from './runtime'
export const PREVIEW_VERSION = '0.1.0-preview.1'
export const DEFAULT_SETTINGS: AppSettings = { name: '', onboarded: false, recent: [] }
export function validateSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') throw new Error('Invalid preview preferences.')
  const value = raw as Record<string, unknown>
  if (typeof value.name !== 'string' || [...value.name.trim()].length > 20 || !/^[\p{L}\p{M}\p{N} .'’-]*$/u.test(value.name.trim())) throw new Error('Use a name of up to 20 characters.')
  if (typeof value.onboarded !== 'boolean' || !Array.isArray(value.recent) || value.recent.length > 5 || value.recent.some(x => typeof x !== 'string' || x.length > 40 || /[\u0000-\u001f<>]/.test(x))) throw new Error('Invalid preview preferences.')
  return { name: value.name.trim(), onboarded: value.onboarded, recent: [...new Set(value.recent as string[])] }
}
export const isApprovedLink = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password && !url.port && (
      (url.hostname === 'bye-before-you-enroll.pages.dev' && ['/reviews/', '/#download', '/'].includes(url.pathname + url.hash)) ||
      (url.hostname === 'www.ratemyprofessors.com' && /^\/professor\/[1-9]\d*$/.test(url.pathname)) ||
      (url.hostname === 'findclasses.pasadena.edu' && url.pathname === '/'))
  } catch { return false }
}
