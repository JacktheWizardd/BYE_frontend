import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
for (const path of ['public/index.html', 'public/404.html', 'public/demo/index.html', 'public/app/index.html', 'public/reviews/index.html']) {
  assert.match(await readFile(path, 'utf8'), /name="robots" content="noindex/)
}
assert.match(await readFile('public/_redirects', 'utf8'), /^\/download \/downloads\/BYE-0\.4\.0-beta\.1-AppleSilicon\.dmg 302/m)
const routes = JSON.parse(await readFile('public/_routes.json', 'utf8'))
assert.deepEqual(routes.include, ['/api/v1/*', '/api/reviews/*'])
const landing = await readFile('public/index.html', 'utf8')
// Web use stays on the labeled sample-data demo; the live /app/ is paused. Reviews are linked.
assert.match(landing, /href="\/demo\/"/); assert.match(landing, /Sample data for now/); assert.match(landing, /href="\/reviews\/"/); assert.doesNotMatch(landing, /href="\/app\/"/)
// The prerendered home page loads only its own hashed assets from /site/.
assert.match(landing, /href="\/download"/); assert.doesNotMatch(landing, /REPLACE WITH/)
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
