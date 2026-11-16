# my-superapp

Personal superapp: a neutral shell that hosts feature modules. The first module is `phantom-ledger` (provisional name): collecting money friends owe and sending badminton invites.

## Layout

- `apps/web` (`@superapp/web`): Vite + React + TS shell, neutral styling. Routes: `/` lists modules, `/ledger/*` lazy-loads `@superapp/phantom-ledger-web`
- `modules/phantom-ledger/web` (`@superapp/phantom-ledger-web`): the module UI, the only consumer of the design system. Exports its source (`src/index.tsx`); the shell bundles it
- `packages/p5r-ds` (`@superapp/p5r-ds`): Persona 5 Royal design system
- `backend/`: Spring Boot modular monolith, Java 21, Maven, Spring Modulith, Flyway, Postgres. Base package `com.superapp`; each module is a subpackage (`ledger`, `shared`) with a `package-info.java`
- `infra/compose.yaml`: local Postgres, read by Spring's docker-compose support. `backend` and `web` services sit behind `--profile full`, so dev only starts Postgres
- `infra/k8s/`: kustomize `base/` plus `overlays/minikube/` (adds Postgres; `secrets.env` is gitignored, copy from `secrets.env.example`)
- `backend/Dockerfile` (context `backend/`) and `apps/web/Dockerfile` (context repo root, nginx template in `apps/web/nginx/`)
- `.github/workflows/ci.yml`: CI (see CI section); `scripts/ci/`: scripts the workflow calls and you can run locally

Workspace tooling is pnpm; shared dev tooling (TypeScript, ESLint, Vitest) lives in the root `package.json`.

## Commands

From the repo root:

- `pnpm install`, `pnpm dev` (shell on :5173, `/api` proxied to :8080)
- `pnpm -r lint | typecheck | test | build`
- Backend: `cd backend`, then `./mvnw spring-boot:run` or `./mvnw verify`. Both need Docker. Run `./mvnw clean` after deleting or renaming resources
- Images: `docker build -t superapp-backend:dev backend`, `docker build -f apps/web/Dockerfile -t superapp-web:dev .`. Full stack: `docker compose -f infra/compose.yaml --profile full up --build` (web on :8088). Minikube flow is in README

## CI

One file, `.github/workflows/ci.yml`, with jobs `guard`, `web`, `backend`, `images`; the last three `needs: guard`.

- `guard` runs `bash scripts/ci/check-no-game-assets.sh` (called through `bash`, so the exec bit does not matter). It fails if git tracks anything under `packages/p5r-ds/assets` or `reference`, or any png/jpg/gif/webp under `packages/p5r-ds`. Keep it passing; never weaken it.
- `web` and `images` also fail if `apps/web/dist` or the built web image contain raster images.
- Every action is pinned to a full commit SHA with a `# vX.Y.Z` comment. When bumping, update the SHA and the comment together, and resolve the SHA from the tag (`/repos/<owner>/<repo>/git/ref/tags/<tag>`; annotated tags need one more dereference to the commit). A tag name alone is never acceptable.
- No image is pushed by design: `images` builds only (`push: false`). Cloudflare Pages and Render build their own from the repo.
- Lint the workflow before committing: `docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:1.7.12 -color` (PowerShell).

## Persona 5 Royal rule

- Only `modules/phantom-ledger` may import `packages/p5r-ds`. The shell and every other module use their own neutral styling and must never get the P5R look.
- Tokens live on `.p5r-scope`, not `:root`. Render the module inside an element with that class (`<div className="p5r-scope">` around the module root). Never move tokens back to `:root`: Vite injects CSS globally and never removes it.
- Read `packages/p5r-ds/SKILL.md` before building or changing that module's UI.
- ESLint (`eslint.config.js`) bans `@superapp/p5r-ds` imports everywhere except `modules/phantom-ledger/**`. Do not loosen it.
- Game assets (`packages/p5r-ds/assets/`) and `packages/p5r-ds/reference/` are gitignored. Never commit, publish or deploy them. In dev, `apps/web/vite.config.ts` serves them at `/p5r-assets/*` (`apply: 'serve'` plugin); never copy them into a `public/` folder, or production builds would ship them. The module UI needs fallbacks for when `TarotCard`, `CallingCard` or logo images are missing.

## Design system commands

Run from `packages/p5r-ds/`:

- `node build.mjs` regenerates `_ds_bundle.jsx` and `_ds_manifest.json` (never hand-edit them). Last known output: `bundle: 15 components; manifest: 9 cards, 124 tokens`.
- `python -m http.server 8000`, then `node scripts/check-page.mjs http://localhost:8000/<page>` checks a page at 1280, 375 and 320px. Needs Node 22+ and Chrome or Edge. Three errors and two warnings already exist in the demo pages (320px sideways scroll on `guidelines/colors-roles.html`, `guidelines/motion.html`, the surfaces card; raw `#000` on `tokens-preview.html` and `colors-roles.html`).
