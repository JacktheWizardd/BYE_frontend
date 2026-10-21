import { keyedDigest,mailboxDigest,normalizeEmail,schoolEmail } from '../../server/review-identity'
export interface MigrationConnection { query(text:string, values?:unknown[]):Promise<{rows:Record<string,any>[]}> }
/** Operator-only: email values never leave this function, its connection, or request memory. */
export async function backfillReviewIdentities(db:MigrationConnection,key:Uint8Array):Promise<number>{
  await db.query('begin')
  try{
    await db.query('lock table public.reviews,public.reports in share mode')
    await db.query('lock table auth.users in share mode')
    const config=await db.query('select key_fingerprint,ready,cutover_at from review_private.config for update')
    const fingerprint=await keyedDigest(key,'key-check','v1')
    if(config.rows.length!==1 || config.rows[0].ready || config.rows[0].cutover_at || (config.rows[0].key_fingerprint && config.rows[0].key_fingerprint!==fingerprint))throw new Error('Migration state mismatch')
    let after='00000000-0000-0000-0000-000000000000',count=0
    while(true){
      const users=await db.query(`select u.id,u.email,u.email_confirmed_at,u.updated_at from auth.users u where u.id>$1::uuid and ((u.email_confirmed_at is not null and lower(btrim(u.email)) like '%@go.pasadena.edu') or exists(select 1 from public.reviews r where r.author_id=u.id) or exists(select 1 from public.reports r where r.reporter_id=u.id)) order by u.id limit 200`,[after])
      if(!users.rows.length)break
      for(const user of users.rows){
        after=user.id
        const email=normalizeEmail(user.email),eligible=!!user.email_confirmed_at && schoolEmail(email)
        const mailbox=eligible?await mailboxDigest(key,email):null
        await db.query(`insert into review_private.identities(id,mailbox,verified_at,legacy_updated_at) values($1,$2,$3,$4) on conflict(id) do update set mailbox=excluded.mailbox,verified_at=excluded.verified_at,legacy_updated_at=excluded.legacy_updated_at`,[user.id,mailbox,eligible?user.email_confirmed_at:null,user.updated_at])
        user.email='';count++
      }
    }
    await db.query('update review_private.config set key_fingerprint=$1',[fingerprint])
    await db.query('commit')
    return count
  }catch(error){await db.query('rollback');throw error}
}
