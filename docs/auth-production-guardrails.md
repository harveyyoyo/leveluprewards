# Production Auth Guardrails

Login is a critical path. Treat auth, middleware, and session-cookie changes like migrations: verify live behavior, keep rollback simple, and avoid silent lockouts.

## Architecture (school login)

School passcode verification uses **two independent backends**:

1. **Primary — Cloud Function `verifySchoolAccessPasscode`**  
   Deployed with Firebase Functions, uses Admin SDK directly. This is what the login page calls first so schools stay unlocked even when SSR is unhealthy.

2. **Backup — `POST /api/auth/verify-school-access`**  
   Next.js SSR route. Requires `SSR_SERVICE_ACCOUNT_JSON` in the hosting backend `.env` (`FIREBASE_*` is reserved on Cloud Functions). Used when the callable is unavailable.

Wrong passcodes must **not** fall through to the other backend (avoid masking credential errors).

## What Must Stay Healthy

- School passcode callable: `verifySchoolAccessPasscode` (**primary**)
- SSR school gate: `/api/auth/verify-school-access` (**backup**; must not 503 after deploy)
- Login page: `/login?school={schoolId}&next=/{schoolId}/portal`
- Portal route: `/{schoolId}/portal`
- Session-cookie endpoint when edge enforcement is enabled: `/api/auth/session`
- School-gate endpoint when edge enforcement is enabled: `/api/auth/school-gate`

## Deploy requirements

Every hosting deploy **must** include Firebase Admin credentials for the SSR backend:

- GitHub Actions: secret `FIREBASE_SERVICE_ACCOUNT_STUDIO_1273073612_71183` → written to `.env` as `SSR_SERVICE_ACCOUNT_JSON` (deploy fails if missing).
- Local `npm run deploy:hosting:safe`: copies from `.env.local` `FIREBASE_SERVICE_ACCOUNT_KEY` → `.env` `SSR_SERVICE_ACCOUNT_JSON`.

Without this, `/api/auth/verify-school-access` returns 503. Login still works via the callable, but deploy smoke tests should catch the regression.

## Required Post-Deploy Check

`npm run deploy:hosting:safe` runs:

```bash
node scripts/live-auth-smoke.mjs
```

The smoke test verifies:

- anonymous Firebase test user creation
- `verifySchoolAccessPasscode` callable
- **`/api/auth/verify-school-access` returns 200** (not 503)
- session endpoint behavior for current edge mode
- browser login reaches `/{school}/portal`

A deploy is **not** healthy if this fails.

Default smoke target:

```bash
LIVE_AUTH_BASE_URL=https://leveluprewards.app
LIVE_AUTH_SCHOOL_ID=yeshiva
LIVE_AUTH_PASSCODE=1234
```

GitHub deploys also run `npm run test:live-auth` after Firebase Hosting deploys.

## Lightweight Uptime Check

```bash
npm run test:live-uptime
```

Checks `/api/health`, **`/api/auth/verify-school-access`**, login shell, and portal reachability (no browser).

The `Production Uptime` workflow runs this daily.

## Edge Session Enforcement

Production middleware can require an HttpOnly Firebase session cookie before serving `/{school}/...` pages.

Only enable strict mode when `npm run test:live-auth` passes with `LIVE_AUTH_REQUIRE_SESSION_COOKIE=1`.

Keep `DISABLE_AUTH_SESSION_EDGE=1` until `/api/auth/session` reliably mints cookies in production.

## Emergency Rollback

If schools can enter a valid passcode but are bounced back to `/login`, disable edge enforcement and redeploy:

```bash
DISABLE_AUTH_SESSION_EDGE=1
npm run deploy:hosting:safe
```

## Alert Signals

Monitor for:

- Any `5xx` from `/api/auth/verify-school-access`
- Any `5xx` from `/api/auth/session` or `/api/auth/school-gate`
- Cloud Function errors for `verifySchoolAccessPasscode`
- Redirect spikes from `/{school}/portal` to `/login`

## User-Facing Failures

**Wrong passcode / school ID** — fix credentials; both backends agree.

**"Could not verify school access"** — SSR route 503 *and* callable failed; check Functions deploy + `SSR_SERVICE_ACCOUNT_JSON` on hosting backend.

**"Secure session could not start"** — passcode accepted but session cookie failed; check session infrastructure (edge enforcement should stay off until fixed).
