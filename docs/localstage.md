# LocalStage — run the whole stack locally (spec §54)

## Without Docker (works today)

SQLite + direct dev servers, no external services:

```powershell
pnpm install
pnpm --filter @hailing/api exec prisma migrate dev   # creates apps/api/prisma/dev.db
pnpm --filter @hailing/api run prisma:seed            # 45 users, 130 rides, 236 txns
pnpm --filter @hailing/api run prisma:validate        # spec rules 26-30
pnpm dev                                              # turbo: api :3001, agency :3002, worker
```

| Service | URL                              |
| ------- | -------------------------------- |
| API     | http://localhost:3001/api        |
| Health  | http://localhost:3001/api/health |
| Agency  | http://localhost:3002            |

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
