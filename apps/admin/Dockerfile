FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/
COPY packages/constants/package.json packages/constants/
RUN pnpm install --filter "@hailing/admin..." --frozen-lockfile
COPY apps/admin apps/admin
COPY packages/constants packages/constants
# Build workspace deps first (their types live in dist/).
RUN pnpm --filter @hailing/admin^... run build
RUN pnpm --filter @hailing/admin run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3000
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/admin/.next /app/apps/admin/.next
COPY --from=build /app/apps/admin/public /app/apps/admin/public
COPY --from=build /app/apps/admin/package.json /app/apps/admin/
WORKDIR /app/apps/admin
EXPOSE 3000
CMD ["pnpm", "start"]
