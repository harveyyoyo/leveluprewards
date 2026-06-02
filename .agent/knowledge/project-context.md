# LevelUp Rewards project context

**Names**: LevelUp Rewards (also LevelUp Credits / LevelUp Arcade).

**Goal**: Multi-tenant gamification for schools: student rewards, credits, and levels.

**Local folder**: The repo directory may still be named `studio` locally; the GitHub repo is `harveyyoyo/leveluprewards` and the product name is LevelUp Rewards.

## Stack

- Framework: Next.js 15 (App Router).
- Backend: Firebase (Auth, Firestore).
- Tenancy: Multi-tenant routes under src/app/[schoolId]/.
- UI: Tailwind CSS, shadcn/ui.

## Git and remotes

- origin: Primary app repo (harveyyoyo/leveluprewards).
- lovable: UI design lab repo (harveyyoyo/levelupluvable).
- Integration branch: dev -- bridge where Lovable-aligned UI lands and Cursor integrates Firebase logic.

## Engineering role (Cursor)

Senior engineer for plumbing: Firebase hooks, auth/session, props, tenant-safe queries. Preserve visual design from Lovable unless layout or styling changes are requested.
