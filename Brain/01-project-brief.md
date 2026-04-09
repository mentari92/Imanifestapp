# Project Brief: ImanifestApp – AI-Powered Spiritual Productivity Platform

**Version:** 1.0  
**Status:** Final — Ready for Development  
**Stack:** Turborepo + Expo (mobile-web) + NestJS + PostgreSQL + Zhipu GLM-5 + Quran Foundation API

---

## Problem Statement

Muslims who want to align their daily goals and intentions with their faith have no structured tool to do so. Existing productivity apps are entirely secular. Existing Islamic apps are devotional-only — they don't help users translate spiritual intentions into actionable steps.

The result: people make duas without follow-through, set goals without grounding them in Quranic guidance, and have no way to track the connection between their spiritual state and their daily actions.

---

## Solution

A spiritual productivity platform with 4 core features:

### Feature 1: ImanSync — AI Validation Engine ($0 — core free feature)
- User types an intention (niyyah) or uploads an image
- GLM-5 analyzes the context and intent
- Queries Quran Foundation Content API for 3 relevant Quranic verses with tafsir
- Returns: 3 verses + AI-generated spiritual validation summary

### Feature 2: Dua-to-Do — Actionable Roadmap (FREE — registered users)
- Powered by ImanSync output
- GLM-5 parses the returned verses and generates a 5-step Ikhtiar checklist
- Each step is saved as a task via Quran Foundation User API (Goals)
- User can check off steps and track progress in dashboard

### Feature 3: HeartPulse — Voice Journaling & Retention (FREE — registered users)
- User records a voice reflection or types a prayer/reflection
- GLM-5 handles speech-to-text and sentiment analysis
- Integrates with Quran Foundation User API: Streak Tracking + Post a Reflection
- Dashboard shows sentiment trend and streak history

### Feature 4: SakinahStream — Audio Experience (FREE — all visitors)
- Curated recitation audio player
- Streams from Quran Foundation Audio API
- Filter by reciter, surah, or mood category

---

## Target Users

**Primary:** Muslim young adults (18–35) who use productivity tools and want to integrate faith into their daily workflow. Indonesia, Malaysia, Middle East, UK.

**Secondary:** Non-Arab Muslims who need accessible tafsir and guidance in their language.

**User persona:** Aisha, 26, marketing professional in Kuala Lumpur. Sets goals using Notion and Todoist. Wants to make her daily intentions more meaningful but finds generic Islamic apps too passive — just reading Quran without a system for acting on it.

---

## MVP Scope

**In scope:**
- Turborepo monorepo with Expo (iOS/Android/Web) + NestJS server
- OAuth2 login via Quran.com (Supabase Auth or Clerk)
- ImanSync: text input + image upload (GLM-5V vision)
- Dua-to-Do: 5-step checklist generated from ImanSync verses, synced to Quran Foundation Goals API
- HeartPulse: voice recording + text input, sentiment analysis via GLM-5, streak tracking
- SakinahStream: audio player streaming from Quran Foundation Audio API
- User dashboard: manifestation history, task progress, reflection streak, audio favorites
- Shared `packages/database` (Prisma + PostgreSQL)
- Shared `packages/shared` (types, DTOs, validators)

**Out of scope (later phases):**
- Community features / social sharing
- Push notifications
- Premium tier / paywall
- Custom recitation uploads
- Offline mode

---

## Business Model

**Hackathon MVP — all features free.**

Post-hackathon monetization options to explore:
- Premium tier: deeper AI analysis, unlimited history, custom dua collections
- B2B: white-label for mosques and Islamic organizations
- Sponsorship: halal brands, Islamic finance apps

---

## Tech Stack (LOCKED)

### Frontend — One codebase, three platforms

| Component | Technology | iOS | Android | Web |
|-----------|-----------|-----|---------|-----|
| Framework | Expo SDK 52 (React Native) | ✅ Native `.app` | ✅ Native `.apk` | ✅ Static HTML/CSS/JS |
| Routing | Expo Router 4 | ✅ | ✅ | ✅ |
| Styling | NativeWind v4 (Tailwind CSS) | ✅ | ✅ | ✅ |
| Voice | Expo Audio | ✅ Microphone | ✅ Microphone | ⚠️ Web Audio API |
| Image | Expo ImagePicker | ✅ Camera/Gallery | ✅ Camera/Gallery | ✅ File input |
| Auth Token | Expo SecureStore | ✅ Keychain | ✅ Keystore | ⚠️ localStorage fallback |
| Icons | Lucide React Native | ✅ | ✅ | ✅ |
| Fonts | Google Fonts (Expo) | ✅ | ✅ | ✅ |

> **Build commands:** `npx expo run:ios` · `npx expo run:android` · `npx expo export --platform web`

### Backend

| Component | Technology | Notes |
|-----------|-----------|-------|
| API Server | NestJS 10 + TypeScript strict | `apps/server` — port 3001 |
| Database | PostgreSQL 16 + Prisma 6 | `packages/database` |
| Cache | Redis via ioredis | Result caching + rate limiting |
| AI (Vision + Text) | Zhipu AI GLM-5 / GLM-5V | Via `zhipuai` SDK |
| Auth | OAuth2 — Login with Quran.com | Supabase Auth or Clerk |
| Quran Content | Quran Foundation Content API | Tafsir, translation, search |
| Quran User | Quran Foundation User API | Goals, streaks, reflections |
| Quran Audio | Quran Foundation Audio API | Recitation streaming |

### Infrastructure

| Component | Technology | Notes |
|-----------|-----------|-------|
| Monorepo | Turborepo | pnpm workspaces |
| Email (future) | Resend | Post-MVP |
| Hosting | VPS Contabo or Railway | Backend + DB + Redis |
| Web hosting | Any static host | CDN for web export |

---

## Bazi Color System

Color decisions follow Bazi (Chinese Four Pillars) energy principles — consistent with other projects in this ecosystem. **Full specification in `05-design-system.md`.**

**Founder profile:** Strong Water element (Winter birth). Needs Wood to channel Water constructively, and Fire to introduce warmth.

| Color | Name | Hex | Element | Usage |
|-------|------|-----|---------|-------|
| Primary | Forest Green | #064E3B | Wood | Primary brand, buttons, nav active. Wood absorbs excess Water energy. |
| Accent | Rosewood | #54161B | Fire | Secondary buttons, spiritual depth. Fire balances cold Water. |
| Highlight | Champagne Gold | #E3C567 | Metal | Streaks, achievements, key CTAs. Monkey Shio = Metal element. |
| Background | Off-White | #F8FAFC | Neutral | App background |
| Surface | Soft White | #F1F5F0 | Wood/Neutral | Cards, modals, containers |
| Error | Deep Rose | #9F1239 | Fire | Error states |
| Success | Sage Green | #166534 | Wood | Completed tasks, confirmation |

**Do NOT use:** Bright emerald/green (#10B981 range), pure black (#000000), bright orange/yellow.

---

## Constraints

- Hackathon timeline: 48–72 hours for MVP
- Solo or small team (2 developers max)
- Zhipu AI API key required
- Quran Foundation API key required
- OAuth2 app registered on Quran.com

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Quran Foundation API rate limits | Cache all responses in Redis (TTL 1 hour) |
| GLM-5 response quality for Arabic context | Fine-tune prompt with Islamic scholar framing |
| OAuth2 with Quran.com is complex to set up | Start with email auth as fallback for hackathon |
| Expo web export limitations | Test web parity early, not at the end |
| GLM-5V image analysis accuracy | Validate with test images before demo |
