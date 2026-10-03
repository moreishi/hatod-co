FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/agency/package.json apps/agency/
COPY packages/constants/package.json packages/constants/
RUN pnpm install --filter "@hailing/agency..." --frozen-lockfile
COPY apps/agency apps/agency
COPY packages/constants packages/constants
# Build workspace deps first (their types live in dist/).
RUN pnpm --filter @hailing/agency^... run build
RUN pnpm --filter @hailing/agency run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3002
COPY --from=build /app/node_modules /app/node_modules
# pnpm workspaces: ship the portal's own node_modules + @hailing/* packages.
COPY --from=build /app/apps/agency/node_modules /app/apps/agency/node_modules
COPY --from=build /app/packages /app/packages
COPY --from=build /app/apps/agency/.next /app/apps/agency/.next
COPY --from=build /app/apps/agency/public /app/apps/agency/public
COPY --from=build /app/apps/agency/package.json /app/apps/agency/
WORKDIR /app/apps/agency
EXPOSE 3002
CMD ["pnpm", "start"]
