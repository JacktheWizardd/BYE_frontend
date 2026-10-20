# Security review: review sign-in and student emails

October 18, 2026. Scope: the `/reviews/` sign-in and submission API (`server/reviews.ts`, `server/bye-reviews.ts`), the
Supabase review database (`supabase/*.sql` in the app repository), the schedule Edge Function, and the site's
security headers. Goal: make sure an attacker cannot get students' email addresses, and find other abuse paths.

## Short answer

No path was found for an attacker to read student emails through the website or the database rules. Emails live
only in Supabase's `auth.users`. Public tables never expose `author_id` or `reporter_id`, and the API returns an
email only to its own signed-in owner (`/api/reviews/session`). The review found two medium issues (one student
acting as many, and weak sign-in rate limits) and missing security headers outside `/reviews/`. All three are fixed
in this change. The rest needs dashboard settings (see "Owner checklist").

## How it was tested

Everything ran in an isolated cloud session on copies of the code. Nothing reached the live site, Cloudflare,
Supabase or Brevo: no emails, accounts, reviews or deployments.

- Read the review API, database schema, RLS rules, grants and functions, and the schedule Edge Function.
- Scanned the full git history of both repositories for keys, project URLs and real addresses: none found.
- Ran the existing checks (typecheck, unit tests, compiled review runtime).
- Wrote attack tests against the real request handler with a recording fake Supabase: look-alike emails,
  cross-site requests, form and JSON tricks, prototype pollution, cookie tampering, filter injection, rate-limit
  bypass.
- Served the built site with Wrangler (Cloudflare's local simulator) and checked headers and rejections.
- Tested the database migration in PGlite (an in-memory PostgreSQL) with the repository's schema files.
- Checked every page in Chromium at 390px and 1280px.

## What was already solid

- Emails are only in `auth.users`; `author_id` and `reporter_id` are blocked by column grants.
- The session cookie is HttpOnly, Secure, SameSite=Strict, `__Secure-` prefixed and limited to `/api/reviews/`.
- POST requests need a same-origin `Origin` and a JSON body of at most 16 KB.
- The server refuses privileged Supabase keys; no key reaches the browser, and the Mac app embeds none.
- Search input can't inject PostgREST filters; unknown fields such as `author_id` and `is_hidden` are rejected.
- Sign-in responses are the same whether or not an account exists, so addresses can't be checked.
- Forged or tampered session tokens are passed to Supabase, which checks their signature.

## Findings and fixes

### 1. Medium: one student could act as many students (fixed)

PCC mail is Google Workspace, which delivers `jdoe+1@go.pasadena.edu` to `jdoe@`. Each alias signed in as a
separate student, so one person could review the same professor and course many times, or hide any review alone
(three reports auto-hide it).

- **Website:** sign-in rejects addresses with `+` before the `@` ("Use your school email without a + tag"), and a
  session for such an address no longer counts as a student. Workspace usernames can't contain `+`, so no real PCC
  address is excluded.
- **Database:** `supabase/006_pcc_student_no_plus_alias.sql` (app repository) makes `private.is_pcc_student()`
  reject the same addresses, so `submit_review` and the reports policy refuse them. **Not run yet**; the owner runs
  it in the Supabase SQL Editor.

### 2. Medium: sign-in rate limits were easy to get around (improved)

Limits were per IP, kept in memory per Cloudflare instance. In a test, 40 wrong-code guesses from 40 IPs all reached
Supabase. Supabase sees all traffic from Cloudflare's addresses, so its per-IP limits can't tell attackers from
students. Risks: flooding students with code emails and using up Brevo's 300 emails a day (sign-in down for
everyone), and guessing one student's 6-digit code (posting or reporting as them, not reading emails).

- **Per-email limits:** 4 code emails per 30 minutes and 10 code checks per 15 minutes for each address, on top of
  the per-IP limits. Rotating IPs no longer helps against one student. Trade-off: someone can briefly lock one
  student out, which is the usual cost of a guess limit. These limits still live in memory per instance.
- **Optional Turnstile bot check** before each code email. Off until `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`
  are set in Pages (setup in `docs/reviews/REVIEW_SUBMISSION.md`). The server confirms every token with Cloudflare, including
  its hostname and the `send-code` action, before counting the address. Turning it on loads a Cloudflare script on
  `/reviews/` only, an exception to the "no third-party requests" rule that is the owner's call.

### 3. Low to medium: no security headers outside `/reviews/` (fixed)

`/`, `/demo/` and `/app/` had no Content-Security-Policy and could be framed by other sites. Any script running on
this origin could call `/api/reviews/session` and read the signed-in student's email. No way to inject a script
was found (React escapes text; nothing renders raw HTML), so this is a safety net.

- `public/_headers` gives every page a CSP that allows only this site's scripts and connections and no framing,
  plus `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy`. `/reviews/` keeps its own
  stricter policy, adding only the Turnstile host.
- `verify:static` (part of `pnpm build`) now fails if the policy is weakened.
- **Owner decision:** the policy also blocks Cloudflare Web Analytics, which was found injected across the project.
  That matches the About page line "no tracking scripts". To keep analytics, allow its hosts and change that line.

### 4. Low: the schedule Edge Function holds the full service-role key (not changed)

That key bypasses all database rules and can read `auth.users`. Its public endpoint runs only one read operation on
the schedule schema, so it is fine today, but a bug or a leaked key there would expose every email. Later: move the
schedule data to its own Supabase project, or give the function a limited database role.

### 5. Info: addresses are stored for people who never finish signing in (not changed)

Requesting a code creates an `auth.users` row for any PCC address typed in. Consider deleting unconfirmed users
after 24 hours.

## Checks run for this change

- Typecheck clean; 75 unit tests pass, including new tests for `+` aliases, per-email limits and every Turnstile
  pass and fail case.
- `pnpm build` and `verify:static` pass; the compiled review runtime test passes.
- Chromium at 390px and 1280px: home, `/demo/`, `/app/`, `/reviews/` and the 404 page have no CSP violations, no
  third-party requests, no errors and no sideways scroll. Another site cannot frame `/reviews/`. The official review
  browser suite passes. With test Turnstile keys and a stand-in widget, the token is sent, renewed after each try,
  and Send stays disabled until the check passes.
- The 006 migration in PGlite: before it, a `+1` alias counts as a student; after it, aliases can't submit or
  report, normal addresses (including apostrophes) still can, it is safe to rerun, and permissions are unchanged.
- **Not run:** WebKit (not installed in the test environment), the live site (blocked by the test environment's
  network policy), real Cloudflare Turnstile, and the migration on the live database.

## Owner checklist (dashboards)

These matter more for email safety than the code does.

1. Run `supabase/006_pcc_student_no_plus_alias.sql` in the Supabase SQL Editor. Run the count query in its header
   first.
2. Turn on two-factor sign-in for Supabase, Cloudflare, GitHub, Brevo and the BYE Gmail account (it is the Brevo
   sender, and whoever controls it can likely reset the Brevo login). Remove members who don't need access.
3. Keep **Confirm email** on in Supabase Auth. If it is off, anyone can sign up with a password as any PCC address.
4. Shorten the email code expiry in Supabase Auth to about 10 minutes.
5. Change Supabase's **Site URL** from `http://localhost:3000` to `https://bye-before-you-enroll.pages.dev`.
6. Clear Supabase's Security Advisor, and check the API exposes only the `public` and `graphql_public` schemas.
7. Rotate any secret or service-role key that was ever pasted into a chat or file.
8. Brevo's Transactional → Logs hold every recipient address: keep that account locked down, and keep its Contacts
   list empty. Close the old Resend account if unused and revoke its API key.
9. Optionally create the Turnstile widget and add its two keys in Pages.
10. After deploying, run the read-only live test (sends no code emails and writes nothing) once the test environment
    may reach the live site.
