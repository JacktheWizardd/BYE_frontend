import type { Bridge, Command } from '@bye/core/types'
import type { AppBridge } from '../runtime'
export type Run = (command: Command) => void
export const NAME_LIMIT = 20
// The same rule main/settings.ts enforces, so students see the problem before saving.
export const validName = (name: string) => [...name.trim()].length <= NAME_LIMIT && /^[\p{L}\p{M}\p{N} .'’-]*$/u.test(name.trim())
export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform)
export const shortcut = isMac ? '⌘K' : 'Ctrl K'
