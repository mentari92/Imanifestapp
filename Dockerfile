# ─── Stage 1: Build ───────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate

# Native deps for packages that may compile from source (e.g., bcrypt)
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy workspace config first (for Docker layer caching)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY apps/server/package.json apps/server/
COPY packages/database/package.json packages/database/
COPY packages/shared/package.json packages/shared/

# Install ALL deps
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/server/ apps/server/
COPY packages/database/ packages/database/
COPY packages/shared/ packages/shared/
COPY tsconfig.json ./
COPY turbo.json ./

# Build workspace packages in dependency order
# 1. Generate Prisma client + compile TypeScript
RUN cd packages/database && npx prisma generate && npx tsc
# 2. Compile shared package
RUN cd packages/shared && npx tsc
# 3. Build the NestJS server
RUN cd apps/server && npx nest build

# ─── Stage 2: Production ──────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Copy entire workspace from builder (preserves pnpm symlinks)
COPY --from=builder /app ./

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001
USER nestjs

EXPOSE 3001

# Run migrations then start server.
# If production DB predates migration tracking, baseline the initial migration and retry.
CMD sh -c "cd packages/database && (npx prisma migrate deploy || (echo '[startup] migrate deploy failed, attempting baseline for existing DB'; npx prisma migrate resolve --applied 20260412032734_init || true; npx prisma migrate deploy)) && cd /app && node apps/server/dist/main.js"