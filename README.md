# Hailing — Cebu ride-hailing pilot

Agency-operated ride marketplace for Cebu, Philippines. Modular monolith +
event-driven internals; the full blueprint is `HAILING_PROJECT_SPECIFICATION.md`.

## Stack

| Layer         | Choice                                                                                                   |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| API           | NestJS 11 + Prisma (`apps/api`, `:3001`)                                                                 |
| Admin portal  | Next.js 16 LTS + Tailwind + shadcn/ui (`apps/admin`, `:3000`)                                            |
| Agency portal | Next.js 16 LTS + Tailwind + shadcn/ui (`apps/agency`, `:3002`)                                           |
| Rider portal  | Next.js 16 LTS + Tailwind + shadcn/ui (`apps/rider`, `:3004`)                                            |
| Mobile        | Flutter rider + driver app, role-routed (`apps/mobile`, SDK on PATH)                                     |
| Driver portal | Next.js 16 LTS + Tailwind + shadcn/ui (`apps/driver`, `:3005`)                                           |
| Worker        | Outbox consumer for notifications + retention purge (`apps/worker`)                                      |
| Simulator     | Virtual riders/drivers over the real API (`apps/simulator`, Phases 1-2)                                  |
| E2E           | Playwright suite on an isolated stack (`apps/e2e`, ports 3100–3102)                                      |
| Shared        | `@hailing/constants`, `@hailing/data` (Cebu geo + pricing), `@hailing/notifications`, `@hailing/routing` |
| Auth          | Phone OTP + self-registration, password 2FA gate for staff, HMAC tokens, server-side RBAC                |
| Rides         | Request → assign → accept/reject → en route → arrived → in progress → completed/cancelled                |
| Messaging     | One conversation per ride, TEXT/SYSTEM, SENT/DELIVERED/READ, idempotent sends, rate-limited              |
| Realtime      | Socket.io gateway (`/realtime`, token-authed rooms for rides, agencies, conversations)                   |
| Places        | Seeded place cache + Nominatim fallback (PH-scoped, 1 req/s), reverse geocode, same-area ranking          |
| Routing       | OSRM (free, default) / haversine (`ROUTING_PROVIDER`) providers; driver pings + proximity matching       |
| Maps          | flutter_map + CyclOSM tiles (no API key); GPS pickup, pin picker, live driver marker                     |
| DB dev        | Postgres 16 + PostGIS in Docker (`pnpm db:up`, `apps/api/prisma/postgres/`); SQLite kept as no-Docker fallback |
| DB prod       | Postgres 16 + PostGIS (Coolify; see `infrastructure/`)                                                   |
| Money         | Wallets + double-entry ledger (centavos); versioned fare schedules (admin-published); cash + wallet payments |
| Push          | FCM device tokens + outbox delivery (`FcmPushProvider` when credentials are set, log provider otherwise) |

## Quickstart (Postgres-first)

Requirements: Node 20+, pnpm (`corepack prepare pnpm@latest --activate`), Docker.

```powershell
pnpm install
Copy-Item .env.example .env
pnpm db:up                                        # Postgres+PostGIS on :5432
pnpm --filter @hailing/api run prisma:generate
pnpm --filter @hailing/api run prisma:migrate     # postgres schema
pnpm --filter @hailing/api run prisma:seed        # users, agencies, rides, wallets
pnpm --filter @hailing/api run prisma:seed-places # Cebu place cache
pnpm --filter @hailing/api run prisma:validate    # spec seed rules 26-30
pnpm dev                                          # api :3001 + all portals + worker
```

No Docker? Point `DATABASE_URL` at SQLite (`file:./dev.db`) and use
`apps/api/prisma/schema.prisma`; everything else is identical.

With Docker for the full LocalStage (adds Redis, RabbitMQ, Mailhog, Adminer):

```powershell
docker compose -f infrastructure/docker-compose.yml up --build
```

## Mobile app (`apps/mobile`)

Single Flutter app, role-routed after OTP login: riders land on the
fullscreen-map home (GPS pickup → destination search or pin drop → vehicle
carousel → live quote + route → book); approved drivers get the driver home
(online toggle, GPS pings, incoming-offer cards with countdown +
review-first for special requests, trip state machine). A session that
carries both roles can switch modes from either profile.

```powershell
cd apps/mobile
flutter pub get
flutter run -d <device> --dart-define=API_URL=http://<lan-ip>:3001
flutter test
```

The API must be reachable from the device: `10.0.2.2` on Android emulators,
your LAN IP on physical devices.

## Sample accounts (OTP code shows in LocalStage)

| Phone                       | Role                                         | Portal         |
| --------------------------- | -------------------------------------------- | -------------- |
| `0917100000`                | SUPER_ADMIN                                  | admin `:3000`  |
| `0917100001` / `0917100002` | OPS / FINANCE_ADMIN                          | admin `:3000`  |
| `0917100004`–`0917100006`   | Queen City Wheels OWNER/DISPATCHER/FINANCE   | agency `:3002` |
| `0917100008`–`0917100010`   | Mactan Island Rides OWNER/DISPATCHER/FINANCE | agency `:3002` |
| `0917100011`–`0917100026`   | ACTIVE drivers                               | driver `:3005` |
| `0917100031`–`0917100046`   | riders                                       | rider `:3004`  |

## Simulator (virtual riders/drivers, Phases 1–2)

Exercises the real API — never production (it needs OTP dev codes).

```powershell
# terminal 1: backend with seeded dev data
pnpm --filter @hailing/api run prisma:migrate
pnpm --filter @hailing/api run prisma:seed
pnpm --filter @hailing/api run dev      # :3001

# terminal 2: scenarios (normal_ride, driver_reject, cancel_before_accept,
# chat_reconnect, message_retry)
pnpm --filter @hailing/simulator exec tsx src/index.ts normal_ride
pnpm --filter @hailing/simulator exec tsx src/index.ts driver_reject --seed 42
pnpm --filter @hailing/simulator exec tsx src/index.ts chat_reconnect
$env:SIM_SPEED="10"; pnpm --filter @hailing/simulator exec tsx src/index.ts normal_ride
```

Config via env (defaults shown): `SIM_API_URL` (`http://localhost:3001`),
`SIM_RIDERS` (`09200000005,09200000006`), `SIM_DRIVERS` (`09200000004`),
`SIM_DISPATCHER` (`09200000003`), `SIM_SCENARIO`, `SIM_SEED` (`42`),
`SIM_SPEED` (`1`). Against the dev seed use `09171...` phones instead
(rider `0917100031`, driver `0917100011`, dispatcher `0917100005`).

Each run prints a JSON summary (`scenario`, `rideId`, `events`,
`chatMessages`, `wsEvents`, `ms`) plus the timestamped event log. Agents
authenticate over HTTP, join token-authed WebSocket rooms, discover
assignments through the conversation list, and chat over both HTTP and WS
(`message.send` / delivered / read sync after reconnect).

### Co-driving a real device

```powershell
# simulated passenger books at the live driver's GPS (refuses stale pings)
pnpm --filter @hailing/api exec tsx prisma/passenger-booking.ts [rider] [driver] [tip] [changeFor] [note]
# API-side co-driver for the rider phone: assign, accept, walk trip states
pnpm --filter @hailing/simulator exec tsx src/drive-booking.ts [rider] [driver]
```

## Admin / agency operations

- **Admin portal** (`:3000`): platform settings (fares + matching knobs),
  versioned fare-schedule publishing (30s cache, audited), agencies
  (create/suspend/detail + fleet), rides ledger, finance, audit log.
- **Agency portal** (`:3002`): driver onboarding review (documents with
  photo preview, required reject reasons, per-driver progress), driver
  lifecycle (approve/reject/suspend/reactivate), dispatch board with
  NO_DRIVERS rescue, fleet management, search + paging across queues.

## Loop (every change)

```powershell
pnpm exec turbo run build test typecheck lint --force
```

Plus `prisma:validate` after seed changes and `prisma generate` after schema
changes. CI runs the same on every push/PR, including the E2E suite.

## Repo layout

```
apps/api/        NestJS backend (auth, rides, onboarding, agencies, admin, billing, places, notifications, realtime, messaging)
apps/admin/      Platform admin portal (settings/fares, agencies, rides, finance, admins/invites, audit)
apps/agency/     Agency portal (home, driver board, dispatch, documents, fleet)
apps/rider/      Rider portal (book with fare quote, my rides, ride detail + chat)
apps/driver/     Driver portal (online toggle, assignments, actions, chat)
apps/mobile/     Flutter rider + driver app (maps, booking, trips, onboarding, chat, push)
apps/worker/     Notification outbox consumer (log + FCM) + retention purge
apps/simulator/  Virtual riders/drivers (normal_ride, driver_reject, cancel_before_accept, chat_reconnect, message_retry) + drive-booking co-driver
apps/e2e/        Playwright specs on isolated ports + database
packages/        constants, data, notifications, routing
infrastructure/  docker-compose.yml (LocalStage), Dockerfiles per app
docs/            localstage.md run guide
```

## Workflow

- **git-flow**: `master` (prod) ← `develop` ← `feature/*`. See CONTRIBUTING.md.
- **TDD**: red test first for domain logic; full loop green before merge.
- Never commit `.env`, `*.db`, or password hashes. Seeds refuse remote (non-local) databases.
