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
├── infra/                    Docker Compose for local Postgres; kustomize for minikube is planned
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

## Persona 5 Royal design system

`packages/p5r-ds/` is fan-made. Its tokens are scoped to the `.p5r-scope` class so they never leak into the shell or other modules. See [packages/p5r-ds/readme.md](packages/p5r-ds/readme.md) to preview it and [packages/p5r-ds/SKILL.md](packages/p5r-ds/SKILL.md) for the rules.

The logo and tarot images in `packages/p5r-ds/assets/` come from the game (Atlus and Sega). They are local only: gitignored, and never committed, published or deployed. The same goes for `packages/p5r-ds/reference/`. A fresh clone has neither folder, so the design system's demo pages show missing images until you copy the assets in by hand.

In dev, the shell serves those images at `/p5r-assets/*` through a small Vite plugin (`apps/web/vite.config.ts`, `apply: 'serve'`). They are deliberately not in `public/`, so `pnpm build` never copies them into `dist/`.

ESLint blocks every import of `@superapp/p5r-ds` outside `modules/phantom-ledger`, so the P5R look cannot reach the shell by accident.
