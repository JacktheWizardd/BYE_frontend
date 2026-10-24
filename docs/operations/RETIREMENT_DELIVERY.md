# Retirement delivery — prepared locally, unpublished

The website remains shut down. No public/backend deployment was performed here.

All Pages requests pass `functions/_middleware.ts`. Public pages, old JavaScript, downloads and API handlers are blocked with uncached 503 responses. The fixed Mac appcast and update ZIP routes remain available. Holding-page assets are allowed explicitly.

`retirement-release.json` prepares Windows 0.5.1. Leave `windowsReady` false until the Windows portable package passes native acceptance and the exact public release artifact exists. When enabled, `/windows/latest.json` supplies 0.5.1 and `/download/windows/retirement` redirects to that exact portable ZIP; ordinary download routes remain closed. The default gate is intentionally closed while packages are unreviewed.

Existing uncommitted holding pages are retained with accurate retirement copy. `pnpm build` and `pnpm verify:static` verify retirement state instead of regenerating active pages. The Worker-only asset fallback is not production Pages middleware; do not deploy it as a substitute.

Before any publication: reconcile these local changes with remote main's earlier shutdown commit, preserve its gate, verify unauthenticated GET/HEAD feed delivery and signed archive integrity, and run native update acceptance. Upload archives and feed atomically using the release script only. A production push/deployment requires a separate explicit request. Keep the source and old release archives intact for recovery; no client-side removal can erase previously saved copies.

Owner revision: no self-deletion or automatic cleanup. Windows delivery is a portable ZIP; remove the old app folder manually before extracting the replacement into a fresh folder. The retired app only shows a notice, version, update check, show-folder and quit controls. Service keys were disabled independently by the owner, not by this implementation.

Verification this session: pnpm typecheck, all 104 tests, pnpm build and pnpm verify:static passed. `node --import tsx scripts/retirement-browser-acceptance.ts` passed Chromium/WebKit at 390 and 1280 pixels with no overflow, no external renderer requests and website API rejection. These are local fixtures, not proof of Cloudflare deployment. The Windows retirement UI now includes Uninstall BYE using its registered interactive uninstaller, with an Installed apps fallback; native Windows evidence is still pending.

## October 23 merge verification

The active pull merge from remote `208c080` was reconciled with local retirement commit `95ac066`. All six conflicts were resolved: keep the retirement gate and holding-page entry points, combine both sets of current-state notes, and retain incoming shared-app source/assets. The imported shutdown regression tests now assert the approved retirement policy, including blocked unreviewed Windows delivery.

Typecheck, all 120 combined tests, the retirement-preserving build/static checks and Chromium/WebKit checks at 390/1280 passed. Existing Mac feed/release files and Windows metadata files remain unchanged. Actual Windows acceptance remains pending; Windows readiness stays false. No push, deployment or application-release publication was performed.

GitHub Desktop Summary:
```text
Merge origin/main while preserving BYE retirement shutdown
```

Description:
```text
Resolve six website merge conflicts by retaining the retirement gate and holding pages, combining current-state documentation and preserving upstream shared-app work. Align the imported shutdown tests and operations notes with the approved retirement behavior. Mac update delivery stays available; Windows retirement delivery stays disabled pending native acceptance.

Verified: typecheck, 120 tests, build/static checks and Chromium/WebKit retirement fixtures at 390/1280. No push, deployment or release publication.
```
