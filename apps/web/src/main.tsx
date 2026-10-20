import { ByeReviews } from './bye-reviews'
import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/jetbrains-mono/500.css'
import type { Command, Professor, Snapshot, Suggestion, Term } from '@shared/types'
import { orderProfessors } from '@shared/domain'
import { bridge, isDemo } from './bridge'
import { WEEKDAYS, fits, formatLabel, titleCase, type Weekday } from './schedule'
import { Chooser, DayBubbles, EmptyDetail, LoadingRows, ProfessorList, Report, SampleTag, Segmented, SurfaceProvider, Wordmark, plural, useTypedHint } from '../../../packages/ui'
import { loadCourses, searchCourses } from '../../landing/src/content/courseSearch'
import './styles.css'
import '../../../packages/ui/styles.css'

const empty: Snapshot = { operationId: '', professors: [], loading: false, previewPending: 0 }
const EXAMPLES = ['MATH 5A', 'ETH 014', 'ENGL 1A']
// The typed search hint cycles through more examples: codes and class titles, all of which find sample data.
const HINTS = ['MATH 5A', 'Calculus', 'ETH 014', 'Ethnic studies', 'ENGL 1A', 'Reading and composition', 'math 5a', 'Composition']
const PHONE = '(max-width: 759px)'
type Screen = 'search' | 'list' | 'report'
interface Recent { display: string; title: string }

const isPhone = () => typeof matchMedia === 'function' && matchMedia(PHONE).matches

// Recent searches stay in this browser only; storage can be unavailable (private mode), so failures are ignored.
function loadRecent(): Recent[] { try { return (JSON.parse(localStorage.getItem(isDemo ? 'bye-recent' : 'bye-live-recent') ?? '[]') as Recent[]).filter(r => typeof r?.display === 'string' && typeof r?.title === 'string').slice(0, 3) } catch { return [] } }
function saveRecent(list: Recent[]) { try { localStorage.setItem(isDemo ? 'bye-recent' : 'bye-live-recent', JSON.stringify(list)) } catch { /* not available */ } }

// Testers mistook the demo for the real thing, so the demo banner is loud, complete on phones too,
// and stays on screen. Its height is published as --banner-h so the sticky bars sit under it.
function DemoBanner() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const set = () => document.documentElement.style.setProperty('--banner-h', el.offsetHeight + 'px')
    set(); const ro = new ResizeObserver(set); ro.observe(el); return () => ro.disconnect()
  }, [])
  if (!isDemo) return <div ref={ref} className="demo-banner" role="note"><b>PCC beta</b> · Check source timestamps before enrolling.</div>
  return <div ref={ref} className="demo-banner" role="note">
    <span className="demo-tag">Demo</span>
    <span><b>Sample data for now.</b> These professors, ratings and reviews are made up to show how BYE works.</span>
    <a href="/#download">Get real PCC data →</a>
  </div>
}

function HowItWorks() {
  return <aside className="how-card" aria-labelledby="how-title">
    <div className="window-bar" aria-hidden="true"><span className="dots"><i /><i /><i /></span><span className="chip">Web demo</span><span className="muted small">sample data</span></div>
    <div className="how-body">
      <h2 id="how-title">How the demo works</h2>
      <ol className="how-list">
        <li><b>The professors are made up.</b><span>Every professor, rating and review in this demo is sample data. None of them are real PCC instructors.</span></li>
        <li><b>The course list is real.</b><span>Search shows real PCC Fall 2026 courses. Sample professors exist only for MATH 5A, ETH 014 and ENGL 1A.</span></li>
        <li><b>Everything else works.</b><span>Pick class days, compare professors, sort reviews and open each section.</span></li>
      </ol>
      <div className="how-cta">
        <p><b>Want real PCC data?</b> The app shows real professors, ratings and reviews.</p>
        <a className="button primary" href="/#download">Install BYE →</a>
        <span className="muted small">Mac now · Windows coming soon</span>
      </div>
    </div>
  </aside>
}

function CourseField(props: { term: string; query: string; setQuery: (q: string) => void; onPick: (q: string) => void; recent: Recent[] }) {
  const { term, query, setQuery, onPick, recent } = props
  const [open, setOpen] = useState(false), [items, setItems] = useState<Suggestion[]>([]), [index, setIndex] = useState(-1)
  const sequence = useRef(0), input = useRef<HTMLInputElement>(null)
  const hint = useTypedHint(HINTS, !open && !query)
  // Demo only: real PCC courses without sample data are listed after the sample matches, never selectable.
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof loadCourses>> | null>(null)
  useEffect(() => { if (isDemo && open && !catalog) loadCourses().then(setCatalog).catch(() => setCatalog([])) }, [open])
  const bare = (code: string) => code.toLowerCase().replace(/\s+/g, '').replace(/^([a-z]+)0+(?=\d)/, '$1')
  const sampleCodes = new Set(items.map(s => bare(s.course.display)))
  const real = isDemo && open && catalog && query.trim() ? searchCourses(catalog, query, 8).filter(c => !sampleCodes.has(bare(c.code))).slice(0, Math.max(2, 6 - items.length)) : []
  useEffect(() => {
    const id = ++sequence.current
    if (!open || !term || !query.trim()) { setItems([]); return }
    const timer = setTimeout(() => {
      bridge.command({ kind: 'suggest', term, query }).then(r => { if (sequence.current === id) { setItems(r as Suggestion[]); setIndex(-1) } }).catch(() => setItems([]))
    }, 100)
    return () => clearTimeout(timer)
  }, [query, term, open])
  const pick = (display: string) => { setQuery(display); setOpen(false); setItems([]); input.current?.blur(); onPick(display) }
  const showRecent = open && !query.trim() && recent.length > 0
  const needle = query.trim().toLowerCase()
  const mark = (title: string) => {
    const text = titleCase(title), at = needle ? text.toLowerCase().indexOf(needle) : -1
    return at < 0 ? text : <>{text.slice(0, at)}<b>{text.slice(at, at + needle.length)}</b>{text.slice(at + needle.length)}</>
  }
  return <div className={`course-field${open ? ' focused' : ''}`}>
    <div className="field-box">
      <svg className="search-glyph" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.6-3.6" /></svg>
      <input ref={input} id="course" role="combobox" aria-autocomplete="list" aria-expanded={items.length > 0} aria-controls="course-options"
        aria-activedescendant={index >= 0 ? `suggestion-${index}` : undefined} placeholder={hint ?? 'MATH 5A or a class title'} value={query}
        autoComplete="off" autoCorrect="off" autoCapitalize="characters" spellCheck={false} enterKeyHint="search"
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 120)} onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setIndex(i => Math.min(i + 1, items.length - 1)) }
          if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setIndex(i => Math.max(i - 1, 0)) }
          if (e.key === 'Escape') { setOpen(false); setItems([]) }
          if (e.key === 'Enter' && index >= 0 && items[index]) { e.preventDefault(); pick(items[index].course.display) }
        }} />
      {query && <button type="button" className="clear" aria-label="Clear" onMouseDown={e => e.preventDefault()} onClick={() => { setQuery(''); input.current?.focus() }}>×</button>}
    </div>
    {(items.length > 0 || showRecent || real.length > 0) && <div className="suggestions">
      {items.length > 0 && <><div className="group-label">{isDemo ? 'Sample classes' : 'Classes'}</div>
        <ul id="course-options" role="listbox">{items.map((s, i) =>
          <li id={`suggestion-${i}`} key={s.course.key} role="option" aria-selected={index === i} className={index === i ? 'active' : ''} onMouseDown={e => { e.preventDefault(); pick(s.course.display) }}>
            <span className="code">{s.course.display}</span><span>{mark(s.title)}</span>
          </li>)}</ul></>}
      {real.length > 0 && <><div className="group-label">Real PCC courses · no sample data in the demo</div>
        <ul aria-label="Real PCC courses without sample data">{real.map(c => <li key={c.code} className="real" aria-disabled="true"><span className="code">{c.code}</span><span>{c.title}<small> · in the app</small></span></li>)}</ul></>}
      {showRecent && <><div className="group-label">Recent</div>
        <ul>{recent.map(r => <li key={r.display} onMouseDown={e => { e.preventDefault(); pick(r.display) }}><span className="code">{r.display}</span><span className="muted">{r.title}</span></li>)}</ul></>}
    </div>}
  </div>
}

function SearchView(props: { terms: Term[]; termCode: string; setTermCode: (t: string) => void; query: string; setQuery: (q: string) => void; days: Weekday[]; setDays: React.Dispatch<React.SetStateAction<Weekday[]>>; recent: Recent[]; search: (q?: string) => void; error: string }) {
  const { terms, termCode, setTermCode, query, setQuery, days, setDays, recent, search, error } = props
  const toggle = (d: Weekday) => setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : WEEKDAYS.map(w => w.key).filter(k => k === d || prev.includes(k)))
  return <div className="screen search-screen screen-in">
    <header className="topbar">
      <a className="home" href="/" aria-label="BYE home"><Wordmark /><span className="tagline">Before You Enroll</span></a>
      <span className="row nav-links"><a className="text-link" href="/reviews/">Write a review</a><a className="text-link" href="/">Home</a><a className="button primary nav-install" href="/#download">Install</a></span>
    </header>
    <main className="search-main">
      <div className={`search-layout${isDemo ? ' with-card' : ''}`}>
      <form className="search-form" onSubmit={e => { e.preventDefault(); search() }}>
        <div>
          <h1>Find your <span className="swipe">professor.</span></h1>
          <p className="lead muted">{isDemo ? <>A demo with <b className="ink">made-up professors and reviews</b>. The course list is real PCC Fall 2026.</> : 'Every section of a PCC class, with ratings and reviews.'}</p>
        </div>
        <div className="field">
          <label htmlFor="course">Class</label>
          <CourseField term={termCode} query={query} setQuery={setQuery} onPick={q => search(q)} recent={recent} />
        </div>
        <div className="field">
          <label htmlFor="term">Semester</label>
          <select id="term" value={termCode} disabled={!terms.length} onChange={e => setTermCode(e.target.value)}>
            {!terms.length && <option value="">Loading semesters…</option>}
            {terms.map(t => <option key={t.termCode} value={t.termCode}>{t.termName}</option>)}
          </select>
        </div>
        <div className="field">
          <div className="row"><span className="label" id="days-label">Class days</span>{days.length ? <button type="button" className="text-link" onClick={() => setDays([])}>Clear</button> : <span className="muted small">Optional</span>}</div>
          <div className="days" role="group" aria-labelledby="days-label">{WEEKDAYS.map(d =>
            <button type="button" key={d.key} className="day" aria-pressed={days.includes(d.key)} aria-label={d.label} onClick={() => toggle(d.key)}>{d.short}</button>)}</div>
          <span className="muted small">Only classes meeting on these days. Online classes always show.</span>
        </div>
        {error && <div className="notice" role="alert"><p><b>Problem</b> {error}</p>{!isDemo && <><button className="text-link" type="button" onClick={() => location.reload()}>Try loading semesters again</button><a className="text-link" href="/demo/">Use the sample demo →</a></>}</div>}
        <div className="examples"><span className="muted small">Try</span>{EXAMPLES.map(x => <button key={x} type="button" className="chip" onClick={() => { setQuery(x); search(x) }}>{x}</button>)}</div>
        <div className="search-action"><button className="button primary wide" type="submit" disabled={!termCode || !query.trim()}>Find professors <span aria-hidden="true">→</span></button></div>
      </form>
      {isDemo && <HowItWorks />}
      </div>
    </main>
  </div>
}

function App() {
  const [state, setState] = useState(empty), [terms, setTerms] = useState<Term[]>([]), [termCode, setTermCode] = useState('')
  const [query, setQuery] = useState(''), [screen, setScreen] = useState<Screen>('search'), [error, setError] = useState('')
  const [selected, setSelected] = useState(''), [sort, setSort] = useState('rating'), [days, setDays] = useState<Weekday[]>([])
  const [onlineOnly, setOnlineOnly] = useState(false)
  const [showOther, setShowOther] = useState(false), [recent, setRecent] = useState<Recent[]>(loadRecent)
  const lastOperation = useRef(''), opened = useRef(''), listScroll = useRef(0)
  const command = (c: Command) => { bridge.command(c).catch(e => setError(e instanceof Error ? e.message : 'This action failed. Try again.')) }

  // Each screen is a history entry, so the phone's back gesture returns to the previous screen instead of leaving.
  function go(next: Screen) {
    if (next === screen) return
    if (screen === 'list') listScroll.current = window.scrollY
    history.pushState({ bye: next }, ''); setScreen(next); window.scrollTo(0, 0)
  }
  useEffect(() => {
    history.replaceState({ bye: 'search' }, '')
    const onPop = (e: PopStateEvent) => {
      const next: Screen = e.state?.bye ?? 'search'
      setScreen(next)
      if (next === 'list') requestAnimationFrame(() => window.scrollTo(0, listScroll.current))
    }
    addEventListener('popstate', onPop)
    const unsubscribe = bridge.subscribe(setState)
    bridge.command({ kind: 'terms' }).then(r => { const t = r as Term[]; setTerms(t); setTermCode(t[0]?.termCode ?? '') }).catch(e => setError(e instanceof Error ? e.message : 'Semesters could not be loaded.'))
    return () => { removeEventListener('popstate', onPop); unsubscribe() }
  }, [])
  useEffect(() => { if (state.operationId !== lastOperation.current) { lastOperation.current = state.operationId; opened.current = ''; setSelected(''); setShowOther(false) } }, [state.operationId])

  const course = state.course
  const title = titleCase(state.professors[0]?.sections[0]?.title ?? '')
  useEffect(() => {
    if (!course) return
    const next = [{ display: course.display, title }, ...loadRecent().filter(r => r.display !== course.display)].slice(0, 3)
    saveRecent(next); setRecent(next)
  }, [course?.key])

  const sorted = course ? orderProfessors(state.professors, sort, course) : state.professors
  const fitting = sorted.filter(p => p.sections.some(s => fits(s, days) && (!onlineOnly || formatLabel(s) === 'Online · async')))
  const otherDays = sorted.filter(p => !fitting.includes(p))
  const list = showOther ? [...fitting, ...otherDays] : fitting
  const p = list.find(x => x.id === selected)
  const chooser = state.professors.find(x => x.choosing)

  // Load every review once a report is open and the quick previews have settled, like the desktop app.
  useEffect(() => {
    if (!p?.profile || p.state !== 'ready' || state.previewPending) return
    if (isPhone() && screen !== 'report') return
    const key = `${state.operationId}|${p.id}|${p.profile.id}`
    if (opened.current !== key) { opened.current = key; command({ kind: 'details', professorId: p.id, ...(isDemo ? {} : { filter: 'this' }) }) }
  }, [p?.id, p?.profile?.id, p?.state, state.previewPending, screen])

  function search(text = query) {
    const term = terms.find(t => t.termCode === termCode)
    if (!term || !text.trim()) return
    setError(''); command({ kind: 'search', query: text, term }); go('list')
  }
  function open(x: Professor) {
    setSelected(x.id)
    if (x.state === 'choose') command({ kind: 'discover', professorId: x.id })
    else if (isPhone()) go('report')
  }
  const back = () => history.back()
  const checked = state.professors.filter(x => x.state !== 'pending' && x.state !== 'loading').length
  const sections = state.professors.reduce((n, x) => n + x.sections.length, 0)
  // Open seats across the listed sections, when PCC published them and the schedule isn't stale.
  const seatCounts = list.flatMap(x => x.sections).filter(s => fits(s, days) && !s.source?.stale).map(s => s.details?.seatsOpen).filter((n): n is number => n !== undefined)
  const openSeats = seatCounts.length ? seatCounts.reduce((a, b) => a + b, 0) : undefined

  return <SurfaceProvider demo={isDemo}><div className="app">
    <DemoBanner />
    {screen === 'search' ? <SearchView terms={terms} termCode={termCode} setTermCode={setTermCode} query={query} setQuery={setQuery} days={days} setDays={setDays} recent={recent} search={search} error={error} /> :
      <div className={`screen results on-${screen} screen-in`}>
        <header className="results-bar">
          <div className="results-row">
            <button className="icon-button" onClick={back} aria-label="Change search"><span aria-hidden="true">←</span></button>
            <a className="home wide-only" href="../" aria-label="BYE home"><Wordmark /></a>
            <div className="results-title">
              <span className="title-line">{course ? <span className="chip">{course.display}</span> : <span className="muted">Finding sections…</span>}{title && <span className="course-title">{title}</span>}<SampleTag>Sample data</SampleTag></span>
              <span className="muted small">{state.term?.termName}</span>
            </div>
            {state.loading ? <button className="text-link" onClick={() => command({ kind: 'stop' })}>Stop</button> : <button className="text-link" onClick={back}>Edit</button>}
          </div>
          {state.professors.length > 0 && state.loading && <div className="progress" role="status">
            <span className="bar thin" role="progressbar" aria-label="Checking RMP" aria-valuemin={0} aria-valuemax={state.professors.length} aria-valuenow={checked}><i style={{ width: `${(checked / state.professors.length) * 100}%` }} /></span>
            <span>Checking RMP… {checked} of {state.professors.length}</span>
          </div>}
        </header>
        <div className="panes">
          <aside className="list-pane" aria-label="Professors">
            <div className="row baseline"><h1 className="list-title">Professors</h1>{course && <span className="muted small">{plural(state.professors.length, 'professor')} · {plural(sections, 'section')}</span>}</div>
            {isDemo && <p className="sample-note">Sample professors · made up for this demo</p>}
            <div className="results-filters">
              <DayBubbles days={days} onChange={setDays} disabled={onlineOnly} />
              <button type="button" className="pill online-toggle" aria-pressed={onlineOnly} onClick={() => setOnlineOnly(v => !v)}>Online only</button>
            </div>
            <Segmented label={isDemo ? 'Sort professors' : 'Sort professors by RMP scores'} value={sort} onChange={setSort}
              options={[['rating', 'Rating'], ['difficulty', 'Difficulty'], ['reviews', 'Reviews']] as const} />
            {!isDemo && <p className="muted small">Sorting uses Rate My Professors scores.</p>}
            {state.issue && <p className="notice" role="status"><b>Problem</b> {state.issue}</p>}
            {error && <p className="notice" role="alert"><b>Problem</b> {error}</p>}
            {!course && state.loading && <LoadingRows />}
            <ProfessorList list={list} selectedId={isPhone() ? undefined : p?.id} onOpen={open} openOnArrow={!isPhone()} />
            {!onlineOnly && otherDays.length > 0 && <p className="muted small other-note">{plural(otherDays.length, 'professor')} only {otherDays.length === 1 ? 'teaches' : 'teach'} on other days. <button className="text-link" onClick={() => setShowOther(v => !v)}>{showOther ? 'Hide' : 'Show'}</button></p>}
          </aside>
          <section className="report-pane">{p && course ? <Report p={p} course={course} matches={s => fits(s, days)} back={back} command={command} byeReviews={<ByeReviews key={p.id + '|' + course.key} name={p.name} course={course.display} />} /> :
            !state.loading && <EmptyDetail professors={list.length} openSeats={openSeats} />}</section>
        </div>
      </div>}
    <Chooser p={chooser} course={course} command={command} onSelect={profileId => {
      if (!chooser) return
      command({ kind: 'select', professorId: chooser.id, profileId }); setSelected(chooser.id)
      if (isPhone() && screen === 'list') go('report')
    }} />
  </div></SurfaceProvider>
}

createRoot(document.getElementById('root')!).render(<App />)
