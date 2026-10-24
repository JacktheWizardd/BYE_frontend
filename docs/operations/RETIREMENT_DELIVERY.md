# Retirement delivery — prepared locally, unpublished

The website remains shut down. No public/backend deployment was performed here.

All Pages requests pass `functions/_middleware.ts`. Public pages, old JavaScript, downloads and API handlers are blocked with uncached 503 responses. The fixed Mac appcast and update ZIP routes remain available. Holding-page assets are allowed explicitly.

`retirement-release.json` prepares Windows 0.5.1. Leave `windowsReady` false until the Windows portable package passes native acceptance and the exact public release artifact exists. When enabled, `/windows/latest.json` supplies 0.5.1 and `/download/windows/retirement` redirects to that exact portable ZIP; ordinary download routes remain closed. The default gate is intentionally closed while packages are unreviewed.

Existing uncommitted holding pages are retained with accurate retirement copy. `pnpm build` and `pnpm verify:static` verify retirement state instead of regenerating active pages. The Worker-only asset fallback is not production Pages middleware; do not deploy it as a substitute.

Before any publication: reconcile these local changes with remote main's earlier shutdown commit, preserve its gate, verify unauthenticated GET/HEAD feed delivery and signed archive integrity, and run native update acceptance. Upload archives and feed atomically using the release script only. A production push/deployment requires a separate explicit request. Keep the source and old release archives intact for recovery; no client-side removal can erase previously saved copies.

Owner revision: no self-deletion or automatic cleanup. Windows delivery is a portable ZIP; remove the old app folder manually before extracting the replacement into a fresh folder. The retired app only shows a notice, version, update check, show-folder and quit controls. Service keys were disabled independently by the owner, not by this implementation.

Verification this session: pnpm typecheck, all 104 tests, pnpm build and pnpm verify:static passed. `node --import tsx scripts/retirement-browser-acceptance.ts` passed Chromium/WebKit at 390 and 1280 pixels with no overflow, no external renderer requests and website API rejection. These are local fixtures, not proof of Cloudflare deployment. The Windows retirement UI now includes Uninstall BYE using its registered interactive uninstaller, with an Installed apps fallback; native Windows evidence is still pending.
