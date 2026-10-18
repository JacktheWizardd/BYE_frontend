import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let instance: Lenis | null = null

// Smooth momentum scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
export function startLenis() {
  instance = new Lenis({ duration: 1.1, anchors: { offset: -72 }, autoRaf: false })
  instance.on('scroll', ScrollTrigger.update)
  gsap.ticker.add(time => instance?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  return instance
}

// Scroll to a page position, smoothly when Lenis is running (it isn't with reduced motion).
export function scrollToY(y: number) {
  if (instance) instance.scrollTo(y, { duration: 1 })
  else window.scrollTo({ top: y })
}
