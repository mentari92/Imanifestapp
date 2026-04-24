# Architecture Document
# ImanifestApp – AI-Powered Spiritual Productivity Platform

**Version:** 1.0  
**Status:** Final — Ready for Development

---

## 1. System Overview & Platform Targets

### Platform Targets

| Platform | Build Command | Output | Notes |
|----------|--------------|--------|-------|
| **iOS** | `npx expo run:ios` | Native iOS app | Requires Xcode + macOS. iOS 14+ |
| **Android** | `npx expo run:android` | Native Android app | Requires Android Studio. Android 10+ |
| **Web** | `npx expo export --platform web` | Static web (`dist/`) | Deploy to any static host. Chrome/Safari |

> **One codebase, three platforms.** Expo (React Native) compiles to native iOS/Android and exports static web — no separate frontend repos needed.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (apps/mobile-web)                │
│              Expo + React Native + Expo Router + NativeWind  │
│                                                             │
│   ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐ │
│   │  iOS App │  │Android   │  │  Web App (static export)  │ │
│   │  (.app)  │  │  (.apk)  │  │  (HTML/CSS/JS bundle)    │ │
│   └────┬─────┘  └────┬─────┘  └────────────┬─────────────┘ │
│        └──────────────┼─────────────────────┘               │
│                       │ Axios HTTP                           │
└───────────────────────┼─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (apps/server)                     │
│                    NestJS REST API (port 3001)               │
│                                                             │
│   ┌──────────────┐  ┌──────────┐  ┌──────────────────────┐ │
│   │ Auth Guard   │  │ Rate     │  │ Feature Modules:     │ │
│   │ (JWT)        │  │ Limiter  │  │ Imanifest, DuaToDo,   │ │
│   │              │  │ (Redis)  │  │ Qalb, Tafakkur  │ │
│   └──────────────┘  └──────────┘  └──────────────────────┘ │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │
          ┌─────────────┼─────────────┬──────────────┐
          ▼             ▼             ▼              ▼
   ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
   │ PostgreSQL │ │  Redis   │ │ Zhipu AI │ │    Quran     │
   │ 16 + Prisma│ │  Cache   │ │GLM-5/5V  │ │  Foundation  │
   │ packages/  │ │          │ │          │ │  APIs        │
   │  database  │ │          │ │          │ │ Content+User │
   │            │ │          │ │          │ │ +Audio       │
   └────────────┘ └──────────┘ └──────────┘ └──────────────┘

Data Flows:
1. Imanifest (text):  Form → NestJS → GLM-5 → Quran Content API → DB → Response
2. Imanifest (image): Form + File → NestJS → GLM-5V multimodal → Quran Content API → DB
3. Dua-to-Do:        ManifestationId → NestJS → GLM-5 → Quran User API (Goals) → DB
4. Qalb:       Audio/Text → NestJS → GLM-5 STT + Sentiment → Quran User API → DB
5. Tafakkur:    Client → NestJS proxy → Quran Audio API → Audio stream
```

### Tech Stack by Layer

| Layer | Technology | Workspace | Runs On |
|-------|-----------|-----------|---------|
| **Frontend (Mobile + Web)** | Expo SDK 52 + React Native + Expo Router + NativeWind v4 | `apps/mobile-web` | iOS, Android, Web browser |
| **Backend (API Server)** | NestJS 10 + TypeScript strict | `apps/server` | VPS / Railway (Node.js) |
| **Database** | PostgreSQL 16 + Prisma 6 | `packages/database` | VPS / Railway |
| **Cache** | Redis via ioredis | `apps/server` (common/) | VPS / Railway |
| **AI Engine** | Zhipu AI GLM-5 / GLM-5V | `apps/server` (common/) | External API |
| **Shared Code** | TypeScript types + Zod validators + Theme tokens | `packages/shared` | Used by both frontend & backend |

---

## 2. Folder Structure

```
imanifestapp/
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
│
├── apps/
│   │
│   ├── mobile-web/                          # Expo (iOS + Android + Web)
│   │   ├── app/
│   │   │   ├── (tabs)/
│   │   │   │   ├── index.tsx                # Imanifest screen
│   │   │   │   ├── dua-to-do.tsx            # Dua-to-Do screen
│   │   │   │   ├── qalb.tsx          # Qalb screen
│   │   │   │   └── tafakkur.tsx              # Tafakkur screen
│   │   │   ├── manifestation/
│   │   │   │   └── [id].tsx                 # Manifestation detail + task list
│   │   │   ├── dashboard.tsx                # User dashboard overview
│   │   │   ├── _layout.tsx                  # Root layout + tab navigator
│   │   │   └── auth.tsx                     # Login screen
│   │   ├── components/
│   │   │   ├── imanifest/
│   │   │   │   ├── IntentionForm.tsx         # Text + image upload form
│   │   │   │   ├── VerseCard.tsx             # Displays one Quranic verse
│   │   │   │   └── ImanifestResult.tsx        # 3 verses + AI summary
│   │   │   ├── dua-to-do/
│   │   │   │   ├── TaskChecklist.tsx         # 5-step checklist
│   │   │   │   └── TaskItem.tsx              # Single task row
│   │   │   ├── qalb/
│   │   │   │   ├── VoiceRecorder.tsx         # Audio recording UI
│   │   │   │   ├── SentimentBadge.tsx        # Sentiment label + score
│   │   │   │   └── StreakCard.tsx            # Streak count display
│   │   │   ├── tafakkur/
│   │   │   │   ├── AudioPlayer.tsx           # Play/pause/seek player
│   │   │   │   ├── ReciterList.tsx           # Reciter selector
│   │   │   │   └── SurahList.tsx             # Surah selector
│   │   │   └── shared/
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── ErrorMessage.tsx
│   │   ├── hooks/
│   │   │   ├── useImanifest.ts               # Imanifest API calls + state
│   │   │   ├── useDuaToDo.ts                # Task generation + update
│   │   │   ├── useQalb.ts             # Voice + sentiment calls
│   │   │   └── useTafakkur.ts                # Audio API calls
│   │   ├── lib/
│   │   │   └── api.ts                       # Axios client (points to NestJS)
│   │   ├── constants/
│   │   │   └── theme.ts                     # Re-exports from @imanifest/shared/theme
│   │   ├── babel.config.js                  # NativeWind babel plugin
│   │   ├── metro.config.js                  # NativeWind v4 metro config
│   │   ├── nativewind-env.d.ts              # TypeScript declarations for NativeWind
│   │   ├── tailwind.config.js               # Full config from 05-design-system.md Section 4
│   │   ├── app.json                         # Expo config (see Section 2.3)
│   │   └── tsconfig.json
│   │
│   └── server/                              # NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   │
│       │   ├── imanifest/
│       │   │   ├── imanifest.module.ts
│       │   │   ├── imanifest.controller.ts  # POST /imanifest/analyze
│       │   │   ├── imanifest.service.ts     # GLM-5 → Quran API → DB
│       │   │   └── dto/
│       │   │       └── analyze.dto.ts
│       │   │
│       │   ├── dua-to-do/
│       │   │   ├── dua-to-do.module.ts
│       │   │   ├── dua-to-do.controller.ts  # POST /dua-to-do/generate
│       │   │   ├── dua-to-do.service.ts     # GLM-5 → Quran Goals API → DB
│       │   │   └── dto/
│       │   │       └── generate.dto.ts
│       │   │
│       │   ├── qalb/
│       │   │   ├── qalb.module.ts
│       │   │   ├── qalb.controller.ts # POST /qalb/reflect
│       │   │   ├── qalb.service.ts    # GLM-5 STT + Sentiment → Quran API
│       │   │   └── dto/
│       │   │       └── reflect.dto.ts
│       │   │
│       │   ├── tafakkur/
│       │   │   ├── tafakkur.module.ts
│       │   │   ├── tafakkur.controller.ts    # GET /tafakkur/reciters, /tafakkur/audio
│       │   │   └── tafakkur.service.ts       # Proxies Quran Audio API
│       │   │
│       │   ├── auth/
│       │   │   ├── auth.module.ts
│       │   │   ├── auth.guard.ts            # JWT guard for all protected routes
│       │   │   └── auth.service.ts          # Email/password JWT + Quran OAuth bridge
│       │   │
│       │   └── common/
│       │       ├── zhipu.service.ts         # Shared GLM-5 / GLM-5V client
│       │       ├── quran-api.service.ts     # Shared Quran Foundation API client
│       │       └── redis.service.ts         # Shared Redis cache helpers
│       │
│       ├── .env
│       └── tsconfig.json
│
└── packages/
    ├── database/
    │   ├── prisma/
    │   │   └── schema.prisma
    │   ├── src/
    │   │   └── index.ts                     # export { PrismaClient, prisma }
    │   └── package.json
    │
    └── shared/
        ├── src/
        │   ├── types.ts                     # Shared TS interfaces
        │   ├── validators.ts                # Zod schemas shared between apps
        │   ├── theme.ts                     # Color tokens, radii, spacing (see 05-design-system.md)
        │   └── index.ts
        └── package.json
```

---

## 2.1 Turborepo Configuration

### turbo.json
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "tasks": {
    "dev": {
      "cache": false,
      "persistent": true,
      "filter": ["./apps/*"]
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "lint": {
      "outputs": []
    },
    "db:generate": {
      "cache": false,
      "filter": ["./packages/database"]
    },
    "db:migrate": {
      "cache": false,
      "filter": ["./packages/database"]
    }
  }
}
```

### pnpm-workspace.yaml
```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Root package.json (key scripts)
```json
{
  "name": "imanifestapp",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "db:generate": "turbo db:generate",
    "db:migrate": "turbo db:migrate"
  },
  "devDependencies": {
    "turbo": "^2.3.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

---

## 2.2 Key Dependencies (LOCKED)

### Frontend — `apps/mobile-web` (Expo: iOS + Android + Web)

| Package | Version | Notes |
|---------|---------|-------|
| `expo` | ~52.x | Expo SDK 52 — one codebase for iOS, Android, Web |
| `expo-router` | ~4.x | File-based routing (works on all 3 platforms) |
| `nativewind` | ^4.1.x | Tailwind CSS for React Native (all platforms) |
| `tailwindcss` | ^3.4.x | Style engine |
| `react` | ^18.3.x | React |
| `react-native` | ^0.76.x | RN runtime (iOS + Android native, Web via export) |
| `axios` | ^1.7.x | HTTP client to NestJS backend |
| `lucide-react-native` | ^0.460.x | Icon library (consistent across all platforms) |
| `@expo-google-fonts/playfair-display` | ^0.2.x | Display/heading font |
| `@expo-google-fonts/lora` | ^0.2.x | Body text font |
| `@expo-google-fonts/amiri` | ^0.2.x | Quranic Arabic font |
| `@expo-google-fonts/jetbrains-mono` | ^0.2.x | Verse keys, metadata font |
| `expo-font` | ~52.x | Font loading |
| `expo-audio` | ~52.x | Voice recording — Qalb feature |
| `expo-image-picker` | ~52.x | Image upload — Imanifest Vision feature |
| `expo-secure-store` | ~52.x | JWT token storage (native secure storage) |

### Backend — `apps/server` (NestJS REST API)

| Package | Version | Notes |
|---------|---------|-------|
| `@nestjs/core` | ^10.4.x | NestJS framework |
| `@nestjs/common` | ^10.4.x | NestJS common utilities |
| `@nestjs/platform-express` | ^10.4.x | HTTP adapter |
| `class-validator` | ^0.14.x | DTO input validation |
| `class-transformer` | ^0.5.x | DTO transformation |
| `ioredis` | ^5.4.x | Redis client — caching + rate limiting |
| `zhipuai` | ^3.x | Zhipu AI SDK — GLM-5 & GLM-5V calls |

### Shared — `packages/database` + `packages/shared`

| Package | Version | Workspace | Notes |
|---------|---------|-----------|-------|
| `@prisma/client` | ^6.2.x | database | Prisma runtime client |
| `prisma` | ^6.2.x | database | Prisma CLI (devDep) — migrations & generate |
| `zod` | ^3.24.x | shared | Schema validation (used by both frontend & backend) |
| `typescript` | ^5.7.x | root | Strict mode everywhere |

---

## 2.3 Expo App Configuration (app.json)

```json
{
  "expo": {
    "name": "ImanifestApp",
    "slug": "imanifestapp",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "imanifestapp",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.imanifestapp",
      "infoPlist": {
        "NSMicrophoneUsageDescription": "ImanifestApp needs microphone access for voice journaling."
      }
    },
    "android": {
      "adaptiveIcon": {},
      "package": "com.imanifestapp",
      "permissions": ["RECORD_AUDIO"]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-router",
      "expo-secure-store"
    ]
  }
}
```

---

## 2.4 NativeWind Configuration

### apps/mobile-web/babel.config.js
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: ["nativewind/babel"],
  };
};
```

### apps/mobile-web/metro.config.js
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./tailwind.config.js" });
```

### apps/mobile-web/nativewind-env.d.ts
```ts
/// <reference types="nativewind/types" />
```

> **Full `tailwind.config.js` content is in `05-design-system.md` Section 4.** Copy it exactly — do not modify color values or font families.

---

## 3. Database Schema (Prisma)

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id             String          @id @default(cuid())
  email          String          @unique
  name           String?
  password       String?         // bcrypt hashed password for email/password auth
  quranApiKey    String?         // Quran Foundation Content API key (per-user, optional)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt

  manifestations Manifestation[]
  reflections    Reflection[]
}

model Manifestation {
  id         String   @id @default(cuid())
  userId     String
  intentText String
  imagePath  String?
  verses     Json?    // stores the 3 returned Quranic verses + tafsir
  aiSummary  String?  // 2-sentence GLM-5 validation summary
  createdAt  DateTime @default(now())

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  tasks Task[]

  @@index([userId])
}

model Task {
  id               String        @id @default(cuid())
  manifestationId  String
  description      String
  isCompleted      Boolean       @default(false)
  quranGoalId      String?       // ID returned from Quran Foundation Goals API
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  manifestation Manifestation @relation(fields: [manifestationId], references: [id], onDelete: Cascade)

  @@index([manifestationId])
}

model Reflection {
  id             String   @id @default(cuid())
  userId         String
  audioPath      String?  // path to audio file if voice input
  transcriptText String?  // GLM-5 STT output or direct text input
  sentiment      String?  // e.g. "hopeful", "anxious", "grateful"
  sentimentScore Float?   // 0.0–1.0 polarity score
  streakDate     DateTime @default(now())
  createdAt      DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

---

## 4. API Design (NestJS Controllers)

### POST `/imanifest/analyze`
**Auth:** Required  
**Body:** `{ intentText: string, userId: string }`

Server logic:
1. Extract spiritual themes with GLM-5 → JSON array of keywords
2. Query Quran Foundation Content API: `/search?q={themes}&size=3`
3. For each result: fetch tafsir from `/tafsirs/en-tafisr-ibn-kathir/by_ayah/{verse_key}`
4. Generate 2-sentence summary with GLM-5
5. Save to `Manifestation` table
6. Return: `{ manifestationId, verses, aiSummary }`

### POST `/imanifest/analyze-vision`
**Auth:** Required  
**Body:** multipart/form-data — `intentText: string` + `image: File`

Server logic:
1. Validate file type (JPG/PNG) and size (max 5MB)
2. Convert image to base64
3. Call GLM-5V with image + intentText → extract spiritual themes
4. Same steps 2–6 as text endpoint

### POST `/dua-to-do/generate`
**Auth:** Required  
**Body:** `{ manifestationId: string }`

Server logic:
1. Load manifestation + verses from DB
2. Call GLM-5 with verses context → generate 5-step Ikhtiar checklist as JSON
3. Save each step to `Task` table
4. POST each step to Quran Foundation User API (`/goals`)
5. Return: `{ tasks: Task[] }`

### PATCH `/dua-to-do/tasks/:taskId`
**Auth:** Required  
**Body:** `{ isCompleted: boolean }`

Server logic:
1. Verify task belongs to userId
2. Update `Task.isCompleted` in DB
3. Return updated task

### POST `/qalb/reflect`
**Auth:** Required  
**Body:** multipart/form-data — optional `audio: File` OR `text: string`

Server logic:
1. If audio: convert to base64, call GLM-5 for STT → transcript text
2. Run GLM-5 sentiment analysis on transcript or direct text
3. Save `Reflection` to DB
4. POST to Quran Foundation User API: streak + reflection
5. Return: `{ reflection, sentiment, sentimentScore, streakCount }`

### GET `/tafakkur/reciters`
**Auth:** None  
Proxy to Quran Foundation Audio API → `/resources/recitations`  
Redis cache key: `tafakkur:reciters` TTL: 24 hours

### GET `/tafakkur/audio?recitationId={id}&chapterId={id}`
**Auth:** None  
Proxy to Quran Foundation Audio API → `/quran/recitations/{id}`  
Redis cache key: `tafakkur:audio:{recitationId}:{chapterId}` TTL: 1 hour

---

## 5. Caching Strategy

| Key Pattern | TTL | Content |
|-------------|-----|---------|
| `iman:predict:{userId}:{hash}` | 3600s | Imanifest result for same input |
| `tafakkur:reciters` | 86400s | Reciter list from Quran Audio API |
| `tafakkur:audio:{r}:{c}` | 3600s | Audio chapter response |
| `quran:search:{query}` | 3600s | Quran search results |
| `quran:tafsir:{verseKey}` | 86400s | Tafsir for a specific verse |
| `ratelimit:imanifest:{userId}` | 3600s | Rate limiting counter |

---

## 6. Zhipu AI Prompt Architecture

### Prompt 1: Theme Extraction (text)
```
System: You are an Islamic spiritual guide and Quran scholar.
Extract the 3 most relevant Islamic spiritual themes from the user's intention.
Return ONLY a valid JSON array of English keywords.
Example: ["tawakkul","sabr","shukr"]
Do not include any explanation or extra text.
```

### Prompt 2: Theme Extraction (vision — GLM-5V)
```
User message contains: image + intentText
"Analyze the image and the user's intention. Identify 3 core Islamic spiritual 
themes relevant to both. Return ONLY a JSON array of theme keywords."
```

### Prompt 3: Verse Summary
```
System: You are a warm, knowledgeable Islamic life coach.
Given the user's intention and 3 related Quranic verses, write a 2-sentence spiritual 
validation in English — affirming their intention through the lens of these verses.
Be sincere and specific to the actual verses. Avoid generic phrasing.
```

### Prompt 4: Dua-to-Do Generation
```
System: You are an Islamic productivity coach.
Given a user's intention and 3 Quranic verses, generate a 5-step practical Ikhtiar checklist.
Each step must be concrete and actionable (not spiritual advice only — real tasks).
Return ONLY valid JSON: [{ "step": 1, "description": "..." }, ...]
```

### Prompt 5: Sentiment Analysis
```
System: You are analyzing a Muslim's spiritual journal reflection.
Identify the primary emotion and return a JSON object:
{ "sentiment": "hopeful|grateful|anxious|peaceful|struggling|content|other", "score": 0.0-1.0 }
Score 1.0 = strongly positive spiritual state. 0.0 = strongly distressed.
Return ONLY the JSON. No explanation.
```

---

## 7. Environment Variables

```env
# apps/server/.env

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/imanifestapp

# Zhipu AI
ZHIPU_API_KEY=your_zhipu_api_key

# Quran Foundation API
QURAN_FOUNDATION_API_KEY=your_quran_api_key
QURAN_API_BASE_URL=https://api.quran.com/api/v4

# Auth (self-hosted JWT + Quran OAuth)
JWT_SECRET=your_jwt_secret_min_32_chars
QURAN_FOUNDATION_CLIENT_ID=your_quran_oauth_client_id
QURAN_FOUNDATION_CLIENT_SECRET=your_quran_oauth_client_secret
QURAN_FOUNDATION_OAUTH_BASE_URL=https://oauth2.quran.foundation
QURAN_FOUNDATION_OAUTH_REDIRECT_URI=https://imanifestapp.com/api/auth/oauth/callback
QURAN_FOUNDATION_OAUTH_SUCCESS_REDIRECT=https://imanifestapp.com/auth
QURAN_FOUNDATION_OAUTH_SCOPE=content user
# Optional if provider exposes OpenID-like user profile endpoint
QURAN_FOUNDATION_OAUTH_USERINFO_URL=

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=3001
JWT_SECRET=your_jwt_secret
```

---

## 8. Architecture Decision Records (ADRs)

### ADR-01: Turborepo over separate repos
Reason: Shared types and Prisma client between NestJS server and Expo app. Single `pnpm install`. Single CI pipeline for hackathon speed.

### ADR-02: NestJS over Next.js API routes
Reason: Feature modules (Imanifest, DuaToDo, Qalb, Tafakkur) map cleanly to NestJS modules. Guards, interceptors, and pipes are better supported for a structured backend. The Expo app needs a dedicated REST API, not Next.js server components.

### ADR-03: Expo over React Native CLI
Reason: Web export in one command (`npx expo export --platform web`). Expo Router gives file-based routing identical to Next.js. NativeWind (Tailwind) works natively. Faster hackathon setup.

### ADR-04: GLM-5 over GPT-4o for Islamic context
Reason: Zhipu AI is the mandated provider for the hackathon. GLM-5V handles multimodal (image + text) for the vision feature. Both share the same `zhipuai` SDK.

### ADR-05: Quran Foundation API as data layer
Reason: The hackathon specifically integrates Quran Foundation APIs. Using it for both content (tafsir, translation, search) and user data (goals, streaks, reflections) keeps data in sync with the user's existing Quran.com account.

### ADR-06: Redis for Quran API caching
Reason: Quran Foundation API has rate limits. Tafsir and audio data are static — safe to cache for 24 hours. Imanifest results for the same input cached for 1 hour to reduce GLM-5 costs.

### ADR-07: Self-hosted NestJS JWT + Quran OAuth 2.0 bridge
Reason: App runs on VPS Contabo (self-hosted), so app sessions stay on NestJS JWT. To comply with hackathon user-API requirements, login also supports Quran OAuth 2.0 Authorization Code flow: backend creates auth URL, validates state, exchanges code server-side, stores provider token in `quranApiKey`, and returns a local JWT session to the client.

### ADR-08: PostgreSQL over MongoDB
Reason: Relational structure — User → Manifestation → Task, User → Reflection. Prisma ORM is already in the team's standard stack. ACID compliance for task completion state.

### ADR-09: Bazi color system — Forest Green primary
Reason: Founder's Bazi profile has strong Water energy. Wood absorbs excess Water — Forest Green (#064E3B) channels Water constructively and also aligns with Islamic green tradition. Rosewood (#54161B, Fire) balances cold Water with warmth. Champagne Gold (#E3C567, Metal) resonates with Monkey Shio. Bright emerald/green (#10B981 range) is excluded — clashes with the deep Forest Green brand. Full specification in `05-design-system.md`.

### ADR-10: No paywall in hackathon MVP
Reason: Maximizes demo impact. All features accessible after OAuth2 login. Tafakkur accessible without any login. Monetization strategy documented separately in project brief for post-hackathon planning.
