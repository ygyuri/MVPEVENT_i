# Google OAuth Integration Summary

## Overview

Google OAuth is integrated into the Event-i application, allowing users to sign in with their Google accounts. The implementation uses a stateless OAuth flow with JWT tokens.

## Quick Reference: Production Setup

**Required GitHub Secrets (8 total):**
1. `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID
2. `GOOGLE_CLIENT_SECRET` - Your Google OAuth Client Secret  
3. `GOOGLE_CALLBACK_URL` - `https://event-i.co.ke/api/auth/google/callback`
4. `GOOGLE_STATE_SECRET` - Generate: `openssl rand -base64 32` (NEW for production)
5. `GOOGLE_STATE_TTL_MS` - `300000` (optional, defaults to 300000)
6. `FRONTEND_URL` - `https://event-i.co.ke` (your production frontend URL)
7. `SESSION_SECRET` - Generate: `openssl rand -base64 32` (NEW for production)
8. `JWT_SECRET` - Generate: `openssl rand -base64 32` (NEW for production)

**Google Cloud Console:**
- Add callback URL: `https://event-i.co.ke/api/auth/google/callback`
- Wait 1-2 minutes for changes to propagate

## Configuration

### Local Development (Docker)
- **Client ID**: `894994509927-l9m4etbfu4gsk6cmauisvdpj5t4gnf6m.apps.googleusercontent.com`
- **Client Secret**: See `docker-compose.yml` or `.env` file (not committed to git)
- **Callback URL**: `http://localhost:5001/api/auth/google/callback`
- **State Secret**: See `docker-compose.yml` or `.env` file (not committed to git)
- **Session Secret**: See `docker-compose.yml` or `.env` file (not committed to git)

### Production
- **Callback URL**: `https://event-i.co.ke/api/auth/google/callback`
- **GitHub Secrets Required**: See below

## GitHub Secrets for Production

Add these **8 required secrets** to GitHub (Settings → Secrets and variables → Actions):

### Required Google OAuth Secrets

1. **GOOGLE_CLIENT_ID**: `894994509927-l9m4etbfu4gsk6cmauisvdpj5t4gnf6m.apps.googleusercontent.com`
   - Your Google OAuth Client ID from Google Cloud Console
   - Same for local and production (public value)

2. **GOOGLE_CLIENT_SECRET**: `GOCSPX-...` (your actual secret)
   - Your Google OAuth Client Secret from Google Cloud Console
   - ⚠️ **SECRET** - Keep this confidential
   - Same for local and production
   - ⚠️ **DO NOT commit to git** - Store in GitHub Secrets only

3. **GOOGLE_CALLBACK_URL**: `https://event-i.co.ke/api/auth/google/callback`
   - Production callback URL (must match Google Cloud Console)
   - Must include `/api` prefix
   - Must use HTTPS in production

4. **GOOGLE_STATE_SECRET**: Generate with `openssl rand -base64 32`
   - Used to sign and validate OAuth state parameter
   - ⚠️ **SECRET** - Generate a NEW unique secret for production
   - Example output format: `[random-base64-string]`
   - **DO NOT reuse local development secret**
   - ⚠️ **DO NOT commit to git** - Store in GitHub Secrets only

5. **GOOGLE_STATE_TTL_MS**: `300000`
   - State validation timeout in milliseconds (5 minutes)
   - Optional (defaults to 300000 if not set)

### Required Supporting Secrets

6. **FRONTEND_URL**: `https://event-i.co.ke`
   - Your production frontend URL (without trailing slash)
   - Used for OAuth callback postMessage target origin
   - Used for redirect URLs after OAuth completion
   - Must use HTTPS in production

7. **SESSION_SECRET**: Generate with `openssl rand -base64 32`
   - Used for session management and security
   - ⚠️ **SECRET** - Generate a NEW unique secret for production
   - Example output format: `[random-base64-string]`
   - **DO NOT reuse local development secret**
   - ⚠️ **DO NOT commit to git** - Store in GitHub Secrets only

8. **JWT_SECRET**: Generate with `openssl rand -base64 32`
   - Used for JWT token signing (access and refresh tokens)
   - ⚠️ **SECRET** - Generate a NEW unique secret for production
   - Also used as fallback if `GOOGLE_STATE_SECRET` is not set
   - **DO NOT reuse local development secret**

### How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret above with the exact name (case-sensitive)
5. For secrets that need generation, run:
   ```bash
   openssl rand -base64 32
   ```
6. Copy the output and paste as the secret value
7. Click **Add secret**

### Important Notes

- ⚠️ **Generate NEW secrets for production** - Never reuse local development secrets
- ⚠️ **Keep secrets confidential** - Never commit them to git or share publicly
- ✅ **GOOGLE_CLIENT_ID is public** - Safe to use same value in local and production
- ✅ **GOOGLE_CLIENT_SECRET is same** - Can use same value (it's already configured)
- ✅ **URLs must match exactly** - Callback URL must match Google Cloud Console exactly
- ✅ **HTTPS required in production** - All URLs must use HTTPS

## Google Cloud Console Setup

**Required**: Add these callback URLs to your OAuth client's "Authorized redirect URIs":

### Local Development URLs
- `http://localhost:5001/api/auth/google/callback` (Docker local - required)
- `http://localhost:5000/api/auth/google/callback` (Direct server local - optional)

### Production URL
- `https://event-i.co.ke/api/auth/google/callback` (Production - required)

**Steps**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Find and click on your OAuth Client ID: `894994509927-l9m4etbfu4gsk6cmauisvdpj5t4gnf6m`
4. Under **Authorized redirect URIs**, click **+ ADD URI**
5. Add each callback URL above (one at a time)
6. Click **SAVE**
7. ⏳ **Wait 1-2 minutes** for changes to propagate

### Important Notes
- ✅ **URLs must match exactly** - Including protocol (http/https), port, and path
- ✅ **Must include `/api` prefix** - The route is `/api/auth/google/callback`
- ✅ **HTTPS required for production** - Production URL must use HTTPS
- ⚠️ **Changes take 1-2 minutes** - Google needs time to propagate changes

## Important Notes

- **Callback URLs must include `/api`** - Routes are at `/api/auth/google/callback`
- **Generate new secrets for production** - Don't reuse local development secrets
- **Wait 1-2 minutes** after updating Google Cloud Console for changes to propagate
- **Never commit secrets to git** - Always use GitHub Secrets for production

## Best Practices: OAuth User Management

### Do We Need to Save Users from Google Account?

**YES - This is industry standard and required for:**
- **User persistence**: Users need accounts in your database to use your application
- **Data ownership**: You control user data even if they stop using Google
- **Account linking**: Users can link multiple OAuth providers to one account
- **Business logic**: Your app needs user records for events, tickets, payments, etc.
- **Security**: You maintain your own access control and session management

### How User Data is Saved (Following Best Practices)

When a user signs in with Google:

#### 1. **New User (First-Time Google Sign-In)**
Creates a new user account with:
- ✅ **Email from Google** (verified automatically - Google only returns verified emails)
- ✅ **Google ID** linked to account (for future logins)
- ✅ **Username** auto-generated from name/email (unique, sanitized)
- ✅ **Name, firstName, lastName** from Google profile
- ✅ **Avatar URL** from Google profile
- ✅ **`emailVerified: true`** (trust Google's verification)
- ✅ **`accountStatus: "active"`** (Google users are active by default)
- ✅ **`isActive: true`**
- ✅ **`lastLoginProvider: "google"`**

#### 2. **Existing User (Account Linking & Profile Updates)**
- ✅ **Account Status Check**: Blocks login if account is suspended or inactive
- ✅ **Google Account Linking**: Adds `googleId` if not already linked
- ✅ **Email Verification**: Sets `emailVerified: true` (trust Google)
- ✅ **Profile Updates**: Updates avatar, name, firstName, lastName on each login (keeps data fresh)
- ✅ **Account Activation**: Ensures account is active (reactivates if needed)
- ✅ **Login Provider Tracking**: Updates `lastLoginProvider: "google"`

#### 3. **Session Management**
- ✅ **JWT Tokens**: Access token (1 hour), Refresh token (7 days)
- ✅ **Session Storage**: MongoDB session with 7-day TTL
- ✅ **Security**: Tokens stored securely, sessions tracked

#### 4. **Account Linking (Best Practice)**
- ✅ **Email-Based Linking**: If user exists with same email but different login method, Google account is linked automatically
- ✅ **No Duplicate Accounts**: Prevents multiple accounts for same email
- ✅ **Seamless Experience**: User can use either email/password or Google to login

#### 5. **Error Handling**
- ✅ **Suspended Accounts**: Blocks login with clear error message
- ✅ **Inactive Accounts**: Blocks login with clear error message
- ✅ **Duplicate Key Errors**: Handles race conditions gracefully
- ✅ **Missing Email**: Validates email exists in Google profile
- ✅ **Email Verification**: Checks Google's email verification status

### Security Best Practices Implemented

1. ✅ **Email Verification**: Trust Google's email verification (Google only returns verified emails)
2. ✅ **Account Status Checks**: Prevent suspended/inactive accounts from logging in
3. ✅ **Profile Data Freshness**: Update profile on each login to keep data current
4. ✅ **Account Linking Security**: Safe account linking with conflict detection
5. ✅ **Error Handling**: Comprehensive error handling with user-friendly messages
6. ✅ **Logging**: Logs user creation and profile updates for audit trail

## Automatic Login Flow

**YES - Users are automatically logged in after Google OAuth completes!**

### Complete Authentication Flow

1. **User clicks "Continue with Google"**
   - Opens popup window with Google OAuth URL
   - User signs in with Google account
   - User grants permissions on Google consent screen

2. **Backend Processing** (`server/config/passport.js`)
   - ✅ Creates/updates user in MongoDB
   - ✅ Generates JWT tokens (access + refresh)
   - ✅ Creates session in MongoDB (7-day TTL)
   - ✅ Returns `{ user, tokens }` to callback

3. **OAuth Callback** (`server/routes/auth.js`)
   - ✅ Receives tokens and user data
   - ✅ Tries `postMessage` to `window.opener` first
   - ✅ Falls back to `window.parent` if opener unavailable
   - ✅ If postMessage fails, redirects with tokens in URL parameter
   - ✅ Popup window closes automatically (if postMessage succeeds)

4. **Frontend Authentication** (`client/src/components/AuthModal.jsx` or `App.jsx`)
   - **Primary Flow (postMessage)**: 
     - ✅ Receives tokens via `postMessage` listener in AuthModal
     - ✅ Stores tokens in localStorage
     - ✅ Dispatches `setAuthToken` → Sets `isAuthenticated: true` in Redux
     - ✅ Sets user from OAuth payload immediately
     - ✅ Fetches full user data via `getCurrentUser()`
     - ✅ Closes modal and navigates to appropriate page
   - **Fallback Flow (URL parameters)**:
     - ✅ Detects `oauth=success&provider=google&tokens=...` in URL
     - ✅ Decodes tokens from URL parameter (base64url)
     - ✅ Stores tokens in localStorage
     - ✅ Sets auth token in Redux
     - ✅ Fetches user data from backend
     - ✅ Cleans up URL parameters

5. **Session Persistence**
   - ✅ Tokens stored in `localStorage` (persists across page refreshes)
   - ✅ Redux state updated (`isAuthenticated: true`, `user` object set)
   - ✅ API interceptor automatically adds `Authorization: Bearer <token>` header to all requests
   - ✅ On app load (`App.jsx`), if token exists, user is automatically restored

### What Happens After Login

- ✅ **User is logged in immediately** - `isAuthenticated: true` in Redux
- ✅ **Session persists** - Tokens in localStorage survive page refreshes
- ✅ **API requests authenticated** - All API calls include the token automatically
- ✅ **User data available** - Full user object in Redux state
- ✅ **Navigation** - User redirected to:
  - `/organizer/dashboard` if role is "organizer"
  - `/` (home) if role is "customer"

### Session Management

- **Access Token**: 1 hour expiry (stored in localStorage)
- **Refresh Token**: 7 days expiry (stored in localStorage)
- **MongoDB Session**: 7-day TTL (tracks active sessions)
- **Auto-Refresh**: API interceptor automatically refreshes expired tokens

## Testing

### Local
1. Open `http://localhost:3001`
2. Click "Continue with Google"
3. Should redirect to Google sign-in
4. After signing in, popup closes and you're **automatically logged in**
5. User data is saved/updated in MongoDB
6. Refresh page - you should still be logged in (session persists)

### Production
1. Open `https://event-i.co.ke`
2. Click "Continue with Google"
3. Should work the same way
4. Session persists across page refreshes

## Troubleshooting

**Error: `redirect_uri_mismatch`**
- **Cause**: Callback URL not added to Google Cloud Console
- **Fix**: Add the exact callback URL to Google Cloud Console authorized redirect URIs

**Error: `Unknown authentication strategy "google"`**
- **Cause**: Google OAuth credentials not configured
- **Fix**: Ensure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set in environment variables

**Error: `Content Security Policy directive 'script-src 'self''`**
- **Cause**: Helmet CSP blocking inline scripts in OAuth callback
- **Fix**: Already configured - Helmet allows `'unsafe-inline'` for OAuth callback scripts

## Production Deployment Checklist

Before deploying to production, ensure:

- [ ] All 8 GitHub Secrets are added (see above)
- [ ] `GOOGLE_CALLBACK_URL` in GitHub Secrets matches production URL exactly
- [ ] `FRONTEND_URL` in GitHub Secrets matches production frontend URL
- [ ] Production callback URL added to Google Cloud Console
- [ ] New secrets generated for `GOOGLE_STATE_SECRET`, `SESSION_SECRET`, and `JWT_SECRET`
- [ ] All URLs use HTTPS in production
- [ ] Google Cloud Console changes have propagated (wait 1-2 minutes)

## Files Modified

- `server/config/passport.js` - Google OAuth strategy configuration
- `server/routes/auth.js` - OAuth routes (`/api/auth/google`, `/api/auth/google/callback`)
- `server/models/User.js` - Added `googleId` and `lastLoginProvider` fields, `generateUniqueUsername` method
- `server/utils/statelessStateStore.js` - State validation with URL encoding support
- `server/index.js` - Configured Helmet CSP to allow inline scripts for OAuth callbacks
- `client/src/components/AuthModal.jsx` - "Continue with Google" button with postMessage handling
- `client/src/App.jsx` - OAuth fallback handler for URL parameter tokens
- `docker-compose.yml` - Environment variables
- `env.example` - Configuration examples

