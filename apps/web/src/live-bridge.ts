import type { Bridge, Command, Course, Profile, Professor, Snapshot, Term } from '@shared/types'
import type { ApiErrorBody, ApiResults, Envelope, Status } from '@shared/api'
import { identity, normalizedName, orderReviews, sameCourse } from '@shared/domain'

export class LiveError extends Error {
  constructor(readonly code: string, message: string, readonly retryAfter?: number) { super(message) }
}
export interface ChoiceStore { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void }
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'This operation could not finish. Try again.'
const store = (): ChoiceStore | undefined => { try { return globalThis.localStorage } catch { return undefined } }

/** Browser-owned state; the API shares source evidence, never a student's selections. */
export class LiveBridge implements Bridge {
  private state: Snapshot = { operationId: '', professors: [], loading: false, previewPending: 0 }
  private listeners = new Set<(state: Snapshot) => void>()
  private run = new AbortController()
  private versions = new Map<string, AbortController>()
  private tasks = new Set<Promise<void>>()
  private jobs = new Map<string, Promise<void>>()
  private activePreviews = 0
  private activeDetails = 0
  private blockedUntil = 0
  private rmpConfigured = true
  private serial = 0
  private pollTimer?: ReturnType<typeof setTimeout>
  private expiryTimer?: ReturnType<typeof setInterval>
  private polling = false
  private scheduleFailures = 0
  private lifecycleInstalled = false
  private epochs = new Map<string, number>()
  constructor(private request: typeof fetch = (...args) => fetch(...args), private storage: ChoiceStore | undefined = store(), private openSource: (url: string) => void = url => { window.open(url, '_blank', 'noopener,noreferrer') }) {}
  subscribe(listener: (state: Snapshot) => void) { this.listeners.add(listener); listener(structuredClone(this.state)); return () => { this.listeners.delete(listener) } }
  private emit() { this.state.previewPending = this.state.professors.filter(p => p.state === 'pending' || p.state === 'loading').length; for (const listener of this.listeners) listener(structuredClone(this.state)) }
  private current(p: Professor, signal: AbortSignal) { signal.throwIfAborted(); if (!this.state.professors.includes(p)) throw new DOMException('Search replaced', 'AbortError') }
  private professor(id: string) { const p = this.state.professors.find(p => p.id === id); if (!p) throw new LiveError('EXPIRED', 'This professor is no longer in the current search.'); return p }
  private context(p: Professor, replace = false) { if (replace) { this.versions.get(p.id)?.abort(); this.epochs.set(p.id, ++this.serial) }; let local = this.versions.get(p.id); if (!local || local.signal.aborted) { local = new AbortController(); this.versions.set(p.id, local) }; return AbortSignal.any([this.run.signal, local.signal]) }
  private choiceKey(p: Professor) { return 'bye-profile:v1:2649:' + normalizedName(p.name) + '|' + p.subject }
  private choice(p: Professor) { try { const id = this.storage?.getItem(this.choiceKey(p)); return id && /^[1-9]\d*$/.test(id) ? id : undefined } catch { return undefined } }
  private saveChoice(p: Professor, id?: string) { try { if (id) this.storage?.setItem(this.choiceKey(p), id); else this.storage?.removeItem(this.choiceKey(p)) } catch { /* Private browsing may disable storage. */ } }
  private track(key: string, work: () => Promise<void>) {
    if (this.jobs.has(key)) return this.jobs.get(key)!
    const operation = this.state.operationId
    const task = work().catch(e => { if (this.state.operationId === operation && !this.run.signal.aborted && e?.name !== 'AbortError') { this.state.issue = errorMessage(e); this.emit() } }).finally(() => { this.tasks.delete(task); if (this.jobs.get(key) === task) this.jobs.delete(key) })
    this.jobs.set(key, task); this.tasks.add(task); return task
  }
  async idle() { while (this.tasks.size) await Promise.allSettled([...this.tasks]) }
  private async wait(signal: AbortSignal) {
    signal.throwIfAborted()
    await new Promise<void>((resolve, reject) => { const abort = () => { clearTimeout(timer); reject(signal.reason) }; const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve() }, 15); signal.addEventListener('abort', abort, { once: true }) })
  }
  private async queue<T>(kind: 'preview' | 'detail', signal: AbortSignal, work: () => Promise<T>) {
    while (kind === 'preview' ? this.activePreviews >= 2 : this.activeDetails >= 1 || this.state.previewPending > 0) await this.wait(signal)
    signal.throwIfAborted()
    if (kind === 'preview') this.activePreviews++; else this.activeDetails++
    try { return await work() } finally { if (kind === 'preview') this.activePreviews--; else this.activeDetails-- }
  }
  private async api<K extends keyof ApiResults>(kind: K, params: Record<string, string>, signal: AbortSignal): Promise<Envelope<ApiResults[K]>> {
    signal.throwIfAborted()
    if (Date.now() < this.blockedUntil) throw new LiveError('RATE_LIMITED', 'The source is cooling down. Try again shortly.', Math.ceil((this.blockedUntil - Date.now()) / 1000))
    const response = await this.request('/api/v1/' + kind + '?' + new URLSearchParams(params), { signal: AbortSignal.any([signal, AbortSignal.timeout(65_000)]), credentials: 'same-origin', headers: { Accept: 'application/json' } })
    const body = await response.json() as Envelope<ApiResults[K]> & ApiErrorBody
    signal.throwIfAborted()
    if (!response.ok) {
      const retry = Number(response.headers.get('Retry-After') ?? body.error?.retryAfter)
      if (Number.isFinite(retry) && retry > 0) this.blockedUntil = Date.now() + Math.min(retry, 3600) * 1000
      throw new LiveError(body.error?.code ?? 'SOURCE_UNAVAILABLE', body.error?.message ?? 'The source is unavailable. Try again.', retry)
    }
    if (!body.meta || !('data' in body)) throw new LiveError('MALFORMED', 'The server returned an unsupported response.')
    return body
  }
  private params(p: Professor) { return { term: this.state.term!.termCode, course: this.state.course!.display, instructor: p.name } }
  private verify(p: Professor, profile: Profile, expected: string) { if (profile.id !== expected || !identity(p.name, profile)) throw new LiveError('IDENTITY_MISMATCH', 'The profile identity could not be verified. Choose a profile again.') }
  async command(command: Command): Promise<unknown> {
    switch (command.kind) {
      case 'terms': {
        const response = await this.request('/api/v1/status', { signal: AbortSignal.timeout(15_000), credentials: 'same-origin', headers: { Accept: 'application/json' } }); const status = await response.json() as Status
        if (!response.ok || !status.enabled) throw new LiveError('LIVE_DISABLED', 'The live beta is not available yet. Use the sample demo while source access is verified.')
        this.rmpConfigured = status.rmpConfigured
        return (await this.api('terms', {}, AbortSignal.timeout(65_000))).data
      }
      case 'suggest': return (await this.api('courses', { term: command.term, query: command.query }, AbortSignal.timeout(65_000))).data
      case 'search': if(command.refresh && this.state.course?.display===command.query && this.state.term?.termCode===command.term.termCode) {await this.refreshSchedule()} else {this.search(command.query,command.term)}; return
      case 'stop': this.stop(); return
      case 'retry': { const p = this.professor(command.professorId); if (p.state === 'loading') return; const signal = this.context(p, true); p.detailLoading = false; return this.track(`retry:${this.state.operationId}:${p.id}:${this.epochs.get(p.id) ?? 0}`, () => this.lookup(p, signal)) }
      case 'discover': { const p = this.professor(command.professorId), signal = this.context(p); p.choosing = true; p.issue = undefined; this.emit(); return this.track(`discover:${this.state.operationId}:${p.id}:${this.epochs.get(p.id) ?? 0}`, async () => { try { const result = await this.queue('preview', signal, () => this.api('candidates', this.params(p), signal)); this.current(p, signal); p.candidates = result.data; this.emit() } catch (e) { if (!signal.aborted) { p.issue = errorMessage(e); this.emit() } } }) }
      case 'dismiss': this.professor(command.professorId).choosing = false; this.emit(); return
      case 'select': return this.select(this.professor(command.professorId), command.profileId)
      case 'details': return this.details(this.professor(command.professorId), command.filter)
      case 'summary': throw new LiveError('DISABLED', 'AI summaries are not part of the web beta.')
      case 'source': {
        if (command.target === 'pcc') { this.openSource('https://findclasses.pasadena.edu/?term=' + encodeURIComponent(this.state.term?.termCode ?? '')); return }
        const p = this.professor(command.professorId ?? ''), id = command.candidateId ?? p.profile?.id
        const verified = id === p.profile?.id ? p.profile : p.candidates.find(c => c.id === id)
        if (!verified || !identity(p.name, verified)) throw new LiveError('IDENTITY_MISMATCH', 'Choose a verified PCC profile first.')
        this.openSource('https://www.ratemyprofessors.com/professor/' + verified.id); return
      }
    }
  }
  stop() {
    if(this.pollTimer) clearTimeout(this.pollTimer); this.pollTimer=undefined
    if(this.expiryTimer) clearInterval(this.expiryTimer); this.expiryTimer=undefined
    this.run.abort(); this.versions.forEach(c => c.abort()); this.versions.clear(); this.run = new AbortController(); this.state.loading = false
    for (const p of this.state.professors) { if (p.state === 'loading' || p.state === 'pending') { p.state = p.profile ? 'ready' : 'unavailable'; p.issue = 'Stopped. Try again to retrieve this profile.' }; if (p.detailLoading) p.reviewIssue = 'Stopped. Retrieved reviews are still available.'; p.detailLoading = false }
    this.emit()
  }
  private search(query: string, term: Term) {
    this.stop(); const signal = this.run.signal
    this.state = { operationId: crypto.randomUUID(), term, professors: [], loading: true, previewPending: 0 }; this.emit()
    void this.track('search:' + this.state.operationId, async () => {
      try {
        const result = await this.api('sections', { term: term.termCode, query }, signal); signal.throwIfAborted()
        this.state.course = result.data.course; this.state.professors = result.data.professors; this.state.source = result.meta; this.state.issue = result.warning
        if (!this.state.professors.length) this.state.issue = 'No matching sections were published for this course and semester.'
        this.emit(); this.startSchedulePolling()
        await Promise.all(this.state.professors.map(p => this.lookup(p, this.context(p))))
      } catch (e) { if (!signal.aborted) this.state.issue = errorMessage(e) }
      finally { if (!signal.aborted) { this.state.loading = false; this.emit() } }
    })
  }
  private startSchedulePolling() {
    if(typeof document==='undefined') return;
    if(!this.lifecycleInstalled) {
      this.lifecycleInstalled=true;
      document.addEventListener('visibilitychange',()=>{if(document.hidden){if(this.pollTimer)clearTimeout(this.pollTimer)}else void this.refreshSchedule()});
      window.addEventListener('online',()=>{void this.refreshSchedule()});
      window.addEventListener('offline',()=>{if(this.pollTimer)clearTimeout(this.pollTimer)});
    }
    if(!this.expiryTimer) this.expiryTimer=setInterval(()=>this.expireSchedule(),10_000);
    this.scheduleNext();
  }
  private scheduleNext() {
    if(this.pollTimer)clearTimeout(this.pollTimer);
    if(typeof document!=='undefined' && !document.hidden && navigator.onLine && this.state.course) this.pollTimer=setTimeout(()=>{void this.refreshSchedule()},Math.min(900_000,60_000*2**this.scheduleFailures)*(0.9+Math.random()*0.2));
  }
  private expireSchedule() {
    const source=this.state.source;if(!source) return;
    if(source.stale || Date.now()>=(source.expiresAt??source.retrievedAt+900_000)) {
      let changed=false;
      for(const p of this.state.professors) for(const s of p.sections) if(s.details && [s.details.seatsOpen,s.details.capacity,s.details.waitlistCount,s.details.waitlistCapacity].some(x=>x!==undefined)) {s.details={...s.details,seatsOpen:undefined,capacity:undefined,waitlistCount:undefined,waitlistCapacity:undefined};changed=true;}
      if(changed) {this.state.source={...source,stale:true};this.emit();}
    }
  }
  private async refreshSchedule() {
    if(this.polling || !this.state.course || !this.state.term || this.state.loading || typeof document==='undefined' || document.hidden || !navigator.onLine) return;
    this.polling=true;const signal=this.run.signal,operation=this.state.operationId;
    try {
      const result=await this.api('sections',{term:this.state.term.termCode,query:this.state.course.display},signal);signal.throwIfAborted();
      if(operation!==this.state.operationId) return;
      const previous=new Map(this.state.professors.map(p=>[p.id,p]));
      this.state.professors=result.data.professors.map(p=>{const old=previous.get(p.id);if(old && old.name===p.name){old.sections=p.sections;return old;}p.state='unavailable';p.issue='PCC updated the instructor assignment. Retrieve a verified profile when ready.';return p;});
      const retained=new Set(this.state.professors.map(p=>p.id));for(const [id,c] of this.versions) if(!retained.has(id)){c.abort();this.versions.delete(id);}
      this.state.source=result.meta;this.scheduleFailures=0;this.emit();
    }catch{this.scheduleFailures=Math.min(this.scheduleFailures+1,4);this.expireSchedule()}
    finally{this.polling=false;this.scheduleNext()}
  }
  private async preview(p: Professor, id: string, signal: AbortSignal) {
    const result = await this.api('profile', { ...this.params(p), id }, signal); this.current(p, signal); this.verify(p, result.data.profile, id)
    const profile = result.data.profile; profile.coverage.all = { reviewIDs: result.data.ids, hasNextPage: result.data.hasNextPage, nextCursor: result.data.nextCursor, updatedAt: result.meta.retrievedAt }; return profile
  }
  private async lookup(p: Professor, signal: AbortSignal) {
    if (!this.rmpConfigured) { p.state='unavailable'; p.issue='Rate My Professors access is pending. PCC sections and BYE reviews remain available.'; this.emit(); return }
    if (['staff', 'tba', 'instructor to be announced'].includes(p.name.toLowerCase())) { p.state = 'unavailable'; p.issue = 'PCC has not named an instructor for this section yet.'; this.emit(); return }
    p.state = 'loading'; p.issue = undefined; this.emit()
    try {
      await this.queue('preview', signal, async () => {
        const remembered = this.choice(p)
        if (remembered) {
          try { const profile = await this.preview(p, remembered, signal); this.current(p, signal); p.profile = profile; p.state = 'ready'; this.emit(); return }
          catch (e) { this.current(p, signal); if (!(e instanceof LiveError && e.code === 'IDENTITY_MISMATCH')) throw e; this.saveChoice(p); p.profile = undefined; p.state = 'choose'; p.candidates = []; p.issue = errorMessage(e); this.emit(); return }
        }
        const result = await this.api('candidates', this.params(p), signal); this.current(p, signal); p.candidates = result.data
        if (p.candidates.length > 1) { p.profile = undefined; p.state = 'choose'; this.emit(); return }
        if (!p.candidates.length) throw new LiveError('NOT_FOUND', 'No matching PCC profile was found. Try again or check RMP.')
        const profile = await this.preview(p, p.candidates[0].id, signal); this.current(p, signal); p.profile = profile; p.state = 'ready'; this.emit()
      })
    } catch (e) { if (!signal.aborted) { p.profile = undefined; p.state = e instanceof LiveError && e.code === 'IDENTITY_MISMATCH' ? 'choose' : 'unavailable'; p.issue = errorMessage(e); this.emit() } }
  }
  private select(p: Professor, id: string) {
    if (!p.candidates.some(c => c.id === id)) return Promise.reject(new LiveError('INVALID_PROFILE', 'Choose a profile from the current list.'))
    const signal = this.context(p, true)
    p.profile = undefined; p.reviewIssue = undefined; p.issue = undefined; p.detailLoading = false; p.choosing = false; p.state = 'loading'; this.emit()
    return this.track(`select:${this.state.operationId}:${p.id}:${id}:${this.epochs.get(p.id) ?? 0}`, async () => {
      try { const profile = await this.queue('preview', signal, () => this.preview(p, id, signal)); this.current(p, signal); p.profile = profile; p.state = 'ready'; this.saveChoice(p, id); this.emit() }
      catch (e) { if (!signal.aborted) { p.state = e instanceof LiveError && e.code === 'IDENTITY_MISMATCH' ? 'choose' : 'unavailable'; p.issue = errorMessage(e); if (p.state === 'choose') { this.saveChoice(p); p.candidates = p.candidates.filter(c => c.id !== id) }; this.emit() } }
    })
  }
  private details(p: Professor, requested?: string) {
    if (!p.profile) return Promise.resolve()
    const signal = this.context(p), expected = p.profile.id, c = this.state.course!
    const filter = requested === 'this' ? p.profile.courseCounts.find(x => sameCourse(c, x.label))?.label ?? c.display : requested === 'all' ? undefined : requested
    const key = filter === undefined ? 'all' : 'course|' + filter
    if (p.profile.coverage[key]?.hasNextPage === false || (p.profile.coverage[key]?.reviewIDs.length ?? 0) >= 50) return Promise.resolve()
    return this.track(`details:${this.state.operationId}:${p.id}:${expected}:${key}:${this.epochs.get(p.id) ?? 0}`, async () => {
      try {
        await this.queue('detail', signal, async () => {
          this.current(p, signal); if (p.profile?.id !== expected) return
          p.detailLoading = true; p.reviewIssue = undefined; this.emit()
          const visited = new Set<string>()
          for (let pageNumber = 0; pageNumber < 10; pageNumber++) {
            this.current(p, signal); if (p.profile?.id !== expected) return
            const coverage = p.profile.coverage[key] ?? { reviewIDs: [], hasNextPage: true, updatedAt: Date.now() }
            if (!coverage.hasNextPage || coverage.reviewIDs.length >= 50) return
            const result: Envelope<ApiResults['reviews']> = await this.api('reviews', { ...this.params(p), id: expected, remaining: String(50 - coverage.reviewIDs.length), ...(filter ? { filter } : {}), ...(coverage.nextCursor ? { cursor: coverage.nextCursor } : {}) }, signal)
            this.current(p, signal); if (p.profile?.id !== expected) return
            this.verify(p, result.data.profile, expected)
            const fresh = result.data.ids.filter(id => !coverage.reviewIDs.includes(id))
            if (result.data.hasNextPage && (!fresh.length || !result.data.nextCursor || visited.has(result.data.nextCursor) || result.data.nextCursor === coverage.nextCursor)) throw new LiveError('PAGINATION', 'Review pagination stopped progressing. Retrieved reviews remain available.')
            if (result.data.nextCursor) visited.add(result.data.nextCursor)
            const profile: Profile = result.data.profile
            profile.reviews = orderReviews([...new Map([...p.profile.reviews, ...profile.reviews].map(r => [r.id, r])).values()])
            profile.coverage = { ...p.profile.coverage, [key]: { reviewIDs: [...coverage.reviewIDs, ...fresh].slice(0, 50), nextCursor: result.data.nextCursor, hasNextPage: result.data.hasNextPage, updatedAt: result.meta.retrievedAt } }
            p.profile = profile; this.emit()
          }
          throw new LiveError('PAGINATION', 'Review loading reached its safety limit. Retrieved reviews remain available.')
        })
      } catch (e) { if (!signal.aborted) { p.reviewIssue = errorMessage(e); if (e instanceof LiveError && e.code === 'IDENTITY_MISMATCH') { p.profile = undefined; p.detailLoading = false; p.state = 'choose'; p.candidates = []; this.saveChoice(p) }; this.emit() } }
      finally { if (!signal.aborted && p.profile?.id === expected) { p.detailLoading = false; this.emit() } }
    })
  }
}
