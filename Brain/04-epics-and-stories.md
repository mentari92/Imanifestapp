# Epics & Stories
# ImanifestApp – AI-Powered Spiritual Productivity Platform

**Version:** 1.0  
**Status:** Final — Ready for Development

---

## Epic Overview

| Epic | Name | Stories | Priority | Status |
|------|------|---------|----------|--------|
| Epic 1 | Foundation & Auth | 1.1 – 1.3 | Must Have | ☐ Pending |
| Epic 2 | ImanSync — AI Validation Engine | 2.1 – 2.3 | Must Have | ☐ Pending |
| Epic 3 | Dua-to-Do — Actionable Roadmap | 3.1 – 3.2 | Must Have | ☐ Pending |
| Epic 4 | HeartPulse — Voice Journaling | 4.1 – 4.3 | Must Have | ☐ Pending |
| Epic 5 | SakinahStream — Audio Experience | 5.1 – 5.2 | Must Have | ☐ Pending |
| Epic 6 | Dashboard & History | 6.1 | Should Have | ☐ Pending |

**Build order:** Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 → Epic 6

---

## Epic 1: Foundation & Auth

### Story 1.1: Turborepo + Monorepo Setup

**As a** developer  
**I want to** have the full monorepo scaffold ready  
**So that** I can build features without infrastructure friction

**Acceptance Criteria:**
- [ ] Turborepo initialized with pnpm workspaces
- [ ] `apps/mobile-web` — Expo app with Expo Router + NativeWind v4 configured
- [ ] `apps/server` — NestJS app with TypeScript strict mode
- [ ] `packages/database` — Prisma + PostgreSQL configured
- [ ] `packages/shared` — shared types, validators, and theme tokens
- [ ] `turbo.json` with `dev`, `build`, `lint` pipelines (see 03-architecture.md Section 2.1)
- [ ] `pnpm dev` starts both Expo and NestJS simultaneously
- [ ] `.env.example` documents all required variables
- [ ] README with setup instructions

**Design System Integration (from 05-design-system.md):**
- [ ] `tailwind.config.js` in `apps/mobile-web` — copy exactly from 05-design-system.md Section 4
- [ ] `packages/shared/src/theme.ts` — copy shared theme object from 05-design-system.md Section 4
- [ ] `babel.config.js`, `metro.config.js`, `nativewind-env.d.ts` — see 03-architecture.md Section 2.4
- [ ] `app.json` — Expo config as per 03-architecture.md Section 2.3
- [ ] Font packages installed: `@expo-google-fonts/playfair-display`, `lora`, `amiri`, `jetbrains-mono`
- [ ] `lucide-react-native` installed for icons (see 05-design-system.md Section 8)
- [ ] Color palette uses Forest Green primary (#064E3B), Rosewood accent (#54161B), Champagne Gold highlight (#E3C567) — NOT purple/pink

**Dependency versions** — see 03-architecture.md Section 2.2 (LOCKED)

---

### Story 1.2: Database Schema & Migration

**As a** developer  
**I want to** have all database tables created and migrated  
**So that** feature development can write to the DB immediately

**Acceptance Criteria:**
- [ ] `schema.prisma` created with all 4 tables: `User`, `Manifestation`, `Task`, `Reflection`
- [ ] All fields match architecture doc Section 3
- [ ] `prisma migrate dev` runs without errors
- [ ] `packages/database/src/index.ts` exports `prisma` singleton
- [ ] Server `app.module.ts` imports `DatabaseModule`
- [ ] Indexes created: `Manifestation.userId`, `Task.manifestationId`, `Reflection.userId`

---

### Story 1.3: Authentication

**As a** visitor  
**I want to** log in with my Quran.com account  
**So that** my spiritual data syncs with my existing Quran.com profile

**Acceptance Criteria:**
- [ ] OAuth2 flow configured with Quran.com as provider (via Supabase Auth or Clerk)
- [ ] On successful registration: `User` created in DB with bcrypt-hashed `password`
- [ ] JWT token returned to Expo app, stored in SecureStore
- [ ] `AuthGuard` on NestJS protects all routes except `/sakinah/*`
- [ ] Login screen in Expo app with "Login with Quran.com" button
- [ ] Fallback: email/password auth if OAuth2 not available
- [ ] Logout clears token from SecureStore and invalidates session

---

## Epic 2: ImanSync — AI Validation Engine

### Story 2.1: ImanSync Text Analysis

**As a** logged-in user  
**I want to** type my intention and receive 3 relevant Quranic verses  
**So that** I can see how my goal is grounded in the Quran

**Acceptance Criteria:**
- [ ] `IntentionForm.tsx` renders text area (max 500 chars) with submit button
- [ ] `POST /iman-sync/analyze` endpoint live on NestJS
- [ ] GLM-5 extracts 3 spiritual themes from intent text
- [ ] Quran Foundation Content API queried for 3 matching verses
- [ ] Tafsir snippet fetched for each verse (max 300 chars)
- [ ] GLM-5 generates 2-sentence validation summary
- [ ] Result saved to `Manifestation` table
- [ ] Response returned to Expo app within 8 seconds
- [ ] `ImanSyncResult.tsx` renders 3 `VerseCard` components + summary
- [ ] Each `VerseCard` shows: Arabic text, translation, tafsir snippet

---

### Story 2.2: ImanSync Vision (Image Upload)

**As a** logged-in user  
**I want to** upload an image alongside my intention  
**So that** I get Quranic verses relevant to both what I'm visualizing and what I'm writing

**Acceptance Criteria:**
- [ ] `IntentionForm.tsx` includes optional image picker (Expo ImagePicker)
- [ ] Image preview shown before submission
- [ ] `POST /iman-sync/analyze-vision` endpoint accepts multipart/form-data
- [ ] File validated: JPG/PNG only, max 5MB
- [ ] GLM-5V receives image (base64) + intentText in one call
- [ ] Returns same structure as Story 2.1 (3 verses + summary)
- [ ] `imagePath` saved to `Manifestation` table
- [ ] Response within 12 seconds
- [ ] Error shown if file too large or wrong type

---

### Story 2.3: ImanSync Rate Limiting & Caching

**As a** developer  
**I want to** cache ImanSync results and rate-limit requests  
**So that** Zhipu AI and Quran API costs are controlled

**Acceptance Criteria:**
- [ ] Redis cache: same intentText hash → return cached result (TTL 1 hour)
- [ ] Rate limit: max 10 text requests per user per hour
- [ ] Rate limit: max 5 vision requests per user per hour
- [ ] Quran API responses (search + tafsir) cached in Redis
- [ ] 429 response with user-friendly message when limit exceeded
- [ ] Cache hit returns result in < 200ms

---

## Epic 3: Dua-to-Do — Actionable Roadmap

### Story 3.1: Checklist Generation

**As a** logged-in user  
**I want to** get a 5-step action plan from my ImanSync result  
**So that** I have concrete steps to act on my intention

**Acceptance Criteria:**
- [ ] "Generate Action Plan" button on ImanSync result screen
- [ ] `POST /dua-to-do/generate` accepts `{ manifestationId }`
- [ ] Loads manifestation + verses from DB
- [ ] GLM-5 generates 5 Ikhtiar steps as JSON
- [ ] Steps saved to `Task` table linked to manifestation
- [ ] Steps POSTed to Quran Foundation User API (Goals)
- [ ] `quranGoalId` stored on each `Task` row
- [ ] `TaskChecklist.tsx` renders 5 `TaskItem` rows
- [ ] Response within 6 seconds

---

### Story 3.2: Task Completion Tracking

**As a** logged-in user  
**I want to** check off completed tasks  
**So that** I can track my progress toward my intention

**Acceptance Criteria:**
- [ ] Each `TaskItem` has a checkbox
- [ ] `PATCH /dua-to-do/tasks/:taskId` updates `isCompleted` in DB
- [ ] Completed tasks visually distinct (strikethrough or different color)
- [ ] Task completion % shown on manifestation card in dashboard
- [ ] Optimistic UI update on checkbox tap (no loading spinner)

---

## Epic 4: HeartPulse — Voice Journaling & Retention

### Story 4.1: Voice Recording & Transcription

**As a** logged-in user  
**I want to** record a voice reflection  
**So that** I can journal naturally without typing

**Acceptance Criteria:**
- [ ] `VoiceRecorder.tsx` uses Expo Audio API
- [ ] Record button starts/stops recording (max 2 minutes)
- [ ] Recording duration shown in real time
- [ ] Audio file sent to `POST /heart-pulse/reflect` as multipart/form-data
- [ ] GLM-5 processes audio → transcript text
- [ ] Transcript shown to user before sentiment result
- [ ] `Reflection.audioPath` and `Reflection.transcriptText` saved to DB

---

### Story 4.2: Sentiment Analysis Display

**As a** logged-in user  
**I want to** see the sentiment of my reflection  
**So that** I can notice patterns in my spiritual state

**Acceptance Criteria:**
- [ ] GLM-5 returns sentiment label + score for every reflection
- [ ] `SentimentBadge.tsx` displays label with color (per 05-design-system.md Section 6):
  - hopeful/grateful/peaceful/content → Forest Green / Champagne Gold (positive)
  - anxious/struggling → Rosewood / Deep Rose (negative)
- [ ] Score shown as subtle percentage or bar
- [ ] Reflection saved to DB regardless of sentiment result

---

### Story 4.3: Streak Tracking & Text Fallback

**As a** logged-in user  
**I want to** maintain a daily reflection streak  
**So that** I stay consistent in my spiritual practice

**Acceptance Criteria:**
- [ ] Text input field available as alternative to voice recording
- [ ] Both paths (voice + text) trigger same sentiment analysis flow
- [ ] Reflection POST sent to Quran Foundation User API (Streak Tracking + Post a Reflection)
- [ ] `StreakCard.tsx` displays current streak count
- [ ] Streak count fetched from Quran Foundation User API on dashboard load
- [ ] If Quran Foundation API unavailable: streak tracked locally in DB (fallback)

---

## Epic 5: SakinahStream — Audio Experience

### Story 5.1: Reciter & Surah Browser

**As a** visitor (no login required)  
**I want to** browse available reciters and surahs  
**So that** I can find the recitation style I prefer

**Acceptance Criteria:**
- [ ] `GET /sakinah/reciters` returns list from Quran Foundation Audio API
- [ ] `ReciterList.tsx` renders reciter options
- [ ] `SurahList.tsx` renders 114 surahs
- [ ] Selecting a reciter + surah loads audio
- [ ] Reciter list cached in Redis (TTL 24 hours)
- [ ] Screen accessible without login (no AuthGuard on `/sakinah/*`)

---

### Story 5.2: Audio Player

**As a** visitor  
**I want to** play, pause, and seek through a Quran recitation  
**So that** I can listen at my own pace in a distraction-free UI

**Acceptance Criteria:**
- [ ] `AudioPlayer.tsx` uses Expo Audio API for streaming
- [ ] Play / Pause / Seek controls functional
- [ ] Progress bar shows playback position
- [ ] Audio continues playing if user navigates to another tab
- [ ] Default state: loads a curated surah (Al-Fatiha with a popular reciter)
- [ ] Loading state shown while audio buffering
- [ ] Error state if audio URL fails to load

---

## Epic 6: Dashboard & History

### Story 6.1: User Dashboard Overview

**As a** logged-in user  
**I want to** see an overview of my spiritual activity  
**So that** I can track my progress at a glance

**Acceptance Criteria:**
- [ ] `dashboard.tsx` loads data for current user
- [ ] Stats shown: total manifestations, tasks completed, current streak
- [ ] 7-day sentiment chart rendered (bar or line chart)
- [ ] Manifestation history list: title (first 50 chars of intentText), date, task completion %
- [ ] Each manifestation card is tappable → navigates to `/manifestation/[id]`
- [ ] Quick action buttons: "New Intention", "New Reflection", "Open SakinahStream"
- [ ] Empty state shown if user has no data yet

---

## Build Order Checklist

```
Epic 1: Foundation
☐ Story 1.1 — Turborepo + monorepo scaffold
☐ Story 1.2 — DB schema + Prisma migration
☐ Story 1.3 — Auth (OAuth2 Quran.com + JWT guard)

Epic 2: ImanSync
☐ Story 2.1 — Text analysis (GLM-5 + Quran API + DB)
☐ Story 2.2 — Vision analysis (GLM-5V multimodal)
☐ Story 2.3 — Rate limiting + caching

Epic 3: Dua-to-Do
☐ Story 3.1 — Checklist generation (GLM-5 + Quran Goals API)
☐ Story 3.2 — Task completion tracking

Epic 4: HeartPulse
☐ Story 4.1 — Voice recording + transcription
☐ Story 4.2 — Sentiment analysis display
☐ Story 4.3 — Streak tracking + text fallback

Epic 5: SakinahStream
☐ Story 5.1 — Reciter + surah browser
☐ Story 5.2 — Audio player

Epic 6: Dashboard
☐ Story 6.1 — Dashboard overview
```
