# School Office — standalone app split

## Goal

Develop **Rewards** and **School Office** independently. Changes in one app must not require rebuilding or retesting the other.

## Isolation contract

| Layer | Rewards (root) | Office (`apps/office`) |
|-------|----------------|------------------------|
| Source code | `src/` — no office UI | `apps/office/src/` — no rewards UI |
| `node_modules` | Root only | `apps/office/node_modules` only (not an npm workspace) |
| Dev server | Port 3000 | Port 3001 |
| Typecheck | `npm run typecheck` | `cd apps/office && npm run typecheck` |
| Build | `npm run build` | `cd apps/office && npm run build` |

**Still shared at runtime (by design):** one Firebase project, auth cookies on `.leveluprewards.app`, and the portal→office handoff API on Rewards. That does not couple your day-to-day edits in either codebase.

## Layout

```
leveluprewards/                 # Rewards app (root) — port 3000
  src/                          # No office routes or components
apps/office/                    # School Office app — port 3001
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

Use `OFFICE_CANONICAL_HOST` unset locally; office routes are `http://127.0.0.1:3001/{school}/office/…`.

## Production

- **Rewards** (`leveluprewards.app` / portal host): keeps `GET /api/auth/office-handoff/redirect` only.
- **Office** (`office.leveluprewards.app`): separate Firebase Hosting site + SSR backend when ready.
- Shared: Firebase project, `AUTH_COOKIE_DOMAIN`, `AUTH_GATE_SIGNING_SECRET`.

## Data boundary

Unchanged — see `office-rewards-separation.md`. Office uses only `office*` collections.

## Migration status

- [x] `apps/office` standalone Next.js app (`npm run dev:office` on port 3001)
- [x] Office UI/routes removed from rewards root `src/`
- [x] Slim `OfficeAuthProvider` (no rewards AppProvider)
- [x] Rewards links redirect `/{school}/office` → office app via `NEXT_PUBLIC_OFFICE_DEV_ORIGIN`
- [x] Rewards middleware no longer rewrites office-host paths (office app owns its middleware)
- [ ] Second Firebase Hosting target for independent office deploy
- [ ] Remove rewards `src/lib/office/*` (developer sample-school seed only; use `npm run seed:demo-office`)

## Day-to-day rule

**Office work** → edit only under `apps/office/`, run `npm run dev:office`.  
**Rewards work** → edit only under root `src/`, run `npm run dev`.  
Do not import across apps; shared runtime is Firebase + auth cookies + one handoff API on Rewards.
