/** Explicit operator tool. Never imported by the website. Credentials/secret come from environment only. */
import { Client } from 'pg'
import { identitySecret } from '../server/review-identity'
import { backfillReviewIdentities } from './lib/private-review-migration'
const action = process.argv[2]
const db = new Client({connectionString:process.env.REVIEW_MIGRATION_DATABASE_URL,ssl:{rejectUnauthorized:true},connectionTimeoutMillis:5000,query_timeout:30000,application_name:'bye-review-operator'})
db.on('error',()=>{})
let connected=false
try {
  if (!process.env.REVIEW_MIGRATION_DATABASE_URL || !['backfill','ban','unban','disable'].includes(action)) throw new Error()
  const url=new URL(process.env.REVIEW_MIGRATION_DATABASE_URL)
  if(!['postgres:','postgresql:'].includes(url.protocol)||url.search||url.hash)throw new Error()
  await db.connect();connected=true
  if (action === 'backfill') {
    const key = identitySecret(process.env.REVIEW_IDENTITY_SECRET)
    if (!key) throw new Error()
    await backfillReviewIdentities(db,key)
    console.log('Private identity backfill completed. No addresses or identifiers were logged. Cutover and Auth cleanup are separate operations.')
  } else if (action === 'disable') {
    await db.query('begin')
    await db.query('update review_private.config set ready=false')
    await db.query('delete from review_private.sessions')
    await db.query('delete from review_private.challenges')
    await db.query('commit')
    console.log('Review verification/writes disabled; reviews retained. Email Auth was not restored.')
  } else {
    const reviewId=process.argv[3], reason=process.env.REVIEW_MODERATION_REASON
    const hide=(process.env.REVIEW_HIDE_IDS??'').split(',').filter(Boolean)
    if (!/^[0-9a-f-]{36}$/i.test(reviewId??'') || !reason || hide.some(id=>!/^[0-9a-f-]{36}$/i.test(id))) throw new Error()
    await db.query('select review_private.moderate($1::uuid,$2::text,$3::text,$4::uuid[])',[reviewId,action,reason,hide])
    console.log('Moderation operation completed. Review visibility changes only for explicitly selected IDs.')
  }
} catch {
  if(connected)await db.query('rollback').catch(()=>{})
  console.error('Operator operation failed. Check command, configuration and migration state privately; no sensitive error details are logged.')
  process.exitCode=1
} finally { await db.end().catch(()=>{}) }
