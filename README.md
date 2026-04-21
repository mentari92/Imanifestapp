# ImanifestApp

Mobile-first Islamic companion app for intention setting, reflection, Quran listening, and habit building.

## Features

- **Imanifest** — State your intention and receive matching Quranic verses with AI-generated guidance
- **Qalb** — Voice or text journaling with AI sentiment reflection and multilingual response
- **Tafakkur** — Full Quran reciter player with surah auto-continue and verse-level audio
- **Dua To-Do** — Auto-generated spiritual tasks from your manifestation, with completion tracking
- **Dashboard** — Daily Iman Sync streak tracking and spiritual health overview

## Demo

[https://imanifestapp.com](https://imanifestapp.com)

## Monorepo Structure

```
imanifestapp/
├── apps/
│   ├── mobile-web/     # Expo (React Native + Web) — Expo Router + NativeWind v4
│   └── server/         # NestJS API — TypeScript strict
├── packages/
│   ├── shared/         # Shared types and utilities
│   └── database/       # Prisma ORM + PostgreSQL
├── turbo.json          # Turborepo pipeline config
├── pnpm-workspace.yaml # Workspace definitions
└── package.json        # Root scripts
```

## Prerequisites

- **Node.js** >= 18
- **pnpm** 9.x (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- **PostgreSQL** 15+ running locally
- **Redis** (for JWT blacklist + rate limiting)

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

## Environment Variables

Keep secrets only in local .env files and deployment secret managers. Never commit .env files to git.

Minimum required to run backend:

```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/imanifest"
JWT_SECRET="your_jwt_secret"
REDIS_URL="redis://localhost:6379"
```

Optional but required for AI responses:

### AI (apps/server/.env)
```bash
OPENROUTER_API_KEY="your_openrouter_key"   # Primary AI provider
ZHIPU_API_KEY="your_zhipu_key"             # Fallback AI provider
```

Optional but required for Tafakkur backend audio proxy:

### Quran Audio (apps/server/.env)
```bash
QURAN_FOUNDATION_CONTENT_API_URL="https://apis.quran.foundation/content/api/v4"
QURAN_FOUNDATION_CLIENT_ID="your_client_id"
QURAN_FOUNDATION_AUTH_TOKEN="your_auth_token"
QURAN_FOUNDATION_AUDIO_BASE_URL="https://audio.qurancdn.com"
```

You can verify backend status at `GET /api/health` and Quran integration at `GET /api/tafakkur/foundation-health`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages/apps |
| `pnpm lint` | TypeScript type-check all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:migrate` | Run Prisma migrations |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo SDK 55, Expo Router, NativeWind v4 |
| Backend | NestJS 10, TypeScript strict |
| Database | PostgreSQL 15+, Prisma 6 |
| Auth | JWT + bcrypt + Redis token blacklist |
| AI | OpenRouter (primary), Zhipu GLM-4 (fallback) |
| Audio | Expo AV + Quran Foundation API |
| Icons | Lucide React Native |
| Package Manager | pnpm 9.15 + Turborepo |

## Documentation

Project docs are in `Brain/`:
- `01-project-brief.md` — Product vision
- `02-prd.md` — Product Requirements Document
- `03-architecture.md` — Technical architecture
- `04-epics-and-stories.md` — Sprint backlog