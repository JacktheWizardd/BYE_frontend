import { handleReviewRequest, type ReviewEnv } from '../server/reviews'
import { TEST_REVIEW_PREFIX } from '../packages/core/reviews'
export const TEST_EMAIL = 'tester@go.pasadena.edu'
export const REVIEW_ID = '11111111-1111-4111-8111-111111111111'
export const dimensions = [
  ['grading','lenient','strict'], ['workload','light','heavy'], ['attendance','optional','required'],
  ['clarity','unclear','clear'], ['feedback_speed','slow','fast'], ['test_alignment','rarely match class','closely match class'], ['textbook','optional','required'],
].map(([name,low_label,high_label], i)=>({name,low_label,high_label,sort_order:i+1}))
export const validForm = { professorId:'1', courseId:'2', quality:4, difficulty:3, body:'A temporary test.', answers:{grading:1,clarity:0} }
import { type ReviewStore } from '../server/review-store'
import { identitySecret, keyedDigest, tokenDigest } from '../server/review-identity'
export const sessionToken = () => 'a'.repeat(64)
export function reviewFixture() {
  const env:ReviewEnv={REVIEWS_ENABLED:'true',REVIEW_TEST_EMAIL:TEST_EMAIL,SUPABASE_URL:'https://fixture.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture',REVIEW_LOCAL_HTTP:'true',REVIEW_IDENTITY_SECRET:'000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',REVIEW_DATABASE_URL:'postgresql://bye_review_gateway.fixture:fixture@aws-0-test.pooler.supabase.com:6543/postgres',BREVO_API_KEY:'fictional-provider-key',REVIEW_SENDER_EMAIL:'sender@example.test'}
  const state={authExpired:false,banned:false,emailRateLimited:false,saveFails:false,duplicate:false,catalogFails:false,verified:false,reportCount:0,otpRequests:0,reportCode:'',missing:false,lastCode:'',saves:[] as Record<string,unknown>[],calls:[] as {method:string;url:string;authorization:string}[],storeCalls:[] as {operation:string;args:Record<string,unknown>}[]}
  const sessions = new Set<string>(), challenges = new Map<string,string>(); let initialized=false, reported=false, challengeCookie=''
  const store:ReviewStore={async call(operation,args){
    state.storeCalls.push({operation,args})
    if(!initialized){sessions.add(await tokenDigest(sessionToken()));initialized=true}
    if(operation==='rate')return {ok:true}
    if(operation==='begin'){
      if(state.emailRateLimited)return {ok:false,code:'RATE_LIMITED',retryAfter:60}
      for(const [key,value] of challenges)if(value===args.mailbox)challenges.delete(key)
      challenges.set(String(args.challenge),String(args.mailbox));return {ok:true}
    }
    if(operation==='cancel'){challenges.delete(String(args.challenge));return {ok:true}}
    if(operation==='verify'){
      const expected=await keyedDigest(identitySecret(env.REVIEW_IDENTITY_SECRET)!,'code',`${args.challenge}:123456`)
      if(challenges.get(String(args.challenge))!==args.mailbox || args.code!==expected)return {ok:false,code:'INVALID_CODE'}
      challenges.delete(String(args.challenge))
      if(state.banned)return {ok:false,code:'ACCOUNT_RESTRICTED'}
      sessions.add(String(args.session));state.verified=true;return {ok:true}
    }
    if(operation==='signout'){sessions.delete(String(args.session));challenges.delete(String(args.challenge));return {ok:true}}
    if(state.authExpired || !sessions.has(String(args.session)))return {ok:false,code:'SESSION_EXPIRED'}
    if(state.banned)return {ok:false,code:'ACCOUNT_RESTRICTED'}
    if(operation==='session')return {ok:true}
    if(operation==='report'){
      if(state.missing)return {ok:false,code:'REVIEW_UNAVAILABLE'}
      if(state.reportCode) {if(state.reportCode==='42501')return {ok:false,code:'REVIEW_UNAVAILABLE'};throw new Error('private upstream error')}
      if(reported)return {ok:false,code:'DUPLICATE_REPORT'}
      state.reportCount++;reported=true;return {ok:true}
    }
    if(operation==='submit'){
      if(state.saveFails)throw new Error('fixture failure')
      if(state.duplicate)return {ok:false,code:'DUPLICATE_REVIEW'}
      state.saves.push({p_professor_id:args.professorId,p_course_id:args.courseId,p_quality:args.quality,p_difficulty:args.difficulty,p_body:args.body,p_answers:args.answers});state.duplicate=true;return {ok:true,id:REVIEW_ID}
    }
    throw new Error('Unmocked store operation')
  }}
  const outbound:typeof fetch=async(input,init)=>{
    const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url)
    const headers=new Headers(init?.headers),method=init?.method??'GET'
    state.calls.push({method,url:url.href,authorization:headers.get('Authorization')??''})
    if(url.href==='https://api.brevo.com/v3/smtp/email'){
      state.otpRequests++;state.lastCode=JSON.parse(String(init?.body)).textContent.match(/code is (\d{6})/)[1];return Response.json({messageId:'fictional-only'})
    }
    if(url.origin!=='https://fixture.supabase.co' || url.pathname.startsWith('/auth/'))throw new Error('Unexpected fixture origin or legacy Auth request')
    if(state.catalogFails)return Response.json({code:'XX000',message:'fixture catalog failure'},{status:503})
    if(url.pathname==='/rest/v1/dimensions')return Response.json(dimensions)
    if(url.pathname==='/rest/v1/reports') { throw new Error('Direct report writes are forbidden') }
    if(url.pathname==='/rest/v1/reviews') {
      if(url.searchParams.get('select')==='id')return Response.json({id:REVIEW_ID})
      return Response.json([{id:REVIEW_ID,quality:4,difficulty:3,body:'Fictional saved review',created_at:'2026-10-16T00:00:00Z',course_id:2,courses:{code:'TEST 001',title:'FICTIONAL TEST CLASS'}}])
    }
    if(url.pathname==='/rest/v1/courses'){const row={id:2,code:'TEST 001',title:'FICTIONAL TEST CLASS'};return Response.json(headers.get('Accept')?.includes('object')?row:[row])}
    if(url.pathname==='/rest/v1/professors'){const row={id:1,first_name:'Alex',last_name:'Fixture'};return Response.json(headers.get('Accept')?.includes('object')?row:[row])}
    throw new Error('Unmocked fixture path: '+url.pathname)
  }
  const request=async(path:string,body?:unknown,cookie?:string,origin='https://bye.test')=>{
    const cookies=[cookie,...(path.startsWith('auth/') && challengeCookie?[challengeCookie]:[])].filter(Boolean).join('; ')
    const response=await handleReviewRequest(new Request(origin+'/api/reviews/'+path,{method:body===undefined?'GET':'POST',headers:{...(body===undefined?{}:{Origin:origin,'Content-Type':'application/json'}),...(cookies?{Cookie:cookies}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})}),env,outbound,store)
    for(const value of response.headers.getSetCookie())if(value.split('=')[0].endsWith('-challenge'))challengeCookie=value.split(';')[0]
    return response
  }
  return {env,state,outbound,store,request,prefix:TEST_REVIEW_PREFIX}
}
