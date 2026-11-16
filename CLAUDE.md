# my-superapp

Personal superapp: a neutral shell that hosts feature modules. The first module is `phantom-ledger` (provisional name): collecting money friends owe and sending badminton invites.

## Layout

Only `packages/p5r-ds/` exists today. The rest is planned.

- `apps/web` (planned): Vite + React + TS shell, neutral styling
- `modules/phantom-ledger/web` (planned): the module UI
- `packages/p5r-ds`: Persona 5 Royal design system
- `backend/` (planned): Spring Boot modular monolith, Java 21, Maven, Postgres
- `infra/` (planned): Docker Compose, kustomize for minikube
- `.github/workflows/` (planned): CI

Workspace tooling is pnpm (Phase 2).

## Persona 5 Royal rule

- Only `modules/phantom-ledger` may import `packages/p5r-ds`. The shell and every other module use their own neutral styling and must never get the P5R look.
- Tokens live on `.p5r-scope`, not `:root`. Render the module inside an element with that class (`<div className="p5r-scope">` around the module root). Never move tokens back to `:root`: Vite injects CSS globally and never removes it.
- Read `packages/p5r-ds/SKILL.md` before building or changing that module's UI.
- Game assets (`packages/p5r-ds/assets/`) and `packages/p5r-ds/reference/` are gitignored. Never commit, publish or deploy them. The module UI needs fallbacks for when `TarotCard`, `CallingCard` or logo images are missing.

## Design system commands

Run from `packages/p5r-ds/`:

- `node build.mjs` regenerates `_ds_bundle.jsx` and `_ds_manifest.json` (never hand-edit them). Last known output: `bundle: 15 components; manifest: 9 cards, 124 tokens`.
- `python -m http.server 8000`, then `node scripts/check-page.mjs http://localhost:8000/<page>` checks a page at 1280, 375 and 320px. Needs Node 22+ and Chrome or Edge. Three errors and two warnings already exist in the demo pages (320px sideways scroll on `guidelines/colors-roles.html`, `guidelines/motion.html`, the surfaces card; raw `#000` on `tokens-preview.html` and `colors-roles.html`).
