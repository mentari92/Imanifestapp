# ImanifestApp — AI-Powered Spiritual Productivity Platform

> Turn your intention into action. ImanifestApp combines Islamic spirituality with modern productivity through AI-powered Quranic verse matching, spiritual task management, and reflective journaling.

## Monorepo Structure

```
imanifestapp/
├── apps/
│   ├── mobile-web/     # Expo (React Native + Web) — Expo Router + NativeWind v4
│   └── server/         # NestJS API — TypeScript strict
├── packages/
│   ├── shared/         # Shared types, validators (Zod), theme tokens
│   └── database/       # Prisma ORM + PostgreSQL
├── turbo.json          # Turborepo pipeline config
├── pnpm-workspace.yaml # Workspace definitions
└── package.json        # Root scripts
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **PostgreSQL** 15+ running locally
- **Redis** (for rate limiting — optional during initial setup)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables
cp apps/server/.env.example apps/server/.env
# Edit apps/server/.env with your DATABASE_URL and API keys

# 3. Set up database
cd packages/database
pnpm db:migrate
cd ../..

# 4. Start development
pnpm dev
```

This starts:
- **Expo** on `http://localhost:8081` (mobile) / `http://localhost:19006` (web)
- **NestJS** on `http://localhost:3001`

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` | TypeScript type-check all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |

## Design System

- **Primary:** Forest Green `#064E3B`
- **Accent:** Rosewood `#54161B`
- **Highlight:** Champagne Gold `#E3C567`
- **Background:** Off-White `#F8FAFC`
- **Fonts:** Playfair Display, Lora, Amiri, JetBrains Mono
- **Icons:** Lucide (`lucide-react-native`)

Full design spec → `Brain/05-design-system.md`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo SDK 55, Expo Router, NativeWind v4 |
| Backend | NestJS 10, TypeScript strict |
| Database | PostgreSQL 15+, Prisma 6 |
| AI | Zhipu GLM-5 (BigModel) |
| Audio | expo-audio |
| Icons | Lucide React Native |
| Package Manager | pnpm 9.15 + Turborepo |

## Documentation

All project docs are in `Brain/`:
- `01-project-brief.md` — Product vision
- `02-prd.md` — Product Requirements Document
- `03-architecture.md` — Technical architecture
- `04-epics-and-stories.md` — Sprint backlog
- `05-design-system.md` — Design tokens & components