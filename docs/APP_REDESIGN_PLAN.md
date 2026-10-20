# Plan: BYE app redesign (Mac and Windows): playful, search-first, one design everywhere

Status (2026-10-19): **approved. Phases 1–2 are committed on the website branch `redesign/shared-foundations` (not deployed). Phase 3 (Windows) is done locally on the app repository branch `redesign/windows-app-v3`, with small website changes on the website branch; not committed.** Phases 4–6 not started. The approved interactive mockup is `docs/design/app-mockup-v3.html` in the app repository, and `docs/UI_PARITY.md` there maps every screen across web, Windows and Mac.

## Context

The website (landing, `/reviews/`, web demo) has the new BYE design. The installed apps lag behind: the Mac app (SwiftUI, ~1,130 lines of views) and the Windows app (Electron + React, 419-line `main.tsx`) feel static.

Every fix is also made up to three times today:
- Tokens are hand-copied in four places and have drifted (`ink-2` is `#5f5a52` vs `#6b665e`).
- Domain logic exists in Swift `ClasswiseCore`, Electron `src/shared/domain.ts` and an older fork in `BYE_website/packages/core`.

The owner wants:
- a complete app that feels like an app, not slides: modern, fluid, **playful and made for students**
- fixes and updates to reach every app
- the Mac app to stay native

We iterated on three inline mockups:
- v1 felt "like PowerPoint"
- v2 used a static app shell
- **v3 was approved**, built on the references Raycast, Arc, Linear and Things 3

This plan supersedes `BYE_website/docs/APP_REDESIGN_PLAN.md` (2026-10-17).

## Decisions (owner, 2026-10-19)
1. **Approved direction: mockup v3.** Search-first like Raycast, a ⌘K menu and keyboard lists like Linear, a sidebar with an inset panel and a personality-filled first run like Arc, and springy details like Things 3. The copy is playful and student-flavored.
2. **Windows reuses the web app's React UI** (shared package). The Mac is the only separate UI (SwiftUI).
3. **Repo rule:**
   - Installed-app code stays in `BYE_Before_You_Enroll`: Electron shell, app-only screens, Mac.
   - Website code stays in `BYE_website`.
   - Shared packages live in `BYE_website/packages` and are vendored into the app repo by a sync script.
4. **Data logic moves to the BYE API** later. The apps keep only small rules, checked by shared test vectors.
5. **Mac body text uses SF Pro.** Libre Baskerville is for headings and numbers, and JetBrains Mono is for course codes.
6. **Updates:** the Mac uses the existing Sparkle updater. Windows gets a **check-only** notice (a version file plus a link) until Windows hosting is decided.
7. **The web app/demo** keeps opening straight to search. Onboarding, home and settings are for the installed apps only.
8. **New "playful accents" rule** in the design system (see below), instead of breaking the yellow-only rule.

## The approved app (from mockup v3)

```
first launch:  Welcome ──► "What should we call you?" (live student ID card) ──► confetti ──► Home
everyday:      Home (search-first) ──► pick class ──► Results (list + detail) ──► professor page
anywhere:      ⌘K / Ctrl K command menu · Settings sheet (General · Updates · About)
```
- **Frame:**
  - A linen sidebar holds the wordmark, a Search button (⌘K), Home, **Your classes** (up to 5 recently opened courses, stored on the device, removable) and, at the bottom, your avatar, name and settings.
  - Content sits in an inset ivory panel.
  - A highlight springs between the sidebar items.
- **Welcome:**
  - The big BYE wordmark with the swipe and "Find the class that fits your week."
  - "Made by a PCC student, for PCC students."
  - "Let's go →" (↵ works too).
- **Name step:**
  - A field next to a tilted **student ID card** that fills in live: the initial wobbles in and the name appears.
  - "It stays on this computer. Promise." Skip is allowed. Up to 20 characters.
  - Continuing sets off confetti and fades into Home.
- **Home:**
  - "Evening, Jack." with the swipe under the name, then "What are you taking next term?"
  - A large search box with results as you type, three "Try one of these" classes, and keyboard hints (⌘K, ↑ ↓, ↵).
  - Stickers: "Fall 2026" and "BYE never ranks professors. Promise."
- **Results:**
  - The header shows the course chip and title, "I'm free" day bubbles (M T W Th F) that filter instantly, and an Online toggle.
  - The list column has a segmented sort (Rating · Easier · A–Z), rows that bounce into their new order, and a sliding ink-outlined selection. ↑ ↓ moves through professors.
  - While loading, skeleton rows show with rotating copy: "Asking around…", "Reading reviews…", "Counting open seats…".
  - Before you pick, the detail area shows a hand-drawn arrow, "Pick a professor. We line them up, you decide.", professor and open-seat counts, and **no automatic selection**.
- **Professor page:**
  - Avatar, name, rating count and an RMP link.
  - Three stat tiles that count up.
  - A sticker-style section card with a seat meter and "checked N min ago".
  - "What students say" with a segmented sort, and reviews as slightly tilted notes that re-order with a spring.
- **Command menu (⌘K / Ctrl K):** classes plus actions (Go home, Open settings, Check for updates, Change your name, Show welcome again). It works with the keyboard, and Esc closes it.
- **Settings sheet:**
  - **General:** name, and Show welcome again.
  - **Updates:** on the Mac, the auto-check and install-on-quit toggles plus Check for updates; on Windows, Check for updates with a link to the website download.
  - **About:** version, the "Free, no ads, no tracking" line, and licenses and credits.
- **Unchanged rules:**
  - Neutral: no "best" labels and no auto-selection.
  - Honest: source timestamps stay visible, and the class-days rule is unchanged (a section must meet on every picked day; fully online always matches; no announced days never matches).
  - Every motion turns off with Reduce Motion / Windows "Animation effects" off.

## Design system update: "playful accents"
Add these to `tokens.json` and to the Design rules in both repos' AGENTS.md:
- **Yellow** may also be used for small celebratory accents: confetti, avatar initials, and the primary button's offset shadow. It stays out of large surfaces, body text and backgrounds.
- **Ink sticker style:** a 1.5px ink outline with a hard 2–4px ink offset shadow, for stickers, the selected row, the section card, the command menu and the search box.
- **Tilts:** ±0.3–0.6° on review notes, ±3–4° on stickers and the ID card. They straighten on hover.
- **Motion tokens:**
  - `spring` = `cubic-bezier(.34,1.56,.64,1)` (SwiftUI `.spring(response: 0.45, dampingFraction: 0.7)`)
  - `expo` = `cubic-bezier(.16,1,.3,1)`
  - durations: slide 0.45s, swipe 0.9s, bars 1.0s, count-up 0.8s, stagger 70ms, confetti about 1.3s
- The playful copy voice stays sentence case, with no emoji and no promises about outcomes.

## How "fix once, every app gets it" works

| Layer | Single source | Web | Windows | Mac |
| --- | --- | --- | --- | --- |
| Tokens (color, radius, shadow, type, **motion**) | `BYE_website/packages/tokens/tokens.json` | generated CSS | vendored CSS | generated `Tokens.swift` |
| Search, results, professor page | `BYE_website/packages/ui` (React) | used directly | vendored, same code | SwiftUI mirror (parity table) |
| App-only screens (frame, onboarding, home, ⌘K, settings) | app repo | — | `apps/cross-platform/src/renderer/src/app/` | SwiftUI views |
| Client rules (class-days, sorts) | `packages/core` + JSON vectors | used | vendored | `ClasswiseCore` passes the **same vectors** |
| Data | BYE API (Phase 5) | `LiveBridge` | Bridge → API | API client behind `AppModel` |

- `BYE_Before_You_Enroll/scripts/sync-bye-shared.mjs` copies `../BYE_website/packages/{tokens,core,ui}` into `vendor/bye-shared/`. It stamps `SOURCE.json` with the website commit and regenerates `Sources/Classwise/Views/Tokens.swift`. One command updates both apps, with no submodules.
- `docs/UI_PARITY.md` (app repo) maps each shared component and app screen to its SwiftUI view. Every UI handoff names the Mac counterpart.
- The approved mockup is saved as a reference file in `BYE_Before_You_Enroll/docs/design/app-mockup-v3.html`.

## Phases

### Phase 1: Foundations (website repo; no visual change yet)
- `packages/tokens/tokens.json` plus a dependency-free `scripts/build-tokens.mjs`. It generates `tokens.css` for `apps/web` and the `@theme` block for `apps/landing/src/styles.css`. Settle the drifted names and values, and add the playful-accent and motion tokens.
- `packages/core` becomes the superset of Electron `src/shared/domain.ts` (`fits`, `filterSections`, `formatLabel`, `REVIEW_SORTS`, `orderReviews` with RMP dates, `place`, the co-instructor merge, `reviewURL`…). `types.ts` becomes a superset of both.
- `packages/core/vectors/*.json` covers class-days, review sorts, professor order and section details, seeded from `Tests/ClasswiseCoreTests/Fixtures/pcc-summer-2026-eth014.json`.
- Extract the screens from `apps/web/src/main.tsx` into `packages/ui` (course search, results list, professor page, chooser, bars, count-up, `motion.ts`). `apps/web` keeps its web-only parts.
- Checks: `pnpm typecheck && pnpm test && pnpm build && pnpm test:browser`. `/demo/` looks unchanged.

### Phase 2: Shared UI becomes v3 (website repo)
- Restyle and re-animate `packages/ui` to v3:
  - results header with day bubbles
  - list with the sliding selection, springy re-order and ↑ ↓ keys
  - skeleton rows with playful loading copy
  - professor page with stat tiles, the sticker section card and tilted review notes
  - the empty state with the drawn arrow
- No new dependencies: CSS, the View Transitions API with fallback, and FLIP for re-ordering.
- The web app picks it up with its mobile-first layout and **every "Sample" label kept**.
- Owner review in the local demo at 390, 1180×800 and 1280. Deployment is a separate approval.

### Phase 3: Windows app (app repo)
- Add the sync script and `vendor/bye-shared/`. The renderer mounts the vendored UI with `bridge = window.bye`. The main-process engine is unchanged in this phase.
- App-only screens in `src/renderer/src/app/`: the frame and sidebar (Your classes), Welcome, the name step with the ID card and confetti, Home search, the ⌘K menu and the Settings sheet.
- New validated IPC, reviewed by Codex:
  - `settings.get` / `settings.set` (name, onboarded flag, recent classes) stored in `%LOCALAPPDATA%\BYECrossPlatformBeta\settings.json`
  - `update.check`, which fetches only `https://bye-before-you-enroll.pages.dev/windows/latest.json`, on demand
- Bundle Schibsted Grotesk and JetBrains Mono locally (the CSP allows only `'self'`).
- Website side: add `public/windows/latest.json` plus a cache rule in `_headers`, and update the privacy facts for the update request. `public/updates/` stays untouched.
- Update `scripts/verify-offline.mjs` and `verify-ui.ts` for the new accessible names and selectors. Run `cd apps/cross-platform && npm test`.
- Checks:
  - typecheck, tests, `verify-offline`, `verify-ui`, `verify-packaged`
  - 100/125/150% scaling, animations off, memory baseline
  - `package.mjs` + `verify-zip.mjs`
- The owner tries it on this PC (`npm run dev`) before the Mac starts.

### Phase 4: Mac app (SwiftUI; must be built on the Mac)
- Generated `Tokens.swift`, plus a drift test against the vendored JSON. A new `Motion.swift` (`BYEMotion`: spring, slide, swipe, bars, stagger) respects `accessibilityReduceMotion`.
- Frame: `NavigationSplitView` (sidebar: Search ⌘K, Home, Your classes, profile) with an inset ivory detail panel. The sidebar and list selection use `matchedGeometryEffect`.
- Screens:
  - `WelcomeView`, `NameStepView` (ID card, `Canvas` + `TimelineView` confetti)
  - `HomeView` (search-first, `@FocusState`, `.onKeyPress` for ↑ ↓ ↵)
  - `CommandMenu` overlay (⌘K, also in the menu bar)
  - Results with day bubbles, sort and list
  - `ProfessorReport` with `.contentTransition(.numericText())`, spring re-order and tilted notes
  - a Settings sheet plus the existing Settings scene, reusing `AppUpdater`
- An `AppRoute` in `AppModel` replaces the `showingResults` toggle. `@AppStorage` holds `displayName`, `hasOnboarded` and recent classes.
- Move view logic (overview stats, seat thresholds, status text) into `ClasswiseCore`/`AppModel`. `swift test` runs the shared vectors against `Section.fits`, `Ordering.reviews` and `Ordering.professors`.
- Keep the `#if BYE_AUDIT` / `#if BYE_MODEL_EVAL` blocks, the `available-day-<weekday>` identifiers and `ReviewLinkTests`.
- Checks:
  - `swift test` and `./scripts/build-test-app.sh`, then relaunch `test/BYE Test.app`
  - Reduce Motion on, minimum window 1000×700, VoiceOver
  - Instruments while scrolling, screenshots

### Phase 5: Data to the BYE API (Codex leads; separate track)
- Swap the Windows Bridge to the API, and add a Mac `BYEServiceClient` behind `AppModel`. The UI doesn't change.
- Blocked on:
  - which API is the contract (Pages `/api/v1/*` or `services/schedule-api`)
  - the RMP access decision
  - API keys for installed apps
  - offline and stale states

### Phase 6: Release
- Mac through `scripts/publish-to-website.py` (never hand-edit `public/updates/`), then reopen downloads per the website's AGENTS.md.
- Windows when hosting is decided. Both apps ship as one version (0.5.0-beta.1) unless the owner says otherwise.

## Working rules
- Before each phase:
  - Read the AGENTS.md files.
  - `git fetch` both repos and compare with `origin/main`. Pull only with the owner's OK.
  - Claim files on `scripts/agents.py` as `claude`. **Python is not installed on this Windows PC**, so install it or run the board elsewhere.
- Update the website AGENTS.md (Current state, Design rules with playful accents) and replace `docs/APP_REDESIGN_PLAN.md` with this plan. Add a pointer in the app repo's `docs/PROJECT_STATUS.md`.
- Each phase ends with changed files, checks run, limitations, and a GitHub Desktop Summary/Description per repo. Nothing is committed, pushed or deployed without the owner's OK.

## Verification (end to end)
- **Website:** `pnpm typecheck && pnpm test && pnpm build && pnpm test:browser`, then a visual check at 390/1280 with motion on and off. The demo labels stay intact.
- **Windows:** the Phase 3 checks. `vendor/bye-shared/SOURCE.json` matches the website commit.
- **Mac (on the Mac):** `swift test` (vectors and token drift), then build and relaunch the test app.
- **App flow (both apps):**
  - A fresh profile goes Welcome → Name → Home. Skip works. The name and recent classes persist across relaunch.
  - ⌘K/Ctrl K and the ↑ ↓ ↵ flows work with the keyboard only. VoiceOver/Narrator pass.
  - Update check: Mac in a release build (inert in `BYE Test.app`); Windows against a local `latest.json`, plus the offline and up-to-date states.
- **Fix-flow drill:** change one token and one shared component, then build and sync. Web, Windows and the Mac `Tokens.swift` all pick it up.
