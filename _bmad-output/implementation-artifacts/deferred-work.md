# Deferred Work

## Deferred from: code review of 1-1-turborepo-monorepo-setup (2026-04-09)

- **Hardcoded `#A8A29E` in auth.tsx** — `placeholderTextColor` menggunakan hex langsung, bukan design token. Minor cosmetic issue, tidak blocking. [`apps/mobile-web/app/auth.tsx:18`]

## Deferred from: code review of 1-2-database-schema-migration (2026-04-09)

- **AC #3 "prisma migrate dev runs without errors"** — Tidak bisa diverifikasi tanpa PostgreSQL yang sedang berjalan. Membutuhkan live DB untuk menjalankan migrasi. [`packages/database/prisma/schema.prisma`]

## Deferred from: Story 3-2 Task Completion Tracking (2026-04-11)

- **AC #4 "Task completion % shown on manifestation card in dashboard"** — Dashboard belum ada (Epic 6). `TaskChecklist.tsx` sudah menampilkan progress bar di halaman Dua-to-Do, tapi manifestation card di dashboard baru akan dibuat di Story 6.1. Deferred ke Story 6.1 (Dashboard Overview).

## Deferred from: code review of 3-1 & 3-2 (2026-04-11)

- **Missing DTO for PATCH body** — `dua-todo.controller.ts:23` menggunakan inline `{ isCompleted: boolean }` tanpa class-validator DTO. Low risk karena AuthGuard, tapi produksi perlu validation. Defer ke hardening pass. [`apps/server/src/dua-todo/dua-todo.controller.ts`]
- **Race condition on rapid toggle** — `useDuaToDo.ts:43-56` optimistic update bisa konflik jika user tap cepat berturut-turut. Unlikely di praktik. Defer ke UI polish pass. [`apps/mobile-web/hooks/useDuaToDo.ts`]
- **Empty state in TaskChecklist** — Ketika tasks=[], tampilan "0/0" kurang informatif. Perlu design input. Defer ke UI polish pass. [`apps/mobile-web/components/dua-todo/TaskChecklist.tsx`]
