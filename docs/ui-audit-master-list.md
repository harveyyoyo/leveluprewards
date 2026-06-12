# UI Audit — Master Architectural Optimization List

Repo-wide static UI sweep (June 2026) across 17 view-folder units, run as isolated worktree
agents against `cursor/welcome-tour-fixes`. Four defect classes were hunted: (1) NaN/undefined
rendering, (2) grid row/column mismatches, (3) overlapping/conflicting responsive elements,
(4) Select/dropdown robustness. Every unit ran `tsc --noEmit`, the full vitest suite
(300 tests), and lint before pushing. **~110 mechanical defects were fixed** on the worker
branches below; everything that needed a product decision, a behavior change, or a shared
abstraction was deferred here.

## Branch status


| Unit                     | Branch                             | Status                                                              |
| ------------------------ | ---------------------------------- | ------------------------------------------------------------------- |
| Admin shell              | `fix/admin-shell-ui-sweep`         | PR [#23](https://github.com/harveyyoyo/leveluprewards/pull/23) open |
| Office portal            | `worktree-agent-a1a5011762c450bbc` | **merged** (`ee7ed136`)                                             |
| Displays                 | `worktree-agent-a6f1631edda23f50f` | pending merge                                                       |
| Points & leaderboards    | `worktree-agent-a3ad663daab67d3f6` | pending merge                                                       |
| Student kiosk            | `worktree-agent-aad736a9740a85d74` | pending merge                                                       |
| Prize & games            | `worktree-agent-ad2f824bcc1f9a164` | pending merge                                                       |
| Admin sections A–G       | `worktree-agent-ad7fb28701c47b9f1` | pending merge                                                       |
| Admin sections H–Z       | `worktree-agent-a8dbc83e960d149da` | pending merge                                                       |
| Admin shared components  | `worktree-agent-a53c0bbcfa7d6245d` | pending merge                                                       |
| Library, badges & houses | `worktree-agent-aac3e0e667cbf7ccb` | pending merge                                                       |
| Student & family portals | `worktree-agent-a9c6b8fb907461e16` | pending merge                                                       |
| Public, auth & developer | `worktree-agent-a7665b1873b9153c9` | pending merge                                                       |
| Settings & theming       | `worktree-agent-aef37a67617b525fc` | pending merge                                                       |
| Teacher & printing       | `worktree-agent-afaa081a3327d4221` | pending merge                                                       |
| Staff portal chrome      | `worktree-agent-a734afbaef836b1b4` | pending merge                                                       |
| Classroom & scheduling   | `worktree-agent-a6842023929307114` | pending merge                                                       |


Merge note: commit `58a87530` ("Harden prize, kiosk, and admin UI against malformed numeric
data") on the base branch covers overlapping ground with the Prize/Kiosk/Admin branches but is
an independent patch — expect small, mechanical conflicts in those files when merging.

---

## A. Cross-cutting architectural items (highest leverage)

### A1. Dead off-scale Tailwind opacity modifiers — repo-wide

`tailwind.config.ts` does not extend `theme.opacity`, so any `/N` modifier that is not a
multiple of 5 — and **all** `current/N` / `[currentColor]/N` modifiers — compile to **zero
CSS**. Worse, tailwind-merge can drop a *valid* conflicting class in favor of the dead one
(observed: a fully transparent bulletin card). The sweep fixed every in-unit instance
(213 in `AnimatedSiteBackground.tsx` alone; others in SmartScreenDisplay,
CouponRedeemCelebration, StudentKioskRedeemUI, ClassroomPointsPanel, classroomVisualTheme,
AdminStudentsTab, AdminRaffleTab, AdminBrandingTab (`hover:scale-102`), FaceMismatchBanner,
LibraryStudentSelfCheckoutPortal, OfficePortalShell, ShowcaseLanding, PortalChooseBackdrop,
staffPortalNavStyles, Coupon.tsx).
**Still unfixed (out of every unit's scope — shared lib files):**

- `src/lib/smartScreenThemes.ts` — panel/badge tokens `bg-white/86`, `/88`, `bg-*-950/88-90`,
`bg-*-100/12-16`: most Smart Screen panels render with **no background at all**.
- `src/lib/bulletinBoard.ts:64,70` — `from-emerald-600/12`, `from-rose-500/12` gradient stops
dead; forest/sunset bulletin themes lose their primary stop.
**Fix:** either extend `theme.extend.opacity` with the used steps, or snap the two lib files
to the 5-step scale and add a lint rule banning off-scale modifiers.

### A2. Tailwind v4 syntax on a v3 build

`src/components/ui/chart.tsx:213` used v4-only paren syntax (`border-(--color-border)`) which
compiles to nothing on 3.4 — fixed to `[var(...)]` arbitrary values in the sweep. Grep CI for
`-\(--` to prevent recurrence.

### A3. Ad-hoc z-index ladder — no shared scale

Values observed: 10/20/30/40/45/50/60/70/75/80/90/99/100/101/110/120/130/199/200/210/250/260/
270/280/290/300/310/320/360/500 across ~25 files. **Known real stacking bugs:**

- App header (`HoverRevealHeaderShell.tsx:74`, `z-[200]`) paints **over open dialogs**
(`ui/dialog.tsx` content `z-[110]`, overlay `z-[100]`).
- `ui/alert-dialog.tsx` still at stock `z-50` — an alert-dialog opened above a dialog paints
beneath it; same for dropdown-menu/menubar (`z-50`) inside dialogs.
- `ui/select.tsx` content `z-[320]` paints over toasts (`z-[300]`); classroom award menu
`z-[300]` covers the toast viewport (`z-[100]`) while open.
- Kiosk ladder (30/40/45/50/60/70/75/80/99/360) and settings ladder (270/280/290/300/310)
are coherent locally but uncoordinated globally.
**Fix:** define a z-scale token set (chrome < content overlays < dialogs < alerts < toasts <
tour/spotlight) and migrate the ui/ primitives first.

### A4. Shared safe number/name formatting

`Number(x ?? 0)` / `(name ?? '')` guards are now hand-rolled in 50+ call sites. Two shared
helpers remain unguarded and still render the literal string "undefined":

- `src/lib/office/officeUtils.ts:16` (`getOfficeStudentFullName`) — used by ~6 office views.
- `src/lib/utils.ts` (`getStudentNickname`) — returns raw `firstName`.
A `formatPoints()` / `formatStudentName()` pair in `src/lib` plus a signed-points formatter
(`+N`/`−N` with color, hand-rolled in ≥3 classroom components) would collapse the pattern.

### A5. Hex-alpha color concatenation

`${color}33`-style suffixes produce invalid CSS when the stored color is not 6-digit hex
(hsl/named/3-digit). Instances: `HouseBadge.tsx:24`, `HouseHallOfFameCard`, house-sorting
page, `AchievementModal` (`${accentColor}20`), Badge/EarnedBadges showcases (`${accent}15`),
`HouseSetupWizard.tsx:308,461`, `portal/page.tsx:105,141,374`, `WelcomeOverlay.tsx:113`,
`ThemeGeneratorModal.tsx:56`. **Fix:** shared `colorWithAlpha()` using the
`color-mix(in srgb, X N%, transparent)` idiom already proven in the repo.

### A6. Orphaned-Select fallback pattern needs a shared component

The sweep's "Unknown X (deleted)" guarded fallback `SelectItem` is now hand-rolled in ~15
places (PrizeModal, StudentModal, GoalsManager ×4, AdminClassesTab, AdminPrizesTab,
AdminStudentsTab, HallOfFameSettingsPanel ×2, Office views ×4, TeacherPrinterInner ×3,
StaffPortalNav, SettingsModal ×2, BadgeModal, AchievementModal, LibraryPolicySettingsCard,
OfficeTeacherSelect). Extract `<OrphanSelectItem value label>` into `src/components/ui`.

### A7. AdminRecordListHeader fixed-pixel grid templates

`grid-cols-[76px_minmax(...)_...]` templates (~500–630px min width, no responsive collapse)
are clipped by `overflow-hidden` cards on mobile: AdminBonusPointsTab, AdminBadgesTab,
AdminClassesTab, AdminStaffAccountsTab, AwardCategoriesPanel (also has a latent column-shift
when edit/delete cells conditionally vanish). Needs one shared responsive strategy.

### A8. Dead code & duplication worth deleting

- `TeacherPrinterInner.tsx:1309-1825` — `TeacherAttendancePanel` (~515 lines) is never
rendered; contains its own copies of the orphaned-Select bugs.
- `StudentDashboardInner.tsx` + `student/page.tsx` — near-identical ~180-line import blocks
with dozens of unused imports (copy-split evidence).
- `portal/page.tsx:472-560` — Welcome Tour launcher logic copy-pasted four times.
- `TeacherPrinterInner.tsx:2518-2590` — `onBudgetSpend` budget-mutation closure triplicated.
- `OfficeCsvImportDialog.tsx:51` — CSV text smuggled via `window.__officeCsvText` global.
- `RecentRedemptions` (TeacherPrinterInner:1009) — one Firestore query per student per mount;
candidate for a collectionGroup query.

---

## B. Deferred behavioral/product decisions (REPORTED, not fixed)


| Where                                                                                          | Issue                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SmartScreenDisplay.tsx:674`                                                                   | Portrait/dashboard grids hold exactly 12 cells but up to 13 modules can be enabled; the 13th is clipped by `overflow-hidden`. Cap modules or use auto-rows.                                           |
| `HallOfFameRouteView.tsx:799`                                                                  | Podium grid for 2 or 4 winners leaves first place off-center (n=1 fixed; intermediate counts need explicit grid placement).                                                                           |
| `BonusSpinWheelModal.tsx:68`                                                                   | `if (isSpinning || result)` treats a 0-point win as not-spun → second spin + double `onWon`. Recommend `result !== null`.                                                                             |
| `AchievementModal` save path                                                                   | Clearing all wheel slices doesn't delete stored `wheelSegments` (`updateDoc(removeUndefined(...))` keeps stale segments; needs `deleteField()`).                                                      |
| `JackpotMachine.tsx:97`                                                                        | `new Ctx()` without the AudioContext-availability guard RaffleSpinWheel has.                                                                                                                          |
| `ClassroomPointsPanel.tsx:2082`                                                                | "Auto +N in Xs" countdown computed once per render — label sits stale while the timer runs.                                                                                                           |
| `StudentKioskRecessCheckoutCard.tsx:33`                                                        | Elapsed "out of room" timer has no ticking interval — stale until unrelated re-render.                                                                                                                |
| `ClassAwardsLiveSettingsSection.tsx:226`                                                       | `<Button asChild disabled>` wraps a `<Link>` — `disabled` is inert on anchors; link stays clickable when the portal toggle is off.                                                                    |
| `AdminStatsTab.tsx:41-88`                                                                      | Stat-card label/semantics mismatch ("Total Points Issued" = lifetime points; "Value Redeemed" = coupon value; System Stats reuses the same prop as "Points Issued").                                  |
| `AdminTeachersTab.tsx:358,696,790`                                                             | Staff passcodes rendered in plain text in rows and tooltips — masking is a product call.                                                                                                              |
| `AdminBrandingTab.tsx:1155-1552`                                                               | Kiosk simulator vs edit dialog disagree on gradient options (candy/forest/default fall back to slate; default references unoffered `'sapphire'`) and on `kioskLoginTabFaceEnabled` default semantics. |
| `AdminBrandingTab.tsx:1177`                                                                    | `sticky top-6` inside an `overflow-hidden` Card — sticky never engages.                                                                                                                               |
| `WelcomeGreeting.tsx` (several styles)                                                         | `Math.random()` in initializers → SSR/hydration nondeterminism (re-render flicker fixed; first-paint mismatch remains).                                                                               |
| `WelcomeGreeting.tsx:2541,2631`                                                                | Postcard/Storybook fixed `grid-cols-2` spreads cramp below ~360px.                                                                                                                                    |
| `Header.tsx:583`                                                                               | Web-mode header hardcodes English strings where compact header uses `t(...)`.                                                                                                                         |
| `SettingsModal.tsx:1363` / `ThemeGeneratorModal.tsx:693`                                       | Selects render empty trigger for off-list stored values (audio theme pack, AI font scale).                                                                                                            |
| `AnimatedSiteBackground.tsx:936`                                                               | Backdrop resolution ignores role-specific `student/teacherAnimatedBackgroundStyle` overrides (assumed resolved upstream — verify).                                                                    |
| `DeveloperSchoolScreensSheet.tsx:81`                                                           | Fixed `scale-[0.46]` preview iframe never adapts to cell width; ResizeObserver scaled-preview pattern exists in `displays/*ScaledPreview.tsx`.                                                        |
| `ShowcaseLanding.tsx:283`                                                                      | `-z-10` decorative blobs paint behind the opaque page background — invisible; needs z-restructure.                                                                                                    |
| `KioskWedgeCameraAssist.tsx:43`                                                                | Bottom-left camera preview (z-[75]) can overlap bottom-center kiosk controls on narrow viewports.                                                                                                     |
| `KioskSponsorBanner.tsx:114`                                                                   | Fixed banner offsets assume header/tab-bar heights (magic `top-20`, safe-area calc).                                                                                                                  |
| `StudentDashboardInner.tsx:1721`                                                               | Desktop eligible-prizes rail lacks the empty state its mobile twin has.                                                                                                                               |
| `AdminHousesTab.tsx:845` / `AdminStudentPortalTab.tsx:337` / `ManualPointsAwardDialog.tsx:509` | Empty lists render blank bodies with no empty-state message.                                                                                                                                          |
| `StudentActivityList.tsx:70` + `StudentDashboardInner.tsx:1275`                                | `item.desc` string methods would throw on docs missing `desc` (no repo convention to follow yet — fold into A4).                                                                                      |
| `AdminCouponsTab.tsx:339` / `developer/page.tsx:1327`                                          | "Invalid Date" renders for malformed legacy timestamps (guarded variants exist nearby to copy).                                                                                                       |
| `AdminClassesTab.tsx:84`                                                                       | `lastName.localeCompare` on a typed-required-but-legacy-missing field (defend or backfill).                                                                                                           |
| `OfficePortalShell.tsx:161`                                                                    | Nonstandard CSS `zoom` on the main pane — replace with the existing rem-scale mechanism.                                                                                                              |
| `SmartScreenSettingsPanel.tsx:208`                                                             | Orphaned `activeProfileId` if another session deletes the profile remotely.                                                                                                                           |
| `StaffPortalWelcomeTab.tsx:241`                                                                | Teacher variant overloads `welcomeStats.staffCount` to mean "point categories" — per-role stats shape wanted.                                                                                         |
| `BonusSpinWheelModal.tsx:13`                                                                   | `achievement: any` prop is the root cause of segment-type bugs — type it.                                                                                                                             |
| `GoalsManager.tsx:377`                                                                         | Trailing "·" separator when legacy goal lacks `status`.                                                                                                                                               |


---

## C. Verification baseline

Every worker branch passed: `npx tsc --noEmit -p tsconfig.json` (clean), `npm test`
(300/300), `npm run lint` (no new findings in touched files), plus a code-review pass with
findings fixed pre-commit. Browser e2e was skipped by user decision (no browser automation
available in the audit environment); the highest-value follow-up verification is a visual
pass over the Smart Screen / bulletin themes after fixing A1's two lib files, since those
were rendering with missing backgrounds for some time.