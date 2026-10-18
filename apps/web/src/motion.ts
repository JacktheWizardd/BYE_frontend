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
export function useTypedHint(examples: string[], active: boolean) {
  const [hint, setHint] = useState('')
  useEffect(() => {
    if (!active || reducedMotion()) { setHint(''); return }
    let i = 0, n = 0, dir = 1, wait = 0
    const id = setInterval(() => {
      if (wait > 0) { wait -= 1; return }
      const word = examples[i % examples.length]
      n += dir
      if (n >= word.length) { dir = -1; wait = 14 }
      if (n <= 0) { dir = 1; i += 1; wait = 4 }
      setHint(word.slice(0, Math.max(0, n)))
    }, 110)
    return () => clearInterval(id)
  }, [active, examples.join('|')])
  return hint
}
