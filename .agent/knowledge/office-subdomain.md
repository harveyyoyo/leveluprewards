# School Office subdomain (`office.leveluprewards.app`) — legacy redirect only

**Owner preference:** School Office lives on the main portal site at `https://portal.leveluprewards.app/{school}/office`. No separate subdomain is required.

**Live bookmark:** `https://portal.leveluprewards.app/{school}/office` (example: `https://portal.leveluprewards.app/yeshiva/office/teachers`).

If someone opens the old `office.leveluprewards.app` address (or a short path like `/yeshiva/teachers`), the rewards app middleware **301/302 redirects** to the matching portal URL with `/office` in the path.

Use the rest of this doc only if you later want a dedicated office hostname again.

## Production env (only when enabling subdomain)

- `OFFICE_CANONICAL_HOST=office.leveluprewards.app`
- `NEXT_PUBLIC_OFFICE_CANONICAL_HOST=office.leveluprewards.app` (client links)
- `AUTH_COOKIE_DOMAIN=.leveluprewards.app` (portal + office share HttpOnly session/gate cookies)
- `AUTH_GATE_SIGNING_SECRET` must match across any split deploys

## Firebase (optional subdomain)

1. **Authentication → Authorized domains**: `office.leveluprewards.app`
2. **Hosting → Custom domain**: attach `office.leveluprewards.app` to site **`levelup-office`** (not the default rewards site). Run `npm run office:domain-check` for current status and console steps.

## Behaviour when subdomain is enabled

- `https://office.leveluprewards.app/` → `/office-bootstrap` (School Office entry: school picker or resume session).
- `/{school}/office/…` on main or portal host **redirects** to `https://office.leveluprewards.app/{school}/…`
- Office host rewrites internally to `/{school}/office/…` Next routes.
- Portal → Office uses `GET /api/auth/office-handoff/redirect?school=…` (requires portal session + office/admin gate scope).

## Default (main site, no subdomain env)

- Live bookmark: `https://portal.leveluprewards.app/{school}/office`
- No redirect away from portal host; office links stay on the same site.
