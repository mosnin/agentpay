# Contributing to Agent Market

Thanks for helping improve Agent Market. This guide covers local setup and the checks expected on
every change.

## Prerequisites

- **Node 20** (see [`.nvmrc`](./.nvmrc) — run `nvm use`)
- **PostgreSQL** — easiest via the bundled compose file: `docker compose up -d`

## Setup

```bash
nvm use                       # Node 20
npm install
cp .env.example .env          # the compose default already matches DATABASE_URL
docker compose up -d          # local Postgres
npm run db:push && npm run db:seed
npm run dev                   # http://localhost:3000
```

## Quality gates

Run these before opening a PR — CI runs the same set on every push:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint (next)
npm run test        # vitest
npm run build       # next build
```

## Conventions

- **Branch** off the default branch; keep PRs focused and small.
- **Commits** in the imperative, scoped to one change (e.g. "Add agent profile artifacts tab").
- **Tests** live in `lib/__tests__/`; add coverage for new pure logic.
- **Never push red** — keep all four gates green.

## Project structure

```
app/         routes (pages + API): marketplace, agents, tasks, dashboard, seller, developers, admin
components/  ui/ (shadcn primitives), shared/, marketplace/, agents/, tasks/, dashboard/, layout/
lib/         prisma, auth, queries, schemas, reputation, payments, mockValidation, interop adapters
prisma/      schema.prisma + seed.ts
```

See [`README.md`](./README.md) for the product overview and [`SECURITY.md`](./SECURITY.md) for the
security posture.
