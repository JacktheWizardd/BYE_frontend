# BYE website

Landing page for BYE (Before You Enroll). Plain HTML and CSS in `public/`, served by Cloudflare Workers static assets (`wrangler.jsonc`). No build step.

## Deploy

Cloudflare builds from this repo on every push to `main`:

- Build command: *(empty)*
- Deploy command: `npx wrangler deploy`

## Things to update

- **Download link** — buttons link to `/download`, which `public/_redirects` sends to the newest DMG in `public/downloads/`. New release: add the DMG, change the file name in `_redirects`, update the version line in `index.html`.
- **Feedback link** — marked `FEEDBACK LINK` in `public/index.html`.
- **Version line** under the download button when a new beta ships.
- **Tester phase** — `robots.txt` and the `noindex` meta tag keep the site out of search engines. Remove both when launching publicly.

## Preview locally

```sh
npx wrangler dev
```
