FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/worker/package.json apps/worker/
COPY packages/constants/package.json packages/constants/
RUN pnpm install --filter @hailing/worker --frozen-lockfile
COPY apps/worker apps/worker
COPY packages/constants packages/constants
RUN pnpm --filter @hailing/worker run build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/worker/dist /app/apps/worker/dist
COPY --from=build /app/apps/worker/package.json /app/apps/worker/
WORKDIR /app/apps/worker
CMD ["node", "dist/index.js"]
