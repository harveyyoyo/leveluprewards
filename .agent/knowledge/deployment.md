# Deployment & Stability Notes

Before any deployment, the site must be thoroughly tested to ensure it is working correctly.

## Pre-Deployment Checklist
- [ ] **Login Functionality**: Especially ensure that accounts can log in successfully (School, Teacher, Student, Admin).
- [ ] **Core Portals**: Verify that the Student Kiosk, Teacher Portal, and Admin Portal are accessible.
- [ ] **Data Sync**: Confirm that Firebase Firestore synchronization is working.
- [ ] **No Console Errors**: Check the browser console for any critical errors.
- [ ] **Edge session cookies**: In production, school hub routes require an HttpOnly Firebase session cookie minted by `POST /api/auth/session`. The hosting runtime must be able to initialize **Firebase Admin** (Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS`). Optional overrides: `DISABLE_AUTH_SESSION_EDGE=1` turns off middleware enforcement; `AUTH_SESSION_EDGE_ENFORCEMENT=1` forces it on in development for testing.
- [ ] **School gate cookie**: Set `AUTH_GATE_SIGNING_SECRET` (32+ random characters) in the hosting environment so middleware also enforces a signed `edu_school_gate` cookie (scopes from Firestore + `anonymousPortalSessions`). Deploy **Cloud Functions** after pulling so `verifySchoolAccessPasscode` writes `schools/{id}/anonymousPortalSessions/{uid}` for school-portal sessions; then deploy Firestore rules so that path stays server-only.

## Critical Auth Guardrails

On 2026-05-14, live school login failed because edge session-cookie enforcement
depended on `POST /api/auth/session`, and that SSR route returned `503` in
production. The school passcode callable was healthy, but middleware kept
redirecting valid users from `/{school}/portal` back to `/login`.

Current production mitigation:

- `DISABLE_AUTH_SESSION_EDGE=1` is used as the emergency rollback switch.
- This does **not** bypass the school passcode/callable gate.
- Do not re-enable strict edge enforcement until session-cookie creation is
  healthy and the strict live smoke passes.

Required checks:

```powershell
npm run test:live-auth
```

This runs `scripts/live-auth-smoke.mjs` against the live domain. It verifies:

- anonymous Firebase test user creation
- `verifySchoolAccessPasscode` accepts the canary school passcode
- direct portal access behavior matches the current edge-enforcement mode
- browser login reaches `/{school}/portal`

`npm run deploy:hosting:safe` now runs the same live auth smoke after deploy.
If this fails, treat the deploy as unsafe for school clients.

Strict edge session-cookie mode:

```powershell
$env:LIVE_AUTH_REQUIRE_SESSION_COOKIE='1'
npm run test:live-auth
```

Only turn on `AUTH_SESSION_EDGE_ENFORCEMENT=1` once the strict check passes.

User-facing symptom if this regresses:

```txt
Secure session could not start
Your passcode was accepted, but the server could not open the portal session.
```

First response for school-wide lockouts:

```powershell
# ensure DISABLE_AUTH_SESSION_EDGE=1 is present in deploy env
npm run deploy:hosting:safe
```

Reference: `docs/auth-production-guardrails.md`.

## Firestore Rules Drift

This project can use live Firestore during local development. Running the Functions
emulator alone does not emulate Firestore, and editing `firestore.rules` locally
does not change the rules enforced by the live database.

### Symptom

The browser or global Firebase error listener reports something like:

```txt
Missing or insufficient permissions: The following request was denied by Firestore Security Rules:
{ "method": "list", "path": "/databases/(default)/documents/schools/{schoolId}/goals" }
```

If `firestore.rules` already allows that read locally, assume the deployed rules
are stale before changing application code.

### Confirm

Check whether the app is pointed at live Firestore:

- `.env.local` has no full Firestore emulator setting.
- The running emulator command is only `firebase emulators:start --only functions`.
- Port `8080` is not listening for the Firestore emulator.

### Fix

Deploy only the Firestore rules:

```powershell
npx firebase deploy --only firestore:rules --project studio-1273073612-71183 --non-interactive
```

Then refresh the app and retry the denied view.

### Prevent

Any time `firestore.rules` changes, deploy rules before testing against live
Firestore. If the intent is to avoid touching live Firebase, start the full local
emulator suite and seed it before testing Firestore reads/writes.
