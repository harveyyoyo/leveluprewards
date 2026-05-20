# School Office subdomain (`office.leveluprewards.app`)

## Production env (Hosting / CI)

- `OFFICE_CANONICAL_HOST=office.leveluprewards.app`
- `NEXT_PUBLIC_OFFICE_CANONICAL_HOST=office.leveluprewards.app` (client links)
- `AUTH_COOKIE_DOMAIN=.leveluprewards.app` (portal + office share HttpOnly session/gate cookies)
- `AUTH_GATE_SIGNING_SECRET` must match across any future split deploys

## Firebase

1. **Authentication → Authorized domains**: `office.leveluprewards.app`
2. **Hosting → Custom domain**: CNAME `office` → default site (`studio-1273073612-71183.web.app`) until a dedicated office Hosting site exists.

## Behaviour

- `/{school}/office/…` on main or portal host **redirects** to `https://office.leveluprewards.app/{school}/…`
- Office host rewrites internally to `/{school}/office/…` Next routes.
- Portal → Office uses `GET /api/auth/office-handoff/redirect?school=…` (requires portal session + office/admin gate scope).

## Deploy note

Today both hosts use the **same** Firebase Hosting site / deploy. A second Hosting site is only needed for independent Office releases.
