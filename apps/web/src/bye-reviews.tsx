import React, { useEffect, useRef, useState } from 'react'
import type { ByeResolution, ByeRatingProfile, ByeReviewPage, ByeWrittenReview } from '../../../packages/core/reviews'
import { api, FormError } from '../reviews/api'

/** BYE state is scoped to the PCC instructor/course, independent of the RMP profile. */
export function ByeReviews({ name, course }: { name:string; course:string }) {
  const [resolution,setResolution]=useState<ByeResolution|null>(null),[profile,setProfile]=useState<ByeRatingProfile|null>(null)
  const [rows,setRows]=useState<ByeWrittenReview[]>([]),[next,setNext]=useState<number|null>(null)
  const [filter,setFilter]=useState('this'),[sort,setSort]=useState('recent'),[retry,setRetry]=useState(0),[refresh,setRefresh]=useState(0)
  const [error,setError]=useState(''),[ratingError,setRatingError]=useState(''),[busy,setBusy]=useState(true),[loadingMore,setLoadingMore]=useState(false)
  const [reportId,setReportId]=useState(''),[reason,setReason]=useState(''),[reportBusy,setReportBusy]=useState(false),[reportMessage,setReportMessage]=useState(''),[needsLogin,setNeedsLogin]=useState(false)
  const generation=useRef(0),pageAbort=useRef<AbortController|null>(null),reportFlight=useRef(false)
  useEffect(()=>{
    const abort=new AbortController();setResolution(null);setProfile(null);setRows([]);setNext(null);setError('');setRatingError('');setBusy(true);setFilter('this');setSort('recent');setReportId('');setReportMessage('');setNeedsLogin(false)
    api<ByeResolution>('resolve?'+new URLSearchParams({instructor:name,course}),undefined,abort.signal).then(value=>{if(!abort.signal.aborted)setResolution(value)}).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setBusy(false)})
    return ()=>abort.abort()
  },[name,course,retry])
  useEffect(()=>{
    if(!resolution?.professor)return
    const abort=new AbortController();setProfile(null);setRatingError('')
    api<ByeRatingProfile>('profile?professorId='+resolution.professor.id,undefined,abort.signal).then(value=>{if(!abort.signal.aborted)setProfile(value)}).catch(e=>{if(!abort.signal.aborted)setRatingError(e.message)})
    return ()=>abort.abort()
  },[resolution,refresh])
  const params=(offset:number)=>new URLSearchParams({professorId:resolution!.professor!.id,sort,offset:String(offset),...(filter==='this'&&resolution?.course?{courseId:resolution.course.id}:filter!=='all'&&filter!=='this'?{courseId:filter}:{})})
  useEffect(()=>{
    pageAbort.current?.abort();generation.current++;setLoadingMore(false);setRows([]);setNext(null)
    if(!resolution?.professor)return
    if(filter==='this'&&!resolution.course){setBusy(false);return}
    const abort=new AbortController();pageAbort.current=abort;setBusy(true);setError('')
    api<ByeReviewPage>('list?'+params(0),undefined,abort.signal).then(page=>{if(!abort.signal.aborted){setRows(page.reviews);setNext(page.nextOffset)}}).catch(e=>{if(!abort.signal.aborted)setError(e.message)}).finally(()=>{if(!abort.signal.aborted)setBusy(false)})
    return ()=>abort.abort()
  },[resolution,filter,sort,refresh])
  const more=async()=>{
    if(next===null||loadingMore||!resolution?.professor)return
    const current=generation.current,abort=pageAbort.current!;setLoadingMore(true);setError('')
    try{const page=await api<ByeReviewPage>('list?'+params(next),undefined,abort.signal);if(current===generation.current&&!abort.signal.aborted){setRows(old=>[...new Map([...old,...page.reviews].map(r=>[r.id,r])).values()]);setNext(page.nextOffset)}}catch(e){if(current===generation.current&&!abort.signal.aborted)setError(e instanceof Error?e.message:'Reviews could not be loaded.')}finally{if(current===generation.current&&!abort.signal.aborted)setLoadingMore(false)}
  }
  const report=async(e:React.FormEvent)=>{
    e.preventDefault();if(reportFlight.current)return
    reportFlight.current=true;setReportBusy(true);setReportMessage('');setNeedsLogin(false)
    try{await api('report',{reviewId:reportId,reason});setReportId('');setReason('');setReportMessage('Report received.');setRefresh(x=>x+1)}catch(e){setReportMessage(e instanceof Error?e.message:'The report could not be confirmed.');setNeedsLogin(e instanceof FormError&&e.code==='SESSION_EXPIRED')}finally{reportFlight.current=false;setReportBusy(false)}
  }
  const score=(value:number|null|undefined)=>value==null?'—':value.toFixed(1)
  return <section className="block bye-reviews" aria-label="BYE student reviews">
    <div className="row"><h3>BYE student reviews</h3>{resolution?.professor&&resolution.course&&<a className="button secondary" href={'/reviews/?'+new URLSearchParams({professorId:resolution.professor.id,courseId:resolution.course.id})}>Write a review →</a>}</div>
    <p className="muted small">PCC students’ feedback submitted to BYE. Ratings below are separate from Rate My Professors.</p>
    {busy&&!resolution&&<p role="status">Finding BYE reviews…</p>}
    {resolution&&!resolution.professor&&<p className="notice">{resolution.match==='ambiguous'?'More than one BYE professor matches this name. Reviews have not been attached automatically.':'No exact professor match in the BYE catalog yet.'} <a className="text-link" href="/reviews/">Choose a professor to write a review →</a></p>}
    {profile&&<><div className="stats"><div className="stat"><b>{score(profile.quality)}<small>/5</small></b><span>BYE quality</span></div><div className="stat"><b>{score(profile.difficulty)}<small>/5</small></b><span>BYE difficulty</span></div></div><p className="muted small">{profile.count} {profile.count===1?'review':'reviews'} across all courses · Checked {new Date(profile.retrievedAt).toLocaleString()}</p></>}
    {ratingError&&<p role="status" className="notice">{ratingError} <button className="text-link" onClick={()=>setRefresh(x=>x+1)}>Retry BYE ratings</button></p>}
    {resolution?.professor&&<>
      <div className="row"><label>BYE review course <select className="bare-select" value={filter} onChange={e=>setFilter(e.target.value)}><option value="this">This class</option><option value="all">All courses</option>{profile?.courses.filter(c=>c.id!==resolution.course?.id).map(c=><option key={c.id} value={c.id}>{c.code} · {c.count}</option>)}</select></label><label>Sort BYE reviews <select className="bare-select" value={sort} onChange={e=>setSort(e.target.value)}><option value="recent">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest quality</option><option value="lowest">Lowest quality</option><option value="difficulty">Lowest difficulty</option><option value="highestDifficulty">Highest difficulty</option></select></label></div>
      {!resolution.course&&filter==='this'&&<p className="notice">This class could not be matched uniquely to the BYE catalog. Choose All courses to read this professor’s reviews.</p>}
      {busy&&<p role="status">Loading BYE reviews…</p>}
      {!busy&&!error&&!rows.length&&!(filter==='this'&&!resolution.course)&&<p className="muted">No BYE reviews for this selection yet.</p>}
      {rows.map(r=><article className="review-card" key={r.id}><div className="row"><span className="chip">{r.course||'Course unspecified'}</span><span className="muted small">{new Date(r.date).toLocaleDateString()}</span></div><p className="bye-comment">{r.body||'No written comment.'}</p><p className="muted small">BYE quality {r.quality} · Difficulty {r.difficulty}</p><button type="button" className="text-link" onClick={()=>{setReportId(r.id);setReason('');setReportMessage('');setNeedsLogin(false)}}>Report review</button>{reportId===r.id&&<form onSubmit={report}><label>Reason for reporting<textarea required maxLength={500} rows={3} value={reason} onChange={e=>setReason(e.target.value)} /></label><div className="row"><button className="button secondary" disabled={reportBusy||!reason.trim()}>{reportBusy?'Sending…':'Send report'}</button><button type="button" className="text-link" disabled={reportBusy} onClick={()=>setReportId('')}>Cancel</button></div></form>}</article>)}
      {next!==null&&<button className="button secondary wide" disabled={loadingMore||busy} onClick={()=>void more()}>{loadingMore?'Loading…':'Show more BYE reviews'}</button>}
      <button className="text-link" disabled={busy||loadingMore} onClick={()=>setRefresh(x=>x+1)}>Refresh BYE reviews</button>
    </>}
    {error&&<div role="alert" className="notice"><p>{error}</p><button className="text-link" onClick={()=>resolution?.professor?setRefresh(x=>x+1):setRetry(x=>x+1)}>Retry BYE reviews</button></div>}
    {reportMessage&&<p role="status" className="notice">{reportMessage}{needsLogin&&<> <a className="text-link" href="/reviews/">Verify your school email</a>, then return here to send the report.</>}</p>}
  </section>
}
