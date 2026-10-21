# Shared application trial

React + TypeScript is the agreed shared frontend. Tauri 2 is the desktop
candidate; Capacitor follows desktop validation. Electron is legacy only and
has no role in the target architecture. Repository names stay unchanged.

## Implemented boundary

`apps/preview` and `apps/desktop` mount the same `packages/app` screens, state,
onboarding, search, results, professor reports, settings and command menu.
Browser/Tauri adapters implement the existing Bridge command/subscribe interface.
UI, domain helpers, tokens and fonts come directly from this workspace, with no
runtime dependency on the sibling desktop checkout or its vendored snapshot.
The marketing page and production app entry points remain unchanged.

`packages/api-client` preserves the browser controller's typed operations,
cancellation, explicit professor selection, schedule freshness/expiry and bounded
foreground polling. Public BYE review reads are independent of RMP, validate
response shapes and identities, and keep writing/reporting in the website flow.
AI is disabled; its existing feature boundary remains without inference packages.

The backend-owned `@bye/contracts` version `1.0.0-preview.1` is an intentional
snapshot with SHA-256 identities in `packages/api-contracts/SOURCE.json`. It
preserves existing response shapes and separately pins the schedule-service
OpenAPI schema. Export/check instructions live in the backend package README.

Tauri uses five app-specific commands only: load/save preview state, bounded GET,
cancel request and approved external link. No remote page gets capabilities.
HTTP is HTTPS, fixed-origin, GET-only, no redirects, eight concurrent requests,
4 MiB response limit and 65-second deadline. Status and Retry-After survive the
adapter. Cookies/tokens/auth and privileged credentials are not migrated.

## Source mapping and parallel work

These are **non-destructive extractions**. No existing source was deleted or
physically relocated because legacy apps remain the rollback baseline.
Exact input files/hashes are recorded in [MIGRATION_SOURCE.json](MIGRATION_SOURCE.json).

| Input | New canonical trial location |
| --- | --- |
| Desktop main `apps/cross-platform/src/renderer/src/App.tsx` | `packages/app/src/App.tsx` |
| Desktop main `apps/cross-platform/src/renderer/src/app/*` | `packages/app/src/app/*` with injected runtime and responsive navigation |
| Website `apps/web/src/{demo-bridge,demo-data}.ts` | `packages/api-client/src/` |
| Newer local website `apps/web/src/live-bridge.ts` and tests | `packages/api-client/src/live-bridge.ts` and `tests/live-bridge.test.ts` |
| Newer portable local schedule SDK | `packages/api-client/src/schedule-api.ts` (preserved separately, not substituted into the controller) |
| Website public contract types + backend checked-in OpenAPI | Backend `packages/api-contracts`; pinned frontend snapshot |
| Existing desktop branding icon | `apps/desktop/src-tauri/icons` (resized using Tauri icon tooling) |

Extraction baseline main: website `6f9ebb3b5fb0c81c4c8fc8ef406114e02156020e`, desktop
`c137d3922d4a3105691d2461ebf47a02a7486245`. All eight instruction hashes matched
the local manifest before implementation. Original working checkouts remain
untouched, including newer schedule integrations. Desktop PR #8 remains a separate
runtime/documentation workstream; its Electron/native changes are not overwritten
or implicitly merged. PRs #9/#13 carry the updated architecture decision.
Coordination script `scripts/agents.py` cannot run in this Windows environment
because its Unix `fcntl` import fails; no board state was fabricated.

Before publication, branches were rebased onto website main
`2fed520ef76292e0d89fb303c5af5f6a56bce00c` and desktop main
`c4cbcd023a7e16ce429ad99920a218117cff6257`. Those later owner changes retire
the legacy apps and disable their network features. The isolated fixture preview
does not undo those switches, reopen production, or alter the final 0.4.1 release
assets. Live-mode source remains opt-in engineering work, not an authorized rollout.

## Run locally

Use Node 22.16+, pnpm 11.25.0 and `pnpm install --frozen-lockfile` at the repository
root. Existing website build commands retain their original output.

```sh
pnpm dev:preview
pnpm build:preview
pnpm test:shared-app
pnpm test:preview:browser
pnpm dev:desktop
pnpm build:desktop
```

The desktop uses pinned Rust 1.90.0, Tauri 2.12.4, tauri-build 2.7.3, API 2.12.4
and CLI 2.12.3. Install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/):
Windows requires Microsoft C++ tools, SDK and WebView2; Mac requires Xcode command
line tools. The build produces a local executable, without an installer/updater.
On Mac use `pnpm dev:desktop` for the native trial or launch the built
`apps/desktop/src-tauri/target/release/bye-preview` executable. No Mac build is
claimed from Windows. Keep signing/distribution work separate.

Default mode is labelled fictional sample data and performs no API calls.
For an authorized fixture/staging trial, set `VITE_BYE_PREVIEW_LIVE=true` at
build/dev time. Browser `/api/*` stays same-origin; Vite proxies the local backend
on port 8788. Native reads default to the existing gated website origin, or a
compile-time `BYE_PREVIEW_API_ORIGIN` restricted to its HTTPS Pages preview
subdomains. A disabled backend remains an error; it never falls back to fixtures.
Enabling this client flag does not authorize changing server access flags.

Preview ID is `org.beforeyouenroll.bye.preview`. Native state is
`preferences-v1.json` in Tauri's app-data directory for that ID; browser keys begin
`bye-preview:v1:`. No automatic legacy imports occur. Settings writes are validated,
serialized and rolled back on failure. Updates are explicitly manual.

## Verification and remaining acceptance

Recorded on Windows with repository fixtures; no public deployment performed:

- TypeScript checks, original 87 domain/API tests and 25 shared adapter/controller/
  response tests passed. Includes all-selected-days, asynchronous/unknown-day and
  stale-seat rules, abort/race/profile identity, independent source errors,
  failed saves, HTTP 429 and malformed review responses.
- Existing website production build passed; generated output is excluded from this
  migration change, preserving current main's production files and release assets.
  Existing Chromium/WebKit browser suite passed at 375/390/1280; local Pages
  runtime acceptance passed. These are fixture checks, not live-data rollout evidence.
- Shared preview Chromium/WebKit passed at 390 and 1280, including no automatic
  professor selection, phone history, no overflow, sample-data/no-API behavior.
- Native Rust security tests and actual Windows WebView2 preview exercised
  persistence, explicit selection, reviews and rejected API/link/state inputs.
  Native instrumentation is a smoke check, not a comparative performance benchmark.

Real Mac acceptance is **pending**. On both platforms record OS/hardware/WebView,
five cold/warm starts, idle/search CPU and memory, responsiveness and package size
against the existing app using identical fixtures/feature settings. Test restart
persistence, keyboard shortcuts, external links, window lifecycle, offline recovery,
rate limits, cancellation/rapid switching, reduced motion and touch/keyboard access.
On Mac confirm WebKit layout/font/navigation behavior and command restrictions.
Do not treat browser WebKit or the Windows smoke run as that evidence.

## Deferred gates

Backend implementation/Worker/test/deployment-tool moves and thin service-binding
forwarders wait for actual Windows **and** Mac trial acceptance. Existing services,
bindings, databases, migrations and public URLs stay in place. Staging must then
prove cookies/auth/origins/rates/status/freshness and rollback before separately
authorized production cutover. Capacitor, personal sync, legacy preference import,
signed Tauri updates and legacy retirement remain subsequent milestones. No
merges, production deploys, public releases or app removal are authorized here.
