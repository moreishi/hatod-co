# Hatod project rules (all agents and teammates)

1. **TDD is mandatory.** Red test first for logic, green minimal code, refactor.
   Pure business logic in testable functions (`apps/admin/src/lib/`).
2. **Full loop before merge:** `npm run lint && npm test && npm run build`.
3. **git-flow:** work on `feature/*` off `develop`; conventional commits.
4. **Prod DB is Postgres + PostGIS.** SQLite (`node:sqlite`) is dev-only.
5. **Watch the bills:** Google Maps and SMS are per-call — cache, throttle,
   and note expected volume in every PR that adds calls.
6. Never commit secrets, `.env` files, `*.sqlite3`, or password hashes.

App-specific agent notes live in `apps/admin/AGENTS.md`.
