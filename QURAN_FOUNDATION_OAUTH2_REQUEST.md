# Quran Foundation OAuth2 Integration Request

**To:** Basit Minhas (basit@quran.com) & developers@quran.com  
**From:** Mentari Rahman  
**Date:** April 23, 2026  
**Subject:** OAuth2 Credentials & User Data API Setup — ImanifestApp Hackathon

---

## 1. Application Details

| Field | Value |
|-------|-------|
| **Application Name** | ImanifestApp |
| **Description** | AI-powered spiritual productivity platform that guides users from authentic intention-setting through Quranic wisdom to organized action |
| **Purpose** | Transform spiritual intention into disciplined action using Quran Foundation APIs |
| **Website** | https://imanifestapp.com |
| **GitHub** | https://github.com/mentari92/Imanifestapp (Public) |
| **Status** | Active in Quran Foundation Hackathon 2026 |
| **Contact Email** | mentari92@gmail.com |

---

## 2. Application Architecture

```
Backend:  NestJS (Node.js + TypeScript)
Frontend: Expo Web (React Native + Web Export)
Database: PostgreSQL + Redis
Deployment: Docker Compose on VPS (Contabo)
```

---

## 3. Required OAuth2 Redirect URIs

Please add the following redirect URIs to our OAuth2 application:

### Production
```
https://imanifestapp.com/api/auth/quran-callback
https://imanifestapp.com/auth/quran-callback
```

### Development (Local Testing)
```
http://localhost:3001/api/auth/quran-callback
http://localhost:3000/auth/quran-callback
```

---

## 4. Required API Scopes

We request access to the following Quran Foundation APIs:

### Content APIs (Read-only)
- `quran:verses:read` — Search and retrieve verses
- `quran:tafsir:read` — Fetch tafsir translations
- `quran:audio:read` — Stream recitation audio

### User APIs (Read + Write)
- `user:reflections:write` — Post reflection entries
- `user:reflections:read` — Retrieve user's reflection history
- `user:goals:write` — Create and track spiritual goals/tasks
- `user:goals:read` — Retrieve user's goals
- `user:streaks:read` — Fetch streak tracking data
- `user:profile:read` — Retrieve user profile information

---

## 5. Integration Details

### Use Case 1: Reflection Syncing (Qalb Feature)
**Endpoint:** `POST /api/qalb/reflect`

When a user journals (voice or text), we:
1. Analyze sentiment with AI (Zhipu GLM-5)
2. Sync reflection data to Quran Foundation User API:
   ```json
   {
     "userId": "quran-user-id",
     "text": "user reflection transcript",
     "sentiment": "hopeful",
     "timestamp": "2026-04-23T10:30:00Z"
   }
   ```
3. Store local copy for offline access

### Use Case 2: Goal/Task Posting (Dua To-Do Feature)
**Endpoint:** `POST /api/dua-to-do/generate`

When user creates a spiritual goal from their Imanifest intention, we:
1. Generate 5 actionable steps with AI
2. Post each step as a goal to Quran Foundation:
   ```json
   {
     "title": "Establish the five daily prayers with mindfulness",
     "description": "Guided by verse [2:238]",
     "status": "active",
     "dueDate": "2026-05-20"
   }
   ```
3. Track completion locally and sync back

### Use Case 3: Verse Content (Imanifest & Tafakkur Features)
**APIs:** Content API for verse search, tafsir, audio

We fetch:
- Matching verses for user's intention
- Tafsir snippets (max 300 chars)
- Audio recitation metadata

All cached for 24 hours to respect rate limits.

---

## 6. Required OAuth2 Credentials

Please provide:

1. **Client ID** — `QURAN_FOUNDATION_CLIENT_ID`
2. **Client Secret** — `QURAN_FOUNDATION_CLIENT_SECRET`
3. **OAuth2 Authorization Endpoint** — `https://oauth2.quran.foundation/authorize`
4. **Token Endpoint** — `https://oauth2.quran.foundation/token`
5. **Scope Requirements** — Confirmation of above scopes

---

## 7. Technical Implementation Details

### Current Status (Hackathon MVP)
- ✅ Content API integration active (verse search, tafsir from `api.quran.com`)
- ✅ User API integration scaffolded with fallback auth token
- ⏳ Full OAuth2 flow — ready for implementation upon credentials receipt

### Environment Variables (Will be set after credentials received)
```bash
QURAN_FOUNDATION_CLIENT_ID=<your-client-id>
QURAN_FOUNDATION_CLIENT_SECRET=<your-client-secret>
QURAN_FOUNDATION_OAUTH_BASE_URL=https://oauth2.quran.foundation
QURAN_FOUNDATION_USER_API_URL=https://api.quran.com/api/v4
QURAN_FOUNDATION_CONTENT_API_URL=https://apis.quran.foundation/content/api/v4
```

### OAuth2 Flow Implementation (Ready to Deploy)
**File:** `apps/server/src/auth/oauth.service.ts` (to be created)

```typescript
// Pseudo-code of implementation plan
1. User clicks "Login with Quran.com"
2. Redirect to Quran Foundation OAuth2 authorize endpoint
3. User grants permission
4. Callback receives authorization code
5. Exchange code for access token + user info
6. Store token in secure session/DB
7. Create/update local user record
8. Redirect to dashboard
```

---

## 8. Data Privacy & Compliance

- ✅ User reflections and goals stored locally (no third-party storage)
- ✅ Quran Foundation User API used for sync-only (user controls what syncs)
- ✅ No personal data shared beyond what API requires
- ✅ Compliant with hackathon code of conduct

---

## 9. Support & Questions

Please reply directly to this email with:
- OAuth2 credentials (Client ID, Client Secret)
- Scope confirmations
- Any additional requirements or restrictions

Or contact us at **Hackathon@quran.com** per your suggestion.

---

## 10. Attachments

- Application GitHub: https://github.com/mentari92/Imanifestapp
- Live Demo: https://imanifestapp.com
- API Integration Code: `/apps/server/src/common/quran-api.service.ts`

---

**Thank you for the support! We're excited to showcase Quran Foundation APIs in action during the hackathon.**

Best regards,  
Mentari Rahman  
mentari92@gmail.com
