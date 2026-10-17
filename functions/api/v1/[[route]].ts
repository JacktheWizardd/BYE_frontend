import { errorResponse, unavailable } from '../../../server/service'
interface Env { SOURCES: DurableObjectNamespace; LIVE_APP_ENABLED?: string }
export const onRequest: PagesFunction<Env> = async context => {
  const url = new URL(context.request.url), kind = url.pathname.slice('/api/v1/'.length)
  const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' }
  if (context.request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { ...headers, Allow: 'GET' } })
  if (!['status', 'terms', 'courses', 'sections', 'candidates', 'profile', 'reviews'].includes(kind)) return new Response('Not found', { status: 404, headers })
  if (kind !== 'status' && context.env.LIVE_APP_ENABLED !== 'true') return errorResponse(unavailable())
  if (!context.env.SOURCES) return Response.json(kind === 'status' ? { enabled: false, rmpConfigured: false } : { error: { code: 'NOT_CONFIGURED', message: 'The live beta is not configured yet.', retryable: true } }, { status: kind === 'status' ? 200 : 503, headers })
  const ip = context.request.headers.get('CF-Connecting-IP') ?? 'local'
  // Daily rotating digest: never forward or log raw IPs to the source service.
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(new Date().toISOString().slice(0, 10) + ':' + ip))
  const client = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('')
  const request = new Request('https://sources.internal/' + kind + url.search, { headers: { 'X-BYE-Client': client } })
  try {
    const response = await context.env.SOURCES.get(context.env.SOURCES.idFromName('pcc')).fetch(request)
    const output = new Response(response.body, response)
    for (const [key, value] of Object.entries(headers)) output.headers.set(key, value)
    if (kind === 'status' && context.env.LIVE_APP_ENABLED !== 'true') return Response.json({ enabled: false, rmpConfigured: false }, { headers })
    return output
  } catch { return errorResponse(new Error('Source service unavailable')) }
}
