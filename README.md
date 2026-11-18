# my-superapp

[![CI](https://github.com/GitGud031005/my-superapp/actions/workflows/ci.yml/badge.svg)](https://github.com/GitGud031005/my-superapp/actions/workflows/ci.yml)

A personal superapp: a neutral shell that hosts several feature modules. Each module owns its own UI and its own slice of the backend.

The first module, `phantom-ledger` (working name, not final), is a general debt ledger: friends owe the admin money for group expenses (badminton is just one kind) and for personal charges. It is the only part of the app that uses the Persona 5 Royal design system.

## Layout

```
my-superapp/
├── apps/
│   └── web/                  Vite + React + TS shell (neutral styling)
├── modules/
│   └── phantom-ledger/
│       └── web/              the module's UI, wrapped in .p5r-scope
├── packages/
│   └── p5r-ds/               Persona 5 Royal design system (tokens, React components, demos)
├── backend/                  Spring Boot modular monolith (Java 21, Maven, Spring Modulith)
├── infra/                    Docker Compose (Postgres, optional full stack) and kustomize for minikube
├── scripts/ci/               scripts that CI also runs locally
└── .github/workflows/        CI
```

## Getting started

Needs Node 22+, pnpm 10, Java 21 and Docker.

```powershell
pnpm install
pnpm dev                       # shell at http://localhost:5173, /api proxied to :8080
pnpm -r lint
pnpm -r typecheck
pnpm -r test
pnpm -r build

cd backend
./mvnw spring-boot:run         # starts Postgres from infra/compose.yaml, then the API on :8080
./mvnw verify                  # modularity check and context load against a Testcontainers Postgres
```

Sign-in needs Google credentials, see [Google login](#google-login). Without them the app still starts and everything except signing in works.

Check the API with `curl localhost:8080/actuator/health`. Stop the local database with `docker compose -f infra/compose.yaml down`; the data volume is kept.

After deleting or renaming anything in `backend/src/main/resources`, run `./mvnw clean`; stale copies stay in `target/classes` and can break Flyway.

## Google login

The `identity` backend module signs users in with Google (OpenID Connect, scopes `openid profile email`). Every OAuth endpoint lives under `/api`, because the Worker only proxies `/api/*`:

| What | URL |
| --- | --- |
| Start sign-in (the UI navigates here) | `/api/oauth2/authorization/google` |
| Google redirects back to | `/api/login/oauth2/code/google`, then Spring redirects to `/ledger` |
| Current user | `GET /api/me`: `{id, email, name, pictureUrl}`, or 401 JSON when signed out |
| Sign out | `POST /api/logout` with the `X-XSRF-TOKEN` header, answers 204 |

Everything else under `/api/**` requires a session; `/actuator/health/**` is public. The session lives in Postgres (`identity.spring_session`, created by Flyway) and the cookie is `HttpOnly`, `SameSite=Lax` and, in `prod`, `Secure`. Sessions last 14 days of inactivity. CSRF uses Spring Security's SPA mode: the `XSRF-TOKEN` cookie is readable by the page, and every unsafe request must echo it in `X-XSRF-TOKEN`.

The redirect URI is built from the forwarded host (`server.forward-headers-strategy: framework`): the Worker sets `X-Forwarded-Host` and `X-Forwarded-Proto`, nginx does the same in the full compose stack, and Vite's dev proxy (`apps/web/vite.config.ts`) sets them too, because on its own it rewrites `Host` to the backend's, so locally Spring builds `http://localhost:5173/api/login/oauth2/code/google`.

**Expired sessions are never cleaned up.** Spring Session JDBC normally runs a cleanup job every minute, which would hit Postgres forever and keep Neon awake, so `spring.session.jdbc.cleanup-cron` is `"-"` (disabled). Expired rows pile up in `identity.spring_session` but are ignored on read, so correctness is unaffected; at a handful of users the table stays tiny. If it ever matters, delete by hand: `DELETE FROM identity.spring_session WHERE expiry_time < (extract(epoch FROM now()) * 1000)::bigint;`. Never turn the cron back on and never add another timer that touches the database.

### Create the Google OAuth client

1. [Google Cloud Console](https://console.cloud.google.com/) → pick or create a project → APIs & Services → OAuth consent screen (Google Auth Platform) → fill in the app name and your email.
2. Credentials → Create credentials → OAuth client ID → type **Web application**. Add both authorized redirect URIs:
   - `https://my-superapp-web.nguyenphuc102005.workers.dev/api/login/oauth2/code/google`
   - `http://localhost:5173/api/login/oauth2/code/google`
3. Copy the client ID and secret. Keep the secret out of git and chat.
4. While the consent screen is in **Testing**, only the test users you list can sign in. Publish it (In production) for anyone else; the scopes used here are the basic ones, but check Google's own pages for whether your project needs verification.

### Local setup

```powershell
Copy-Item .env.example .env      # then put the real values in .env (gitignored)
```

`./mvnw spring-boot:run` reads `../.env` through `spring.config.import`; environment variables with the same names win. Open the app at `http://localhost:5173` (the Vite proxy), not `:8080`, so the redirect URI matches the one registered with Google. If something else holds port 8080, start the backend with `$env:PORT = "8081"` and the shell with `$env:API_PROXY_TARGET = "http://localhost:8081"`. In the full compose stack the backend loads `.env` through `env_file`; the web container is on `http://localhost:8088`, so register `http://localhost:8088/api/login/oauth2/code/google` too if you want to sign in there. For minikube, fill `google-client-id` and `google-client-secret` in `secrets.env`. Put your own Google email in `LEDGER_ADMIN_EMAILS` in `.env` too; without it nobody can open the admin tabs (see [Debt ledger](#debt-ledger)).

Tests and CI need no credentials: without `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` the registration uses the placeholder `not-configured`. The `prod` profile has no default and fails at startup if either is missing.

## Debt ledger

One creditor, the **admin**; everyone else is a **member** (a name plus an optional email). Balances are never stored: they are always computed from expenses and payments, in whole đồng.

| Who | What they get |
| --- | --- |
| Admin | One screen: totals, a debt table (highest first) and buttons for group debt, personal debt, add member and all expenses, plus history and payments per row; the API under `/api/ledger/admin/**` |
| Member whose Google email matches | `My ledger`: their balance and their own lines only. They never see other members, only the total share count of a group expense |
| Any other signed-in user | "No ledger is linked to this account" |

Admins are the Google emails in `LEDGER_ADMIN_EMAILS` (comma-separated, case-insensitive). A member is linked to a signed-in user when their `email` equals the Google email and Google reports it as verified. Both checks happen on the server.

```powershell
# .env (gitignored): your own address, never committed
LEDGER_ADMIN_EMAILS=you@example.com
```

Where the variable lives: `.env` locally (the backend and the compose `backend` service both read it), the Render dashboard (`render.yaml` declares it with `sync: false`) and `ledger-admin-emails` in the minikube `secrets.env`. Empty means nobody is admin.

**Expenses.** A *personal* expense is one member times one share. A *group* expense has a price per share and participants with their shares (a person can take more than one share); the admin's own shares split the cost but create no debt. Entering a total instead gives `share = ceil(total / all shares)` rounded up to the next 1,000đ, and the form shows the difference before saving. Editing an expense changes every participant's line at once. Amount fields take `56k`, `56000` or `56.000`.

**API** (all authenticated, CSRF as for the rest of `/api`):

| Method and path | Purpose |
| --- | --- |
| `GET /api/ledger/me` | `{admin, member: {name, balance, history[]} or null}`, newest line first, each with its running balance |
| `GET/POST /api/ledger/admin/members`, `PUT/DELETE .../members/{id}`, `GET .../members/{id}/history` | members with balances (delete only when they have no entries) |
| `GET/POST /api/ledger/admin/expenses`, `PUT/DELETE .../expenses/{id}` | expenses, newest first (`limit`, `offset`) |
| `POST /api/ledger/admin/payments`, `PUT/DELETE .../payments/{id}` | payments |

## Containers

Both images are built from the repo: `backend/Dockerfile` (JDK build stage, layered JRE runtime, runs as uid 10001) and `apps/web/Dockerfile` (pnpm build, then `nginx-unprivileged` serving `dist/` and proxying `/api/` to `BACKEND_URL`).

The backend build context is `backend/` (own `backend/.dockerignore`), so nothing outside that folder can reach the image. The web build needs the pnpm workspace, so its context is the repo root and the root `.dockerignore` applies. That file excludes `packages/p5r-ds/assets` and `packages/p5r-ds/reference`: the game images must never enter a build context, an image layer or a deployment. Keep those two lines.

```powershell
docker build -t superapp-backend:dev backend
docker build -f apps/web/Dockerfile -t superapp-web:dev .

docker compose -f infra/compose.yaml --profile full up --build   # web on http://localhost:8088
docker compose -f infra/compose.yaml --profile full down         # keeps the data volume
```

Without `--profile full`, compose starts only Postgres, which is what Spring's docker-compose support relies on in dev. The backend is not published to the host in the full profile; reach it through `http://localhost:8088/api/`.

The backend reads `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`. `spring-boot-docker-compose` is not packaged into the jar, so the container never tries to start compose.

### minikube

Manifests are kustomize: `infra/k8s/base` (namespace, backend, web) and `infra/k8s/overlays/minikube` (adds a Postgres StatefulSet with a 1Gi volume, local image tags, a NodePort for web). The overlay's `secrets.env` is gitignored; copy the example, whose values are for local use only.

```powershell
minikube start --driver=docker --cpus=2 --memory=4096
docker build -t superapp-backend:dev backend
docker build -f apps/web/Dockerfile -t superapp-web:dev .
minikube image load superapp-backend:dev
minikube image load superapp-web:dev
Copy-Item infra/k8s/overlays/minikube/secrets.env.example infra/k8s/overlays/minikube/secrets.env
kubectl apply -k infra/k8s/overlays/minikube
kubectl -n superapp rollout status deployment/backend
minikube service web -n superapp --url                           # keep this terminal open on Windows
```

Tear down with `kubectl delete -k infra/k8s/overlays/minikube` (removes the namespace and the Postgres volume), then `minikube stop`.

The backend takes about 20 s to start on an idle machine and several times that on a busy cluster; its startup probe allows five minutes.

Phase 5 deploy note: Render builds the backend from this Dockerfile with Root Directory `backend` and Dockerfile path `./Dockerfile`.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request. A new push to the same ref cancels the run in progress.

| Job | What it checks |
| --- | --- |
| `guard` | `scripts/ci/check-no-game-assets.sh`: nothing is tracked under `packages/p5r-ds/assets` or `packages/p5r-ds/reference`, and no png/jpg/gif/webp is tracked under `packages/p5r-ds`. The other three jobs wait for it |
| `web` | `pnpm install --frozen-lockfile`, then `pnpm -r lint`, `typecheck`, `test`, `build`, then fails if `apps/web/dist` holds any image |
| `backend` | `./mvnw -B verify` in `backend/` (Testcontainers uses the runner's Docker) |
| `images` | builds both Docker images without pushing them, then fails if the web image holds any png/jpg/gif/webp |

CI never pushes an image. Render builds the backend image itself and Cloudflare Workers Builds builds the web app (see Deploy).

Run the checks locally from the repo root:

```powershell
bash scripts/ci/check-no-game-assets.sh          # Git Bash or WSL on PATH
docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:1.7.12 -color
```

actionlint also runs shellcheck over the `run:` blocks. No output means no findings.

## Deploy

All three pieces run on free tiers. Nothing is deployed from CI; each service builds from this repo.

```
browser ──> Cloudflare Worker "my-superapp-web" ──/api/*──> Render web service (Docker, Singapore) ──JDBC──> Neon Postgres 17 (ap-southeast-1)
              serves apps/web/dist (static assets)            my-superapp-backend, spins down after 15 min idle
              cron every 10 min ──> GET /actuator/health/liveness
```

The browser only ever talks to the Worker, so `/api` is same-origin and the backend needs no CORS. Static asset requests are free and unlimited; the Worker only runs for `/api/*` and for the cron.

### Order of setup

1. **Neon** (database). Create a project, Postgres 17, region `aws-ap-southeast-1`. Copy the **direct** connection host (the one without `-pooler`): Flyway takes session-level locks, which the pooler does not support. Build the JDBC URL as
   `jdbc:postgresql://<host>/<database>?sslmode=require&channelBinding=require`
   and keep the user and password separate (Neon's connection string is `postgresql://user:password@host/db`; do not paste that form into Spring). Compute suspends after 5 minutes idle and wakes on the next connection.
2. **Render** (backend). New → Blueprint → pick this repo; it reads `render.yaml`. Render asks for the three `sync: false` variables:
   - `SPRING_DATASOURCE_URL`: the JDBC URL from step 1
   - `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`: from Neon
   - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: from the OAuth client in [Google login](#google-login)
   - `LEDGER_ADMIN_EMAILS`: your own Google email, see [Debt ledger](#debt-ledger)

   The first start runs Flyway against Neon. The service is `my-superapp-backend`; note its URL (`https://<name>.onrender.com`; Render appends a suffix if the name is taken).
3. **Cloudflare Workers Builds** (web). Workers & Pages → Create → Import a repository → this repo, then:
   - Project/Worker name: `my-superapp-web` (must equal `name` in `apps/web/wrangler.jsonc`)
   - Production branch: `main`
   - Root directory: `/`
   - Build command: `pnpm install --frozen-lockfile && pnpm --filter @superapp/web build`
   - Deploy command: `pnpm --filter @superapp/web exec wrangler deploy`
   Workers Builds defaults to Node 24 and reads `packageManager` for pnpm, so no `.node-version` file is needed.
4. **Point the Worker at the real backend.** `apps/web/wrangler.jsonc` ships with the placeholder `API_ORIGIN` `https://my-superapp-backend.onrender.com`. If the Render URL differs, change `vars.API_ORIGIN` there, commit, and let Workers Builds redeploy.
5. Open the `*.workers.dev` URL: `/` is the neutral shell, `/ledger` the module, `/api/...` reaches Spring.

### Environment

| Where | Variable | Value |
| --- | --- | --- |
| Render | `SPRING_PROFILES_ACTIVE` | `prod` (set by the Blueprint) |
| Render | `SPRING_DATASOURCE_URL` / `_USERNAME` / `_PASSWORD` | Neon direct host, see above |
| Render | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth client; `prod` refuses to start without them |
| Render | `LEDGER_ADMIN_EMAILS` | comma-separated admin emails; optional, empty means nobody is admin |
| Render | `PORT` | set by Render (10000); `server.port` reads it |
| Worker | `API_ORIGIN` | plain var in `wrangler.jsonc`, not a secret |

The `prod` profile (`application-prod.yaml`) caps Hikari at 5 connections with `minimum-idle: 0`, a 60 s idle timeout and a 240 s max lifetime, so idle connections do not keep Neon awake or break across its suspend. The profile also sets `spring.main.lazy-initialization`, which cut startup in a 512 MB / 0.1 CPU container from about 185 s to about 155 s; the image's JVM flags (`MaxRAMPercentage=60`, SerialGC, `TieredStopAtLevel=1`, `-Xss512k`) keep it near 215 MiB. Expect a cold start of roughly 2.5 minutes on Render's free CPU, and the first request after it is fast. Render checks `/actuator/health/readiness`, which does not include the database. The session cookie is `Secure` in `prod`, and the backend sees the public host through the Worker's `X-Forwarded-*` headers.

### Keep-warm cron

Render's free service sleeps after 15 minutes without traffic and then takes minutes to boot on 0.1 CPU. The Worker's cron trigger (`*/10 * * * *`) requests `/actuator/health/liveness` on the backend. That endpoint never touches the database, so Neon still suspends when nobody uses the app. Keeping one instance up around the clock is about 744 h a month against Render's 750 free hours. Never point the cron at an endpoint that queries the database.

Render's free tier caps outbound bandwidth at 5 GB a month. Static files come from Cloudflare, so only `/api` responses count against it.

### Rollback

- Render: service → Events/Deploys → pick the previous deploy → Rollback.
- Cloudflare: Worker → Deployments → pick the previous version → Rollback.
- Database migrations are not rolled back automatically; Flyway only moves forward.

### Local checks

```powershell
pnpm --filter @superapp/web build
pnpm --filter @superapp/web exec wrangler dev --var API_ORIGIN:http://localhost:8081 --test-scheduled   # needs the backend on :8081
curl "http://localhost:8787/cdn-cgi/local/scheduled?cron=*/10+*+*+*+*"                                   # runs the keep-warm handler
```

`pnpm --filter @superapp/web worker:dev` runs plain `wrangler dev` against the placeholder origin. `dist/` must exist first.

The Persona 5 Royal game images never reach any of these: they are gitignored, excluded from every build context, never copied into `dist/`, and CI fails if `dist/` or the web image holds a raster image. Render only receives `backend/`.

## Persona 5 Royal design system

`packages/p5r-ds/` is fan-made. Its tokens are scoped to the `.p5r-scope` class so they never leak into the shell or other modules. See [packages/p5r-ds/readme.md](packages/p5r-ds/readme.md) to preview it and [packages/p5r-ds/SKILL.md](packages/p5r-ds/SKILL.md) for the rules.

The logo and tarot images in `packages/p5r-ds/assets/` come from the game (Atlus and Sega). They are local only: gitignored, and never committed, published or deployed. The same goes for `packages/p5r-ds/reference/`. A fresh clone has neither folder, so the design system's demo pages show missing images until you copy the assets in by hand.

In dev, the shell serves those images at `/p5r-assets/*` through a small Vite plugin (`apps/web/vite.config.ts`, `apply: 'serve'`). They are deliberately not in `public/`, so `pnpm build` never copies them into `dist/`.

ESLint blocks every import of `@superapp/p5r-ds` outside `modules/phantom-ledger`, so the P5R look cannot reach the shell by accident.
