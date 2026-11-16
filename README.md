# my-superapp

A personal superapp: a neutral shell that hosts several feature modules. Each module owns its own UI and its own slice of the backend.

The first module, `phantom-ledger` (working name, not final), collects money friends owe and sends badminton invites. It is the only part of the app that uses the Persona 5 Royal design system.

## Layout

Folders marked *planned* do not exist yet.

```
my-superapp/
├── apps/
│   └── web/                  planned: Vite + React + TS shell (neutral styling)
├── modules/
│   └── phantom-ledger/
│       └── web/              planned: the module's UI, wrapped in .p5r-scope
├── packages/
│   └── p5r-ds/               Persona 5 Royal design system (tokens, React components, demos)
├── backend/                  planned: Spring Boot modular monolith (Java 21, Maven)
├── infra/                    planned: Docker Compose and kustomize for minikube
└── .github/workflows/        planned: CI
```

## Persona 5 Royal design system

`packages/p5r-ds/` is fan-made. Its tokens are scoped to the `.p5r-scope` class so they never leak into the shell or other modules. See [packages/p5r-ds/readme.md](packages/p5r-ds/readme.md) to preview it and [packages/p5r-ds/SKILL.md](packages/p5r-ds/SKILL.md) for the rules.

The logo and tarot images in `packages/p5r-ds/assets/` come from the game (Atlus and Sega). They are local only: gitignored, and never committed, published or deployed. The same goes for `packages/p5r-ds/reference/`. A fresh clone has neither folder, so the design system's demo pages show missing images until you copy the assets in by hand.
