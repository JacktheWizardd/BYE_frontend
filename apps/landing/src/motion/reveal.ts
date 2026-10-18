import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// The interactive story animates its own screens.
const outsideStage = (el: Element) => !el.closest('[data-demo]')

export function countUp(el: HTMLElement, delay = 0) {
  const to = Number(el.dataset.count), decimals = Number(el.dataset.decimals ?? 1), suffix = el.dataset.suffix ?? ''
  const v = { n: 0 }
  return gsap.to(v, { n: to, duration: 1.2, delay, ease: 'power3.out', onUpdate: () => { el.textContent = v.n.toFixed(decimals) + suffix } })
}

// Scroll reveals used across sections: clip-path for product panels, a stagger for tiles,
// bars and counters for ratings, and gentle parallax depth for floating UI layers.
export function reveals() {
  gsap.utils.toArray<HTMLElement>('[data-reveal]').filter(outsideStage).forEach(el => {
    gsap.fromTo(el, { clipPath: 'inset(14% 0% 0% 0% round 22px)', y: 24, opacity: 0.001 },
      { clipPath: 'inset(0% 0% 0% 0% round 22px)', y: 0, opacity: 1, duration: 1.1, clearProps: 'clipPath',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
  })

  ScrollTrigger.batch('[data-tile]', {
    start: 'top 90%', once: true,
    onEnter: batch => gsap.fromTo(batch, { y: 28, opacity: 0.001 }, { y: 0, opacity: 1, stagger: 0.09, duration: 0.9 }),
  })

  // Bars and counters run when their card comes into view (the interactive story animates its own).
  const cards = new Set<HTMLElement>()
  document.querySelectorAll<HTMLElement>('[data-bar], [data-count]').forEach(el => { if (outsideStage(el)) cards.add((el.closest('.rounded-2xl') as HTMLElement) ?? el) })
  cards.forEach(card => {
    const bars = card.querySelectorAll<HTMLElement>('[data-bar]'), counts = card.querySelectorAll<HTMLElement>('[data-count]')
    gsap.set(bars, { scaleX: 0 })
    ScrollTrigger.create({ trigger: card, start: 'top 85%', once: true, onEnter: () => {
      gsap.to(bars, { scaleX: 1, duration: 1.3, ease: 'expo.out' })
      counts.forEach(c => countUp(c))
    } })
  })

  gsap.utils.toArray<HTMLElement>('[data-depth]').filter(outsideStage).forEach(el => {
    const depth = Number(el.dataset.depth) || 0.3
    gsap.fromTo(el, { y: 40 * depth }, { y: -60 * depth, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } })
  })
}
