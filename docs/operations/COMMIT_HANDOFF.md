# GitHub Desktop commit handoff

This is the historical website-source migration handoff. Its inclusion list and checks describe that work, not the October 20 documentation reorganization. For the current documentation map, start at [Documents](../README.md).

Commit the website repository first, then the app repository's migration. Do not include unrelated changes. These are prepared local changes; committing does not satisfy the live release gates.

## BYE_website

Include the website-owned application, core, API, Worker, scripts, tests, docs, root package/configuration and lockfile, notices, generated app/demo builds, routing and header rules, and updated agent/readme guidance. The Mac update/download files and landing page are unchanged.

Summary:

```text
Implement website-owned PCC web beta with gated live API
```

Description:

```text
Migrate browser source into the website repository and add independent demo/live builds, a typed Pages API, shared SQLite source caching, and a browser-owned live flow.

Preserve neutral profile matching, source timestamps, enrollment freshness, review pagination, cancellation and browser-local choices. Keep the live release disabled pending source authorization and deployed acceptance.

Validated with 50 unit/integration tests, dual builds, local workerd checks, and Chromium/WebKit fixture flows at phone and desktop sizes. No deployment or production activation performed.
```

## BYE_Before_You_Enroll

Include the removed browser source/config/tests, the migration README, and only the browser-location update in AGENTS.md. AGENTS.md already contained unrelated preexisting edits: use GitHub Desktop's selected-line staging to include the migration change, or keep its earlier edits in their own intended commit. Leave existing benchmarks/lightweight-selection and the preexisting untracked apps/web/AGENTS.md and CLAUDE.md out of this migration commit unless their owner chooses otherwise. The historical area guide was preserved because Claude's restored coordination board still claimed it.

Summary:

```text
Move browser app ownership to the website repository
```

Description:

```text
Replace the former apps/web implementation with a migration pointer to BYE_website, and update the app agent guide to use the new source location.

The native Mac and Electron source are unchanged. Website builds and verification now run independently from BYE_website.
```

## Shared workspace context

The parent AGENTS.md and claude-memory/bye-web-demo.md were updated outside both Git repositories. Preserve these files in the workspace backup; they are not part of either repository commit.
