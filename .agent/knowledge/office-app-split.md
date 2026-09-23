# School Office — no longer a separate app

There used to be a second, standalone Next.js app at `apps/office` (its own `node_modules`,
its own dev server on port 3001, its own Firebase Hosting site `levelup-office`) that local dev
would silently hand off to whenever you opened `/{schoolId}/office`. It had fallen out of sync
with the real School Office code and was removed — it was confusing more than it helped: two
people (or one person and their tooling) could easily end up looking at two different versions
of "the Office app" without realizing it.

**Current state:** School Office is just part of the main app, same as everything else.

- Code: `src/app/[schoolId]/office/…`, `src/components/office/`, `src/lib/office/`.
- Local dev: `npm run dev` (port 3000) — no second server, no hand-off. Opening
  `/{schoolId}/office` renders directly.
- Production: `https://portal.leveluprewards.app/{school}/office` (owner preference — same app
  as the student portal, no separate office subdomain required). See `office-subdomain.md` for
  the optional `office.leveluprewards.app` redirect-only behavior.
- Data: still `office*` Firestore collections only — see `office-rewards-separation.md`.

If you find a reference to `apps/office`, `dev:office`, `build:office`, `install:office`, or the
`levelup-office` Firebase Hosting site anywhere, it's stale — safe to delete.
