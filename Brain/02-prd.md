# Product Requirements Document (PRD)
# ImanifestApp – AI-Powered Spiritual Productivity Platform

**Version:** 1.0  
**Status:** Final — Ready for Development

---

## 1. Overview

ImanifestApp is a spiritual productivity platform with 4 core features:

1. **ImanSync** — User submits intention (text or image) → GLM-5 returns 3 relevant Quranic verses with tafsir
2. **Dua-to-Do** — GLM-5 converts ImanSync verses into a 5-step Ikhtiar checklist, saved to Quran Foundation Goals API
3. **HeartPulse** — Voice or text journaling → GLM-5 sentiment analysis → streak tracking via Quran Foundation User API
4. **SakinahStream** — Recitation audio player streaming from Quran Foundation Audio API

All features are free for registered users in the hackathon MVP.

---

## 2. User Personas

### Persona 1: The Intentional Muslim Millennial
- Name: Aisha, 26, Kuala Lumpur
- Uses productivity tools (Notion, Todoist) but wants faith integration
- Pain: her duas feel disconnected from her actual actions
- Goal: see Quranic backing for her daily intentions + have a concrete action plan
- Behavior: mobile-first, uses voice notes

### Persona 2: The Daily Quran Listener
- Name: Yusuf, 32, London
- Listens to Quran during commute
- Pain: wants to listen in a calm UI without ads or distractions
- Goal: focused recitation experience with curated reciters
- Behavior: uses SakinahStream as entry point, discovers ImanSync later

---

## 3. Functional Requirements

### FR-01: Authentication
- OAuth2 login via Quran.com (primary)
- Email/password fallback (if OAuth2 not ready in hackathon timeframe)
- `quranApiKey` stored in User table for per-user Quran API access (optional)
- Session managed via Supabase Auth or Clerk JWT
- Protected routes: `/dashboard`, `/iman-sync`, `/dua-to-do`, `/heart-pulse`
- SakinahStream: publicly accessible, no login required

### FR-02: ImanSync — Text Input
- Free text field: max 500 characters
- Optional image upload: max 5MB, JPG/PNG
- On submission:
  1. If image present: GLM-5V (vision) analyzes image + intent text together
  2. If text only: GLM-5 (text) extracts spiritual themes
  3. Both paths: query Quran Foundation Content API → return 3 verses with translation + tafsir snippet
  4. GLM-5 generates a 2-sentence spiritual validation summary
- Result saved to `Manifestation` table
- Response time target: < 8 seconds

### FR-03: ImanSync — Image Upload (Vision)
- User uploads image alongside intention text
- GLM-5V processes image + text in one multimodal prompt
- Returns same structure as FR-02 (3 verses + summary)
- Accepted types: JPG, PNG
- Max size: 5MB
- Image stored as path reference in `Manifestation.imagePath`

### FR-04: Dua-to-Do — Checklist Generation
- Triggered from ImanSync result page (or re-triggered from dashboard)
- Input: `manifestationId` → load verses from DB
- GLM-5 parses the 3 verses and generates a 5-step Ikhtiar checklist
- Each step is a concrete, actionable task (not vague advice)
- Steps saved to `Task` table (linked to `Manifestation`)
- Steps also posted to Quran Foundation User API (Goals endpoint)
- User can check off tasks in the UI (updates `Task.isCompleted`)

### FR-05: HeartPulse — Voice Journal
- User records voice (max 2 minutes) OR types reflection text
- Voice input: GLM-5 processes speech-to-text
- Both paths: GLM-5 runs sentiment analysis → returns label (e.g. "hopeful", "anxious", "grateful") + score (0.0–1.0)
- Reflection saved to `Reflection` table
- Posted to Quran Foundation User API: Streak Tracking + Post a Reflection
- User dashboard shows: last 7-day sentiment trend, current streak count

### FR-06: SakinahStream — Audio Player
- Audio player UI with play/pause/seek/volume
- Data from Quran Foundation Audio API: list of reciters + surah audio URLs
- Filter by: reciter, surah number
- Default: opens to a curated playlist (3–5 popular reciters)
- Publicly accessible without login
- After login: user can save favorites (stored in local state for MVP)

### FR-07: User Dashboard
- Overview page showing:
  - Total manifestations created
  - Tasks completed vs pending
  - Current reflection streak (from Quran Foundation)
  - 7-day HeartPulse sentiment chart
  - Quick access buttons: New Intention, New Reflection, Open SakinahStream
- History: list of past Manifestations with creation date + task completion %
- Each Manifestation card links to full result + task list

### FR-08: API Rate Limiting
- `/iman-sync/analyze`: max 10 requests per user per hour (Redis)
- `/iman-sync/analyze-vision`: max 5 requests per user per hour (Redis)
- `/heart-pulse`: max 20 requests per user per hour (Redis)
- Exceeded → 429 response with message in Bahasa Indonesia or English based on user locale

---

## 4. Non-Functional Requirements

### NFR-01: Performance
- ImanSync text API: < 8 seconds
- ImanSync vision API: < 12 seconds
- Dua-to-Do generation: < 6 seconds
- HeartPulse voice processing: < 10 seconds
- Audio stream start: < 2 seconds
- All Quran Foundation API responses: cached in Redis (TTL 1 hour)

### NFR-02: Mobile UX
- Expo app runs on iOS 14+, Android 10+, Web (Chrome/Safari)
- All screens responsive: minimum 320px wide
- Voice recording uses Expo Audio API
- Image upload uses Expo ImagePicker
- Bottom tab navigation: ImanSync | Dua-to-Do | HeartPulse | SakinahStream

### NFR-03: Security
- All `/api/*` routes on NestJS backend behind JWT guard (except SakinahStream audio proxy)
- GLM-5 API key stored server-side only, never exposed to client
- Quran Foundation API key stored server-side only
- File uploads validated: type + size before processing
- No sensitive user documents collected (this is not a document processing app)

### NFR-04: Reliability
- GLM-5 timeout: if > 15s, return graceful error with fallback message
- Quran Foundation API timeout: if > 5s, return cached result or graceful degradation
- Voice recording failure: prompt user to type instead

### NFR-05: Accessibility
- All interactive elements have accessible labels
- Audio player has keyboard controls
- Color contrast ratio ≥ 4.5:1 (WCAG AA)

---

## 5. User Stories

| ID | As a... | I want to... | So that... |
|----|---------|-------------|------------|
| US-01 | Visitor | Log in with my Quran.com account | I can use ImanifestApp without creating a new account |
| US-02 | Logged-in user | Type my intention and get 3 Quranic verses | I can see how my goal aligns with the Quran |
| US-03 | Logged-in user | Upload a photo of my vision board | I can get Quranic verses relevant to what I'm visualizing |
| US-04 | Logged-in user | Get a 5-step action plan from ImanSync | I can turn my intention into concrete steps |
| US-05 | Logged-in user | Check off completed tasks | I can track my progress toward my goal |
| US-06 | Logged-in user | Record a voice reflection | I can journal in the most natural format for me |
| US-07 | Logged-in user | See my reflection sentiment over time | I can notice patterns in my spiritual state |
| US-08 | Logged-in user | See my streak count | I feel motivated to keep reflecting daily |
| US-09 | Any visitor | Stream Quran recitations | I can listen without needing an account |
| US-10 | Logged-in user | See all my past intentions in one place | I can review my spiritual journey |

---

## 6. Out of Scope (Hackathon MVP)

- Push notifications / reminders
- Social features (sharing, following)
- Premium paywall
- Custom dua collections
- Offline mode
- Localization beyond English (Indonesian support is stretch goal)
- Admin panel

---

## 7. Acceptance Criteria (Definition of Done)

**ImanSync:**
- [ ] User can submit text and receive 3 Quranic verses within 8 seconds
- [ ] User can upload image + text and receive 3 Quranic verses within 12 seconds
- [ ] Each verse shows: Arabic text, translation, tafsir snippet (max 300 chars)
- [ ] AI summary (2 sentences) appears below the verses
- [ ] Manifestation saved to DB

**Dua-to-Do:**
- [ ] 5-step checklist generated from ImanSync output within 6 seconds
- [ ] Each task shows description and completion checkbox
- [ ] Tasks saved to DB linked to manifestation
- [ ] Tasks posted to Quran Foundation Goals API
- [ ] User can check/uncheck tasks

**HeartPulse:**
- [ ] Voice recording captures audio and sends to GLM-5
- [ ] Text input also accepted as fallback
- [ ] Sentiment label and score returned and displayed
- [ ] Reflection saved to DB
- [ ] Streak count displayed and updated via Quran Foundation API
- [ ] 7-day sentiment chart visible in dashboard

**SakinahStream:**
- [ ] Audio player loads reciter list from Quran Foundation Audio API
- [ ] User can select reciter and surah
- [ ] Audio plays, pauses, seeks correctly
- [ ] Works without login

**Auth:**
- [ ] Login with Quran.com (OAuth2) works
- [ ] Email fallback works if OAuth2 unavailable
- [ ] Protected routes redirect to login
- [ ] Logout clears session
