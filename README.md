# BYE website

Landing page for BYE (Before You Enroll) at **https://bye-before-you-enroll.pages.dev**. Plain HTML and CSS in `public/`, no build step. The browser source now lives in this repository at `apps/web/`. Builds produce the fictional `/demo/` and gated live `/app/`. See [Web beta](docs/WEB_BETA.md) for setup, API, verification and rollout. The owner-only `/reviews/` form is prepared separately; see [Review submission](docs/REVIEW_SUBMISSION.md) for email setup, local testing, and preview rollout.

AI agents and contributors: read [AGENTS.md](AGENTS.md) first. It lists what's safe to change, what must never change, and how to check your work.

## Deploy

Cloudflare Pages (project `bye-before-you-enroll`) builds from this repo on every push to `main`:

- Existing deployment remains static until the owner configures Functions. New build command: `pnpm install --frozen-lockfile && pnpm build` (Node 24 / pnpm 11.25.0).
- Build output directory: `public`

The older Worker `bye-website` (`wrangler.jsonc`, https://bye-website.jack-truong2k1.workers.dev) still deploys from the same repo as a backup. No installed app uses its address.

**Installed apps check `https://bye-before-you-enroll.pages.dev/updates/appcast.xml`.** That address is built into each release, so keep this Pages project and its name once people have installed BYE.

## Things to update

- **New release** — from the app repo, after `./scripts/package-beta.sh`, run `python3 scripts/publish-to-website.py ../BYE_website`. It copies the DMG into `public/downloads/` and the in-app update files (`appcast.xml` and the signed zip) into `public/updates/`. Then change the DMG file name in `_redirects` (and the macOS requirement lines in `index.html` if they changed), and push.
- **In-app updates** — installed copies of BYE check `/updates/appcast.xml` once a day. `/updates/` must load without signing in. If you ever protect the site with Cloudflare Access, add a Bypass rule for `/updates/`. `public/_headers` keeps the appcast cached for at most 5 minutes.
- **Download link** — buttons link to `/download`, which `public/_redirects` sends to the newest DMG in `public/downloads/`.
- **Feedback link** — marked `FEEDBACK LINK` in `public/index.html`.
- **Tester phase** — `robots.txt` and the `noindex` meta tag keep the site out of search engines. Remove both when launching publicly.

## Preview locally

```sh
pnpm install --frozen-lockfile
pnpm dev
```

## Live beta

Implementation is prepared but unreleased. Source-access and staging gates are recorded in [Data access](docs/DATA_ACCESS.md). Both live switches default off; the landing page still points to sample data. The static backup Worker is unchanged.


## Full-app owner preview update — October 16, 2026

Live PCC/BYE browsing, separate BYE/RMP review sections, validated submission
prefilling, and owner-only BYE reporting are implemented locally. All six review
sorts match the Mac feature set. Summaries and statistical comparisons remain
disabled. See `docs/LIVE_APP_PREVIEW.md` from the website root. Production/demo
navigation and default flags remain unchanged; hosted acceptance is pending.


Owner preview deployed on October 16: https://full-app-owner-test.bye-before-you-enroll.pages.dev/reviews/ . BYE review routes
are enabled for the owner; PCC/RMP remain disabled. Hosted routing and phone/desktop
browser checks passed. Production settings and files were verified unchanged.
Hosted real owner login/source activation remain pending; see docs/LIVE_APP_PREVIEW.md
from the website root.
