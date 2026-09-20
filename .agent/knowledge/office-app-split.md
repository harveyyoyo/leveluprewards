# School Office — standalone app split

## Goal

Develop **Rewards** and **School Office** independently. Changes in one app must not require rebuilding or retesting the other.

## Isolation contract

| Layer | Rewards (root) | Office (`apps/office`) |
|-------|----------------|------------------------|
| Source code | `src/` — includes production office routes | `apps/office/src/` — local dev mirror |
| `node_modules` | Root only | `apps/office/node_modules` only (not an npm workspace) |
| Dev server | Port 3000 | Port 3001 |
| Typecheck | `npm run typecheck` | `cd apps/office && npm run typecheck` |
| Build | `npm run build` | `cd apps/office && npm run build` |

**Still shared at runtime (by design):** one Firebase project, auth cookies on `.leveluprewards.app`, and the portal→office handoff API on Rewards. That does not couple your day-to-day edits in either codebase.

## Layout

```
leveluprewards/                 # Rewards app (root) — port 3000
  src/app/[schoolId]/office/…   # Production School Office routes
  src/components/office/
  src/lib/office/
apps/office/                    # School Office app — port 3001 (local dev)
  src/
    app/[schoolId]/office/…
    app/office-bootstrap/
    components/office/
    lib/office/
packages/                       # (future) versioned shared auth/firebase only
```

## Local dev

| App     | Command              | URL                          |
|---------|----------------------|------------------------------|
| Rewards | `npm run dev`        | http://127.0.0.1:3000        |
| Office  | `npm run dev:office` | http://127.0.0.1:3001        |

First-time office setup: `npm run install:office` (installs only into `apps/office/`).

On port 3000, `/{school}/office` redirects to port 3001 via `NEXT_PUBLIC_OFFICE_DEV_ORIGIN` (defaults to `http://127.0.0.1:3001`).

## Production (owner preference)

**Canonical live URL:** `https://portal.leveluprewards.app/{school}/office` (same app as the student portal — no separate office subdomain required).

- **Rewards / portal host** serves School Office at `/{school}/office/…`.
- Leave `OFFICE_CANONICAL_HOST` **unset** in production env (CI `.env`).
- Optional later: `office.leveluprewards.app` on a separate Firebase Hosting site — see `office-subdomain.md`.

Shared: Firebase project, `AUTH_COOKIE_DOMAIN`, `AUTH_GATE_SIGNING_SECRET`.

## Data boundary

Unchanged — see `office-rewards-separation.md`. Office uses only `office*` collections.

## Migration status

- [x] `apps/office` standalone Next.js app (`npm run dev:office` on port 3001)
- [x] School Office routes live on main site `src/app/[schoolId]/office/…`
- [x] Production serves `/{school}/office` on portal host (no subdomain redirect)
- [x] Second Firebase Hosting target (`levelup-office`) in `firebase.json` + CI deploy (optional split deploy)
- [ ] Custom domain `office.leveluprewards.app` — **optional**, not required for owner workflow
