# Shared UI

> **Agreed direction:** [Shared application migration](CROSS_PLATFORM_MIGRATION.md): React/TypeScript, Tauri desktop candidate, later Capacitor, with frontend and backend ownership in the existing two repositories. Electron is legacy only; replacement remains subject to validation.

## What we built and why

Canonical React screens, domain helpers and design tokens live in this repository. `packages/app` is mounted by `apps/preview` and the isolated Tauri host in `apps/desktop`, using workspace packages directly. The retained Windows app vendors an explicit snapshot rather than importing code across checkouts. BYE reviews appear before RMP with independent labels and states; their ratings and text are never merged.

## How it works

- [Shared React components](../../packages/ui/README.md)
- [Shared domain types and helpers](../../packages/core/README.md)
- [Design tokens](../../packages/tokens/tokens.json)
- [Windows integration handoff](WINDOWS_API_HANDOFF.md)
- [UI parity in the sibling desktop repo](../../../BYE_Before_You_Enroll/docs/UI_PARITY.md)

Edit canonical packages here. The retained Windows client's `scripts/sync-bye-shared.mjs` workflow is only for that legacy snapshot, not the shared browser/Tauri workspace. Keep sample disclosures and web freshness behavior distinct from Windows API freshness.

Backend contracts are owned by `BYE_Before_You_Enroll`; `packages/api-contracts`
here is a pinned, independently usable snapshot. From the backend root, run
`pnpm contracts:check <frontend-checkout>/packages/api-contracts` to verify it.
See [current ownership and backend relocation inventory](../REPOSITORY_MAP.md).

## What remains

The requested BYE/RMP source toggle is a separate UI change. The existing Mac
source remains SwiftUI. The [shared application trial](SHARED_APP_TRIAL.md) adds
isolated browser/Tauri hosts using canonical workspace packages, with source
provenance, verification and the remaining real-Mac acceptance gate.

[All documents](../README.md)
