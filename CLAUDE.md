# my-superapp

Personal superapp: a neutral shell that hosts feature modules. The first module is `phantom-ledger` (provisional name): a general debt ledger (one creditor, the admin; friends owe money for group expenses such as badminton and for personal charges). Badminton invites are not built yet.

## Layout

- `apps/web` (`@superapp/web`): Vite + React + TS shell, neutral styling. Routes: `/` lists modules, `/ledger/*` lazy-loads `@superapp/phantom-ledger-web`
- `modules/phantom-ledger/web` (`@superapp/phantom-ledger-web`): the module UI, the only consumer of the design system. Exports its source (`src/index.tsx`); the shell bundles it
- `packages/p5r-ds` (`@superapp/p5r-ds`): Persona 5 Royal design system
- `backend/`: Spring Boot modular monolith, Java 21, Maven, Spring Modulith, Flyway, Postgres. Base package `com.superapp`; each module is a subpackage (`ledger`, `identity`, `shared`) with a `package-info.java`
- `infra/compose.yaml`: local Postgres, read by Spring's docker-compose support. `backend` and `web` services sit behind `--profile full`, so dev only starts Postgres
- `infra/k8s/`: kustomize `base/` plus `overlays/minikube/` (adds Postgres; `secrets.env` is gitignored, copy from `secrets.env.example`)
- `backend/Dockerfile` (context `backend/`) and `apps/web/Dockerfile` (context repo root, nginx template in `apps/web/nginx/`)
- `render.yaml`: Render Blueprint for the backend; `apps/web/wrangler.jsonc` + `apps/web/worker/`: Cloudflare Worker (see Deploy section)
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

## Deploy

Worker (Cloudflare Workers static assets, `apps/web`) serves `dist/` and proxies `/api/*` to the Render backend (Docker, free, `prod` profile), which uses Neon Postgres. Setup order, values and rollback are in README "Deploy". Nothing deploys from CI.

- The Worker's `scheduled` cron (every 10 min) keeps Render awake by calling `/actuator/health/liveness`. Never point it at an endpoint that touches the database, or Neon can no longer suspend.
- Readiness (`/actuator/health/readiness`, Render's health check) must not include `db`. Probes are enabled explicitly in `application.yaml` because Spring only auto-enables them on Kubernetes.
- Flyway runs on the Neon **direct** host, never `-pooler` (session locks). JDBC URL: `jdbc:postgresql://<host>/<db>?sslmode=require&channelBinding=require`.
- `vars.API_ORIGIN` in `wrangler.jsonc` must be the real Render URL. Static assets are served without running the Worker, so headers for them come from `apps/web/public/_headers`; responses the Worker builds get none.
- `apps/web/worker` has its own tsconfig (`tsconfig.worker.json`, Workers types, no DOM). The `typecheck` script runs both.
- Local Worker: `pnpm --filter @superapp/web exec wrangler dev` after a build. Never run `wrangler login` or `wrangler deploy` locally; Workers Builds deploys.

## Identity (Google login)

Backend module `com.superapp.identity` owns sign-in: `app_user`, the Spring Session JDBC tables (`identity.spring_session`, created by `V2__create_identity.sql`, never `initialize-schema`) and the security filter chain. Boot 4 needs `spring-boot-starter-session-jdbc`, not bare `spring-session-jdbc`.

- Every OAuth endpoint lives under `/api` (`/api/oauth2/authorization/google`, `/api/login/oauth2/code/*`), because the Worker proxies only `/api/*`. The post-login target is `/ledger`. Do not move them.
- `spring.session.jdbc.cleanup-cron` is `"-"`. The default every-minute cleanup would keep Neon awake forever. Never re-enable it, and never add a timer that touches the database. `IdentityApiTests` fails if any scheduled task appears.
- Anonymous requests must not create sessions or touch the DB: the request cache is disabled and `/api/me` answers 401 JSON, never a redirect. Keep it that way for any new endpoint.
- CSRF is `csrf.spa()`: cookie `XSRF-TOKEN`, header `X-XSRF-TOKEN`. New unsafe endpoints need no extra work; the UI helper is `modules/phantom-ledger/web/src/auth.ts`.
- Credentials are `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: gitignored `.env` locally (`.env.example` is committed), Render dashboard in prod (`render.yaml`, `sync: false`), `secrets.env` on minikube. Tests and CI use the `not-configured` placeholder; `prod` has no default. Never commit real values.
- Other modules that need the current user must go through an API exposed from `identity`, not its tables.

## Ledger (debts)

Backend module `com.superapp.ledger` (Flyway `V3__create_ledger.sql`, schema `ledger`): `member` (one `name`, unique ignoring case after NFC normalisation, plus an optional unique `email`), `expense`, `expense_share`, `payment`. There is no nickname column. UI in `modules/phantom-ledger/web/src` (no router).

- **One admin screen.** `Ledger.tsx` picks the view: admin gets `AdminLedger.tsx` (stats header, action bar, `DebtTable`), a friend gets `MyLedger`. There are no tabs. Everything else is a `Dialog` hosted by `AdminLedger` (one `Modal` union, `returnTo` goes back to the previous dialog): group debt (`GroupDebtForm`), personal debt (`PersonalDebtForm`), payment, member add/edit/delete, member history, all expenses. Exactly one `primary` button (Group debt). Per-row actions come from `renderActions` in `DebtTable`; add new ones there.
- **Table.** Real `<table>` with explicit ARIA roles, so it keeps its semantics when CSS turns it into stacked cards below 640px (`data-label` feeds the card labels). Sorted by `sortByDebt` (balance desc, ties by name); settled (0) and ahead (<0) rows sit at the bottom. "Hide settled" hides only balance 0. `StatBar` is decorative (`aria-hidden`; its label and numbers are hidden by CSS) because the balance column already says the amount. The backdrop is CSS only: `--halftone`, a `--clip-banner` band behind the title, a `--bullseye` corner. No images.
- **i18n.** The module is bilingual, default `vi`, choice in `localStorage` (`phantom-ledger.lang`). Every UI string goes through i18n: add the key to `en` in `i18n.ts`, and `vi` is typed `typeof en`, so a missing key fails typecheck. Components use `useT()` (strings) and `useLang()`; `I18nProvider` is the module root and sets `lang`. Money is always `vi-VN` with "đ"; dates follow the language (`formatDate`, `dateParts`). Stored data (names, notes) is never translated. Backend errors show `t.errorWithDetail(server message)`. `TextField` prints a hard-coded English "Error:" prefix (design system limitation).

- **Roles.** One creditor: the admin. Admins are the verified Google emails in `LEDGER_ADMIN_EMAILS` (comma-separated, case-insensitive; `application.yaml` maps it to `ledger.admin-emails`). `LedgerAccess` registers an interceptor that answers 403 on every `/api/ledger/admin/**` path for anyone else, so a new admin endpoint is protected just by living under that prefix. Never commit the real email: `.env`, Render dashboard (`render.yaml`, `sync: false`), `secrets.env` on minikube (`ledger-admin-emails`); compose passes it through `env_file: ../.env`.
- **Linking.** A signed-in user is linked to the member whose `email` equals their Google email, only if Google says `email_verified`. The current user comes from the public `com.superapp.identity.CurrentUser` (built from the OAuth2 principal), never from identity's tables.
- **Friends see only their own data.** `GET /api/ledger/me` takes no id, returns the caller's lines without ids, and for group lines only `shares` and `totalShares` (participants plus the owner's shares). Never add other members' names, ids or amounts to it.
- **Money.** Whole đồng as `bigint`, never floating point. The balance (sum of share_amount x shares minus payments) is always computed, never stored. An expense is stored once with its `expense_share` rows, so editing it changes every participant at once. Group by total: `share_amount = ceil(total / (sum of shares + owner_shares))` rounded up to the next 1,000đ; owner shares only split the total and create no debt. `LedgerService.shareFromTotal` and `money.ts` `shareFromTotal` must stay identical (`ShareFromTotalTests` and `money.test.ts` use the same cases).
- **Data loading.** There is no import feature. The history was loaded once with a throwaway SQL script kept outside the repo. The repo is public: the user's spreadsheet, real names, amounts, emails and bank numbers must never be committed or logged; tests use fake names.
- **Tests.** Ledger integration tests extend `LedgerTestSupport`. MockMvc's `csrf().asHeader()` does not work with `csrf.spa()`; the helper fetches the `XSRF-TOKEN` cookie first and sends it as cookie and header.

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
