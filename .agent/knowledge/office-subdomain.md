# School Office subdomain (`office.leveluprewards.app`) — legacy redirect only

**Owner preference:** School Office lives on the main site at `https://leveluprewards.app/{school}/office`. No separate subdomain is required, and no `portal.` prefix either (see "Main site address" in `deployment.md`).

**Live bookmark:** `https://leveluprewards.app/{school}/office` (example: `https://leveluprewards.app/yeshiva/office/teachers`).

If someone opens the old `office.leveluprewards.app` address (or a short path like `/yeshiva/teachers`), the rewards app middleware **redirects** to the matching School Office URL with `/office` in the path — on the old `portal.` address for now, on the main site once `PORTAL_HOST_FORWARD=1` is on (see "Main site address" in `deployment.md`). Old `portal.leveluprewards.app` links keep working as before.

Use the rest of this doc only if you later want a dedicated office hostname again.

## Production env (only when enabling subdomain)

- `OFFICE_CANONICAL_HOST=office.leveluprewards.app`
- `NEXT_PUBLIC_OFFICE_CANONICAL_HOST=office.leveluprewards.app` (client links)
- `AUTH_COOKIE_DOMAIN=.leveluprewards.app` (portal + office share HttpOnly session/gate cookies)
- `AUTH_GATE_SIGNING_SECRET` must match across any split deploys

## Firebase (optional subdomain)

1. **Authentication → Authorized domains**: `office.leveluprewards.app`
2. **Hosting → Custom domain**: attach `office.leveluprewards.app` to the default hosting site (`studio-1273073612-71183`) — there is no longer a separate `apps/office` app or `levelup-office` hosting site; School Office is served entirely by the main app's own `/office` routes.

## Behaviour when subdomain is enabled

- `https://office.leveluprewards.app/` → `/office-bootstrap` (School Office entry: school picker or resume session).
- `/{school}/office/…` on main or portal host **redirects** to `https://office.leveluprewards.app/{school}/…`
- Office host rewrites internally to `/{school}/office/…` Next routes.
- Portal → Office uses `GET /api/auth/office-handoff/redirect?school=…` (requires portal session + office/admin gate scope).

## Default (main site, no subdomain env)

- Live bookmark: `https://leveluprewards.app/{school}/office`
- No redirect to an office host; office links stay on the main site.
