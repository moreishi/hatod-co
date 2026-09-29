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
| Payments | **Cash only** (policy enforced in `createTrip`). GCash via PayMongo is |
| | specced and parked: `apps/admin/src/lib/paymongo.ts` + `014_payments.sql` |
| | activate when e-wallets launch (needs `PAYMONGO_SECRET_KEY`). |

## Quickstart (5 min, no Docker)

Requirements: Node 20.9+ (24 recommended — see `.nvmrc`), npm.

```sh
cd apps/admin
npm install
cp .env.example .env   # then set AUTH_SECRET: openssl rand -base64 32
npm run dev            # http://localhost:3000
```

Sign in with any seeded phone number — an SMS code prints in the
dev-server terminal (`[hatod dev-sms]`, Semaphore in prod):

| Phone | Role | Sees |
|---|---|---|
| `09170000001` (admin) | superadmin | full panel + Users |
| `09170000011` (ops) | operations | full panel, no Users |
| `09170000022` / `09170000033` | finance / support | full panel, no Users |
| `09170000044` | agency | `/fleet` portal (dashboard, drivers, earnings) |
| `09171110001` / `09171110011` | driver / rider | driver portal / `/no-access` |

### Demo world (dev only)

First dev-server boot seeds a deterministic demo dataset (~20s, once):
50+ agencies with approved applications and onboarding progress, ~1100
drivers (15–30 per fleet, mixed docs statuses), 45 riders with 5–32 trips
each, wallets funded and settled. Same data on every reseed (seed
`20260928`). Delete `apps/admin/dev.sqlite3` to replay from scratch.

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
