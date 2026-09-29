FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/rider/package.json apps/rider/
COPY packages/constants/package.json packages/constants/
RUN pnpm install --filter @hailing/rider --frozen-lockfile
COPY apps/rider apps/rider
COPY packages/constants packages/constants
RUN pnpm --filter @hailing/rider run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3004
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/rider/.next /app/apps/rider/.next
COPY --from=build /app/apps/rider/public /app/apps/rider/public
COPY --from=build /app/apps/rider/package.json /app/apps/rider/
WORKDIR /app/apps/rider
EXPOSE 3004
CMD ["pnpm", "start"]
