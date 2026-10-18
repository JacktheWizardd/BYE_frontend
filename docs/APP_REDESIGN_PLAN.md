# Plan: bring the website redesign to the Mac and Windows apps

Status: **plan only, not started** (written 2026-10-17). Implement on a later day, one phase at a time.

## Why

The website now has a polished, editorial BYE look with purposeful motion. The owner wants the same look and feel in both desktop apps, animated:
- the home page (`apps/landing`)
- the review page (`apps/web/reviews`)
- the web demo (`apps/web`, "Home page look" block in `src/styles.css`)

Today the apps use the same palette, but they feel static, and their layout and type scale lag behind the website.

## The two apps (in `../BYE_Before_You_Enroll`)

| App | Stack | Screens live in | Notes |
| --- | --- | --- | --- |
| **Mac** | SwiftUI, macOS 14+, Apple Silicon | `Sources/Classwise/Views/` (ContentView, SearchView, AvailableDaysPicker, ProfessorListCard, ProfessorReport, ProfileChooser, Components, UpdateSettingsView: ~1,100 lines) | `Components.swift` already holds `Palette`, `BYEFont`, `PillStyle`, `RatingBar`, `SeatMeter`, `ScoreCard`, `ReviewCard`, `ClassCard`. UI text uses SF Pro (design system rule); Libre Baskerville for titles and scores. |
| **Windows** | Electron 44 + React 19 + Vite | `apps/cross-platform/src/renderer/src/main.tsx` (419 lines) + `style.css` (173 lines) | It mirrors the Mac screens one-for-one (SearchScreen, ProfessorCard, CourseOverview, Report, Summary, Chooser). It's the same React as the web demo, so most website code and CSS can be ported almost directly. |

Both apps must keep their data logic untouched. This is a presentation and motion change only:
- the search pipeline, RMP lookup, caches, profile chooser rules
- the review sorts, the Mac updater

## Source of truth (copy from here, don't reinvent)

- **Tokens:** `apps/landing/src/styles.css` (`@theme`) and the end block of `apps/web/src/styles.css`. Colors are unchanged: paper `#FAF8F3`, linen `#F2EEE6`, tile `#EAE5DB`, ink `#161618`, ink-2 `#5F5A52`/`#6B665E`, line `#E2DCD0`, accent `#F2C14E`. New:
  - card radius 18, window radius 22
  - the "float" shadow: `0 1px 0 rgb(22 22 24 / .05), 0 24px 48px -28px rgb(22 22 24 / .38)`
  - pill buttons at least 52px tall (44px minimum hit area)
- **Type scale:** serif display headings, tight tracking (−0.03em), big on the search screen (web 64px, Mac title around 44–56pt).
- **Motion language** (one system, everything off for Reduce Motion):

| # | Moment | Website reference | Duration / easing |
| --- | --- | --- | --- |
| 1 | Yellow swipe draws under the headline ("Find your **professor.**") | `apps/landing/src/motion/hero.ts` | 1.1s, expo-out |
| 2 | Screens ease in (search → results → report) | `.screen-in`, `.story-screen` | 0.55s, expo-out, 10px rise + fade |
| 3 | Scores count up, rating and seat bars grow in | `apps/web/src/motion.ts` `useCountUp`, `@keyframes bar-in` | 0.9–1.2s, ease-out-cubic / expo-out |
| 4 | Professor cards stagger in; the selected card lifts (float shadow) | `apps/landing` reveal batch | 90ms stagger |
| 5 | Typed search hint ("MATH 5A", "ETH 014", "ENGL 1A") in the empty course field | `useTypedHint` | 110ms per character |
| 6 | Day chips spring when toggled | DayChips (landing) | short spring |
| 7 | "Checking RMP…" progress fills smoothly | `ProgressMeter` / `.progress` | linear |
| 8 | The review summary types out, with an "In development" label | `SummaryPanel` (landing `ui/Screens.tsx`) | 24ms per 3 characters |
| 9 | Sort menus as pills; the review list re-orders with a short move animation | landing `Select`, web demo sort pills | 0.3s |

  Ambient dots, parallax and 3D tilt stay website-only. Apps should feel calm, not showy (Apple HIG and Windows Fluent both favor restraint).

## Mac plan (SwiftUI)

**Phase M0: foundations** (`Components.swift`, new `Motion.swift`)
- `BYEMotion`: named animations (`screen = .timingCurve(0.16, 1, 0.3, 1, duration: 0.55)`, `bars`, `spring`). Each one checks `@Environment(\.accessibilityReduceMotion)` and returns `nil` or an instant change when it's on.
- `CountUpText`: use `contentTransition(.numericText(value:))` (macOS 14) plus `withAnimation`, or an `Animatable` modifier that interpolates the number.
- `RatingBar` / `SeatMeter`: grow from leading with `scaleEffect(x:anchor: .leading)` on appear.
- `SwipeHighlight`: a yellow capsule behind text whose width animates from 0 to 100%. It replaces `Highlighted` and the wordmark underline.
- Pill and secondary button styles at the website sizes. A `FloatShadow` modifier. A card radius of 18. Remove the `Eyebrow` labels above headings (impeccable rule; the website removed them).

**Phase M1: search screen** (`SearchView`, `AvailableDaysPicker`)
- A large serif headline with the swipe drawing in on appear.
- The course field gets the typed-hint prompt (Timer-driven, paused while focused or non-empty).
- Day chips become round pills with a spring on toggle. The primary "Find professors →" button turns yellow on hover.

**Phase M2: results** (`ContentView`, `ProfessorListCard`, `CourseOverview`, `ProgressMeter`)
- Cards stagger in, scores count up and bars grow.
- The selected card lifts with the float shadow, using `matchedGeometryEffect` for the selection outline.
- The progress meter fills smoothly. Sort control as pills.

**Phase M3: report** (`ProfessorReport`, `ScoreCard`, `ReviewCard`, `ClassCard`)
- The report slides and fades in when the selection changes.
- Score cards count up, and seat meters grow.
- Changing the review sort animates rows (`.animation(_, value: sort)` with `.transition(.opacity.combined(with: .move(edge: .top)))`).
- The summary panel: see the open question about AI summaries below.

**Phase M4: secondary surfaces** (`ProfileChooser`, `UpdateSettingsView`, the "Write a review" link)
- The sheet uses the website card styling. Settings get light polish only.

**Mac checks:**
- `swift test`; `./scripts/build-test-app.sh`; relaunch `test/BYE Test.app`.
- Test with Reduce Motion on (System Settings → Accessibility → Display).
- Test at the smallest supported window size.
- Instruments Time Profiler while scrolling a 20-professor list (no dropped frames).
- Screenshots for the owner.

## Windows plan (Electron + React)

**Phase W0: foundations** (`renderer/src/style.css`, new `renderer/src/motion.ts`)
- Port the "Home page look" block from `apps/web/src/styles.css`: tokens, pill buttons, cards, float shadow, `.screen-in`, `@keyframes bar-in`, the reduced-motion guard. Map class names; the renderer already has `.rating-bar`, `.chip`, `.tag`, `.eyebrow`.
- Copy `apps/web/src/motion.ts` (`useCountUp`, `useTypedHint`, `reducedMotion`) as is. Electron honors the Windows "Show animations" setting through `prefers-reduced-motion`.
- No new dependencies are needed. GSAP is optional, only if a sequenced timeline is wanted later (`gsap@3.15.0` is already vetted on the website).
- Fonts: the renderer bundles its own in `renderer/src/fonts`. Keep Libre Baskerville for display and Schibsted Grotesk for UI (Windows has no SF Pro).

**Phase W1–W4:** same screens and moments as M1–M4, in `SearchScreen`, `DaysPicker`, `ProfessorCard`, `CourseOverview`, `Report`, `Summary` and `Chooser`. Reuse the website components' markup patterns: `Select` pill, `SummaryPanel`, `DayChips`.

**Windows checks:**
- `npm run typecheck`, the existing tests in `apps/cross-platform/tests`, `scripts/verify-ui.ts` and `verify-offline.mjs` (offline fixtures, no network), `verify-packaged.ts`.
- Test with Windows "Animation effects" off.
- Check 100%, 125% and 150% display scaling, and the memory baseline (it must stay under the documented limit).
- Then `package.mjs` + `verify-zip.mjs`. The Windows download stays "Coming soon" on the website until hosting is decided.

## Suggested order and size

1. **M0 + W0** foundations (half a day each). Ship nothing yet; check the primitives in isolation.
2. **Search screen** on both (M1, W1). Show the owner before continuing.
3. **Results** (M2, W2), then **report** (M3, W3).
4. **Polish** (M4, W4), a full verification pass, then the release:
   - Mac through `scripts/publish-to-website.py` and the appcast. **Never** hand-edit `public/updates/`.
   - Windows ZIP once hosting is decided.

Work one app at a time, or run them in two parallel sessions: the apps share no files.

## Rules that carry over
- Neutral: no "best" or "top pick" labels, no automatic professor selection.
- Honest:
  - source timestamps stay visible
  - "Illustration" and "sample" labels where data is fake
  - AI features labelled truthfully
- 44px minimum targets, sentence case, → for main actions, no emoji, yellow only for the swipe, bars and progress.
- Coordinate through the app repo's agent board (`scripts/agents.py` in `../BYE_Before_You_Enroll/AGENTS.md`) before editing.
- Give the owner a GitHub Desktop Summary and Description at the end of each phase. Commit only when asked.

## Open questions for the owner (answer before starting)
1. **AI review summaries:** the website labels them "In development". The Mac app has on-device Apple summaries today (`AppleSummaryProvider.swift`), and Windows has them disabled. Should the Mac show them normally, or with the same "In development" label?
2. **A welcome screen:** should the apps get a short first-run screen (the home page hero in miniature), or open straight to search as today?
3. **Ambient dots:** website only (recommended), or a very faint version on the app search screen?
4. **Version:** ship as one release (0.5.0-beta.1) for both apps, or Mac first?
