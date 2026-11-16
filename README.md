# my-superapp

A personal superapp: a neutral shell that hosts several feature modules. Each module owns its own UI and its own slice of the backend.

The first module, `phantom-ledger` (working name, not final), collects money friends owe and sends badminton invites. It is the only part of the app that uses the Persona 5 Royal design system.

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
└── .github/workflows/        planned: CI
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

Check the API with `curl localhost:8080/actuator/health`. Stop the local database with `docker compose -f infra/compose.yaml down`; the data volume is kept.

After deleting or renaming anything in `backend/src/main/resources`, run `./mvnw clean`; stale copies stay in `target/classes` and can break Flyway.

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

## Persona 5 Royal design system

`packages/p5r-ds/` is fan-made. Its tokens are scoped to the `.p5r-scope` class so they never leak into the shell or other modules. See [packages/p5r-ds/readme.md](packages/p5r-ds/readme.md) to preview it and [packages/p5r-ds/SKILL.md](packages/p5r-ds/SKILL.md) for the rules.

The logo and tarot images in `packages/p5r-ds/assets/` come from the game (Atlus and Sega). They are local only: gitignored, and never committed, published or deployed. The same goes for `packages/p5r-ds/reference/`. A fresh clone has neither folder, so the design system's demo pages show missing images until you copy the assets in by hand.

In dev, the shell serves those images at `/p5r-assets/*` through a small Vite plugin (`apps/web/vite.config.ts`, `apply: 'serve'`). They are deliberately not in `public/`, so `pnpm build` never copies them into `dist/`.

ESLint blocks every import of `@superapp/p5r-ds` outside `modules/phantom-ledger`, so the P5R look cannot reach the shell by accident.
