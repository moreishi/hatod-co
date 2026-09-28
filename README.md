# Hatod — Gensan ride-hailing pilot

Rider + Driver + Admin marketplace for General Santos City, then Mindanao-wide.
Cash + GCash first, LTFRB-compliant fleet ops.

## Stack

| Layer | Choice |
|---|---|
| Rider / Driver apps | Flutter (planned) |
| Admin | Next.js 16 LTS (`apps/admin`) |
| Auth | Auth.js credentials + JWT roles |
| DB prod | Postgres 16 + PostGIS (`db/migrations`) |
| DB dev | SQLite via `node:sqlite` (zero-install, auto-seeded) |
| Maps | Google Places + Routes (search/route only); live positions stream over SSE |
| Payments | Cash + manual GCash v1 → PayMongo v2 |

## Quickstart (5 min, no Docker)

Requirements: Node 20.9+ (24 recommended — see `.nvmrc`), npm.

```sh
cd apps/admin
npm install
cp .env.example .env   # then set AUTH_SECRET: openssl rand -base64 32
npm run dev            # http://localhost:3000
```

Login with the seeded dev admin: `admin@hatod.co` / `Hatod123!`
(override with `ADMIN_PASSWORD` in `.env`).

Checks every change must pass:

```sh
npm run lint && npm test && npm run build
```

## Repo layout

```
apps/admin/   Next.js ops panel (fleet, zones/fares, dispatch, riders)
db/           Postgres migrations + docker-compose (prod)
```

## Workflow

- **git-flow**: `master` (prod) ← `develop` ← `feature/*`. See CONTRIBUTING.md.
- **TDD is mandatory**: red test first for logic, pure functions in `src/lib/`, full loop green before merge.
- Never commit `.env`, `*.sqlite3`, or password hashes.
