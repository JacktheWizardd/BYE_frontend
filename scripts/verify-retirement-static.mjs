import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const html=await readFile('public/offline.html','utf8')
assert.match(html,/BYE has shut down/)
for(const path of ['public/index.html','public/404.html','public/app/index.html','public/demo/index.html','public/reviews/index.html'])assert.equal(await readFile(path,'utf8'),html)
assert.deepEqual(JSON.parse(await readFile('public/_routes.json','utf8')),{version:1,include:['/*'],exclude:[]})
assert.match(await readFile('functions/_middleware.ts','utf8'),/availability/)
const release=JSON.parse(await readFile('retirement-release.json','utf8'))
assert.equal(typeof release.windowsReady,'boolean')
if(release.windowsReady) {
  assert.ok(release.windowsNativeTested === true || release.windowsPublicationAuthorized === true,'Windows publication requires native acceptance or explicit owner authorization')
  assert.equal(release.windowsArtifactUrl,`https://github.com/JacktheWizardd/BYE-releases/releases/download/v${release.version}/BYE-Retirement-${release.version}-windows-x64.zip`)
}
console.log('Retirement holding pages, global routing and authorized release configuration passed.')
