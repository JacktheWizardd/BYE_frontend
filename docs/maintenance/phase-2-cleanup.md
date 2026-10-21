# Phase 2 repository cleanup — October 21, 2026

Docs-only physical relocation, based on GitHub `main` at `b5ed747b73cf52c317fd2db8b4386a4b92b390be`.
Branch: `cleanup/docs-phase2-2026-10-21`. This record describes this branch;
it does not claim the changes are merged, released or deployed.

## Exact physical moves

| Old repository path | New repository path |
| --- | --- |
| `docs/operations/COMMIT_HANDOFF.md` | [docs/history/operations/COMMIT_HANDOFF.md](../../docs/history/operations/COMMIT_HANDOFF.md) |
| `docs/operations/VERIFICATION.md` | [docs/history/operations/VERIFICATION.md](../../docs/history/operations/VERIFICATION.md) |

All listed original files were physically moved. Markdown changes only repair
links or staging-path references. Numeric CSV/JSON data remains unchanged.

## Inspection and coordination

Inspected both current GitHub main trees, all open PR file lists, desktop PR #8's
documentation renames and Windows runtime changes, desktop PR #9's proposal,
and website PR #13's proposal. This branch touches none of their changed paths.
It does not incorporate or rewrite those PRs.

Both owner checkouts contain substantial uncommitted native/Windows/API or browser
work. They were inspected read-only and left untouched; this work uses isolated
copies of the exact GitHub commits above. All eight cached local instruction
hashes matched their source files. GitHub main instructions were also inspected.
The shared board could not run: bundled Windows Python lacks Unix `fcntl`, the
Python Store alias is unusable, and no usable WSL installation was found. No board
state or file claims were fabricated. The configured parent `../AGENTS.md` is absent.

## Dependency checks and preserved boundaries

Searched tracked documentation, scripts, tests and configuration for old paths
before moving. No runtime or deployment consumer uses the relocated paths.
Application code, dependency manifests/locks, build/release scripts, CI configuration,
Supabase migrations/APIs, Cloudflare settings, generated public output, update feeds,
signed artifacts, download routes, branding and fonts are unchanged.

## Verification performed for this cleanup

- Repository-local Markdown path and heading-anchor scan against the base commit:
  174 local links checked, zero broken paths/anchors (including baseline).
- All relocated files exist at their new paths; relocated numeric data matches
  its original Git contents. Reviewed the rename/content diff and whitespace checks.
- No application/runtime/configuration/release changes in the staged diff.
- Website `node scripts/verify-static.mjs`: passed (routes, noindex, protected
  release paths, live/demo separation, secret/fixture exclusions and Windows update file).
- Application typecheck/build/browser suites were not rerun: this branch changes
  only Markdown, with no dependency, source, generated-output or rollout changes.
  Phone/desktop visuals and hosted behavior were not changed or newly certified.

## Deferred moves and deployment protection

Keep `DATA_ACCESS.md`, `SECURITY_REVIEW.md`, `WEB_BETA.md`, live-preview and review
guides in place: they still guide current security/rollout work or have locally
edited consumers. Keep `docs/release-readiness.json` in place for its machine callers.
Website PR #13 retains the shared-frontend proposal and its README/index edits.
No app/package/deployment/public/archive-source restructuring is included.

The branch commit uses `[CF-Pages-Skip]` as its prefix to suppress automatic Pages
deployment. This is documented by [Cloudflare's GitHub integration guide](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/).
Do not remove the skip prefix when updating this docs-only branch. No deploy,
release, main update or merge is authorized by this cleanup. Confirm deployment
controls separately before any later merge, because the resulting merge commit
has its own message and may otherwise trigger a build.
