# Hailing — Cebu ride-hailing pilot

Agency-operated ride marketplace for Cebu, Philippines. Modular monolith +
event-driven internals; the full blueprint is `HAILING_PROJECT_SPECIFICATION.md`.

## Stack

| Layer         | Choice                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| API           | NestJS 11 + Prisma (`apps/api`, `:3001`)                                                    |
| Admin portal  | Next.js 16 LTS + Tailwind (`apps/admin`, `:3000`)                                           |
| Agency portal | Next.js 16 LTS + Tailwind (`apps/agency`, `:3002`)                                          |
| Worker        | Outbox consumer for notifications + retention purge (`apps/worker`)                         |
| Simulator     | Virtual riders/drivers over the real API (`apps/simulator`, Phase 1)                        |
| E2E           | Playwright suite on an isolated stack (`apps/e2e`, ports 3100–3102)                         |
| Shared        | `@hailing/constants`, `@hailing/data` (Cebu geo + pricing), `@hailing/notifications`        |
| Auth          | Phone OTP + password 2FA gate, HMAC tokens, server-side RBAC                                |
| Rides         | Request → assign → accept/reject → en route → arrived → in progress → completed/cancelled   |
| Messaging     | One conversation per ride, TEXT/SYSTEM, SENT/DELIVERED/READ, idempotent sends, rate-limited |
| Realtime      | Socket.io gateway (`/realtime`, token-authed rooms for rides, agencies, conversations)      |
| DB dev        | SQLite LocalStage (`apps/api/prisma/dev.db`, Prisma migrations + seed)                      |
| DB prod       | Postgres 16 + PostGIS (Coolify; see `infrastructure/`)                                      |
| Realtime      | Socket.io gateway (`/realtime`); Redis adapter in production                                |
| Money         | Wallets + double-entry ledger (centavos); cash + wallet payments                            |

## Quickstart (no Docker)

Requirements: Node 20+, pnpm (`corepack prepare pnpm@latest --activate`).

```powershell
pnpm install
Copy-Item .env.example .env
pnpm --filter @hailing/api exec prisma migrate dev   # creates dev.db
pnpm --filter @hailing/api run prisma:seed            # 45 users, 130 rides, 236 txns
pnpm --filter @hailing/api run prisma:validate        # spec seed rules 26-30
pnpm dev                                              # api :3001, admin :3000, agency :3002, worker
```

With Docker (full LocalStage: PostGIS, Redis, RabbitMQ, Mailhog, Adminer):

```powershell
docker compose -f infrastructure/docker-compose.yml up --build
```

## Sample accounts (OTP code shows in LocalStage)

| Phone                       | Role                                         | Portal         |
| --------------------------- | -------------------------------------------- | -------------- |
| `0917100000`                | SUPER_ADMIN                                  | admin `:3000`  |
| `0917100001` / `0917100002` | OPS / FINANCE_ADMIN                          | admin `:3000`  |
| `0917100004`–`0917100006`   | Queen City Wheels OWNER/DISPATCHER/FINANCE   | agency `:3002` |
| `0917100008`–`0917100010`   | Mactan Island Rides OWNER/DISPATCHER/FINANCE | agency `:3002` |
| `0917100011`–`0917100026`   | ACTIVE drivers                               | —              |
| `0917100031`–`0917100046`   | riders                                       | —              |

## Simulator (virtual riders/drivers, Phase 1)

Exercises the real API — never production (it needs OTP dev codes).

```powershell
# terminal 1: backend with seeded dev data
pnpm --filter @hailing/api exec prisma migrate dev
pnpm --filter @hailing/api run prisma:seed
pnpm --filter @hailing/api run dev      # :3001

# terminal 2: scenarios (normal_ride, driver_reject, cancel_before_accept)
pnpm --filter @hailing/simulator exec tsx src/index.ts normal_ride
pnpm --filter @hailing/simulator exec tsx src/index.ts driver_reject --seed 42
$env:SIM_SPEED="10"; pnpm --filter @hailing/simulator exec tsx src/index.ts normal_ride
```

Config via env (defaults shown): `SIM_API_URL` (`http://localhost:3001`),
`SIM_RIDERS` (`09200000005,09200000006`), `SIM_DRIVERS` (`09200000004`),
`SIM_DISPATCHER` (`09200000003`), `SIM_SCENARIO`, `SIM_SEED` (`42`),
`SIM_SPEED` (`1`). Against the dev seed use `09171...` phones instead
(rider `0917100031`, driver `0917100011`, dispatcher `0917100005`).

Each run prints a JSON summary (`scenario`, `rideId`, `events`,
`chatMessages`, `wsEvents`, `ms`) plus the timestamped event log.

## Loop (every change)

```powershell
pnpm exec turbo run build test typecheck lint --force
```

Plus `prisma:validate` after seed changes and `prisma generate` after schema
changes. CI runs the same on every push/PR, including the E2E suite.

## Repo layout

```
apps/api/        NestJS backend (auth, rides, onboarding, agencies, admin, notifications, realtime, messaging)
apps/admin/      Platform admin portal (session, rides, finance, admins/invites, audit)
apps/agency/     Agency portal (home, driver board, dispatch, documents, fleet)
apps/worker/     Notification outbox consumer + retention purge
apps/simulator/  Virtual riders/drivers (normal_ride, driver_reject, cancel_before_accept)
apps/e2e/        Playwright specs on isolated ports + database
packages/        constants, data, notifications
infrastructure/  docker-compose.yml (LocalStage), Dockerfiles per app
docs/            localstage.md run guide
```

## Workflow

- **git-flow**: `master` (prod) ← `develop` ← `feature/*`. See CONTRIBUTING.md.
- **TDD**: red test first for domain logic; full loop green before merge.
- Never commit `.env`, `*.db`, or password hashes. Seeds refuse non-`file:` databases.
