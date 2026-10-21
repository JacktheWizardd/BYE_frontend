/** Isolated PostgreSQL rehearsal; never reads .dev.vars or connects to a hosted database. */
import { PGlite } from '@electric-sql/pglite'
import { readFile,readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert/strict'
import { backfillReviewIdentities } from './lib/private-review-migration'
import { mailboxDigest,identitySecret,keyedDigest } from '../server/review-identity'
const dir=resolve(process.argv[2]??'../BYE_Before_You_Enroll/supabase')
const migration=(suffix:string)=>readdir(dir+'/migrations').then(files=>{const matches=files.filter(f=>f.endsWith(suffix));assert.equal(matches.length,1);return readFile(dir+'/migrations/'+matches[0],'utf8')})
const db=new PGlite(), key=identitySecret('000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f')!, fingerprint=await keyedDigest(key,'key-check','v1')
const uid='22222222-2222-4222-8222-222222222222', other='33333333-3333-4333-8333-333333333333'
let checks=0
const eq=(actual:unknown,expected:unknown)=>{assert.deepEqual(actual,expected);checks++}
const scalar=async<T=any>(sql:string,params:unknown[]=[])=>Object.values((await db.query<any>(sql,params)).rows[0])[0] as T
const call=async(op:string,args:Record<string,unknown>={})=>scalar<any>('select review_private.gateway($1,$2::jsonb)',[op,JSON.stringify({...args,keyFingerprint:fingerprint})])
const code=(v:any)=>v.ok?'OK':v.code
const fail=async(sql:string,role='bye_review_gateway')=>{
 await db.exec(`set role ${role}`)
 try {await assert.rejects(db.exec(sql));checks++}finally{await db.exec('reset role')}
}
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,updated_at timestamptz default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;`)
 for(const file of ['schema.sql','002_write_side.sql','006_pcc_student_no_plus_alias.sql'])await db.exec(await readFile(dir+'/'+file,'utf8'))
 await db.exec(`grant usage on schema public to anon,authenticated;grant select on public.professors,public.courses to anon,authenticated;
 insert into auth.users(id,email,email_confirmed_at) values('${uid}','tester@go.pasadena.edu',now()),('${other}','other@go.pasadena.edu',now());
 insert into public.professors(first_name,last_name) values('Alex','Fixture'),('Casey','Fixture');
 insert into public.courses(code,title) values('TEST 001','Fictional');
 insert into public.reviews(id,author_id,professor_id,course_id,quality,difficulty,body) values('11111111-1111-4111-8111-111111111111','${uid}',1,1,4,3,'Historical review'),('11111111-1111-4111-8111-111111111112','${uid}',2,1,3,2,'Other historical review');
 insert into public.review_dimensions values('11111111-1111-4111-8111-111111111111','clarity',0);
 insert into public.reports(review_id,reporter_id,reason) values('11111111-1111-4111-8111-111111111111','${other}','Historical report');`)
 const before=await db.query('select * from public.reviews order by id'),reports=await db.query('select * from public.reports order by id'),answers=await db.query('select * from public.review_dimensions order by review_id,dimension')
 await db.exec(await migration('_private_review_verification.sql'))
 eq(code(await call('begin',{mailbox:'b'.repeat(64),challenge:'c'.repeat(64),code:'d'.repeat(64)})),'REVIEWS_DISABLED')
 await assert.rejects(db.exec(await migration('_private_review_cutover.sql')));checks++;await db.exec('rollback')
 eq(await backfillReviewIdentities(db,key),2)
 await db.query("update auth.users set updated_at=now()+interval '1 second' where id=$1",[uid])
 await assert.rejects(db.exec(await migration('_private_review_cutover.sql')));checks++;await db.exec('rollback')
 eq(await backfillReviewIdentities(db,key),2)
 await assert.rejects(backfillReviewIdentities(db,new Uint8Array(32).fill(255)));checks++
 await db.exec(await migration('_private_review_cutover.sql'))
 eq((await db.query('select * from public.reviews order by id')).rows,before.rows)
 eq((await db.query('select * from public.reports order by id')).rows,reports.rows)
 eq((await db.query('select * from public.review_dimensions order by review_id,dimension')).rows,answers.rows)
 // Old Auth cleanup no longer cascades. UUIDs/content/reports/answers survive.
 await db.exec('delete from auth.users')
 eq((await db.query('select * from public.reviews order by id')).rows,before.rows)
 eq((await db.query('select * from public.reports order by id')).rows,reports.rows)
 await fail('select * from auth.users');await fail('select * from review_private.identities');await fail('select * from review_private.sessions')
 await fail("select review_private.moderate('11111111-1111-4111-8111-111111111111','ban','test','{}')")
 await fail("select review_private.consume('test',1,60)")
 await fail("insert into public.reviews(author_id,professor_id,course_id,quality,difficulty) values('"+uid+"',1,1,4,3)")
 await fail("select public.submit_review(1,1,4,3,null,'{}')",'authenticated')
 await fail("insert into public.reports(review_id,reason) values('11111111-1111-4111-8111-111111111111','legacy')",'authenticated')
 await fail('select review_private.gateway(\'session\',\'{}\')','anon')
 await fail('select author_id from public.reviews','anon')
 eq((await db.query("select column_name from information_schema.columns where table_schema='review_private' and (column_name like '%email%' or column_name in ('code','token'))")).rows,[])
 eq(code(await scalar('select review_private.gateway($1,$2::jsonb)',['session',JSON.stringify({keyFingerprint:'f'.repeat(64)})])),'REVIEWS_DISABLED')
 const mailbox=await mailboxDigest(key,'new@go.pasadena.edu'), challenge='c'.repeat(64), correct='d'.repeat(64), session='e'.repeat(64)
 await db.exec('set role bye_review_gateway')
 eq(code(await call('begin',{mailbox,challenge,code:correct})),'OK')
 eq(code(await call('begin',{mailbox,challenge:'1'.repeat(64),code:correct})),'RATE_LIMITED')
 for(let i=0;i<5;i++)eq(code(await call('verify',{mailbox,challenge,code:'f'.repeat(64),session})),'INVALID_CODE')
 eq(code(await call('verify',{mailbox,challenge,code:correct,session})),'INVALID_CODE')
 await db.exec('reset role');await db.exec("delete from review_private.rate_limits;delete from review_private.challenges")
 await db.exec('set role bye_review_gateway')
 eq(code(await call('begin',{mailbox,challenge,code:correct})),'OK')
 const verified=await Promise.all([call('verify',{mailbox,challenge,code:correct,session}),call('verify',{mailbox,challenge,code:correct,session:'f'.repeat(64)})])
 eq(verified.filter(v=>v.ok).length,1);eq(verified.filter(v=>v.code==='INVALID_CODE').length,1)
 eq(code(await call('session',{session})),'OK')
 eq(code(await call('verify',{mailbox,challenge,code:correct,session})),'INVALID_CODE')
 const review=await call('submit',{session,professorId:'1',courseId:'1',quality:4,difficulty:3,body:'Fictional new review',answers:{clarity:0}})
 eq(review.ok,true)
 eq(code(await call('submit',{session,professorId:'1',courseId:'1',quality:4,difficulty:3,answers:{}})),'DUPLICATE_REVIEW')
 eq(code(await call('submit',{session,professorId:'2',courseId:'1',quality:4,difficulty:3,answers:{clarity:2}})),'INVALID_INPUT')
 await db.exec('reset role')
 // A migrated mailbox receives its original private UUID and retains duplicate protection.
 const migratedMailbox=await mailboxDigest(key,'tester@go.pasadena.edu'),migratedSession='9'.repeat(64)
 await call('begin',{mailbox:migratedMailbox,challenge:'8'.repeat(64),code:correct})
 eq(code(await call('verify',{mailbox:migratedMailbox,challenge:'8'.repeat(64),code:correct,session:migratedSession})),'OK')
 eq(await scalar('select identity_id from review_private.sessions where digest=$1',[migratedSession]),uid)
 eq(code(await call('submit',{session:migratedSession,professorId:'1',courseId:'1',quality:4,difficulty:3,answers:{}})),'DUPLICATE_REVIEW')
 eq(code(await call('signout',{session:migratedSession})),'OK')
 eq(code(await call('session',{session:migratedSession})),'SESSION_EXPIRED')
 // Resends invalidate previous codes. Session and code expiry are checked before use, independent of pruning.
 await db.exec('delete from review_private.rate_limits')
 await call('begin',{mailbox,challenge,code:correct})
 await db.exec("update review_private.rate_limits set expires_at=now()-interval '1 second' where bucket like 'email:cooldown:%'")
 eq(code(await call('begin',{mailbox,challenge:'1'.repeat(64),code:correct})),'OK')
 eq(code(await call('verify',{mailbox,challenge,code:correct,session:'2'.repeat(64)})),'INVALID_CODE')
 await db.exec("update review_private.challenges set expires_at=now()-interval '1 second'")
 eq(code(await call('verify',{mailbox,challenge:'1'.repeat(64),code:correct,session:'2'.repeat(64)})),'INVALID_CODE')
 // Ban selected reviews only, revoke existing sessions; verified mailbox cannot return.
 await db.query('select review_private.moderate($1,$2,$3,$4::uuid[])',[review.id,'ban','Fictional abuse',[review.id]])
 eq(await scalar('select is_hidden from public.reviews where id=$1',[review.id]),true)
 eq(code(await call('submit',{session,professorId:'2',courseId:'1',quality:4,difficulty:3,answers:{}})),'SESSION_EXPIRED')
 await db.exec('delete from review_private.rate_limits')
 await call('begin',{mailbox,challenge,code:correct})
 eq(code(await call('verify',{mailbox,challenge,code:correct,session:'2'.repeat(64)})),'ACCOUNT_RESTRICTED')
 await db.query('select review_private.moderate($1,$2,$3)',[review.id,'unban','Fictional appeal'])
 eq(await scalar('select is_hidden from public.reviews where id=$1',[review.id]),true)
 // Banning a historical author preserves their unselected review.
 await db.query('select review_private.moderate($1,$2,$3,$4::uuid[])',['11111111-1111-4111-8111-111111111111','ban','Fixture',['11111111-1111-4111-8111-111111111111']])
 eq(await scalar("select is_hidden from public.reviews where id='11111111-1111-4111-8111-111111111112'"),false)
 await assert.rejects(db.query('select review_private.moderate($1,$2,$3,$4::uuid[])',[review.id,'ban','Wrong author',['11111111-1111-4111-8111-111111111112']]));checks++
 // Distributed counters are database-owned, including attempts with a missing browser challenge.
 await db.exec('delete from review_private.rate_limits')
 for(let i=0;i<5;i++)eq(code(await call('rate',{route:'auth/send',subject:'a'.repeat(64)})),'OK')
 eq(code(await call('rate',{route:'auth/send',subject:'a'.repeat(64)})),'RATE_LIMITED')
 for(let i=0;i<10;i++)eq(code(await call('verify',{mailbox,challenge:'0'.repeat(64),code:correct,session})),'INVALID_CODE')
 eq(code(await call('verify',{mailbox,challenge:'0'.repeat(64),code:correct,session})),'RATE_LIMITED')
 // Four successful sends per mailbox/30min, even across replacement challenges and cooldown expiry.
 await db.exec('delete from review_private.rate_limits')
 const limitedMailbox='7'.repeat(64)
 for(let i=0;i<4;i++){
  eq(code(await call('begin',{mailbox:limitedMailbox,challenge:String(i).repeat(64),code:correct})),'OK')
  await db.exec("update review_private.rate_limits set expires_at=now()-interval '1 second' where bucket like 'email:cooldown:%'")
 }
 eq(code(await call('begin',{mailbox:limitedMailbox,challenge:'8'.repeat(64),code:correct})),'RATE_LIMITED')
 await db.exec("insert into review_private.rate_limits(bucket,attempts,expires_at) values('delivery:daily',300,now()+interval '1 hour') on conflict(bucket) do update set attempts=300,expires_at=excluded.expires_at")
 eq(code(await call('begin',{mailbox:'6'.repeat(64),challenge:'8'.repeat(64),code:correct})),'RATE_LIMITED')
 // Three distinct identities hide one review; duplicate reports cannot inflate the count.
 for(let i=1;i<=3;i++){
  const id=`44444444-4444-4444-8444-${String(i).padStart(12,'0')}`,s=String(i).repeat(64)
  await db.query('insert into review_private.identities(id,verified_at) values($1,now())',[id]);await db.query('insert into review_private.sessions(digest,identity_id) values($1,$2)',[s,id])
  const args={session:s,reviewId:'11111111-1111-4111-8111-111111111112',reason:'Fictional report'}
  eq(code(await call('report',args)),'OK')
  if(i===1)eq(code(await call('report',args)),'DUPLICATE_REPORT')
  eq(await scalar("select is_hidden from public.reviews where id='11111111-1111-4111-8111-111111111112'"),i===3)
 }
 await db.exec("update review_private.sessions set expires_at=now()-interval '1 second'")
 eq(code(await call('session',{session:'1'.repeat(64)})),'SESSION_EXPIRED')
 await db.exec("update review_private.challenges set expires_at=now()-interval '1 second';update review_private.rate_limits set expires_at=now()-interval '1 second';select review_private.prune()")
 eq(await scalar('select count(*)::integer from review_private.sessions'),0)
 eq(await scalar('select count(*)::integer from review_private.challenges'),0)
 eq(await scalar('select count(*)::integer from review_private.rate_limits'),0)
 await db.exec('update review_private.config set ready=false')
 eq(code(await call('session',{session})),'REVIEWS_DISABLED')
 await assert.rejects(backfillReviewIdentities(db,key));checks++
 eq(await scalar('select count(*)::integer from public.reviews'),3)
 console.log(`Private review database rehearsal passed (${checks} assertions): real migration SQL, roles, cutover, Auth deletion preservation, OTP/session expiry, replay, bans, counters, reports and rollback. PGlite serializes queries; multi-connection races need hosted staging verification.`)
}finally{await db.close()}
