# Story 2.3: ImanSync Rate Limiting & Caching

**Story ID:** 2.3
**Story Key:** 2-3-imansync-rate-limiting
**Epic:** Epic 2 — ImanSync AI Validation Engine
**Status:** done
**Date:** 2026-04-11

---

## Story

**As a** developer
**I want to** cache ImanSync results and rate-limit requests
**So that** Zhipu AI and Quran API costs are controlled

---

## Acceptance Criteria

- [x] Redis cache: same intentText hash → return cached result (TTL 1 hour)
- [x] Rate limit: max 10 text requests per user per hour
- [x] Rate limit: max 5 vision requests per user per hour
- [x] Quran API responses (search) cached in Redis
- [x] 429 response with user-friendly message when limit exceeded
- [x] Cache hit returns result in < 200ms

---

## Tasks / Subtasks

- [x] **Task 1: Implement real RedisService** — Replace placeholder with ioredis-backed implementation
- [x] **Task 2: Add rate limiting to controller** — Implement per-user rate limiting using Redis counters (10 text/hr, 5 vision/hr)
- [x] **Task 3: Add ImanSync result caching** — Cache analysis results by intentText hash (TTL 1 hour)
- [x] **Task 4: Cache Quran API responses** — Cache `searchVerses` results in Redis (TTL 1 hour)
- [x] **Task 5: Write unit tests** — Test rate limiting, caching logic, 429 responses
- [x] **Task 6: Verify build** — Ensure TypeScript compiles cleanly

---

## Dev Notes

### Existing Infrastructure
- `ioredis` already in package.json (v5.4.0)
- `RedisService` exists as placeholder at `apps/server/src/common/redis.service.ts`
- `REDIS_URL` already documented in `.env.example`
- `RedisService` already registered in `app.module.ts` providers

### Task 1: RedisService Implementation
File: `apps/server/src/common/redis.service.ts`
- Use `ioredis` to connect to `process.env.REDIS_URL` (default `redis://localhost:6379`)
- Implement: `get(key)`, `set(key, value, ttlSeconds?)`, `del(key)`, `incr(key)` (for rate limiting)
- Graceful fallback: if Redis not available, log warning and continue (no crash)
- Use `onModuleInit` to connect, `onModuleDestroy` to disconnect

### Task 2: Rate Limiting
File: `apps/server/src/iman-sync/iman-sync.controller.ts`
- Key pattern: `rate:iman-sync:{endpoint}:{userId}` with Redis INCR + EXPIRE
- Text analysis: 10 requests/hour (3600s)
- Vision analysis: 5 requests/hour (3600s)
- Throw HttpException with 429 when exceeded
- If Redis unavailable, allow request through (graceful degradation)

### Task 3: ImanSync Result Caching
File: `apps/server/src/iman-sync/iman-sync.service.ts`
- Cache key: `iman-sync:cache:{sha256(intentText)}`
- TTL: 1 hour (3600s)
- Check before full pipeline, cache after

### Task 4: Quran API Caching
File: `apps/server/src/common/quran-api.service.ts`
- Cache key: `quran:search:{query}:{limit}`
- TTL: 1 hour (3600s)

### Architecture Patterns
- All Redis keys use namespace prefixes
- `crypto.createHash('sha256')` for cache key hashing
- Redis unavailability NEVER crashes the app — try/catch with fallback

---

## Dev Agent Record

### Implementation Plan
- Replace RedisService placeholder with real ioredis implementation
- Add rate limiting guards to controller
- Add caching to service and Quran API
- Write comprehensive tests

### Debug Log
No issues encountered during implementation.

### Completion Notes
- Implemented full RedisService with ioredis: get, set, del, incr with graceful degradation
- Added per-user rate limiting: 10 text/hr, 5 vision/hr via Redis INCR counters
- Added ImanSync result caching by SHA256(intentText) hash with 1-hour TTL
- Added Quran API search result caching with 1-hour TTL
- 12 unit tests covering rate limiting (429), cache hit/miss, graceful degradation
- All tests pass (2 suites, 12 tests)

---

## File List

| File | Status | Description |
|------|--------|-------------|
| `apps/server/src/common/redis.service.ts` | Modified | Real ioredis implementation with get/set/del/incr and graceful degradation |
| `apps/server/src/iman-sync/iman-sync.controller.ts` | Modified | Added per-user rate limiting (10 text/hr, 5 vision/hr) with 429 responses |
| `apps/server/src/iman-sync/iman-sync.service.ts` | Modified | Added Redis caching for analyze results by intentText hash |
| `apps/server/src/common/quran-api.service.ts` | Modified | Added Redis caching for searchVerses results (TTL 1hr) |
| `apps/server/src/iman-sync/iman-sync.module.ts` | Modified | Added RedisService to providers |
| `apps/server/src/iman-sync/iman-sync.controller.spec.ts` | Modified | 6 controller tests (rate limiting, 429, graceful degradation) |
| `apps/server/src/iman-sync/iman-sync.service.spec.ts` | Modified | 6 service tests (cache hit/miss, full pipeline, vision) |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-04-11 | Story created — rate limiting & caching for ImanSync |
| 2026-04-11 | All tasks complete — RedisService, rate limiting, caching, 12 tests passing |