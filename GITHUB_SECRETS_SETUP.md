# GitHub Secrets Configuration

To deploy with Quran Foundation API credentials securely, follow these steps:

## 1. Get Your Credentials

From the approved Quran Foundation application, you'll have:
- `Client ID` (UUID format)
- `Client Secret` (random string)
- `Auth Token` (JWT from OAuth2 endpoint)

## 2. Add GitHub Secrets

Go to: **https://github.com/mentari92/Imanifestapp/settings/secrets/actions**

Add these secrets:

| Secret Name | Value |
|---|---|
| `QURAN_FOUNDATION_CLIENT_ID` | Your Client ID |
| `QURAN_FOUNDATION_CLIENT_SECRET` | Your Client Secret |
| `QURAN_FOUNDATION_AUTH_TOKEN` | Your JWT Token |
| `QURAN_FOUNDATION_OAUTH_BASE_URL` *(optional)* | OAuth base URL (e.g. pre-live vs prod) |
| `QURAN_FOUNDATION_USER_API_URL` *(optional)* | User API base URL (e.g. pre-live vs prod) |

### Recommended values for Hackathon / Testing (Pre-live)

If you were given **pre-live** credentials, set:

- `QURAN_FOUNDATION_OAUTH_BASE_URL` = `https://prelive-oauth2.quran.foundation`
- `QURAN_FOUNDATION_USER_API_URL` = `https://apis-prelive.quran.foundation/auth`

This keeps User API writes (goals, streaks, reflections, etc.) in the pre-live environment.

### Getting the JWT Token

If you don't have the auth token, generate it locally:

```bash
OAUTH_BASE_URL="https://prelive-oauth2.quran.foundation" # or https://oauth2.quran.foundation
CLIENT_ID="your-client-id"
CLIENT_SECRET="your-client-secret"

curl -X POST "${OAUTH_BASE_URL}/oauth2/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=client_credentials" \
  -u "${CLIENT_ID}:${CLIENT_SECRET}"
```

Copy the `access_token` value from the response and add it as `QURAN_FOUNDATION_AUTH_TOKEN` secret.

## 3. Deploy

The GitHub Actions workflow will automatically:
1. Pull your latest code
2. Create `.env` file from secrets on the VPS
3. Build and deploy containers with credentials loaded

No credentials are ever stored in git!

## 4. Security Notes

✅ **What we do:**
- Credentials stored in GitHub Secrets (encrypted)
- `.env` created on VPS during deployment (never in git)
- All `.env` files ignored by `.gitignore`

⚠️ **Important:**
- Never commit `.env` or `.env.*` files
- Rotate Client Secret periodically
- Token expires in 3600 seconds (needs refresh in production)
