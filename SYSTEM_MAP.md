# SYSTEM MAP — Coolify deployment

This document maps every running piece of HATOD to a deployable unit on a
single VPS managed by [Coolify](https://coolify.io). It is the source of
truth for "what do we run, where, with what env, and in what order".

> Naming note: this file is `SYSTEM_MAP.md`. The request spelled it
> `SYSMTEM_MAP.MD`; rename if you want that literal filename.

---

## 1. Topology at a glance

```
                         ┌──────────────────────── VPS (Coolify) ───────────────────────┐
  Internet ──HTTPS──►    │  Traefik (Coolify proxy) :443/:80                            │
                         │    │                                                          │
                         │    ├─► api        (Node/Nest)   :3001   ◄── REST + Socket.io  │
                         │    ├─► admin      (Next.js)     :3000   ◄── /admin.*          │
                         │    ├─► agency     (Next.js)     :3002   ◄── /agency.*         │
                         │    ├─► rider-web  (Next.js)     :3004   ◄── /rider.*          │
                         │    ├─► driver-web (Next.js)     :3005   ◄── /driver.*         │
                         │    └─► worker     (Node, no port)        ◄── queue consumer   │
                         │                                                              │
                         │  Services (Coolify):                                         │
                         │    ├─► postgres   (PostGIS 16)  :5432  [internal]            │
                         │    ├─► redis      (Redis 7)      :6379  [internal]            │
                         │    └─► rabbitmq   (MQ 3)      :5672/15672 [internal]          │
                         │                                                              │
                         │  Optional self-host:                                         │
                         │    └─► osrm       (routing)    :5000   [internal]            │
                         └──────────────────────────────────────────────────────────────┘

  Flutter mobile app ──HTTPS──► api (public domain)        (built per env, not hosted here)
```

- **api** is the only service the mobile app and web portals talk to directly.
- The four **Next.js portals** are thin BFFs: they verify the `hailing_session`
  cookie JWT locally (needs the same `JWT_SECRET`) and proxy to `api`
  server-side (`HAILING_API_URL`).
- **worker** has no public port — it drains the notification outbox and runs
  retention purges.
- **postgres/redis/rabbitmq** are internal; nothing outside the VPS hits them.

---

## 2. Deployable units

| App | Type | Build | Start | Port | Public? |
| --- | --- | --- | --- | --- | --- |
| `apps/api` | Dockerfile (multi-stage) | `pnpm --filter @hailing/api build` | `node dist/main.js` | 3001 | yes |
| `apps/worker` | Dockerfile | `pnpm --filter @hailing/worker build` | `node dist/index.js` | — | no |
| `apps/admin` | Dockerfile | Next build | `pnpm start` | 3000 | yes (ops IP allowlist) |
| `apps/agency` | Dockerfile | Next build | `pnpm start` | 3002 | yes |
| `apps/rider` | Dockerfile | Next build | `pnpm start` | 3004 | yes |
| `apps/driver` | Dockerfile | Next build | `pnpm start` | 3005 | yes |

Shared packages (`@hailing/constants`, `data`, `notifications`, `routing`) are
workspace deps copied into each image at build time — no separate deploy.

`apps/simulator` and `apps/e2e` are **dev/CI only** — never deploy to prod.

---

## 3. VPS sizing

| Tier | CPU / RAM / Disk | Fits |
| --- | --- | --- |
| Minimum | 2 vCPU / 4 GB / 40 GB | pilot traffic, self-hosted OSRM tight |
| Recommended | 4 vCPU / 8 GB / 80 GB | headroom for OSRM + PostGIS + builds |

Coolify itself + its Swarm/Traefik want ~1 GB; the four Next.js builds are the
memory spikes. If builds OOM, add swap or build images in CI and push to a
registry (see §9).

---

## 4. One-time VPS + Coolify bootstrap

```bash
# as root on a fresh Ubuntu 22.04/24.04 VPS
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
# then open the web installer (Coolify on :8000), create an admin,
# and connect this repo as a GitHub App / deploy key.
```

Domain plan (set DNS A-records to the VPS IP before assigning domains):

| Service | Suggested host |
| --- | --- |
| api | `api.yourdomain.com` |
| admin | `admin.yourdomain.com` |
| agency | `agency.yourdomain.com` |
| rider web | `rider.yourdomain.com` |
| driver web | `driver.yourdomain.com` |

Coolify auto-issues Let's Encrypt certs once DNS resolves.

---

## 5. Backing services (Coolify "Services")

Add as Docker services, **internal networks only** (no public domain).

### Postgres + PostGIS
- Image: `postgis/postgis:16-3.4` (the app requires PostGIS per AGENTS.md rule 4).
- Env: `POSTGRES_USER`, `POSTGRES_PASSWORD` (strong), `POSTGRES_DB=hailing`.
- Coolify exposes the internal URL:
  `postgresql://<user>:<pass>@<container>:5432/hailing`
- **Enable scheduled backups** (Coolify → database → backup) to S3-compatible
  storage.

### Redis
- Image: `redis:7-alpine`. Internal only. Used for the Socket.io adapter +
  rate limiting.

### RabbitMQ
- Image: `rabbitmq:3-management-alpine`.
- Env: `RABBITMQ_DEFAULT_USER`, `RABBITMQ_DEFAULT_PASS`.
- Port 15672 (management UI) **behind auth or VPN only** — never open to the
  public internet.
- Note: the current worker uses a poll-based outbox, so RabbitMQ is optional
  until you wire queue-backed delivery. It's in the stack for that next step.

### OSRM (optional, recommended for cost control)
- Free `router.project-osrm.org` is fine for a small pilot but rate-limited and
  not for production load. Self-host if volume grows:
  image `osrm/osrm-backend`, mount a `.osrm` extract of the Visayas, run
  `osrm-routed --port 5000`. Then set `ROUTING_PROVIDER` accordingly in the api.

---

## 6. Environment variables (authoritative)

Values gathered from `apps/*/src` + `apps/mobile`. Never commit real secrets.

### api
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://<user>:<pass>@postgres:5432/hailing   # internal host
JWT_SECRET=<64+ char random, MUST be set in prod>
REDIS_URL=redis://redis:6379
ROUTING_PROVIDER=osrm            # or haversine as a no-dependency fallback
# FCM push (leave unset until firebase.json is mounted → provider falls back to log)
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-service-account.json
```
`NODE_ENV=production` also disables the LocalStage OTP `devCode` return — codes
only reach phones via a real SMS provider (see §8).

### worker
```
DATABASE_URL=<same as api>
RABBITMQ_URL=amqp://<user>:<pass>@rabbitmq:5672   # when queue-backed
WORKER_POLL_MS=10000
GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-service-account.json
```

### each Next.js portal (admin/agency/rider/driver)
```
HAILING_API_URL=http://api:3001          # internal container DNS
JWT_SECRET=<must EXACTLY match api>       # portals verify the cookie locally
```
Set the portal's own public domain in Coolify so Traefik routes it.

### Flutter mobile app (build-time, not runtime)
```
API_URL=https://api.yourdomain.com        # via --dart-define at build
```
The app has no server here — you build and distribute the APK/AAB per target.

---

## 7. Coolify resources — how to create them

For each app (`api`, the 4 portals, `worker`):

1. **New → Application** → select this repo → correct branch → base directory
   `apps/<name>`. Coolify detects the committed `Dockerfile`.
2. Domain field = the subdomain from §4 (blank for `worker`).
3. Env vars = §6. Put secrets as Coolify **secrets**, mount the FCM service
   account file as a Coolify **file** to the exact path in
   `GOOGLE_APPLICATION_CREDENTIALS`.
4. Add **service dependency** on postgres (+ redis) so start order is correct.

For Postgres/Redis/RabbitMQ: **New → Service** → pick the template (or
Docker service with the images in §5). Mark databases as **internal** (no
public IP) and note the internal hostname Coolify assigns (used in URLs above).

Set api health check to `GET /` (the Nest app answers 200 on root during the
OTP probe path) or a dedicated probe if you add one.

---

## 8. Third-party integrations + cost watch (AGENTS.md rule 5)

Per AGENTS.md, Google Maps and SMS are billed per call — cache, throttle, and
state expected volume.

- **Maps**: the mobile app uses **flutter_map + CyclOSM tiles (no API key)** —
  $0 and no Google Maps bill. Keep it that way for the pilot.
- **SMS (OTP)**: prod needs a provider wired through the notifications package
  (Semaphore/Twilio). The code path enqueues into the `Notification` outbox;
  the worker delivers. **Estimate volume in the PR that enables real SMS**, and
  add per-number throttling. Until then OTP codes cannot reach real phones
  (LocalStage dev-code mode is dev-only).
- **FCM push**: create a Firebase project, package `com.iskinaph.hailing`,
  download `google-services.json` → `apps/mobile/android/app/`, and a service
  account JSON for the worker/`GOOGLE_APPLICATION_CREDENTIALS`. Run `flutterfire
  configure`. Push stays a safe no-op until the config is present.
- **Nominatim (places)**: free but hard rate-limited to **1 req/s, PH-scoped**.
  The place cache + `hitCount` already reduce lookups; do not add load without
  reviewing volume. Self-host Nominatim if it becomes a bottleneck.

---

## 9. Build & deploy order

```
1. postgres  → (wait healthy)
2. redis, rabbitmq
3. api        → then run migrations (§10)
4. worker
5. admin, agency, rider, driver (portals)
```

Coolify "Start command" hooks or a manual deploy hook can sequence this. In CI
(GitHub Actions already runs build/test/typecheck/lint) you can build images
and push to a registry, then have Coolify pull — cheaper CPU on the VPS than
building Next.js there.

---

## 10. Database migrations & seed (IMPORTANT — known drift)

- The **prod schema is `apps/api/prisma/postgres/schema.prisma`** (provider
  `postgresql`). The legacy root `apps/api/prisma/schema.prisma` (SQLite) is
  dev-fallback only.
- Migrations are **not run at container start** (`api` CMD is just
  `node dist/main.js`). You must run them explicitly on deploy:
  ```bash
  pnpm --filter @hailing/api exec prisma migrate deploy \
    --schema prisma/postgres/schema.prisma
  ```
  Put this in a Coolify **deploy hook / pre-build command**, or a one-shot
  "build & deploy" service, so schema lands before traffic.
- **Drift caveat:** `DeviceToken` and `FareSchedule` were applied to the dev DB
  via raw SQL and have **no committed migration files**. Before prod works,
  generate real migrations for them (`prisma migrate dev --create-only`) and
  commit them, or prod `migrate deploy` will not create those tables.
- **Seed** (`prisma:seed`, `prisma:seed-places`) is guarded to refuse
  non-local `DATABASE_URL`. Do **not** seed prod. Provision real agencies/admins
  via the admin portal + a bootstrap script you run deliberately.

---

## 11. Rollback, backups, health

- **Rollback**: Coolify keeps prior images — redeploy previous commit, or flip
  the domain to the old tag. Keep ≥2 released builds.
- **Backups**: Coolify scheduled `pg_dump` → S3 (Wasabi/B2/Backblaze for cheap
  PH-region-adjacent storage). Test a restore before go-live.
- **Health**: api on `:3001` (add a `/health` if you want clean probes);
  worker is a long-running process with `WORKER_HEARTBEAT_MS` logging; watch
  the outbox `FAILED` count. Coolify → per-service logs + uptime.

---

## 12. Mobile distribution

The Flutter app is not a VPS service. For pilot testers:
- `flutter build apk --release --dart-define=API_URL=https://api.yourdomain.com`
- distribute the APK directly, or via Firebase App Distribution / Play internal
  track. iOS needs a Mac or Codemagic/`xcode_cloud` CI to build.

---

## 13. Go-live checklist

- [ ] DNS A-records → VPS; Coolify certs issued for all subdomains.
- [ ] postgres=PostGIS, redis, (rabbitmq) healthy, **internal only**.
- [ ] `JWT_SECRET` strong, identical across api + 4 portals; never the
      `localstage-only-dev-secret` default.
- [ ] Committed migrations for `DeviceToken` + `FareSchedule` (§10); prod schema
      matches `prisma/postgres/schema.prisma`.
- [ ] FCM config mounted; `NODE_ENV=production` verified (no devCode leakage).
- [ ] SMS provider chosen + volume estimate documented (AGENTS rule 5).
- [ ] Scheduled DB backups to object storage + one restore test.
- [ ] Sample-account seed NOT run against prod.
- [ ] Mobile APK built with `API_URL` → public api domain; install on test device.
- [ ] Ride loop verified end-to-end against prod: register → OTP(SMS) → book →
      assign/offer → accept → trip → **chat** → complete.
