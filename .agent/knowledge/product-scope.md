# Product scope (north star)

This app has grown beyond a minimal “points and prizes” sketch. This document
gives humans and assistants a shared **spine** so new work stays intentional.

## One-sentence north star

**Teachers can award and track rewards; students can see and spend them; school
admins can configure the school.** Developer-level access exists for operating
many school instances.

If a change does not clearly support that sentence, treat it as **optional
depth** (still allowed), not as part of the non-negotiable core.

## Core vs optional (working model)

**Core (must stay reliable for real school use)**

- School login and role-appropriate access (student, teacher, admin).
- Awarding / recording points and related flows teachers rely on.
- Student visibility of balance and history where the product promises it.
- Prize catalog and redemption aligned with school configuration.
- Admin configuration of people, classes, prizes, and school settings needed
  for the above.
- Data integrity and Firestore access consistent with deployed rules.

**Common “optional depth” (valuable but not the spine)**

- Extra engagement surfaces (games, wheels, seasonal UI), extended reporting,
  branding polish, and similar—ship when ready, but avoid coupling them so
  tightly that core flows cannot be tested or fixed in isolation.

When in doubt, compare against the pre-deployment checklist in
`deployment.md` (especially login and core portals).

## Lightweight habit for new features

When adding or substantially changing a feature, add **one line** (PR
description, commit body, or a short note in the same change) that states:

- **Who** uses it (role),
- **What job** it does,
- **Tier**: `core` or `optional`.

That single habit prevents unnamed behavior from accumulating.

## Related

- `product-ladder.md` — sales levels mapped to product pillars (`payClassroom`, etc.).
- `deployment.md` — stability and login verification before release.
- `future-addon-integration-map.md` — where planned addons (inventory alerts,
  FERPA-style display names, parent digests, SSO/roster, offline teacher queue,
  schedule import UX, rubrics) should integrate in the repo.
