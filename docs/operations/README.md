# Operations

## What we built and why

Access gates, security boundaries and dated verification keep live-source rollout separate from prepared code. Release evidence is documented without treating a test result or configuration boolean as deployment authorization.

## How it works

- [Data access and rollout requirements](DATA_ACCESS.md)
- [Security review](SECURITY_REVIEW.md)
- [Browser implementation verification](VERIFICATION.md)
- [Existing contributor/commit handoff](COMMIT_HANDOFF.md)
- [Machine-consumed readiness record](../release-readiness.json)
- [Web beta commands and runtime checks](../web-app/WEB_BETA.md)

Website owns Pages/Worker configuration and runtime checks. Desktop owns release generation; preserve the installed-app update domain and files under `public/updates/` and `public/downloads/`.

## What remains

Verify current access, source health and hosted staging before rollout. No backend operations, deployments or release updates occur during this documentation task. Historical security and verification reports retain their original scope.

[All documents](../README.md)
