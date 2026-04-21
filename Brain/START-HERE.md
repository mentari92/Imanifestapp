# START HERE — ImanifestApp
## Panduan Memulai di Code Editor (Cursor / Windsurf / code editor)
## Version 1.0 — 4 Features: Imanifest | Dua-to-Do | Qalb | Tafakkur

---

## Langkah 1: Struktur Folder Brain

Upload semua file ini ke folder `Brain/` di project kamu:

```
imanifestapp/
├── Brain/
│   ├── 01-project-brief.md      ← Problem, solution, target users, tech stack
│   ├── 02-prd.md                ← Semua FR, NFR, user stories, acceptance criteria
│   ├── 03-architecture.md       ← Folder structure, DB schema, API design, turbo.json, deps, ADRs
│   ├── 04-epics-and-stories.md  ← 6 epics, 13 stories, build order checklist
│   └── 05-design-system.md      ← LEGACY docs (gunakan hanya jika tidak konflik dengan Stitch)
├── .env.example                      ← Template variabel environment
├── .env                              ← Buat sendiri dari template, isi nilainya
└── (kode dibuat oleh agent)
```

---

## Langkah 2: Status Story & Urutan Build

### Epic 1: Foundation ← MULAI DI SINI
- [ ] **Story 1.1** — Turborepo + monorepo scaffold (Expo + NestJS + packages)
- [ ] **Story 1.2** — Database schema + Prisma migration (User, Manifestation, Task, Reflection)
- [ ] **Story 1.3** — Auth: OAuth2 Quran.com via Supabase/Clerk + JWT guard di NestJS

### Epic 2: Imanifest
- [ ] **Story 2.1** — Text analysis: GLM-5 → Quran Content API → DB
- [ ] **Story 2.2** — Vision analysis: GLM-5V multimodal (image + text)
- [ ] **Story 2.3** — Rate limiting (Redis) + caching (Quran API + GLM results)

### Epic 3: Dua-to-Do
- [ ] **Story 3.1** — Checklist generation: GLM-5 → Quran Goals API → DB
- [ ] **Story 3.2** — Task completion tracking (checkbox + optimistic UI)

### Epic 4: Qalb
- [ ] **Story 4.1** — Voice recording (Expo Audio) + GLM-5 transcription
- [ ] **Story 4.2** — Sentiment analysis + SentimentBadge display
- [ ] **Story 4.3** — Streak tracking via Quran User API + text fallback

### Epic 5: Tafakkur
- [ ] **Story 5.1** — Reciter + surah browser (Quran Audio API, no auth required)
- [ ] **Story 5.2** — Audio player (Expo Audio, play/pause/seek)

### Epic 6: Dashboard
- [ ] **Story 6.1** — Overview screen (stats, sentiment chart, history)

---

## Langkah 3: Prompt Pertama ke Agent

Jika **fresh start (belum ada kode sama sekali):**

```
Read all docs in the /Brain folder, especially 
03-architecture.md and 04-epics-and-stories.md.

For UI/design source of truth, use:
- apps/mobile-web/assets/stitch/*.json
- apps/mobile-web/assets/stitch/*.html
- apps/mobile-web/global.css

Treat Brain/05-design-system.md as legacy reference only.

Implement Story 1.1 — Turborepo + Monorepo Setup:
- Initialize Turborepo with pnpm workspaces (turbo.json from 03-architecture.md Section 2.1)
- apps/mobile-web: Expo app with Expo Router + NativeWind v4 (config from 03-architecture.md Section 2.4)
- apps/server: NestJS with TypeScript strict mode
- packages/database: Prisma schema with schema.prisma (4 tables as per architecture doc Section 3)
- packages/shared: shared types, Zod validators, AND theme tokens (align with active Stitch artifacts)
- tailwind.config.js: align with active Stitch design tokens in apps/mobile-web/assets/stitch/
- packages/shared/src/theme.ts: keep in sync with active Stitch color/typography direction
- Install fonts: @expo-google-fonts/playfair-display, lora, amiri, jetbrains-mono
- Install icons: lucide-react-native
- babel.config.js, metro.config.js, nativewind-env.d.ts per 03-architecture.md Section 2.4
- app.json per 03-architecture.md Section 2.3
- Dependency versions LOCKED — see 03-architecture.md Section 2.2
- turbo.json with dev, build, lint pipelines
- pnpm dev starts both Expo (port 8081) and NestJS (port 3001) simultaneously
- .env.example with all required variables (see architecture.md Section 7)

Tech stack is LOCKED. Reference 03-architecture.md for all decisions.
Design source is LOCKED to Stitch artifacts in apps/mobile-web/assets/stitch/ and apps/mobile-web/global.css.
```

Jika **sudah selesai Story 1.1, mau lanjut Story 1.2:**

```
Read Brain/03-architecture.md Section 3 (Database Schema).

Implement Story 1.2 — Database Schema & Migration:
- Create packages/database/prisma/schema.prisma with all 4 models:
  User, Manifestation, Task, Reflection
- All fields and relations exactly as documented in architecture.md Section 3
- Run prisma migrate dev
- Create packages/database/src/index.ts exporting prisma singleton
- Create DatabaseModule in NestJS that makes PrismaClient available via injection
```

---

## Langkah 4: Prompt Template per Story

Gunakan format ini untuk setiap story baru:

```
Read Brain/03-architecture.md and Brain/04-epics-and-stories.md.

For visual/style decisions, use Stitch artifacts in apps/mobile-web/assets/stitch/ and apps/mobile-web/global.css.

Implement [STORY NUMBER] — [STORY NAME]:

Acceptance Criteria:
[paste acceptance criteria dari epics-and-stories.md]

Rules:
- Follow folder structure in 03-architecture.md Section 2 exactly
- TypeScript strict mode throughout
- All colors, fonts, and component styles per Stitch artifacts (apps/mobile-web/assets/stitch/) and apps/mobile-web/global.css
- Dependency versions per 03-architecture.md Section 2.2 (LOCKED)
- All DB operations via packages/database prisma singleton
- All Redis operations via common/redis.service.ts
- All GLM-5 calls via common/zhipu.service.ts
- All Quran Foundation API calls via common/quran-api.service.ts
- Validate all API inputs with class-validator DTOs
- Error messages in English (Indonesian as stretch goal)
- Use lucide-react-native for all icons (unless a screen-specific Stitch artifact states otherwise)
```

---

## Langkah 4.5: Build per Platform

Setelah Story 1.1 selesai, kamu bisa build ke 3 platform:

```bash
# Development (both frontend + backend)
pnpm dev

# iOS (requires macOS + Xcode)
cd apps/mobile-web && npx expo run:ios

# Android (requires Android Studio)
cd apps/mobile-web && npx expo run:android

# Web (static export — deploy ke Vercel/Netlify/CDN)
cd apps/mobile-web && npx expo export --platform web
```

> **Satu codebase Expo menghasilkan 3 output:** native iOS, native Android, dan static web. Tidak perlu repo terpisah.

---

## Langkah 5: Environment Variables

Buat file `.env` di `apps/server/`, isi berdasarkan template ini:

**Wajib sebelum Story 1.1:**
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/imanifestapp"
REDIS_URL="redis://localhost:6379"
PORT=3001
JWT_SECRET="generate: openssl rand -base64 32"
```

**Wajib sebelum Story 1.3 (Auth):**
```
# Pilih salah satu:
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your_supabase_anon_key"
# ATAU
CLERK_SECRET_KEY="your_clerk_secret"
```

**Wajib sebelum Story 2.1 (Imanifest):**
```
ZHIPU_API_KEY="your_zhipu_api_key"
QURAN_FOUNDATION_API_KEY="your_quran_api_key"
QURAN_API_BASE_URL="https://api.quran.com/api/v4"
```

---

## Langkah 6: Catatan Penting per Epic

### Epic 2 (Imanifest) — sebelum mulai:
Pastikan kamu punya:
- Zhipu AI API key aktif (GLM-5 + GLM-5V akses)
- Quran Foundation API key aktif
- Redis running (untuk caching hasil Quran API)

Kalau OAuth2 Quran.com belum siap, pakai email/password auth dulu biar Epic 2 bisa jalan.

### Epic 4 (Qalb) — sebelum mulai:
```
Kita akan mulai Epic 4 — Qalb Voice Journaling.

Expo Audio API butuh permissions di app.json:
- ios.infoPlist.NSMicrophoneUsageDescription
- android.permissions: RECORD_AUDIO

Pastikan ini sudah ada di app.json sebelum test di device.
Implement Story 4.1 — Voice Recording & Transcription.
```

### Epic 5 (Tafakkur) — perhatikan:
- `/tafakkur/*` routes tidak boleh pakai AuthGuard
- Reciter list di-cache 24 jam — jangan re-fetch setiap request
- Expo Audio untuk streaming: gunakan `Audio.Sound.createAsync(url)` bukan download dulu

---

## Referensi Cepat

| File | Isi |
|------|-----|
| `01-project-brief.md` | Problem, solution, 4 fitur, target user, tech stack locked, Bazi color system |
| `02-prd.md` | Semua FR + NFR, user stories, acceptance criteria |
| `03-architecture.md` | Folder structure, turbo.json, dependencies, DB schema, API design, NativeWind config, ADRs |
| `04-epics-and-stories.md` | 6 epics, 13 stories, build order checklist |
| `05-design-system.md` | Color palette, typography, Tailwind config, component patterns, icon library, motion specs |

---

## Tips untuk Agent

- **Plan mode** untuk story kompleks: Story 2.1, 2.2, 4.1, 4.3
- **Fast mode** untuk story straightforward: Story 1.1, 1.2, 3.2, 5.1, 5.2, 6.1
- Setelah tiap story: review acceptance criteria checklist sebelum lanjut
- Kalau agent buat keputusan teknis yang aneh → tunjuk ke ADR yang relevan di 03-architecture.md
- Kalau GLM-5 response tidak konsisten: minta agent periksa prompt di architecture.md Section 6

---

## Hal Penting yang TIDAK Boleh Diimplementasikan di Hackathon MVP

Sudah dikunci di project brief — agent jangan buat:
- ❌ Paywall / payment flow
- ❌ Push notifications
- ❌ Social/community features
- ❌ Admin panel
- ❌ Offline mode / service worker
- ❌ Upload KTP, paspor, atau dokumen identitas

Yang di-build hanya 4 fitur inti: Imanifest, Dua-to-Do, Qalb, Tafakkur.
