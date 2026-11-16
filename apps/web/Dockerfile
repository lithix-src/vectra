# =============================================================================
# VECTRA Next.js 15 Frontend Container Image (Node 24 LTS + Corepack pnpm)
# Compatible with Rancher Desktop (nerdctl / dockerd moby)
# =============================================================================
FROM node:24-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts

FROM base AS builder
ARG NEXT_PUBLIC_API_URL=http://vectra-api:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
RUN pnpm --filter @vectra/web build

FROM base AS runner
ENV NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=http://vectra-api:8000
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
EXPOSE 3000
COPY --from=builder /app ./
WORKDIR /app/apps/web
CMD ["pnpm", "start"]
