import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { startLenis } from './lenis'
import { heroIntro, heroTilt } from './hero'
import { reveals } from './reveal'
import { copyLink } from './copyLink'

const EASE = 'expo.out'
export { EASE }

// One motion language for the whole page. Reduced motion keeps the static page exactly as rendered.
export function startMotion() {
  copyLink()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) return

  gsap.registerPlugin(ScrollTrigger)
  gsap.defaults({ ease: EASE, duration: 0.9 })
  const lenis = startLenis()

  const mm = gsap.matchMedia()
  heroIntro()
  reveals()
  mm.add('(min-width: 900px) and (pointer: fine)', () => heroTilt())

  // The ambient WebGL field is a lazy extra for capable desktops only.
  const capable = window.matchMedia('(min-width: 900px) and (pointer: fine)').matches
    && (navigator.hardwareConcurrency ?? 2) >= 4
    && !(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
  const host = document.querySelector<HTMLElement>('[data-ambient]')
  if (capable && host) {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 600))
    const load = () => idle(() => { import('./ambient').then(m => m.mountAmbient(host)).catch(() => {}) })
    if (document.readyState === 'complete') load()
    else window.addEventListener('load', load, { once: true })
  }

  // Fonts change line heights; re-measure pinned and triggered positions once they settle.
  // Pinning adds scroll space after the browser has jumped to a #hash, so jump again afterwards.
  document.fonts?.ready.then(() => {
    ScrollTrigger.refresh()
    const target = location.hash && document.querySelector(location.hash)
    if (target) lenis.scrollTo(target as HTMLElement, { offset: -72, immediate: true })
  })
}
