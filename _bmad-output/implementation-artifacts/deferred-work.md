# Deferred Work

## Resolved (2026-04-11 — Hardening Pass)

All previously deferred items have been fixed:

- ✅ **Hardcoded `#A8A29E` in auth.tsx** — Replaced with `colors.ink.disabled` design token from shared theme package. [`apps/mobile-web/app/auth.tsx`]
- ✅ **Missing DTO for PATCH body** — Created `UpdateTaskDto` with `@IsBoolean()` class-validator. [`apps/server/src/dua-todo/dto/update-task.dto.ts`]
- ✅ **Race condition on rapid toggle** — Added `pendingToggles` ref (Set) in `useDuaToDo` to prevent concurrent toggles on the same task. [`apps/mobile-web/hooks/useDuaToDo.ts`]
- ✅ **Empty state in TaskChecklist** — Added informative empty state message: "No tasks yet. Generate an action plan to get started." [`apps/mobile-web/components/dua-todo/TaskChecklist.tsx`]
- ✅ **`fetchQuranFoundationStreak` dead code** — Annotated with ⚠️ INTENTIONAL STUB JSDoc. Will be activated when QF API is ready. [`apps/server/src/heart-pulse/heart-pulse.service.ts`]

## Still Deferred (External Dependencies)

- **AC #3 "prisma migrate dev runs without errors"** — Requires running PostgreSQL instance. Cannot verify without live DB. [`packages/database/prisma/schema.prisma`]