---
title: 'Reciter & Surah Browser for SakinahStream'
type: 'feature'
created: '2026-04-11'
status: 'ready-for-dev'
baseline_commit: 'b8fec11061e565d0af1e09c0d7f9fb9d9257abf9'
context:
  - 'Brain/04-epics-and-stories.md#Story 5.1'
  - 'Brain/03-architecture.md#Section 4 (API Design)'
  - 'Brain/03-architecture.md#Section 5 (Caching Strategy)'
  - 'Brain/05-design-system.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** SakinahStream screen sudah punya backend endpoints dan frontend inline list, tapi:
1. Reciter list dan surah list belum di-cache di Redis (sesuai arsitektur, TTL 24 jam) — setiap load memukul Quran Foundation API langsung
2. Komponen ReciterList dan SurahList belum diekstrak ke file terpisah sesuai struktur folder arsitektur (`components/sakinah/`)
3. Audio URL response juga belum di-cache (TTL 1 jam sesuai arsitektur)

**Approach:** 
1. Tambahkan Redis caching ke `SakinahService` menggunakan pola `RedisService` yang sudah ada di `common/`
2. Ekstrak `ReciterList.tsx` dan `SurahList.tsx` ke folder `components/sakinah/`
3. Refactor `sakinah.tsx` untuk menggunakan komponen yang sudah diekstrak

## Boundaries & Constraints

**Always:** 
- Gunakan `RedisService` yang sudah ada di `apps/server/src/common/redis.service.ts` (inject ke SakinahModule)
- Follow pola caching yang sudah ada di `ImanSyncService` (cache-through pattern)
- Styling NativeWind mengikuti design system (Forest Green primary, existing class names)
- Cache keys sesuai arsitektur: `sakinah:reciters` TTL 86400s, `sakinah:audio:{reciterId}:{surahNumber}` TTL 3600s

**Ask First:** N/A

**Never:** 
- Jangan ubah API endpoint signatures (sudah dipakai frontend)
- Jangan install dependency baru
- Jangan ubah logika fallback reciter/surah di service (sudah bagus)
- Jangan hapus inline list styles yang sudah ada — pindahkan ke komponen baru

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| First load reciters | Redis empty | Fetch from Quran API → cache in Redis → return | Fallback reciters jika API error |
| Cached load reciters | Redis has `sakinah:reciters` | Return from Redis cache, skip API call | Re-fetch jika Redis error |
| First load surahs | Redis empty | Fetch from Quran API → return (no cache for surahs per arch) | Fallback 114 surahs |
| Select reciter + surah | Both selected | GET /sakinah/audio → cache URL in Redis | Error message di UI |
| Audio URL cached | Redis has `sakinah:audio:7:1` | Return cached URL < 200ms | Re-fetch jika Redis error |
| No login required | Unauthenticated request | All /sakinah/* routes accessible | N/A — @Public() already set |

</frozen-after-approval>

## Code Map

### Backend (to modify)
- `apps/server/src/sakinah/sakinah.service.ts` — tambah Redis caching untuk `getReciters()` dan `getAudioUrl()`
- `apps/server/src/sakinah/sakinah.module.ts` — import `RedisModule` agar `RedisService` available

### Frontend (to create)
- `apps/mobile-web/components/sakinah/ReciterList.tsx` — komponen baru (extract dari sakinah.tsx lines 171-202)
- `apps/mobile-web/components/sakinah/SurahList.tsx` — komponen baru (extract dari sakinah.tsx lines 204-244)

### Frontend (to modify)
- `apps/mobile-web/app/(tabs)/sakinah.tsx` — refactor untuk import & gunakan ReciterList + SurahList

### Existing (read-only reference)
- `apps/server/src/common/redis.service.ts` — RedisService dengan `get()`, `set()`, `isAvailable()` methods
- `apps/server/src/common/redis.module.ts` — RedisModule provider
- `apps/server/src/iman-sync/iman-sync.service.ts` — contoh pola caching yang sudah ada

## Tasks & Acceptance

**Execution:**
- [ ] `apps/server/src/sakinah/sakinah.module.ts` — import `RedisModule` dari `common/redis.module`
- [ ] `apps/server/src/sakinah/sakinah.service.ts` — inject `RedisService`, tambah caching:
  - `getReciters()`: check Redis key `sakinah:reciters` → jika ada, parse & return. Jika tidak, fetch API → cache (TTL 86400s) → return
  - `getAudioUrl()`: check Redis key `sakinah:audio:{reciterId}:{surahNumber}` → jika ada, parse & return. Jika tidak, generate URL → cache (TTL 3600s) → return
  - `getSurahs()`: no cache per architecture (surahs rarely change but architecture only specifies reciter caching) — keep as-is
- [ ] `apps/mobile-web/components/sakinah/ReciterList.tsx` — extract dari sakinah.tsx: FlatList reciter dengan selection highlight
- [ ] `apps/mobile-web/components/sakinah/SurahList.tsx` — extract dari sakinah.tsx: FlatList surah dengan number badge + selection highlight
- [ ] `apps/mobile-web/app/(tabs)/sakinah.tsx` — import ReciterList & SurahList, ganti inline FlatList sections

**Acceptance Criteria:**
1. Given reciters loaded pertama kali, when GET /sakinah/reciters dipanggil, then data di-cache di Redis key `sakinah:reciters` dengan TTL 24 jam
2. Given reciters sudah di-cache, when GET /sakinah/reciters dipanggil lagi, then response dari Redis cache (no API call)
3. Given audio URL di-request, when GET /sakinah/audio?reciterId=7&surahNumber=1, then URL di-cache di Redis key `sakinah:audio:7:1` dengan TTL 1 jam
4. Given user buka SakinahStream, when melihat reciter list, then ReciterList component menampilkan daftar reciter dengan selection highlight
5. Given user buka SakinahStream, when melihat surah list, then SurahList component menampilkan 114 surah dengan Arabic name + English name + number badge
6. Given user belum login, when akses /sakinah/* routes, then semua endpoint accessible tanpa auth
7. Given Redis unavailable, when request reciters, then fallback ke direct API call (graceful degradation)

## Dev Notes

### Architecture Compliance
- Cache keys harus sesuai `Brain/03-architecture.md#Section 5`: `sakinah:reciters` TTL 86400s, `sakinah:audio:{r}:{c}` TTL 3600s
- Folder structure harus sesuai `Brain/03-architecture.md#Section 2`: components di `components/sakinah/`
- `@Public()` decorator sudah ada di controller — jangan dihapus

### Caching Pattern Reference
Lihat `apps/server/src/iman-sync/iman-sync.service.ts` untuk contoh pola cache-through:
```typescript
// Pattern: check cache → return if hit → fetch → cache → return
const cached = await this.redisService.get('sakinah:reciters');
if (cached) return JSON.parse(cached);
// ... fetch from API ...
await this.redisService.set('sakinah:reciters', JSON.stringify(data), 86400);
return data;
```

### RedisService Graceful Degradation
`RedisService.get()` returns `null` jika Redis unavailable — safe untuk dipakai langsung tanpa try/catch tambahan. `RedisService.set()` no-op jika Redis unavailable.

### Component Extraction Notes
Saat extract ReciterList dan SurahList, pertahankan:
- Prop types yang sama (Reciter/Surah interfaces dari useSakinah hook)
- Styling class names yang sama (NativeWind)
- Selection highlight logic (`bg-primary/10` untuk selected item)
- `onSelect` callback pattern

### Surah Caching Decision
Architecture hanya specify caching untuk reciters (TTL 24h) dan audio URLs (TTL 1h). Surah list (114 items, static) tidak di-cache di Redis per architecture doc. Surah data selalu fetch dari API dengan fallback.

### Project Structure Notes
- Folder `apps/mobile-web/components/sakinah/` belum ada — perlu dibuat
- Backend module structure sudah benar, hanya perlu import RedisModule

### References
- [Source: Brain/03-architecture.md#Section 4] — API Design for /sakinah/* endpoints
- [Source: Brain/03-architecture.md#Section 5] — Caching Strategy (key patterns & TTLs)
- [Source: Brain/03-architecture.md#Section 2] — Folder Structure (components/sakinah/)
- [Source: Brain/04-epics-and-stories.md#Story 5.1] — Epic acceptance criteria
- [Source: apps/server/src/common/redis.service.ts] — RedisService API

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List