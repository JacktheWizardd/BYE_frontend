# Real BYE website: owner preview

The browser app is in this repository (`apps/web`), alongside the landing page.
The separate `BYE_Before_You_Enroll` repository owns the Mac app and database SQL.
Its old browser folder is a migration pointer, not a second implementation.

## What works

- `/app/`: actual PCC terms, course suggestions, sections, meeting-day/online
  filters, enrollment details, professor sorting, profile selection, cancellation,
  retry and source links. PCC/BYE browsing can start while RMP is disabled.
- Professor pages show BYE and RMP ratings/reviews separately. Their averages
  are never merged. RMP profile changes do not change the BYE catalog identity.
- BYE shows quality/difficulty averages and visible-review counts across all
  courses, course filters, six review sort modes, and 20-review pages.
- Write a review opens `/reviews/` with catalog IDs. After email verification,
  the server checks both IDs and returns the authoritative labels for prefilling.
- Reporting requires the verified configured owner, submits only review ID and
  reason, and uses the existing RLS policy and three-report auto-hide behavior.
- AI summaries, cached summaries, question distributions, Fisher tests and
  statistical verdicts remain disabled. The seven optional answers still save.
- `/demo/` remains fictional. Production navigation still points there.

## API additions

All new routes are under `/api/reviews/`, return uncached JSON, and require the
existing complete feature configuration. Reading does not require student login;
mutations remain restricted to the configured owner during the preview.

| Route | Method | Inputs / behavior |
| --- | --- | --- |
| `resolve` | GET | `instructor`, `course`; unique normalized full-name and course matches, or explicit missing/ambiguous result |
| `profile` | GET | `professorId`; visible review averages/count and course labels/counts |
| `list` | GET | `professorId`, optional `courseId`, `sort`, `offset`; 20 reviews and `nextOffset` |
| `selection` | GET | Verified session plus `professorId`, `courseId`; validated catalog records for form prefilling |
| `report` | POST | Verified session, matching Origin and JSON `{reviewId, reason}`; no caller-supplied reporter identity |

`sort` supports `recent`, `oldest`, `highest`, `lowest`, `difficulty`, and
`highestDifficulty`. Ratings are BYE quality; difficulty sorts use difficulty.
Pages have a stable ID tie-breaker; the browser deduplicates IDs. Concurrent
inserts/deletions can shift offset pages: refresh to obtain a fresh listing.

The server explicitly selects permitted review columns and filters hidden rows;
RLS also applies. It never reads author IDs or report records. Reporting validates
UUID, a nonempty reason up to 500 characters, and current review visibility.
Duplicate reports and unavailable reviews have distinct outcomes. It never
retries writes automatically or returns private upstream errors.

Ratings are computed in 1,000-row batches to avoid silently averaging only the
first PostgREST page. Above 10,000 visible reviews for one professor, ratings fail
closed while review browsing remains available. Aggregates are fresh reads rather
than a database snapshot across pages. No migration or privileged database key.

Matching uses the full normalized name, never department or rating as a tie-break.
Capped candidate results cannot establish uniqueness. Names merged by the original
seed cannot be distinguished by this integration; correcting those identities is
future catalog work. Missing names/ambiguous course aliases are never guessed.

## Local preview

```sh
pnpm dev:app:api
```

Open `http://127.0.0.1:8788/app/`. This runs the actual compiled Pages function and
SQLite Durable Object locally. PCC is enabled only by this explicit development
command; RMP is forced off. Reviews use ignored `.dev.vars` configuration. Local
HTTP cookies are allowed only on loopback. No credentials are printed.

The PCC adapter now supplies `Accept: application/json` and an honest
`User-Agent: BYE-Web/0.1`. A real local workerd probe received 403 without those
headers and 200 with them. This is not evidence of hosted Cloudflare access.

## Hosted preview preparation and approval

```sh
pnpm prepare:app:preview
```

This stages `.wrangler/app-preview`, including the compiled Pages function and a
source Worker dry-run bundle. It does not deploy or copy credentials. Both API
flags remain disabled in the staged config. Both binding contexts point to
`bye-sources-preview`, never the production namespace.

Before upload, obtain owner approval, sign in to Cloudflare, inspect the existing
`bye-before-you-enroll` Pages project and free plan, and resolve PCC permitted-use
requirements. Cloudflare CLI sign-in succeeded; the existing Pages project and production branch were confirmed. Do not update production settings.

After approval, deploy only the preview source Worker, configure its preview
`LIVE_APP_ENABLED=true` with `RMP_AUTHORIZED=false`, and configure only the staged
Pages preview with the project URL, publishable key, owner email and both enabled
flags. Keep credential values out of Git and browser bundles. Use:

```sh
pnpm exec wrangler pages deploy public --cwd .wrangler/app-preview --project-name bye-before-you-enroll --branch full-app-owner-test --commit-dirty=true
```

The installed Wrangler does not support custom `--config` paths for Pages
commands; the staged standard `wrangler.jsonc` supplies the preview configuration.
Hosted URLs are unlinked test URLs, not an access-control boundary. Public reads
are intentional; only the configured owner can verify email, submit or report.

Record hosted PCC/Supabase behavior, mobile accessibility and free-tier evidence
before activation. RMP remains disabled until permission and allowed retrieval,
display and retention limits are recorded and the integration is verified.
Production release still requires the existing readiness gates and explicit
approval to change navigation. There are no commits or pushes in this workflow.

## Verification and remaining work

Local TypeScript and all three builds pass. The full unit suite has 68 passing
checks. Combined browser acceptance passes in Chromium/WebKit at 390 and 1280px:
independent sources, safe written text, pagination/sorting, verified prefill,
reporting, and source-failure recovery. Original browser and review-form suites
also pass. Compiled Pages/SDK tests cover read/resolve/prefill/report paths;
compiled source tests prove PCC sections remain available with RMP disabled.

Real local workerd reads return ten published PCC terms and Winter 2027
MATH 005A with eight sections/seven professors. The new BYE catalog resolver
matches the known test professor/course. Jack previously completed a real
email-code submission. A later public read returned zero visible reviews for
that test professor; administrator confirmation of test-row cleanup remains
pending because public RLS cannot distinguish hidden from deleted rows.

Real local read-only browser acceptance also passed in Chromium/WebKit at 390
and 1280px; those sessions made no mutations. Future automated testing uses saved
fixtures/fictional responses, per Jack’s request not to add traffic to RMP. No live
RMP retrieval was performed.

The owner preview is deployed and its hosted routing/layout checks pass. Source permissions, full free-tier usage acceptance and physical Safari gestures remain unverified. General student delivery still requires a verified sender
domain. Mac integration and statistical comparisons are separate future work.

Rollback: disable Pages flags, then source Worker flags, and redeploy the preview.
Preserve `/download`, updates, release files, `/demo/`, noindex, database policies
and Jack's real student account. Never delete users as review-test cleanup.


## Owner-preview deployment preparation

Jack approved deploying only the preview Worker and full-app-owner-test Pages
branch, with PCC and RMP disabled pending source-use requirements. The existing
production project serves public/ on main. Worker account settings were readable,
but the subscriptions API returned 403; the owner subsequently confirmed Workers Free before upload. No paid upgrade is authorized.


## Approved hosted preview — October 16, 2026

- Owner confirmed Workers Free in the dashboard. Billing API access remained
  unavailable; this confirmation is not a full usage/quota audit.
- Deployed source Worker `bye-sources-preview`, version
  `6dbf78c1-82cb-4fef-89a3-0fb1110026a2`. PCC and RMP flags remain false;
  RMP retention stays zero and its public Worker route stays disabled.
- Deployed Pages branch `full-app-owner-test`: [preview](https://full-app-owner-test.bye-before-you-enroll.pages.dev/reviews/),
  immutable build [https://9b8fd48a.bye-before-you-enroll.pages.dev](https://9b8fd48a.bye-before-you-enroll.pages.dev/reviews/).
- BYE review routes are enabled for the configured owner; hosted local-HTTP
  override is absent. Public BYE reads are intentional, not a site-wide login gate.
- Hosted GET checks passed: review UI, BYE status/session/ratings/list, disabled
  PCC status/terms, and authentication-required selection. Non-PCC email sending,
  cross-origin requests and unauthenticated submit/report were rejected before
  any email or database write.
- Chromium/WebKit at 390 and 1280px passed hosted login layout, disabled-source
  behavior and demo navigation, with zero POSTs and zero third-party responses.
- Found preexisting project-wide Cloudflare analytics injection. The staged
  preview now adds no-transform and self-only script/connect CSP headers; the
  final browser checks show no analytics calls. Production settings and source
  `public/_headers` were not changed. Keep these preview headers during rollback.
- Production branch, canonical deployment, complete production configuration
  hash, landing/demo/update-feed hashes and download availability matched the
  pre-deployment baseline after the final upload.
- No live RMP or PCC retrieval, login code, review submission or report was
  requested by these hosted checks. No commits, pushes or paid upgrades.

Remaining: owner manually verifies school-email login on the hosted domain;
authenticated hosted prefill/reporting and any new review-write test require
explicit owner action/approval. Existing fixture tests cover those flows. PCC
permitted use, RMP permission and full hosted source/free-tier acceptance remain
production gates. The full class-search page intentionally stays unavailable
while PCC is disabled; the existing demo remains usable.

## Go-live preview deployment — October 16, 2026 (Claude)

- Source Worker `bye-sources-preview` version `1ea68688`: `LIVE_APP_ENABLED=true`, `RMP_AUTHORIZED=true` (owner decision, see DATA_ACCESS.md), `RMP_CACHE_SECONDS=86400`.
- Pages branch `full-app-owner-test` deployment `7b8f86ce`: live app, `REVIEWS_ENABLED=true`, `REVIEW_ACCESS=students`.
- Hosted `/api/v1/status` and `/api/reviews/status` report enabled; landing page shows `/app/` and `/reviews/` links.
- A small number of real source requests were made during this check (PCC terms + one MATH 005A schedule; RMP candidates/profile for MATH 005A professors from one search). Jack then directed fixture-only testing; no further live checks. Future verification uses repo fixtures only.
- Fixed after deploy, not yet redeployed: "would take again" percentages are now rounded.
- Follow-up: preview `RMP_AUTHORIZED=false` (source Worker `6b2835b7`); Pages `5098207b` includes the rounding fix. Production config keeps the owner's RMP decision. No live checks were run for this redeploy. RMP responses cached during the earlier check remain in preview storage until they expire (24h) or `CACHE_EPOCH` changes.
- 2026-10-17: live app paused. Preview source Worker `fb1980d5` (all source flags off, new `CACHE_EPOCH`), Pages `4f0bb043` (demo + students reviews). No live checks.
