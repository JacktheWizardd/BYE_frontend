import { useEffect, useState } from 'react'

// Small motion helpers shared by the demo and the live app. Everything is off for reduced motion.
export const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Counts a number up from zero once when it first appears (or changes), like the home page.
export function useCountUp(value: number | undefined, ms = 900) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (value === undefined || reducedMotion()) { setShown(value); return }
    let raf = 0
    const start = performance.now()
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / ms), eased = 1 - Math.pow(1 - t, 3)
      setShown(value * eased)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

// Types and erases example searches as a placeholder while the field is empty and idle.
// Returns null when inactive (use the normal placeholder) and a string, possibly empty, while animating:
// an empty string must stay blank, not fall back to the full placeholder between examples.
export function useTypedHint(examples: string[], active: boolean): string | null {
  const [hint, setHint] = useState<string | null>(null)
  useEffect(() => {
    if (!active || reducedMotion()) { setHint(null); return }
    // A "|" caret follows the text like a real cursor: steady while typing, blinking while it pauses.
    // Typing goes one letter per tick; erasing goes two, so long titles don't drag.
    let i = 0, n = 0, dir = 1, wait = 0, tick = 0
    const show = (text: string, caret: boolean) => setHint(text + (caret ? '|' : ''))
    show('', true)
    const id = setInterval(() => {
      tick += 1
      const word = examples[i % examples.length]
      if (wait > 0) { wait -= 1; show(word.slice(0, n), Math.floor(tick / 4) % 2 === 0); return }
      n = Math.max(0, Math.min(word.length, n + (dir > 0 ? 1 : -2)))
      if (n >= word.length) { dir = -1; wait = 16 }
      if (n <= 0) { dir = 1; i += 1; wait = 5 }
      show(word.slice(0, n), true)
    }, 110)
    return () => clearInterval(id)
  }, [active, examples.join('|')])
  return hint
}
