FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/constants/package.json packages/constants/
COPY packages/notifications/package.json packages/notifications/
RUN pnpm install --filter "@hailing/worker..." --frozen-lockfile
COPY apps/worker apps/worker
COPY packages/constants packages/constants
COPY packages/notifications packages/notifications
# Build workspace deps first (their types live in dist/).
RUN pnpm --filter @hailing/worker^... run build
RUN pnpm --filter @hailing/worker run build

FROM base AS runtime
ENV NODE_ENV=production
# pnpm workspaces: ship the worker's own node_modules + @hailing/* packages.
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/worker/node_modules /app/apps/worker/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build /app/apps/worker/package.json /app/apps/worker/
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
