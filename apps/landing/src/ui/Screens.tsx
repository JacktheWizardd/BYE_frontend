import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { loadCourses, searchCourses } from '../content/courseSearch'
import { allDays, course, fits, professors, professorSorts, reviewSorts, sections, sortReviews } from '../content/sample'
import type { Day, ProfessorSort, ReviewSort } from '../content/sample'
import { ArrowRight, CheckIcon, SearchIcon, SparkIcon } from './icons'
import { ProfessorCard } from './ProfessorCard'
import { countUp } from '../motion/reveal'

// The interactive app screens behind "how it works". Sample data only; every control works.

const reduced = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function SearchScreen({ query, setQuery, onPick, typing = false }: { query: string; setQuery: (q: string) => void; onPick: () => void; typing?: boolean }) {
  const [list, setList] = useState<Awaited<ReturnType<typeof loadCourses>> | null>(null)
  useEffect(() => { loadCourses().then(setList).catch(() => setList([])) }, [])
  // Real PCC courses match as you type; only the sample course opens the rest of the walkthrough.
  const found = list ? searchCourses(list, query) : []
  const matches = (found.length || query.trim() ? found : [{ code: course.code, title: course.title }])
    .map(c => ({ ...c, live: c.code === course.code }))
  return (
    <div className="space-y-4 p-4 md:p-5">
      <label className="flex items-center gap-3 rounded-xl border border-ink bg-card px-4 py-3 focus-within:ring-2 focus-within:ring-accent">
        <SearchIcon className="size-5 shrink-0 text-ink-3" />
        <span className="sr-only">Course code or title</span>
        <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && matches[0]?.live) onPick() }}
          placeholder="Course code or title" autoComplete="off" spellCheck={false}
          className="code min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:font-sans placeholder:text-ink-3" />
        {typing && <span aria-hidden="true" className="-ml-2 h-5 w-px animate-pulse bg-ink" />}
        <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs text-ink-3">{course.term}</span>
      </label>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line" aria-live="polite">
        {matches.map(c => (
          <li key={c.code}>
            {c.live
              ? <button type="button" onClick={onPick} className="flex min-h-12 w-full items-center justify-between gap-3 bg-linen px-4 py-2.5 text-left text-sm hover:bg-tile">
                  <span className="min-w-0"><span className="code">{c.code}</span> <span className="text-ink-2">· {c.title}</span></span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold">3 professors <ArrowRight className="size-4" /></span>
                </button>
              : <p className="flex min-h-12 items-center justify-between gap-3 bg-card px-4 py-2.5 text-sm text-ink-3">
                  <span className="min-w-0"><span className="code text-ink-2">{c.code}</span> · {c.title}</span><span className="shrink-0 text-xs">In the app</span>
                </p>}
          </li>
        ))}
        {matches.length === 0 && <li className="px-4 py-3 text-sm text-ink-3">No PCC course matches. Try <span className="code">math 5</span> or <span className="code">eth</span>.</li>}
      </ul>
      <p className="text-xs text-ink-3">Real PCC {course.term} course list · sample professors for <span className="code">{course.code}</span> only</p>
    </div>
  )
}

export function DayChips({ picked, toggle }: { picked: Day[]; toggle?: (d: Day) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Class days">
      {allDays.map(d => {
        const on = picked.includes(d)
        return (
          <button key={d} type="button" aria-pressed={on} onClick={() => toggle?.(d)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors ${on ? 'border-ink bg-ink text-paper' : 'border-line-strong bg-card text-ink hover:border-ink'}`}>
            {on && <CheckIcon className="size-4" />}{d}
          </button>
        )
      })}
    </div>
  )
}

export function DaysScreen({ picked, toggle }: { picked: Day[]; toggle: (d: Day) => void }) {
  const fitting = sections.filter(s => fits(s, picked)).length
  return (
    <div className="space-y-4 p-4 md:p-5">
      <DayChips picked={picked} toggle={toggle} />
      <p className="text-xs text-ink-3" aria-live="polite">{fitting} of {sections.length} sections fit your days · online sections always show</p>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {sections.map(s => {
          const ok = fits(s, picked)
          return (
            <li key={s.crn} className={`grid grid-cols-[1fr_auto] gap-x-3 px-4 py-2.5 text-sm transition-colors ${ok ? 'bg-card' : 'bg-linen text-ink-3'}`}>
              <span className={ok ? 'font-semibold' : 'line-through decoration-line-strong'}>{s.days === 'online' ? 'Online' : s.days.join(' · ')} · {s.time}</span>
              <span className="text-right text-xs text-ink-3">{s.seats === 0 ? 'Full' : `${s.seats} seats`}</span>
              <span className="col-span-2 text-xs text-ink-3"><span className="code">CRN {s.crn}</span> · {professors[s.prof].name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value as T)}
        className="min-h-10 cursor-pointer appearance-none rounded-full border border-line-strong bg-card py-1.5 pl-3.5 pr-8 text-sm font-semibold hover:border-ink">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
      <svg aria-hidden="true" viewBox="0 0 24 24" className="pointer-events-none absolute right-2.5 size-4 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
    </label>
  )
}

export function CompareScreen({ list, selected, onSelect, sort, setSort, onRead }: {
  list: number[]; selected: number; onSelect: (i: number) => void; sort: ProfessorSort; setSort: (s: ProfessorSort) => void; onRead: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || reduced()) return
    const bars = ref.current.querySelectorAll('[data-bar]')
    gsap.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 1.1, stagger: 0.08, ease: 'expo.out' })
    ref.current.querySelectorAll<HTMLElement>('[data-count]').forEach(el => countUp(el))
  }, [])
  if (list.length === 0) return <p className="p-6 text-sm text-ink-3">No professors teach on those days. Pick another day.</p>
  return (
    <div ref={ref} className="space-y-3 p-4 md:p-5">
      <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
        <span>{list.length} {list.length === 1 ? 'professor fits' : 'professors fit'} your days</span>
        <Select label="Sort professors" value={sort} options={professorSorts} onChange={setSort} />
      </div>
      {list.map(i => (
        <button key={i} type="button" aria-pressed={i === selected} onClick={() => onSelect(i)} className="block w-full text-left">
          <ProfessorCard p={professors[i]} selected={i === selected} />
        </button>
      ))}
      <button type="button" onClick={onRead} className="btn btn-primary w-full">Read reviews for {professors[selected].name} <ArrowRight className="size-5" /></button>
    </div>
  )
}

// AI review summaries are still in development, so the panel says so and types its preview out.
export function SummaryPanel({ text, className = '' }: { text: string; className?: string }) {
  const [shown, setShown] = useState(text.length)
  useEffect(() => {
    if (reduced()) { setShown(text.length); return }
    setShown(0)
    let n = 0
    const id = setInterval(() => { n += 3; setShown(Math.min(n, text.length)); if (n >= text.length) clearInterval(id) }, 24)
    return () => clearInterval(id)
  }, [text])
  return (
    <div className={`rounded-xl border border-line bg-linen p-4 ${className}`}>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
        <span className="inline-flex items-center gap-1.5"><SparkIcon className="size-4" /> AI review summary</span>
        <span className="rounded-full border border-dashed border-line-strong px-2 py-0.5 font-semibold text-ink-3">In development</span>
      </p>
      <p className="mt-2 min-h-[4.5em] text-sm leading-relaxed text-ink-2" aria-label={text}>
        <span aria-hidden="true">{text.slice(0, shown)}</span>
        {shown < text.length && <span aria-hidden="true" className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-ink" />}
      </p>
    </div>
  )
}

export function ReviewsScreen({ prof, sort, setSort }: { prof: number; sort: ReviewSort; setSort: (s: ReviewSort) => void }) {
  const p = professors[prof]
  return (
    <div className="space-y-4 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-[17px] font-bold">{p.name}</p>
          <p className="text-xs text-ink-3"><span className="code">{course.code}</span> · {p.ratings} ratings · {p.rating.toFixed(1)} overall</p>
        </div>
        <Select label="Sort reviews" value={sort} options={reviewSorts} onChange={setSort} />
      </div>
      <SummaryPanel text={p.summary} />
      <ul className="divide-y divide-line">
        {sortReviews(p.reviews, sort).map(r => (
          <li key={r.date} className="py-3">
            <div className="flex items-center gap-2 text-xs text-ink-3">
              <span className="rounded-md bg-tile px-1.5 py-0.5 font-semibold tabular-nums text-ink">{r.rating}.0</span>
              <span>Difficulty {r.difficulty}</span><span>·</span><span>{r.when}</span>
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{r.text}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
