# Private mailbox verification and bans

## State and guarantees

Implemented locally on October 20, 2026. **Not migrated, deployed or enabled on production.**
The currently deployed Supabase email Auth flow still retains addresses until the separately approved rollout is completed.

New flow: browser → same-origin Pages API → Brevo delivery + restricted Postgres gateway.
Supabase remains the review database; its email Auth endpoints are no longer called by the new server.
After verification the browser clears its address field and displays “School email verified.”
Session JSON contains only `signedIn`; no email, private author ID, mailbox identifier, challenge or session secret is returned in JSON.

The server uses domain-separated HMAC-SHA-256 to derive the stable mailbox identifier, IP rate identifiers and code verifiers. Addresses and codes are sent only to Brevo, not to SQL. The database stores private author UUIDs, mailbox HMACs, code MACs and random-token digests. Challenges last ten minutes, accept at most five guesses, and are deleted on success. Sessions last one hour and are revoked on sign-out or ban. Every request checks expiry; the fifteen-minute pruning job only removes expired records.

This is **pseudonymity**, not a guarantee against identification. Server operators can observe incoming requests and, with the identity secret, test candidate addresses. Brevo and recipients' mail systems process delivery data. Existing Auth identities, audit logs, backups, delivery records and earlier exports are not automatically erased. Comments may identify their authors. Never claim “we never see your email” or “no email records exist anywhere.”

## Configuration and permissions

Keep the existing `SUPABASE_URL`, publishable/anon key, `REVIEW_ACCESS`, owner-test setting and optional Turnstile configuration. Add server-only secrets:

| Variable | Value |
| --- | --- |
| `REVIEW_IDENTITY_SECRET` | Stable, cryptographically random 32-byte key encoded as 64 lowercase hex characters; generate privately and back up securely |
| `REVIEW_DATABASE_URL` | TLS transaction-pooler URL, `postgresql://bye_review_gateway.PROJECT_REF:PASSWORD@POOLER_HOST:6543/postgres`; copy the actual pooler host from Supabase Connect; no query parameters |
| `BREVO_API_KEY` | Transactional sending API key; existing SMTP credentials are not API keys |
| `REVIEW_SENDER_EMAIL` | Existing Brevo-authorized BYE sender address |

Never put production secrets into tracked files, frontend environment variables, screenshots, issue text or chat. The runtime rejects `postgres`/service-role database credentials and privileged Supabase API keys. TLS certificate verification is required. Use `pg` 8.16.3 with unnamed parameterized statements, a request-scoped connection to Supavisor, five-second connection and eight-second query timeouts. Workerd sockets must not be shared between requests.

The `bye_review_gateway` login role can execute only `review_private.gateway`; it has no table access, Auth access, owner-role membership or moderation privilege. The non-login `bye_review_owner` owns private tables/functions and has explicit review-table permissions and RLS policies. Function entry points live outside exposed API schemas; do not add `review_private` to Supabase's exposed schemas. Public functions' default EXECUTE privileges are revoked. Operator operations use an independently supplied administrator connection, never the runtime connection.

The key fingerprint stored during backfill is checked on every gateway operation. Missing/changed keys fail closed. **Do not rotate the identity key by deploying a new random value**: without addresses, bulk recomputation is impossible. Keep the stable key across deployments. Loss requires disabling writes and an explicitly designed identity-recovery process; never let it silently reset bans/duplicate rules. Database passwords and Brevo API credentials can rotate independently.

## Limits and failures

- Code sends: five per IP per ten minutes, four per mailbox per thirty minutes, sixty-second mailbox cooldown.
- Code checks: twenty per IP per ten minutes, ten per mailbox per fifteen minutes, five guesses per challenge.
- Review submissions: ten per IP and private author per hour; reports: twenty per IP and private author per hour.
- Centralized counters contain only keyed identifiers, author UUIDs and bounded route labels. Expired counters are pruned; the daily delivery counter lasts twenty-four hours.
- A shared three-hundred-send daily budget bounds delivery attempts on the existing free-tier allowance; other senders using that Brevo account still share its provider quota. Confirm the actual account quota before rollout. No automatic delivery or submission retries occur.
- All mailbox operations serialize with a database advisory lock. Ban and write functions lock the identity row before proceeding. Successful verification consumes the challenge and creates the session in one transaction. Incorrect attempts return errors without rolling back the guess counters.
- A failed/uncertain email request cancels its challenge where possible. A received but cancelled code cannot sign in. Provider failures are sanitized.
- Banned addresses receive the same send response; the restriction is disclosed only after a correct code. A second genuinely different school mailbox can still evade a mailbox ban.

## Rehearsal and rollout order

Schema source remains in the sibling app repository's `supabase/` folder. The website's normal build/unit/browser checks do not import that repository. The explicit database rehearsal accepts its path:

```sh
pnpm test:reviews:db ../BYE_Before_You_Enroll/supabase
```

The two new migration files are **staged operations**, not a command to run `supabase db push` against the existing manually provisioned project. Legacy SQL files are not CLI migration-history entries. Establish the target's current schema/history first; apply reviewed files individually through the existing operator workflow. The prepare file expects the no-plus-alias rules from `006`.

1. Complete local tests and review both SQL files. Before hosted changes, obtain authorization for the exact target, schema preparation, credentials/settings, preview deployment, cutover and cleanup as applicable. Do not enable paid resources.
2. Set `REVIEWS_ENABLED=false` for the affected review site during the migration window. Disable legacy deployments/preview writers; do not assume changing local files changes hosted flags. Public reading can resume after the new configuration is complete.
3. Apply the `*_private_review_verification.sql` prepare migration. It does not change review foreign keys or disable legacy writes, and `config.ready` is false. Provision a strong password on `bye_review_gateway` privately, for example with an authenticated operator's `psql` `\password bye_review_gateway` prompt. Do not paste passwords into committed SQL. Confirm the runtime credential cannot assume the owner/admin roles or read tables.
4. Supply the stable key and administrator TLS connection as `REVIEW_IDENTITY_SECRET` and `REVIEW_MIGRATION_DATABASE_URL` to the explicitly invoked tool. Run `pnpm reviews:admin backfill`. It reads old addresses only in process memory, preserves UUIDs, writes keyed identities, logs no addresses/identifiers, and refuses a changed key or a completed cutover. Unique mailbox conflicts stop the transaction for manual investigation; never merge students or delete content automatically.
5. Apply `*_private_review_cutover.sql` only after its separate authorization. Its guards reject incomplete backfill and new or changed confirmed accounts. It replaces Auth foreign keys with private identity references and revokes legacy RPC/report writes. No Auth users are deleted. Existing browser sessions must verify again.
6. After authorization, enable Supabase Cron if needed and schedule exactly one job:

   ```sql
   select cron.schedule('bye-private-review-prune', '*/15 * * * *', 'select review_private.prune()');
   ```

   Inspect existing jobs first to avoid duplicates. Monitor failures and expired-row counts without logging row contents.
7. Deploy to an authorized isolated preview with fictional students. Confirm the real pg pooler/TLS path, database grants, key fingerprint, Brevo sender/API access, browser cookies, concurrent verification and ban/write races across independent connections. Real delivery tests require separate authorization; no production student accounts are used as fixtures.
8. After explicit production deployment/cutover authorization and successful acceptance, configure the production secrets, deploy the new server/form, and re-enable reviews. Preserve demo/noindex, source-access gates, download settings and update assets. Cloudflare Pages currently uses dashboard production settings; updating a checked-in Wrangler template alone does not provision those settings. Ensure Node compatibility is enabled for Pages compilation/runtime.
9. Run read-only aggregate verification: review/report/answer counts and checksums, orphan counts, legacy permission denial, private-schema exposure/grants, no raw addresses in new SQL requests/logs, and pruning health. On an approved fixture, verify code expiry/replay, one-success concurrent verification, ban persistence and immediate write denial. Only record aggregate evidence.

## Existing email cleanup — separate destructive approval

Old Auth addresses remain after cutover. Request approval for an explicit candidate list/count of **BYE review accounts only**. Accounts used elsewhere must be excluded. Verify no review/report foreign key still references Auth, audit all other Auth foreign keys/storage ownership, and revoke affected sessions before deleting users through the supported Supabase Admin API/operator workflow. Never use an unscoped `delete from auth.users` on the hosted project. No cleanup command is automated by this change.

Disable the old review email-sign-in configuration/deployments so it cannot collect addresses again; check whether the Supabase project has other Auth consumers before altering global settings. Review Auth identities/audit records, Supabase logs/backups, Brevo logs/previews and exports separately. Use provider-supported retention controls, confirm the account's available settings, and document residual backup retention before claiming removal. Do not alter the unrelated Kit newsletter signup/contact list.

## Ban and unban

Use the private operator tool with `REVIEW_MIGRATION_DATABASE_URL` supplied securely. Set `REVIEW_MODERATION_REASON` to a short policy-based reason without addresses or other personal information. Set `REVIEW_HIDE_IDS` to the comma-separated UUIDs you explicitly choose to hide, or leave it empty. Selected IDs must belong to the author of the reference review.

```sh
pnpm reviews:admin ban REVIEW_UUID
pnpm reviews:admin unban REVIEW_UUID
```

Ban revokes all sessions for that private author, blocks new verification sessions/submissions/reports, and hides only the selected reviews. Clear `REVIEW_HIDE_IDS` before unbanning. Unban restores posting eligibility but leaves hidden reviews hidden. The private audit records action, reason, selected IDs, timestamp and operator login, without email. No public moderation endpoint is added. Negative opinions alone are not evidence of abuse.

## Rollback

`pnpm reviews:admin disable` sets readiness false and revokes sessions/challenges without deleting reviews, private identities or bans. Also disable hosted review flags if needed. Keep all legacy write grants revoked after cutover. After email cleanup, rollback means temporarily unavailable verification/writes, never restoring email Auth or recollecting addresses automatically. A content-free backend rollback requires deliberate compatibility work; do not run schema downs or restore an old writer.

## Verification record

Local validation completed: website typecheck and operator-tool TypeScript check; 82 unit tests; build/static route checks; 90 isolated PostgreSQL assertions; compiled review and source workerd checks; review browser checks in Chromium/WebKit at 390px and 1280px; demo checks at 375px/390px/1280px; and combined app checks at 390px/1280px. Review screenshots were inspected with reduced motion, keyboard course selection and HttpOnly/storage checks. No production requests or mutations were used for these checks.

PGlite executes the real PostgreSQL migration/functions and role tests, but serializes statements; Promise.all replay checks are not proof of independent-connection concurrency. The compiled workerd test uses an explicitly separate fixture adapter in ignored `.wrangler/` output. The production bundle has no fixture env flag or store binding. Local fixture success does not prove hosted email delivery, pg TLS/pooling, cron execution or multi-connection race behavior.
