---
title: 'Streak Tracking & Text Fallback for HeartPulse'
type: 'feature'
created: '2026-04-11'
status: 'done'
baseline_commit: '53507a8'
context: ['spec-4-2-sentiment-analysis.md']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Streak tracking saat ini hanya berupa angka (`streakCount`) yang dikembalikan backend tapi belum ada `StreakCard.tsx` visual di frontend. Quran Foundation User API integration untuk streak tracking belum diimplementasikan. Text input sebagai fallback mode sudah ada tapi belum ada visual indicator bahwa kedua mode (text + voice) diperlakukan sama.

**Approach:** Buat `StreakCard.tsx` dengan Champagne Gold design tokens, integrasikan Quran Foundation User API (dengan fallback ke local DB streak yang sudah ada), dan pastikan kedua mode reflection menghasilkan streak yang konsisten.

## Boundaries & Constraints

**Always:** Gunakan design system tokens (`bg-highlight/20`, `text-highlight` untuk streak/gold). Ikuti pola komponen `SentimentBadge.tsx` dan `VerseCard.tsx`. Styling NativeWind.

**Ask First:** Jika Quran Foundation User API endpoint tidak terdokumentasi atau tidak accessible, tanyakan apakah cukup pakai local DB streak saja.

**Never:** Jangan ubah backend `calculateStreak()` logic (sudah benar). Jangan install dependency baru. Jangan hapus text input mode yang sudah ada.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Streak displayed | streakCount=5 | StreakCard shows "🔥 5 hari berturut-turut" with gold styling | N/A |
| Streak zero | streakCount=0 | StreakCard shows "Mulai streak harianmu!" with muted styling | N/A |
| Quran API success | POST reflection to QF API | Streak synced with Quran Foundation | N/A |
| Quran API unavailable | API timeout/error | Fallback to local DB streak (already calculated) | Log warning, don't crash |
| Text mode submit | User types + submits | Same streak increment as voice mode | N/A |
| Voice mode submit | User records + submits | Same streak increment as text mode | N/A |
| New day first reflection | First reflection of the day | Streak increments by 1 | N/A |
| Same day repeated reflection | Second reflection same day | Streak stays same (no double increment) | N/A |

</frozen-after-approval>

## Code Map

### Files to CREATE

- `apps/mobile-web/components/heart-pulse/StreakCard.tsx` — Komponen visual streak dengan Champagne Gold tokens

### Files to MODIFY

- `apps/mobile-web/app/(tabs)/heartpulse.tsx` — Integrasikan StreakCard, pastikan streakCount displayed prominently
- `apps/server/src/heart-pulse/heart-pulse.service.ts` — Tambah Quran Foundation API integration (POST reflection) dengan fallback ke local streak
- `apps/server/src/heart-pulse/heart-pulse.controller.ts` — Expose streak info jika perlu endpoint terpisah

### Files NOT to touch

- `apps/server/src/heart-pulse/heart-pulse.module.ts` — Sudah benar
- `apps/mobile-web/hooks/useHeartPulse.ts` — Sudah return streakCount dari history dan submit endpoints
- `apps/mobile-web/components/heart-pulse/SentimentBadge.tsx` — Sudah benar
- `apps/mobile-web/components/heart-pulse/VoiceRecorder.tsx` — Sudah benar

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile-web/components/heart-pulse/StreakCard.tsx` — Buat komponen baru:
  - Props: `{ streakCount: number; loading?: boolean }`
  - Streak > 0: Tampilkan angka + emoji 🔥 + text "{count} hari berturut-turut" dengan `bg-highlight/20` + `text-highlight` (Champagne Gold family per 05-design-system.md Section 6)
  - Streak === 0: Tampilkan "Mulai streak harianmu!" dengan `bg-surface` + `text-secondary` (muted)
  - Loading state: skeleton placeholder
  - Export komponen
- [x] `apps/mobile-web/app/(tabs)/heartpulse.tsx` — Integrasikan:
  - Import `StreakCard` 
  - Tempatkan StreakCard di bagian atas screen (sebelum input area) agar user selalu melihat streaknya
  - Ganti inline streak display (jika ada) dengan `<StreakCard streakCount={streakCount} />`
  - Pastikan streakCount di-update setelah submit reflection (sudah ter-update dari hook)
- [x] `apps/server/src/heart-pulse/heart-pulse.service.ts` — Quran Foundation API integration:
  - Tambah method `syncToQuranFoundation(userId, reflectionData)` — POST ke Quran Foundation User API "Post a Reflection" endpoint
  - Tambah method `fetchQuranFoundationStreak(userId)` — GET streak dari Quran Foundation User API "Streak Tracking" endpoint
  - Implementasi: try/catch dengan fallback ke local `calculateStreak()` jika API unavailable
  - Log warning jika Quran Foundation API gagal, tapi jangan crash
  - **NOTE:** QF User API URL tidak tersedia — diimplementasikan sebagai configurable stub (graceful no-op when `QURAN_FOUNDATION_USER_API_URL` not set)
- [x] `apps/server/src/heart-pulse/heart-pulse.service.spec.ts` — Tambah tests:
  - Test QF API graceful fallback (syncToQuranFoundation returns without error)
  - Test fetchQuranFoundationStreak returns null when not configured
  - Test reflectText with sentiment + streak calculation
  - Test reflectVoice with same streak logic as text
  - Test getHistory returns reflections + streakCount
- [x] Update sprint status: set `4-2-sentiment-analysis: "done"`, set `4-3-streak-tracking: "in-progress"`

**Acceptance Criteria:**
1. Given user has streak of 5, when StreakCard renders, then shows "🔥 5 hari berturut-turut" with Champagne Gold styling (bg-highlight/20 + text-highlight)
2. Given user has streak of 0, when StreakCard renders, then shows "Mulai streak harianmu!" with muted styling
3. Given user submits text reflection, when successful, then streakCount updates in StreakCard
4. Given user submits voice reflection, when successful, then streakCount updates in StreakCard (same as text)
5. Given Quran Foundation API unavailable, when streak calculated, then local DB streak used as fallback without crash
6. Given reflection submitted, when Quran Foundation API call fails, then reflection still saved to local DB and response returned to user
7. Both text and voice paths trigger identical streak calculation logic

## Dev Notes

### Architecture Context

- HeartPulse data flow: Audio/Text → NestJS → GLM-5 STT + Sentiment → DB → Response [Source: Brain/03-architecture.md Section 4]
- Streak calculation uses `streakDate` field on Reflection model, with 36h tolerance between days [Source: apps/server/src/heart-pulse/heart-pulse.service.ts]
- `calculateStreak()` already works correctly — queries last 35 days, counts consecutive days

### Design System Tokens (05-design-system.md Section 6)

```
Streak/Gold → bg-highlight/20  text-highlight  (Champagne Gold family)
```

### Previous Story Intelligence (Story 4-2)

- `useHeartPulse` hook returns `streakCount` — already fetched from both submit and history endpoints
- `fetchHistory()` already updates streakCount: `if (typeof res.data.streakCount === 'number') setStreakCount(res.data.streakCount)`
- `SentimentBadge.tsx` pattern to follow — self-contained, props-driven, all styling internal
- Text input mode and voice recorder mode already exist in heartpulse.tsx — both call `processReflection()` backend-side
- `heartpulse.tsx` uses mode toggle between text/voice — don't break this

### What's Already Working (DO NOT REIMPLEMENT)

1. **Text input fallback** — already implemented in heartpulse.tsx with mode toggle
2. **Local streak calculation** — `calculateStreak()` in service, uses `streakDate` with 1.5-day tolerance
3. **streakCount in API responses** — both `reflectText` and `reflectVoice` return `streakCount`
4. **streakCount in history** — `getHistory()` also returns `streakCount`
5. **Hook state management** — `useHeartPulse` already tracks `streakCount` and updates on submit + history fetch

### What's Missing (IMPLEMENT THIS)

1. **StreakCard.tsx** — visual component for streak display
2. **Quran Foundation API integration** — with graceful fallback
3. **StreakCard placement** in heartpulse.tsx — prominent position

### Quran Foundation User API Notes

The epics mention:
- POST reflection to "Quran Foundation User API (Streak Tracking + Post a Reflection)"
- GET streak count from "Quran Foundation User API"

**Important:** Check if `QURAN_FOUNDATION_USER_API` environment variable or any Quran Foundation User API config exists. If not documented, implement as **configurable stub** — method exists with try/catch, logs "QF API not configured", returns local streak. This allows activation later without code changes.

### Reflection Schema

```prisma
model Reflection {
  id             String   @id @default(cuid())
  userId         String
  transcriptText String?
  audioPath      String?
  sentiment      String?
  sentimentScore Float?
  streakDate     DateTime @default(now())
  createdAt      DateTime @default(now())
  user           User     @relation(fields: [userId], references: [id])
}
```

### References

- [Source: Brain/04-epics-and-stories.md#Story 4.3] — Streak tracking + text fallback AC
- [Source: Brain/03-architecture.md#Section 4] — API Design
- [Source: Brain/05-design-system.md#Section 6] — Streak/Gold tokens
- [Source: apps/server/src/heart-pulse/heart-pulse.service.ts] — Backend streak logic (DO NOT MODIFY calculateStreak)
- [Source: apps/mobile-web/hooks/useHeartPulse.ts] — Frontend hook (already has streakCount)
- [Source: apps/mobile-web/app/(tabs)/heartpulse.tsx] — Current screen
- [Source: _bmad-output/implementation-artifacts/spec-4-2-sentiment-analysis.md] — Previous story intelligence

## Dev Agent Record

### Agent Model Used

Cline (Claude)

### Debug Log References

- Pre-existing Multer type error from story 4-1 — not introduced by this story
- Pre-existing tsconfig node10 deprecation warning — not introduced by this story
- IDE shows TS errors on spec file (jest types) — same as other spec files, jest config handles at runtime

### Completion Notes List

- Created `StreakCard.tsx` as self-contained component following `SentimentBadge.tsx` pattern
  - Three visual states: loading (skeleton), streak=0 (muted/encouraging), streak>0 (Champagne Gold)
  - Uses design system tokens: `bg-highlight/20` + `text-highlight` for active streak
  - Uses `bg-surface` + `text-secondary` for zero-streak state
- Refactored `heartpulse.tsx`: replaced inline streak card (11 lines of hardcoded styling) with `<StreakCard />` component
  - StreakCard now visible in BOTH input view and result view
  - Removed `Flame` import from lucide (moved to StreakCard)
- Added QF User API stubs to `heart-pulse.service.ts`:
  - `syncToQuranFoundation()` — fire-and-forget POST, graceful no-op if `QURAN_FOUNDATION_USER_API_URL` not set
  - `fetchQuranFoundationStreak()` — returns null if not configured, available for future activation
  - Both use try/catch with logging, never crash the app
  - Sync is called after processReflection completes (non-blocking via `.catch(() => {})`)
- Created comprehensive test suite: 11 tests covering:
  - QF API graceful fallback (2 tests)
  - Text reflection processing + streak calculation (3 tests)
  - Voice reflection with same streak logic (2 tests)
  - getHistory endpoint (3 tests)
  - Service instantiation (1 test)
- No new dependencies installed
- Backend `calculateStreak()` logic untouched (as specified)

### File List

| File | Action | Description |
|------|--------|-------------|
| `apps/mobile-web/components/heart-pulse/StreakCard.tsx` | CREATED | Streak visual component with Champagne Gold design tokens |
| `apps/mobile-web/app/(tabs)/heartpulse.tsx` | MODIFIED | Replaced inline streak with StreakCard, visible in both views |
| `apps/server/src/heart-pulse/heart-pulse.service.ts` | MODIFIED | Added QF User API stubs (syncToQuranFoundation, fetchQuranFoundationStreak) |
| `apps/server/src/heart-pulse/heart-pulse.service.spec.ts` | CREATED | 11 tests for streak, reflection, history, QF API fallback |

## Change Log

- 2026-04-11: Story 4-3 implementation complete — StreakCard component created, QF API stubs added, comprehensive tests written (Mentari)

## Verification

**Commands:**
- `cd apps/server && npx jest --no-cache` — expected: all tests pass (no regressions)
- **Result:** ✅ 5/5 suites passed, 41/41 tests green, 0 regressions
