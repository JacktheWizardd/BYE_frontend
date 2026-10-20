# BYE website

BYE (Before You Enroll) website at **https://bye-before-you-enroll.pages.dev**. This repository owns the React landing page in `apps/landing/`, browser app in `apps/web/`, shared packages, Pages APIs and source Worker. `pnpm build` generates the site under `public/`, including fictional `/demo/`, gated `/app/` and the separate `/reviews/` form. Edit source, not generated output.

See [Web beta](docs/web-app/WEB_BETA.md) for modes and rollout gates, and [Review submission](docs/reviews/REVIEW_SUBMISSION.md) for the independent review flow. Current source configuration and dated verification do not establish current hosted state.

AI agents and contributors: read [AGENTS.md](AGENTS.md) first. It lists what's safe to change, what must never change, and how to check your work.

## Documents

[Open the documentation home](docs/README.md) for area folders explaining what we built, why we chose it, how it works, and what remains.

[Web app](docs/web-app/README.md) · [Reviews](docs/reviews/README.md) · [Shared UI](docs/shared-ui/README.md) · [Operations](docs/operations/README.md)

## Deploy

Cloudflare Pages (project `bye-before-you-enroll`) builds from this repo on every push to `main`:

- Build command: `pnpm install --frozen-lockfile && pnpm build` (Node 24 / pnpm 11.25.0).
- Build output directory: `public`

The older Worker `bye-website` (`wrangler.jsonc`, https://bye-website.jack-truong2k1.workers.dev) still deploys from the same repo as a backup. No installed app uses its address.

**Installed apps check `https://bye-before-you-enroll.pages.dev/updates/appcast.xml`.** That address is built into each release, so keep this Pages project and its name once people have installed BYE.

## Things to update

- **New release** — from the app repo, after `./scripts/package-beta.sh`, run `python3 scripts/publish-to-website.py ../BYE_website`. It copies the DMG into `public/downloads/` and the in-app update files (`appcast.xml` and the signed zip) into `public/updates/`. Follow the desktop release procedure for redirects and version metadata; edit landing source and rebuild rather than hand-editing generated `public/index.html`. Publishing requires explicit authorization.
- **In-app updates** — installed copies of BYE check `/updates/appcast.xml` once a day. `/updates/` must load without signing in. If you ever protect the site with Cloudflare Access, add a Bypass rule for `/updates/`. `public/_headers` keeps the appcast cached for at most 5 minutes.
- **Download link** — buttons link to `/download`, which `public/_redirects` sends to the newest DMG in `public/downloads/`.
- **Feedback link** — edit landing source; preserve the `FEEDBACK LINK` marker in generated output.
- **Tester phase** — `robots.txt` and the `noindex` meta tag keep the site out of search engines. Remove both when launching publicly.

## Preview locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Live beta

Live schedule/RMP access and staging gates are recorded in [Data access](docs/operations/DATA_ACCESS.md). Both live switches default off; the landing page still points to sample data. The static backup Worker is unchanged.


## Full-app owner preview update — October 16, 2026

Live PCC/BYE browsing, separate BYE/RMP review sections, validated submission
prefilling, and owner-only BYE reporting are implemented locally. All six review
sorts match the Mac feature set. Summaries and statistical comparisons remain
disabled. See `docs/web-app/LIVE_APP_PREVIEW.md` from the website root. Production/demo
navigation and default flags remain unchanged; hosted acceptance is pending.


Owner preview deployed on October 16: https://full-app-owner-test.bye-before-you-enroll.pages.dev/reviews/ . BYE review routes
are enabled for the owner; PCC/RMP remain disabled. Hosted routing and phone/desktop
browser checks passed. Production settings and files were verified unchanged.
Hosted real owner login/source activation remain pending; see docs/web-app/LIVE_APP_PREVIEW.md
from the website root.
