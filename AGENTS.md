# BYE website — guide for AI coding agents

Read this before changing anything in this repository. It is written for any AI agent (Codex, Claude Code and others) and for people. **Keep the "Current state" section up to date whenever you change the site.**

## What this is

The public website for **BYE (Before You Enroll)**, a free tool that helps Pasadena City College (PCC) students compare class sections, professor ratings and student reviews before they enroll.

- Live at **https://bye-before-you-enroll.pages.dev**. Cloudflare Pages deploys every push to `main`, currently serving `public/`; the prepared web-beta build and Pages Functions configuration require owner rollout (see `docs/WEB_BETA.md`).
- About 80% of visitors are on phones, so the site is **mobile first**: base CSS is for phones, and `min-width` media queries (600px, 900px) add the tablet and desktop layouts.
- Visitors get three ways to use BYE:
  1. **On the web:** the web demo at `/demo/`, running on bundled, fictional **sample data**. Students can also write reviews at `/reviews/`.
  2. **Mac app:** a download for Apple Silicon Macs. **Paused since 2026-10-19** (`DOWNLOADS_OPEN = false`) while the app API is finished and the app is redesigned; the Mac card shows "Available soon" and a slim Kit email signup (`#updates`) sits under the install cards.
  3. **Windows app:** shown as "Coming soon" until the owner decides where to host the ZIP (it is too large for Cloudflare Pages).
- The app's source code lives in a separate repository, `BYE_Before_You_Enroll`, usually checked out beside this one (`../BYE_Before_You_Enroll`).

## Files

| Path | What it is | Edit by hand? |
| --- | --- | --- |
| `apps/landing/` | **Source of the home page** (React + Tailwind + GSAP + Lenis, Three.js lazy). `src/sections/` one file per section, `src/content/` copy, links and fictional sample data, `src/ui/` product mockups, `src/motion/` all animation | Yes |
| `public/index.html`, `public/site/` | **Generated** prerendered home page and its hashed assets. Rebuild with `pnpm build:landing` | **No** |
| `public/404.html` | Not-found page; standalone with its own inline CSS | Yes |
| `archive/landing-ivory/` | Backup of the previous hand-written landing page (2026-10-17). Not deployed | Only to restore it |
| `public/fonts/` | Self-hosted fonts (Schibsted Grotesk, Libre Baskerville, JetBrains Mono), all SIL OFL | Only to add or replace a font |
| `public/reviews/` | **Generated** owner-only review page; rebuild from `apps/web/reviews/` | **No** |
| `public/demo/` | **Generated** build of the web app. Never edit; rebuild it (see recipes) | **No** |
| `public/updates/` | Mac in-app update feed (`appcast.xml`) and signed update zips | **No.** Release script only |
| `public/downloads/` | Mac app DMGs | **No.** Release script only |
| `public/_redirects` | `/download` → newest DMG | Only when a new Mac release ships |
| `public/_headers` | Cache rules (appcast at most 5 minutes; `/site/`, demo and review assets long-term) | Rarely |
| `public/robots.txt` | Blocks search engines during the tester phase | Only at public launch |
| `wrangler.jsonc` | Backup Cloudflare Worker that serves the same `public/` | Rarely |

## Never change (things break for real users)

- **`/updates/appcast.xml` and everything in `public/updates/`.** Every installed Mac app checks this exact address daily, and it is built into each release. Don't move, rename, protect or hand-edit it.
- **The Pages project name or domain.** The update address depends on it.
- **The `/download` path.** Buttons and old links use it. Only its target line in `_redirects` changes (the newest DMG, or `/#download` while downloads are paused).
- **Release files** in `public/downloads/` and `public/updates/`. Only `scripts/publish-to-website.py` in the app repository writes them.
- **Signing keys or private material.** None belong here; never add any.

## Change with care

- **`noindex` meta tags and `robots.txt`.** These keep the site out of search engines while BYE is in testing. Remove them only when the owner says BYE is launching publicly. Every page, including `/demo/`, should keep them until then.
- **Hero buttons adapt by device.** Below 900px (phones, tablets) "Try the web demo" leads and the second button goes to `#download`; at 900px and up "Download for Mac" leads, with "Windows · coming soon" beside it and the demo as a link. Keep the `#mac` and `#download` anchors.
- **Honesty labels.** Any link to `/demo/` must say it is sample data ("Sample data for now"). Product mockups keep "Illustration, not real data" or "… not real professors". Sample professors in `apps/landing/src/content/sample.ts` are fictional; never use real PCC faculty.
- **Only what exists.** The home page describes features BYE has today. Don't add roadmap features (pre-picking professors, notifications, other schools) until they ship. Privacy lines in `About.tsx` state only verified facts.
- **No Rate My Professors branding in the design.** Its name appears only in the plain-text source and license credit in the footer.
- **Testimonials** stay off (`apps/landing/src/content/testimonials.ts`, `enabled: false`) until there are real quotes from testers who agreed to be quoted. Never invent quotes or names.
- **Neutrality.** BYE never ranks or recommends professors. Don't add "Top pick", "Best" or similar labels anywhere.
- **Marked comments in `apps/landing/src/content/site.ts`:** `APP LINK`, `DOWNLOAD LINK`, `REVIEW LINK`, `FEEDBACK LINK`, `NEWSLETTER LINK`. Every page link comes from these constants; tools and people search for the markers.
- **Credits in the footer** (MIT client attribution, font licenses). Keep them when editing the footer.

## Safe to change or add

- Copy, headings and section order (`apps/landing/src/App.tsx`), within the design rules below.
- New sections (FAQ, screenshots): a component in `src/sections/`, its copy in `src/content/`, one line in `App.tsx`. Add a nav or footer link in `content/site.ts` when it matters.
- The feedback link (replace `#` at the `FEEDBACK LINK` marker in `content/site.ts`).
- Styles, as long as phones stay first and the checks below pass.

## Design rules (BYE design system)

- **Colors (light mode only):**
  - Surfaces: ivory `--paper` page, linen `--paper-2` panels, stone `--tile` cards.
  - Text and buttons: Jet Black `--ink`; warm grey `--ink-2` for paragraphs.
  - **Yellow `--highlight` only** for the wordmark swipe, the one highlighted phrase in a headline, rating bars and progress meters. Never use yellow for anything else, and no blue.
- **Fonts:** Libre Baskerville (600/700) for headings and big numbers; Schibsted Grotesk for text; JetBrains Mono for course codes such as `MATH 5A`. Fonts are self-hosted, so don't add Google Fonts or any other third-party request.
- **Buttons:** pills; the primary button is black and turns yellow on hover. Tap targets must be **at least 44px** tall.
- **Writing:**
  - Sentence case.
  - No emoji.
  - Use → for the main action, ↗ for external links, and · as a separator.
  - Speak to students as "you".
  - Plain and honest; never promise outcomes.
- **Avoid:** left-border accent cards, gradient backgrounds, small labels (eyebrows) above headings, grids of identical icon cards, and monospace as decoration.
- **Motion (home page):** Lenis smooth scroll drives GSAP ScrollTrigger. The signature moment is the yellow swipe drawing under the hero headline. The "how it works" window pins while scrolling and its steps advance with scroll; every control inside works. Reveals, counters and parallax start from visible content. The Three.js dot field loads lazily on capable desktops only. `prefers-reduced-motion` turns off Lenis, pinning, parallax and WebGL.
- The visual source of truth is the **BYE prototype canvas** (claude.ai artifact, "Mobile web" page) and the **BYE design system** artifact. If the owner shares them, match them.

## Recipes

**Build the browser app** (from this website repository):
```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
```

The canonical source is `apps/web/` here; read its `AGENTS.md` before editing.
The build generates `public/demo/` (fictional), `public/app/` (gated live API), and `public/reviews/` (owner-only review form).
Do not import from the desktop checkout or hand-edit either generated folder.
Live rollout is gated by `docs/DATA_ACCESS.md`, `docs/release-readiness.json`, and
`docs/WEB_BETA.md`. Keep live/RMP flags disabled until their gates pass.

**Build or preview the home page:**
```sh
pnpm dev:landing     # live preview at http://127.0.0.1:5174
pnpm build:landing   # prerender into public/index.html and public/site/ (also part of pnpm build)
```
pnpm is enabled through corepack (`corepack pnpm …` works without a global install).

**Refresh the course list in the home page search:** run `node scripts/extract-pcc-courses.mjs ../BYE_Before_You_Enroll/.local-docs/pcc-schedule/<term>/bundle.json`, then `pnpm build:landing`. It keeps only public course codes and titles (no instructors, emails or sections).

**Ship a new Mac release:**
1. From the app repo, run `python3 scripts/publish-to-website.py ../BYE_website`.
2. Change the DMG file name on the `/download` line in `public/_redirects`.
3. If the requirements changed, update `MAC_REQUIREMENTS` in `apps/landing/src/content/site.ts` and rebuild. There is no version number on the page.

**Add a home page section:** create `apps/landing/src/sections/Name.tsx` (phone first; desktop with `lg:`), put its copy in `src/content/`, add it to `App.tsx`, then run `pnpm build:landing`.

**Point "On the web" at live data later:** change `DEMO_URL` at the `APP LINK` marker in `content/site.ts`, update the sample-data labels and `scripts/verify-static.mjs`.

## Check before you finish

1. Run `pnpm typecheck` and `pnpm build` (it ends with `verify:static`), then preview `public/` with `npx wrangler dev` or any static server.
2. At **390px** wide (phone) and **1280px** (desktop), check:
   - nothing scrolls sideways
   - tap targets are 44px or more
   - phones lead with the web demo, desktop with the Mac download
   - the "how it works" window pins and steps with scroll, and its controls work
3. `/download`, `/updates/appcast.xml` and `/demo/` still load. The page requests no third-party files apart from links the visitor clicks.
4. Every page still has `noindex` (until launch).
5. Commit and push only when the owner asks. The owner usually commits in GitHub Desktop and wants a ready-to-paste **Summary** and **Description**.

## Current state (update this when you change the site)

- **2026-10-19 downloads paused + Kit signup (not deployed):** The owner paused new Mac downloads until the app API is finished and the app is redesigned.
  - `DOWNLOADS_OPEN = false` in `content/site.ts`: hero, nav and footer keep their Install/Download links to `#download`; the Mac card's button is a disabled "Available soon" with a note linking to the signup, and the hero/closing copy says the Mac app is coming soon. A first draft replaced the cards with a big signup section; the owner preferred this.
  - `sections/Newsletter.tsx` is a slim "Get BYE news" strip (`#updates`) rendered under the install cards in `FinalCta.tsx`.
  - `/download` now redirects to `/#download`; the DMG line stays commented in `_redirects`. Appcast, update zips and DMGs are untouched, so installed apps keep updating.
  - Signup is a plain form post to Kit (`KIT_FORM_ID` at the `NEWSLETTER LINK` marker). No Kit script or cookies; the CSP `form-action` allows `https://app.kit.com`. Connected to the Kit form "BYE website signup" (ID `10068136`). Kit should redirect to `https://bye-before-you-enroll.pages.dev/?subscribed=1#updates`, where the strip shows "Check your inbox to confirm your email." `verify:static` checks the form action and CSP.
  - **To reopen downloads:** ship the release, set `DOWNLOADS_OPEN = true`, restore the DMG line in `_redirects`, switch the two `/download` checks in `scripts/verify-static.mjs` back, rebuild, and email the Kit list.

- **2026-10-18 security fixes (not deployed):** From a security review of the review sign-in; full report and owner checklist in `docs/SECURITY_REVIEW.md`.
  - **Plus aliases blocked:** sign-in rejects `name+tag@go.pasadena.edu`, which Google Workspace delivers to `name@` and would let one inbox act as many students (`server/reviews.ts`). The matching database change is `supabase/006_pcc_student_no_plus_alias.sql` in the app repo; the owner runs it in the Supabase SQL Editor.
  - **Per-email limits:** 4 code requests per 30 minutes and 10 code checks per 15 minutes for each address, on top of the per-IP limits, so rotating IPs can't flood one inbox or keep guessing one code. These limits are in memory per Cloudflare instance, so they slow attacks rather than stop them.
  - **Optional Turnstile bot check:** set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in Pages to require it before a code is emailed. It loads a Cloudflare script on `/reviews/` only. With no keys set, the page makes no third-party request.
  - **Site-wide security headers:** `public/_headers` gives every page a CSP (same-origin scripts and connections, no framing), `X-Frame-Options`, `nosniff` and `Permissions-Policy`; `/reviews/` keeps its own stricter policy. Any script on this origin could read a signed-in student's email from `/api/reviews/session`, so keep `script-src` and `connect-src` at `'self'`. The policy also blocks Cloudflare Web Analytics, which matches the "no tracking scripts" line in `About.tsx`; to use analytics, allow its hosts in the CSP and update that line. `verify:static` checks the policy.

- **2026-10-17 fixes (not deployed):** Review course search now ranks course codes before title matches and understands PCC zero-padding ("math 5a" finds MATH 005A; `courseSearchPattern` in `server/reviews.ts`, unit-tested). Verify "Math" and "Coll" on the live `/reviews/` after deploy, since local tests use fixtures. The web demo typed hint no longer flashes the full placeholder between examples.

- **2026-10-17 feedback + phone story fix (not deployed):** New "Help shape BYE." feedback section (`apps/landing/src/sections/Feedback.tsx`, `#feedback`): topic choices, an Email us button that opens a prefilled email to byebeforeyouenroll@gmail.com, and a copyable address (`FEEDBACK_EMAIL` in `content/site.ts`). Nav, footer and About link to it. On phones the pinned "how it works" window no longer scrolls inside; its screens are compact so they always fit (checked at 375×812 and 375×667). The owner chose to keep feedback on the home page (no separate page).

- **2026-10-17 web demo redesign (not deployed):** `/demo/` (and the paused `/app/`, same code) now follows the home page look: a nav with Install, a loud black "Demo · Sample data for now" banner (sticky on desktop; on phones it scrolls away and results/reports keep "Sample data" tags), a "How the demo works" card beside the search, "Sample" labels on cards, reports, stats and reviews, a typed search hint, real PCC course suggestions (dimmed, not selectable) after the sample classes, and counting scores and growing bars. Testers had mistaken the demo for real data; keep these labels.

- **2026-10-17 review page redesign (not deployed):** `/reviews/` now uses the home page design system (`apps/web/reviews/reviews.css` imports `apps/landing/src/styles.css`; Tailwind plugin in `vite.reviews.config.ts`). Steps with a progress bar (Verify → Class → Rate → Check), 1–5 tap tiles and tap choices instead of dropdowns, a calmer receipt, the landing footer, and the dead `/app/` link removed. API, validation, session and submit behavior are unchanged. Preview with fixtures only: `pnpm dev:reviews:preview` (tester address in `tests/review-fixtures.ts`, code 123456).

- **2026-10-17 home page v4 (not deployed):** `public/index.html` is now generated from `apps/landing` (React + Tailwind, prerendered). Sections: hero (headline swipe, tilted product window, lazy dot field), a scroll-pinned interactive "how it works" (search → days → compare → reviews, sample data), student reviews with a working preview form that continues to `/reviews/`, "Built by a PCC student" with privacy facts (the personal paragraph is a draft for the owner), final CTA with Mac and Windows (coming soon) install cards, footer. Testimonials are built but off. Install buttons lead to `#download` (Mac download card, Windows coming soon); the story search uses the real PCC Fall 2026 course list (`apps/landing/src/content/pcc-courses.json`, codes and titles only); AI review summaries are labelled "In development". `public/styles.css` is removed and `404.html` is standalone. The old page is in `archive/landing-ivory/`.

- **2026-10-17 demo wording:** Testers mistook the web option for the full app, so the landing page now calls it a demo: hero card "Web demo · Try BYE in your browser" with "made-up classes, professors and reviews… For real PCC data, use the Mac app", button "Try the demo →", nav "Try the web demo", footer "Web demo (sample data)". The Mac card now says it has real PCC data.

- **2026-10-17 web app paused (supersedes the go-live entry below):** "Use on the web" links back to the sample-data `/demo/` ("Sample data for now"); the live `/app/` is unlinked and disabled. The landing page links `/reviews/` (open to `@go.pasadena.edu` students; it needs a verified Resend domain and Supabase Pages variables before sign-in works). All PCC/RMP flags are off. Test only with repo fixtures.

- **2026-10-16 go-live prepared (not deployed):** Landing links now point to the live app `/app/` and the review form `/reviews/`; fictional `/demo/` stays built but unlinked. Production/preview config enables the live app, RMP (owner decision without RMP permission, 24h cache) and student review sign-in (`REVIEW_ACCESS=students`). See the owner decision in `docs/DATA_ACCESS.md`. Before pushing: verified Resend sending domain, Supabase variables in Pages, source Worker deploys, and hosted preview checks.

- **2026-10-16 review submission:** Dedicated `/reviews/` source, same-origin Pages API, short-lived HttpOnly sessions, Supabase RPC submission, and owner-only preview tooling are implemented locally. Defaults remain disabled. Real email delivery, live submission/cleanup, and deployment are pending. See `docs/REVIEW_SUBMISSION.md` and `docs/REVIEW_VERIFICATION.md`. Never commit `.dev.vars`, tester addresses, keys, codes, or review content.

- **2026-10-16:** Browser source moved into this repository; dual demo/live builds,
  typed Pages API and a separate Durable Object source Worker are prepared.
  Live release stays disabled pending authorized RMP access and deployed staging.
  The landing page still links to sample data. See `docs/WEB_BETA.md` for verification.

- **2026-10-15:**
  - Landing page redesigned mobile first.
  - The hero offers "On the web" (→ `/demo/`, sample data) and "Mac app" (→ `/download`); the menu bar has "Download for Mac" (desktop only) and "Use on the web".
  - Fonts are self-hosted.
  - Mac release 0.4.0-beta.1 is live.
  - Feedback link is still `#` (not set).
- **Open items:**
  - live PCC/RMP data for the web app (needs a decision on Rate My Professors access)
  - a nicer domain (must keep the current update address working)
  - remove `noindex` / `robots.txt` at public launch


## Full-app owner preview update — October 16, 2026

Live PCC/BYE browsing, separate BYE/RMP review sections, validated submission
prefilling, and owner-only BYE reporting are implemented locally. All six review
sorts match the Mac feature set. Summaries and statistical comparisons remain
disabled. See `docs/LIVE_APP_PREVIEW.md` from the website root. Production/demo
navigation and default flags remain unchanged; hosted acceptance is pending.


Owner preview deployed on October 16: https://full-app-owner-test.bye-before-you-enroll.pages.dev/reviews/ . BYE review routes
are enabled for the owner; PCC/RMP remain disabled. Hosted routing and phone/desktop
browser checks passed. Production settings and files were verified unchanged.
Hosted real owner login/source activation remain pending; see docs/LIVE_APP_PREVIEW.md
from the website root.
