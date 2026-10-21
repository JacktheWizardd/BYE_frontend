# BYE website documents

Choose an area to understand **what we built, why we chose it, how it works, and what remains**. These engineering guides distinguish prepared source, recorded verification and actual rollout.

| Area | What you will find |
| --- | --- |
| [Web app and design](web-app/README.md) | Browser modes, redesign and owner-preview history |
| [Student reviews](reviews/README.md) | Submission, public API, verification and privacy |
| [Shared UI](shared-ui/README.md) | React packages, design tokens and Windows handoff |
| [Cross-platform client proposal](shared-ui/CROSS_PLATFORM_MIGRATION.md) | Tauri/Electron desktop evaluation, optional Capacitor mobile, code reuse and repository-layout decision |
| [Operations](operations/README.md) | Data access, security, verification and contributor handoff |

The [sibling desktop documentation](../../BYE_Before_You_Enroll/docs/README.md) covers native Mac, Windows, the schedule backend, AI experiments, releases and the product roadmap. Application and package READMEs remain beside their source. The machine-consumed `release-readiness.json` remains in this folder.

For current code ownership, read [AGENTS.md](../AGENTS.md). Consult [data access](operations/DATA_ACCESS.md) and [web beta](web-app/WEB_BETA.md) before any live-source rollout. Historical tests and readiness booleans do not authorize deployment.
