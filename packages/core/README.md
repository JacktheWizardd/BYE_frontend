# Website-owned portable core

`domain.ts` and `types.ts` originated from BYE's Electron `src/shared` implementation. The browser/server copies are now maintained here; no desktop runtime or sibling checkout is needed. `api.ts` defines the website API's response contract.

Enrollment details and structured day fields follow the native `ClasswiseCore/Models.swift` behavior as of October 16, 2026. Preserve parity with explicit regression fixtures when changing course normalization, day filtering, identity matching or section grouping. This is a source migration, not a shared package release to the desktop apps; their source stays unchanged.

The server network adapter is ported from BYE's Electron client to Web APIs. Retained third-party notices, including Amaan's MIT client attribution and font licenses, are in the website-root `THIRD_PARTY_NOTICES.md`.
