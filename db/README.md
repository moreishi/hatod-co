# Database

Prod is **Postgres 16 + PostGIS**. Dev is SQLite (`node:sqlite`, zero-install).

## Migrations (`migrations/`, apply in filename order)

| # | What |
|---|---|
| 001 | zones, drivers, drivers_live, trips (+ Gensan seed zones) |
| 002–003 | riders, users |
| 004–007 | role CHECK widen, profile links, user_roles, agency applications |
| 008–009 | onboarding steps, fleet ownership |
| 010–012 | user phones, driver documents, rider emails |
| 013–015 | payouts, payments (parked), wallets |
| 016–017 | OTP codes, tx memo |
| 018–019 | account status, role grants |

Rules: **additive only** — new tables/columns, never rename/drop in the same
deploy as dependent code. Every `$n` placeholder exactly once (see
`checkBindings` — SQLite expands positionally, Postgres reuses numbers).

## Local Postgres (optional — dev runs fine on SQLite)

```sh
docker compose -f db/docker-compose.yml up -d
# migrations/ auto-apply on FIRST init only (Postgres initdb behavior).
# For an existing volume, apply new files manually in order:
#   psql $DATABASE_URL -f db/migrations/00X_*.sql
```

## Dev SQLite

`apps/admin/dev.sqlite3` (gitignored) self-creates on first query and
self-migrates old files via `migrate()` in `src/lib/sqlite.ts`. Delete the
file for a clean reseed. It mirrors every migration — keep both in sync.
