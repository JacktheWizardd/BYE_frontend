import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { course, fits, sections, sortProfessors, startDays } from '../content/sample'
import type { Day, ProfessorSort, ReviewSort } from '../content/sample'
import { DEMO_LABEL, DEMO_URL } from '../content/site'
import { scrollToY } from '../motion/lenis'
import { AppWindow, Caption } from '../ui/AppWindow'
import { ArrowRight } from '../ui/icons'
import { CompareScreen, DaysScreen, ReviewsScreen, SearchScreen } from '../ui/Screens'

const steps: { title: string; short: string; text: ReactNode }[] = [
  { title: 'Search a course', short: 'Search', text: <>Type a code like <span className="code">math 5a</span> or a title. Every PCC {course.term} course is searchable.</> },
  { title: 'Keep the days you’re free', short: 'Days', text: 'Tap your class days. Sections on other days drop away; online sections always stay.' },
  { title: 'Compare professors', short: 'Compare', text: 'Rating, difficulty, “would take again” and how many students rated them. Tap one to choose.' },
  { title: 'Read what students said', short: 'Reviews', text: 'Sort the reviews your way: newest, oldest, by rating or by difficulty. AI summaries are in development.' },
]

// An interactive, sample-data walk through the app. The window pins while you scroll and each
// stretch of scroll moves to the next step; every control inside still works, and the step
// buttons scroll to their step. With reduced motion it stays unpinned and the buttons switch steps.
export function Story() {
  const [step, setStep] = useState(0)
  const [query, setQuery] = useState(course.code)
  const [picked, setPicked] = useState<Day[]>(startDays)
  const [prof, setProf] = useState(0)
  const [profSort, setProfSort] = useState<ProfessorSort>('Highest rated')
  const [reviewSort, setReviewSort] = useState<ReviewSort>('Latest first')
  const [scrolling, setScrolling] = useState(false)
  const demo = useRef<HTMLDivElement>(null)
  const trigger = useRef<ScrollTrigger | null>(null)
  const current = useRef(0)

  const list = sortProfessors([...new Set(sections.filter(s => fits(s, picked)).map(s => s.prof))], profSort)
  const toggle = (d: Day) => setPicked(p => (p.includes(d) ? p.filter(x => x !== d) : [...p, d]))
  const go = (i: number) => {
    const t = trigger.current
    if (t) scrollToY(t.start + (i / steps.length) * (t.end - t.start) + 2)
    else { current.current = i; setStep(i) }
  }

  useEffect(() => {
    const el = demo.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.registerPlugin(ScrollTrigger)
    const mm = gsap.matchMedia()
    // 1024px matches Tailwind's `lg`, where the layout switches to two columns.
    mm.add({ desk: '(min-width: 1024px)', phone: '(max-width: 1023.98px)' }, ctx => {
      const desk = Boolean(ctx.conditions?.desk)
      trigger.current = ScrollTrigger.create({
        trigger: el, pin: true, anticipatePin: 1,
        // Centered in the space under the nav; never higher than just below it when the block is tall.
        start: () => {
          const free = window.innerHeight - 64 - el.getBoundingClientRect().height
          return 'top ' + Math.round(64 + Math.max(desk ? 12 : 8, free / 2)) + 'px'
        },
        end: () => '+=' + Math.round(window.innerHeight * (desk ? 3.6 : 3.2)),
        // A hold on every step: when scrolling stops, settle on the nearest step start in the scroll
        // direction, so a quick flick lands on a step instead of sliding past it.
        snap: { snapTo: [0, 0.25, 0.5, 0.75, 1], directional: false, duration: { min: 0.2, max: 0.55 }, delay: 0.06, ease: 'power1.inOut' },
        onUpdate: self => {
          const p = self.progress * steps.length
          const i = Math.min(steps.length - 1, Math.floor(p))
          el.style.setProperty('--p', String(Math.min(1, p - i)))
          if (i !== current.current) { current.current = i; setStep(i) }
        },
      })
      setScrolling(true)
      return () => { trigger.current = null; setScrolling(false) }
    })
    return () => mm.revert()
  }, [])
  useEffect(() => { if (!list.includes(prof) && list.length) setProf(list[0]) }, [list, prof])

  // When the search step comes into view, type a search the way a student would: "math 5" lists
  // the 5A/5B/5C family, then "a" narrows it. Stops for good once the visitor types themself.
  const [typing, setTyping] = useState(false)
  const edited = useRef(false)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = demo.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true) }, { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  useEffect(() => {
    if (!seen || step !== 0 || edited.current) return
    const script = ['m', 'ma', 'mat', 'math', 'math ', 'math 5', 'math 5', 'math 5', 'math 5', 'math 5', 'math 5a']
    let i = 0
    setTyping(true); setQuery('')
    const id = setInterval(() => { setQuery(script[i]); i += 1; if (i >= script.length) { clearInterval(id); setTyping(false) } }, 140)
    return () => { clearInterval(id); setTyping(false) }
  }, [seen, step])
  const typeQuery = (q: string) => { edited.current = true; setTyping(false); setQuery(q) }

  const screen = [
    <SearchScreen key="s" query={query} setQuery={typeQuery} typing={typing} onPick={() => go(1)} />,
    <DaysScreen key="d" picked={picked} toggle={toggle} />,
    <CompareScreen key="c" list={list} selected={prof} onSelect={setProf} sort={profSort} setSort={setProfSort} onRead={() => go(3)} />,
    <ReviewsScreen key="r" prof={prof} sort={reviewSort} setSort={setReviewSort} />,
  ][step]

  return (
    <section id="how" className="border-t border-line py-12 lg:py-20">
      <div className="wrap">
        {/* The heading and intro are inside the pinned block, so they stay on screen while the steps advance. */}
        <div data-demo ref={demo}>
        <div>
          <h2 className="text-[28px] leading-[1.1] md:text-4xl lg:text-[clamp(40px,7.2svh,64px)]">From a course code to a decision, in one tab.</h2>
          <p className="mt-2 text-[14px] text-ink-2 lg:text-[clamp(16px,2.4svh,20px)]">Scroll to walk through it, or tap anything to try it. Everything works, with sample data.</p>
        </div>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:mt-6 lg:grid-cols-12 lg:items-start lg:gap-10">
          <ol className="grid min-w-0 grid-cols-4 gap-1 lg:col-span-5 lg:grid-cols-1 lg:gap-1" aria-label="Steps">
            {steps.map((s, i) => {
              const on = i === step
              return (
                <li key={s.title}>
                  <button type="button" onClick={() => go(i)} aria-current={on ? 'step' : undefined}
                    className={`relative block w-full min-w-0 overflow-hidden rounded-xl px-1 py-2.5 text-center transition-colors lg:rounded-none lg:border-l lg:py-2 lg:pl-7 lg:pr-2 lg:text-left ${on ? 'bg-card shadow-[var(--shadow-soft)] lg:border-ink lg:bg-transparent lg:shadow-none' : 'text-ink-3 hover:text-ink lg:border-line'}`}>
                    {on && scrolling && <span aria-hidden="true" className="story-progress absolute bottom-0 left-0 h-0.5 bg-accent lg:left-[-1px] lg:top-0 lg:h-auto lg:w-0.5" />}
                    <span className="block font-display text-sm tabular-nums lg:text-xl">{i + 1}</span>
                    <span className="block truncate text-[12px] font-semibold lg:hidden">{s.short}</span>
                    <span className={`hidden font-display text-[22px] font-bold leading-tight lg:block ${on ? 'text-ink' : ''}`}>{s.title}</span>
                    <span className={`mt-1 hidden max-w-sm text-[14px] lg:block ${on ? 'text-ink-2' : ''}`}>{s.text}</span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="min-w-0 lg:col-span-7">
            {/* The pinned block must keep one height for every step (the pin reserves its space once),
                so the description gets two fixed lines and the screen a fixed height. The screens are compact and
                never scroll inside, so a finger or wheel on the window always scrolls the page. */}
            <p className="mb-3 line-clamp-2 h-[3.1em] text-[15px] leading-[1.55] text-ink-2 lg:hidden">{steps[step].text}</p>
            <AppWindow title={course.code} meta={`${course.term} · ${steps[step].short}`}>
              <div key={step} className="story-screen h-[clamp(350px,calc(100svh-440px),400px)] overflow-hidden lg:h-[clamp(340px,calc(100svh-372px),400px)]">{screen}</div>
              <div className="hidden items-center justify-between gap-3 border-t border-line bg-paper px-4 py-0.5 lg:flex">
                {step < steps.length - 1
                  ? <button type="button" onClick={() => go(step + 1)} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold">Next: {steps[step + 1].short.toLowerCase()} <ArrowRight className="size-4" /></button>
                  : <a href={DEMO_URL} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold no-underline">Open the full web demo <ArrowRight className="size-4" /></a>}
                <span className="text-xs text-ink-3">{DEMO_LABEL}</span>
              </div>
            </AppWindow>
            <Caption>{DEMO_LABEL} · not real professors · <a href={DEMO_URL} className="font-semibold text-ink">open the full web demo</a></Caption>
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
