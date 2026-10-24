import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
const html=await readFile('public/offline.html','utf8')
assert.match(html,/BYE has shut down/)
for(const path of ['public/index.html','public/404.html','public/app/index.html','public/demo/index.html','public/reviews/index.html'])assert.equal(await readFile(path,'utf8'),html)
assert.deepEqual(JSON.parse(await readFile('public/_routes.json','utf8')),{version:1,include:['/*'],exclude:[]})
assert.match(await readFile('functions/_middleware.ts','utf8'),/availability/)
assert.equal(JSON.parse(await readFile('retirement-release.json','utf8')).windowsReady,false,'Do not enable Windows delivery before recorded native acceptance')
console.log('Retirement holding pages, global routing and unpublished Windows gate passed.')
