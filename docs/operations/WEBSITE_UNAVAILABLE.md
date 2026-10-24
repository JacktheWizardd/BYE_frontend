# Public website unavailable

The owner requested the public website shutdown and retirement preparation on October 23, 2026 (the earlier remote shutdown record was dated October 24). The pull merge combines that earlier gate and shared-app work with the local retirement implementation; incoming application source and generated assets are retained.

`functions/_middleware.ts` delegates to `server/availability.ts`. All public pages, old assets, ordinary downloads and website APIs return uncached HTTP 503 responses before authentication, email or database handlers run. Holding pages and their explicitly allowed style/font assets remain available. All-path `_routes.json` is intentional.

GET and HEAD requests to the exact Mac `/updates/appcast.xml`, versioned Apple Silicon update ZIPs and checksum paths pass through unchanged. Unexpected paths, query strings and write methods remain blocked. Signing material, existing release files and public feed contents are unchanged.

`/windows/latest.json` and `/download/windows/retirement` remain blocked while `retirement-release.json` has `windowsReady: false`. Enable only after actual Windows acceptance and verified hosting of the exact portable retirement ZIP; ordinary download routes remain closed. See `RETIREMENT_DELIVERY.md`.

This gate cannot disable already installed native apps or erase saved copies. The minimal retirement applications and owner-controlled service-key revocation are separate. Native Windows acceptance remains pending, and this merge performs no push, deployment or release publication.

Validation: `pnpm typecheck`, `pnpm test` (including `tests/shutdown.test.mjs` and retirement tests), `pnpm build`, `pnpm verify:static`, and `node --import tsx scripts/retirement-browser-acceptance.ts`. The focused gate tests can run with `node --import tsx --test tests/shutdown.test.mjs`.

To restore the website, deliberately review and remove the retirement gate and holding-page build protection, restore/regenerate the active entry pages, then deploy only with owner authorization. Reverting the earlier shutdown commit alone does not remove the later retirement gate. No source, user data or release artifacts are deleted by this merge.
