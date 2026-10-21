
# BYE — Website

**The public website and browser experience for Before You Enroll.**

[Visit BYE](https://bye-before-you-enroll.pages.dev)

BYE is an independent student-built project intended to help Pasadena City College students make more informed decisions when selecting classes and professors.

This repository contains the public-facing website, browser application source, shared React components, and student review web experience.

The native macOS application, Windows application, and standalone PCC schedule API are maintained in the separate `BYE_Before_You_Enroll` repository.

## Agreed shared application architecture

React + TypeScript is the shared frontend; Tauri 2 is the desktop candidate and Capacitor follows desktop validation. Electron is legacy only, with no role or fallback in the target architecture.

BYE_website owns the shared frontend workspace and wrappers. BYE_Before_You_Enroll owns backend contracts and ultimately services. Repository names stay unchanged. Existing apps, server deployments and release tooling remain available through validation.

See the [migration sequence and acceptance gates](docs/shared-ui/CROSS_PLATFORM_MIGRATION.md). Backend relocation follows actual Windows and Mac preview acceptance. No merge, production deployment, release or legacy removal is authorized.

## Current status

*Updated October 20, 2026.*

| Component | Status |
|---|---|
| Landing page | Deployed |
| Interactive product showcase | Available |
| Browser demo | Available with fictional sample data |
| Student review form | Live with PCC email verification |
| Real-data browser application | Production access disabled |
| macOS download | Temporarily paused |
| Windows download | Not publicly released |
| Shared design system | In active development |

The website is both a place to introduce BYE and an environment for testing browser-based experiences.

## Website features

### Landing page

The landing page introduces BYE, explains its functionality, and provides ways for students to explore the project.

It uses a mobile-first React interface with reusable design tokens, interactive product demonstrations, and motion designed around accessibility preferences.

### Browser demo

The `/demo/` route lets visitors explore the interface without installing an application.

**The demo uses fictional professor and review data.** It is intended to demonstrate how BYE works, not to provide official course or professor recommendations.

The real-data browser application is maintained separately behind rollout controls and is not currently a public production feature.

### Student reviews

The `/reviews/` route allows PCC students to submit original professor reviews.

Students verify their school email through a one-time code before submitting feedback.

Review submission uses the BYE Supabase backend. Student identity handling and privileged database operations are separated from browser presentation code.

The review experience is independent of the fictional demo and the centralized class-schedule API.

## Technology

| Area | Technology |
|---|---|
| Landing page | React, TypeScript, Tailwind CSS |
| Motion | GSAP, Lenis, Three.js |
| Browser application | React and shared BYE UI packages |
| Hosting | Cloudflare Pages |
| Review backend | Supabase and Pages server routes |
| Shared design | Tokens, React components, and domain helpers |
| Testing | TypeScript tests and Playwright |

## Repository structure

| Path | Responsibility |
|---|---|
| `apps/landing/` | Landing page source |
| `apps/web/` | Browser application and review experience |
| `packages/core/` | Shared domain helpers |
| `packages/ui/` | Shared React screens and components |
| `packages/tokens/` | Shared design tokens |
| `server/` | Server-side application logic |
| `functions/` | Cloudflare Pages routes |
| `workers/` | Supporting Worker services |
| `docs/` | Development guides and project records |
| `tests/` | Automated tests |
| `public/` | Generated site output and release assets |

The Windows application vendors an approved snapshot of shared React code. The native Mac application remains SwiftUI-based.

## Local development

Requires Node.js 24 and pnpm 11.25.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Run the project checks:

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm test:browser
```

Additional runtime and integration checks are documented in the [web beta guide](docs/web-app/WEB_BETA.md).

Edit application source rather than generated files under `public/`.

## Deployment

The website is hosted on Cloudflare Pages.

The documented production configuration uses:

- Branch: `main`
- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Output directory: `public`

Actual Cloudflare project settings must be verified before changing deployment configuration.

**Important:** The existing `/updates/appcast.xml` URL is used by installed Mac applications. Do not rename, restrict, or remove this endpoint or its release files.

Publishing desktop applications and modifying the website are separate workflows.

## Data and security

BYE's student review system uses Supabase. The website does not require the public demo to access live PCC or RMP data.

Follow these principles:

- Keep secret credentials and privileged keys out of browser bundles.
- Never commit student email addresses, review identities, or authentication codes.
- Preserve server-side authorization for review operations.
- Keep fictional demonstration data clearly labeled.
- Do not enable live PCC or RMP integrations without completing the appropriate access and release checks.
- Preserve existing update and download infrastructure.
- Verify behavior across desktop and mobile browsers.

Security test results should be interpreted within their recorded scope. They do not establish a guarantee of production security.

## Documentation

The [documentation home](docs/README.md) organizes the website's development records.

- [Web application and design](docs/web-app/README.md)
- [Student reviews](docs/reviews/README.md)
- [Shared UI components](docs/shared-ui/README.md)
- [Cross-platform frontend proposal](docs/shared-ui/CROSS_PLATFORM_MIGRATION.md)
- [Operations and security](docs/operations/README.md)
- [Web beta and release requirements](docs/web-app/WEB_BETA.md)
- [Contributor and AI-agent instructions](AGENTS.md)

## About the project

BYE is a student project exploring how software can make academic planning more accessible.

Development includes experimentation with interface design, cross-platform architecture, databases, APIs, performance, and AI-assisted programming.

The project remains under active development. Its current features and future goals should not be confused.

## Disclaimer

BYE is independent and is not affiliated with or endorsed by Pasadena City College or Rate My Professors.

The demo contains sample data. For official class availability and registration information, use PCC's own systems.

---

**BYE — Before You Enroll**

Built by a student, for students.
