FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY packages/constants/package.json packages/constants/
COPY packages/data/package.json packages/data/
COPY packages/routing/package.json packages/routing/
COPY packages/notifications/package.json packages/notifications/
# "..." = also install the workspace deps' own dependencies (their build
# scripts need typescript etc.), not just the api's.
RUN pnpm install --filter "@hailing/api..." --frozen-lockfile
COPY apps/api apps/api
COPY packages/constants packages/constants
COPY packages/data packages/data
COPY packages/routing packages/routing
COPY packages/notifications packages/notifications
# Build the workspace deps first: their types live in dist/ and the
# api's tsconfig extends the root tsconfig.base.json (turbo does this
# ordering in CI; pnpm's ^... selector builds only the api's deps).
RUN pnpm --filter "@hailing/api^..." run build
# Generate the Prisma client from the POSTGRES schema — prod code uses
# Postgres-only filter features (mode: "insensitive") that the SQLite
# schema's client rejects. Install runs before the schema is copied, so
# the postinstall auto-generate never fires in Docker.
RUN pnpm --filter "@hailing/api" exec prisma generate --schema prisma/postgres/schema.prisma
RUN pnpm --filter "@hailing/api" run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3001
# pnpm workspaces: each app's direct deps live in apps/api/node_modules
# (symlinks into /app/node_modules/.pnpm), and @hailing/* imports resolve
# into /app/packages — all three must ship, not just the root store.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/node_modules /app/apps/api/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/api/dist /app/apps/api/dist
# Schema + migrations ship with the image so `prisma migrate deploy`
# works from the Coolify web terminal (§6) — migrations are never automatic.
COPY --from=build /app/apps/api/prisma /app/apps/api/prisma
COPY --from=build /app/apps/api/package.json /app/apps/api/
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
