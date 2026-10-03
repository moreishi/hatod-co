FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/driver/package.json apps/driver/
COPY packages/constants/package.json packages/constants/
RUN pnpm install --filter "@hailing/driver..." --frozen-lockfile
COPY apps/driver apps/driver
COPY packages/constants packages/constants
# Build workspace deps first (their types live in dist/).
RUN pnpm --filter @hailing/driver^... run build
RUN pnpm --filter @hailing/driver run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3005
COPY --from=build /app/node_modules /app/node_modules
# pnpm workspaces: ship the portal's own node_modules + @hailing/* packages.
COPY --from=build /app/apps/driver/node_modules /app/apps/driver/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/driver/.next /app/apps/driver/.next
COPY --from=build /app/apps/driver/public /app/apps/driver/public
COPY --from=build /app/apps/driver/package.json /app/apps/driver/
WORKDIR /app/apps/driver
EXPOSE 3005
CMD ["pnpm", "start"]
