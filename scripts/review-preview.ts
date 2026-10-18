/** Visual preview of the built review page with fictional fixtures: the real review API handler,
 *  a fake Supabase transport, no email and no database. Sign in with the fixture tester address
 *  (tests/review-fixtures.ts) and code 123456. Set REVIEW_PREVIEW_MODE=students for the open-beta copy. */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'
import { handleReviewRequest } from '../server/reviews'
import { reviewFixture, TEST_EMAIL } from '../tests/review-fixtures'

const fixture = reviewFixture()
if (process.env.REVIEW_PREVIEW_MODE === 'students') fixture.env.REVIEW_ACCESS = 'students'
const root = resolve('public'), port = Number(process.env.PORT ?? 8791)
const types: Record<string, string> = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.png': 'image/png', '.txt': 'text/plain' }

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://' + req.headers.host)
    if (url.pathname.startsWith('/api/reviews/')) {
      const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk))
      const request = new Request(url, { method: req.method, headers: Object.fromEntries(Object.entries(req.headers).filter(([, v]) => typeof v === 'string')) as Record<string, string>, ...(['POST', 'PUT', 'PATCH'].includes(req.method ?? '') ? { body: Buffer.concat(chunks) } : {}) })
      const response = await handleReviewRequest(request, fixture.env, fixture.outbound)
      res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(await response.text()); return
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname) + (url.pathname.endsWith('/') ? 'index.html' : ''))
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return }
    const data = await readFile(file)
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream'); res.setHeader('Cache-Control', 'no-store'); res.end(data)
  } catch { res.writeHead(404); res.end() }
}).listen(port, '127.0.0.1', () => console.log(`Review preview (fixtures only) at http://127.0.0.1:${port}/reviews/ · sign in as ${TEST_EMAIL}, code 123456`))
