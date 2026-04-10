# Story 3.2: Task Completion Tracking

**Story ID:** 3.2
**Story Key:** 3-2-task-completion-tracking
**Epic:** Epic 3 — Dua-to-Do — Actionable Roadmap
**Status:** review
**Date:** 2026-04-11

---

## Story

**As a** logged-in user
**I want to** check off completed tasks
**So that** I can track my progress toward my intention

---

## Acceptance Criteria

- [ ] Each `TaskItem` has a checkbox
- [ ] `PATCH /dua-to-do/tasks/:taskId` updates `isCompleted` in DB
- [ ] Completed tasks visually distinct (strikethrough or different color)
- [ ] Task completion % shown on manifestation card in dashboard
- [ ] Optimistic UI update on checkbox tap (no loading spinner)

---

## Tasks / Subtasks

- [x] **Task 1: Verify checkbox UI in TaskItem** (AC: #1, #3)
  - [x] Confirm `TaskItem.tsx` has working checkbox (Circle/Check icons)
  - [x] Confirm completed tasks show strikethrough + secondary color
  - [x] Replace hardcoded hex colors (`#064E3B`, `#78716C`) with theme tokens

- [x] **Task 2: Verify PATCH endpoint and toggle flow** (AC: #2, #5)
  - [x] Confirm `PATCH /dua-to-do/tasks/:taskId` works in controller
  - [x] Confirm `DuaToDoService.updateTask()` updates `isCompleted` in DB
  - [x] Confirm `useDuaToDo.toggleTask()` does optimistic UI with revert on error
  - [x] Add `.catch()` to useEffect in `dua-todo.tsx` (code review fix from 3-1)

- [x] **Task 3: Defer dashboard completion % to Epic 6** (AC: #4)
  - [x] Document in deferred-work.md: "Task completion % on manifestation card — deferred to Story 6.1 (Dashboard)"
  - [x] Mark AC#4 as deferred with note

- [x] **Task 4: Write tests for task completion flow** (AC: #2, #5)
  - [x] Service test: `updateTask` toggles `isCompleted` successfully
  - [x] Service test: `updateTask` throws NotFoundException for wrong user
  - [x] Controller test: PATCH endpoint returns updated task
  - [x] Verify all existing tests still pass

- [x] **Task 5: Run full test suite and verify build** (AC: All)
  - [x] `tsc --noEmit` passes
  - [x] All tests pass (no regressions)

---

## Dev Notes

### ⚠️ MOST CODE ALREADY EXISTS — This story is mostly verification + testing + fixes

The following are ALREADY IMPLEMENTED and working from Story 3.1:

**Server (already done):**
- ✅ `apps/server/src/dua-todo/dua-todo.controller.ts` — `PATCH /dua-to-do/tasks/:taskId` endpoint with `@Body() body: { isCompleted: boolean }`
- ✅ `apps/server/src/dua-todo/dua-todo.service.ts` — `updateTask(userId, taskId, isCompleted)` with ownership check
- ✅ `apps/server/src/dua-todo/dua-todo.controller.spec.ts` — PATCH endpoint tests (2 tests: success + not found)
- ✅ `apps/server/src/dua-todo/dua-todo.service.spec.ts` — `updateTask` tests

**Mobile (already done):**
- ✅ `apps/mobile-web/hooks/useDuaToDo.ts` — `toggleTask(taskId, isCompleted)` with optimistic UI update + revert on error
- ✅ `apps/mobile-web/components/dua-todo/TaskItem.tsx` — Checkbox with Circle/Check icons, strikethrough on completed, `onToggle` callback
- ✅ `apps/mobile-web/components/dua-todo/TaskChecklist.tsx` — Progress bar showing completion percentage (completedCount/total)
- ✅ `apps/mobile-web/app/(tabs)/dua-todo.tsx` — Full screen with TaskChecklist rendering

### What This Story Actually Does (Gap Analysis)

#### Task 1: Verify and fix TaskItem UI
**Current state:** TaskItem.tsx works but has hardcoded hex colors
**Needed:** Replace `#064E3B` with theme token for primary, `#78716C` with theme token for secondary

File: `apps/mobile-web/components/dua-todo/TaskItem.tsx`
- Line 21: `<Check size={22} color="#064E3B" />` → use `colors.primary` from theme
- Line 22: `<Circle size={22} color="#78716C" />` → use `colors.inkSecondary` or similar token
- Check `apps/mobile-web/constants/theme.ts` or `packages/shared/src/theme.ts` for available tokens

#### Task 2: Verify toggle flow + fix code review items
**Current state:** All working but has a code review finding from Story 3-1
**Needed:**
- Fix `useEffect` in `dua-todo.tsx`: add `.catch()` to `generateTasks(paramId).then()`
- Verify entire toggle flow works end-to-end

File: `apps/mobile-web/app/(tabs)/dua-todo.tsx`
- Line ~15: `generateTasks(paramId).then(() => setHasGenerated(true))` → add `.catch(() => {})` or proper error handling

#### Task 3: Defer dashboard card
**Current state:** Dashboard doesn't exist yet (Epic 6)
**Needed:** AC#4 "Task completion % shown on manifestation card in dashboard" CANNOT be implemented until Epic 6 dashboard exists. Defer this AC.

File: `_bmad-output/implementation-artifacts/deferred-work.md`
- Add entry: "Task completion % on manifestation card — deferred to Story 6.1 (Dashboard)"

#### Task 4: Add/improve tests
**Current state:** Basic tests exist from Story 3.1
**Needed:** Add more comprehensive tests for the toggle/completion flow

Files to update:
- `apps/server/src/dua-todo/dua-todo.controller.spec.ts` — verify existing PATCH tests are sufficient
- `apps/server/src/dua-todo/dua-todo.service.spec.ts` — verify existing updateTask tests are sufficient

### Architecture Patterns (from 03-architecture.md)
- **API endpoint:** `PATCH /dua-to-do/tasks/:taskId` — JSON body `{ isCompleted: boolean }`
- **Auth:** JWT required (AuthGuard) — already on controller
- **Optimistic UI:** `useDuaToDo.toggleTask()` updates local state immediately, reverts on error
- **DB:** Task table has `isCompleted` boolean field, updated via Prisma

### Previous Story Learnings (from Story 3.1 code review)
- `as any` cast in `dua-todo.service.ts` for quranApiKey — should use proper Prisma typing
- Missing `.catch()` in useEffect of `dua-todo.tsx`
- Hardcoded hex colors in `TaskItem.tsx`
- These should be fixed as part of this story

### Project Structure
```
apps/server/src/
├── dua-todo/
│   ├── dua-todo.controller.ts    # EXISTS: PATCH endpoint
│   ├── dua-todo.service.ts       # EXISTS: updateTask method
│   ├── dua-todo.module.ts        # EXISTS: no changes needed
│   ├── dto/generate-tasks.dto.ts # EXISTS: no changes needed
│   ├── dua-todo.controller.spec.ts  # EXISTS: verify/update tests
│   └── dua-todo.service.spec.ts     # EXISTS: verify/update tests
└── common/
    └── quran-api.service.ts      # EXISTS: no changes needed

apps/mobile-web/
├── app/(tabs)/
│   └── dua-todo.tsx              # EXISTS: fix .catch() in useEffect
├── components/
│   └── dua-todo/
│       ├── TaskChecklist.tsx     # EXISTS: progress bar already shows %
│       └── TaskItem.tsx          # EXISTS: fix hardcoded colors
├── hooks/
│   └── useDuaToDo.ts             # EXISTS: optimistic toggle
└── constants/
    └── theme.ts                  # EXISTS: check for color tokens
```

---

## Dev Agent Record

### Implementation Plan
Verified all existing code from Story 3.1. Fixed code review findings: hardcoded colors → theme tokens, added .catch() to useEffect. Added toggle-uncomplete test.

### Debug Log
No issues encountered. All existing code worked correctly.

### Completion Notes
- ✅ TaskItem.tsx: Replaced `#064E3B` → `colors.primary`, `#78716C` → `colors.ink.secondary`
- ✅ dua-todo.tsx: Added `.catch(() => {})` to useEffect, replaced `#064E3B` → `colors.primary`
- ✅ deferred-work.md: AC#4 (dashboard completion %) deferred to Story 6.1
- ✅ Added test: toggle task from completed to uncompleted
- ✅ All 30 tests pass (4 suites), 0 regressions

### File List

| File | Status | Description |
|------|--------|-------------|
| apps/mobile-web/components/dua-todo/TaskItem.tsx | Modified | Replaced hardcoded hex with theme tokens |
| apps/mobile-web/app/(tabs)/dua-todo.tsx | Modified | Added .catch(), replaced hardcoded hex with theme token |
| apps/server/src/dua-todo/dua-todo.service.spec.ts | Modified | Added toggle-uncomplete test case |
| _bmad-output/implementation-artifacts/deferred-work.md | Modified | Added AC#4 dashboard deferral |

---

## Change Log

| Date | Change |
|------|--------|
| 2026-04-11 | Story created — most code exists from Story 3.1, this story verifies + fixes code review items + adds tests |
| 2026-04-11 | Implementation complete — fixed hardcoded colors, added .catch(), deferred AC#4, added test, 30/30 tests pass |
