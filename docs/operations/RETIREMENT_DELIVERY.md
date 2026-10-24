# Retirement delivery — prepared locally, unpublished

The website remains shut down. No public/backend deployment was performed here.

All Pages requests pass `functions/_middleware.ts`. Public pages, old JavaScript, downloads and API handlers are blocked with uncached 503 responses. The fixed Mac appcast and update ZIP routes remain available. Holding-page assets are allowed explicitly.

`retirement-release.json` prepares Windows 0.5.1. Leave `windowsReady` false until the Windows portable package passes native acceptance and the exact public release artifact exists. When enabled, `/windows/latest.json` supplies 0.5.1 and `/download/windows/retirement` redirects to that exact portable ZIP; ordinary download routes remain closed. The default gate is intentionally closed while packages are unreviewed.

Existing uncommitted holding pages are retained with accurate retirement copy. `pnpm build` and `pnpm verify:static` verify retirement state instead of regenerating active pages. The Worker-only asset fallback is not production Pages middleware; do not deploy it as a substitute.

Before any publication: reconcile these local changes with remote main's earlier shutdown commit, preserve its gate, verify unauthenticated GET/HEAD feed delivery and signed archive integrity, and run native update acceptance. Upload archives and feed atomically using the release script only. A production push/deployment requires a separate explicit request. Keep the source and old release archives intact for recovery; no client-side removal can erase previously saved copies.

Owner revision: no self-deletion or automatic cleanup. Windows delivery is a portable ZIP; remove the old app folder manually before extracting the replacement into a fresh folder. The retired app only shows a notice, version, update check, show-folder and quit controls. Service keys were disabled independently by the owner, not by this implementation.

Verification this session: pnpm typecheck, all 104 tests, pnpm build and pnpm verify:static passed. `node --import tsx scripts/retirement-browser-acceptance.ts` passed Chromium/WebKit at 390 and 1280 pixels with no overflow, no external renderer requests and website API rejection. These are local fixtures, not proof of Cloudflare deployment. The Windows retirement UI now includes Uninstall BYE using its registered interactive uninstaller, with an Installed apps fallback; native Windows evidence is still pending.

## October 23 merge verification

The active pull merge from remote `208c080` was reconciled with local retirement commit `95ac066`. All six conflicts were resolved: keep the retirement gate and holding-page entry points, combine both sets of current-state notes, and retain incoming shared-app source/assets. The imported shutdown regression tests now assert the approved retirement policy, including blocked unreviewed Windows delivery.

Typecheck, all 120 combined tests, the retirement-preserving build/static checks and Chromium/WebKit checks at 390/1280 passed. Existing Mac feed/release files and Windows metadata files remain unchanged. Actual Windows acceptance remains pending; Windows readiness stays false. No push, deployment or application-release publication was performed.

GitHub Desktop Summary:
```text
Merge origin/main while preserving BYE retirement shutdown
```

Description:
```text
Resolve six website merge conflicts by retaining the retirement gate and holding pages, combining current-state documentation and preserving upstream shared-app work. Align the imported shutdown tests and operations notes with the approved retirement behavior. Mac update delivery stays available; Windows retirement delivery stays disabled pending native acceptance.

Verified: typecheck, 120 tests, build/static checks and Chromium/WebKit retirement fixtures at 390/1280. No push, deployment or release publication.
```

## Mac combined retirement and RMP removal — staged locally

The owner selected the combined outcome: remove the RMP implementation and show the retirement notice in one update. Mac 0.5.1/build 11 already implements both. The release script copied its signed update archive, checksum, DMG and prepared appcast into the local website checkout. Existing appcast records remain byte-equivalent; the new item points at the matching signed archive and size. The Mac bundle has no BYEAPI/RMP transport or reader implementation. The application does not self-delete or erase saved files.

This staging is not a commit, push, deployment or release publication. Public copies do not change until the website feed is deployed and an installed Mac accepts/installs the signed update. Offline copies remain unchanged. The DMG remains behind the closed ordinary-download gate. Windows stays unpublished with readiness false; its portable package and native uninstall path still require Windows acceptance.

GitHub Desktop Summary:
```text
Stage Mac 0.5.1 retirement update without RMP integration
```

Description:
```text
Stage the signed Mac 0.5.1/build 11 retirement ZIP, checksums, DMG and matching appcast. The minimal app removes RMP and other service integrations and shows the shutdown notice while retaining the updater. Preserve previous feed records, release files and the website shutdown. Windows retirement delivery remains disabled.

Verified artifact checksums and matching feed version, archive size and signature. Existing Mac update rehearsals covered 0.4.0 and 0.5.0. No custom deletion code, service credential changes or database changes. Public release requires a separate explicit commit/push/deployment decision; native Windows acceptance remains pending.
```

## Owner-authorized publication — October 23

The owner explicitly authorized committing/pushing the staged Mac update and publishing Windows as well. This supersedes the earlier hold on Windows publication; it does not supply native Windows acceptance. `windowsReady` now controls delivery, `windowsPublicationAuthorized` records that decision, and `windowsNativeTested` remains false. Local verification reports are preserved unchanged.

Publish the exact Windows portable ZIP and checksum as GitHub release v0.5.1 before pushing website metadata. Windows is a manual download: extract into a fresh folder and run BYE.exe. This does not replace the old installed application automatically. Remove old BYE using Windows Installed apps if its uninstaller works; the owner's reported existing uninstaller integrity failure remains unresolved. Do not bypass integrity checks. Portable folders can be removed manually after closing BYE. Preserve saved data and unrelated files.

Mac delivery uses the signed 0.5.1/build 11 Sparkle ZIP and matching appcast. Both builds exclude the original RMP/search/account/AI implementation and show a shutdown notice; neither self-deletes. Existing offline installations change only when their user installs the replacement. Previously downloaded installers/backups remain available. Website pages, APIs and ordinary downloads remain closed.

GitHub Desktop Summary:
```text
Publish BYE 0.5.1 Mac and Windows retirement updates
```

Description:
```text
Publish the signed Mac 0.5.1/build 11 update and enable Windows 0.5.1 metadata with the exact hosted portable ZIP. Preserve the shutdown gate and previous Mac feed records. Record explicit owner authorization for Windows publication without claiming native Windows acceptance. No custom deletion code, credential changes or database changes.

Checksums and Windows ZIP integrity passed. Website typecheck, all 121 tests, retirement-preserving build/static checks and Chromium/WebKit fixtures at 390/1280 passed for this release. Earlier real Mac upgrade rehearsals covered 0.4.0 and 0.5.0. Windows native acceptance and the reported existing uninstaller integrity error remain unresolved.
```
