# Shared UI

## What we built and why

Canonical React screens, domain helpers and design tokens live in this repository so browser and Windows behavior can evolve together. Windows vendors an explicit snapshot rather than importing browser code across checkouts. BYE reviews appear before RMP with independent labels and states; their ratings and text are never merged.

## How it works

- [Shared React components](../../packages/ui/README.md)
- [Shared domain types and helpers](../../packages/core/README.md)
- [Design tokens](../../packages/tokens/tokens.json)
- [Windows integration handoff](WINDOWS_API_HANDOFF.md)
- [UI parity in the sibling desktop repo](../../../BYE_Before_You_Enroll/docs/windows/UI_PARITY.md)

Edit canonical packages here, then use the desktop repo's existing `scripts/sync-bye-shared.mjs` workflow. Keep sample disclosures and web freshness behavior distinct from Windows API freshness.

## What remains

The requested BYE/RMP source toggle is a separate UI change. Mac remains native SwiftUI; shared React components do not automatically update it. Test actual consumers after future component changes; this task only reorganizes documentation.

[All documents](../README.md)
