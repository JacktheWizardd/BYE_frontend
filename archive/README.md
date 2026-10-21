# BYE website archive

This directory stores **selected historical design material**, not current product code or generated deployment output.

## Contents

- [`landing-ivory/`](landing-ivory/README.md): the October 17, 2026 ivory landing-page backup, retained for reference or possible restoration. This is **not currently deployed**.

## Archive policy

- Keep the canonical source in `apps/landing/`, `apps/web/` and `packages/`; archive copies are not automatically updated or included in builds.
- Prefer Git commits/tags rather than copying complete retired applications into new tracked folders.
- Preserve a short `README.md` alongside any archived design or experiment explaining its original role, date and why it was superseded.
- Do not archive current Cloudflare Functions, Workers, API security checks, environment configuration, review flows, release files, or anything under `public/updates/` as an organizational cleanup.
- Before moving any historical file here, check linked documentation, build references and third-party licensing.
- Don't store credentials, signing material, student data, local caches or proprietary model weights.

See [repository map](../docs/REPOSITORY_MAP.md) for active project ownership and the planned cross-platform client direction.
