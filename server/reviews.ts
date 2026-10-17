import { resolveCatalog, byeProfile, byePage, selection } from './bye-reviews'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { REVIEW_COMMENT_LIMIT, TEST_REVIEW_PREFIX, type ReviewInput } from '../packages/core/reviews'

export interface ReviewEnv {
  REVIEWS_ENABLED?: string
  REVIEW_TEST_EMAIL?: string
  /** 'students' opens sign-in to any @go.pasadena.edu address; anything else keeps the single-tester mode. */
  REVIEW_ACCESS?: string
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
  /** Development only; ignored unless the request is loopback HTTP. */
  REVIEW_LOCAL_HTTP?: string
}
export class ReviewError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly retryAfter?: number) { super(message) }
}
const commonHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' }
const reply = (data: unknown, cookie?: string) => Response.json({ data }, { headers: { ...commonHeaders, ...(cookie ? { 'Set-Cookie': cookie } : {}) } })
const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : ''
const schoolEmail = (value: string) => /^[a-z0-9.!#$&'*+/=?^_`{|}~-]+@go\.pasadena\.edu$/.test(value) && value.length <= 254
const invalid = (message: string) => new ReviewError(400, 'INVALID_INPUT', message)
const sessionError = () => new ReviewError(401, 'SESSION_EXPIRED', 'Verify your school email again. Your open review is still here.')

function settings(env: ReviewEnv) {
  if (env.REVIEWS_ENABLED !== 'true') return null
  const open = env.REVIEW_ACCESS === 'students', email = normalizeEmail(env.REVIEW_TEST_EMAIL)
  if (!open && !schoolEmail(email)) return null
  try {
    const url = new URL(env.SUPABASE_URL ?? '')
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return null
    const key = env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
    // Never accidentally run this app using a privileged key, including legacy JWT keys.
    if (key.startsWith('sb_publishable_') && key.length > 16) return { email, open, url: url.origin, key }
    const payload = JSON.parse(atob(key.split('.')[1]?.replaceAll('-', '+').replaceAll('_', '/') ?? ''))
    if (payload.role === 'anon') return { email, open, url: url.origin, key }
  } catch { /* Fail closed; never expose configuration values in responses or logs. */ }
  return null
}
function cookieOptions(request: Request, env: ReviewEnv) {
  const url = new URL(request.url)
  const local = env.REVIEW_LOCAL_HTTP === 'true' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  return { name: local ? 'bye-review-local' : '__Secure-bye-review', flags: `Path=/api/reviews/; HttpOnly; SameSite=Strict${local ? '' : '; Secure'}` }
}
function readToken(request: Request, env: ReviewEnv) {
  const { name } = cookieOptions(request, env)
  const cookies = (request.headers.get('Cookie') ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='))
  if (cookies.length !== 1) return undefined
  const token = cookies[0].slice(name.length + 1)
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token) && token.length < 3800 ? token : undefined
}
function cookie(request: Request, env: ReviewEnv, token: string, ttl: number) {
  const { name, flags } = cookieOptions(request, env)
  return `${name}=${token}; ${flags}; Max-Age=${Math.max(0, Math.floor(ttl))}`
}
async function jsonBody(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() !== 'application/json') throw new ReviewError(415, 'INVALID_CONTENT_TYPE', 'Send this form as JSON.')
  const reader = request.body?.getReader()
  if (!reader) throw invalid('The form is empty.')
  const chunks: Uint8Array[] = []; let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > 16384) { await reader.cancel(); throw new ReviewError(413, 'FORM_TOO_LARGE', 'The form is too large.') }
      chunks.push(part.value)
    }
  } finally { reader.releaseLock() }
  const all = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.byteLength }
  try {
    const value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(all))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch { throw invalid('The form could not be read. Please try again.') }
}
type Access = { email: string; open: boolean }
function emailInput(body: Record<string, unknown>, access: Access) {
  const email = normalizeEmail(body.email)
  if (!schoolEmail(email)) throw new ReviewError(403, 'PCC_EMAIL_REQUIRED', 'Use your @go.pasadena.edu school email.')
  if (!access.open && email !== access.email) throw new ReviewError(403, 'OWNER_TEST_ONLY', 'This private test is available only to the configured tester.')
  return email
}
export function validateReview(body: Record<string, unknown>): ReviewInput {
  if (Object.keys(body).some(key => !['professorId','courseId','quality','difficulty','body','answers'].includes(key))) throw invalid('The review contains unsupported fields.')
  const id = (value: unknown) => {
    if (typeof value !== 'string' || !/^[1-9]\d{0,18}$/.test(value) || BigInt(value) > 9223372036854775807n) throw invalid('Choose a professor and course from the lists.')
    return value
  }
  const rating = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) throw invalid('Quality and difficulty must each be 1 to 5.')
    return value
  }
  if (body.body !== undefined && typeof body.body !== 'string') throw invalid('The comment must be text.')
  const text = typeof body.body === 'string' ? body.body.trim() : ''
  if (Array.from(text).length > REVIEW_COMMENT_LIMIT) throw invalid(`Keep your comment to ${REVIEW_COMMENT_LIMIT} characters.`)
  const answers = body.answers ?? {}
  if (typeof answers !== 'object' || answers === null || Array.isArray(answers) || Object.keys(answers).length > 32) throw invalid('Choose valid question answers.')
  for (const [name,value] of Object.entries(answers)) if (!/^[a-z][a-z_]{0,63}$/.test(name) || ![-1,0,1].includes(value as number) || typeof value !== 'number') throw invalid('Choose valid question answers.')
  return { professorId: id(body.professorId), courseId: id(body.courseId), quality: rating(body.quality), difficulty: rating(body.difficulty), body: text, answers: answers as ReviewInput['answers'] }
}
function client(config: NonNullable<ReturnType<typeof settings>>, outbound: typeof fetch, token?: string): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { retry: false },
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      fetch: async (url, init) => {
        const response = await outbound(url, { ...init, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15_000) })
        if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new Error('Unexpected Supabase redirect') }
        return response
      },
    },
  })
}
function eligible(user: User | null, access: Access) {
  const email = normalizeEmail(user?.email)
  return !!user && !!user.email_confirmed_at && schoolEmail(email) && (access.open || email === access.email)
}
// Per-isolate abuse brake in front of Supabase's own limits; keyed by client address, never stored.
const buckets = new Map<string, { count: number; until: number }>()
const LIMITS: Record<string, { max: number; windowMs: number }> = { 'auth/send': { max: 5, windowMs: 10 * 60_000 }, 'auth/verify': { max: 20, windowMs: 10 * 60_000 }, submit: { max: 10, windowMs: 60 * 60_000 }, report: { max: 20, windowMs: 60 * 60_000 } }
export function rateLimit(route: string, client: string, now = Date.now()) {
  const rule = LIMITS[route]
  if (!rule) return
  if (buckets.size > 5000) for (const [k, b] of buckets) if (b.until <= now) buckets.delete(k)
  const key = route + '|' + client, old = buckets.get(key), bucket = old && old.until > now ? old : { count: 0, until: now + rule.windowMs }
  if (++bucket.count > rule.max) throw new ReviewError(429, 'RATE_LIMITED', 'Too many attempts. Please wait and try again.', Math.max(1, Math.ceil((bucket.until - now) / 1000)))
  buckets.set(key, bucket)
}
function authFailure(error: { status?: number } | null, verifying = false): never {
  if (error?.status === 429) throw new ReviewError(429, 'AUTH_RATE_LIMITED', 'Please wait before requesting or trying another code.', 60)
  if (verifying && error?.status && error.status < 500) throw new ReviewError(400, 'INVALID_CODE', 'That code is incorrect or has expired. Try again or request a new code.')
  throw new ReviewError(503, 'EMAIL_UNAVAILABLE', 'Email verification is unavailable. Please try again later.')
}

/** Request-scoped clients prevent one visitor's credentials from reaching another. */
export async function handleReviewRequest(request: Request, env: ReviewEnv, outbound: typeof fetch = fetch): Promise<Response> {
  let saveAttempted = false
  try {
    const url = new URL(request.url), route = url.pathname.slice('/api/reviews/'.length)
    const methods: Record<string,string> = { status:'GET', session:'GET', dimensions:'GET', courses:'GET', professors:'GET', 'auth/send':'POST', 'auth/verify':'POST', 'auth/signout':'POST', submit:'POST', resolve:'GET', profile:'GET', list:'GET', selection:'GET', report:'POST' }
    if (!methods[route]) throw new ReviewError(404, 'NOT_FOUND', 'This review endpoint does not exist.')
    if (request.method !== methods[route]) return Response.json({ error: { code:'METHOD_NOT_ALLOWED', message:'Method not allowed.', retryable:false } }, { status:405, headers:{ ...commonHeaders, Allow:methods[route] } })
    if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) throw new ReviewError(403, 'ORIGIN_DENIED', 'Open the review form on this website before continuing.')
    if (url.protocol !== 'https:' && !(env.REVIEW_LOCAL_HTTP === 'true' && url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new ReviewError(400, 'HTTPS_REQUIRED', 'Use the secure BYE website to verify your email.')
    const config = settings(env)
    if (route === 'status') return reply({ enabled: !!config, ownerTest: !config?.open })
    if (!config) throw new ReviewError(503, 'REVIEWS_DISABLED', 'Reviews are not open yet.')
    const address = request.headers.get('CF-Connecting-IP')
    if (address) rateLimit(route, address)
    if (route === 'auth/signout') return reply({ signedIn:false }, cookie(request, env, '', 0))
    if (route === 'auth/send' || route === 'auth/verify') {
      const body = await jsonBody(request), email = emailInput(body, config), supabase = client(config, outbound)
      if (route === 'auth/send') {
        const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser:true } })
        if (error) authFailure(error)
        return reply({ sent:true, retryAfter:60 })
      }
      if (typeof body.code !== 'string' || !/^\d{6,10}$/.test(body.code.trim())) throw invalid('Enter the complete numeric code from your email.')
      const { data, error } = await supabase.auth.verifyOtp({ email, token:body.code.trim(), type:'email' })
      if (error || !data.session) authFailure(error, true)
      const session = data.session!
      if (!eligible(session.user, config) || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(session.access_token) || session.access_token.length >= 3800) throw sessionError()
      const ttl = Math.min(session.expires_in, (session.expires_at ?? 0) - Math.floor(Date.now()/1000))
      if (!Number.isFinite(ttl) || ttl <= 0) throw sessionError()
      return reply({ signedIn:true, email }, cookie(request, env, session.access_token, ttl))
    }
    if (['resolve','profile','list'].includes(route)) {
      const db=client(config,outbound)
      return reply(await (route==='resolve'?resolveCatalog(db,url.searchParams):route==='profile'?byeProfile(db,url.searchParams):byePage(db,url.searchParams)))
    }
    const token = readToken(request, env)
    if (!token) { if (route === 'session') return reply({ signedIn:false }); throw sessionError() }
    const supabase = client(config, outbound, token)
    const { data: identity, error: identityError } = await supabase.auth.getUser(token)
    if (identityError) {
      if (identityError.status === 429) throw new ReviewError(429, 'AUTH_RATE_LIMITED', 'Please wait before trying again.', 60)
      if (!identityError.status || identityError.status >= 500) throw new ReviewError(503, 'AUTH_UNAVAILABLE', 'Sign-in could not be checked. Try again shortly.')
      throw sessionError()
    }
    if (!eligible(identity.user, config)) throw sessionError()
    if (route === 'session') return reply({ signedIn:true, email:normalizeEmail(identity.user!.email) })
    if (route === 'selection') return reply(await selection(supabase,url.searchParams))
    if (route === 'report') {
      const body=await jsonBody(request)
      if(Object.keys(body).some(k=>!['reviewId','reason'].includes(k)) || typeof body.reviewId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.reviewId) || typeof body.reason!=='string' || !body.reason.trim() || Array.from(body.reason.trim()).length>500)throw invalid('Choose a review and give a reason of 1 to 500 characters.')
      const visible=await supabase.from('reviews').select('id').eq('id',body.reviewId).eq('is_hidden',false).maybeSingle()
      if(visible.error)throw new ReviewError(503,'REPORT_UNAVAILABLE','The review could not be checked. Try again shortly.')
      if(!visible.data)throw new ReviewError(404,'REVIEW_UNAVAILABLE','This review is no longer available.')
      const {error}=await supabase.from('reports').insert({review_id:body.reviewId,reason:body.reason.trim()})
      if(error?.code==='23505')throw new ReviewError(409,'DUPLICATE_REPORT','You already reported this review.')
      if(error?.code==='42501')throw new ReviewError(409,'REVIEW_UNAVAILABLE','This review is no longer available to report.')
      if(error)throw new ReviewError(503,'REPORT_UNCONFIRMED','The report could not be confirmed. Refresh reviews before trying again.')
      return reply({reported:true})
    }
    if (route === 'submit') {
      const form = validateReview(await jsonBody(request))
      saveAttempted = true
      const { data, error } = await supabase.rpc('submit_review', {
        p_professor_id:form.professorId, p_course_id:form.courseId, p_quality:form.quality, p_difficulty:form.difficulty,
        p_body:(config.open ? '' : TEST_REVIEW_PREFIX) + form.body, p_answers:form.answers,
      })
      if (error) {
        if (error.code === '23505') throw new ReviewError(409, 'DUPLICATE_REVIEW', 'You already reviewed this professor for this course.')
        if (error.code === '42501' || error.code === 'PGRST301' || error.code === 'PGRST303') throw sessionError()
        if (['22023','23503','23514','23502'].includes(error.code)) throw invalid('Check your professor, course, ratings and question answers, then try again.')
        throw new ReviewError(503, 'SAVE_UNCONFIRMED', 'We could not confirm the save. Do not submit again yet; check back shortly before retrying.')
      }
      if (typeof data !== 'string' || !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(data)) throw new ReviewError(503, 'SAVE_UNCONFIRMED', 'We could not confirm the save. Do not submit again yet; check back shortly before retrying.')
      return reply({ id:data })
    }
    if (route === 'dimensions') {
      const { data, error } = await supabase.from('dimensions').select('name,low_label,high_label,sort_order').order('sort_order')
      if (error || !data?.length) throw new ReviewError(503, 'CATALOG_UNAVAILABLE', 'Review questions could not be loaded. Try again shortly.')
      return reply(data)
    }
    const q = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g,' ')
    if (q.length < 2 || q.length > 80 || !/^[\p{L}\p{N} .'-]+$/u.test(q)) throw invalid('Search with 2 to 80 letters or numbers.')
    if (route === 'courses') {
      const { data, error } = await supabase.from('courses').select('id,code,title').or(`code.ilike.%${q}%,title.ilike.%${q}%`).order('code').limit(20)
      if (error) throw new ReviewError(503, 'CATALOG_UNAVAILABLE', 'Courses could not be loaded. Try again shortly.')
      return reply((data ?? []).map(row => ({ ...row, id:String(row.id) })))
    }
    let query = supabase.from('professors').select('id,first_name,last_name')
    for (const part of q.split(' ')) query = query.or(`first_name.ilike.%${part}%,last_name.ilike.%${part}%`)
    const { data, error } = await query.order('last_name').order('first_name').order('id').limit(20)
    if (error) throw new ReviewError(503, 'CATALOG_UNAVAILABLE', 'Professors could not be loaded. Try again shortly.')
    return reply((data ?? []).map(row => ({ ...row, id:String(row.id) })))
  } catch (error) {
    const known = error instanceof ReviewError ? error : saveAttempted ? new ReviewError(503, 'SAVE_UNCONFIRMED', 'The save could not be confirmed. Check Supabase before submitting again.') : new ReviewError(503, 'SERVICE_UNAVAILABLE', 'BYE could not complete this request. Please try again shortly.')
    // Do not log upstream errors: auth errors may contain addresses or tokens.
    return Response.json({ error:{ code:known.code, message:known.message, retryable:known.status >= 500 || known.status === 429, ...(known.retryAfter ? { retryAfter:known.retryAfter } : {}) } }, { status:known.status, headers:{ ...commonHeaders, ...(known.retryAfter ? { 'Retry-After':String(known.retryAfter) } : {}) } })
  }
}
