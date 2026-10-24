# Public website unavailable

The owner requested that the website be made unusable while retaining its role
as the desktop update host on October 24, 2026.

`functions/_middleware.ts` returns an uncached HTTP 503 page for public pages,
assets and new downloads, and an HTTP 503 JSON error for all website API routes.
No API handler, sign-in email or review write runs behind this gate.
`public/_routes.json` invokes it for every request, including static assets.
The existing landing/demo/review source and generated assets remain retained.

GET and HEAD requests to `/updates/*` and `/windows/latest.json` pass through
unchanged. Signed desktop update files, feeds and signing material are not
modified. This does not disable already installed native apps or remove cached
pages. Separate source services and the public BYE-releases repository remain
independent of this website gate.

Validation: `node --test tests/shutdown.test.mjs` (Node 22.16 or later).
The four gate tests passed locally. This environment contains only a partial
checkout without dependencies; the full typecheck, app tests, build and visual
checks have not run here. The sibling coordination board is unavailable, and no
coordination claims have been made.
The usual `pnpm typecheck`, `pnpm test`, `pnpm build` and hosted route checks
should also run in a full checkout with dependencies.

To restore the website, revert the shutdown commit and redeploy. No user data,
release artifacts or original frontend implementations are deleted.
