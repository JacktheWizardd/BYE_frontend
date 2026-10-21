# BYE Preview desktop

This Tauri host mounts `@bye/app`; it contains no Electron or Node sidecar.
Run the root `pnpm dev:desktop` or `pnpm build:desktop` command after installing
the pinned Rust toolchain and native prerequisites. Build output is local only.

See [shared trial instructions and acceptance gates](../../docs/shared-ui/SHARED_APP_TRIAL.md).
The preview has independent identifiers/storage and defaults to fictional fixtures.
Do not copy legacy preferences or change deployment/update configuration.
