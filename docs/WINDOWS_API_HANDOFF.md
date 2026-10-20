# Shared Windows API UI handoff — October 20, 2026

The Windows app in the sibling desktop repository now consumes the standalone schedule API and the public BYE review read API. This repository continues to own the shared React UI, domain types and helpers. Browser `/app/` schedule integration and source activation are separate work; no live/demo flag or browser transport changed.

Shared changes: read-only `ByeReviewPanel`, independent optional BYE review state, BYE feedback before RMP scores/reviews, distinct RMP row labels and BYE counts, explicit source expiry, deduplicated seat totals, unknown delivery metadata, multi-letter course suffixes, and safe text rendering. The web keeps its existing five-minute freshness policy and fictional sample labels. Windows supplies the API's fifteen-minute deadline. The new read-only panel uses host callbacks and makes no network requests.

Verified: typecheck, 87 unit tests, build/static checks, six browser scenarios (Chromium/WebKit at 375, 390 and 1280px), four combined app scenarios (390 and 1280px), and local worker-runtime acceptance. Physical Safari gestures and a new hosted rollout were not performed. Existing build chunk/font warnings remain informational; static source/key and release-path checks pass.

During implementation this checkout advanced externally to `20519cc`, which includes the shared source changes alongside landing changes. Codex did not create that commit or revert its contents. Remaining documentation/tests/build output are local; inspect GitHub Desktop before committing. The desktop vendoring metadata points to that source commit.

## GitHub Desktop

**Summary:** Document and verify BYE-first shared review support

**Description:**
Document shared BYE-first review presentation and separate web/Windows freshness policies. Add source-deadline and deduplicated/unknown seat-total regression tests. Preserve browser transport, sample disclosures, noindex and release gates. Typecheck, 87 tests, build/static, six browser scenarios, four combined app scenarios and local runtime acceptance pass. Shared source is already present in externally created commit 20519cc; review only remaining local changes. No commit, push, deployment or release by Codex.

Full Windows behavior, configuration, limitations and desktop commit text are in the sibling repository's `docs/WINDOWS_API_INTEGRATION.md`.
