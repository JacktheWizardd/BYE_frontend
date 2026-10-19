import { gsap } from 'gsap'

// The signature moment: the yellow swipe draws under the headline while the product window settles.
// Text and buttons are never hidden: they are readable from the first paint, even before JavaScript.
export function heroIntro() {
  const swipe = document.querySelector<HTMLElement>('[data-swipe]')
  const tl = gsap.timeline()
  if (swipe) tl.fromTo(swipe, { '--swipe': '0%' }, { '--swipe': '100%', duration: 1.1 }, 0.1)
  tl.from('[data-tilt-target]', { y: 24, rotateX: 6, duration: 1.2 }, 0)
}

// The product window faces forward and leans a little toward the cursor while it is over the hero
// (desktop pointers only). When the cursor leaves the hero or the page, it eases back to face forward.
export function heroTilt() {
  const hero = document.querySelector<HTMLElement>('#top')
  const area = document.querySelector<HTMLElement>('[data-tilt]')
  const target = document.querySelector<HTMLElement>('[data-tilt-target]')
  if (!hero || !area || !target) return
  // One short tween per animation frame toward the latest pointer position. (gsap.quickTo drops a
  // transform whose start and end match, which is exactly the resting pose, so it is not used here.)
  const rest = { rotateX: 0, rotateY: 0 }
  const MAX_X = 3, MAX_Y = 4 // degrees at the far edge: a hint of depth, never a turn away
  gsap.set(target, rest)
  let next = rest, frame = 0
  const tilt = () => { frame = 0; gsap.to(target, { ...next, duration: 0.9, ease: 'power3.out', overwrite: 'auto' }) }
  const queue = (to: typeof rest) => { next = to; if (!frame) frame = requestAnimationFrame(tilt) }
  const move = (e: PointerEvent) => {
    const r = area.getBoundingClientRect()
    const x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2))
    const y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2))
    queue({ rotateX: -y * MAX_X, rotateY: x * MAX_Y })
  }
  const leave = () => queue(rest)
  hero.addEventListener('pointermove', move, { passive: true })
  hero.addEventListener('pointerleave', leave)
  document.documentElement.addEventListener('pointerleave', leave)
  window.addEventListener('blur', leave)
  return () => {
    cancelAnimationFrame(frame)
    hero.removeEventListener('pointermove', move); hero.removeEventListener('pointerleave', leave)
    document.documentElement.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave)
    gsap.set(target, { clearProps: 'transform' })
  }
}
