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

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
