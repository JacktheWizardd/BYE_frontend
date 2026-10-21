import { test } from 'node:test'
import assert from 'node:assert/strict'
import { courseSearchPattern, handleReviewRequest, mergeCourseRows, validateReview } from '../server/reviews'
import { identitySecret, mailboxDigest, randomCode, randomToken } from '../server/review-identity'
import { validReviewDatabaseUrl } from '../server/review-store'
import { REVIEW_COMMENT_LIMIT } from '../packages/core/reviews'
import { reviewFixture, TEST_EMAIL, validForm, REVIEW_ID, sessionToken } from './review-fixtures'
const sessionCookie=()=>`__Secure-bye-review=${sessionToken()}`

test('private verification fails closed for incomplete secrets, privileged keys, or unsafe database connections',async()=>{
 for(const changes of [{REVIEWS_ENABLED:'false'},{REVIEW_TEST_EMAIL:''},{REVIEW_IDENTITY_SECRET:''},{REVIEW_IDENTITY_SECRET:'a'.repeat(64)},{REVIEW_DATABASE_URL:''},{BREVO_API_KEY:''},{REVIEW_SENDER_EMAIL:''},{SUPABASE_URL:'https://evil.test'},{SUPABASE_PUBLISHABLE_KEY:'sb_secret_private'},{SUPABASE_PUBLISHABLE_KEY:'x.'+btoa(JSON.stringify({role:'service_role'}))+'.x'},{REVIEW_DATABASE_URL:'postgresql://postgres:secret@aws-0-test.pooler.supabase.com:6543/postgres'}]){
  const f=reviewFixture();Object.assign(f.env,changes)
  assert.equal((await(await f.request('status')).json() as any).data.enabled,false)
  assert.equal((await f.request('auth/send',{email:TEST_EMAIL})).status,503)
  assert.equal(f.state.calls.length+f.state.storeCalls.length,0)
 }
 const url=reviewFixture().env.REVIEW_DATABASE_URL!
 assert.ok(validReviewDatabaseUrl(url))
 for(const bad of [url+'?sslmode=disable',url.replace(':6543',':5432'),url.replace('pooler.supabase.com','evil.test')])assert.equal(validReviewDatabaseUrl(bad),false)
})
test('mutations require same-origin JSON and bounded bodies',async()=>{
 const f=reviewFixture()
 for(const origin of ['https://evil.test','null','']){
  const r=new Request('https://bye.test/api/reviews/auth/send',{method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify({email:TEST_EMAIL})})
  assert.equal((await handleReviewRequest(r,f.env,f.outbound,f.store)).status,403)
 }
 for(const [content,body,status] of [['text/plain','{}',415],['application/json',JSON.stringify({email:TEST_EMAIL,padding:'x'.repeat(17000)}),413]] as const){
  assert.equal((await handleReviewRequest(new Request('https://bye.test/api/reviews/auth/send',{method:'POST',headers:{Origin:'https://bye.test','Content-Type':content},body}),f.env,f.outbound,f.store)).status,status)
 }
 assert.equal(f.state.calls.length,0)
})
test('school and owner validation happens before sending; plus aliases and look-alike domains are rejected',async()=>{
 const f=reviewFixture()
 for(const email of ['tester@example.com','other@go.pasadena.edu','tester@go.pasadena.edu.evil.test','tester+tag@go.pasadena.edu'])assert.equal((await f.request('auth/send',{email})).status,403)
 assert.equal(f.state.otpRequests,0)
 assert.equal((await f.request('auth/send',{email:'  TESTER@GO.PASADENA.EDU '})).status,200)
 assert.equal(f.state.otpRequests,1)
 assert.ok(!JSON.stringify(f.state.storeCalls).includes(TEST_EMAIL))
 assert.ok(f.state.calls.every(c=>!c.url.includes('/auth/')))
 f.state.emailRateLimited=true
 const limited=await f.request('auth/send',{email:TEST_EMAIL});assert.equal(limited.status,429);assert.equal(limited.headers.get('Retry-After'),'60')
})
test('verification requires a browser-bound challenge and never returns email or tokens in JSON',async()=>{
 const f=reviewFixture()
 assert.equal((await f.request('auth/verify',{email:TEST_EMAIL,code:'123456'})).status,400)
 const sent=await f.request('auth/send',{email:TEST_EMAIL})
 assert.match(sent.headers.get('Set-Cookie')!,/__Secure-bye-review-challenge=.*HttpOnly.*Secure.*Max-Age=600/)
 assert.equal((await f.request('auth/verify',{email:TEST_EMAIL,code:'000000'})).status,400)
 const result=await f.request('auth/verify',{email:TEST_EMAIL,code:'123456'})
 assert.equal(result.status,200)
 assert.deepEqual((await result.json() as any).data,{signedIn:true})
 assert.ok(result.headers.getSetCookie().some(c=>/^__Secure-bye-review=[a-f0-9]{64};/.test(c)&&c.includes('Max-Age=3600')))
 assert.equal((await f.request('auth/verify',{email:TEST_EMAIL,code:'123456'})).status,400)
 const cookies=sent.headers.get('Set-Cookie')!.split(';')[0]
 assert.equal((await handleReviewRequest(new Request('https://bye.test/api/reviews/auth/verify',{method:'POST',headers:{Origin:'https://bye.test','Content-Type':'application/json',Cookie:cookies},body:JSON.stringify({email:TEST_EMAIL,code:'123456'})}),f.env,f.outbound,f.store)).status,400)
})
test('sessions are opaque, signout revokes the server record, and legacy JWTs are rejected',async()=>{
 const f=reviewFixture(),cookie=sessionCookie()
 assert.deepEqual((await(await f.request('session')).json() as any).data,{signedIn:false})
 assert.deepEqual((await(await f.request('session',undefined,cookie)).json() as any).data,{signedIn:true})
 assert.equal((await f.request('session',undefined,'__Secure-bye-review=header.payload.signature')).status,200)
 assert.equal((await f.request('submit',validForm,'__Secure-bye-review=header.payload.signature')).status,401)
 const signout=await f.request('auth/signout',{},cookie)
 assert.equal(signout.headers.getSetCookie().length,2)
 assert.equal((await f.request('submit',validForm,cookie)).status,401)
})
test('bans deny existing sessions and verified sign-ins without revealing ban status before code verification',async()=>{
 const f=reviewFixture();f.state.banned=true
 assert.equal((await f.request('submit',validForm,sessionCookie())).status,403)
 assert.equal((await f.request('auth/send',{email:TEST_EMAIL})).status,200)
 assert.equal((await f.request('auth/verify',{email:TEST_EMAIL,code:'000000'})).status,400)
 assert.equal((await f.request('auth/verify',{email:TEST_EMAIL,code:'123456'})).status,403)
})
test('catalogs remain bounded and authenticated, with public reads using only the publishable key',async()=>{
 const f=reviewFixture(),cookie=sessionCookie()
 assert.equal((await f.request('dimensions')).status,401)
 for(const path of ['dimensions','courses?q=TEST','professors?q=Alex%20Fixture'])assert.equal((await f.request(path,undefined,cookie)).status,200)
 const call=f.state.calls.find(c=>c.url.includes('/courses'))!
 assert.equal(new URL(call.url).searchParams.get('limit'),'20')
 assert.equal(new URL(call.url).searchParams.get('select'),'id,code,title')
 assert.equal((await f.request('professors?q=x%2Cy%28',undefined,cookie)).status,400)
 assert.ok(f.state.calls.every(c=>!c.authorization.includes(sessionToken())))
})
test('submission preserves validation, neutral answers, uniqueness, and owner-test labels',async()=>{
 const f=reviewFixture(),cookie=sessionCookie()
 const result=await f.request('submit',validForm,cookie);assert.equal(result.status,200);assert.equal((await result.json() as any).data.id,REVIEW_ID)
 assert.deepEqual(f.state.saves[0].p_answers,{grading:1,clarity:0});assert.equal(f.state.saves[0].p_body,f.prefix+validForm.body)
 assert.equal((await f.request('submit',validForm,cookie)).status,409)
 for(const changes of [{author_id:'spoof'},{quality:0},{difficulty:6},{quality:1.5},{quality:'5'},{professorId:'1 OR 1=1'},{courseId:'0'},{answers:{grading:2}},{answers:{grading:null}},{answers:[]},{body:'x'.repeat(REVIEW_COMMENT_LIMIT+1)}])assert.throws(()=>validateReview({...validForm,...changes}))
 const open=reviewFixture();open.env.REVIEW_ACCESS='students';open.env.REVIEW_TEST_EMAIL=''
 assert.equal((await open.request('auth/send',{email:'another@go.pasadena.edu'})).status,200)
 assert.equal((await open.request('submit',validForm,cookie)).status,200);assert.equal(open.state.saves[0].p_body,validForm.body)
})
test('uncertain writes and failed delivery are sanitized and never automatically retried',async()=>{
 const f=reviewFixture();f.state.saveFails=true
 const result=await f.request('submit',validForm,sessionCookie())
 assert.equal(result.status,503);assert.match(await result.text(),/SAVE_UNCONFIRMED/)
 assert.equal(f.state.storeCalls.filter(c=>c.operation==='submit').length,1)
 const outbound:typeof fetch=async()=>new Response(null,{status:302,headers:{Location:'https://evil.test'}})
 const r=await handleReviewRequest(new Request('https://bye.test/api/reviews/auth/send',{method:'POST',headers:{Origin:'https://bye.test','Content-Type':'application/json'},body:JSON.stringify({email:TEST_EMAIL})}),f.env,outbound,f.store)
 assert.equal(r.status,503);assert.equal(f.state.storeCalls.at(-1)!.operation,'cancel');assert.ok(!(await r.text()).includes(TEST_EMAIL))
})
test('IP and mailbox counters receive only domain-separated keyed identifiers',async()=>{
 const f=reviewFixture(),request=new Request('https://bye.test/api/reviews/auth/send',{method:'POST',headers:{Origin:'https://bye.test','Content-Type':'application/json','CF-Connecting-IP':'203.0.113.10'},body:JSON.stringify({email:TEST_EMAIL})})
 assert.equal((await handleReviewRequest(request,f.env,f.outbound,f.store)).status,200)
 const recorded=JSON.stringify(f.state.storeCalls)
 assert.ok(!recorded.includes(TEST_EMAIL));assert.ok(!recorded.includes('203.0.113.10'));assert.ok(!recorded.includes(f.state.lastCode))
 assert.match(String(f.state.storeCalls[0].args.subject),/^[0-9a-f]{64}$/)
 const key=identitySecret(f.env.REVIEW_IDENTITY_SECRET)!
 assert.equal(await mailboxDigest(key,TEST_EMAIL),await mailboxDigest(key,' TESTER@GO.PASADENA.EDU '))
 assert.notEqual(await mailboxDigest(key,TEST_EMAIL),await mailboxDigest(key,'other@go.pasadena.edu'))
 assert.match(randomToken(),/^[0-9a-f]{64}$/);for(let i=0;i<20;i++)assert.match(randomCode(),/^\d{6}$/)
})
test('Turnstile checks hostname/action before consuming mailbox quota',async()=>{
 const f=reviewFixture();f.env.TURNSTILE_SITE_KEY='site';f.env.TURNSTILE_SECRET_KEY='secret'
 const verdicts:Record<string,object>={good:{success:true,hostname:'bye.test',action:'send-code'},bad:{success:false},host:{success:true,hostname:'evil.test',action:'send-code'},action:{success:true,hostname:'bye.test',action:'other'}}
 const outbound:typeof fetch=async(input,init)=>String(input).includes('turnstile')?Response.json(verdicts[String((init?.body as FormData).get('response'))]??{}):f.outbound(input,init)
 for(const token of ['','bad','host','action','good']){
  const response=await handleReviewRequest(new Request('https://bye.test/api/reviews/auth/send',{method:'POST',headers:{Origin:'https://bye.test','Content-Type':'application/json'},body:JSON.stringify({email:TEST_EMAIL,turnstileToken:token})}),f.env,outbound,f.store)
  assert.equal(response.status,token==='good'?200:403)
 }
 assert.equal(f.state.storeCalls.filter(c=>c.operation==='begin').length,1)
})
test('unknown paths, methods and insecure deployed origins fail before connecting',async()=>{
 const f=reviewFixture()
 assert.equal((await f.request('unknown')).status,404);assert.equal((await f.request('submit')).status,405)
 assert.equal((await handleReviewRequest(new Request('http://public.test/api/reviews/status'),f.env,f.outbound,f.store)).status,400)
 assert.equal(f.state.calls.length+f.state.storeCalls.length,0)
})
test('course search ranks PCC code matches before title matches',()=>{
 for(const [input,expected] of [['math','MATH%'],['math5a','MATH 005A%'],['5a','% 005A%'],['engl c1001','ENGL C1001%'],['abe 3002','ABE 3002%']])assert.equal(courseSearchPattern(input),expected)
 assert.deepEqual(mergeCourseRows([{id:1},{id:2}],[{id:2},{id:3}]).map(r=>r.id),[1,2,3])
})
