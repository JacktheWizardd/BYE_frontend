import { test } from 'node:test'
import assert from 'node:assert/strict'
import { LiveBridge, type ChoiceStore } from '../apps/web/src/live-bridge'
import { setup } from './fixtures'
import { FALL, demoData } from '../apps/web/src/demo-data'
import type { Snapshot } from '../packages/core/types'
import { errorResponse } from '../server/service'
import type { ApiResults } from '../packages/core/api'

class Choices implements ChoiceStore {
  values = new Map<string, string>()
  getItem(k: string) { return this.values.get(k) ?? null }
  setItem(k: string, v: string) { this.values.set(k, v) }
  removeItem(k: string) { this.values.delete(k) }
}
function fixture() {
  const s = setup(), choices = new Choices(), sources: string[] = []
  const request: typeof fetch = async (url, init) => {
    init?.signal?.throwIfAborted()
    const u = new URL(String(url), 'https://fixture.local'), kind = u.pathname.split('/').at(-1)!
    if (kind === 'status') return Response.json({ enabled: true, rmpConfigured: true })
    try { return Response.json(await s.service.operation(kind as keyof ApiResults, u.searchParams, 'test-browser')) } catch (e) { return errorResponse(e) }
  }
  const bridge = new LiveBridge(request, choices, url => sources.push(url)); let state!: Snapshot
  bridge.subscribe(s => { state = s })
  return { ...s, request, choices, sources, bridge, state: () => state }
}
async function search(f: ReturnType<typeof fixture>, query = 'MATH5A') { await f.bridge.command({ kind: 'search', query, term: FALL }); await f.bridge.idle() }

test('live bridge retrieves sections and profiles through typed same-origin operations', async () => {
  const f = fixture(); assert.ok((await f.bridge.command({ kind: 'terms' }) as unknown[]).length)
  await search(f); assert.equal(f.state().course?.display, 'MATH 5A'); assert.equal(f.state().loading, false)
  const p = f.state().professors.find(p => p.name === 'Lena Whitcombe')!
  assert.equal(p.state, 'ready'); assert.ok(p.profile?.reviews.length); assert.equal(p.profile?.source?.source, 'rmp')
})
test('disabled live status prevents schedule retrieval and does not fall back to fictional data', async () => {
  const f = fixture(), off = new LiveBridge(async () => Response.json({ enabled: false, rmpConfigured: false }))
  await assert.rejects(off.command({ kind: 'terms' }), /not available/)
  assert.equal(f.counts().schedules, 0)
})
test('ambiguity requires selection; choices survive a bridge restart but are browser-local', async () => {
  const f = fixture(); await search(f, 'ETH014')
  let p = f.state().professors.find(p => p.state === 'choose')!
  assert.ok(p); assert.equal(p.profile, undefined)
  const chosen = p.candidates[0].id
  await f.bridge.command({ kind: 'select', professorId: p.id, profileId: chosen }); await f.bridge.idle()
  assert.equal(f.state().professors.find(x => x.id === p.id)?.profile?.id, chosen)
  const restarted = new LiveBridge(f.request, f.choices); let state!: Snapshot; restarted.subscribe(s => { state = s })
  await restarted.command({ kind: 'search', query: 'ETH014', term: FALL }); await restarted.idle()
  assert.equal(state.professors.find(x => x.id === p.id)?.profile?.id, chosen)
  const other = new LiveBridge(f.request, new Choices()); other.subscribe(s => { state = s })
  await other.command({ kind: 'search', query: 'ETH014', term: FALL }); await other.idle()
  assert.equal(state.professors.find(x => x.id === p.id)?.state, 'choose')
})
test('details load course evidence and preserve professor-wide scores', async () => {
  const f = fixture(); await search(f)
  const p = f.state().professors.find(p => p.name === 'Lena Whitcombe')!, rating = p.profile?.rating
  await f.bridge.command({ kind: 'details', professorId: p.id, filter: 'this' }); await f.bridge.idle()
  const updated = f.state().professors.find(x => x.id === p.id)!
  assert.equal(updated.profile?.rating, rating); assert.ok(updated.profile?.reviews.length)
  assert.equal(updated.detailLoading, false)
})
test('outdated search response cannot replace newer results even when fetch ignores abort', async () => {
  const f = fixture(); let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  const request: typeof fetch = async (url, init) => { if (String(url).includes('/sections?') && String(url).includes('MATH5A')) await held; return f.request(url, { ...init, signal: undefined }) }
  const bridge = new LiveBridge(request); let state!: Snapshot; bridge.subscribe(s => { state = s })
  await bridge.command({ kind: 'search', query: 'MATH5A', term: FALL })
  await bridge.command({ kind: 'search', query: 'ETH014', term: FALL }); release(); await bridge.idle()
  assert.equal(state.course?.display, 'ETH 014')
})
test('Stop cancels lookup and another search still works', async () => {
  const f = fixture(); await f.bridge.command({ kind: 'search', query: 'MATH5A', term: FALL }); await f.bridge.command({ kind: 'stop' }); await f.bridge.idle()
  assert.equal(f.state().loading, false); await search(f, 'ETH014'); assert.equal(f.state().course?.display, 'ETH 014')
})
test('review failure keeps retrieved evidence and sections available', async () => {
  const f = fixture(); const request: typeof fetch = (url, init) => String(url).includes('/reviews?') ? Promise.resolve(Response.json({ error: { code: 'SOURCE_UNAVAILABLE', message: 'Source offline', retryable: true } }, { status: 503 })) : f.request(url, init)
  const bridge = new LiveBridge(request); let state!: Snapshot; bridge.subscribe(s => { state = s })
  await bridge.command({ kind: 'search', query: 'MATH5A', term: FALL }); await bridge.idle()
  const p = state.professors.find(p => p.name === 'Lena Whitcombe')!, before = p.profile?.reviews
  await bridge.command({ kind: 'details', professorId: p.id, filter: 'this' }); await bridge.idle()
  const after = state.professors.find(x => x.id === p.id)!
  assert.deepEqual(after.profile?.reviews, before); assert.ok(after.sections.length); assert.match(after.reviewIssue!, /offline/)
})
test('changing profile clears the previous report and rejects stale review jobs', async () => {
  const f = fixture(); let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  const request: typeof fetch = async (url, init) => { if (String(url).includes('/reviews?')) await held; return f.request(url, { ...init, signal: undefined }) }
  const bridge = new LiveBridge(request, f.choices); let state!: Snapshot; bridge.subscribe(s => { state = s })
  await bridge.command({ kind: 'search', query: 'ETH014', term: FALL }); await bridge.idle()
  const p = state.professors.find(p => p.state === 'choose')!
  await bridge.command({ kind: 'select', professorId: p.id, profileId: p.candidates[0].id }); await bridge.idle()
  const details = bridge.command({ kind: 'details', professorId: p.id, filter: 'this' })
  const selecting = bridge.command({ kind: 'select', professorId: p.id, profileId: p.candidates[1].id })
  assert.equal(state.professors.find(x => x.id === p.id)?.profile, undefined)
  release(); await Promise.all([details, selecting]); await bridge.idle()
  assert.equal(state.professors.find(x => x.id === p.id)?.profile?.id, p.candidates[1].id)
})
test('source links are limited to PCC and verified RMP identities', async () => {
  const f = fixture(); await search(f)
  const p = f.state().professors.find(p => p.profile)!
  await f.bridge.command({ kind: 'source', target: 'pcc' }); await f.bridge.command({ kind: 'source', target: 'rmp', professorId: p.id })
  assert.ok(f.sources[0].startsWith('https://findclasses.pasadena.edu/')); assert.ok(f.sources[1].startsWith('https://www.ratemyprofessors.com/professor/'))
  await assert.rejects(f.bridge.command({ kind: 'source', target: 'rmp', professorId: p.id, candidateId: '999999' }))
})
test('rapid A to B to A profile selection completes the newest selection', async () => {
  const f = fixture(); await search(f, 'ETH014'); const p = f.state().professors.find(p => p.state === 'choose')!
  const a = p.candidates[0].id, b = p.candidates[1].id
  await Promise.all([f.bridge.command({ kind: 'select', professorId: p.id, profileId: a }), f.bridge.command({ kind: 'select', professorId: p.id, profileId: b }), f.bridge.command({ kind: 'select', professorId: p.id, profileId: a })]); await f.bridge.idle()
  const current = f.state().professors.find(x => x.id === p.id)!
  assert.equal(current.profile?.id, a); assert.equal(current.state, 'ready')
})
test('review retrieval stops at 50 source records per filter', async () => {
  const f = fixture(); let pages = 0
  const request: typeof fetch = async (url, init) => {
    if (!String(url).includes('/reviews?')) return f.request(url, init)
    const params = new URL(String(url), 'https://fixture.local').searchParams, count = Math.min(20, Number(params.get('remaining'))), offset = Number(params.get('cursor') ?? 0), profile = structuredClone(demoData.profiles.find(p => p.firstName === 'Lena')!)
    profile.reviews = Array.from({ length: count }, (_, i) => ({ id: 'bounded-' + (offset + i), course: 'MATH5A', text: 'Fictional review', date: '2026-01-01' })); pages++
    return Response.json({ data: { profile, ids: profile.reviews.map(r => r.id), hasNextPage: true, nextCursor: String(offset + count) }, meta: { source: 'rmp', retrievedAt: Date.now(), stale: false } })
  }
  const bridge = new LiveBridge(request); let state!: Snapshot; bridge.subscribe(s => { state = s })
  await bridge.command({ kind: 'search', query: 'MATH5A', term: FALL }); await bridge.idle(); const p = state.professors.find(p => p.name === 'Lena Whitcombe')!
  await bridge.command({ kind: 'details', professorId: p.id, filter: 'this' }); await bridge.idle()
  assert.equal(pages, 3); const current = state.professors.find(x => x.id === p.id)!
  assert.equal(Object.values(current.profile!.coverage).find(c => c.reviewIDs[0]?.startsWith('bounded'))?.reviewIDs.length, 50)
  await bridge.command({ kind: 'details', professorId: p.id, filter: 'this' }); assert.equal(pages, 3)
})
test('non-progressing review pages preserve previews and expose a retryable review issue', async () => {
  const f = fixture(); const request: typeof fetch = async (url, init) => {
    if (!String(url).includes('/reviews?')) return f.request(url, init)
    const profile = structuredClone(demoData.profiles.find(p => p.firstName === 'Lena')!); profile.reviews = []
    return Response.json({ data: { profile, ids: [], hasNextPage: true, nextCursor: 'stalled' }, meta: { source: 'rmp', retrievedAt: Date.now(), stale: false } })
  }
  const bridge = new LiveBridge(request); let state!: Snapshot; bridge.subscribe(s => { state = s })
  await bridge.command({ kind: 'search', query: 'MATH5A', term: FALL }); await bridge.idle(); const p = state.professors.find(p => p.name === 'Lena Whitcombe')!
  await bridge.command({ kind: 'details', professorId: p.id, filter: 'this' }); await bridge.idle()
  const current = state.professors.find(x => x.id === p.id)!
  assert.match(current.reviewIssue!, /stopped progressing/); assert.ok(current.profile!.reviews.length); assert.equal(current.detailLoading, false)
})

test('PCC search remains available when RMP is disabled, without RMP operations or summaries', async()=>{
  const f=setup(),calls:string[]=[]
  const request:typeof fetch=async(input)=>{
    const url=new URL(String(input),'https://fixture.test'),kind=url.pathname.split('/').at(-1)!
    calls.push(kind)
    if(kind==='status')return Response.json({enabled:true,rmpConfigured:false})
    try{return Response.json(await f.service.operation(kind as any,url.searchParams,'independent'))}catch(e){return errorResponse(e)}
  }
  const bridge=new LiveBridge(request)
  await bridge.command({kind:'terms'})
  await bridge.command({kind:'search',term:FALL,query:'MATH5A'});await bridge.idle()
  let snapshot:any;bridge.subscribe(s=>snapshot=s)
  assert.ok(snapshot.professors.length);assert.ok(snapshot.professors.every((p:any)=>p.sections.length))
  assert.equal(calls.some(k=>['candidates','profile','reviews'].includes(k)),false)
  await assert.rejects(bridge.command({kind:'summary',professorId:snapshot.professors[0].id}),/not part/)
})
