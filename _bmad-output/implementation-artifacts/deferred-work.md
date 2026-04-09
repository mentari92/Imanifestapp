# Deferred Work

## Deferred from: code review of 1-1-turborepo-monorepo-setup (2026-04-09)

- **Hardcoded `#A8A29E` in auth.tsx** — `placeholderTextColor` menggunakan hex langsung, bukan design token. Minor cosmetic issue, tidak blocking. [`apps/mobile-web/app/auth.tsx:18`]