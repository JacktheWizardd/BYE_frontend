import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
for (const path of ['public/index.html', 'public/404.html', 'public/demo/index.html', 'public/app/index.html', 'public/reviews/index.html']) {
  assert.match(await readFile(path, 'utf8'), /name="robots" content="noindex/)
}
assert.match(await readFile('public/_redirects', 'utf8'), /^\/download \/downloads\/BYE-0\.4\.0-beta\.1-AppleSilicon\.dmg 302/m)
const routes = JSON.parse(await readFile('public/_routes.json', 'utf8'))
assert.deepEqual(routes.include, ['/api/v1/*', '/api/reviews/*'])
assert.match(await readFile('public/index.html', 'utf8'), /href="\/demo\/"/)
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
