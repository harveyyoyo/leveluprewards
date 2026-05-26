# School Office vs Rewards — separation rule

**Status:** Active boundary. Full product split (separate deploy/host) is planned later; until then, enforce this in code and data.

## Principle

**School Office** (grades, billing, office roster) and **Rewards** (points, prizes, arcade kiosk) are **different products** that share a school slug and login infrastructure only. They must **not** share roster logic, imports, or Firestore collections.

## Firestore boundaries

| Rewards (do not use from Office UI/lib) | Office-only |
|----------------------------------------|-------------|
| `students` | `officeStudents` |
| `classes` | `officeClasses` |
| `teachers` | `officeTeachers` |
| `staffAccounts` (desk roles for rewards) | Office sign-in: `staffAccounts` with `role: office` only |
| Points, coupons, prizes, houses | `officeGradeEntries`, `officeBillingAccounts`, `officeInvoices` |
| | `officeSettings` |

## Code rules

1. **No reads/writes** from Office features to `schools/{id}/students`, `classes`, or `teachers` (rewards collections).
2. **No “sync from rewards roster”** or import paths that copy rewards data into office collections. (Removed: `importRewardsRoster`, `syncRewardsRoster`.)
3. **Demo seed** may use the same *sample IDs* for convenience on `schoolabc` / `yeshiva`, but office demo data is written only to `office*` collections (+ office staff account). Do not call `syncSchoolStaffDirectory` with rewards `teachers` when seeding office.
4. **Teacher assignment for grades** uses `officeTeachers` + `officeStudents.teacherId`. Legacy `teacherName` on office students is display fallback only until migrated.
5. **Admin → Teachers & staff** remains the rewards teacher roster. Office → **Teachers** is the academic/homeroom roster for grades and reports.

## UI copy

- Office guide and empty states should say roster/grades/billing are **office-only**, not tied to the prize shop.
- Avoid suggesting office staff “sync” or “import from rewards” unless building an explicit, user-initiated migration tool (not implemented).

## Future split

When Office is deployed separately, this boundary becomes physical (API + auth). Keep types and paths prefixed (`office*`) so extraction stays straightforward.

## Related

- `product-scope.md` — core vs optional pillars (`payOffice`).
- `office-subdomain.md` — hosting/routing.
