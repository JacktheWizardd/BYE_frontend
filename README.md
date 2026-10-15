# BYE website

Landing page for BYE (Before You Enroll). Plain HTML and CSS in `public/`, served by Cloudflare Workers static assets (`wrangler.jsonc`). No build step.

## Deploy

Cloudflare builds from this repo on every push to `main`:

- Build command: *(empty)*
- Deploy command: `npx wrangler deploy`

## Things to update

- **New release** — from the app repo, after `./scripts/package-beta.sh`, run `python3 scripts/publish-to-website.py ../BYE_website`. It copies the DMG into `public/downloads/` and the in-app update files (`appcast.xml` and the signed zip) into `public/updates/`. Then change the DMG file name in `_redirects` and the version line in `index.html`, and push.
- **In-app updates** — installed copies of BYE check `/updates/appcast.xml` once a day. `/updates/` must stay reachable without Cloudflare Access sign-in (an Access Bypass rule for that path). `public/_headers` keeps the appcast cached for at most 5 minutes.
- **Download link** — buttons link to `/download`, which `public/_redirects` sends to the newest DMG in `public/downloads/`.
- **Feedback link** — marked `FEEDBACK LINK` in `public/index.html`.
- **Version line** under the download button when a new beta ships.
- **Tester phase** — `robots.txt` and the `noindex` meta tag keep the site out of search engines. Remove both when launching publicly.

## Preview locally

```sh
npx wrangler dev
```
