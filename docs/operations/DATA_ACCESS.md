# Source access and runtime evidence

Updated October 16, 2026. **Live release remains blocked.**

## PCC

- Local Node 24 probe succeeded against the public `getClassScheduleTerms` and `classSchedule/202710` endpoints.
- Semester response: 717 bytes, 10 rows, about 218 ms including download.
- Winter 2027: 2,921,162 bytes, 1,280 rows, about 573 ms including download; local JSON parsing about 12.69 ms.
- All 1,280 rows supplied `seatsAvail`, `maxEnrl`, `waitCount`, `waitCapacity`, `ptrmDesc`, `campDesc`, and `creditHrLow`.
- These are observations from this Mac, not a benchmark, latency promise, Cloudflare test, or authorization to republish.
- PCC permitted-use confirmation: **pending**.
- Cloudflare deployed runtime / free-tier verification: **pending**.

Probe: `pnpm verify:pcc -- 202710`. It prints aggregate metadata, not instructor rows. The source adapter bounds body size and strips unused fields before caching.

## Rate My Professors

Official terms: https://www.ratemyprofessors.com/terms-of-use

The terms inspected during planning require prior permission for automated access. The desktop GraphQL adapter is only a technical reference. No RMP live retrieval was performed for this implementation.

Owner-maintained access record (not yet supplied):

- Permission reference: **pending**
- Authorized website and method: **pending**
- Display rights for ratings and original review text: **pending**
- Cache retention, deletion requirements and traffic limits: **pending**
- Required attribution: **pending**
- Cost within the free beta budget: **pending**

The adapter remains disabled and retention defaults to zero. Its current technical ceilings are not a substitute for permitted limits: any tighter agreement must be enforced before staging. If the authorized integration differs from the reference GraphQL method, implement that adapter and verify its contract before enabling it.

## Cloudflare

Wrangler reported no authenticated account on this Mac. No infrastructure was created, paid plan enabled, or hosted deployment performed. Local dry runs, runtime tests and browser fixtures do not satisfy the deployed staging gate. Separate preview and production source bindings are provided in configuration.


## Full-app local follow-up

The real local workerd PCC probe initially returned 403 with default headers.
It returned 200 after adding JSON Accept and honest BYE-Web/0.1 identification.
The actual local Pages/source pipeline then returned ten terms and Winter 2027
MATH 005A with eight sections/seven professors. This does not establish permitted
use or hosted Cloudflare access. RMP stayed disabled; no live RMP request occurred.
The BYE API resolver and empty-state rating reads also succeeded against Supabase.
Cloudflare CLI is now authenticated; the approved owner preview has since been deployed; see the dated results below.

Jack explicitly requires fixture/saved-data testing to avoid adding RMP traffic.
Automated acceptance uses fictional source responses; live RMP remains disabled.
A targeted search of official PCC pages did not establish a specific API-use
agreement. PCC permitted-use confirmation remains pending rather than inferred
from successful public endpoint access.


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

## Owner go-live decision — October 16, 2026

Jack decided to switch the website from fictional demo data to live data before the source gates were met:

- **PCC:** live schedules are used without a confirmed permitted-use agreement, accepted while the user base is small. `pccUseVerified` stays false.
- **RMP:** retrieval is turned on through the BYE source Worker without RMP permission. The inspected RMP terms require prior permission for automated access; this is a known, accepted risk, not a granted permission. `rmpPermissionRecorded` stays false and `RMP_PERMISSION_REF` names the decision, not a permission. Retention is 24 hours (`RMP_CACHE_SECONDS=86400`, matching the Mac app); request limits in `server/network.ts` are unchanged.
- **Reviews:** sign-in is open to any `@go.pasadena.edu` address (`REVIEW_ACCESS=students`).

Rollback: `RMP_AUTHORIZED=false` on the source Worker stops RMP calls; `LIVE_APP_ENABLED=false` on Pages stops all source operations; change `CACHE_EPOCH` to purge stored RMP data. Record any permission or takedown request here.

## Live web app paused — October 17, 2026

Jack decided to focus on the Mac app. The October 16 go-live decision above is **superseded**: the website keeps the fictional `/demo/` (labeled sample data) and the `/reviews/` form only. `LIVE_APP_ENABLED`, `RMP_AUTHORIZED` and RMP retention are off/zero in every Worker and Pages environment, so the website makes no PCC or RMP requests. The preview source Worker's `CACHE_EPOCH` was changed to purge RMP data cached during the October 16 preview check (purge runs when the object next starts). Review sign-in stays open to `@go.pasadena.edu` students (`REVIEW_ACCESS=students`).


## Shared schedule backend follow-up

Observed from the public PCC terms endpoint: nine terms currently have termDisplayControl=Y; Summer 2027 is N and is excluded. The shared Supabase backend's all-term schema and two-minute expiry policy are deployed; one-minute collection remains disabled pending measured capacity and source-access acceptance. The Supabase organization is Free. This observation does not resolve PCC permitted use, RMP permission, public activation or hosted acceptance gates. Website client changes are local only.

The shared backend recovery was verified at 2026-10-22T03:20:23Z: Fall published successfully with failures zero, and scheduled collection was restored. Source check size 12,255,655 bytes, total worker time 18.3 s, normalization 582 ms. This single run does not establish sustained one-minute capacity. All-term imports and 24-hour observation are pending.

## Current evidence — archived reference schedules
Shared backend API v8/sync v9 stores officially referenced semester dates, preserves validated historical catalogs, returns null enrollment availability for archives and stops archive demand/collection. Initial imports use a bounded 90-second read, subsequent checks 40 seconds; five-minute aggregate budget and fast-mode gate remain. Historical search is not evidence of present or future offerings. See the desktop service's docs/archived-semesters.md for source references, imports and verification limits. This does not authorize public website activation or establish source-use permission.
