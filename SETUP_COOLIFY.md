# Coolify Setup Guide — HATOD on one VPS

Hands-on, in-order walkthrough to get the whole stack running on a single VPS
via [Coolify](https://coolify.io). For architecture, env-var meanings, and the
service map, see [`SYSTEM_MAP.md`](./SYSTEM_MAP.md). This file is the *how*.

Assumes: a fresh Ubuntu 22.04/24.04 VPS, root access, and this repo on GitHub.

---

## 0. Prerequisites

- VPS: **4 vCPU / 8 GB / 80 GB** recommended (2/4/40 works but Next builds are
  memory-hungry — see §9 if they OOM).
- A domain (or subdomain) whose **DNS you control**, e.g. `yourdomain.com`.
- GitHub repo access (Coolify installs a GitHub App or uses a deploy key).
- A Firebase project (for push) and an SMS provider account (for OTP) — can be
  wired later; the stack boots without them.

---

## 1. Point DNS at the VPS

Create **A records** at your registrar → your VPS IP, one per service:

| Host | Type | Value |
| --- | --- | --- |
| `api` | A | `<VPS_IP>` |
| `admin` | A | `<VPS_IP>` |
| `agency` | A | `<VPS_IP>` |
| `rider` | A | `<VPS_IP>` |
| `driver` | A | `<VPS_IP>` |

Wait for propagation (check with `nslookup api.yourdomain.com`). Coolify can
only issue Let's Encrypt certs once these resolve.

---

## 2. Install Coolify

SSH in as root, then:

```bash
# harden basics first (optional but recommended)
adduser deploy && usermod -aG sudo deploy    # stop using root for daily ops
ufw allow OpenSSH && ufw enable

# install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

When prompted, accept the default **local** installation. It drops you a URL
like `http://<VPS_IP>:8000`. Open it:

1. Create the Coolify admin account (strong password).
2. Finish the onboarding (it registers the server itself).

---

## 3. Connect the repo

Coolify dashboard → **Resources → New → Private/Public repository** (or
Settings → GitHub App). Authorize the app or paste an SSH deploy key that has
read access to `moreishi/hatod-co`.

---

## 4. Create backing services first (order matters)

**+ Create → Services**. Add each as a Docker service. These are **internal**:
do **not** attach a public domain, and set them to a private network so only
other containers can reach them.

### 4a. Postgres (PostGIS)
1. Choose **Postgres** from the service catalog.
2. After creation, change the image to `postgis/postgis:16-3.4` (the app needs
   PostGIS per AGENTS.md rule 4 — the stock `postgres` image won't do).
3. Env: `POSTGRES_DB=hailing`, `POSTGRES_USER=<set>`, `POSTGRES_PASSWORD=<strong>`.
4. Note the **internal connection URL** Coolify shows
   (`postgres://…:5432/hailing`) — you'll paste it as `DATABASE_URL` in §5.
5. Enable **backup** on this resource → schedule it → destination S3-compatible
   bucket (Wasabi/B2 are cheap near PH).

### 4b. Redis
- Catalog → **Redis** (`redis:7-alpine`). Internal. Copy its URL for `REDIS_URL`.

### 4c. RabbitMQ (optional for now)
- Catalog → **RabbitMQ** with management. Set default user/pass.
- The current worker is poll-based, so this is only needed when you switch to
  queue-backed delivery. Safe to add now and ignore until then.

### 4d. OSRM (optional, when routing volume grows)
- Add a Docker service `osrm/osrm-backend`. You'll need a `.osrm` extract of the
  Visayas mounted as a volume; run command
  `osrm-routed --algorithm mld /data/region.osrm`. Then point the api's
  routing at it instead of the free public OSRM.

---

## 5. Deploy the API (core service)

**+ Create → Application** → this repo.

- **Base directory**: `apps/api`
- **Build pack**: Dockerfile (Coolify auto-detects `apps/api/Dockerfile`)
- **Port**: `3001`
- **Domains**: `https://api.yourdomain.com`

Set **environment variables** (see `SYSTEM_MAP.md` §6 for the full list):

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://<user>:<pass>@<postgres-internal-host>:5432/hailing
REDIS_URL=redis://<redis-internal-host>:6379
JWT_SECRET=<generate: openssl rand -hex 32>
ROUTING_PROVIDER=osrm
```

- Generate the secret on the VPS: `openssl rand -hex 32`. **Never** ship the
  `localstage-only-dev-secret` default to prod.
- Use the postgres **internal** hostname, not `localhost`.
- **Add a service dependency** on the Postgres resource (so it starts first).

Click **Deploy**. Watch logs until `hailing api listening on :3001/api`.

---

## 6. Run database migrations (must be explicit)

Containers do **not** auto-migrate. After the api image builds, run migrations
against the prod DB from Coolify's **web terminal** on the api service (or a
one-shot service):

```bash
# inside apps/api of the built image (has prisma + postgres schema)
npx prisma migrate deploy --schema prisma/postgres/schema.prisma
```

⚠️ **Before first deploy:** `DeviceToken` and `FareSchedule` were applied to the
dev DB by raw SQL and have **no committed migration**. Generate and commit real
migrations locally (`prisma migrate dev --create-only`) or `migrate deploy`
won't create those tables in prod. This blocks the mobile chat/push/fare flows.

Do **not** run `prisma:seed` / `prisma:seed-places` against prod — the seed
guard refuses non-local URLs, and sample accounts must never exist in prod.

---

## 7. Deploy the worker

**+ Create → Application**, same repo:

- **Base directory**: `apps/worker` · Dockerfile auto-detected · **no domain/port**
- Env:
  ```
  DATABASE_URL=<same as api>
  WORKER_POLL_MS=10000
  RABBITMQ_URL=amqp://<user>:<pass>@<rabbitmq-host>:5672   # if using rabbitmq
  GOOGLE_APPLICATION_CREDENTIALS=/run/secrets/firebase-service-account.json  # when push is wired
  ```
- Depends on Postgres (+ RabbitMQ). Deploy. Logs should show
  `hailing worker starting (outbox poll every …ms)`.

Until the FCM service-account file is mounted (§10) the worker's push provider
safely logs instead of sending — deploy is fine without it.

---

## 8. Deploy the four web portals

Repeat **Application** for each: `apps/admin`, `apps/agency`, `apps/rider`,
`apps/driver`. Each is a Next.js Dockerfile on its own port/domain:

| Dir | Port | Domain |
| --- | --- | --- |
| `apps/admin` | 3000 | `admin.yourdomain.com` |
| `apps/agency` | 3002 | `agency.yourdomain.com` |
| `apps/rider` | 3004 | `rider.yourdomain.com` |
| `apps/driver` | 3005 | `driver.yourdomain.com` |

**Env for every portal** (the two that matter):

```
HAILING_API_URL=http://<api-internal-host>:3001
JWT_SECRET=<must EXACTLY match the api's JWT_SECRET>
```

The portals verify the session cookie locally with `JWT_SECRET` and proxy to
the api server-side, so a mismatch silently breaks login.

- Add a service dependency on **api** for each.
- **`admin` is a privileged portal** — restrict it to staff IPs (Coolify →
  service → advanced Traefik middlewares / IP allowlist) or at minimum keep it
  off public links.

Deploy all four.

---

## 9. If builds fail / OOM

The four Next.js builds in one Go are the usual failure point on a small VPS:

- Add swap: `fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`.
- Or move heavy builds to **GitHub Actions → registry → Coolify pulls**
  (already have CI running build/test/typecheck/lint). Build once in CI, push
  to GHCR, and point the Coolify resource at the image.
- Deploy the api first, confirm it's healthy, then portals one at a time.

---

## 10. Wire push (FCM) — when ready

1. Firebase console → new project → add Android app, package
   `com.hatod.hailing_mobile`.
2. Download `google-services.json` → `apps/mobile/android/app/`, then run
   `flutterfire configure` in `apps/mobile`.
3. Download the **service account key** JSON (Project settings → Service
   accounts).
4. Coolify → api + worker → **Secrets/Files** → add the JSON as a *file*
   mounted at the exact `GOOGLE_APPLICATION_CREDENTIALS` path (§7).
5. Rebuild/redeploy. Now the worker sends real FCM; the outbox
   `NEW_MESSAGE` rows deliver to registered device tokens.

Push is a no-op until this is done — safe to defer past first deploy.

---

## 11. Wire SMS (OTP) — required for real signups

`NODE_ENV=production` disables the dev-code return, so OTP only reaches phones
through a real SMS provider (Semaphore/Twilio) via the notifications package.

- Add provider creds as Coolify secrets for the api.
- The code already enqueues into the `Notification` outbox; the worker sends.
- **Cost watch (AGENTS rule 5):** estimate monthly OTP volume, keep per-number
  throttling on, and note the projected spend in the PR that enables it.

---

## 12. Build & ship the mobile app

Not a VPS service. Point it at the public api and produce an installable build:

```powershell
cd apps/mobile
flutter build apk --release --dart-define=API_URL=https://api.yourdomain.com
```

Distribute the APK directly, via Firebase App Distribution, or Play internal
track. (iOS requires a macOS runner or Codemagic/Xcode Cloud CI.)

---

## 13. Verify the whole loop (go-live gate)

Against `https://api.yourdomain.com`:

1. Register/login on mobile → receive **real SMS** OTP (needs §11).
2. Book a ride → GPS pickup → destination search → fare + route.
3. Driver (web portal or mobile) online → gets the offer → accept.
4. Trip states advance → **in-trip chat works both ways**.
5. Complete → order detail + return trip.
6. Admin portal: publish a fare schedule → confirm quotes repriced ≤30s later.
7. Agency portal: review a driver's documents → photo preview, reject reason.

Then run the full pre-prod checklist in `SYSTEM_MAP.md` §13.

---

## 14. Day-2 operations

- **Deploy a change**: push to the branch → Coolify auto-deploys (or manual).
  Always re-run `migrate deploy` if schema changed.
- **Logs**: Coolify → each service → Logs; watch api errors + worker
  outbox `FAILED` counts.
- **Rollback**: redeploy the previous commit/image tag (Coolify keeps releases).
- **Backups**: confirm the scheduled Postgres backup ran; restore-test quarterly.
- **Secrets rotation**: change `JWT_SECRET` in all 5 places together (api + 4
  portals) in one deploy, or sessions break.

---

### Reference

- Architecture, service map, full env table, cost watch → [`SYSTEM_MAP.md`](./SYSTEM_MAP.md)
- App-specific agent notes → `apps/admin/AGENTS.md`, repo rules → `AGENTS.md`
