# BYE website

Landing page for BYE (Before You Enroll) at **https://bye-before-you-enroll.pages.dev**. Plain HTML and CSS in `public/`, no build step.

## Deploy

Cloudflare Pages (project `bye-before-you-enroll`) builds from this repo on every push to `main`:

- Build command: *(empty)*
- Build output directory: `public`

The older Worker `bye-website` (`wrangler.jsonc`, https://bye-website.jack-truong2k1.workers.dev) still deploys from the same repo as a backup. No installed app uses its address.

**Installed apps check `https://bye-before-you-enroll.pages.dev/updates/appcast.xml`.** That address is built into each release, so keep this Pages project and its name once people have installed BYE.

## Things to update

- **New release** — from the app repo, after `./scripts/package-beta.sh`, run `python3 scripts/publish-to-website.py ../BYE_website`. It copies the DMG into `public/downloads/` and the in-app update files (`appcast.xml` and the signed zip) into `public/updates/`. Then change the DMG file name in `_redirects` and the version line in `index.html`, and push.
- **In-app updates** — installed copies of BYE check `/updates/appcast.xml` once a day. `/updates/` must load without signing in. If you ever protect the site with Cloudflare Access, add a Bypass rule for `/updates/`. `public/_headers` keeps the appcast cached for at most 5 minutes.
- **Download link** — buttons link to `/download`, which `public/_redirects` sends to the newest DMG in `public/downloads/`.
- **Feedback link** — marked `FEEDBACK LINK` in `public/index.html`.
- **Version line** under the download button when a new beta ships.
- **Tester phase** — `robots.txt` and the `noindex` meta tag keep the site out of search engines. Remove both when launching publicly.

## Preview locally

```sh
npx wrangler dev
```
