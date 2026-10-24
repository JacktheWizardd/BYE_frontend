// Keep desktop update delivery available while retiring the public website.
const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>BYE is unavailable</title>
<style>body{font-family:system-ui,sans-serif;line-height:1.6;margin:0;padding:2rem}main{max-width:40rem;margin:10vh auto}h1{line-height:1.2;overflow-wrap:anywhere}</style>
</head><body><main><h1>BYE is unavailable</h1>
<p>The website, web app and new downloads are currently unavailable.</p>
</main></body></html>`

export const onRequest: PagesFunction = async context => {
  const { pathname } = new URL(context.request.url)
  const method = context.request.method
  // Native apps depend on these exact URLs. Do not intercept signed releases.
  if ((method === 'GET' || method === 'HEAD') &&
      (pathname.startsWith('/updates/') || pathname === '/windows/latest.json')) {
    return context.next()
  }
  const headers = {
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"
  }
  if (pathname === '/api' || pathname.startsWith('/api/')) {
    const body = JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'BYE is unavailable.', retryable: false } })
    return new Response(method === 'HEAD' ? null : body, {
      status: 503, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
    })
  }
  return new Response(method === 'HEAD' ? null : page, {
    status: 503, headers: { ...headers, 'Content-Type': 'text/html; charset=utf-8' }
  })
}
