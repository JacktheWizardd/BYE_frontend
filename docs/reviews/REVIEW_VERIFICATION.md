# Review submission verification

Local implementation verified October 16, 2026. Local checks and the real owner submission are recorded separately below.
Hosted deployment and cleanup remain pending.

## Completed checks

- Website TypeScript check and all three builds: demo, live app, and reviews.
- Full unit suite: 61 tests passed, including 11 review API tests.
- Compiled review API passed in local workerd with the real Supabase SDK and
  fictional outbound Supabase responses.
- Review browser tests passed in Chromium and WebKit at 390px and 1280px.
  Covered email rejection, incorrect codes, verification, HttpOnly cookies,
  keyboard catalog selection, skipped versus neutral answers, confirmation,
  expired-session recovery with draft preservation, receipt, and sign-out.
  Additional cases covered catalog-load recovery and blocking another submission
  after an uncertain save.
- Existing runtime suite passed, including source API gating and shared-cache
  behavior. No real PCC or RMP requests were made by those tests.
- Existing browser suite passed in Chromium/WebKit at 375px, 390px, and 1280px.
- Actual local preview returned HTTP 200 for `/reviews/` and `/api/reviews/status`,
  with the review feature disabled as intended.
- The supplied publishable key successfully read the real database catalogs:
  1,425 professors, 1,531 courses, seven dimensions, and no query errors.
  This was a read-only check; no sign-in email or review was created.
- Review assets contain no configured tester address, project URL, or key.
  `.dev.vars` is ignored by Git. The Supabase SDK is server-only.
- Landing-page source, download redirects, and release assets were not modified.
  The static verifier checks noindex, routes, sample/live separation, and release
  paths.

## Real owner test

- Jack reported saving Resend SMTP and both code templates, then completed the
  website flow and supplied its receipt ID.
- Read-only Supabase verification of that exact ID found one visible review with
  the server-added temporary-test label, quality 1/5 and difficulty 5/5.
- All seven answers were saved: attendance +1, clarity +1, feedback speed 0,
  grading 0, test alignment 0, textbook -1 and workload -1. The counts view
  matched each answer, including neutral answers in the answered denominator.
- The agent did not request or receive the email code, password, or user token.
- Exact-review cleanup is prepared for owner execution; the real account stays.

## Remaining acceptance

- Jack reported saving Resend SMTP settings and both Confirm signup and Magic Link
  code templates. Delivery and the email-confirmation setting still need verification.
- Local owner-only preview enabled for the requested real email test; no email
  requested by the agent. Hosted defaults remain disabled.
- Owner approves deleting exactly that review; dependent test answers/reports are
  removed without deleting the school account.
- Approved Cloudflare preview deployment and hosted end-to-end acceptance.
- Physical Safari/mobile gestures and a manual accessibility check.

The first release stays restricted to the configured tester. No commits, pushes,
database migrations, paid upgrades, or production activation are part of these
local implementation checks. See [setup and test procedure](REVIEW_SUBMISSION.md).


## Full-app integration follow-up

The integrated reading, prefilling and reporting implementation is locally verified;
see [full-app preview evidence](../web-app/LIVE_APP_PREVIEW.md). A later public read found no
visible review for the earlier test professor. This alone does not prove deletion
because RLS hides moderated rows; administrator cleanup confirmation is pending.

Final full-app checks: 68 unit tests, type checks, builds, combined browser
acceptance, and compiled read/report/source-gating runtime tests passed. All RMP
acceptance was fixture-only; RMP made no live requests.


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
