---
title: 'Sentiment Analysis Display for HeartPulse'
type: 'feature'
created: '2026-04-11'
status: 'review'
baseline_commit: 'aa29d6e7023cbdc8b30e126e08228176e01a4a2d'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sentiment analysis display saat ini di-inline di `heartpulse.tsx` dan tidak mengikuti design system spec (Section 6). Warna menggunakan generic Tailwind (emerald, amber, rose) bukan brand tokens (primary, accent, highlight). `SentimentBadge.tsx` belum ada sebagai komponen terpisah sesuai arsitektur.

**Approach:** Extract `SentimentBadge.tsx` sebagai komponen reusable, fix warna ke design system tokens, tambahkan sentiment history endpoint di backend, dan buat tampilan riwayat sentiment sederhana di frontend.

## Boundaries & Constraints

**Always:** Gunakan design system tokens dari `05-design-system.md` Section 6 (`bg-primary/10`, `bg-accent/10`, dll). Ikuti pola komponen yang sudah ada (seperti `VerseCard.tsx`). Styling NativeWind.

**Ask First:** N/A

**Never:** Jangan ubah backend sentiment analysis logic (sudah benar). Jangan install dependency baru. Jangan ubah data yang dikembalikan API (sudah sesuai schema). Jangan hapus inline sentiment display yang sudah berfungsi — refactor ke komponen terpisah saja.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Positive sentiment | sentiment="hopeful", score=0.85 | Green badge (bg-primary/10 + text-primary), score bar 85% | N/A |
| Negative sentiment | sentiment="anxious", score=0.3 | Rosewood badge (bg-accent/10 + text-accent), score bar 30% | N/A |
| Neutral/other sentiment | sentiment="other", score=0.5 | Surface badge (bg-surface + text-secondary) | N/A |
| Sentiment history empty | User has 0 reflections | Show empty state "No reflections this week." | N/A |
| Sentiment history loaded | User has 5+ reflections | Show last 7 reflections with sentiment badges | N/A |
| Unknown sentiment label | sentiment="joyful" (not in map) | Fallback to neutral styling | N/A |

</frozen-after-approval>

## Code Map

### Files to CREATE

- `apps/mobile-web/components/heart-pulse/SentimentBadge.tsx` — Komponen reusable untuk sentiment label + score display

### Files to MODIFY

- `apps/mobile-web/app/(tabs)/heartpulse.tsx` — Extract inline sentiment display → gunakan `<SentimentBadge />`, fix warna ke design tokens, tambah sentiment history section
- `apps/server/src/heart-pulse/heart-pulse.controller.ts` — Tambah GET endpoint untuk sentiment history (sudah ada `getHistory` di service, tapi perlu GET route, bukan POST)

### Files NOT to touch

- `apps/server/src/heart-pulse/heart-pulse.service.ts` — Sudah benar, `analyzeSentiment()` dan `getHistory()` sudah ada
- `apps/mobile-web/hooks/useHeartPulse.ts` — Sudah menyimpan sentiment/sentimentScore, mungkin perlu tambah `fetchHistory` function
- `apps/mobile-web/components/heart-pulse/VoiceRecorder.tsx` — Tidak berubah

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile-web/components/heart-pulse/SentimentBadge.tsx` — Buat komponen baru dengan:
  - Props: `{ sentiment: string; score: number | null; size?: 'sm' | 'md' }`
  - Sentiment color mapping sesuai design system Section 6:
    - Positive (hopeful, grateful, peaceful, content, focused) → `bg-primary/10` + `text-primary`
    - Negative (anxious, struggling, uncertain, heavy) → `bg-accent/10` + `text-accent`
    - Other → `bg-surface` + `text-secondary`
  - Score bar menggunakan `bg-primary` (bukan warna dinamis)
  - Capitalize sentiment label
  - Export komponen
- [x] `apps/mobile-web/app/(tabs)/heartpulse.tsx` — Refactor:
  - Hapus `SENTIMENT_COLORS` map (pindah ke SentimentBadge)
  - Ganti inline sentiment badge (lines 80-86) → `<SentimentBadge sentiment={sentiment} score={sentimentScore} />`
  - Ganti inline score bar (lines 89-103) → termasuk di SentimentBadge
  - Pertahankan streak card dan transcript section
- [x] `apps/mobile-web/hooks/useHeartPulse.ts` — Tambah `fetchHistory` function:
  - GET `/heart-pulse/history` → return reflections array
  - State: `history: Reflection[]`, `historyLoading: boolean`
- [x] `apps/server/src/heart-pulse/heart-pulse.controller.ts` — Tambah GET history endpoint:
  - `@Get('history')` → panggil `this.heartPulseService.getHistory(req.user.userId)`
  - Catatan: service `getHistory()` sudah ada, hanya perlu route baru

**Acceptance Criteria:**
- Given user submit reflection, when sentiment returns "hopeful", then SentimentBadge menampilkan bg-primary/10 dengan text-primary
- Given user submit reflection, when sentiment returns "anxious", then SentimentBadge menampilkan bg-accent/10 dengan text-accent
- Given sentiment score 0.85, when badge renders, then score bar menampilkan 85%
- Given sentiment "other" (unknown), when badge renders, then fallback ke neutral styling
- Given user has reflections, when navigate to HeartPulse, then last 7 sentiment badges visible in history
- Given user has no reflections, when view history, then empty state "No reflections yet." shown
- Reflection saved to DB regardless of sentiment result

## Dev Notes

### Architecture Context

- HeartPulse data flow: Audio/Text → NestJS → GLM-5 STT + Sentiment → DB → Response [Source: Brain/03-architecture.md Section 4]
- Sentiment prompt (Prompt 5): Returns `{ "sentiment": "hopeful|grateful|anxious|peaceful|struggling|content|other", "score": 0.0-1.0 }` [Source: Brain/03-architecture.md Section 6]
- Reflection schema: `sentiment: String?`, `sentimentScore: Float?` [Source: packages/database/prisma/schema.prisma]

### Design System Tokens (05-design-system.md Section 6)

```
Positive states  → bg-primary/10    text-primary    (Forest Green family)
Neutral states   → bg-surface       text-secondary
Negative states  → bg-accent/10     text-accent     (Rosewood family)
Streak/Gold      → bg-highlight/20  text-highlight  (Champagne Gold family)
```

Sentiment labels (Section 7): `hopeful | grateful | peaceful | content | focused | anxious | struggling | uncertain | heavy`

### Previous Story Intelligence (Story 4-1)

- Voice recording mode works, VoiceRecorder component uses callback pattern `onSubmit(audioUri, transcriptText)`
- Backend `reflectVoice()` already calls `analyzeSentiment()` — sentiment data flows through both paths
- heartpulse.tsx uses mode toggle pattern (text/voice) — don't break this
- `useHeartPulse` hook returns `{ reflection, sentiment, sentimentScore, streakCount, isLoading, error, submitTextReflection, submitVoiceReflection, reset }`

### Current Inline Implementation (to be extracted)

The sentiment badge is currently at lines 80-86 in heartpulse.tsx with generic Tailwind colors:
```tsx
const SENTIMENT_COLORS: Record<string, { bg: string; text: string }> = {
  hopeful: { bg: "bg-emerald-100", text: "text-emerald-800" },
  grateful: { bg: "bg-amber-100", text: "text-amber-800" },
  // ... uses generic Tailwind, NOT design system tokens
};
```

This MUST be replaced with design system tokens per Section 6.

### Component Pattern to Follow

Follow `VerseCard.tsx` pattern — self-contained component with all styling internal, receives data via props.

### Existing Backend Endpoints

- `POST /heart-pulse/reflect` — text reflection → returns `{ reflection, sentiment, sentimentScore, streakCount }`
- `POST /heart-pulse/reflect-voice` — voice reflection → same return shape
- `POST /heart-pulse/history` — currently POST, should add GET alias
- Service `getHistory()` already returns `{ reflections, streakCount }` with last 30 reflections

### Project Structure Notes

- Component path must be `apps/mobile-web/components/heart-pulse/SentimentBadge.tsx` per architecture [Source: Brain/03-architecture.md Section 2]
- Architecture file lists `SentimentBadge.tsx` in the component tree — this is the expected location

### References

- [Source: Brain/03-architecture.md#Section 4] — API Design POST /heart-pulse/reflect
- [Source: Brain/03-architecture.md#Section 6] — Prompt 5: Sentiment Analysis
- [Source: Brain/05-design-system.md#Section 6] — SentimentBadge component pattern
- [Source: Brain/05-design-system.md#Section 7] — Sentiment labels
- [Source: packages/database/prisma/schema.prisma] — Reflection model
- [Source: apps/server/src/heart-pulse/heart-pulse.service.ts] — Backend sentiment logic (DO NOT MODIFY)
- [Source: apps/server/src/heart-pulse/heart-pulse.controller.ts] — Controller routes
- [Source: apps/mobile-web/hooks/useHeartPulse.ts] — Frontend hook
- [Source: apps/mobile-web/app/(tabs)/heartpulse.tsx] — Current screen (REFACTOR)

## Dev Agent Record

### Implementation Notes

- Created `SentimentBadge.tsx` as self-contained component following `VerseCard.tsx` pattern
- Component categorizes sentiments into 3 buckets (positive/negative/neutral) using Set lookups
- Supports two sizes: `md` (default, used in result view) and `sm` (used in history cards)
- Score bar always uses `bg-primary` per design spec — no dynamic colors
- Refactored `heartpulse.tsx`: removed entire `SENTIMENT_COLORS` map (12 lines), replaced inline badge + score bar (24 lines) with single `<SentimentBadge />` call
- Added sentiment history section showing last 7 reflections with `SentimentBadge size="sm"` and date + transcript preview
- Empty state shows "No reflections yet." text
- Added `fetchHistory` to `useHeartPulse` hook — GET `/heart-pulse/history`, silent fail on error (supplementary data)
- History fetched on mount via `useEffect`
- Added `@Get('history')` endpoint to controller, kept `@Post('history')` as legacy alias for backward compat
- No new dependencies installed
- Backend sentiment analysis logic untouched (as specified)

### Debug Log

- Pre-existing Multer type error (`Express.Multer.File`) from story 4-1 — not introduced by this story
- Pre-existing tsconfig node10 deprecation warning — not introduced by this story

## File List

| File | Action | Description |
|------|--------|-------------|
| `apps/mobile-web/components/heart-pulse/SentimentBadge.tsx` | CREATED | Reusable sentiment badge component with design system tokens |
| `apps/mobile-web/app/(tabs)/heartpulse.tsx` | MODIFIED | Removed SENTIMENT_COLORS, uses SentimentBadge, added history section |
| `apps/mobile-web/hooks/useHeartPulse.ts` | MODIFIED | Added history state, historyLoading, fetchHistory function |
| `apps/server/src/heart-pulse/heart-pulse.controller.ts` | MODIFIED | Added GET /heart-pulse/history endpoint, kept POST as legacy |

## Change Log

- 2026-04-11: Story 4-2 implementation complete — SentimentBadge extracted, design system tokens applied, history section added, GET endpoint added (Mentari)

## Verification

**Commands:**
- `cd apps/server && npx jest --no-cache` — expected: all tests pass (no regressions)
- **Result:** ✅ 4/4 suites passed, 30/30 tests green, 0 regressions
