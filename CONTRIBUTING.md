# Contributing to Hatod

## Branches (git-flow)

- `master` — production. Merge only via `release/*` or `hotfix/*`. Never commit directly.
- `develop` — integration. Feature branches merge here.
- `feature/<name>`, `bugfix/<name>` — off `develop`: `git flow feature start <name>`
- `release/<x.y.z>` — freeze, verify, then finish into `master` + `develop`, tag the release.

## Commits

Conventional style, imperative mood:

- `feat(admin): ...`, `fix(dispatch): ...`, `chore(db): ...`, `docs: ...`
- One logical change per commit. No secrets, no `.env`, no `*.sqlite3`.

## Definition of done (every PR)

1. **TDD**: failing test written first (red), minimal implementation (green), refactor. Pure logic lives in `src/lib/` and is unit-tested with vitest.
2. **Loop green**: `npm run lint && npm test && npm run build` — paste results in the PR.
3. **Migrations backward-compatible**: additive only (add table/column → deploy → backfill → drop later). Never rename/drop in the same deploy as dependent code.
4. **No cost surprises**: new Google Maps/SMS calls must note expected volume + cache strategy in the PR.
5. **Review**: 1 approval from another dev; author merges after green CI.

## Local review checklist

- [ ] Tests added/updated for logic changes (`src/lib/*.test.ts`)
- [ ] Tablet (768px) + desktop (1280px) checked for UI changes
- [ ] No new per-request Maps/SMS spend without a cache or quota
- [ ] `.env.example` updated if new env vars are needed
