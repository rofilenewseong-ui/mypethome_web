FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @petholo/api...

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
WORKDIR /app/apps/api
RUN npx tsc

# Production
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/package.json ./apps/api/

RUN mkdir -p /app/apps/api/uploads

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/server.js"]
