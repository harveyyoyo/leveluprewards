# School Office — family model (Option A)

**Status:** Types and collections in place; full profile UI is Phase 2.

## Model

- **`officeFamilies`** — household profile: `displayName`, `contacts[]` (parent, guardian, grandparent, emergency), `medicalNotes`, `legalNotes`, `busRoute`, `busNotes`, `generalNotes`.
- **`officeStudents.familyId`** — links student to household.
- **`officeBillingAccounts.familyId`** — links billing to the same household (money stays on billing account; profile stays on family).

Rewards `students` collection is **never** used for Office family data.

## Audit

- **`officeAuditLog`** — append-only; `writeOfficeAuditEntry()` in `src/lib/office/officeAuditLog.ts`.
- Wired on `saveOfficeSettings` when `features.auditLog` is on (default true).
- Extend to all Office writes in follow-up PRs.

## Terminology

- `OfficeSettings.useMarksTerminology` — when true, nav/copy uses "Marks" instead of "Grades".
- `getOfficeMarksLabels()` / `getOfficeNavItems(settings)` in `src/lib/office/officeTerminology.ts`.

## Feature flags

`OfficeSettings.features`: `familyProfiles`, `studentPhotos`, `busInfo`, `medicalNotes`, `aiHelp`, `auditLog` (all default on).
