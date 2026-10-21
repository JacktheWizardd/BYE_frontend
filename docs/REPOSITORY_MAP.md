# Website/frontend repository map

**Snapshot:** October 20, 2026. This is a navigation and ownership guide for the **existing** `BYE_website` main branch, not a Tauri or Capacitor implementation.

## Current directories

| Directory | Classification | Responsibility |
| --- | --- | --- |
| `apps/landing/` | Active | Public landing page source |
| `apps/web/` | Active | Web app/demo and reviews UI |
| `packages/ui/` | Active, canonical | React screens and shared components |
| `packages/core/` | Active, canonical | Domain models, helpers and fixtures |
| `packages/tokens/` | Active, canonical | BYE design tokens and generated platform values |
| `server/`, `functions/`, `workers/` | Active server-side | Browser-facing APIs, review flows and gated source Worker; preserve deployment and auth boundaries |
| `scripts/` | Active and mixed | Build, verification, previews, source probes and release gates |
| `docs/` | Active and historical | Operational guidance, decisions, dated records and current rollout gates |
| `tests/` | Active | TypeScript/browser tests |
| `archive/landing-ivory/` | Archived | Older landing design backup; intentionally not deployed |
| `public/` | Generated + release-critical | Website output, static assets, update feeds and downloads; do not treat as disposable wholesale |

## Repo relationships

The sibling [desktop and schedule backend repo](https://github.com/JacktheWizardd/BYE_Before_You_Enroll) owns active Windows Electron, native Mac SwiftUI and the standalone schedule backend. Windows currently vendors a snapshot of `packages/{ui,core,tokens}` using `scripts/sync-bye-shared.mjs`; the website packages remain canonical. Mac uses distinct SwiftUI UI code and does not import React screens.

**Planned, not completed:** The [cross-platform proposal (website PR #13)](https://github.com/JacktheWizardd/BYE_website/pull/13) considers a shared React frontend, desktop Tauri-versus-Electron testing, optional later Capacitor mobile, and whether to consolidate client code in this repo. Neither the framework nor repository move is implemented.

## Protect these boundaries

- Cloudflare Pages `main` pushes may deploy. Run website build and verification before any changes that can affect `public/`.
- `public/updates/appcast.xml`, signed Mac update ZIPs, existing download URLs, and release assets support installed clients. Do not delete, move or regenerate them as housekeeping.
- `/demo/` must remain clearly fictional. Live PCC and RMP access is separately gated.
- Student review verification and backend privileges must remain server-side; do not move secret keys into browser/desktop/mobile code.
- Deployed schedule service and independent student reviews backend must not be combined merely because they share a brand.
- Local or generated files and `.env` content stay out of Git; the existing `.gitignore` already excludes common secrets and build caches.

## Safe cleanup approach

1. Keep canonical application and UI paths unchanged while desktop framework selection is pending.
2. Index existing archive and historical documentation, and check links before moving any historical files.
3. Resolve pending cross-platform documentation work before overlapping README/index rewrites.
4. Verify scripts, imports, CI and Cloudflare release paths before consolidating any frontend source.
5. Introduce new workspace apps/packages only when a working Tauri/React proof of concept demonstrates the benefit.
6. Preserve old commits and app releases; use Git tags and written rollback plans rather than duplicating retired source folders.

**This initial housekeeping changes only documentation.** It does not relocate application code, merge repositories, install dependencies, activate features, change permissions, or publish anything.
