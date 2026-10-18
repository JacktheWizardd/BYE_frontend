# BYE browser app

Read the website-root AGENTS.md and docs/WEB_BETA.md first. This repository owns the application and its backend; do not import from the desktop checkout. Coordinate through the shared board in the sibling app repository before editing.

- `src/main.tsx` talks only to `Bridge`; `bridge.ts` selects demo/live at build time.
- `/demo/` is fictional and must make no API requests. `/app/` uses only the same-origin `/api/v1/*` API and never falls back to fictional data.
- `reviews/` is the dedicated owner-only form, built with `vite.reviews.config.ts`. It uses only same-origin `/api/reviews/*`; no browser Supabase SDK or token storage. Read `docs/REVIEW_SUBMISSION.md` for its independent disabled-by-default rollout.
- `packages/core` at the website root owns domain types and helpers. Preserve Mac semantics with regression fixtures.
- Visuals follow the home page (apps/landing): see the "Home page look" block at the end of `src/styles.css` and `src/motion.ts`. In demo mode keep every "sample" label; testers mistook the demo for real data.
- Keep mobile-first light styling, neutrality, no automatic professor selection, safe areas, 44px controls, and noindex. Re-test history and profile selection after UI changes.
- Missing source fields are unknown. Stale schedules suppress seats and waitlists. Never infer a matching professor from department or scores.
- Update docs/DATA_ACCESS.md and release-readiness.json with verified evidence, not guesses. Defaults must remain disabled until access and staging gates pass.

From the website root: `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:browser`. Generated `public/app` and `public/demo` are build outputs, not editable source. Source/font paths and tests must work without the app repository.

Current state (2026-10-16): migrated source, dual builds, gated live Bridge, API and shared-cache Worker implemented. Live release remains blocked on source access and deployed staging acceptance; consult docs for current verification evidence.


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
