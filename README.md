# Glasshound SaaS

Multi-tenant pet salon SaaS rebuild from the Claude Design prototype.

## Current Layout

- `src/` - Next.js app, API routes, shared UI, domain helpers, and worker scaffold.
- `prisma/` - Prisma schema and demo tenant seed.
- `docs/` - planning docs and implementation roadmap.
- `ops/` - reverse proxy and deployment support files.
- `scripts/` - bootstrap, seed, backup, and restore helpers.
- `public/` - static assets for the production app.
- `prototypes/claude-design-export/` - original static Claude Design export kept as visual reference.

## Useful Commands

```sh
npm install
npm run dev
npm run lint
npm run typecheck
npm run test
npm run build
```

## Docker

Copy `.env.example` to `.env`, adjust secrets, then run:

```sh
docker compose up -d
```

The planned self-contained stack includes the web app, worker, Postgres, Redis, MinIO, and Caddy.

## Sprint Plan

See `docs/multi-tenant-saas-plan.md`.
