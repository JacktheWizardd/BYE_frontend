# Web app and design

## What we built and why

The website repository owns the React landing page, browser app, Pages API and source Worker. Fictional `/demo/` and gated `/app/` share UI while keeping sample data separate from real evidence. A separate `/reviews/` flow lets students write reviews without enabling live schedule browsing.

## How it works

- [Web beta setup, interfaces and checks](WEB_BETA.md)
- [App redesign plan and decisions](APP_REDESIGN_PLAN.md)
- [Owner-preview history](LIVE_APP_PREVIEW.md)
- [Browser application README](../../apps/web/README.md)
- [Shared UI ownership](../shared-ui/README.md)

Edit source under `apps/landing/` and `apps/web/`; generated `public/` output is not a documentation or UI source. Demo browsing must make no API requests and must retain sample labels.

## What remains

Live schedule/RMP rollout is independent of the review form and requires current access and staging evidence. Dated preview results do not establish today's production state. Native Mac redesign and the BYE/RMP review toggle remain separate tasks.

[All documents](../README.md)
