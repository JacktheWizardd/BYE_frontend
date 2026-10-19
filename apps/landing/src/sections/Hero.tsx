import { useState } from 'react'
import { course, professors, professorSorts, sortProfessors, sortReviews } from '../content/sample'
import type { ProfessorSort } from '../content/sample'
import { DEMO_LABEL, DEMO_URL, DOWNLOADS_OPEN } from '../content/site'
import { AppWindow, Caption } from '../ui/AppWindow'
import { ArrowRight } from '../ui/icons'
import { ProfessorCard } from '../ui/ProfessorCard'
import { Select } from '../ui/Screens'

export function Hero() {
  // The hero window works: sort the professors, tap one, and the floating card shows their latest review.
  const [sort, setSort] = useState<ProfessorSort>('Highest rated')
  const [selected, setSelected] = useState(0)
  const order = sortProfessors(professors.map((_, i) => i), sort)
  const latest = sortReviews(professors[selected].reviews, 'Latest first')[0]

  return (
    <section id="top" className="relative isolate overflow-hidden">
      {/* Ambient WebGL field mounts here on capable desktops only (src/motion/ambient.ts). */}
      <div data-ambient aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10" />
      <div className="wrap grid grid-cols-[minmax(0,1fr)] gap-12 pb-16 pt-12 md:pt-16 lg:grid-cols-12 lg:items-start lg:gap-8 lg:pb-28 lg:pt-24">
        <div className="min-w-0 lg:col-span-6 lg:pt-6">
          <h1 data-hero-title className="text-[44px] leading-[1.04] tracking-[-0.035em] md:text-[60px] lg:text-[clamp(60px,6.4vw,88px)]">
            Know your professor <span data-swipe className="swipe">before you enroll.</span>
          </h1>
          <p className="mt-6 max-w-[30rem] text-lg leading-relaxed text-ink-2 lg:text-xl">
            Every section of a PCC class next to professor ratings, difficulty and student reviews. You choose; BYE never picks for you.
          </p>
          {/* Phones and tablets lead with the web demo; desktop leads with Install (Mac now, Windows coming soon). */}
          <div className="mt-8 flex flex-col gap-3 md:flex-row md:flex-wrap">
            <a href={DEMO_URL} className="btn btn-primary lg:hidden">Try the web demo <ArrowRight className="size-5" /></a>
            <a href="#download" className="btn lg:hidden">{DOWNLOADS_OPEN ? 'Install on Mac or Windows' : 'Mac app · available soon'}</a>
            <a href="#download" className="btn btn-primary hidden lg:inline-flex">{DOWNLOADS_OPEN ? 'Install' : 'Available soon'} <ArrowRight className="size-5" /></a>
            <a href={DEMO_URL} className="btn hidden lg:inline-flex">Try the web demo</a>
          </div>
          <p className="mt-4 text-[13px] text-ink-3">
            Free · made by a PCC student<span className="hidden lg:inline"> · {DOWNLOADS_OPEN ? 'Mac now' : 'Mac soon'}, Windows coming soon · web demo: {DEMO_LABEL.toLowerCase()}</span><span className="lg:hidden"> · the web demo uses sample data</span>
          </p>
        </div>

        <figure data-tilt className="relative m-0 lg:col-span-6 lg:col-start-7 [perspective:1400px]">
          <div data-tilt-target className="relative [transform-style:preserve-3d]">
            <AppWindow title={course.code} meta={`${course.term} · ${professors.length} professors · Tue · Thu`}>
              <div className="space-y-3 p-4 md:p-5">
                <div className="flex items-center justify-between gap-3 text-xs text-ink-3">
                  <span>Tap a professor</span>
                  <Select label="Sort professors" value={sort} options={professorSorts} onChange={setSort} />
                </div>
                {order.map((i, n) => (
                  <button key={i} type="button" aria-pressed={i === selected} onClick={() => setSelected(i)}
                    className={`block w-full text-left ${n === 2 ? 'hidden md:block' : ''}`}>
                    <ProfessorCard p={professors[i]} selected={i === selected} />
                  </button>
                ))}
              </div>
            </AppWindow>
            <div data-depth="0.6" aria-live="polite" className="absolute -bottom-6 -left-3 hidden w-64 rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow-float)] md:block lg:-left-10">
              <p className="text-xs font-semibold">Latest review · {latest.when}</p>
              <p key={selected} className="story-screen mt-1.5 text-[13px] leading-snug text-ink-2">“{latest.text}”</p>
              <p className="mt-2 text-[11px] text-ink-3">{professors[selected].name}</p>
            </div>
          </div>
          <Caption className="mt-10 md:mt-12">Illustration with sample data, not real professors</Caption>
        </figure>
      </div>
    </section>
  )
}
