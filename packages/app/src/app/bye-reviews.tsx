import { useEffect, useRef, useState } from 'react'
import type { ByeReviewState } from '@bye/core/types'
import type { ByeRatingProfile, ByeResolution } from '@bye/core/reviews'
import type { ByeReviews } from '@bye/ui'
import { useRuntime } from '../runtime'
import { resolutionResponse, profileResponse, reviewsResponse } from '../review-response'

const empty = (loading: boolean): ByeReviewState => ({ loading, reviews: [], nextOffset: null, filter: '', sort: '' })

/** Public reads only; authentication and review mutations stay on the website. BYE state is scoped to the PCC
 *  instructor/course; the shared Report asks for each filter and sort through `load`. */
export function useByeReviews(name: string | undefined, course: string | undefined): ByeReviews | undefined {
  const runtime = useRuntime()
  const [state, setState] = useState<ByeReviewState>(() => empty(!!name))
  const [retry, setRetry] = useState(0)
  const generation = useRef(0), pageAbort = useRef<AbortController | null>(null), current = useRef(state)
  current.current = state
  const update = (gen: number, change: (s: ByeReviewState) => ByeReviewState) => { if (gen === generation.current) setState(change) }
  async function read<T>(route: string, signal: AbortSignal): Promise<T> {
    const response = await runtime.request('/api/reviews/' + route, { signal, credentials: 'same-origin', cache: 'no-store' })
    const body = await response.json() as { data?: unknown; error?: { message?: string } }
    signal.throwIfAborted()
    if (!response.ok || !body || typeof body !== 'object' || !('data' in body)) throw new Error(body?.error?.message ?? 'BYE reviews are unavailable. Try again.')
    return body.data as T
  }

  useEffect(() => {
    const gen = ++generation.current, abort = new AbortController(); pageAbort.current?.abort()
    setState(empty(!!name))
    if (!name || !course) return () => abort.abort()
    read<unknown>('resolve?' + new URLSearchParams({ instructor: name, course }), abort.signal).then(resolutionResponse).then((resolution: ByeResolution) => {
      update(gen, s => ({ ...s, resolution, loading: false }))
      const professorId = resolution.professor?.id
      if (!professorId) return
      read<unknown>('profile?professorId=' + encodeURIComponent(professorId), abort.signal).then(v => profileResponse(v, professorId))
        .then((profile: ByeRatingProfile) => update(gen, s => ({ ...s, profile, ratingIssue: undefined })))
        .catch(e => { if (!abort.signal.aborted) update(gen, s => ({ ...s, ratingIssue: e instanceof Error ? e.message : 'BYE ratings are unavailable.' })) })
    }).catch(e => { if (!abort.signal.aborted) update(gen, s => ({ ...s, loading: false, issue: e instanceof Error ? e.message : 'BYE reviews are unavailable.' })) })
    return () => abort.abort()
  }, [name, course, retry])

  const load = (filter: string, sort: string, more = false) => {
    const s = current.current, professor = s.resolution?.professor
    if (!professor) { setRetry(x => x + 1); return }
    if (more && (s.loading || s.nextOffset === null || s.filter !== filter || s.sort !== sort)) return
    const courseId = filter === 'this' ? s.resolution?.course?.id : filter === 'all' ? undefined : filter
    if (filter === 'this' && !courseId) { setState({ ...s, loading: false, issue: undefined, filter, sort, reviews: [], nextOffset: null }); return }
    const offset = more ? s.nextOffset! : 0, gen = generation.current
    if (!more) { pageAbort.current?.abort(); pageAbort.current = new AbortController() }
    const abort = pageAbort.current!
    setState({ ...s, loading: true, issue: undefined, filter, sort, reviews: more ? s.reviews : [], nextOffset: more ? s.nextOffset : null })
    const params = new URLSearchParams({ professorId: professor.id, sort, offset: String(offset), ...(courseId ? { courseId } : {}) })
    read<unknown>('list?' + params, abort.signal).then(v => reviewsResponse(v, offset))
      .then(page => update(gen, x => {
        if (x.filter !== filter || x.sort !== sort) return x
        const reviews = [...new Map([...x.reviews, ...page.reviews].map(r => [r.id, r])).values()].slice(0, 200)
        return { ...x, loading: false, reviews, nextOffset: reviews.length < 200 ? page.nextOffset : null, retrievedAt: new Date().toISOString() }
      }))
      .catch(e => { if (!abort.signal.aborted) update(gen, x => ({ ...x, loading: false, issue: e instanceof Error ? e.message : 'BYE reviews are unavailable.' })) })
  }

  const write = () => void runtime.app.openDownload('https://bye-before-you-enroll.pages.dev/reviews/')
  return runtime.demo ? undefined : { state, load, write, external: true }
}
