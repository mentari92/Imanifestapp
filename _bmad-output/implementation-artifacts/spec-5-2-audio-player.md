# Story 5-2: Audio Player — Implementation Spec

**Status:** ✅ Done  
**Implemented:** 2026-04-11

---

## Acceptance Criteria Verification

| AC | Description | Status | Implementation |
|----|-------------|--------|----------------|
| #1 | `AudioPlayer.tsx` uses Expo Audio API for streaming | ✅ | Uses `expo-av` `Audio.Sound.createAsync` with URI source |
| #2 | Play / Pause / Seek controls functional | ✅ | Play/Pause toggle + tap-to-seek on progress bar + restart button |
| #3 | Progress bar shows playback position | ✅ | Animated progress bar with position/duration labels (`mm:ss`) |
| #4 | Audio continues playing if user navigates to another tab | ✅ | Module-level `activeSound` singleton — persists across tab switches |
| #5 | Default state: loads a curated surah (Al-Fatiha + popular reciter) | ✅ | `useSakinah` auto-selects first reciter + Al-Fatiha on mount |
| #6 | Loading state shown while audio buffering | ✅ | `ActivityIndicator` shown during `isAudioLoading` / `isBuffering` |
| #7 | Error state if audio URL fails to load | ✅ | `AlertCircle` icon + rosewood error message displayed |

---

## Files Changed

| File | Change |
|------|--------|
| `apps/mobile-web/components/sakinah/AudioPlayer.tsx` | **NEW** — Full audio player component with seek, progress, error state |
| `apps/mobile-web/app/(tabs)/sakinah.tsx` | **REFACTORED** — Removed inline audio logic, uses `<AudioPlayer>` component |

---

## Architecture Decisions

### Module-Level Audio Singleton
Audio persists across tab navigation by storing `activeSound` at module scope (outside React component). When the user switches tabs, the component unmounts but the sound continues playing. When returning to the Sakinah tab, the component re-syncs with the singleton via polling (`getStatusAsync` every 250ms).

### Polling vs. Callback
We use both:
- **`onPlaybackStatusUpdate` callback** — for `didJustFinish` detection
- **250ms polling** — for position/duration sync (handles tab-switch re-mount)

### Seek Implementation
Uses `onLayout` to capture progress bar width, then calculates seek fraction from `nativeEvent.locationX`. This avoids the RN `currentTarget.props` type issue.

---

## No Backend Changes
All backend infrastructure (audio URL generation, Redis caching) was already implemented in Story 5-1.