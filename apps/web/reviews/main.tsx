import React, { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { questionLabel, REVIEW_COMMENT_LIMIT, TEST_REVIEW_PREFIX, type ReviewCourse, type ReviewDimension, type ReviewInput, type ReviewProfessor, type ReviewSession } from '../../../packages/core/reviews'
import { api, FormError } from './api'
import { AppWindow } from '../../landing/src/ui/AppWindow'
import { CheckIcon, LockIcon, MailIcon } from '../../landing/src/ui/icons'
import { Footer } from '../../landing/src/sections/Footer'
import { DEMO_URL } from '../../landing/src/content/site'
import './reviews.css'

// Review page. Same design system as the home page (apps/landing). The flow, API calls and rules are
// unchanged: verify a school email with a code, pick the course and professor, rate, check, submit.

type Choice = { id:string; label:string; detail?:string }
const initial = () => ({ quality:'', difficulty:'', body:'', answers:{} as Record<string,string> })
const cap = (s:string) => s.charAt(0).toUpperCase() + s.slice(1)
const STEPS = ['Verify', 'Class', 'Rate', 'Check'] as const

const field = 'block w-full min-h-13 rounded-xl border-[1.5px] border-line-strong bg-card px-4 py-3 text-[17px] text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-ink'
const textLink = 'inline-flex min-h-11 items-center text-[15px] font-semibold text-ink underline decoration-line-strong underline-offset-4 hover:decoration-ink disabled:opacity-50'

function SearchChoice({ label, kind, selected, onSelect, onAuthError }: { label:string; kind:'courses'|'professors'; selected:Choice|null; onSelect:(choice:Choice|null)=>void; onAuthError:(error:unknown)=>void }) {
  const id = useId(), [query,setQuery] = useState(''), [items,setItems] = useState<Choice[]>([]), [open,setOpen] = useState(false)
  const [busy,setBusy] = useState(false), [error,setError] = useState(''), [index,setIndex] = useState(-1), [retry,setRetry] = useState(0)
  useEffect(() => {
    if (selected || query.trim().length < 2 || !open) { setItems([]); setBusy(false); return }
    const abort = new AbortController(); setBusy(true); setError(''); setIndex(-1)
    const timer = setTimeout(() => {
      api<(ReviewCourse|ReviewProfessor)[]>(kind + '?q=' + encodeURIComponent(query.trim()), undefined, abort.signal).then(rows => {
        if (abort.signal.aborted) return
        setItems(rows.map(row => 'code' in row ? { id:row.id,label:row.code,detail:row.title } : { id:row.id,label:[row.first_name,row.last_name].filter(Boolean).join(' ') }))
      }).catch(e => { if (!abort.signal.aborted) { setItems([]); setError(e.message); onAuthError(e) } }).finally(() => { if (!abort.signal.aborted) setBusy(false) })
    }, 250)
    return () => { clearTimeout(timer); abort.abort() }
  }, [query,selected,open,retry])
  const pick = (choice:Choice) => { onSelect(choice); setQuery(''); setOpen(false); setItems([]) }
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={id} className="font-semibold">{label}</label>
    {selected ? <div className="review-picked flex items-center justify-between gap-3 rounded-xl border-[1.5px] border-ink bg-card px-4 py-3">
      <div className="grid min-w-0 gap-0.5 [overflow-wrap:anywhere]"><b className="font-display text-[17px]">{selected.label}</b>{selected.detail && <span className="text-[13px] text-ink-3">{selected.detail}</span>}</div>
      <button className={`${textLink} shrink-0 text-[13px]`} type="button" onClick={() => { onSelect(null); setQuery(''); setOpen(true) }}>Change {label.toLowerCase()}</button>
    </div> : <>
      <input id={id} type="search" role="combobox" aria-expanded={open && items.length > 0} aria-controls={id+'-list'} aria-autocomplete="list" aria-activedescendant={index >= 0 ? id+'-'+index : undefined}
        autoComplete="off" maxLength={80} placeholder={kind === 'courses' ? 'Course code or title, like MATH 005A' : 'Professor name'} value={query} className={field}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false),150)} onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setIndex(i => Math.min(i+1,items.length-1)) }
          if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setIndex(i => Math.max(0,i-1)) }
          if (e.key === 'Enter' && index >= 0 && items[index]) { e.preventDefault(); pick(items[index]) }
          if (e.key === 'Escape') setOpen(false)
        }} />
      <span className="min-h-5 text-[13px] text-ink-3" aria-live="polite">{busy ? 'Searching…' : query.trim().length < 2 ? 'Type at least 2 letters or numbers.' : open && !error && !items.length ? 'No matches. Try another name or course code.' : ''}</span>
      {error && <div role="alert" className="text-[15px]"><p>{error}</p><button className={textLink} type="button" onClick={() => { setOpen(true); setRetry(x=>x+1) }}>Retry search</button></div>}
      {open && items.length > 0 && <ul className="max-h-72 overflow-y-auto rounded-xl border border-line-strong bg-card" id={id+'-list'} role="listbox" aria-label={label+' matches'}>{items.map((item,i) =>
        <li key={item.id} role="presentation" className="border-b border-line last:border-0">
          <button id={id+'-'+i} type="button" role="option" aria-selected={index === i} onMouseDown={e=>e.preventDefault()} onClick={()=>pick(item)}
            className={`flex min-h-13 w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-linen ${index === i ? 'bg-linen' : ''}`}>
            <b className="font-semibold">{item.label}</b>{item.detail && <span className="text-[13px] text-ink-3">{item.detail}</span>}
          </button>
        </li>)}</ul>}
    </>}
  </div>
}

// 1–5 tiles for quality and difficulty, the same control as the home page preview.
function RatingTiles({ label, value, onChange, low, high }: { label:string; value:string; onChange:(v:string)=>void; low:string; high:string }) {
  return <fieldset className="min-w-0">
    <legend className="font-semibold">{label} <span className="font-normal text-ink-3">· required</span></legend>
    <div className="mt-2 grid grid-cols-5 gap-2">
      {[1,2,3,4,5].map(n => { const on = String(n) === value
        return <label key={n} className={`relative grid min-h-12 cursor-pointer place-items-center rounded-xl border-[1.5px] text-base font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2 ${on ? 'border-ink bg-ink text-paper' : 'border-line bg-card text-ink-2 hover:border-ink'}`}>
          <input type="radio" className="absolute inset-0 m-0 cursor-pointer opacity-0" name={label} value={n} checked={on} onChange={() => onChange(String(n))} />{n}
        </label> })}
    </div>
    <p className="mt-1.5 flex justify-between text-xs text-ink-3"><span>1 · {low}</span><span>5 · {high}</span></p>
  </fieldset>
}

// Optional questions: low · in the middle · high, or skip (skip sends no answer).
function QuestionChoice({ d, value, onChange }: { d:ReviewDimension; value:string; onChange:(v:string)=>void }) {
  const options: [string,string][] = [['-1',d.low_label],['0','In the middle'],['1',d.high_label],['skip','Skip']]
  return <fieldset className="min-w-0">
    <legend className="font-semibold">{questionLabel(d.name)}</legend>
    <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
      {options.map(([v,text]) => { const on = v === value
        return <label key={v} className={`relative flex min-h-12 cursor-pointer items-center justify-center rounded-full border-[1.5px] px-3 py-2 text-center text-sm font-semibold transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink has-[:focus-visible]:ring-offset-2 ${on ? (v === 'skip' ? 'border-ink bg-linen text-ink' : 'border-ink bg-ink text-paper') : v === 'skip' ? 'border-dashed border-line-strong text-ink-3 hover:border-ink' : 'border-line bg-card text-ink-2 hover:border-ink'}`}>
          <input type="radio" className="absolute inset-0 m-0 cursor-pointer opacity-0" name={d.name} value={v} checked={on} onChange={() => onChange(v)} />{cap(text)}
        </label> })}
    </div>
  </fieldset>
}

function Steps({ current }: { current:number }) {
  return <ol className="grid grid-cols-4 gap-1.5 px-5 pt-5 md:px-6" aria-label="Review steps">
    {STEPS.map((s,i) => <li key={s} aria-current={i === current ? 'step' : undefined} className="min-w-0">
      <span className={`block h-1 rounded-full transition-colors ${i <= current ? 'bg-accent' : 'bg-tile'}`} />
      <span className={`mt-1.5 block truncate text-xs ${i === current ? 'font-semibold text-ink' : 'text-ink-3'}`}>{i < current ? <CheckIcon className="mr-0.5 inline size-3.5 align-[-2px]" /> : null}{s}</span>
    </li>)}
  </ol>
}

function Notice({ children, action }: { children:ReactNode; action?:ReactNode }) {
  return <div className="review-notice rounded-xl border border-line-strong bg-tile/60 p-4 text-[15px]" role="alert">{children}{action}</div>
}

function Reviews() {
  const [enabled,setEnabled] = useState<boolean|null>(null), [session,setSession] = useState<ReviewSession>({signedIn:false}), [email,setEmail] = useState('')
  const [code,setCode] = useState(''), [codeSent,setCodeSent] = useState(false), [cooldown,setCooldown] = useState(0), [busy,setBusy] = useState(false), [error,setError] = useState('')
  const [dimensions,setDimensions] = useState<ReviewDimension[]>([]), [dimensionError,setDimensionError] = useState(''), [loadKey,setLoadKey] = useState(0)
  const [professor,setProfessor] = useState<Choice|null>(null), [course,setCourse] = useState<Choice|null>(null), [draft,setDraft] = useState(initial)
  const [classDone,setClassDone] = useState(false)
  const [confirm,setConfirm] = useState(false), [receipt,setReceipt] = useState(''), [uncertain,setUncertain] = useState(false), [copyMessage,setCopyMessage] = useState('')
  const prefilled = useRef(false), [test,setTest] = useState(true)
  const inFlight = useRef(false), heading = useRef<HTMLHeadingElement>(null)
  const authError = (e:unknown) => {
    if (e instanceof FormError && e.code === 'SESSION_EXPIRED') { setSession({signedIn:false}); setCodeSent(false); setCode(''); setError(e.message) }
  }
  useEffect(() => {
    const abort = new AbortController()
    api<{enabled:boolean;ownerTest?:boolean}>('status',undefined,abort.signal).then(async status => {
      setEnabled(status.enabled); setTest(status.ownerTest !== false)
      if (status.enabled) { const user = await api<ReviewSession>('session',undefined,abort.signal); setSession(user); if (user.email) setEmail(user.email) }
    }).catch(e => { if (!abort.signal.aborted) { authError(e); setError(e.message) } })
    return () => abort.abort()
  },[])
  useEffect(() => {
    if (!session.signedIn) return
    const abort = new AbortController(); setDimensionError('')
    api<ReviewDimension[]>('dimensions',undefined,abort.signal).then(setDimensions).catch(e => { if (!abort.signal.aborted) { setDimensionError(e.message); authError(e) } })
    return () => abort.abort()
  },[session.signedIn,loadKey])
  useEffect(()=>{
    if(!session.signedIn || prefilled.current)return
    const params=new URLSearchParams(location.search),pid=params.get('professorId'),cid=params.get('courseId')
    const abort=new AbortController()
    const fill=(p:ReviewProfessor|null,c:ReviewCourse|null)=>{if(abort.signal.aborted)return;if(p)setProfessor({id:p.id,label:p.first_name+' '+p.last_name});if(c)setCourse({id:c.id,label:c.code,detail:c.title});prefilled.current=true}
    if(pid&&cid){
      api<{professor:ReviewProfessor;course:ReviewCourse}>('selection?'+new URLSearchParams({professorId:pid,courseId:cid}),undefined,abort.signal).then(v=>fill(v.professor,v.course)).catch(e=>{if(!abort.signal.aborted){authError(e);setError(e.message)}})
    } else {
      // Name-based links (Mac app): fill only exact, unambiguous catalog matches; otherwise leave the pickers open.
      const name=params.get('professor'),label=params.get('course')
      if(!name||!label)return
      api<{professor:ReviewProfessor|null;course:ReviewCourse|null}>('resolve?'+new URLSearchParams({instructor:name,course:label}),undefined,abort.signal).then(v=>fill(v.professor,v.course)).catch(()=>{if(!abort.signal.aborted)prefilled.current=true})
    }
    return ()=>abort.abort()
  },[session.signedIn,loadKey])
  useEffect(() => { if (!cooldown) return; const deadline=Date.now()+cooldown*1000; const timer = setTimeout(()=>setCooldown(Math.max(0,Math.ceil((deadline-Date.now())/1000))),1000); return ()=>clearTimeout(timer) },[cooldown])
  useEffect(()=>{ heading.current?.focus() },[confirm,receipt,session.signedIn])
  const run = async (task:()=>Promise<void>) => {
    if (inFlight.current) return
    inFlight.current=true; setBusy(true); setError('')
    try { await task() } catch(e) {
      const failure = e instanceof Error ? e : new Error('This request could not be completed.')
      setError(failure.message); authError(e)
      if (e instanceof FormError) { if (e.retryAfter) setCooldown(e.retryAfter); if (e.code === 'SAVE_UNCONFIRMED') setUncertain(true) }
    } finally { inFlight.current=false; setBusy(false) }
  }
  const sendCode = () => run(async()=>{
    const result=await api<{retryAfter:number}>('auth/send',{email:email.trim().toLowerCase()})
    setEmail(email.trim().toLowerCase()); setCodeSent(true); setCode(''); setCooldown(result.retryAfter)
  })
  const answers = Object.fromEntries(Object.entries(draft.answers).filter(([,v])=>v !== 'skip').map(([k,v])=>[k,Number(v)])) as ReviewInput['answers']
  const save = () => run(async()=>{
    const result=await api<{id:string}>('submit',{professorId:professor!.id,courseId:course!.id,quality:Number(draft.quality),difficulty:Number(draft.difficulty),body:draft.body,answers} satisfies ReviewInput)
    setReceipt(result.id); setConfirm(false)
  })
  const resetDraft = () => { setDraft(initial()); setProfessor(null); setCourse(null); setClassDone(false); setReceipt(''); setConfirm(false); setUncertain(false); setCopyMessage('') }
  const signout = () => run(async()=>{
    await api('auth/signout',{}); setSession({signedIn:false}); setCodeSent(false); setCode(''); resetDraft(); setDimensions([])
  })
  const answerText = (d:ReviewDimension) => draft.answers[d.name] === '-1' ? d.low_label : draft.answers[d.name] === '1' ? d.high_label : draft.answers[d.name] === '0' ? 'In the middle' : 'Skipped'
  const formReady = professor && course && draft.quality && draft.difficulty && dimensions.length > 0 && !dimensionError
  const step = !session.signedIn ? 0 : confirm ? 3 : classDone && professor && course ? 2 : 1
  const title = receipt ? 'Your review is saved.' : confirm ? 'Check your review.' : null

  return <div className="min-h-dvh">
    <header className="sticky top-0 z-50 border-b border-line bg-paper/92 backdrop-blur-sm">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <a href="/" aria-label="BYE, Before You Enroll, home" className="flex min-h-11 items-baseline gap-2.5 py-2.5 no-underline">
          <span className="swipe font-display text-[25px] font-bold leading-none">BYE</span>
          <span className="hidden text-sm text-ink-3 md:inline">Before You Enroll</span>
        </a>
        {session.signedIn
          ? <button type="button" className="btn min-h-11 px-4 text-[15px]" disabled={busy} onClick={signout}>Sign out</button>
          : <a href="/" className="btn min-h-11 px-4 text-[15px]">Back to BYE</a>}
      </div>
    </header>

    <main className="wrap grid grid-cols-[minmax(0,1fr)] gap-8 pb-16 pt-10 md:pt-14 lg:grid-cols-12 lg:gap-10 lg:pb-24 lg:pt-20">
      <div className="min-w-0 lg:col-span-5 lg:row-start-1">
        <h1 ref={heading} tabIndex={-1} className="text-[38px] leading-[1.06] tracking-[-0.03em] outline-offset-8 focus:outline-none focus-visible:outline-2 md:text-5xl lg:text-[56px]">
          {title ?? <>Share what <span className="swipe">the class</span> was like.</>}
        </h1>
        <p className="mt-5 max-w-[34rem] text-lg text-ink-2">
          {receipt ? test ? 'Keep this review ID so we can check the saved data and remove this test afterward.' : 'Thanks for helping other PCC students. Your review is now part of BYE.' : 'A school email, a one-time code, and your experience. No password or profile to set up.'}
        </p>
        <ul className="mt-8 hidden space-y-4 lg:block">
          {[
            { icon: MailIcon, text: 'Sign in with a one-time code sent to your @go.pasadena.edu email.' },
            { icon: LockIcon, text: 'Other students see your review, never your name or email.' },
            { icon: CheckIcon, text: 'One review for each professor and course.' },
          ].map(({ icon: Icon, text }) => <li key={text} className="flex gap-3"><Icon className="mt-0.5 size-5 shrink-0" /><span className="text-ink-2">{text}</span></li>)}
        </ul>
      </div>

      <div className="min-w-0 lg:col-span-7 lg:col-start-6 lg:row-span-2 lg:row-start-1">
        {error && <div className="mb-4"><Notice action={enabled === null ? <button className={`${textLink} ml-2`} type="button" onClick={()=>location.reload()}>Try again</button> : undefined}>{error}</Notice></div>}
        {enabled === null && !error && <p role="status" className="text-ink-3">Checking review availability…</p>}

        {enabled === false && <AppWindow title="Review" meta="Not open yet">
          <section className="space-y-4 p-6 md:p-8">
            <h2 className="text-2xl">Reviews are not open yet.</h2>
            <p className="text-ink-2">The review form will be available when email verification is configured.</p>
            <button type="button" className="btn" onClick={()=>location.reload()}>Check again</button>
          </section>
        </AppWindow>}

        {enabled && <AppWindow title="Review" meta={receipt ? 'Saved' : `Step ${step + 1} of 4 · ${STEPS[step]}`}>
          {!receipt && <Steps current={step} />}
          <div key={receipt ? 'receipt' : step} className="story-screen p-5 md:p-7">

            {!session.signedIn && <section className="space-y-5">
              <div>
                <h2 className="text-2xl">{codeSent ? 'Check your school inbox.' : 'Verify your school email.'}</h2>
                <p className="mt-2 text-ink-2">{codeSent ? `Enter the code sent to ${email}. Check spam if you do not see it.` : test ? 'Use your @go.pasadena.edu address. This private test is available only to the configured tester.' : 'Use your @go.pasadena.edu address. We will email you a one-time code.'}</p>
              </div>
              <form className="space-y-4" onSubmit={e=>{e.preventDefault(); if(codeSent) void run(async()=>{const user=await api<ReviewSession>('auth/verify',{email,code});setSession(user);setCode('');setCodeSent(false)});else void sendCode()}}>
                {codeSent
                  ? <div className="flex flex-col gap-2"><label htmlFor="review-code" className="font-semibold">Email code</label><input id="review-code" className={`${field} code tracking-[0.3em]`} value={code} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required onChange={e=>setCode(e.target.value.replace(/\D/g,''))} /></div>
                  : <div className="flex flex-col gap-2"><label htmlFor="review-email" className="font-semibold">School email</label><input id="review-email" className={field} type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} placeholder="you@go.pasadena.edu" maxLength={254} required onChange={e=>setEmail(e.target.value)} /></div>}
                <button className="btn btn-primary w-full" type="submit" disabled={busy || (!codeSent && cooldown>0)}>{busy ? 'Please wait…' : codeSent ? <>Verify code →</> : cooldown>0 ? `Try again in ${cooldown}s` : <>Send a code →</>}</button>
              </form>
              {codeSent && <div className="flex flex-wrap justify-between gap-3">
                <button className={textLink} type="button" disabled={busy || cooldown>0} onClick={sendCode}>{cooldown>0 ? `Resend in ${cooldown}s` : 'Send a new code'}</button>
                <button className={textLink} type="button" disabled={busy} onClick={()=>{setCodeSent(false);setCode('');setError('')}}>Change email</button>
              </div>}
              <p className="text-[13px] text-ink-3">Email verification proves access to your school inbox. It does not verify enrollment or that you took a particular class.</p>
            </section>}

            {session.signedIn && receipt && <section className="space-y-5" aria-label="Submission receipt">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent"><CheckIcon className="size-6" /></span>
                <div className="min-w-0"><h2 className="text-2xl">Thank you.</h2><p className="text-ink-2"><b className="font-semibold text-ink">{professor?.label}</b> · {course?.label}</p></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-3">Review ID</p>
                <code className="review-id code mt-1 block rounded-lg border border-line bg-paper p-3 text-[13px] [overflow-wrap:anywhere]">{receipt}</code>
                <button className={textLink} type="button" onClick={()=>{navigator.clipboard?.writeText(receipt).then(()=>setCopyMessage('Review ID copied.')).catch(()=>setCopyMessage('Select and copy the review ID above.'));if(!navigator.clipboard)setCopyMessage('Select and copy the review ID above.')}}>Copy review ID</button>
                <p role="status" className="text-[13px] text-ink-3">{copyMessage}</p>
              </div>
              <p className="text-ink-2">{test ? 'Do not submit another copy. We will confirm this exact review in Supabase and remove it without deleting your school account.' : 'You can review each professor once per course. Reviews that several students report are hidden.'}</p>
              <div className="flex flex-col gap-3 md:flex-row">
                {!test && <button type="button" className="btn btn-primary" onClick={resetDraft}>Write another review</button>}
                <a href="/" className="btn">Back to BYE</a>
              </div>
            </section>}

            {session.signedIn && !receipt && <>
              <p className="mb-4 text-[13px] text-ink-3 [overflow-wrap:anywhere]">Verified as {session.email}</p>
              {dimensionError && <div className="mb-4"><Notice action={<button type="button" className={`${textLink} ml-2`} onClick={()=>setLoadKey(x=>x+1)}>Retry questions</button>}>{dimensionError}</Notice></div>}

              {confirm ? <section className="space-y-5">
                <div><h2 className="text-2xl">{professor?.label}</h2><p className="text-ink-2"><span className="code">{course?.label}</span> · {course?.detail}</p></div>
                <dl className="m-0 divide-y divide-line border-y border-line">
                  <div className="flex justify-between gap-5 py-2.5"><dt className="font-semibold">Quality</dt><dd className="m-0 text-right">{draft.quality} out of 5</dd></div>
                  <div className="flex justify-between gap-5 py-2.5"><dt className="font-semibold">Difficulty</dt><dd className="m-0 text-right">{draft.difficulty} out of 5</dd></div>
                  {dimensions.map(d=><div key={d.name} className="flex justify-between gap-5 py-2.5"><dt className="font-semibold">{questionLabel(d.name)}</dt><dd className="m-0 text-right text-ink-2">{cap(answerText(d))}</dd></div>)}
                </dl>
                <div><b className="font-semibold">Comment</b><p className="mt-1 whitespace-pre-wrap text-ink-2 [overflow-wrap:anywhere]">{(test ? TEST_REVIEW_PREFIX : '') + draft.body.trim() || 'No written comment.'}</p></div>
                <p className="text-[13px] text-ink-3">Your school email is not shown in public review queries. Database administrators can link reviews to accounts.</p>
                <div className="flex flex-col gap-3">
                  <button type="button" className="btn btn-primary w-full" disabled={busy || uncertain} onClick={save}>{busy ? 'Saving…' : uncertain ? 'Check back before retrying' : test ? <>Submit test review →</> : <>Submit review →</>}</button>
                  <button type="button" className="btn w-full" disabled={busy} onClick={()=>setConfirm(false)}>Back to edit</button>
                </div>
              </section>

              : step === 1 ? <section className="space-y-5">
                <div><h2 className="text-2xl">Choose the class you took.</h2><p className="mt-2 text-ink-2">Select the course and professor from the PCC lists.</p></div>
                <SearchChoice label="Course" kind="courses" selected={course} onSelect={setCourse} onAuthError={authError}/>
                <SearchChoice label="Professor" kind="professors" selected={professor} onSelect={setProfessor} onAuthError={authError}/>
                <p className="text-[13px] text-ink-3">Choose a professor and course you actually took. BYE never picks a professor for you.</p>
                <button type="button" className="btn btn-primary w-full" disabled={!professor || !course} onClick={()=>setClassDone(true)}>Next: rate the class →</button>
              </section>

              : <form className="space-y-6" onSubmit={e=>{e.preventDefault();if(formReady){setConfirm(true);setError('')}}}>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-linen px-4 py-3">
                  <p className="min-w-0 text-[15px]"><b className="font-semibold">{professor?.label}</b> · <span className="code">{course?.label}</span></p>
                  <button type="button" className={`${textLink} shrink-0 text-[13px]`} onClick={()=>setClassDone(false)}>Change class</button>
                </div>
                <RatingTiles label="Quality" value={draft.quality} onChange={v=>setDraft({...draft,quality:v})} low="Poor" high="Excellent" />
                <RatingTiles label="Difficulty" value={draft.difficulty} onChange={v=>setDraft({...draft,difficulty:v})} low="Easy" high="Hard" />
                <div className="border-t border-line pt-5">
                  <h2 className="text-xl">A little more about the class.</h2>
                  <p className="mt-1 text-[15px] text-ink-2">Optional. Pick “In the middle” for a neutral answer, or leave it on Skip.</p>
                </div>
                {!dimensions.length && !dimensionError ? <p role="status" className="text-ink-3">Loading review questions…</p>
                  : dimensions.map(d=><QuestionChoice key={d.name} d={d} value={draft.answers[d.name]??'skip'} onChange={v=>setDraft({...draft,answers:{...draft.answers,[d.name]:v}})} />)}
                <div className="flex flex-col gap-2">
                  <label htmlFor="review-body" className="font-semibold">Your experience <span className="font-normal text-ink-3">· optional</span></label>
                  <textarea id="review-body" className={`${field} min-h-32 resize-y`} rows={5} maxLength={REVIEW_COMMENT_LIMIT} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} placeholder="What would help another student understand this class?"/>
                  <span className="text-[13px] text-ink-3">{Array.from(draft.body).length} / {REVIEW_COMMENT_LIMIT} characters{test ? ' · A test label is added automatically.' : ''}</span>
                </div>
                <p className="text-[13px] text-ink-3">You can submit one review per professor and course. Keep your comment about the class and leave out personal information.</p>
                <button type="submit" className="btn btn-primary w-full" disabled={!formReady || busy || uncertain}>Check your review →</button>
              </form>}
            </>}
          </div>
        </AppWindow>}
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 text-[13px] text-ink-3">Want to look around first? <a href={DEMO_URL} className={`${textLink} text-[13px]`}>Try the web demo</a> (sample data for now).</p>
      </div>
      <div className="min-w-0 lg:col-span-5 lg:row-start-2 lg:self-start">
        <p className="review-test-note border-t border-line pt-4 text-[13px] leading-relaxed text-ink-3">
          {test ? 'For PCC students · Private test. This is a temporary review test. Your review may be publicly readable until it is removed. ' : 'For PCC students · Beta. Reviews are public on BYE. '}Please leave out names of students, contact details, and other personal information.
        </p>
      </div>
    </main>
    <Footer base="/" />
  </div>
}
createRoot(document.getElementById('root')!).render(<Reviews/>)
