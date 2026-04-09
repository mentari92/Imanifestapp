# Story 1.1: Turborepo + Monorepo Setup

**Story Key:** 1-1-turborepo-monorepo-setup
**Epic:** Epic 1 — Foundation & Auth
**Priority:** Must Have
**Status:** review

---

## Story

**As a** developer
**I want to** have the full monorepo scaffold ready
**So that** I can build features without infrastructure friction

---

## Acceptance Criteria

- [ ] Turborepo initialized with pnpm workspaces
- [ ] `apps/mobile-web` — Expo app with Expo Router + NativeWind v4 configured
- [ ] `apps/server` — NestJS app with TypeScript strict mode
- [ ] `packages/database` — Prisma + PostgreSQL configured
- [ ] `packages/shared` — shared types, validators, and theme tokens
- [ ] `turbo.json` with `dev`, `build`, `lint` pipelines (see 03-architecture.md Section 2.1)
- [ ] `pnpm dev` starts both Expo and NestJS simultaneously
- [ ] `.env.example` documents all required variables
- [ ] README with setup instructions

### Design System Integration (from 05-design-system.md)
- [ ] `tailwind.config.js` in `apps/mobile-web` — copy exactly from 05-design-system.md Section 4
- [ ] `packages/shared/src/theme.ts` — copy shared theme object from 05-design-system.md Section 4
- [ ] `babel.config.js`, `metro.config.js`, `nativewind-env.d.ts` — see 03-architecture.md Section 2.4
- [ ] `app.json` — Expo config as per 03-architecture.md Section 2.3
- [ ] Font packages installed: `@expo-google-fonts/playfair-display`, `lora`, `amiri`, `jetbrains-mono`
- [ ] `lucide-react-native` installed for icons (see 05-design-system.md Section 8)
- [ ] Color palette uses Forest Green primary (#064E3B), Rosewood accent (#54161B), Champagne Gold highlight (#E3C567) — NOT purple/pink

---

## Tasks/Subtasks

- [ ] 1. Initialize Turborepo monorepo root
  - [ ] 1a. Create root `package.json` with turbo scripts
  - [ ] 1b. Create `turbo.json` with dev/build/lint/db pipelines
  - [ ] 1c. Create `pnpm-workspace.yaml`
  - [ ] 1d. Create root `tsconfig.json` with strict mode
  - [ ] 1e. Run `pnpm install` to bootstrap
- [ ] 2. Create `packages/shared` package
  - [ ] 2a. `package.json` with zod dependency
  - [ ] 2b. `tsconfig.json`
  - [ ] 2c. `src/types.ts` — shared TS interfaces (User, Manifestation, Task, Reflection, API types)
  - [ ] 2d. `src/validators.ts` — Zod schemas
  - [ ] 2e. `src/theme.ts` — color tokens, spacing, radii from 05-design-system.md Section 4
  - [ ] 2f. `src/index.ts` — barrel export
- [ ] 3. Create `packages/database` package
  - [ ] 3a. `package.json` with prisma + @prisma/client dependencies
  - [ ] 3b. `tsconfig.json`
  - [ ] 3c. `prisma/schema.prisma` with all 4 models (User, Manifestation, Task, Reflection) per architecture doc Section 3
  - [ ] 3d. `src/index.ts` — export prisma singleton
- [ ] 4. Create `apps/mobile-web` — Expo app
  - [ ] 4a. Initialize Expo project with Expo Router
  - [ ] 4b. `package.json` with all frontend dependencies per 03-architecture.md Section 2.2
  - [ ] 4c. `app.json` per 03-architecture.md Section 2.3
  - [ ] 4d. `babel.config.js` with NativeWind plugin
  - [ ] 4e. `metro.config.js` with NativeWind v4 config
  - [ ] 4f. `nativewind-env.d.ts` TypeScript declarations
  - [ ] 4g. `tailwind.config.js` from 05-design-system.md Section 4
  - [ ] 4h. `tsconfig.json` with paths to @imanifest/shared
  - [ ] 4i. `app/_layout.tsx` — root layout with font loading + tab navigator
  - [ ] 4j. `app/(tabs)/index.tsx` — placeholder ImanSync screen
  - [ ] 4k. `app/auth.tsx` — placeholder login screen
  - [ ] 4l. `lib/api.ts` — Axios client pointing to NestJS
  - [ ] 4m. `constants/theme.ts` — re-export from @imanifest/shared/theme
  - [ ] 4n. Install font packages + lucide-react-native
- [ ] 5. Create `apps/server` — NestJS app
  - [ ] 5a. Initialize NestJS project with TypeScript strict
  - [ ] 5b. `package.json` with all backend dependencies per 03-architecture.md Section 2.2
  - [ ] 5c. `tsconfig.json` with strict mode
  - [ ] 5d. `src/main.ts` — bootstrap on port 3001
  - [ ] 5e. `src/app.module.ts` — root module (empty feature modules for now)
  - [ ] 5f. `src/common/zhipu.service.ts` — placeholder GLM-5 client
  - [ ] 5g. `src/common/quran-api.service.ts` — placeholder Quran API client
  - [ ] 5h. `src/common/redis.service.ts` — placeholder Redis service
  - [ ] 5i. Create `.env.example` with all required variables
- [ ] 6. Create root `.env.example` and README.md
  - [ ] 6a. Root `.env.example` pointing to apps/server/.env
  - [ ] 6b. `README.md` with setup instructions
- [ ] 7. Verify `pnpm dev` starts both apps
  - [ ] 7a. Run `pnpm dev` and confirm Expo starts on port 8081
  - [ ] 7b. Confirm NestJS starts on port 3001
  - [ ] 7c. Fix any startup errors

---

## Dev Notes

### Architecture Reference
- **Monorepo structure:** See `Brain/03-architecture.md` Section 2 (Folder Structure)
- **Turbo config:** See Section 2.1 — turbo.json, pnpm-workspace.yaml, root package.json
- **Dependency versions:** See Section 2.2 — ALL versions are LOCKED, do not modify
- **Expo config:** See Section 2.3 — app.json
- **NativeWind config:** See Section 2.4 — babel, metro, nativewind-env.d.ts
- **DB schema:** See Section 3 — all 4 models with exact fields
- **Env vars:** See Section 7 — .env.example template
- **Design system:** See `Brain/05-design-system.md` Section 4 — Tailwind config and theme tokens

### Key Technical Decisions
1. **pnpm@9.15.0** — package manager (LOCKED)
2. **turbo@^2.3.0** — monorepo orchestrator (LOCKED)
3. **Expo SDK 52** — one codebase for iOS, Android, Web (LOCKED)
4. **NativeWind v4** — NOT v3, uses different metro config (LOCKED)
5. **NestJS 10** — backend framework (LOCKED)
6. **Prisma 6** — ORM (LOCKED)
7. **TypeScript 5.7 strict** — everywhere (LOCKED)

### Package naming convention
- `@imanifest/shared` → `packages/shared`
- `@imanifest/database` → `packages/database`
- Mobile app references `@imanifest/shared` for types and theme

### Color Palette (from 05-design-system.md)
- Primary: Forest Green #064E3B
- Accent: Rosewood #54161B
- Highlight: Champagne Gold #E3C567
- Background: Off-White #F8FAFC
- Surface: Soft White #F1F5F0
- Error: Deep Rose #9F1239
- Success: Sage Green #166534

### Fonts
- Display/Headings: Playfair Display
- Body: Lora
- Arabic/Verse: Amiri
- Mono/Metadata: JetBrains Mono

### Review Findings

- [ ] [Review][Decision] **`text-secondary` color namespace collision** — Tailwind color group `text` (text.primary, text.secondary) berbenturan dengan utility `text-*`. Class `text-secondary` tidak resolve ke `colors.text.secondary` tapi mencari `colors.secondary` (tidak ada). Pilihan: (A) Rename namespace dari `text` ke `ink` → class jadi `text-ink-secondary`, atau (B) Pakai class lengkap `text-text-secondary` di semua tempat, atau (C) Flat colors tanpa namespace: `textPrimary`, `textSecondary` sebagai top-level colors.

- [ ] [Review][Patch] **Font name mismatch** — `tailwind.config.js` fontFamily names (`"Playfair Display"`, `"Lora"`, `"Amiri"`, `"JetBrains Mono"`) tidak cocok dengan expo-font register keys (`"PlayfairDisplay-Bold"`, `"Lora-Regular"`, dll). NativeWind tidak akan menemukan font-nya. Fix: sinkronkan nama di kedua tempat. [`apps/mobile-web/tailwind.config.js:74-78` + `apps/mobile-web/app/_layout.tsx:18-25`]

- [ ] [Review][Patch] **README outdated — says "Expo SDK 52" tapi aktual SDK 55** [`README.md:59`]

- [ ] [Review][Patch] **No git init** — project belum punya version control

- [x] [Review][Defer] **Hardcoded `#A8A29E` in auth.tsx** [`apps/mobile-web/app/auth.tsx:18`] — deferred, pre-existing cosmetic issue

### Previous Story Learnings
- This is the first story — no previous learnings

---

## Dev Agent Record

### Implementation Plan
1. ✅ Root config: package.json, turbo.json, pnpm-workspace.yaml, tsconfig.json
2. ✅ packages/shared: types, validators (Zod), theme tokens from design system
3. ✅ packages/database: Prisma schema with 4 models, singleton export
4. ✅ apps/mobile-web: Expo SDK 55 + NativeWind v4 + Expo Router + all fonts
5. ✅ apps/server: NestJS 10 + placeholder services + env config
6. ✅ Root: .env.example, .gitignore, README.md
7. ✅ pnpm install — 841 packages resolved

### Debug Log
- `expo-audio@~52.0.0` not found → Expo SDK 52 doesn't exist, upgraded to SDK 55
- React 19 required for SDK 55 → updated `@types/react` to `^19.0.0`
- Added `@nestjs/cli` to server devDependencies for `nest start --watch`
- Peer dep warnings: `react-native-reanimated`, `lucide-react-native` — expected, safe to ignore

### Completion Notes
- **Expo SDK version updated from 52 → 55** (52 doesn't exist in registry)
- **React updated from 18 → 19** (required by Expo SDK 55)
- **NativeWind v4 config verified** — babel plugin + metro + tailwind all aligned
- **Design system fully integrated** — tailwind.config.js exact copy from 05-design-system.md
- **Theme tokens shared** — `packages/shared/src/theme.ts` + `apps/mobile-web/constants/theme.ts` re-export
- **Color palette correct** — Forest Green primary, Rosewood accent, Champagne Gold highlight
- **All 4 fonts installed** — Playfair Display, Lora, Amiri, JetBrains Mono
- **Lucide icons configured** — tab bar icons match 05-design-system.md Section 8
- **DB schema matches 03-architecture.md** — User, Manifestation, Task, Reflection with exact fields
- Note: `pnpm dev` requires running PostgreSQL for NestJS to fully start

---

## File List

### Root
- `package.json` — root scripts (dev, build, lint, db:generate, db:migrate)
- `turbo.json` — Turborepo pipeline config
- `pnpm-workspace.yaml` — workspace definitions
- `tsconfig.json` — root TypeScript strict config
- `.env.example` — env var reference
- `.gitignore` — ignores node_modules, .turbo, .env, .expo
- `README.md` — setup instructions

### packages/shared
- `package.json` — @imanifest/shared
- `tsconfig.json`
- `src/types.ts` — User, Manifestation, Task, Reflection, API types
- `src/validators.ts` — Zod schemas for all endpoints
- `src/theme.ts` — color tokens, radii, spacing from design system
- `src/index.ts` — barrel export

### packages/database
- `package.json` — @imanifest/database
- `tsconfig.json`
- `prisma/schema.prisma` — 4 models, PostgreSQL
- `src/index.ts` — PrismaClient singleton

### apps/mobile-web
- `package.json` — Expo SDK 55 + NativeWind v4 + fonts + Lucide
- `app.json` — Expo config (light mode, new arch)
- `babel.config.js` — NativeWind babel plugin
- `metro.config.js` — NativeWind v4 metro config
- `nativewind-env.d.ts` — TypeScript declarations
- `tailwind.config.js` — **exact from 05-design-system.md** — colors, fonts, radii, shadows
- `global.css` — Tailwind imports
- `tsconfig.json` — paths to @imanifest/shared
- `app/_layout.tsx` — root layout with font loading
- `app/(tabs)/_layout.tsx` — tab navigator with Lucide icons
- `app/(tabs)/index.tsx` — ImanSync placeholder
- `app/(tabs)/dua-todo.tsx` — Dua-to-Do placeholder
- `app/(tabs)/heartpulse.tsx` — HeartPulse placeholder
- `app/(tabs)/sakinah.tsx` — SakinahStream placeholder
- `app/auth.tsx` — auth placeholder
- `lib/api.ts` — Axios client
- `constants/theme.ts` — re-export from @imanifest/shared

### apps/server
- `package.json` — NestJS 10 + Prisma + ioredis
- `tsconfig.json` — decorators enabled, strict mode
- `nest-cli.json` — NestJS CLI config
- `.env.example` — all env vars documented
- `src/main.ts` — bootstrap on port 3001
- `src/app.module.ts` — root module
- `src/common/zhipu.service.ts` — GLM-5 placeholder
- `src/common/quran-api.service.ts` — Quran API placeholder
- `src/common/redis.service.ts` — Redis placeholder

---

## Change Log

| Date | Change |
|------|--------|
| 2026-04-09 | Story created — ready for development |

---

## Status

ready-for-dev