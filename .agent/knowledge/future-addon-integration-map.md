# Future addon integration map

Where planned or discussed addons should plug into this codebase. Assists
Antigravity, Cursor, and Codex when scoping work without re-discovering paths.

**Related:** `product-scope.md`, `deployment.md`.

---

## 1. Prize inventory, restock alerts, pause redeem when empty

**Status:** Core inventory and redemption logic already exist; staff alerts are
wired in Cloud Functions.

| Concern | Location |
|--------|----------|
| Transactional redeem + stock | `src/lib/db/prizes.ts` (`redeemPrize`) — `stockCount`, `inStock` |
| Admin / editor UI | `src/components/PrizeModal.tsx`, `src/app/[schoolId]/admin/sections/AdminPrizesTab.tsx` |
| Student shop caps | `src/app/[schoolId]/prize/PrizeDashboard.tsx` |
| School notification toggles | `src/components/providers/SettingsProvider.tsx` — `notificationPrizeInventoryEnabled`, `notificationPrizeLowStockThreshold`, `notificationPrizeEmptyShopEnabled`, `inventoryLastEmptyShopAlertAt` |
| Admin UI for toggles | `src/app/[schoolId]/admin/sections/AdminNotificationsTab.tsx` |
| Low stock / empty shop triggers | `functions/src/index.ts` — `onPrizeUpdated` |

**Follow-ups (if product wants more):** in-app admin banners; per-role routing
of inventory alerts; extend `queueStaffInventoryAlerts` usage in the same
Functions file.

---

## 2. FERPA-minded privacy (public nickname vs full name for staff)

**Approach:** Add an `appSettings` flag; centralize display naming in a helper
(e.g. extend `getStudentNickname` in `src/lib/utils.ts` or add
`displayStudentNameForAudience(...)`).

| Surface | Location | Notes |
|--------|----------|--------|
| Hall of Fame | `src/app/[schoolId]/hall-of-fame/page.tsx` | Today builds display name from nickname/first + `lastName`; public mode should mask or omit legal surname where appropriate |
| Bulletin | `src/app/[schoolId]/bulletin-board/page.tsx` | Audit any student-identifying strings in posts |
| Printed vouchers | `src/components/PrizeRedeemTicketPrintSheet.tsx`, print styles in `src/app/globals.css` | Policy: physical artifacts may differ from on-screen kiosk |
| Schema | `src/lib/types.ts` | `Student.nickname` already exists |

Staff rosters (e.g. `AdminStudentsTab.tsx`) can continue using full names.

---

## 3. Parent digest (weekly email/SMS, opt-in)

**Pattern:** Match attendance notifications in Functions: parent contact fields on
student docs, `notificationPrefs` object.

| Piece | Location |
|-------|----------|
| Reference implementation | `functions/src/index.ts` — `onAttendanceLogCreated` (parent/student email and phone, prefs gating) |
| New scheduled job | Same file: `pubsub.schedule` or equivalent time trigger alongside existing exports |
| School-level switches | `SettingsProvider.tsx` + `AdminNotificationsTab.tsx` |
| Per-family opt-in | `students/{id}.notificationPrefs` — add digest keys consistent with existing prefs |

Prefer keeping send logic in **Firebase Functions** with existing HTML helpers in
`functions/src/index.ts` unless there is a strong reason to add Next.js API
routes.

---

## 4. Google Classroom / Clever / ClassLink (roster sync + SSO)

| Piece | Location |
|-------|----------|
| Client session / roles | `src/components/providers/AuthProvider.tsx` |
| Firestore targets | `schools/{schoolId}/students`, `classes`, `teachers` (see `functions/src/index.ts` `SUBCOLLECTIONS` and `src/lib/db/*`) |
| Secrets / OAuth | Server-only: new `src/app/api/...` routes and/or Callable Functions in `functions/src/index.ts` — avoid exposing client secrets |
| Admin onboarding UI | `src/components/BulkRosterSetupDialog.tsx`, `src/app/[schoolId]/admin/page.tsx` (alongside CSV and AI import) |

Store stable external IDs on documents or a dedicated map field to support
idempotent merges on re-sync.

---

## 5. Offline-first teacher PWA (queue awards, sync later)

| Piece | Location |
|-------|----------|
| Service worker | `public/sw.js`, workbox bundle under `public/` |
| Manifest per school | `src/app/api/manifest/route.ts` (shortcuts include Teacher) |
| Connectivity | `AuthProvider.tsx` — `SyncStatus`, offline-aware `getDoc` usage |
| Award entry points | `TeacherPrinterInner.tsx` (`handleAwardPoints`, homework rewards); `AppProvider.tsx` (`awardPoints_`, `awardPointsToMultipleStudents_`) |
| SW registration edge cases | `src/components/LayoutClientWrapper.tsx` |

**New module suggestion:** `src/lib/offlineAwardQueue.ts` (IndexedDB) with
flush on `online` and app start; wrap Firestore award calls when
`navigator.onLine === false` or writes fail.

---

## 6. Schedule import improvements (guided column mapping)

| Path | Location |
|------|----------|
| AI student parse | `src/components/AiStudentImporter.tsx` → `src/app/api/parse-students/route.ts` |
| Bulk AI + documents | `src/components/BulkRosterSetupDialog.tsx`, `src/lib/schoolDataImport.ts` (`ParsedSchoolSnapshot` includes `periods`) |
| Strict CSV templates | `src/lib/rosterCsvTemplates.ts`; admin CSV handlers in `src/app/[schoolId]/admin/page.tsx` |

**UX:** Add a review/mapping step (dedicated component under e.g.
`src/components/import/`) before committing parsed rows to Firestore.

---

## 7. Rubric-linked rewards

**Closest model:** Point categories — `src/lib/db/categories.ts`, teacher UI
selecting `awardCategoryId` in `TeacherPrinterInner.tsx`. Execution stays in
`src/lib/db/students.ts` (`awardPointsToStudent`, `awardPointsToMultipleStudents`).

**Options:** Extend `Category` in `src/lib/types.ts` with optional rubric levels,
or add `schools/{schoolId}/rubrics` subcollection. Teacher UI: rubric row picker
next to category/points when the category defines a rubric.

---

## Suggested build order

1. Inventory polish (mostly done; alerts in Functions).
2. FERPA display helper + settings + public surfaces.
3. Offline award queue (touches core teacher flows — test carefully).
4. Parent digest (Functions + prefs).
5. External SSO + roster sync (largest cross-cutting work).
6. Schedule column-mapping wizard (isolated to import UX).
7. Rubrics on categories (extends existing teacher category flow).
