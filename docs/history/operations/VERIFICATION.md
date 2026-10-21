# Web beta implementation verification

October 16, 2026. This is a locally verified implementation, **not a released live product**.

| Check | Result |
| --- | --- |
| Independent website typecheck and dual Vite build | Passed |
| Unit/integration tests | 50 passed, zero failures |
| Chromium UI at 375, 390 and 1280px | Passed with fictional test API |
| WebKit UI at 375, 390 and 1280px | Passed with fictional test API |
| Local workerd: actual Pages bundle + SQLite Durable Object | Passed with fictional outbound sources |
| Ten concurrent searches share one schedule retrieval | Passed in service and actual local runtime |
| Profile identity mismatch rejected by actual runtime | Passed, HTTP 409 |
| Disabled API, unsupported methods and arbitrary routes | Passed |
| Generated live bundle excludes fictional instructor data | Passed |
| noindex and protected distribution-route checks | Passed |
| Download/update files, redirect, landing HTML, backup Worker | Unchanged from repository baseline |
| Local public PCC Winter 2027 probe | Passed; see [Data access](../../operations/DATA_ACCESS.md) |
| Live release gate | Correctly blocked |
| Deployed Cloudflare source verification and free-tier capacity | Not performed; account not authenticated |
| Authorized live RMP retrieval | Not performed; permission not supplied |
| Physical Safari swipe-back and complete accessibility review | Not performed |

Browser checks exercise the production build on a loopback static server with a fictional API: keyboard suggestions, course search, neutral report selection, ambiguity/dismissal/selection, reviews and sorting, phone history back, disabled-live recovery to the sample demo, horizontal overflow and 44px buttons. Playwright WebKit is not a physical Safari device.

The local Worker check compiles the real Pages Functions and source Worker, instantiates SQLite Durable Objects, and intercepts outbound requests with fictional PCC and RMP responses. It checks the runtime-specific fetch behavior that Node tests cannot establish. No hosted resources are created.

Commands from the website root:

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm test:runtime
pnpm test:browser
pnpm verify:release  # expected to exit nonzero while release gates remain unmet
```

Screenshots are local artifacts under ignored `test-results/`. Source-access evidence and remaining gates are in [Data access](../../operations/DATA_ACCESS.md) and [release-readiness.json](../../release-readiness.json). No commit, push, production activation, or paid-plan change was performed.
