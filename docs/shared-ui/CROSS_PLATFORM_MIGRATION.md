# Cross-platform client consolidation — proposal (October 20, 2026)

**Status: proposed, not implemented.** This page is a companion to the full decision and migration plan in the desktop repository: [BYE cross-platform migration proposal](https://github.com/JacktheWizardd/BYE_Before_You_Enroll/blob/main/docs/cross-platform-migration-proposal.md). The proposal may still be on a review branch; do not treat it as accepted until merged.

## Why

The current BYE Windows v3 frontend is built with Electron, React and TypeScript; the macOS app independently implements feature screens in SwiftUI. Recreating UI and upcoming AI features separately causes feature drift, repeated bug fixes and delays. Centralized data services lower migration complexity, but they do not eliminate desktop UI duplication.

## What this repository already owns

- `packages/ui/`: **canonical** React screens and components.
- `packages/core/`: shared domain types/helpers and behavior test vectors.
- `packages/tokens/`: canonical colors, typography and other design tokens.
- `apps/web/` and `apps/landing/`: browser and public website experiences.
- Student review routes/functions and deployment infrastructure. They have separate authorization and release requirements.

The Windows app in the sibling repository consumes a **vendored snapshot** of `packages/{ui,core,tokens}` through `scripts/sync-bye-shared.mjs`, recording the source commit in `SOURCE.json`. This is not live linking: changes here are not in Windows until an intentional sync. The Mac app does not use the React UI.

## Candidate architecture, not a migration

```text
Canonical React + TypeScript UI and domain helpers
         |                     |
   Tauri 2 desktop          Capacitor mobile (later)
   Windows + macOS           iOS + Android
         |
   Typed API clients
         |
 Separate existing backend domains:
 PCC schedule service | Student reviews service | existing RMP integrations
```

Compare Tauri 2 against **Electron with one shared React frontend on both desktop platforms** before deciding: lower memory/installer footprint is not sufficient on its own to justify a risky rewrite. Test WebView2/WebKit behavior, native persistence, security, updates/signing, performance and optional AI. Capacitor is a later mobile candidate; responsive mobile interfaces still need separate UX and native testing.

The backend services may be deployed while **desktop schedule API migration remains pending**. Do not represent the existing `BYEAPI` native Swift module as a hosted API. AI review summaries are paused in existing desktop betas; do not enable local inference, paid AI or downloads by merely changing framework.

## Repository-layout decision is open

| Option | Benefit | Risk |
| --- | --- | --- |
| Keep `BYE_website` and `BYE_Before_You_Enroll` separate | Minimal disruption; existing release/deployment ownership remains | Manual, non-atomic shared-code sync |
| **Consolidate frontend apps in an existing React workspace (candidate)** | One coherent dependency tree and source version for web/desktop/future mobile | Requires carefully moving desktop sources and updating CI, vendoring, docs and release paths |
| Merge everything, including services | Single code view | Largest increase in deployment/security coupling and migration complexity |

**For now:** keep both existing repositories. Preserve deployed website, review service, schedule API, Windows v3, legacy Mac and signed update URLs. Evaluate frontend consolidation after a Tauri/Electron reuse spike; decide repo topology explicitly before moving code. Do not create a third repository solely for the framework migration without a clear ownership/maintenance reason.

## Proposed frontend handoff and safety checks

1. Inventory the React app shell and Electron preload/API dependencies; isolate the core UI state and typed API contracts.
2. Preserve the canonical React packages here. Establish import/build/tests for both desktop platforms before deleting the vendor snapshot workflow.
3. Test search, professor chooser/identity rules, class-day filtering, seats/reviews and review provenance in both WebView engines.
4. Test touch/safe areas, mobile navigation and slow/offline connections separately if Capacitor is adopted.
5. Preserve fictional demo labeling, review verification backend boundaries, site release-readiness gates, update assets, signing and API credentials.
6. Compare memory/CPU/startup, accessibility and distribution paths with the existing Electron build; record findings in a separate go/no-go decision.
7. Only then select repo changes, shipping framework and migration plan. No student-facing releases are authorized by these docs.

This document describes intended engineering direction rather than current production behavior. Documentation changes alone do not authorize a build, migration, release, data-access change or deployment.
