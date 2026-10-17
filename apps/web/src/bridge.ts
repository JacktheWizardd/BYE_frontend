import type { Bridge } from '@shared/types'
import { LiveBridge } from './live-bridge'
export const isDemo = import.meta.env.MODE === 'demo'
// The live build never imports the fictional data module.
export const bridge: Bridge = isDemo ? new (await import('./demo-bridge')).DemoBridge() : new LiveBridge()
