/** Compile production Pages code and a separate test-only adapter, then exercise it in workerd. */
import { Miniflare } from 'miniflare'
import { execFileSync } from 'node:child_process'
import { mkdir,writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { reviewFixture, TEST_EMAIL, validForm, REVIEW_ID } from '../tests/review-fixtures'
const out=resolve('.wrangler/review-test-build'),adapter=out+'/fixture-functions/api/reviews'
await mkdir(adapter,{recursive:true})
const env={...process.env,WRANGLER_SEND_METRICS:'false',WRANGLER_LOG_PATH:'/private/tmp/bye-review-runtime.log'}
const build=(dir:string,dest:string)=>execFileSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','pages','functions','build',dir,'--compatibility-date','2025-10-11','--compatibility-flags','nodejs_compat','--outdir',dest],{env,stdio:'pipe'})
build('functions',out+'/production')
// This adapter exists only in ignored test output; there is no production fixture binding or switch.
await writeFile(adapter+'/[[route]].ts',`import {handleReviewRequest} from ${JSON.stringify(resolve('server/reviews.ts'))};\nimport {reviewFixture} from ${JSON.stringify(resolve('tests/review-fixtures.ts'))};\nconst fixture=reviewFixture(); export const onRequest=({request,env})=>handleReviewRequest(request,env,fixture.outbound,fixture.store);`)
build(out+'/fixture-functions',out+'/fixture')
const f=reviewFixture()
const mf=new Miniflare({workers:[
 {name:'reviews',modules:true,scriptPath:out+'/fixture/index.js',compatibilityDate:'2025-10-11',compatibilityFlags:['nodejs_compat'],bindings:f.env,outboundService:()=>{throw new Error('Unexpected real outbound request')}},
 {name:'disabled',modules:true,scriptPath:out+'/production/index.js',compatibilityDate:'2025-10-11',compatibilityFlags:['nodejs_compat'],bindings:{REVIEWS_ENABLED:'false',LIVE_APP_ENABLED:'false'},outboundService:()=>{throw new Error('Disabled API must not fetch')}},
]})
try{
 const worker=await mf.getWorker('reviews'),disabled=await mf.getWorker('disabled')
 const req=(path:string,body?:unknown,cookie?:string)=>worker.fetch('https://fixture.local/api/reviews/'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{Origin:'https://fixture.local','Content-Type':'application/json'}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})})
 assert.equal((await(await disabled.fetch('https://fixture.local/api/reviews/status')).json() as any).data.enabled,false)
 assert.equal((await disabled.fetch('https://fixture.local/api/reviews/dimensions')).status,503)
 assert.equal((await req('auth/verify',{email:TEST_EMAIL,code:'123456'})).status,400)
 const sent=await req('auth/send',{email:TEST_EMAIL});assert.equal(sent.status,200)
 const challenge=sent.headers.get('Set-Cookie')!.split(';')[0]
 const verification=await req('auth/verify',{email:TEST_EMAIL,code:'123456'},challenge)
 assert.equal(verification.status,200);assert.deepEqual((await verification.json() as any).data,{signedIn:true})
 const cookie=verification.headers.getSetCookie().find(c=>c.startsWith('__Secure-bye-review='))!.split(';')[0]
 assert.match(cookie,/=[0-9a-f]{64}$/)
 for(const path of ['courses?q=TEST','professors?q=Alex','dimensions','selection?professorId=1&courseId=2'])assert.equal((await req(path,undefined,cookie)).status,200)
 for(const path of ['resolve?instructor=Alex%20Fixture&course=TEST1','profile?professorId=1','list?professorId=1&courseId=2'])assert.equal((await req(path)).status,200)
 assert.equal((await req('report',{reviewId:REVIEW_ID,reason:'Fictional runtime report'},cookie)).status,200)
 const saved=await req('submit',validForm,cookie);assert.equal(saved.status,200);assert.equal((await saved.json() as any).data.id,REVIEW_ID)
 assert.equal((await req('submit',validForm,cookie)).status,409)
 assert.equal((await req('auth/signout',{},cookie)).status,200)
 assert.equal((await req('submit',validForm,cookie)).status,401)
 assert.equal((await req('auth/verify',{email:TEST_EMAIL,code:'123456'},challenge)).status,400)
 assert.equal((await disabled.fetch('https://fixture.local/api/v1/terms')).status,503)
 console.log('Compiled Pages/workerd private review flow passed: production fail-closed build plus isolated fixture adapter, challenge/session cookies, code replay, catalog/public reads, reporting, atomic save contract, duplicates and revocation. No real email or database calls; pg pooler/TLS needs hosted staging.')
}finally{await mf.dispose()}
