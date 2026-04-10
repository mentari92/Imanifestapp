# Story 3.1: Checklist Generation

**Story ID:** 3.1
**Story Key:** 3-1-checklist-generation
**Epic:** Epic 3 — Dua-to-Do — Actionable Roadmap
**Status:** review
**Date:** 2026-04-11

---

## Story

**As a** logged-in user
**I want to** get a 5-step action plan from my ImanSync result
**So that** I have concrete steps to act on my intention

---

## Acceptance Criteria

- [x] "Generate Action Plan" button on ImanSync result screen (after verses shown)
- [x] `POST /dua-to-do/generate` accepts `{ manifestationId }` (ALREADY EXISTS)
- [x] Loads manifestation + verses from DB (ALREADY EXISTS)
- [x] GLM-5 generates 5 Ikhtiar steps as JSON (ALREADY EXISTS)
- [x] Steps saved to `Task` table linked to manifestation (ALREADY EXISTS)
- [x] Steps POSTed to Quran Foundation User API (Goals) — store `quranGoalId` on each Task row
- [x] `TaskChecklist.tsx` renders 5 `TaskItem` rows (extract from inline dua-todo.tsx)
- [x] Response within 6 seconds
- [x] Unit tests for controller + service

---

## Tasks / Subtasks

- [x] **Task 1: Wire "Generate Action Plan" button to ImanSyncResult** (AC: #1)
  - [x] In `ImanSyncResult.tsx`, add "Generate Action Plan" button below verse cards
  - [x] On press: navigate to dua-todo tab with manifestationId parameter
  - [x] Pass manifestationId via router params (Expo Router)

- [x] **Task 2: Update dua-todo screen to accept manifestationId from params** (AC: #1, #7)
  - [x] Read manifestationId from router params in `dua-todo.tsx`
  - [x] If param exists, auto-trigger `generateTasks()` (skip manual input screen)
  - [x] If no param, show current manual input (backward compatible)
  - [x] Extract `TaskChecklist` and `TaskItem` as separate components

- [x] **Task 3: Implement Quran Foundation Goals API integration** (AC: #6)
  - [x] Add `postGoal()` method to `QuranApiService` for posting to Quran Foundation User API Goals endpoint
  - [x] In `DuaToDoService.generateTasks()`, after saving each task to DB, POST to Goals API
  - [x] Store returned `quranGoalId` on each `Task` row
  - [x] Graceful fallback: if Goals API fails, log warning and continue (quranGoalId stays null)

- [x] **Task 4: Write unit tests** (AC: #8, #9)
  - [x] Controller tests: generate endpoint, task update, get tasks, auth guard
  - [x] Service tests: generate tasks flow, Quran Goals API integration, ownership check, not found
  - [x] Goal API integration: success stores quranGoalId, failure continues gracefully

- [x] **Task 5: Verify build and full test suite** (AC: #8)
  - [x] `tsc --noEmit` passes
  - [x] All tests pass (iman-sync + dua-todo)

---

## Dev Notes

### ⚠️ MOST CODE ALREADY EXISTS — This story is mostly wiring + testing

The following are ALREADY IMPLEMENTED and working:

**Server (already done):**
- ✅ `apps/server/src/dua-todo/dua-todo.service.ts` — `generateTasks()`, `updateTask()`, `getTasks()`
- ✅ `apps/server/src/dua-todo/dua-todo.controller.ts` — `POST /dua-to-do/generate`, `PATCH /dua-to-do/tasks/:taskId`, `POST /dua-to-do/tasks`
- ✅ `apps/server/src/dua-todo/dto/generate-tasks.dto.ts` — `{ manifestationId: string }`
- ✅ `apps/server/src/dua-todo/dua-todo.module.ts` — registered in app.module.ts
- ✅ `apps/server/src/common/zhipu.service.ts` — `generateTasks()` method using GLM-5
- ✅ `packages/database/prisma/schema.prisma` — `Task` model with `quranGoalId` field

**Mobile (already done):**
- ✅ `apps/mobile-web/hooks/useDuaToDo.ts` — `generateTasks()`, `toggleTask()` with optimistic update, `reset()`
- ✅ `apps/mobile-web/app/(tabs)/dua-todo.tsx` — Full UI: input → generate → checklist with progress bar
- ✅ Task checkbox toggling with optimistic UI
- ✅ Progress bar showing completion percentage
- ✅ Loading/error states

### What This Story Actually Does (Gap Analysis)

#### Task 1: Wire ImanSync → Dua-to-Do
**Current state:** ImanSyncResult.tsx shows verses + summary but has NO action button
**Needed:** Add "Generate Action Plan" button that navigates to dua-todo with manifestationId

File: `apps/mobile-web/components/iman-sync/ImanSyncResult.tsx`
- Add a `<Pressable>` button below the verse cards section
- Use `router.push({ pathname: "/(tabs)/dua-todo", params: { manifestationId: result.manifestationId } })` 
- Import `useRouter` from `expo-router`
- Style: same as submit button (bg-primary, rounded-2xl, with Sparkles icon)

#### Task 2: Accept manifestationId from params
**Current state:** dua-todo.tsx requires manual manifestationId text input
**Needed:** If router param `manifestationId` exists, auto-trigger generate and skip input screen

File: `apps/mobile-web/app/(tabs)/dua-todo.tsx`
- Import `useLocalSearchParams` from `expo-router`
- Check for `manifestationId` param on mount
- If present: auto-call `generateTasks(manifestationId)` and set `hasGenerated = true`
- If absent: show current manual input UI (backward compatible)
- Extract `TaskChecklist` component to `apps/mobile-web/components/dua-todo/TaskChecklist.tsx`
- Extract `TaskItem` component to `apps/mobile-web/components/dua-todo/TaskItem.tsx`

#### Task 3: Quran Foundation Goals API
**Current state:** `quranGoalId` field exists on Task but is never populated
**Needed:** POST each task to Quran Foundation User API Goals endpoint

File: `apps/server/src/common/quran-api.service.ts`
- Add `postGoal(userId: string, taskDescription: string): Promise<string | null>`
- Endpoint: Quran Foundation User API Goals — check architecture doc for URL
- If API unavailable or fails: return null (graceful degradation)

File: `apps/server/src/dua-todo/dua-todo.service.ts`
- After creating each task in DB, call `quranApi.postGoal()`
- Update task with returned `quranGoalId`
- Wrap in try/catch — failure to post goal MUST NOT block task creation

### Architecture Patterns (from 03-architecture.md)
- **API endpoint:** `POST /dua-to-do/generate` — JSON body `{ manifestationId }`
- **Auth:** JWT required (AuthGuard) — already on controller
- **Response time target:** < 6 seconds
- **GLM-5 model:** `glm-4-flash` (text) — already configured
- **DB:** Task table linked to Manifestation via `manifestationId`
- **Error handling:** NotFoundException for missing manifestation/task

### Previous Story Learnings (Epic 2)
- Zhipu API uses OpenAI-compatible endpoint: `/chat/completions`
- Model: `glm-4-flash` for text tasks
- JSON responses from GLM may include markdown code blocks — `parseJSONResponse` handles this
- Fallback arrays used when AI fails
- `Prisma.DbNull` used for empty JSON fields
- `RedisService` available for caching (try/catch with graceful fallback)
- Cache key pattern: `namespace:subtype:identifier` (e.g., `dua-todo:tasks:{manifestationId}`)

### Project Structure
```
apps/server/src/
├── common/
│   ├── zhipu.service.ts          # EDIT: verify generateTasks method
│   ├── quran-api.service.ts      # EDIT: add postGoal method
│   └── redis.service.ts          # EXISTS: available for caching
├── dua-todo/
│   ├── dua-todo.controller.ts    # EXISTS: no changes needed
│   ├── dua-todo.service.ts       # EDIT: add Goals API integration
│   ├── dua-todo.module.ts        # EXISTS: no changes needed
│   ├── dto/generate-tasks.dto.ts # EXISTS: no changes needed
│   ├── dua-todo.controller.spec.ts  # CREATE: controller tests
│   └── dua-todo.service.spec.ts     # CREATE: service tests
└── iman-sync/
    └── ...                        # EXISTS: no changes needed

apps/mobile-web/
├── app/(tabs)/
│   ├── dua-todo.tsx              # EDIT: accept params, auto-generate
│   └── index.tsx                 # NO changes (iman-sync tab)
├── components/
│   ├── iman-sync/
│   │   └── ImanSyncResult.tsx    # EDIT: add "Generate Action Plan" button
│   └── dua-todo/
│       ├── TaskChecklist.tsx     # CREATE: extracted checklist component
│       └── TaskItem.tsx          # CREATE: extracted task row component
├── hooks/
│   └── useDuaToDo.ts             # EXISTS: no changes needed
└── constants/
    └── theme.ts                  # EXISTS: theme tokens
```

---

## Dev Agent Record

### Implementation Plan
- Analyze existing code and identify gaps
- Wire ImanSyncResult → Dua-to-Do navigation
- Add Quran Goals API integration
- Extract components and add tests

### Debug Log

### Completion Notes

- ✅ Task 1: Added "Generate Action Plan" button to ImanSyncResult.tsx with router navigation to dua-todo tab
- ✅ Task 2: Updated dua-todo.tsx to read manifestationId from router params, auto-trigger generation, extracted TaskChecklist and TaskItem components
- ✅ Task 3: Added postGoal() method to QuranApiService, integrated into DuaToDoService.generateTasks() with graceful fallback
- ✅ Task 4: Created controller spec (6 tests) and service spec (11 tests) — all 29 tests pass (no regressions)
- ✅ Task 5: Full test suite passes — 4 suites, 29 tests, 0 failures

### File List

| File | Status | Description |
|------|--------|-------------|
| `apps/mobile-web/components/iman-sync/ImanSyncResult.tsx` | Modified | Added "Generate Action Plan" button with router navigation |
| `apps/mobile-web/app/(tabs)/dua-todo.tsx` | Modified | Accept manifestationId from params, auto-trigger generation |
| `apps/mobile-web/components/dua-todo/TaskChecklist.tsx` | Created | Extracted checklist component with progress bar |
| `apps/mobile-web/components/dua-todo/TaskItem.tsx` | Created | Extracted task row component with checkbox |
| `apps/server/src/common/quran-api.service.ts` | Modified | Added postGoal() method for Quran Foundation Goals API |
| `apps/server/src/dua-todo/dua-todo.service.ts` | Modified | Integrated Quran Goals API with graceful fallback |
| `apps/server/src/dua-todo/dua-todo.module.ts` | Modified | Added QuranApiService and RedisService providers |
| `apps/server/src/dua-todo/dua-todo.controller.spec.ts` | Created | Controller unit tests (6 tests) |
| `apps/server/src/dua-todo/dua-todo.service.spec.ts` | Created | Service unit tests (11 tests) |

---

### Review Findings

- [ ] [Review][Patch] `as any` cast for quranApiKey access [`dua-todo.service.ts`:~63] — Prisma query already includes user select; should use proper typing instead of `as any`
- [ ] [Review][Patch] Unhandled promise rejection in useEffect [`dua-todo.tsx`:~15] — `generateTasks().then()` needs `.catch()` to prevent silent crash
- [ ] [Review][Patch] Hardcoded hex colors in TaskItem [`TaskItem.tsx`:21-22] — `#064E3B` and `#78716C` should reference theme tokens
- [x] [Review][Defer] Promise.all ordering — task creation order not guaranteed [`dua-todo.service.ts`] — deferred, pre-existing design choice

---

## Change Log

| Date | Change |
|------|--------|
| 2026-04-11 | Story created — most code exists from prior implementation, this story wires ImanSync→DuaToDo + Goals API + tests |
| 2026-04-11 | Implementation complete — all 5 tasks done, 29 tests passing, status set to review |
