import { resolveCatalog, byeProfile, byePage, selection } from './bye-reviews'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { identitySecret, normalizeEmail, schoolEmail, mailboxDigest, keyedDigest, randomCode, randomToken, tokenDigest } from './review-identity'
import { postgresReviewStore, validReviewDatabaseUrl, type ReviewStore, type StoreResult } from './review-store'
import { REVIEW_COMMENT_LIMIT, TEST_REVIEW_PREFIX, type ReviewInput } from '../packages/core/reviews'

export interface ReviewEnv {
  REVIEWS_ENABLED?: string
  REVIEW_IDENTITY_SECRET?: string
  REVIEW_DATABASE_URL?: string
  BREVO_API_KEY?: string
  REVIEW_SENDER_EMAIL?: string
  REVIEW_TEST_EMAIL?: string
  /** 'students' opens sign-in to any @go.pasadena.edu address; anything else keeps the single-tester mode. */
  REVIEW_ACCESS?: string
  SUPABASE_URL?: string
  SUPABASE_PUBLISHABLE_KEY?: string
  /** Optional Cloudflare Turnstile bot check on code requests. Off unless both keys are set. */
  TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET_KEY?: string
  /** Development only; ignored unless the request is loopback HTTP. */
  REVIEW_LOCAL_HTTP?: string
}
export class ReviewError extends Error {
  constructor(readonly status: number, readonly code: string, message: string, readonly retryAfter?: number) { super(message) }
}
const commonHeaders = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', Vary: 'Cookie' }
const reply = (data: unknown, cookies: string[] = []) => {
  const headers = new Headers(commonHeaders)
  for (const value of cookies) headers.append('Set-Cookie', value)
  return Response.json({ data }, { headers })
}
const invalid = (message: string) => new ReviewError(400, 'INVALID_INPUT', message)
const sessionError = () => new ReviewError(401, 'SESSION_EXPIRED', 'Verify your school email again. Your open review is still here.')

/** Course codes rank before title matches. PCC pads course numbers ("MATH 005A"), so "math 5a", "math5a"
 *  and "MATH 005A" all become the code prefix "MATH 005A%"; "math" becomes "MATH%" and "5a" becomes "% 005A%".
 *  Anything else (e.g. "engl c1001") is used as a plain code prefix. Input is already limited to letters,
 *  numbers, spaces and .'- so it can't carry LIKE wildcards. */
export function courseSearchPattern(q: string): string | null {
  const text = q.trim().toUpperCase().replace(/\s+/g, ' ')
  if (!text) return null
  const m = text.match(/^([A-Z]+)? ?(\d+)?([A-Z]*)$/)
  if (!m || (!m[1] && !m[2])) return text + '%'
  const [, subject = '', digits = '', suffix = ''] = m
  if (!digits) return subject + suffix + '%'
  const number = digits.padStart(3, '0') + suffix
  return subject ? `${subject} ${number}%` : `% ${number}%`
}
/** Code matches first, then title matches, without duplicates. */
export function mergeCourseRows<T extends { id: string | number }>(byCode: T[], byTitle: T[], limit = 20): T[] {
  const seen = new Set<string>()
  return [...byCode, ...byTitle].filter(row => { const key = String(row.id); if (seen.has(key)) return false; seen.add(key); return true }).slice(0, limit)
}

function settings(env: ReviewEnv) {
  if (env.REVIEWS_ENABLED !== 'true') return null
  const open = env.REVIEW_ACCESS === 'students', email = normalizeEmail(env.REVIEW_TEST_EMAIL)
  if (!open && !schoolEmail(email)) return null
  const identityKey = identitySecret(env.REVIEW_IDENTITY_SECRET)
  if (!identityKey || !validReviewDatabaseUrl(env.REVIEW_DATABASE_URL) || !env.BREVO_API_KEY?.trim() || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(env.REVIEW_SENDER_EMAIL ?? '')) return null
  const privateSettings = { identityKey, databaseUrl:env.REVIEW_DATABASE_URL, brevoKey:env.BREVO_API_KEY.trim(), sender:env.REVIEW_SENDER_EMAIL! }
  try {
    const url = new URL(env.SUPABASE_URL ?? '')
    if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) return null
    const key = env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? ''
    const site = env.TURNSTILE_SITE_KEY?.trim() ?? '', secret = env.TURNSTILE_SECRET_KEY?.trim() ?? ''
    const turnstile = site && secret ? { site, secret } : undefined
    // Never accidentally run this app using a privileged key, including legacy JWT keys.
    if (key.startsWith('sb_publishable_') && key.length > 16) return { email, open, url: url.origin, key, turnstile, ...privateSettings }
    const payload = JSON.parse(atob(key.split('.')[1]?.replaceAll('-', '+').replaceAll('_', '/') ?? ''))
    if (payload.role === 'anon') return { email, open, url: url.origin, key, turnstile, ...privateSettings }
  } catch { /* Fail closed; never expose configuration values in responses or logs. */ }
  return null
}
function cookieOptions(request: Request, env: ReviewEnv) {
  const url = new URL(request.url)
  const local = env.REVIEW_LOCAL_HTTP === 'true' && url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  return { name: local ? 'bye-review-local' : '__Secure-bye-review', flags: `Path=/api/reviews/; HttpOnly; SameSite=Strict${local ? '' : '; Secure'}` }
}
function readToken(request: Request, env: ReviewEnv, challenge = false) {
  const { name: base } = cookieOptions(request, env)
  const name = base + (challenge ? '-challenge' : '')
  const cookies = (request.headers.get('Cookie') ?? '').split(';').map(s => s.trim()).filter(s => s.startsWith(name + '='))
  if (cookies.length !== 1) return undefined
  const token = cookies[0].slice(name.length + 1)
  return /^[0-9a-f]{64}$/.test(token) ? token : undefined
}
function cookie(request: Request, env: ReviewEnv, token: string, ttl: number, challenge = false) {
  const { name, flags } = cookieOptions(request, env)
  return `${name}${challenge ? '-challenge' : ''}=${token}; ${flags}; Max-Age=${Math.max(0, Math.floor(ttl))}`
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
  if (/^[^@]*\+[^@]*@go\.pasadena\.edu$/.test(email)) throw new ReviewError(403, 'PCC_EMAIL_ALIAS', 'Use your school email without a + tag, like you@go.pasadena.edu.')
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
function client(config: NonNullable<ReturnType<typeof settings>>, outbound: typeof fetch): SupabaseClient {
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    db: { retry: false },
    global: {
      fetch: async (url, init) => {
        const response = await outbound(url, { ...init, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(15_000) })
        if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new Error('Unexpected Supabase redirect') }
        return response
      },
    },
  })
}
function checked(result: StoreResult): StoreResult {
  if (result.ok) return result
  const errors: Record<string, [number,string]> = {
    REVIEWS_DISABLED:[503,'Reviews are not open yet.'],
    RATE_LIMITED:[429,'Too many attempts. Please wait and try again.'],
    INVALID_CODE:[400,'That code is incorrect or has expired. Try again or request a new code.'],
    ACCOUNT_RESTRICTED:[403,'This account cannot submit reviews or reports.'],
    SESSION_EXPIRED:[401,'Verify your school email again. Your open review is still here.'],
    DUPLICATE_REVIEW:[409,'You already reviewed this professor for this course.'],
    DUPLICATE_REPORT:[409,'You already reported this review.'],
    REVIEW_UNAVAILABLE:[404,'This review is no longer available.'],
    INVALID_INPUT:[400,'Check your professor, course, ratings and question answers, then try again.'],
  }
  const entry = errors[result.code ?? '']
  if (!entry) throw new Error('Review operation failed')
  throw new ReviewError(entry[0], result.code!, entry[1], result.retryAfter)
}
/** Cloudflare Turnstile server check. The token is single-use and bound to this site and action. */
async function botCheck(secret: string, token: unknown, request: Request, outbound: typeof fetch) {
  if (typeof token !== 'string' || !token || token.length > 2048) throw new ReviewError(403, 'BOT_CHECK_REQUIRED', 'Complete the quick check above, then send the code again.')
  const form = new FormData()
  form.set('secret', secret); form.set('response', token)
  const ip = request.headers.get('CF-Connecting-IP'); if (ip) form.set('remoteip', ip)
  let result: { success?: boolean; hostname?: string; action?: string }
  try {
    const response = await outbound('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(10_000) })
    if (!response.ok) { await response.body?.cancel(); throw new Error() }
    result = await response.json()
  } catch { throw new ReviewError(503, 'BOT_CHECK_UNAVAILABLE', 'The quick check could not be confirmed. Please try again shortly.') }
  if (result.success !== true || result.hostname !== new URL(request.url).hostname || result.action !== 'send-code') throw new ReviewError(403, 'BOT_CHECK_FAILED', 'The quick check did not pass. Complete it again, then send the code.')
}
/** Request-scoped clients prevent one visitor's credentials from reaching another. */
export async function handleReviewRequest(request: Request, env: ReviewEnv, outbound: typeof fetch = fetch, injectedStore?: ReviewStore): Promise<Response> {
  let saveAttempted = false
  try {
    const url = new URL(request.url), route = url.pathname.slice('/api/reviews/'.length)
    const methods: Record<string,string> = { status:'GET', session:'GET', dimensions:'GET', courses:'GET', professors:'GET', 'auth/send':'POST', 'auth/verify':'POST', 'auth/signout':'POST', submit:'POST', resolve:'GET', profile:'GET', list:'GET', selection:'GET', report:'POST' }
    if (!methods[route]) throw new ReviewError(404, 'NOT_FOUND', 'This review endpoint does not exist.')
    if (request.method !== methods[route]) return Response.json({ error: { code:'METHOD_NOT_ALLOWED', message:'Method not allowed.', retryable:false } }, { status:405, headers:{ ...commonHeaders, Allow:methods[route] } })
    if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) throw new ReviewError(403, 'ORIGIN_DENIED', 'Open the review form on this website before continuing.')
    if (url.protocol !== 'https:' && !(env.REVIEW_LOCAL_HTTP === 'true' && url.protocol === 'http:' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname))) throw new ReviewError(400, 'HTTPS_REQUIRED', 'Use the secure BYE website to verify your email.')
    const config = settings(env)
    if (route === 'status') return reply({ enabled: !!config, ownerTest: !config?.open, ...(config?.turnstile ? { turnstileSiteKey: config.turnstile.site } : {}) })
    if (!config) throw new ReviewError(503, 'REVIEWS_DISABLED', 'Reviews are not open yet.')
    const transport = injectedStore ?? postgresReviewStore(config.databaseUrl)
    const fingerprint = await keyedDigest(config.identityKey,'key-check','v1')
    const store: ReviewStore = { call:(op,args) => transport.call(op,{...args,keyFingerprint:fingerprint}) }
    const address = request.headers.get('CF-Connecting-IP')
    if (address && ['auth/send','auth/verify','submit','report'].includes(route)) checked(await store.call('rate', { route, subject:await keyedDigest(config.identityKey,'ip',address) }))
    if (route === 'auth/signout') {
      await jsonBody(request)
      const token = readToken(request,env), challenge = readToken(request,env,true)
      checked(await store.call('signout', { session:token ? await tokenDigest(token) : null, challenge:challenge ? await tokenDigest(challenge) : null }))
      return reply({ signedIn:false }, [cookie(request,env,'',0),cookie(request,env,'',0,true)])
    }
    if (route === 'auth/send' || route === 'auth/verify') {
      const body = await jsonBody(request), email = emailInput(body,config)
      if (Object.keys(body).some(k => !['email', ...(route === 'auth/send' ? ['turnstileToken'] : ['code'])].includes(k))) throw invalid('The form contains unsupported fields.')
      if (route === 'auth/send' && config.turnstile) await botCheck(config.turnstile.secret,body.turnstileToken,request,outbound)
      const mailbox = await mailboxDigest(config.identityKey,email)
      if (route === 'auth/send') {
        const challenge = randomToken(), digest = await tokenDigest(challenge), code = randomCode()
        checked(await store.call('begin', { mailbox, challenge:digest, code:await keyedDigest(config.identityKey,'code',`${digest}:${code}`) }))
        try {
          const response = await outbound('https://api.brevo.com/v3/smtp/email', { method:'POST', headers:{'Content-Type':'application/json','api-key':config.brevoKey}, body:JSON.stringify({ sender:{name:'BYE',email:config.sender}, to:[{email}], subject:'Your BYE verification code', textContent:`Your BYE verification code is ${code}. It expires in 10 minutes. If you did not request this code, ignore this email.`, headers:{'X-Mailin-Track-Open':'0','X-Mailin-Track-Click':'0'} }), redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(10_000) })
          if (!response.ok) { await response.body?.cancel(); throw new Error('Delivery failed') }
          await response.body?.cancel()
        } catch {
          await store.call('cancel',{challenge:digest}).catch(() => {})
          throw new ReviewError(503,'EMAIL_UNAVAILABLE','Email verification is unavailable. Please try again later.')
        }
        return reply({ sent:true,retryAfter:60 }, [cookie(request,env,challenge,600,true)])
      }
      if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code.trim())) throw invalid('Enter the complete six-digit code from your email.')
      const challenge = readToken(request,env,true)
      const digest = challenge ? await tokenDigest(challenge) : '0'.repeat(64)
      const session = randomToken()
      checked(await store.call('verify',{mailbox,challenge:digest,code:await keyedDigest(config.identityKey,'code',`${digest}:${body.code.trim()}`),session:await tokenDigest(session)}))
      return reply({signedIn:true},[cookie(request,env,session,3600),cookie(request,env,'',0,true)])
    }
    if (['resolve','profile','list'].includes(route)) {
      const db=client(config,outbound)
      return reply(await (route==='resolve'?resolveCatalog(db,url.searchParams):route==='profile'?byeProfile(db,url.searchParams):byePage(db,url.searchParams)))
    }
    const token = readToken(request, env)
    if (!token) { if (route === 'session') return reply({ signedIn:false }); throw sessionError() }
    const session = await tokenDigest(token)
    checked(await store.call('session',{session}))
    const supabase = client(config,outbound)
    if (route === 'session') return reply({signedIn:true})
    if (route === 'selection') return reply(await selection(supabase,url.searchParams))
    if (route === 'report') {
      const body=await jsonBody(request)
      if(Object.keys(body).some(k=>!['reviewId','reason'].includes(k)) || typeof body.reviewId!=='string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.reviewId) || typeof body.reason!=='string' || !body.reason.trim() || Array.from(body.reason.trim()).length>500)throw invalid('Choose a review and give a reason of 1 to 500 characters.')
      checked(await store.call('report',{session,reviewId:body.reviewId,reason:body.reason.trim()}))
      return reply({reported:true})
    }
    if (route === 'submit') {
      const form = validateReview(await jsonBody(request))
      saveAttempted = true
      const result = checked(await store.call('submit',{session,...form,body:(config.open ? '' : TEST_REVIEW_PREFIX)+form.body}))
      if (!result.id || !/^[0-9a-f-]{36}$/.test(result.id)) throw new Error('Unconfirmed save')
      return reply({id:result.id})
    }
    if (route === 'dimensions') {
      const { data, error } = await supabase.from('dimensions').select('name,low_label,high_label,sort_order').order('sort_order')
      if (error || !data?.length) throw new ReviewError(503, 'CATALOG_UNAVAILABLE', 'Review questions could not be loaded. Try again shortly.')
      return reply(data)
    }
    const q = (url.searchParams.get('q') ?? '').trim().replace(/\s+/g,' ')
    if (q.length < 2 || q.length > 80 || !/^[\p{L}\p{N} .'-]+$/u.test(q)) throw invalid('Search with 2 to 80 letters or numbers.')
    if (route === 'courses') {
      // Two small queries so a title like "MATHEMATICS" (ABE 3002) can't crowd out the MATH courses.
      const pattern = courseSearchPattern(q)
      const [byCode, byTitle] = await Promise.all([
        // Code prefix (handles PCC's zero padding) or anywhere in the code (e.g. "c1001" finds ENGL C1001).
        supabase.from('courses').select('id,code,title').or(`code.ilike.${pattern ?? q},code.ilike.%${q}%`).order('code').limit(20),
        supabase.from('courses').select('id,code,title').ilike('title', `%${q}%`).order('code').limit(20),
      ])
      if (byCode.error || byTitle.error) throw new ReviewError(503, 'CATALOG_UNAVAILABLE', 'Courses could not be loaded. Try again shortly.')
      return reply(mergeCourseRows(byCode.data ?? [], byTitle.data ?? []).map(row => ({ ...row, id:String(row.id) })))
    }
    let query = supabase.from('professors').select('id,first_name,last_name')
    for (const part of q.split(' ')) query = query.or(`first_name.ilike.%${part}%,last_name.ilike.%${part}%`)
    const { data, error } = await query.order('last_name').order('first_name').order('id').limit(20)
    if (error) throw new ReviewError(503, 'CATALOG_UNAVAILABLE', 'Professors could not be loaded. Try again shortly.')
    return reply((data ?? []).map(row => ({ ...row, id:String(row.id) })))
  } catch (error) {
    const known = error instanceof ReviewError ? error : saveAttempted ? new ReviewError(503, 'SAVE_UNCONFIRMED', 'We could not confirm the save. Do not submit again yet; check back shortly before retrying.') : new ReviewError(503, 'SERVICE_UNAVAILABLE', 'BYE could not complete this request. Please try again shortly.')
    // Do not log upstream errors: auth errors may contain addresses or tokens.
    return Response.json({ error:{ code:known.code, message:known.message, retryable:known.status >= 500 || known.status === 429, ...(known.retryAfter ? { retryAfter:known.retryAfter } : {}) } }, { status:known.status, headers:{ ...commonHeaders, ...(known.retryAfter ? { 'Retry-After':String(known.retryAfter) } : {}) } })
  }
}
