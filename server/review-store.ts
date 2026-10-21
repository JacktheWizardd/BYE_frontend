import { Client } from 'pg'

export type StoreResult = { ok: boolean; code?: string; retryAfter?: number; id?: string }
export type ReviewOperation = 'rate' | 'begin' | 'cancel' | 'verify' | 'session' | 'signout' | 'submit' | 'report'
export interface ReviewStore { call(operation: ReviewOperation, args: Record<string, unknown>): Promise<StoreResult> }
/** No SQL identifiers or statements come from the request. Only this private entry point is callable. */
export function postgresReviewStore(connectionString: string): ReviewStore {
  return { async call(operation, args) {
    // Workerd sockets belong to one request. Supavisor performs cross-request pooling.
    const db = new Client({ connectionString, ssl:{rejectUnauthorized:true}, connectionTimeoutMillis:5000, query_timeout:8000, statement_timeout:7000, application_name:'bye-private-reviews' })
    db.on('error', () => { /* Errors can contain connection details. Do not log them. */ })
    try {
      await db.connect()
      const result = await db.query<{ result: StoreResult }>('select review_private.gateway($1::text, $2::jsonb) as result', [operation, JSON.stringify(args)])
      if (!result.rows[0]?.result || typeof result.rows[0].result.ok !== 'boolean') throw new Error('Invalid review store response')
      return result.rows[0].result
    } finally { await db.end().catch(() => {}) }
  } }
}
/** Validate the role and pooler origin before any socket is opened. SSL options cannot override TLS. */
export function validReviewDatabaseUrl(value: string | undefined): value is string {
  try {
    const u = new URL(value ?? '')
    return ['postgres:', 'postgresql:'].includes(u.protocol) && /^bye_review_gateway\.[a-z0-9]+$/.test(decodeURIComponent(u.username)) && !!u.password && /^aws-[a-z0-9-]+\.pooler\.supabase\.com$/.test(u.hostname) && u.port === '6543' && u.pathname === '/postgres' && !u.search && !u.hash
  } catch { return false }
}
