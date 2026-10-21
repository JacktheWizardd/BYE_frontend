# Website review submission

> October 20, 2026: the locally implemented replacement uses private mailbox verification, opaque sessions and direct Brevo delivery. It has not been migrated/deployed. See [current private-email runbook](PRIVATE_EMAIL_VERIFICATION.md) for required configuration and staged rollout. The older Supabase Auth/SMTP instructions below describe the deployed legacy flow and must not be used to configure the replacement.

The owner-only review page lives at `/reviews/`. It uses the existing Supabase
review database and works independently of the gated PCC/RMP search app.
Students verify their school inbox with a code; there are no passwords or profile
screens. This implementation is prepared locally, not a public launch.

## What the page does

1. Enter the configured tester's `@go.pasadena.edu` address.
2. Request a code and enter it from that school inbox.
3. Search the seeded PCC course and professor lists and explicitly select each.
4. Choose quality and difficulty, optionally answer the structured questions, and
   add an optional comment.
5. Check the review before submitting. Keep the returned review UUID.

“Skip this question” sends no answer. “In the middle” sends zero. The labels come
from the live `dimensions` table, not a second database definition. A test prefix
is added to every saved comment so this first test cannot be mistaken for an
ordinary student review. Its length is reserved from the database's 2,000-character
limit. The first form offers 1,967 comment characters plus the automatic prefix.

No professor is automatically chosen or recommended. The database has separate
professor/course lists, not an enrollment roster or a verified teaching history.
School email access does not prove enrollment or attendance in a specific class.

## Configuration

Copy `.env.example` fields into ignored `.dev.vars` for local development. Do not
overwrite an existing file or paste a secret/service-role key. A local tester
address may already have been supplied; it must stay out of Git.

| Variable | Meaning |
| --- | --- |
| `REVIEWS_ENABLED` | `false` by default; enable only for an approved test |
| `REVIEW_TEST_EMAIL` | Exact owner school address; required and checked on send, verify, and authenticated requests |
| `SUPABASE_URL` | Hosted project's `https://PROJECT.supabase.co` origin |
| `SUPABASE_PUBLISHABLE_KEY` | Publishable key or legacy anon key; privileged keys are rejected |
| `REVIEW_LOCAL_HTTP` | `true` only for loopback HTTP development; ignored on other hosts |
| `TURNSTILE_SITE_KEY` | Optional. Public Turnstile site key; with the secret below, a bot check runs before each code email |
| `TURNSTILE_SECRET_KEY` | Optional. Turnstile secret key, set as an encrypted Pages secret, never committed |
| `LIVE_APP_ENABLED` | Keep `false`; review submission does not need the source API |

All configuration is server-side. The browser talks only to `/api/reviews/*`.
Deploy the owner email and keys through Cloudflare's environment settings, not a
committed config file. SMTP credentials are entered in Supabase only.

## Bot check before code emails (optional)

Every code email counts against Brevo's 300 a day, which all students share. Without a bot check,
someone using many IP addresses can use up that quota, or flood one student's inbox. The server
limits each IP and each address, but those limits live in memory on each Cloudflare instance.

To require a Cloudflare Turnstile check before a code is sent:

1. In Cloudflare, open **Turnstile**, add a widget for `bye-before-you-enroll.pages.dev`
   (Managed mode), and copy its site key and secret key. Turnstile is free.
2. In the Pages project, under **Settings → Variables and secrets**, add `TURNSTILE_SITE_KEY` as
   text and `TURNSTILE_SECRET_KEY` as an encrypted secret for Production. Redeploy.
3. Open `/reviews/` and check that the widget appears above **Send a code** and that a code arrives.

The server checks every token with Cloudflare, including that it was issued for this site and the
`send-code` action. Verifying a code needs no new check. With either key missing, the check is off
and the page loads nothing from Cloudflare. Turning it on means `/reviews/` loads a script from
`challenges.cloudflare.com`, which `public/_headers` already allows on that page only. To roll back,
delete the two variables and redeploy.

Students with a `+` in their address (`name+tag@go.pasadena.edu`) are refused. Google Workspace
delivers those to `name@`, so each tag would otherwise count as a separate student.

## Email setup for the first real test

Get owner approval before changing authentication/email settings. Keep the
existing settings available for rollback.

1. Create a free Resend account using the same school address as
   `REVIEW_TEST_EMAIL`. Verify that address with Resend. This is an owner service
   account, not an account every BYE student has to create.
2. Create a Resend API key with sending access. Do not paste it into this repo or
   chat. If Resend requests a paid upgrade, stop; no purchase is authorized.
3. In Supabase's Authentication email settings, configure custom SMTP:
   host `smtp.resend.com`, port `465`, username `resend`, password the Resend key.
   For this owner-only test use sender `onboarding@resend.dev` and sender name
   `BYE`. The test sender can deliver only to the address associated with the
   Resend account. Confirm that exact address before sending.
4. Keep email confirmation enabled. Make the relevant **Confirm sign up** and
   **Magic link or OTP** templates contain a code rather than require a link:

   ```html
   <h2>Your BYE sign-in code</h2>
   <p>Enter this code in BYE: {{ .Token }}</p>
   <p>If you did not request this code, you can ignore this email.</p>
   ```

5. Send one code through the actual BYE page. Check the school inbox/spam folder
   and Resend delivery status. Never auto-confirm the real school account to
   bypass a delivery or verification failure. Codes are entered by the owner.

Resend's normal SMTP setup documents a verified-domain prerequisite. Its
`resend.dev` test exception is limited to the account's own address. If that
exception is unavailable for the account, pause and diagnose the sender setup;
do not claim real delivery passed. General student access remains blocked until
a domain is verified and the owner explicitly approves expanding the test.

References: [Supabase email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[Resend SMTP](https://resend.com/docs/send-with-supabase-smtp),
[Resend test sender limits](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).

## API and session behavior

| Route under `/api/reviews/` | Method | Purpose |
| --- | --- | --- |
| `status` | GET | Whether the complete, enabled test configuration exists |
| `auth/send` | POST | Request a code for the allowed school address |
| `auth/verify` | POST | Verify code and set the browser session cookie |
| `session` | GET | Check the session against Supabase's current user record |
| `auth/signout` | POST | Clear this browser's session cookie |
| `courses?q=…` | GET | Search course code/title, at most 20 matches |
| `professors?q=…` | GET | Search name tokens, at most 20 matches |
| `dimensions` | GET | Ordered question names and labels |
| `submit` | POST | Validate form and call existing `submit_review` RPC |

Except `status` and authentication, routes require a confirmed session matching
the configured tester. POSTs require a same-origin `Origin` and JSON content.
Catalog lookups use validated, bounded searches. Requests time out, reject
redirects, and never automatically retry a submission. Responses use
`{ data: ... }` or `{ error: { code, message, retryable, retryAfter? } }` and
`Cache-Control: no-store`. Upstream error text is not exposed.

The server uses request-scoped Supabase clients with persistence/refresh disabled.
Only the short-lived access token is stored in a Secure HttpOnly SameSite cookie;
no refresh token reaches browser storage or JSON. Local loopback development has
an explicitly enabled non-Secure cookie. An expired session asks for a new code
while keeping the open form. Sign-out clears the current browser cookie; it does
not promise immediate revocation of an already copied access token.

The server passes the student JWT to the RPC. It never accepts an author ID or
uses elevated database credentials. Existing database restrictions remain the
final authority. A duplicate review is a readable conflict. An uncertain save
disables retry and tells the tester to inspect Supabase first.

## Local checks and preview

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:runtime
pnpm test:reviews:runtime
pnpm test:browser
pnpm test:reviews:browser
```

Browser/runtime checks use fictional Supabase responses. Passing them does not
prove delivery or a real database write. See [review verification](REVIEW_VERIFICATION.md)
for the current results.

For a real local test after approved SMTP configuration, fill in `.dev.vars`, set
`REVIEWS_ENABLED=true`, and run:

```sh
pnpm dev:reviews:api
```

Open `http://127.0.0.1:8788/reviews/`. This runs the built form and actual Pages
function. The Vite command `pnpm dev:reviews` is available for UI development.

`wrangler.reviews.jsonc` is the reviews-only preview configuration with no
Durable Object binding. Both feature flags default to false. After local checks,
get owner approval before any preview deployment or dashboard changes. Confirm
the existing Pages project is `bye-before-you-enroll` and target a preview branch,
never production. Preserve the existing production bindings and configuration.

The installed Wrangler does not support alternate Pages config paths. Run
`pnpm prepare:reviews:preview` to copy the built site and compiled Pages function
into ignored `.wrangler/reviews-preview/`, with a standard `wrangler.jsonc`
created from the reviews-only template. This command does not deploy or modify
existing Cloudflare settings, and its feature flags remain disabled.

After owner approval, configure only that staged config's preview variables for
the real test (project URL, publishable key, exact tester email, and
`REVIEWS_ENABLED=true`). Never add a service-role/secret key or SMTP credential.
Keep top-level production flags disabled. Inspect the staged configuration, then
target a preview branch explicitly:

```sh
pnpm exec wrangler pages deploy public --cwd .wrangler/reviews-preview --project-name bye-before-you-enroll --branch review-submission-test --commit-dirty=true
```

This command uploads the prepared preview; it must not be run without approval.
Do not deploy to the production branch or replace the source-app config.

Do not link this test from the public landing page yet. The `/demo/` sample app,
source-access gates, `/download`, and `/updates/appcast.xml` are unaffected. No
site-wide access gate or source Worker deployment is required.

## Verify and clean up the real test

Save the actual returned UUID. In Supabase SQL Editor as `postgres`, replace the
placeholder below with that UUID and read the saved review/answers:

```sql
select id, quality, difficulty, body, is_hidden
from public.reviews
where id = 'REPLACE_WITH_RETURNED_REVIEW_UUID'::uuid;

select dimension, value
from public.review_dimensions
where review_id = 'REPLACE_WITH_RETURNED_REVIEW_UUID'::uuid;
```

Check that the text includes the test prefix and that only answered questions
were saved. Read the professor's dimension counts and verify the expected totals.
After the owner approves deleting this test content, run:

```sql
begin;
delete from public.reviews
where id = 'REPLACE_WITH_RETURNED_REVIEW_UUID'::uuid
  and body like 'BYE website test, please ignore.%'
returning id;
commit;
```

Expect exactly the test ID back, then verify its review and answer rows are gone.
The existing foreign keys remove dependent answers/reports. Do not delete the
real school user or unrelated reviews. Keep review content and the school address
out of committed evidence; record aggregate results and pass/fail statuses only.

## Rollback

Set `REVIEWS_ENABLED=false` in the test environment and restart/redeploy that
environment. Revert approved email settings if necessary using the saved prior
values. A rollback does not automatically delete the test review; use the scoped
cleanup above after approval. Do not change the production source flags, update
feed, download assets, database schema, or intentional `submit_review` access.


## Integration into the live app

The form can now be opened from `/app/` with verified professor/course prefilling.
Professor pages read BYE ratings/reviews independently of RMP and offer owner-only
reporting. See [full-app owner preview](../web-app/LIVE_APP_PREVIEW.md) for new API routes,
source separation, identity limitations, tests and deployment preparation.
