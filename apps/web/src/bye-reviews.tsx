import React, { useEffect, useRef, useState } from 'react'
import type { ByeReviewState } from '../../../packages/core/types'
import type { ByeResolution, ByeRatingProfile, ByeReviewPage, ByeWrittenReview } from '../../../packages/core/reviews'
import type { ByeReviews } from '../../../packages/ui'
import { api, FormError } from '../reviews/api'

/** BYE state is scoped to the PCC instructor/course, independent of the RMP profile. The shared Report asks for each
 *  filter and sort through `load`; this hook owns the same-origin /api/reviews/* requests and the report form. */
export function useByeReviews(name: string | undefined, course: string | undefined): ByeReviews {
  const [state, setState] = useState<ByeReviewState>({ loading: true, reviews: [], nextOffset: null, filter: '', sort: '' })
  const [retry, setRetry] = useState(0)
  const [reportId, setReportId] = useState(''), [reason, setReason] = useState(''), [reportBusy, setReportBusy] = useState(false)
  const [reportMessage, setReportMessage] = useState<{ id: string; text: string; login: boolean } | null>(null)
  const generation = useRef(0), pageAbort = useRef<AbortController | null>(null), reportFlight = useRef(false), current = useRef(state)
  current.current = state
  const update = (gen: number, change: (s: ByeReviewState) => ByeReviewState) => { if (gen === generation.current) setState(change) }

  useEffect(() => {
    const gen = ++generation.current, abort = new AbortController(); pageAbort.current?.abort()
    setState({ loading: !!name, reviews: [], nextOffset: null, filter: '', sort: '' }); setReportId(''); setReportMessage(null)
    if (!name || !course) return () => abort.abort()
    api<ByeResolution>('resolve?' + new URLSearchParams({ instructor: name, course }), undefined, abort.signal).then(resolution => {
      update(gen, s => ({ ...s, resolution, loading: false }))
      if (!resolution.professor) return
      api<ByeRatingProfile>('profile?professorId=' + resolution.professor.id, undefined, abort.signal)
        .then(profile => update(gen, s => ({ ...s, profile, ratingIssue: undefined })))
        .catch(e => { if (!abort.signal.aborted) update(gen, s => ({ ...s, ratingIssue: e.message })) })
    }).catch(e => { if (!abort.signal.aborted) update(gen, s => ({ ...s, loading: false, issue: e.message })) })
    return () => abort.abort()
  }, [name, course, retry])

  const load = (filter: string, sort: string, more = false) => {
    const s = current.current, professor = s.resolution?.professor
    if (!professor) { setRetry(x => x + 1); return }
    if (more && (s.loading || s.nextOffset === null || s.filter !== filter || s.sort !== sort)) return
    const courseId = filter === 'this' ? s.resolution?.course?.id : filter === 'all' ? undefined : filter
    const offset = more ? s.nextOffset! : 0, gen = generation.current
    if (!more) { pageAbort.current?.abort(); pageAbort.current = new AbortController() }
    const abort = pageAbort.current!
    setState({ ...s, loading: true, issue: undefined, filter, sort, reviews: more ? s.reviews : [], nextOffset: more ? s.nextOffset : null })
    const params = new URLSearchParams({ professorId: professor.id, sort, offset: String(offset), ...(courseId ? { courseId } : {}) })
    api<ByeReviewPage>('list?' + params, undefined, abort.signal)
      .then(page => update(gen, x => x.filter !== filter || x.sort !== sort ? x : ({ ...x, loading: false, reviews: [...new Map([...x.reviews, ...page.reviews].map(r => [r.id, r])).values()], nextOffset: page.nextOffset, retrievedAt: new Date().toISOString() })))
      .catch(e => { if (!abort.signal.aborted) update(gen, x => ({ ...x, loading: false, issue: e instanceof Error ? e.message : 'Reviews could not be loaded.' })) })
  }

  const report = async (e: React.FormEvent) => {
    e.preventDefault(); if (reportFlight.current) return
    const id = reportId; reportFlight.current = true; setReportBusy(true); setReportMessage(null)
    try { await api('report', { reviewId: id, reason }); setReportId(''); setReason(''); setReportMessage({ id, text: 'Report received.', login: false }); load(current.current.filter, current.current.sort) }
    catch (e) { setReportMessage({ id, text: e instanceof Error ? e.message : 'The report could not be confirmed.', login: e instanceof FormError && e.code === 'SESSION_EXPIRED' }) }
    finally { reportFlight.current = false; setReportBusy(false) }
  }
  const actions = (r: ByeWrittenReview) => <>
    <button type="button" className="text-link" onClick={() => { setReportId(r.id); setReason(''); setReportMessage(null) }}>Report review</button>
    {reportId === r.id && <form onSubmit={report}><label>Reason for reporting<textarea required maxLength={500} rows={3} value={reason} onChange={e => setReason(e.target.value)} /></label>
      <div className="row"><button className="button secondary" disabled={reportBusy || !reason.trim()}>{reportBusy ? 'Sending…' : 'Send report'}</button><button type="button" className="text-link" disabled={reportBusy} onClick={() => setReportId('')}>Cancel</button></div></form>}
    {reportMessage?.id === r.id && <p role="status" className="notice">{reportMessage.text}{reportMessage.login && <> <a className="text-link" href="/reviews/">Verify your school email</a>, then return here to send the report.</>}</p>}
  </>
  const write = () => {
    const professor = state.resolution?.professor, c = state.resolution?.course
    location.assign(professor && c ? '/reviews/?' + new URLSearchParams({ professorId: professor.id, courseId: c.id }) : '/reviews/')
  }
  return { state, load, write, actions }
}
