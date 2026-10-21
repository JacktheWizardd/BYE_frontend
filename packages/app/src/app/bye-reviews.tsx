import { useEffect, useRef, useState } from 'react'
import type { ByeRatingProfile, ByeResolution, ByeReviewPage } from '@bye/core/reviews'
import { useRuntime } from '../runtime'
import { resolutionResponse, profileResponse, reviewsResponse } from '../review-response'

/** Public reads only; authentication and review mutations stay on the website. */
export function ByeReviews({ name, course }: { name: string; course: string }) {
  const runtime = useRuntime()
  const [resolution, setResolution] = useState<ByeResolution | null>(null)
  const [profile, setProfile] = useState<ByeRatingProfile | null>(null)
  const [page, setPage] = useState<ByeReviewPage>({ reviews: [], nextOffset: null })
  const [filter, setFilter] = useState('this'), [sort, setSort] = useState('recent')
  const [error, setError] = useState(''), [ratingError, setRatingError] = useState(''), [busy, setBusy] = useState(false), [retry, setRetry] = useState(0)
  const generation = useRef(0), controller = useRef<AbortController | null>(null)
  async function read<T>(route: string, signal: AbortSignal): Promise<T> {
    const response = await runtime.request('/api/reviews/' + route, { signal, credentials: 'same-origin', cache: 'no-store' })
    const body = await response.json() as { data?: unknown; error?: { message?: string } }
    signal.throwIfAborted()
    if (!response.ok || !body || typeof body !== 'object' || !('data' in body)) throw new Error(body?.error?.message ?? 'BYE reviews are unavailable. Try again.')
    return body.data as T
  }
  useEffect(() => {
    const run = new AbortController(); setResolution(null); setProfile(null); setError(''); setRatingError(''); setFilter('this'); setSort('recent')
    void read<unknown>('resolve?' + new URLSearchParams({ instructor: name, course }), run.signal).then(resolutionResponse).then(setResolution).catch(e => { if (!run.signal.aborted) setError(e.message) })
    return () => run.abort()
  }, [name, course, retry])
  useEffect(() => {
    if (!resolution?.professor) return
    const run = new AbortController(); setProfile(null); setRatingError('')
    const professorId = resolution.professor.id
    void read<unknown>('profile?professorId=' + encodeURIComponent(professorId), run.signal).then(v => profileResponse(v, professorId)).then(setProfile).catch(e => { if (!run.signal.aborted) setRatingError(e.message) })
    return () => run.abort()
  }, [resolution])
  const params = (offset: number) => new URLSearchParams({ professorId: resolution!.professor!.id, sort, offset: String(offset), ...(filter === 'this' && resolution?.course ? { courseId: resolution.course.id } : filter !== 'this' && filter !== 'all' ? { courseId: filter } : {}) })
  async function load(offset = 0) {
    if (!resolution?.professor || (filter === 'this' && !resolution.course)) return
    const run = controller.current!, serial = generation.current
    setBusy(true); setError('')
    try {
      const next = reviewsResponse(await read<unknown>('list?' + params(offset), run.signal), offset)
      if (serial === generation.current && !run.signal.aborted) setPage(old => {
        const rows = [...new Map([...(offset ? old.reviews : []), ...next.reviews].map(r => [r.id, r])).values()].slice(0, 200)
        return { reviews: rows, nextOffset: rows.length < 200 ? next.nextOffset : null }
      })
    } catch (e) { if (!run.signal.aborted && serial === generation.current) setError(e instanceof Error ? e.message : 'BYE reviews are unavailable.') }
    finally { if (!run.signal.aborted && serial === generation.current) setBusy(false) }
  }
  useEffect(() => {
    controller.current?.abort(); generation.current++; controller.current = new AbortController(); setPage({ reviews: [], nextOffset: null }); setBusy(false)
    void load()
    return () => controller.current?.abort()
  }, [resolution, filter, sort])
  return <section className="block bye-reviews" aria-label="BYE student reviews">
    <div className="row"><h3>BYE student reviews</h3><button className="pill" onClick={() => void runtime.app.openDownload('https://bye-before-you-enroll.pages.dev/reviews/')}>Write or report a review ↗</button></div>
    <p className="muted small">Verified student submissions to BYE. Separate from Rate My Professors ratings and reviews.</p>
    {!resolution && !error && <p role="status">Finding BYE reviews…</p>}
    {resolution && !resolution.professor && <p>{resolution.match === 'ambiguous' ? 'More than one professor matches. Reviews have not been attached automatically.' : 'No exact professor match in the BYE catalog yet.'}</p>}
    {profile && <p>BYE quality {profile.quality?.toFixed(1) ?? 'Unknown'}/5 · Difficulty {profile.difficulty?.toFixed(1) ?? 'Unknown'}/5 · {profile.count} reviews</p>}
    {ratingError && <p role="status">{ratingError}</p>}
    {resolution?.professor && <><div className="row"><label>BYE review course <select aria-label="BYE review course" value={filter} onChange={e => setFilter(e.target.value)}><option value="this">This class</option><option value="all">All courses</option>{profile?.courses.filter(c => c.id !== resolution.course?.id).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}</select></label>
      <label>Sort BYE reviews <select value={sort} onChange={e => setSort(e.target.value)}><option value="recent">Newest</option><option value="oldest">Oldest</option><option value="highest">Highest quality</option><option value="lowest">Lowest quality</option><option value="difficulty">Lowest difficulty</option><option value="highestDifficulty">Highest difficulty</option></select></label></div>
      {filter === 'this' && !resolution.course && <p>This class could not be matched uniquely. Choose All courses to read this professor’s reviews.</p>}
      {busy && <p role="status">Loading BYE reviews…</p>}
      {page.reviews.map(r => <article className="review-card" key={r.id}><span className="chip">{r.course || 'Course unspecified'}</span><p>{r.body || 'No written comment.'}</p><p className="muted small">BYE quality {r.quality}/5 · Difficulty {r.difficulty}/5</p></article>)}
      {!busy && !error && !page.reviews.length && <p>No BYE reviews for this selection.</p>}
      {page.nextOffset !== null && <button className="pill" disabled={busy} onClick={() => void load(page.nextOffset!)}>Show more BYE reviews</button>}
    </>}
    {error && <p role="alert">{error}</p>}<button className="text-link" disabled={busy} onClick={() => setRetry(n => n + 1)}>Refresh BYE reviews</button>
  </section>
}
