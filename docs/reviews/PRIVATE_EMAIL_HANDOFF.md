# GitHub Desktop handoff — private mailbox verification

Changes were prepared locally; consult Git history for their commit status. Nothing was pushed, migrated or deployed. Website pushes to main deploy automatically: coordinate the reviewed migration window and production settings before authorizing a push. See [the rollout runbook](PRIVATE_EMAIL_VERIFICATION.md).

## Website repository

Include these source/config/documentation files:

- `.env.example`, `AGENTS.md`, `apps/web/AGENTS.md`
- `apps/web/reviews/main.tsx`, `packages/core/reviews.ts`
- `server/reviews.ts`, `server/review-identity.ts`, `server/review-store.ts`
- `package.json`, `pnpm-lock.yaml`, `wrangler.pages.jsonc`, `wrangler.reviews.jsonc`
- `scripts/private-review-admin.ts`, `scripts/private-review-database-test.ts`, `scripts/lib/private-review-migration.ts`
- `scripts/app-browser-acceptance.ts`, `scripts/review-browser-acceptance.ts`, `scripts/review-runtime-acceptance.ts`, `scripts/runtime-acceptance.ts`
- `scripts/prepare-app-preview.mjs`, `scripts/prepare-review-preview.mjs`, `scripts/review-dev.ts`, `scripts/review-preview.ts`
- `tests/reviews.test.ts`, `tests/bye-reviews.test.ts`, `tests/review-fixtures.ts`
- `docs/reviews/README.md`, `docs/reviews/REVIEW_SUBMISSION.md`, `docs/reviews/PRIVATE_EMAIL_VERIFICATION.md`, this handoff
- Generated review output: `public/reviews/index.html`, deletion of `public/reviews/assets/index-CIdyRqW9.js`, addition of `public/reviews/assets/index-YrKBlV7G.js`

The full build also regenerated `public/app/` and `public/demo/` from the checkout's pre-existing schedule/domain changes. Keep those generated changes with the corresponding schedule work, rather than selecting only their deletions. `public/index.html` has build-produced line-ending-only differences; it is not part of the privacy change.

Pre-existing source changes not authored by this task: `apps/web/src/schedule.ts`, `apps/web/tests/schedule.test.ts`, `packages/core/domain.ts`, `packages/core/vectors/format-label.json`. Preserve them and review separately. No release/download/update assets changed.

Summary:

```text
Implement private mailbox verification and review-author bans
```

Description:

```text
Replace review email Auth with server-keyed mailbox identifiers, direct Brevo codes, browser-bound challenges, revocable opaque sessions and centralized PostgreSQL limits. Add restricted gateway access, private moderation/backfill tools, privacy copy and staged rollout documentation.

Validated with typechecks, 82 unit tests, build/static checks, 90 isolated PostgreSQL assertions, compiled review/source runtime checks, and Chromium/WebKit review, demo and combined-app browser suites.

Local only. Hosted delivery, pooler/TLS, cron and independent-connection concurrency remain staging checks. Migration, deployment and old Auth cleanup require separate authorization.
```

## App repository

Include only:

- `supabase/migrations/20261021023510_private_review_verification.sql`
- `supabase/migrations/20261021023511_private_review_cutover.sql`
- `docs/private-review-verification.md`
- `docs/review-database-explained.md`

Leave the pre-existing Mac/Windows/API/UI work out of this commit. No native runtime source was changed for this task.

Summary:

```text
Prepare private review identities and guarded Auth cutover
```

Description:

```text
Add staged private review storage/functions, least-privilege roles, persistent mailbox bans and administrator moderation. Guard cutover with backfill/key/account-revision checks, preserve author UUIDs and content, replace Auth cascade references and revoke legacy write paths.

Validated through the website's isolated PostgreSQL rehearsal (90 assertions), including actual backfill code, permission denial, Auth deletion preservation, code/session expiry, bans, reporting and disable rollback. Native builds are unnecessary for these SQL/docs-only changes.

No live migration or Auth deletion performed. Backfill, cutover, deployment and cleanup remain separately authorized operations.
```

The shared parent note `claude-memory/bye-review-email.md` was also updated to distinguish this local implementation from the unchanged production Auth/SMTP flow.
