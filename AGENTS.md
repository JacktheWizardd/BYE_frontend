# BYE website — guide for AI coding agents

Read this before changing anything in this repository. It is written for any AI agent (Codex, Claude Code and others) and for people. **Keep the "Current state" section up to date whenever you change the site.**

## What this is

The public website for **BYE (Before You Enroll)**, a free tool that helps Pasadena City College (PCC) students compare class sections, professor ratings and student reviews before they enroll.

- Live at **https://bye-before-you-enroll.pages.dev**. Cloudflare Pages deploys every push to `main`, currently serving `public/`; the prepared web-beta build and Pages Functions configuration require owner rollout (see `docs/WEB_BETA.md`).
- About 80% of visitors are on phones, so the site is **mobile first**: base CSS is for phones, and `min-width` media queries (600px, 900px) add the tablet and desktop layouts.
- Visitors get two ways to use BYE:
  1. **On the web:** the web app at `/demo/`. It currently runs on bundled, fictional **sample data**.
  2. **Mac app:** a download for Apple Silicon Macs.
- The app's source code lives in a separate repository, `BYE_Before_You_Enroll`, usually checked out beside this one (`../BYE_Before_You_Enroll`).

## Files

| Path | What it is | Edit by hand? |
| --- | --- | --- |
| `public/index.html` | Landing page (one page, sections `#how`, `#features`, `#mac`, `#feedback`) | Yes |
| `public/styles.css` | All landing-page styles and design tokens; mobile first | Yes |
| `public/404.html` | Not-found page; reuses `styles.css` classes (`.wrap .nav .brand .mark .sub .swipe .lead .btn .btn-primary`) | Yes |
| `public/fonts/` | Self-hosted fonts (Schibsted Grotesk, Libre Baskerville, JetBrains Mono), all SIL OFL | Only to add or replace a font |
| `public/reviews/` | **Generated** owner-only review page; rebuild from `apps/web/reviews/` | **No** |
| `public/demo/` | **Generated** build of the web app. Never edit; rebuild it (see recipes) | **No** |
| `public/updates/` | Mac in-app update feed (`appcast.xml`) and signed update zips | **No.** Release script only |
| `public/downloads/` | Mac app DMGs | **No.** Release script only |
| `public/_redirects` | `/download` → newest DMG | Only when a new Mac release ships |
| `public/_headers` | Cache rules (appcast at most 5 minutes; demo assets long-term) | Rarely |
| `public/robots.txt` | Blocks search engines during the tester phase | Only at public launch |
| `wrangler.jsonc` | Backup Cloudflare Worker that serves the same `public/` | Rarely |

## Never change (things break for real users)

- **`/updates/appcast.xml` and everything in `public/updates/`.** Every installed Mac app checks this exact address daily, and it is built into each release. Don't move, rename, protect or hand-edit it.
- **The Pages project name or domain.** The update address depends on it.
- **The `/download` path.** Buttons and old links use it. Only the DMG file name on its line in `_redirects` changes.
- **Release files** in `public/downloads/` and `public/updates/`. Only `scripts/publish-to-website.py` in the app repository writes them.
- **Signing keys or private material.** None belong here; never add any.

## Change with care

- **`noindex` meta tags and `robots.txt`.** These keep the site out of search engines while BYE is in testing. Remove them only when the owner says BYE is launching publicly. Every page, including `/demo/`, should keep them until then.
- **The two choices in the hero ("On the web" and "Mac app").** These are the main navigation for visitors. Keep the web option first; on phones the Mac card links to `#mac` (phones can't install the Mac app).
- **Honesty labels.** While `/demo/` uses sample data, any link to it must say so ("Sample data for now"). Illustrations must keep "Illustration, not real data".
- **Neutrality.** BYE never ranks or recommends professors. Don't add "Top pick", "Best" or similar labels anywhere.
- **Marked comments in `index.html`:** `APP LINK`, `DOWNLOAD LINK`, `FEEDBACK LINK`. Tools and people search for them; keep them next to their links.
- **Credits in the footer** (MIT client attribution, font licenses). Keep them when editing the footer.

## Safe to change or add

- Copy, headings and section order on the landing page, within the design rules below.
- New landing-page sections (FAQ, privacy note, screenshots). Add a footer link when you add a section.
- The feedback link (replace `#` at the `FEEDBACK LINK` marker with the real form URL).
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
- **Avoid:** left-border accent cards, gradient backgrounds, and class names that collide. For example, `.mac` is the Mac section's grid, so name a new card class something specific like `.choice-mac`.
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

**Ship a new Mac release:**
1. From the app repo, run `python3 scripts/publish-to-website.py ../BYE_website`.
2. Change the DMG file name on the `/download` line in `public/_redirects`.
3. If the requirements changed, update the "Apple Silicon · macOS …" lines in `index.html`. There is no version number line on the page any more.

**Add a landing-page section:**
1. Add a `<section id="…">` inside `<main>`, following the existing pattern (eyebrow → `h2` → content).
2. Style it phone first in `styles.css`; add desktop rules inside `@media (min-width: 900px)`.
3. Add a link in `.footer-links`, and in `.nav-links` only if it's important.

**Point "On the web" at live data later:** change the `href="/demo/"` links (search for `APP LINK` and `/demo/`) and remove "Sample data for now".

## Check before you finish

1. Preview locally: `npx wrangler dev`, or any static server rooted at `public/`.
2. At **390px** wide (phone) and **1280px** (desktop), check:
   - nothing scrolls sideways
   - tap targets are 44px or more
   - the hero shows the web choice first
3. `/download`, `/updates/appcast.xml` and `/demo/` still load. The page requests no third-party files apart from links the visitor clicks.
4. Every page still has `noindex` (until launch).
5. Commit and push only when the owner asks. The owner usually commits in GitHub Desktop and wants a ready-to-paste **Summary** and **Description**.

## Current state (update this when you change the site)

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
  - real feedback form URL
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
