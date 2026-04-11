---
title: 'Voice Recording for HeartPulse'
type: 'feature'
created: '2026-04-11'
status: 'done'
baseline_commit: '0c68ad1b243d174f629ed36cd4d2c49080a0c1a6'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** HeartPulse screen hanya mendukung input teks. User tidak bisa merekam refleksi suara.

**Approach:** Tambahkan komponen VoiceRecorder.tsx dengan expo-av Recording API, integrasikan ke heartpulse.tsx sebagai mode alternatif, dan hook useHeartPulse diperluas untuk submit voice ke POST /heart-pulse/reflect-voice.

## Boundaries & Constraints

**Always:** Gunakan expo-av Recording API, max 2 menit, follow pola hook yang ada (useHeartPulse.ts), styling NativeWind mengikuti design system.

**Ask First:** N/A

**Never:** Jangan ubah backend (sudah ada). Jangan install dependency baru selain yang sudah ada di package.json.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Record & submit | Tap record → speak → stop → submit | Audio sent as FormData, result displayed | Show error toast |
| Max duration | Recording reaches 120s | Auto-stop recording | N/A |
| Permission denied | Mic permission rejected | Show permission message | Disable record button |
| Playback preview | After stop, before submit | Play recorded audio | N/A |

</frozen-after-approval>

## Code Map

- `apps/mobile-web/hooks/useHeartPulse.ts` -- hook yang perlu ditambah submitVoiceReflection
- `apps/mobile-web/components/heart-pulse/VoiceRecorder.tsx` -- komponen baru
- `apps/mobile-web/app/(tabs)/heartpulse.tsx` -- screen perlu mode switch text/voice

## Tasks & Acceptance

**Execution:**
- [x] `apps/mobile-web/hooks/useHeartPulse.ts` -- tambah submitVoiceReflection function yang POST FormData ke /heart-pulse/reflect-voice
- [x] `apps/mobile-web/components/heart-pulse/VoiceRecorder.tsx` -- buat komponen baru dengan record/stop, duration timer, playback preview, submit button
- [x] `apps/mobile-web/app/(tabs)/heartpulse.tsx` -- tambah mode toggle (text/voice), integrasikan VoiceRecorder

**Acceptance Criteria:**
- Given user di HeartPulse screen, when tap voice mode, then VoiceRecorder tampil
- Given user recording, when duration = 120s, then recording auto-stop
- Given user stop recording, when tap play, then audio playback preview
- Given user submit voice, when berhasil, then result (sentiment + streak) ditampilkan

## Verification

**Commands:**
- `cd apps/server && npx jest --no-cache` -- expected: all tests pass (no regressions)