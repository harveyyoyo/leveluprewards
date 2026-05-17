# Production Auth Guardrails

Login is a critical path. Treat auth, middleware, and session-cookie changes like migrations: verify live behavior, keep rollback simple, and avoid silent loops.

## What Must Stay Healthy

- School passcode callable: `verifySchoolAccessPasscode`
- Login page: `/login?school={schoolId}&next=/{schoolId}/portal`
- Portal route: `/{schoolId}/portal`
- Session-cookie endpoint when edge enforcement is enabled: `/api/auth/session`
- School-gate endpoint when edge enforcement is enabled: `/api/auth/school-gate`

## Required Post-Deploy Check

`npm run deploy:hosting:safe` now runs:

```bash
node scripts/live-auth-smoke.mjs
```

The smoke test uses the live site, creates an anonymous Firebase test user, verifies the school access passcode callable, checks the session endpoint, requests the protected portal route, and uses Playwright to log in through the browser. A deploy is not considered healthy if this fails.

Default smoke target:

```bash
LIVE_AUTH_BASE_URL=https://levelupenterprises.education
LIVE_AUTH_SCHOOL_ID=yeshiva
LIVE_AUTH_PASSCODE=1234
```

Override these when testing another deployment or a different canary school.

## Edge Session Enforcement

Production middleware can require an HttpOnly Firebase session cookie before serving `/{school}/...` pages.

Normal strict mode requires:

```bash
AUTH_SESSION_EDGE_ENFORCEMENT=1
LIVE_AUTH_REQUIRE_SESSION_COOKIE=1
```

Only enable strict mode when `npm run test:live-auth` passes with `LIVE_AUTH_REQUIRE_SESSION_COOKIE=1`.

## Emergency Rollback

If schools can enter a valid passcode but are bounced back to `/login`, disable edge enforcement and redeploy:

```bash
DISABLE_AUTH_SESSION_EDGE=1
npm run deploy:hosting:safe
```

This does not bypass the school passcode. It only prevents middleware from requiring the server-minted session cookie while `/api/auth/session` is unhealthy.

## Alert Signals

Set up monitoring for:

- Any `5xx` from `/api/auth/session`
- Any `5xx` from `/api/auth/school-gate`
- Redirect spikes from `/{school}/portal` to `/login`
- Login page traffic spikes during school hours
- Cloud Function errors for `verifySchoolAccessPasscode`

## User-Facing Failure

If the passcode succeeds but secure session sync fails, the login page now shows:

```text
Secure session could not start
Your passcode was accepted, but the server could not open the portal session.
```

That message means the user credentials are probably fine; check session-cookie infrastructure first.
