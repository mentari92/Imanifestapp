# Story 6-1: Dashboard Overview — Implementation Spec

**Status:** ✅ Done  
**Epic:** 6 — Dashboard & Navigation  
**Last Updated:** 2026-04-11

---

## Summary

A centralized Dashboard tab that aggregates spiritual progress data from all features — ImanSync, Dua-to-Do, HeartPulse, and SakinahStream — into a single glanceable view.

---

## Backend

### New Files
- `apps/server/src/dashboard/dashboard.service.ts`
- `apps/server/src/dashboard/dashboard.controller.ts`
- `apps/server/src/dashboard/dashboard.module.ts`

### API Endpoint

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/dashboard/overview` | JWT | Returns aggregated stats, 7-day sentiment, and recent manifestations |

### Response Shape

```typescript
{
  stats: {
    totalManifestations: number;
    totalTasks: number;
    completedTasks: number;
    currentStreak: number;
  };
  sentiment7Days: {
    date: string;       // "YYYY-MM-DD"
    sentiment: string;  // e.g. "hopeful", "anxious"
    score: number;      // 0.0–1.0
  }[];
  manifestations: {
    id: string;
    title: string;       // truncated to 50 chars
    createdAt: string;
    taskTotal: number;
    taskCompleted: number;
    completionPct: number; // 0–100
  }[];
}
```

### Key Implementation Details
- **Streak calculation**: Counts consecutive days backwards from today/yesterday using `Reflection.streakDate`. A reflection must exist for each day.
- **7-day sentiment**: Queries reflections from the last 7 days with non-null sentiment.
- **Manifestation history**: Returns last 20 manifestations ordered by `createdAt desc`, with task completion percentages.
- Registered in `AppModule` alongside other feature modules.

---

## Frontend

### New Files
- `apps/mobile-web/hooks/useDashboard.ts` — data-fetching hook
- `apps/mobile-web/app/(tabs)/dashboard.tsx` — Dashboard tab screen

### Modified Files
- `apps/mobile-web/app/(tabs)/_layout.tsx` — added Dashboard as first tab with `LayoutDashboard` icon

### UI Components (inline in dashboard.tsx)

| Component | Description |
|-----------|-------------|
| `StatsCard` | 3-column grid: Intentions count, Tasks Done, Day Streak |
| `SentimentChart` | 7-day bar chart with green (positive) / burgundy (negative) bars |
| `ManifestationCard` | Card with title, date, and completion progress bar |
| `QuickActions` | 3-button row: New Intention, New Reflection, SakinahStream |
| `EmptyState` | Shown when no data exists — CTA to create first intention |

### UX Behaviors
- Pull-to-refresh via `RefreshControl`
- Loading spinner on first load
- Error message on API failure
- Empty state with navigation CTA when no data exists
- Quick action buttons navigate to respective tabs

---

## Design Compliance
- Uses theme tokens: `bg-background`, `bg-surface`, `text-primary`, `text-ink-secondary`, `border-border`
- Font classes: `font-display` for headings, `font-sans` for body
- Rounded corners: `rounded-2xl` for cards, `rounded-button` for CTAs
- Color coding: `#064E3B` (green/primary), `#54161B` (burgundy/streak), `#E3C567` (gold/sakinah)