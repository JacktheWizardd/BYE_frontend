import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
for (const path of ['public/index.html', 'public/404.html', 'public/demo/index.html', 'public/app/index.html', 'public/reviews/index.html']) {
  assert.match(await readFile(path, 'utf8'), /name="robots" content="noindex/)
}
// Downloads are open: /download goes to the newest Mac DMG, and that DMG must exist.
const dmg = (await readFile('public/_redirects', 'utf8')).match(/^\/download \/downloads\/(BYE-[\w.-]+-AppleSilicon\.dmg) 302$/m)?.[1]
assert.ok(dmg, '/download must redirect to a DMG in /downloads/'); await readFile('public/downloads/' + dmg)
// Windows: /download/windows goes to an installer on the public BYE-releases repository.
assert.match(await readFile('public/_redirects', 'utf8'), /^\/download\/windows https:\/\/github\.com\/JacktheWizardd\/BYE-releases\/releases\/download\/[\w.-]+\/BYE-Setup-[\w.-]+-windows-x64\.exe 302$/m)
// Site-wide CSP: same-origin scripts and connections only (a script here could read a student's email
// from /api/reviews/session), and no framing. /reviews/ may add only the Turnstile host.
// Git may check _headers out with CRLF on Windows; compare rules, not line endings.
const headerRules = (await readFile('public/_headers', 'utf8')).replace(/\r\n/g, '\n').split(/\n(?=\S)/)
const csp = path => headerRules.find(rule => rule.startsWith(path + '\n'))?.match(/^\s+Content-Security-Policy: (.+)$/m)?.[1] ?? ''
for (const [path, script] of [['/*', "script-src 'self';"], ['/reviews/*', "script-src 'self' https://challenges.cloudflare.com;"]]) {
  for (const part of [script, "connect-src 'self';", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'none'"]) assert.ok(csp(path).includes(part), `${path} CSP must include ${part}`)
}
const routes = JSON.parse(await readFile('public/_routes.json', 'utf8'))
// The availability middleware must cover pages, assets, downloads and API routes.
assert.deepEqual(routes.include, ['/*'])
assert.deepEqual(routes.exclude, [])
const landing = await readFile('public/index.html', 'utf8')
// Web use stays on the labeled sample-data demo; the live /app/ is paused. Reviews are linked.
assert.match(landing, /href="\/demo\/"/); assert.match(landing, /Sample data for now/); assert.match(landing, /href="\/reviews\/"/); assert.doesNotMatch(landing, /href="\/app\/"/)
// The prerendered home page loads only its own hashed assets from /site/.
assert.match(landing, /href="\/download"/); assert.match(landing, /href="mailto:byebeforeyouenroll@gmail\.com/); assert.doesNotMatch(landing, /REPLACE WITH/)
// The Kit email signup was removed (2026-10-22): no form may post off-site.
assert.doesNotMatch(landing, /app\.kit\.com|id="updates"/); assert.ok(csp('/*').includes("form-action 'self'") && !csp('/*').includes('app.kit.com'), 'Site CSP forms must stay same-origin')
for (const [, src] of landing.matchAll(/(?:src|href)="(\/site\/[^"]+)"/g)) await readFile('public' + src)
for (const path of ['public/updates/appcast.xml', 'public/downloads/BYE-0.4.0-beta.1-AppleSilicon.dmg']) await readFile(path)
const liveFiles = await readdir('public/app/assets')
for (const path of liveFiles.filter(x => x.endsWith('.js'))) {
  const js = await readFile('public/app/assets/' + path, 'utf8')
  for (const fictionalName of ['Lena Whitcombe', 'Marisol Quintero-Hale', 'Calvin Ostrowski']) assert.ok(!js.includes(fictionalName), `Live build contains fictional data: ${path}`)
}
console.log('Static routes, noindex, release paths and live/demo separation passed.')

for (const dir of ['public/reviews/assets','public/app/assets']) {
const reviewFiles = await readdir(dir)
for (const path of reviewFiles.filter(x => x.endsWith('.js'))) {
  const js = await readFile(dir + '/' + path, 'utf8')
  for (const forbidden of ['sb_secret_', 'sb_publishable_', 'SupabaseClient', 'fixture-refresh-must-not-reach-browser']) assert.ok(!js.includes(forbidden), `Review browser asset contains server/test material: ${path}`)
}
}
console.log('Review and app browser assets contain no Supabase client, API keys or fixture tokens.')

// Windows "Check for updates" reads /windows/latest.json: a version and a download link that stays on this website.
const latest = JSON.parse(await readFile('public/windows/latest.json', 'utf8'))
assert.match(latest.version, /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?$/, 'Windows latest.json needs a version like 0.4.0-beta.1')
assert.ok(latest.downloadUrl.startsWith('https://bye-before-you-enroll.pages.dev/'), 'Windows downloadUrl must stay on the BYE website')
assert.ok(headerRules.some(rule => rule.startsWith('/windows/latest.json\n') && /max-age=300/.test(rule)), 'Windows latest.json must be cached for at most 5 minutes')
console.log('Windows update file passed.')
