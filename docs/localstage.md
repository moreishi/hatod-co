# LocalStage — run the whole stack locally (spec §54)

## Without Docker (works today)

SQLite + direct dev servers, no external services:

```powershell
pnpm install
pnpm --filter @hailing/api exec prisma generate   # after every schema change
pnpm --filter @hailing/api exec prisma migrate dev   # creates apps/api/prisma/dev.db
pnpm --filter @hailing/api run prisma:seed            # 45 users, 130 rides, 236 txns
pnpm --filter @hailing/api run prisma:validate        # spec rules 26-30
pnpm dev                                              # turbo: api :3001, agency :3002, worker
```

| Service | URL                                                                     |
| ------- | ----------------------------------------------------------------------- |
| API     | http://localhost:3001/api                                               |
| Health  | http://localhost:3001/api/health                                        |
| Admin   | http://localhost:3000 (`@hailing/admin`; login `0917100000` + dev code) |
| Agency  | http://localhost:3002      |
| Rider   | http://localhost:3004 (`@hailing/rider`; login `0917100031` + dev code) |
| Driver  | http://localhost:3005 (`@hailing/driver`; login `0917100011` + dev code) |

## With Docker (LocalStage full stack)

Requires Docker Desktop (not installed on this machine yet):

```powershell
Copy-Item .env.example .env
docker compose -f infrastructure/docker-compose.yml up --build
```

| Service  | URL / port                                        |
| -------- | ------------------------------------------------- |
| API      | http://localhost:3001/api                         |
| Agency   | http://localhost:3002                             |
| RabbitMQ | http://localhost:15672 (hailing/hailing)          |
| Mailhog  | http://localhost:8025                             |
| Adminer  | http://localhost:8080 (postgres, hailing/hailing) |

## Rules

- Seeds run against `file:` SQLite URLs only — `seed.ts` aborts otherwise.
- `dev.db` is gitignored; migrations are committed.
- Production parity (Postgres/PostGIS) happens in CI + Coolify, not here.

## Production database (Postgres + PostGIS)

LocalStage stays on SQLite (`prisma/schema.prisma`) per spec rule — do not
replace it. Production uses a second schema:

- `apps/api/prisma/postgres/schema.prisma` — same models, `provider = "postgresql"`.
- `apps/api/prisma/postgres/migrations/` — `000_init` baseline plus
  `001_checks_postgis` (PostGIS extension + CHECK constraints mirroring
  `@hailing/constants`).
- After **every** SQLite schema change, mirror it in the Postgres schema and
  run `node apps/api/scripts/check-schema-drift.mjs` (CI enforces this).
- Generate a Postgres migration with
  `prisma migrate diff` (see `docs` history), never by hand-editing the baseline.
- CI `postgres` job deploys both migrations to `postgis/postgis:16-3.4`,
  then replays them into a shadow DB and diffs against the schema — a model
  or column without a committed migration **fails CI** (this closed the
  `DeviceToken`/`FareSchedule`/`reviewNote` gap found on first prod deploy).
  Production deploys generate the client from the Postgres schema and run
  `prisma migrate deploy --schema prisma/postgres/schema.prisma`.

## Deploying to production (Coolify)

For the real VPS deployment — DNS, backing services, api/worker/portals,
migrations, FCM + SMS wiring, and the go-live checklist — see
[`SETUP_COOLIFY.md`](./SETUP_COOLIFY.md) (the *how*) and
[`SYSTEM_MAP.md`](./SYSTEM_MAP.md) (the *what*).
