import React, { useEffect, useId, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/schibsted-grotesk/700.css'
import '@fontsource/jetbrains-mono/500.css'
import { questionLabel, REVIEW_COMMENT_LIMIT, TEST_REVIEW_PREFIX, type ReviewCourse, type ReviewDimension, type ReviewInput, type ReviewProfessor, type ReviewSession } from '../../../packages/core/reviews'
import { api, FormError } from './api'
import '../src/styles.css'
import './reviews.css'

type Choice = { id:string; label:string; detail?:string }
const initial = () => ({ quality:'', difficulty:'', body:'', answers:{} as Record<string,string> })

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
  return <div className="review-field">
    <label htmlFor={id}>{label}</label>
    {selected ? <div className="review-picked"><div><b>{selected.label}</b>{selected.detail && <span className="muted small">{selected.detail}</span>}</div><button className="text-link" type="button" onClick={() => { onSelect(null); setQuery(''); setOpen(true) }}>Change {label.toLowerCase()}</button></div> : <>
      <input id={id} type="search" role="combobox" aria-expanded={open && items.length > 0} aria-controls={id+'-list'} aria-autocomplete="list" aria-activedescendant={index >= 0 ? id+'-'+index : undefined}
        autoComplete="off" maxLength={80} placeholder={kind === 'courses' ? 'Course code or title' : 'Professor name'} value={query}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false),150)} onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); setIndex(i => Math.min(i+1,items.length-1)) }
          if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); setIndex(i => Math.max(0,i-1)) }
          if (e.key === 'Enter' && index >= 0 && items[index]) { e.preventDefault(); pick(items[index]) }
          if (e.key === 'Escape') setOpen(false)
        }} />
      <span className="muted small" aria-live="polite">{busy ? 'Searching…' : query.trim().length < 2 ? 'Type at least 2 letters or numbers.' : open && !error && !items.length ? 'No matches. Try another name or course code.' : ''}</span>
      {error && <div role="alert"><p>{error}</p><button className="text-link" type="button" onClick={() => { setOpen(true); setRetry(x=>x+1) }}>Retry search</button></div>}
      {open && items.length > 0 && <ul className="review-options" id={id+'-list'} role="listbox" aria-label={label+' matches'}>{items.map((item,i) => <li key={item.id} role="presentation"><button id={id+'-'+i} type="button" role="option" aria-selected={index === i} onMouseDown={e=>e.preventDefault()} onClick={()=>pick(item)}><b>{item.label}</b>{item.detail && <span>{item.detail}</span>}</button></li>)}</ul>}
    </>}
  </div>
}

function Reviews() {
  const [enabled,setEnabled] = useState<boolean|null>(null), [session,setSession] = useState<ReviewSession>({signedIn:false}), [email,setEmail] = useState('')
  const [code,setCode] = useState(''), [codeSent,setCodeSent] = useState(false), [cooldown,setCooldown] = useState(0), [busy,setBusy] = useState(false), [error,setError] = useState('')
  const [dimensions,setDimensions] = useState<ReviewDimension[]>([]), [dimensionError,setDimensionError] = useState(''), [loadKey,setLoadKey] = useState(0)
  const [professor,setProfessor] = useState<Choice|null>(null), [course,setCourse] = useState<Choice|null>(null), [draft,setDraft] = useState(initial)
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
  const signout = () => run(async()=>{
    await api('auth/signout',{}); setSession({signedIn:false}); setCodeSent(false); setCode(''); setDraft(initial()); setProfessor(null); setCourse(null); setReceipt(''); setConfirm(false); setUncertain(false); setDimensions([])
  })
  const answerText = (d:ReviewDimension) => draft.answers[d.name] === '-1' ? d.low_label : draft.answers[d.name] === '1' ? d.high_label : draft.answers[d.name] === '0' ? 'In the middle' : 'Skipped'
  const formReady = professor && course && draft.quality && draft.difficulty && dimensions.length > 0 && !dimensionError
  return <div className="review-page">
    <header className="review-top"><a className="review-home" href="/" aria-label="BYE home"><span className="wordmark"><b>BYE</b></span><span className="muted small">Before You Enroll</span></a>{session.signedIn && <button type="button" className="text-link" disabled={busy} onClick={signout}>Sign out</button>}</header>
    <main className="review-main">
      <div className="review-intro"><span className="eyebrow">For PCC students · {test ? 'Private test' : 'Beta'}</span><h1 ref={heading} tabIndex={-1}>{receipt ? 'Your review is saved.' : confirm ? 'Check your review.' : 'Share what class was like.'}</h1><p className="muted">{receipt ? test ? 'Keep this review ID so we can check the saved data and remove this test afterward.' : 'Thanks for helping other PCC students. Your review is now part of BYE.' : 'A school email, a one-time code, and your experience. No password or profile to set up.'}</p></div>
      <p className="review-test-note">{test ? 'This is a temporary review test. Your review may be publicly readable until it is removed. ' : 'Reviews are public on BYE. '}Please leave out names of students, contact details, and other personal information.</p>
      {error && <div className="review-notice" role="alert">{error}{enabled === null && <button className="text-link" type="button" onClick={()=>location.reload()}>Try again</button>}</div>}
      {enabled === null && !error && <p role="status">Checking review availability…</p>}
      {enabled === false && <section className="review-panel"><h2>Reviews are not open yet.</h2><p>The review form will be available when email verification is configured.</p><button type="button" className="button secondary" onClick={()=>location.reload()}>Check again</button></section>}
      {enabled && !session.signedIn && <section className="review-panel">
        <h2>{codeSent ? 'Check your school inbox.' : 'Verify your school email.'}</h2>
        <p className="muted">{codeSent ? `Enter the code sent to ${email}. Check spam if you do not see it.` : test ? 'Use your @go.pasadena.edu address. This private test is available only to the configured tester.' : 'Use your @go.pasadena.edu address. We will email you a one-time code.'}</p>
        <form onSubmit={e=>{e.preventDefault(); if(codeSent) void run(async()=>{const user=await api<ReviewSession>('auth/verify',{email,code});setSession(user);setCode('');setCodeSent(false)});else void sendCode()}}>
          {codeSent ? <div className="review-field"><label htmlFor="review-code">Email code</label><input id="review-code" value={code} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6,10}" minLength={6} maxLength={10} required onChange={e=>setCode(e.target.value.replace(/\D/g,''))} /></div> : <div className="review-field"><label htmlFor="review-email">School email</label><input id="review-email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={email} placeholder="you@go.pasadena.edu" maxLength={254} required onChange={e=>setEmail(e.target.value)} /></div>}
          <button className="button primary wide" type="submit" disabled={busy || (!codeSent && cooldown>0)}>{busy ? 'Please wait…' : codeSent ? 'Verify code →' : cooldown>0 ? `Try again in ${cooldown}s` : 'Send a code →'}</button>
        </form>
        {codeSent && <div className="review-actions"><button className="text-link" type="button" disabled={busy || cooldown>0} onClick={sendCode}>{cooldown>0 ? `Resend in ${cooldown}s` : 'Send a new code'}</button><button className="text-link" type="button" disabled={busy} onClick={()=>{setCodeSent(false);setCode('');setError('')}}>Change email</button></div>}
        <p className="muted small">Email verification proves access to your school inbox. It does not verify enrollment or that you took a particular class.</p>
      </section>}
      {enabled && session.signedIn && receipt && <section className="review-panel" aria-label="Submission receipt"><h2>Submission receipt</h2><p><b>{professor?.label}</b> · {course?.label}</p><code className="review-id">{receipt}</code><button className="button secondary" type="button" onClick={()=>{navigator.clipboard?.writeText(receipt).then(()=>setCopyMessage('Review ID copied.')).catch(()=>setCopyMessage('Select and copy the review ID above.'));if(!navigator.clipboard)setCopyMessage('Select and copy the review ID above.')}}>Copy review ID</button><p role="status" className="muted small">{copyMessage}</p><p>{test ? 'Do not submit another copy. We will confirm this exact review in Supabase and remove it without deleting your school account.' : 'You can review each professor once per course. Reviews that several students report are hidden.'}</p></section>}
      {enabled && session.signedIn && !receipt && <>
        <p className="muted small review-account">Verified as {session.email}</p>
        {confirm ? <section className="review-panel">
          <h2>{professor?.label}</h2><p>{course?.label} · {course?.detail}</p>
          <dl className="review-summary"><div><dt>Quality</dt><dd>{draft.quality} out of 5</dd></div><div><dt>Difficulty</dt><dd>{draft.difficulty} out of 5</dd></div>{dimensions.map(d=><div key={d.name}><dt>{questionLabel(d.name)}</dt><dd>{answerText(d)}</dd></div>)}</dl>
          <div className="review-comment-preview"><b>Comment</b><p>{(test ? TEST_REVIEW_PREFIX : '') + draft.body.trim() || 'No written comment.'}</p></div>
          <p className="muted small">Your school email is not shown in public review queries. Database administrators can link reviews to accounts.</p>
          <button type="button" className="button primary wide" disabled={busy || uncertain} onClick={save}>{busy ? 'Saving…' : uncertain ? 'Check back before retrying' : test ? 'Submit test review →' : 'Submit review →'}</button>
          <button type="button" className="button secondary wide" disabled={busy} onClick={()=>setConfirm(false)}>Back to edit</button>
        </section> : <form className="review-panel" onSubmit={e=>{e.preventDefault();if(formReady){setConfirm(true);setError('')}}}>
          <div><h2>Choose the class you took.</h2><p className="muted">Select the course and professor from the PCC lists.</p></div>
          <SearchChoice label="Course" kind="courses" selected={course} onSelect={setCourse} onAuthError={authError}/>
          <SearchChoice label="Professor" kind="professors" selected={professor} onSelect={setProfessor} onAuthError={authError}/>
          <div className="review-rating-grid">{(['quality','difficulty'] as const).map(name=><div className="review-field" key={name}><label htmlFor={'review-'+name}>{name === 'quality' ? 'Quality' : 'Difficulty'}</label><select id={'review-'+name} required value={draft[name]} onChange={e=>setDraft({...draft,[name]:e.target.value})}><option value="">Choose a rating</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}{n===1 ? name==='quality' ? ' · Poor':' · Easy' : n===5 ? name==='quality' ? ' · Excellent':' · Hard':''}</option>)}</select></div>)}</div>
          <div><h2>A little more about the class.</h2><p className="muted">These questions are optional. Choose “In the middle” for a neutral answer, or leave a question skipped.</p></div>
          {dimensionError ? <div role="alert"><p>{dimensionError}</p><button type="button" className="text-link" onClick={()=>setLoadKey(x=>x+1)}>Retry questions</button></div> : !dimensions.length ? <p role="status">Loading review questions…</p> : dimensions.map(d=><div className="review-field" key={d.name}><label htmlFor={'dimension-'+d.name}>{questionLabel(d.name)}</label><select id={'dimension-'+d.name} value={draft.answers[d.name]??'skip'} onChange={e=>setDraft({...draft,answers:{...draft.answers,[d.name]:e.target.value}})}><option value="skip">Skip this question</option><option value="-1">{d.low_label}</option><option value="0">In the middle</option><option value="1">{d.high_label}</option></select></div>)}
          <div className="review-field"><label htmlFor="review-body">Your experience <span className="muted small">Optional</span></label><textarea id="review-body" rows={5} maxLength={REVIEW_COMMENT_LIMIT} value={draft.body} onChange={e=>setDraft({...draft,body:e.target.value})} placeholder="What would help another student understand this class?"/><span className="muted small">{Array.from(draft.body).length} / {REVIEW_COMMENT_LIMIT} characters{test ? ' · A test label is added automatically.' : ''}</span></div>
          <p className="muted small">Choose a professor and course you actually took. You can submit one review per professor and course. Keep your comment about the class and leave out personal information.</p>
          <button type="submit" className="button primary wide" disabled={!formReady || busy || uncertain}>Check your review →</button>
        </form>}
      </>}
      <footer className="review-footer"><a className="text-link" href="/app/">Back to class search →</a><a className="text-link" href="/">Back to BYE →</a><a className="text-link" href="/licenses.txt">Credits</a></footer>
    </main>
  </div>
}
createRoot(document.getElementById('root')!).render(<Reviews/> )
