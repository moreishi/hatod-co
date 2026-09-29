FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/constants/package.json packages/constants/
COPY packages/data/package.json packages/data/
RUN pnpm install --filter @hailing/api --frozen-lockfile
COPY apps/api apps/api
COPY packages/constants packages/constants
COPY packages/data packages/data
RUN pnpm --filter @hailing/api run build

FROM base AS runtime
ENV NODE_ENV=production PORT=3001
COPY --from=build /app/node_modules /app/node_modules
COPY --from=build /app/apps/api/dist /app/apps/api/dist
COPY --from=build /app/apps/api/package.json /app/apps/api/
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
