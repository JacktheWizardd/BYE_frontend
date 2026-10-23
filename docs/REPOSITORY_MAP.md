# Website/frontend repository map

**Structure preparation:** October 21, 2026, based on main `3dcf5dd` (merged website PRs #13 and #16). Repository names and runtime locations are unchanged. The React/TypeScript workspace and isolated browser/Tauri trial are implemented; full desktop acceptance and backend relocation remain gated.

## Current directories

| Directory | Classification | Responsibility |
| --- | --- | --- |
| `apps/landing/` | Frontend | Public landing page source |
| `apps/web/` | Frontend | Existing browser app/demo and review interfaces |
| `apps/preview/`, `apps/desktop/` | Isolated frontend trial | Browser and Tauri hosts mounting the same shared app; fictional by default |
| `packages/app/`, `packages/api-client/` | Frontend, canonical | Shared React application and injected browser/native client operations |
| `packages/ui/`, `packages/core/`, `packages/tokens/` | Frontend, canonical | Shared components, domain helpers/vectors and design tokens |
| `packages/api-contracts/` | Backend-owned snapshot | `@bye/contracts` `1.0.0-preview.1`, with canonical LF SHA-256 hashes in `SOURCE.json`; no runtime sibling imports |
| `server/`, `functions/`, `workers/source/` | Transitional backend | Existing APIs, Pages handlers and source Worker remain implemented here until acceptance |
| `scripts/`, `tests/` | Mixed | Frontend builds/tests plus backend tooling/tests inventoried below |
| `docs/` | Active and historical | Current ownership, operations, decisions and dated evidence |
| `archive/landing-ivory/` | Archived | Prior landing design; not deployed |
| `public/` | Generated + release-critical | Site output, fonts, update feeds and downloads; never disposable wholesale |

## Repository relationship and contract workflow

`BYE_website` owns all new frontend application work and wrappers. The sibling
[backend repository](https://github.com/JacktheWizardd/BYE_Before_You_Enroll)
owns backend contracts, the independent schedule service and owner dashboard,
and migration records. SwiftUI/Electron clients and release tooling remain
there as retained legacy implementations; Electron is not a target or fallback.
The legacy Windows client still vendors a snapshot. The shared browser/Tauri
trial consumes packages directly from this workspace.

The backend root pnpm workspace covers `packages/*` only. Its schedule service
keeps npm, its own lockfile and Node 24.3+. Contract tooling uses Node 22.16+,
pnpm 11.25.0 and TypeScript 5.9.3:

```sh
# From the selected backend checkout; use the actual frontend worktree path.
pnpm install --frozen-lockfile
pnpm typecheck
pnpm contracts:check <frontend-checkout>/packages/api-contracts
```

Snapshot checking is read-only. `pnpm contracts:export <frontend-contract-directory>`
is an intentional writing operation. The frontend installs independently after
export; neither repository imports code from the other checkout at runtime.

## Backend relocation inventory — later gated phase

All source paths below are relative to this frontend repository. Destinations
are relative to `BYE_Before_You_Enroll`; they are planned locations, not new empty
services or a claim that code has moved.

| Current source | Planned destination / retained boundary | Dependencies to carry or resolve |
| --- | --- | --- |
| `server/service.ts`, `server/network.ts` | `services/web-api/` shared source/domain implementation used by the source Worker | Runtime helpers from `packages/core/domain.ts`; types from `packages/core/{types,api}.ts`; bounded source transport, cancellation, identity and rate errors |
| `server/reviews.ts`, `server/bye-reviews.ts` | `services/web-api/` review implementation, kept separate from the schedule service | Supabase SDK; `packages/core/reviews.ts` constants/types; course/name helpers from `packages/core/domain.ts`; current mutual review-module dependency |
| `functions/api/v1/[[route]].ts` | Current Pages handler remains here; later same-origin forwarder after service-binding design/staging | Method/route gates, disabled behavior, daily client digest, statuses, no-store/noindex and `SOURCES` binding behavior |
| `functions/api/reviews/[[route]].ts` | Current Pages handler remains here; later same-origin forwarder | Existing cookies, origins, authorization, review environment and error/status semantics |
| `workers/source/index.ts`, `workers/source/wrangler.jsonc` | `services/source-worker/` | Current `server/network`/`server/service` imports and core API types; `Sources` Durable Object, SQLite migration tags, script names, flags and bindings |
| `tests/{service,network,reviews,bye-reviews}.test.ts`, `tests/{fixtures,review-fixtures}.ts` | Backend test ownership after extraction | Fixtures currently import frontend demo data and shared domain helpers; extract independent fixtures before moving tests |
| `tests/live-bridge.test.ts`, `scripts/{browser,app-browser,review-browser}-acceptance.ts` | Client assertions stay frontend; backend fixture/transport support later becomes independent | Existing in-process server imports must be replaced by explicit fixture boundaries, never sibling runtime imports |
| `scripts/{review-dev,review-preview,runtime-acceptance,review-runtime-acceptance}.ts` | Backend runtime/fixture portions move later; frontend preview serving stays frontend | Miniflare, Wrangler build paths, `functions/`, source Worker and frontend demo/review fixtures are currently coupled |
| `scripts/{prepare-app-preview,prepare-review-preview,probe-pcc,release-gate}.mjs` | Split by responsibility during relocation; no moves now | Preview packaging includes frontend output; source probing is backend-owned; release gating consumes `docs/release-readiness.json` |
| `wrangler.pages.jsonc`, `wrangler.reviews.jsonc`, root package scripts and TypeScript config | Pages routing/build configuration stays frontend; backend tooling gets independent configuration later | Preserve project identity, bindings, cookies/origins and disabled source flags; root scripts currently run mixed tests/builds |

`packages/core` contains runtime algorithms as well as public types. The contract
snapshot alone cannot replace those imports: the later backend extraction needs
an independently owned runtime dependency and standalone fixture data. Do not
copy all frontend packages into the backend or introduce cross-checkout imports
as a shortcut. Frontend token/vector/landing tests, shared-app/client tests,
static verification, frontend builds and all release assets remain frontend-owned.
The existing schedule service and student-review database remain independent.

## Protect these boundaries

- Cloudflare Pages `main` pushes may deploy. Run website build and verification before any changes that can affect `public/`.
- `public/updates/appcast.xml`, signed Mac update ZIPs, existing download URLs, and release assets support installed clients. Do not delete, move or regenerate them as housekeeping.
- `/demo/` must remain clearly fictional. Live PCC and RMP access is separately gated.
- Student review verification and backend privileges must remain server-side; do not move secret keys into browser/desktop/mobile code.
- Deployed schedule service and independent student reviews backend must not be combined merely because they share a brand.
- Local or generated files and `.env` content stay out of Git; the existing `.gitignore` already excludes common secrets and build caches.

## Safe cleanup approach

Phase 2 moves two historical operations records into `docs/history/operations/`.
See [the move manifest and verification](maintenance/phase-2-cleanup.md) and
[history home](history/README.md). Current rollout guides stay in place.

1. Keep canonical frontend paths unchanged; Tauri trial acceptance is pending, not the React/TypeScript ownership decision.
2. Index existing archive and historical documentation, and check links before moving any historical files.
3. Treat merged PRs #13/#16 as the shared frontend baseline; preserve separate local evidence and other worktrees.
4. Verify scripts, imports, CI and Cloudflare release paths before consolidating any frontend source.
5. Backend implementation moves and forwarding services wait for desktop acceptance, then independent staging/rollback verification.
6. Preserve old commits and app releases; use Git tags and written rollback plans rather than duplicating retired source folders.

**This frontend structure preparation changes documentation only.** It does not relocate code, change contracts or workspace paths, enable features, modify deployment/release files, merge repositories or publish anything. The backend companion adds contract workspace tooling only.

Local preparation checks: frozen frontend install, `pnpm typecheck` and all 25
`pnpm test:shared-app` cases passed. Workspace listing and Tauri/Vite CLI version
checks resolved the desktop/browser hosts. The backend's read-only snapshot check
matched all four contract source hashes. Existing runtime/configuration/release
paths and the frontend lockfile had no diff; no native relaunch or production
build/deployment was needed for these documentation-only frontend changes.
