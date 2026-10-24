# BYE website — guide for AI coding agents

Read this before changing anything in this repository. It is written for any AI agent (Codex, Claude Code and others) and for people. **Keep the "Current state" section up to date whenever you change the site.**

## What this is

The public website for **BYE (Before You Enroll)**, a free tool that helps Pasadena City College (PCC) students compare class sections, professor ratings and student reviews before they enroll.

- Live at **https://bye-before-you-enroll.pages.dev**. Cloudflare Pages deploys every push to `main`, currently serving `public/`; the prepared web-beta build and Pages Functions configuration require owner rollout (see `docs/web-app/WEB_BETA.md`).
- About 80% of visitors are on phones, so the site is **mobile first**: base CSS is for phones, and `min-width` media queries (600px, 900px) add the tablet and desktop layouts.
- Visitors get three ways to use BYE:
  1. **On the web:** the web demo at `/demo/`, running on bundled, fictional **sample data**. Students can also write reviews at `/reviews/`.
  2. **Mac app:** a download for Apple Silicon Macs. **Reopened 2026-10-22 with 0.5.0** (`DOWNLOADS_OPEN = true`; it was paused from 2026-10-19). Setting it false shows "Available soon" on the Mac card. The Kit email signup (`#updates`) was removed on 2026-10-22; the site CSP `form-action` is back to `'self'`.
  3. **Windows app:** `/download/windows` redirects to the installer on the public `JacktheWizardd/BYE-releases` GitHub repository (too large for Cloudflare Pages; chosen 2026-10-22). `WINDOWS_OPEN` in `content/site.ts` switches the card back to "Available soon".
- This repository owns the shared React/TypeScript frontend, browser/Tauri hosts and client packages. `BYE_Before_You_Enroll` owns backend contracts, the schedule service and owner dashboard, and database migration records. Retained SwiftUI/Electron sources and release tooling stay there during validation.
- `server/`, `functions/` and `workers/source/` remain implemented here during the transition. Future backend destinations are `services/web-api/` and `services/source-worker/`; do not relocate implementations or add forwarding services before desktop acceptance. See [current ownership and relocation inventory](docs/REPOSITORY_MAP.md).

## Files

| Path | What it is | Edit by hand? |
| --- | --- | --- |
| `apps/landing/` | **Source of the home page** (React + Tailwind + GSAP + Lenis, Three.js lazy). `src/sections/` one file per section, `src/content/` copy, links and fictional sample data, `src/ui/` product mockups, `src/motion/` all animation | Yes |
| `packages/tokens/tokens.json` | **Single source of the BYE design tokens** (colors, type, radii, shadows, tilts, motion) for the website, web app, Windows and Mac apps. Run `pnpm build:tokens` after editing; `pnpm build` and `tests/tokens.test.ts` fail if `generated/` is stale | Yes (then rebuild) |
| `packages/tokens/generated/` | **Generated** `tokens.css`, Tailwind `theme.css` (imported by `apps/landing`) and `BYETokens.swift` (copied into the Mac app) | **No** |
| `packages/core/` | Shared domain logic and types; `vectors/` holds JSON test cases every app must pass | Yes |
| `packages/app/`, `packages/api-client/` | Shared React application and injected browser/Tauri client adapters | Yes |
| `apps/preview/`, `apps/desktop/` | Isolated fictional browser preview and Tauri host mounting `packages/app` | Yes |
| `packages/api-contracts/` | Pinned backend-owned contract snapshot with `SOURCE.json` hashes | Export intentionally from the backend; do not hand-edit |
| `packages/ui/` | Canonical shared React screens used by browser/shared app; retained Windows client vendors a snapshot | Yes |
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

- **The Mac app signs in through `/api/reviews/auth/send`, `auth/verify` and `number`** to give students their BYE number (`supabase/007_bye_numbers.sql` in the app repository). It sends `Origin` set to this site and keeps the session cookie in memory only.
  - Keep those routes, their JSON shapes and the cookie names (`__Secure-bye-review`, `bye-review-local`) working for it.
  - Turning on Turnstile (`TURNSTILE_*`) blocks the app's code requests, because a native app can't solve the check. Add an app path first.
  - `GET /api/reviews/numbers` is the public student count.
- **`noindex` meta tags and `robots.txt`.** These keep the site out of search engines while BYE is in testing. Remove them only when the owner says BYE is launching publicly. Every page, including `/demo/`, should keep them until then.
- **Hero buttons adapt by device.** Below 900px (phones, tablets) "Try the web demo" leads and the second button goes to `#download`; at 900px and up "Download for Mac" leads, with "Windows · coming soon" beside it and the demo as a link. Keep the `#mac` and `#download` anchors.
- **Honesty labels.** Any link to `/demo/` must say it is sample data ("Sample data for now"). Product mockups keep "Illustration, not real data" or "… not real professors". Sample professors in `apps/landing/src/content/sample.ts` are fictional; never use real PCC faculty.
- **Only what exists.** The home page describes features BYE has today. Don't add roadmap features (pre-picking professors, notifications, other schools) until they ship. Privacy lines in `About.tsx` state only verified facts.
- **No Rate My Professors branding in the design.** Its name appears only in the plain-text source and license credit in the footer.
- **Testimonials** stay off (`apps/landing/src/content/testimonials.ts`, `enabled: false`) until there are real quotes from testers who agreed to be quoted. Never invent quotes or names.
- **Neutrality.** BYE never ranks or recommends professors. Don't add "Top pick", "Best" or similar labels anywhere.
- **Marked comments in `apps/landing/src/content/site.ts`:** `APP LINK`, `DOWNLOAD LINK`, `REVIEW LINK`, `FEEDBACK LINK`. Every page link comes from these constants; tools and people search for the markers.
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
  - **Yellow `--highlight` only** for the wordmark swipe, the one highlighted phrase in a headline, rating bars and progress meters, plus the playful accents below. Never use yellow for anything else, and no blue.
  - Values come from `packages/tokens/tokens.json`; don't hard-code new colors, radii, shadows or durations.
- **Playful accents (approved 2026-10-19, for the desktop apps and shared screens):**
  - Yellow may also mark small celebratory moments: confetti, avatar initials, and the primary button's offset shadow. Never large surfaces, body text or backgrounds.
  - Ink sticker style: 1.5px ink outline with a hard 2–4px ink offset shadow (`--bye-shadow-sticker`), for stickers, the selected row, the section card, the command menu and the search box.
  - Small tilts (±3–4°) on short stickers and the ID card only. Review notes and other body text sit straight, because tilted or moving text renders soft on Windows.
  - Springy motion uses `--bye-ease-spring` for small things without body text: sliding thumbs, bubble pops, re-ordering and confetti. Selection highlights (sidebar class, open professor) glide over 0.28s with `--bye-ease-expo` and no overshoot, which the owner found calmer. Text blocks fade in rather than slide. Switching professors updates the page in place: numbers glide from the old value and bars glide to the new width, with no remount or flash. Everything still turns off for reduced motion.
  - Playful copy stays sentence case, with no emoji and no promised outcomes.
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
Live rollout is gated by `docs/operations/DATA_ACCESS.md`, `docs/release-readiness.json`, and
`docs/web-app/WEB_BETA.md`. Keep live/RMP flags disabled until their gates pass.

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

- **2026-10-23 Mac and Windows retirement published:** Mac 0.5.1/build 11 and the Windows 0.5.1 x64 portable ZIP are public. Cloudflare deployment of release commit `6065d2a` succeeded; live GET/HEAD feed/metadata/download checks passed. The full public Windows ZIP passed SHA-256/ZIP integrity and the public Mac ZIP matches the signed archive. The owner explicitly requested both releases after the earlier local staging. Windows delivery is enabled by that authorization, with `windowsNativeTested: false` retained; this is not native acceptance. The exact GitHub asset was uploaded and verified before deploying its metadata. The reported existing Windows uninstaller integrity error remains unresolved; no new NSIS installer or custom deletion code ships. Public pages and APIs stay closed. See the delivery notes for installation instructions and limitations.

- **2026-10-23 Mac retirement release staged locally, not published:** The signed 0.5.1/build 11 ZIP, checksum, DMG and prepared appcast were copied by the release script into local public assets. The combined update excludes the RMP integration and shows the shutdown notice; no self-deletion ships. Existing feed records and release files are preserved. The local feed change is uncommitted and unpushed; it does not mean public installations have updated. Windows readiness stays false pending native acceptance/uninstall investigation.

- **2026-10-23 merge integration:** Combined the earlier remote shutdown and shared-app work with local retirement delivery. The retirement holding pages and delegated global gate remain authoritative; upstream source/assets are retained behind the gate. Exact Mac update delivery remains open; Windows retirement delivery stays disabled pending native acceptance. The merge does not publish application updates or deploy the site.

- **2026-10-23 retirement delivery prepared, local source commit authorized; unpublished:** `retirement-release.json` and the global Pages middleware close public pages, old assets, new downloads and website APIs with uncached 503 responses. Exact Mac update feed/archive paths remain available. Windows 0.5.1 metadata and its exact portable retirement ZIP download are prepared behind `windowsReady: false`; require actual Windows acceptance and verified artifact hosting before enabling. Routine builds verify and preserve the holding pages. Existing source, releases and other agents' changes are preserved. See `docs/operations/RETIREMENT_DELIVERY.md`.

- **2026-10-23 earlier holding-page preparation (historical; superseded by the retirement gate above):** At the owner's request, every page (`public/index.html`, `404.html`, `demo/`, `app/`, `reviews/`) is a copy of `public/offline.html` ("BYE is offline for now"), styled by `public/offline.css` (external so the strict `/reviews/` CSP allows it). `/download` and `/download/windows` redirect to `/`; the original lines are commented in `_redirects`. `DOWNLOADS_OPEN` and `WINDOWS_OPEN` are false. **Untouched:** `/updates/*`, `/windows/latest.json`, `public/downloads/`, `_headers`, `_routes.json` and the Pages Functions (`/api/reviews/*` stays up for the installed Mac app). The hashed `demo`/`app`/`reviews`/`site` assets remain for restore, unlinked. **Don't run `pnpm build:landing` or a full build until the site reopens; it would overwrite the holding page.** To reopen, revert this change. Verified locally with `wrangler pages dev`: all routes show the holding page, the downloads redirect, both feeds are byte-identical, and there are no CSP errors at 390 or 1280.

- **Earlier website-unavailable preparation (historical; superseded by the retirement policy above):** Root Pages middleware returns uncached HTTP 503 for public pages, assets, new downloads and website APIs. `/updates/*` and `/windows/latest.json` remain available for desktop update delivery. All-path `_routes.json` is intentional; original application source and release assets are retained. This does not disable installed native apps. See `docs/operations/WEBSITE_UNAVAILABLE.md` for checks and rollback.

- **2026-10-22 footer wording (not deployed):** The footer now says BYE is a free, independent student project "and still an experiment, so things may change or break." Landing rebuilt; typecheck passed.

- **2026-10-21 local schedule completion (uncommitted, not deployed):** Refresh and source-check age are exposed in live results. Stop retains local availability expiry; hidden/offline pages cancel in-flight refreshes. Profile evidence survives unchanged assignments and replacements receive no inherited profile. Seat totals deduplicate CRNs and remain unknown when incomplete. Type checking, 96 tests, build, local workerd and Chromium/WebKit checks at phone/desktop widths passed; rollout flags remain unchanged.

- **2026-10-20 local schedule integration (not deployed):** the source Worker reads official schedules through the shared BYE schedule API with server-side `BYE_SCHEDULE_API_URL` / `BYE_SCHEDULE_API_KEY`. LiveBridge polls version-backed sections, expires availability after fifteen minutes and preserves valid profile choices. New terms appear without changing the selected semester. Demo stays network-free; rollout/RMP flags remain unchanged. Fixture unit/runtime/build and Chromium/WebKit phone/desktop checks passed.


- **2026-10-20 one Reviews section for BYE + RMP (branch `claude/merged-reviews`, not deployed):** The shared professor page (`packages/ui/report.tsx`) now takes `bye` (host state + `load`/`write`/`actions`) instead of a `byeReviews` block.
  - Scores: a BYE row (tag "BYE") above the RMP row (tag "RMP"); never blended.
  - One "Reviews" section: a Both · BYE · RMP toggle (starts on Both), one course filter and one sort for both sources. In Both, all BYE reviews come first, then RMP. Every card carries a source tag. "View more reviews" loads BYE pages first. Courses only BYE has appear in the filter. `byeFilter` in `packages/core/domain.ts` maps the filter to a BYE course by code.
  - "Find more for this class" is gone. `findMore` became `preloaded` (the Windows app loads reviews on open; filters use saved reviews).
  - Web: `apps/web/src/bye-reviews.tsx` is now the `useByeReviews` hook (same `/api/reviews/*` calls and report flow). `/demo/` is unchanged.
  - Seat bar: fills by seats taken (`seatLevel`): ink, yellow at 15% or fewer open ("Almost full"), red when full.
  - Source marks sit at the bottom right of each card's score line. RMP is a plain outline tag. BYE is a collectible postage stamp (`ByeStamp`): common ink 55%, uncommon framed 25%, rare yellow 12%, epic postmarked 6%, legendary yellow in ink 2%. `stampTier` picks the tier from the review ID only, never its scores, so no review looks "featured"; `packages/core/vectors/stamp-tier.json` keeps every app in step.
  - Windows wiring is on the app repo's `redesign/windows-app-v3`, synced from this commit.

- **2026-10-21 BYE student numbers (not deployed):** `server/reviews.ts` adds `POST /api/reviews/number`, which needs a verified school session and returns `{ number, total }`, and the public `GET /api/reviews/numbers`, which returns `{ total }`. Both call RPCs from the app repository's `supabase/007_bye_numbers.sql`, which the owner runs by hand. Number 1 is reserved for the owner. The About privacy list says what a number keeps. Tests: `tests/bye-numbers.test.ts`. Live use needs the SQL run first, then a deploy. Backend hardening requires an empty JSON object (existing 16 KiB parser), rejects malformed RPC results, and preserves Mac paths/cookies. Local verification: typecheck, 100/100 tests, full build/static checks passed. Production preflight, owner reservation and deploy remain separately gated; Turnstile must stay off for native sign-in.

- **2026-10-21 repository structure preparation:** Ownership maps now distinguish the implemented shared frontend, retained legacy clients and backend code temporarily hosted here. Backend root pnpm tooling verifies contracts independently; no runtime code, contract hashes, deployment configuration or release files moved. The dependency/test/tooling inventory in `docs/REPOSITORY_MAP.md` records the later relocation boundary. Full desktop acceptance and staging/rollback gates remain in force.

- **Shared frontend trial:** `apps/preview` and `apps/desktop` mount `packages/app` with browser/Tauri adapters, canonical UI/core/tokens and a pinned backend contract snapshot. React + TypeScript is agreed; Tauri 2 is the desktop candidate, Capacitor later; Electron is legacy only. Production entry points remain unchanged. See [trial source, commands, verification and remaining Mac gate](docs/shared-ui/SHARED_APP_TRIAL.md). Backend relocation, replacement and releases await their explicit gates.

- **2026-10-20 documentation organization:** Start at `docs/README.md`. General guides now live under `docs/web-app/`, `docs/reviews/`, `docs/shared-ui/` and `docs/operations/`; machine-consumed `docs/release-readiness.json` remains in place. No site behavior, deployment or release changes are included.


- **2026-10-20 Windows API support in shared screens:** Added the read-only `ByeReviewPanel`, optional independent BYE review state, source expiry metadata, and a shared seat-total freshness helper. Shared reports place BYE feedback before RMP scores/reviews. Web source freshness remains five minutes; Windows API sections supply a fifteen-minute deadline. API delivery formats can remain explicitly unknown, and official multi-letter course suffixes are preserved. The browser Bridge, sample-data restrictions and rollout flags are unchanged. Windows integration/configuration/verification are recorded in the sibling app repository's `docs/windows/WINDOWS_API_INTEGRATION.md`; website handoff in `docs/shared-ui/WINDOWS_API_HANDOFF.md`. No deployment by Codex.


- **2026-10-20 home page fixes from the Oct 19 bug list (branch `redesign/shared-foundations`, uncommitted):**
  - "How it works" now pins the heading and intro together with the walkthrough, so they stay on screen. Its screens are compact at every width and never scroll inside (the Lenis wheel exception is gone). The window height follows the viewport, a step hold (`snap` to each step start) stops quick scrolls from skipping steps, and the pin switches to desktop at 1024px to match Tailwind `lg`. On phones shorter than about 740px the bottom of the window can clip.
  - Hero "Latest review" card sits under the window instead of over the third professor row.
  - Both install cards read "Available soon". While `DOWNLOADS_OPEN` is false they show only title, requirements and the button, left-aligned with the heading; the install steps and notes return when downloads open (the Windows steps are not shown until Windows has its own download).
  - The news strip says BYE is coming to Mac, Windows, phones and the browser. The Kit-hosted form text is edited in Kit.
  - Course search ignores extra leading zeros ("biol 0011" finds BIOL 011); test in `tests/landing-search.test.ts`. The Mac app's reported "BIOL 011 finds nothing" could not be reproduced by reading its code (Swift `CourseSuggestions.match` matches both); it needs a repro on the Mac.

- **2026-10-20 Mac extras in the shared professor page (branch `claude/report-parity`, uncommitted):** The Windows app's own professor page moved into `packages/ui`, so Windows now uses the shared `Report`, `ProfessorRow` and `EmptyDetail`.
  - `Report` takes optional Mac extras: `reviewFilter="select"` (course menu with RMP counts), `findMore` ("Find more for this class"), `checking`, `writeReview`, a `summary` slot (AI note), `reviewPage` and `initial`/`onChange` (saved choices per professor). `back` is now optional. The web passes none of them and keeps its chips, 4 + 6 paging and the BYE reviews block.
  - For every surface: the heading uses the RMP profile name with "Listed at PCC as …" when it differs; the page opens on all courses when no review mentions this class (with a note saying so); reviews show "Rating 4.0/5 · Difficulty 2.0/5" and decoded text; the "more" button reads "View more reviews". Outside the demo, each review links to "Original on RMP ↗" and the page notes that reviews are excerpts. The page no longer remounts when the student switches professors; its three scores count up again for each professor (`Num` `restartKey`).
  - `SectionCard` notes "Some meetings not announced", hides the campus for fully online sections and says "1 unit". `EmptyDetail` takes `sections` for a section count and format/term facts; in the demo the counts say "· sample" like the others.
  - Every "Sample" label is unchanged. Checks: typecheck, `pnpm test` 84/84, build, `test:browser` 6/6, `test:app:browser` 4/4.

- **2026-10-19 v3 polish from Windows testing (uncommitted):** `packages/ui` text entrances fade instead of sliding, review cards no longer tilt, and `useCountUp` glides from the number on screen instead of restarting at zero. Owner testing on Windows found moving or tilted text blurry. This also applies to `/demo/`. Checks: typecheck, `pnpm test` 84/84, build, `test:browser` 6/6.

- **2026-10-19 app redesign Phase 3, website side (branch `redesign/shared-foundations`, uncommitted):** The Windows app (app repository branch `redesign/windows-app-v3`) now vendors `packages/{tokens,core,ui}` and the Schibsted Grotesk and JetBrains Mono fonts through the app repo's `scripts/sync-bye-shared.mjs`.
  - Website changes for it: `ProfessorList` takes an optional `renderRow`, so Windows can draw Mac-style rows inside the shared list. `useFlip` and the list's ↑ ↓ handler use `Array.from` so they compile with the Windows TypeScript settings.
  - New `public/windows/latest.json` (version `0.4.0-beta.1`, link to `/#download`). The Windows app reads it only when a student presses Check for updates. It's cached for 5 minutes in `_headers`, and `verify:static` checks it. When a Windows build ships, raise `version` there. `public/updates/` is untouched.
  - After committing, re-run the sync in the app repository so its `vendor/bye-shared/SOURCE.json` names the commit.

- **2026-10-19 app redesign Phase 2, v3 look for the shared screens (same branch, not committed or deployed):** `/demo/` and the paused `/app/` now use the approved playful v3 look on the results and professor screens. The search screen is unchanged.
  - New shared pieces in `packages/ui`: "I'm free" day bubbles that filter instantly, an online toggle and a sliding segmented sort at the top of the professor list. Rows have initials avatars, and an ink "sticker" highlight slides to the open professor. Rows glide into place when sorted or filtered, and ↑ ↓ moves between professors (opening them on desktop). Skeleton rows show with playful loading copy.
  - The detail pane starts on "Pick a professor." with a hand-drawn arrow and counts. It still never opens anyone automatically.
  - Professor page: yellow-initial avatar (playful accent), sticker-style section cards, and reviews as slightly tilted notes that glide when the sort changes.
  - Styles live in `packages/ui/styles.css` (tokens only); the old professor-card rules were removed from `apps/web/src/styles.css`. Every "Sample" label is kept; all controls are 44px or more; motion is off for reduced motion.
  - `scripts/browser-acceptance.ts` now waits for the "Pick a professor." heading instead of "Compare professors".

- **2026-10-19 app redesign Phase 1, shared foundations (branch `redesign/shared-foundations`, not committed or deployed):** The owner approved a playful, search-first redesign of the Mac and Windows apps (mockup v3; plan in `docs/web-app/APP_REDESIGN_PLAN.md`). The Windows app will reuse the web app's React screens; the Mac stays SwiftUI. This phase changes no visuals:
  - `packages/tokens/`: one token source; the landing `@theme` and the web app's `:root` now read the generated files. The landing build output was byte-identical before and after.
  - `packages/core/`: added the display helpers the Windows renderer uses (`fits`, `filterSections`, `formatLabel`, `dateLabel`, `displayTitle`, `visibleText`, `preferredFilter`, `filterFinished`, `reviewURL` …); `orderReviews` now matches the Mac (`Ordering.reviews`), including RMP date strings. Types are a superset of Electron's. `vectors/` holds shared test cases; the Electron `src/shared` passes them too. `professors()`/`sectionDetails()` are unchanged (server-facing; aligning them is Phase 5).
  - `packages/ui/`: `ProfessorCard`, `Report`, `SectionCard`, `Chooser`, `Bar`, `Num`, `Wordmark` and `motion.ts` moved out of `apps/web/src/main.tsx` unchanged. Demo mode comes from `SurfaceProvider`; the class-days rule and the BYE reviews block are passed in. Their CSS still lives in `apps/web/src/styles.css` until Phase 2.
  - `scripts/verify-static.mjs` now ignores CRLF line endings in `public/_headers` (it failed on Windows checkouts).

- **2026-10-19 downloads paused + Kit signup (not deployed):** The owner paused new Mac downloads until the app API is finished and the app is redesigned.
  - `DOWNLOADS_OPEN = false` in `content/site.ts`: hero, nav and footer keep their Install/Download links to `#download`; the Mac card's button is a disabled "Available soon" with a note linking to the signup, and the hero/closing copy says the Mac app is coming soon. A first draft replaced the cards with a big signup section; the owner preferred this.
  - `sections/Newsletter.tsx` is a slim "Get BYE news" strip (`#updates`) rendered under the install cards in `FinalCta.tsx`.
  - `/download` now redirects to `/#download`; the DMG line stays commented in `_redirects`. Appcast, update zips and DMGs are untouched, so installed apps keep updating.
  - Signup is a plain form post to Kit (`KIT_FORM_ID` at the `NEWSLETTER LINK` marker). No Kit script or cookies; the CSP `form-action` allows `https://app.kit.com`. Connected to the Kit form "BYE website signup" (ID `10068136`). Kit should redirect to `https://bye-before-you-enroll.pages.dev/?subscribed=1#updates`, where the strip shows "Check your inbox to confirm your email." `verify:static` checks the form action and CSP.
  - **To reopen downloads:** ship the release, set `DOWNLOADS_OPEN = true`, restore the DMG line in `_redirects`, switch the two `/download` checks in `scripts/verify-static.mjs` back, rebuild, and email the Kit list.

- **2026-10-18 security fixes (not deployed):** From a security review of the review sign-in; full report and owner checklist in `docs/operations/SECURITY_REVIEW.md`.
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

- **2026-10-16 go-live prepared (not deployed):** Landing links now point to the live app `/app/` and the review form `/reviews/`; fictional `/demo/` stays built but unlinked. Production/preview config enables the live app, RMP (owner decision without RMP permission, 24h cache) and student review sign-in (`REVIEW_ACCESS=students`). See the owner decision in `docs/operations/DATA_ACCESS.md`. Before pushing: verified Resend sending domain, Supabase variables in Pages, source Worker deploys, and hosted preview checks.

- **2026-10-16 review submission:** Dedicated `/reviews/` source, same-origin Pages API, short-lived HttpOnly sessions, Supabase RPC submission, and owner-only preview tooling are implemented locally. Defaults remain disabled. Real email delivery, live submission/cleanup, and deployment are pending. See `docs/reviews/REVIEW_SUBMISSION.md` and `docs/reviews/REVIEW_VERIFICATION.md`. Never commit `.dev.vars`, tester addresses, keys, codes, or review content.

- **2026-10-16:** Browser source moved into this repository; dual demo/live builds,
  typed Pages API and a separate Durable Object source Worker are prepared.
  Live release stays disabled pending authorized RMP access and deployed staging.
  The landing page still links to sample data. See `docs/web-app/WEB_BETA.md` for verification.

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
disabled. See `docs/web-app/LIVE_APP_PREVIEW.md` from the website root. Production/demo
navigation and default flags remain unchanged; hosted acceptance is pending.


Owner preview deployed on October 16: https://full-app-owner-test.bye-before-you-enroll.pages.dev/reviews/ . BYE review routes
are enabled for the owner; PCC/RMP remain disabled. Hosted routing and phone/desktop
browser checks passed. Production settings and files were verified unchanged.
Hosted real owner login/source activation remain pending; see docs/web-app/LIVE_APP_PREVIEW.md
from the website root.


<!-- BEGIN shared development policy: 2026-10-19 -->
## Development roles and shared quality rules

These rules apply to websites, web apps, desktop applications and mobile
applications where present. They add to the existing project and area guides;
preserve specific product constraints, workflows and release gates. They do not
authorize a redesign, platform port, feature rollout or infrastructure change.
Current explicit user instructions take precedence over these role preferences.

### Preferred responsibilities

- **Codex is the preferred backend, systems, API, database and security engineer.**
  Lead service architecture, domain logic, persistence, authentication and
  authorization, validation, migrations, reliability, performance profiling and
  security review, including local native-app systems and desktop IPC.
- **Claude Code is the preferred frontend, UI and UX engineer.** Lead interface
  design and implementation, navigation, layout, styling, interaction, motion,
  accessibility and visual polish across web, desktop and mobile interfaces.
- These are defaults, not exclusive ownership or a claim about model ability.
  Either agent may complete an explicitly assigned task across the stack, fix a
  nearby integration issue, write tests or review the other's work. Do not stall
  a task solely because the preferred agent is unavailable. Seek a second review
  for security-sensitive or cross-boundary work when available; never imply that
  a review happened without evidence.

### Preserve behavior and integration contracts

- Read the applicable instructions and current code before editing. Preserve
  working behavior, approved designs, user data, privacy promises, feature flags,
  release assets and existing tests. Keep changes focused; avoid unrelated
  refactors, dependency upgrades and speculative abstractions.
- Agree on shared types, API routes, request/response fields, errors, auth rules
  and loading/empty/offline states before parallel frontend/backend work. Preserve
  compatibility across browser, native and Electron clients. For a necessary
  breaking change, document the migration and coordinate consumers and contract
  tests before integration; never silently change a shared contract.
- Prefer the simplest maintainable solution using the existing stack. Favor
  local/offline operation and existing free-tier services where suitable. Bound
  requests, retries, polling, storage and background work. Explain recurring
  costs, quotas and tradeoffs before adding services; obtain explicit approval
  before enabling paid resources. Cost savings must not weaken security or
  correctness.

### Platform quality, accessibility and security

- Web: responsive, mobile-first layouts; semantic HTML, keyboard operation,
  visible focus, screen-reader labels, readable contrast, usable touch targets,
  reduced motion and clear loading/error/empty states. Check supported browsers
  and small/large viewports; preserve demo disclosures and noindex gates.
- Desktop/native: follow platform conventions for windows, menus, shortcuts,
  focus, accessibility, permissions and lifecycle. Keep UI work responsive; bound
  CPU, memory and background/network use. Preserve update/signing behavior and
  Electron process/IPC security boundaries.
- Mobile, when implemented: respect safe areas, system back gestures, touch
  targets, text scaling, screen readers, app lifecycle and intermittent networks;
  avoid unnecessary battery use. Prefer platform-appropriate behavior over
  forcing identical interactions everywhere. Do not introduce new platforms
  solely to satisfy this policy.
- Validate at trust boundaries and enforce authorization server-side or at the
  appropriate native boundary. Use least privilege, safe queries and secure
  session/secret storage. Never expose privileged keys in clients or commit
  credentials, private signing material, personal data or sensitive logs.

### Cooperation, verification and authorization

- Use the existing shared coordination board before editing; respect file claims
  and record meaningful progress and handoffs. Parallel work requires disjoint
  file ownership or an agreed handoff. Preserve other agents' and the user's
  uncommitted work; never reset, stash, clean, overwrite or revert it to make your
  task easier. Re-read files and review the diff before integrating changes.
- Run the existing checks appropriate to the changed area. Add meaningful
  regression tests for behavior changes and contract/security tests for relevant
  boundaries. Verify UI changes visually and with accessibility interactions.
  Report checks actually run, failures and untested platforms honestly. For
  instruction-only edits, inspect content, imports, scope and diffs; app builds
  and native test-app relaunches are unnecessary unless runtime code changes.
- **Obtain explicit user authorization covering each commit, push, deployment,
  release or destructive action before performing it.** Preparing changes or a
  commit message is not authorization to execute those actions. A push that
  triggers deployment also needs authorization for that deployment. Destructive
  actions include deleting data, resetting work, rewriting history and applying
  destructive migrations. Explain scope, impact and recovery before approval.
  Respect authorization already given for the specific action; do not infer it
  from a general request to develop or test.
- Finish with changed files, verification and limitations, plus separate
  ready-to-paste GitHub Desktop Summary and Description for each changed
  repository. Leave changes uncommitted unless explicitly authorized otherwise.

For this repository, run the existing coordination commands from
`../BYE_Before_You_Enroll` using `python3 -I scripts/agents.py` and your own
`codex` or `claude` identity. Use absolute paths when claiming website files.
Read `../AGENTS.md` for shared BYE memory and workspace context. If the sibling
board is unavailable, report that limitation; do not claim coordination occurred
or overwrite files that may be owned by another agent.
<!-- END shared development policy -->
