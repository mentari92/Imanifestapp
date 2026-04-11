# ─── Stage 1: Build ───────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config first (for Docker layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/

# Install ALL deps (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/server/ apps/server/
COPY packages/database/ packages/database/
COPY packages/shared/ packages/shared/
COPY tsconfig.json ./
COPY turbo.json ./

# Generate Prisma client
RUN pnpm --filter @imanifest/database prisma generate

# Build the server
RUN pnpm --filter @imanifest/server build

# Prune devDependencies for production
RUN pnpm install --prod --frozen-lockfile

# ─── Stage 2: Production ──────────────────────────────────
FROM node:20-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy built app + production node_modules
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/database/package.json ./packages/database/
COPY --from=builder /app/packages/database/src ./packages/database/src
COPY --from=builder /app/packages/shared ./packages/shared

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

# Prisma migrate on startup, then start server
CMD ["node", "apps/server/dist/main.js"]