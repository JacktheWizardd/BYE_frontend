# BYE PCC web beta

The website repository now owns the landing page, browser application, portable domain code, Pages API, and source Worker. The native and Electron apps keep their existing implementations. No cross-checkout imports are required.

## Current release state

**Local preparation, October 20:** the source Worker now uses the shared schedule API adapter with server-side `BYE_SCHEDULE_API_URL` and `BYE_SCHEDULE_API_KEY`. Browser routes remain same-origin. Polling and local expiry preserve profile selections; semester discovery does not switch the chosen term. Unit, runtime, build and phone/desktop browser fixtures pass. Production flags and launch state were not changed; native Mac and real PostgreSQL concurrency verification remain separate.


**Live web app paused October 17, 2026 (see [Data access](../operations/DATA_ACCESS.md)).** The landing page links the fictional `/demo/` and the `/reviews/` form; `/app/` is disabled and unlinked. The real-data build at `/app/` starts only when the Pages API and source Worker enable it; RMP is independently gated. No live screen falls back to fictional evidence. Search and reading require no login. Writing/reporting use the separate school-email session; hosted AI and analytics are absent. BYE reviews now appear independently in professor pages; AI summaries and statistical comparisons remain disabled. A separate owner-only `/reviews/` form and `/api/reviews/*` API are prepared; they do not enable the live search app. See [Review submission](../reviews/REVIEW_SUBMISSION.md) and [review verification](../reviews/REVIEW_VERIFICATION.md) for the independent setup and evidence.

The gates in [release-readiness.json](../release-readiness.json) are evidence records, not permission grants. Editing a boolean does not establish access rights or complete staging acceptance. Run `pnpm verify:release` before preparing production activation.

## Local development

Requires Node 24 and pnpm 11.25.0. Dependencies are pinned in `pnpm-lock.yaml`.

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:runtime
pnpm build
pnpm test:browser
```

`pnpm dev` previews fictional data. `pnpm dev:live` previews the actual live UI and proxies `/api` to a local Pages runtime; without a configured API it shows an unavailable state. Test browser binaries are installed with `pnpm exec playwright install chromium webkit`.

The browser acceptance script serves the built website from loopback and supplies a **fictional test API**. It never retrieves PCC/RMP. Its passing result is local UI verification, not live staging acceptance. Screenshots go to ignored `test-results/`.

`pnpm dev:sources` starts the source Worker. For a local Pages process, bind `SOURCES` to `Sources@bye-sources-local` using Wrangler's `--do` option. Both configurations default to disabled; do not enable actual RMP requests without the access conditions below. The older root `wrangler.jsonc` remains the static backup Worker, while `wrangler.pages.jsonc` is the Pages configuration.

## Data path and interfaces

Browser `LiveBridge` owns each student's operation, queues, profile choices and cancellation. It implements the original `Bridge.command` / `subscribe` contract. A new search or changed profile invalidates previous work even if the network ignores cancellation. Shared source jobs can finish for other visitors; their result cannot overwrite the canceled browser operation.

Pages routes only `/api/v1/*` into Functions. One named PCC Durable Object shares source requests, cooldowns and evidence caching across visitors. Its Worker has no public retrieval endpoint. The source adapter uses fixed HTTPS hosts and fixed queries; visitors cannot supply URLs or GraphQL. The server derives instructor eligibility from the selected PCC course and verifies returned RMP IDs, full names, and PCC school identity before displaying evidence.

GET endpoints:

| Endpoint | Inputs | Result |
| --- | --- | --- |
| `status` | none | `enabled`, `rmpConfigured` |
| `terms` | none | published PCC terms |
| `courses` | `term`, `query` | course suggestions |
| `sections` | `term`, `query` | resolved course and instructors with sections |
| `candidates` | `term`, `course`, `instructor` | eligible, separate PCC RMP identities |
| `profile` | same + `id` | verified profile and up to 3 preview reviews |
| `reviews` | same + optional `cursor`, `filter`, `remaining` | at most 20 review records per page |

Data responses use `{ data, meta: { source, retrievedAt, stale }, warning? }`. Failures use `{ error: { code, message, retryable, retryAfter? } }` and appropriate HTTP status. `status` is the only endpoint usable while disabled. There is no user mutation API under `/api/v1/`. The separate `/api/reviews/*` API handles public BYE review reads and owner-only submission/reporting. See [full-app preview](LIVE_APP_PREVIEW.md) for its interfaces, local evidence and staged deployment.

`Section` now includes structured `days`, optional `details` (seats, capacity, waitlist, term part, campus, units), and source metadata. Unknown enrollment facts stay unknown; negative counts clamp to zero. Scores remain professor-wide while review filters identify course evidence. Class-day matching preserves the Mac rule: every selected day must match, fully asynchronous online sections always match, and unannounced days do not match a nonempty selection.

## Cache and traffic behavior

- PCC terms: six-hour freshness. Schedules: five-minute freshness, shared across searches. Failed refreshes may show data less than 24 hours old with an explicit stale warning; enrollment numbers are suppressed. Older data fails closed. Open browser reports also hide enrollment numbers once their five-minute freshness expires.
- The PCC adapter keeps only two normalized schedules in process, strips unused upstream fields, bounds streamed responses to 16 MiB, and uses a 35-second deadline.
- RMP caching defaults to **zero**. Set retention only to an interval permitted by the access agreement, at most 24 hours. No stale RMP fallback is used. Expired evidence is removed on access and by an hourly purge alarm.
- Cache blobs are chunked, with atomic replacement, so a whole semester is not placed into a single storage value.
- The source service permits 120 API operations per client per minute, up to 2,000 active client buckets, and 40 distinct in-flight cache fills. Client keys are daily IP digests, retained only in memory for the current minute, and never logged. These are abuse limits, not authentication; users behind campus NAT share a bucket.
- RMP transport shares two concurrent requests, at least 100 ms start spacing, a 60-request/minute upstream budget, up to three attempts, and source cooldowns. Operational minute counters reset after a Worker eviction or restart; they are not an account-wide billing cap.
- Browser preview concurrency is two; review jobs run one at a time after previews. Review retrieval stops at 50 source records per filter and rejects non-progressing cursors. Partial evidence remains available after failure.
- Logs contain operation name, HTTP status, elapsed time, evidence age and stale status. They omit names, queries, review bodies, client digests, and browser preferences. Source choices are kept only in each browser, scoped to PCC + name + subject, and reverified when used.

Monitor request counts, failures, latency, cache ages, and Durable Object/Workers free-tier usage in Cloudflare. Free-tier exhaustion may make the API unavailable; there is no automatic paid upgrade. Do not claim uptime or latency guarantees from fixture tests.

## Staging and production

1. Establish PCC permitted use and RMP authorization covering this website's retrieval, display, review text, retention, and required attribution. Record the reference and permitted limits in the owner-maintained access record. Do not send permission requests automatically.
2. Sign in with `pnpm exec wrangler login` and inspect the existing Cloudflare Pages project; preserve its name and update-feed domain. Confirm the account is on the intended free plan.
3. Deploy the source Worker to **preview** first with `pnpm deploy:sources:preview`. Its separate namespace and SQLite storage isolate preview from production.
4. Configure the preview source Worker's `RMP_PERMISSION_REF`, permitted `RMP_CACHE_SECONDS`, and `RMP_AUTHORIZED=true` only after access is established. Enable `LIVE_APP_ENABLED=true` in preview Worker and Pages bindings to test the full product. Do not store secrets in Git or browser bundles.
5. Configure the existing Pages project to use `wrangler.pages.jsonc`, build with `pnpm install --frozen-lockfile && pnpm build`, and continue serving `public`. Set Node 24 / pnpm 11.25.0 for its build environment. Verify that preview binds to `bye-sources-preview` and production binds to `bye-sources-production`.
6. Verify real PCC terms and representative courses, actual source identity/ambiguity, reviews, partial outages, cached searches and quota behavior in the deployed preview. Record the preview version and evidence in [release-readiness.json](../release-readiness.json) and `../operations/DATA_ACCESS.md`. A local Node probe or local workerd run is insufficient.
7. Complete real Safari phone gesture checks and desktop accessibility checks. Recheck `/download`, `/updates/appcast.xml`, old release assets, `/demo/`, and `noindex` before activation.
8. After all gates pass, deploy the production source Worker, configure its independent permission settings, and enable the production flags. Prepare the landing page's `/app/` links and honest beta copy as a separate reviewed activation change. The owner commits/pushes with GitHub Desktop; no automatic commit or push is part of implementation.

## Disable and rollback

Set `LIVE_APP_ENABLED=false` on **Pages** first and redeploy to immediately prevent API source operations. Set the same flag false on the source Worker for defense in depth. Disable `RMP_AUTHORIZED` if source access changes. If immediate cache deletion is required, change `CACHE_EPOCH` on the source Worker and redeploy; request `/api/v1/status` once afterward to instantiate the object and purge its previous storage. Permission settings alone do not purge previously stored evidence.

Return the landing page's web links to `/demo/` with sample-data labels if they were activated. Roll back Pages and Worker versions independently, retaining compatible API versions. Do not roll back, remove, protect, or hand-edit Mac update feeds, downloads or signing files. No site-wide access gate is needed.


## Full-app integration update

PCC/BYE browsing no longer requires RMP availability. The approved owner preview
keeps RMP disabled while permission is pending. See [owner preview](LIVE_APP_PREVIEW.md).
This does not satisfy or remove production release gates.

## Production Pages settings — October 17, 2026

Builds from `main` failed from `e79f6c5` on: Pages had no build command, so dependencies were never installed and `functions/` could not resolve `@supabase/supabase-js`. The project now uses build command `pnpm install --frozen-lockfile` (output `public`), `NODE_VERSION=22.23.3` and `PNPM_VERSION=11.25.0`, plus production variables `REVIEWS_ENABLED=true`, `REVIEW_ACCESS=students`, `SUPABASE_URL` and the secret `SUPABASE_PUBLISHABLE_KEY`. `LIVE_APP_ENABLED` is unset (off) and no `SOURCES` binding exists in production. Note: Pages reads only a root `wrangler.json(c)`/`wrangler.toml`; the root `wrangler.jsonc` is the backup Worker config, so `wrangler.pages.jsonc` values are documentation, not applied settings. Production deploy `5591a31b` (commit `29663bb`) succeeded; `/reviews/` and `/api/reviews/status` (enabled, students) respond, and `/download`, `/updates/appcast.xml` and `/demo/` are unchanged.

### October 21, 2026 — local Windows/web completion

The live results header now exposes Refresh and the source-check age. Refresh retains valid instructor/profile choices and does not select replacements. Hidden/offline transitions cancel active polling; Stop does not prevent seat/waitlist expiry. The legacy source retains its five-minute policy and shared schedule responses retain their explicit fifteen-minute deadline. Overview totals deduplicate co-instructor CRNs and never present a partial count as complete. Type checking, 96 tests, source builds, local workerd acceptance, Chromium/WebKit schedule checks at 375/390/1280 and review-flow checks at 390/1280 passed. Changes are local/uncommitted; source flags and deployment state are unchanged.


## Current state — all-semester freshness follow-up

The shared schedule backend has the multi-term schema and two-minute availability policy deployed. This repository's local client polls every fifteen seconds while visible/online, honors the shared deadline with a two-minute ceiling, and preserves valid profile choices. All published years are eligible for import. Faster source collection remains disabled pending capacity/source evidence; a sixty-second target is not a verified freshness guarantee. Ninety-eight local tests, typecheck/build, Pages/Worker acceptance, Chromium/WebKit at 375/390/1280px, and full-app recovery at 390/1280px passed. Public website/source flags and launch state are unchanged. Hosted import status is recorded in the sibling backend's docs/all-semesters.md.

## Current state — archived semester support, October 21, 2026
The local live-app source carries archive lifecycle metadata, groups archived terms, labels historical results and stops archive availability polling. API v8/sync v9 and official dates are deployed in the shared backend. This source is built and verified locally; the public website was not activated or deployed. Existing launch gates stay false. Chromium/WebKit archive acceptance passes at 390px and 1280px, in addition to the existing unit/build/runtime/browser suites.

GitHub Desktop Summary: Support searchable archived semesters in the live app

Description: Preserve archive metadata through the shared schedule adapter and same-origin API, group historical semester choices, show reference labels and stop archive availability polling. Add fictional archive browser acceptance covering phone/desktop layouts and no background polling. Verified 98 unit tests, typecheck/build, Pages/workerd runtime, existing browser suites and archive checks at 390px/1280px. Changes remain uncommitted; public deployment and source-access launch gates are unchanged.
