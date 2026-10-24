import release from '../retirement-release.json'
import { retirementPage } from './retirement-page'

const headers = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'" }
const holdingAssets = new Set(['/offline.css', '/favicon.png', '/apple-touch-icon.png', '/fonts/schibsted-grotesk-latin-400-normal.woff2', '/fonts/schibsted-grotesk-latin-600-normal.woff2', '/fonts/LibreBaskerville-Bold.ttf'])
export async function availability(request: Request, next: () => Promise<Response>, windowsReady = release.windowsReady): Promise<Response> {
  const url = new URL(request.url), path = url.pathname, read = request.method === 'GET' || request.method === 'HEAD'
  // Keep the installed Mac apps' exact feed and signed archive delivery available.
  if (read && !url.search && (/^\/updates\/(?:appcast\.xml|BYE-[0-9A-Za-z.-]+-AppleSilicon\.zip(?:\.sha256)?)$/.test(path) || holdingAssets.has(path))) return next()
  if (read && !url.search && windowsReady && path === '/windows/latest.json') {
    return new Response(request.method === 'HEAD' ? null : JSON.stringify({ version: release.version, downloadUrl: release.windowsDownloadUrl }), { headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } })
  }
  if (read && !url.search && windowsReady && path === '/download/windows/retirement') return new Response(null, { status: 302, headers: { ...headers, Location: release.windowsArtifactUrl } })
  const api = path === '/api' || path.startsWith('/api/')
  const body = api ? JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'BYE has shut down.', retryable: false } }) : retirementPage
  return new Response(request.method === 'HEAD' ? null : body, { status: 503, headers: { ...headers, 'Content-Type': api ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8' } })
}
