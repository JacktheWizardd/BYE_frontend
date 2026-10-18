import { gsap } from 'gsap'

// The signature moment: the yellow swipe draws under the headline while the product window settles.
// Text and buttons are never hidden: they are readable from the first paint, even before JavaScript.
export function heroIntro() {
  const swipe = document.querySelector<HTMLElement>('[data-swipe]')
  const tl = gsap.timeline()
  if (swipe) tl.fromTo(swipe, { '--swipe': '0%' }, { '--swipe': '100%', duration: 1.1 }, 0.1)
  tl.from('[data-tilt-target]', { y: 24, rotateX: 6, duration: 1.2 }, 0)
}

// The product window leans gently toward the cursor (desktop pointers only).
export function heroTilt() {
  const area = document.querySelector<HTMLElement>('[data-tilt]')
  const target = document.querySelector<HTMLElement>('[data-tilt-target]')
  if (!area || !target) return
  // One short tween per animation frame toward the latest pointer position. (gsap.quickTo drops a
  // transform whose start and end match, which is exactly the resting pose, so it is not used here.)
  const rest = { rotateX: 4, rotateY: -6 }
  gsap.set(target, rest)
  let next = rest, frame = 0
  const tilt = () => { frame = 0; gsap.to(target, { ...next, duration: 0.9, ease: 'power3.out', overwrite: 'auto' }) }
  const queue = (to: typeof rest) => { next = to; if (!frame) frame = requestAnimationFrame(tilt) }
  const move = (e: PointerEvent) => {
    const r = area.getBoundingClientRect()
    const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5))
    const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5))
    queue({ rotateX: rest.rotateX - y * 8, rotateY: rest.rotateY + x * 10 })
  }
  const leave = () => queue(rest)
  window.addEventListener('pointermove', move, { passive: true })
  area.addEventListener('pointerleave', leave)
  return () => {
    cancelAnimationFrame(frame)
    window.removeEventListener('pointermove', move); area.removeEventListener('pointerleave', leave)
    gsap.set(target, { clearProps: 'transform' })
  }
}
