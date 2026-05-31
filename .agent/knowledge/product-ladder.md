# Product ladder (sales ↔ engineering)

Maps customer-facing **levels** to runtime **product pillars** (`appSettings.pay*`) and
feature flags. Use this when scoping work, writing marketing copy, or toggling school
entitlements in Developer → Product pillars.

**Runtime gating:** `@/lib/productPillars` — pillars are the subscription-style gates.
Legacy `plan` tiers on the school doc remain for billing labels only.

---

## Level 1 — Rewards Core

**Pillar:** `payRewards` (defaults on)

**Job:** Teachers award points; students redeem prizes; admins configure the school.

| Student-facing (hidden when pillar off) | Feature keys / routes |
|------------------------------------------|------------------------|
| Student kiosk & portal | `/student`, `/student-home`, prize shop, coupon redemption |
| Prize shop & redemption | prizes, coupons, `/prize` |
| Kiosk raffle ticket display | `enableWeeklyRaffle` on kiosk (teacher raffle draw is always available) |

| Staff / admin (Rewards pillar or Classroom) | Feature keys / routes |
|---------------------------------------------|------------------------|
| Staff point awards | teacher/admin points tabs, categories, coupons |
| Engagement add-ons | badges, levels, houses, Hall of Fame TV |
| **Smart Screen** (hallway / lobby signage) | `smartScreen*`, `/smart-screen` — **not pillar-gated** |

| Teacher-operational (not blocked by `payRewards`) | Notes |
|---------------------------------------------------|--------|
| Raffle draw (teacher portal) | Pin **Add more → Raffle**; general or points-based pool |
| Goals, Attendance, Homework | Gated by own flags / pillars |

Schools on Level 1 only should not expect classroom seating or attendance-as-compliance
tooling. Smart Screen is available on every plan when enabled in Admin.

---

## Level 2 — Classroom Management

**Pillar:** `payClassroom` (defaults on for existing schools)

**Job:** Daily classroom operations for teachers — seating layout and quick point awards
(planned: family transparency).

| Included today | Feature keys / routes |
|----------------|------------------------|
| Classroom seating & quick awards | `ClassroomPointsPanel`, `/classroom`, Admin/Teacher → **Classroom** tab |
| Classroom room display | `/classroom-screen`, Classroom tab → **Room display** |
| Setup wizard | Admin → Classroom → **Classroom setup** |
| Parent visibility (planned) | `enableParentView` — gated by this pillar when shipped |

| Planned under this pillar | Notes |
|---------------------------|--------|
| Parent read-only portal | Points history, attendance summary, behavior notes |
| Structured behavior / incident log | Principal timeline across classes |
| Classroom bulletin & announcements | Extends Admin → Bulletin for class-facing posts |
| Principal behavior dashboard | Read-only rollup from point + incident data |

**Not in Classroom pillar:** hallway Smart Screen (included on all plans — see Level 1), full gradebook
(see Level 6 Office), LMS assignments (integrate, don’t duplicate), attendance compliance
(see Level 3).

---

## Level 3 — Attendance

**Pillar:** `payAttendance` (defaults on)

**Job:** Class sign-in, on-time rewards, attendance logs, parent/staff alerts.

| Included | Feature keys |
|----------|--------------|
| Kiosk / class sign-in | `enableClassSignIn`, `enableAttendance` |
| Period schedules & on-time points | attendance settings, `attendanceLog` |
| Absence / lateness notifications | `AdminNotificationsTab`, Cloud Functions |

---

## Level 4 — Homework Rewards

**Pillar:** `payHomework` (defaults on)

**Job:** Teachers mark homework complete and issue category-linked points (not a full LMS).

| Included | Feature keys |
|----------|--------------|
| Teacher homework tab | `enableHomework`, staff portal → Homework |
| Homework-linked categories | point categories scoped to homework |

---

## Level 5 — Library

**Pillar:** `payLibrary` (defaults on)

**Job:** Catalog, checkout scans, overdue handling, library notifications.

| Included | Feature keys |
|----------|--------------|
| Library admin & kiosk scans | `library*`, `/library` |
| Student self-checkout portal | `libraryAutoStudentPortalEnabled` |

---

## Level 6 — School Office (opt-in)

**Pillar:** `payOffice` (defaults **off**)

**Job:** Grades, report cards, billing, and office roster — **separate from rewards data**.

| Included | Routes |
|----------|--------|
| Office grades & billing | `/office`, `office*` Firestore collections |
| Family statements | Office family views |

See `.agent/knowledge/office-rewards-separation.md` — never merge office and rewards rosters
without an explicit migration.

---

## Typical bundles

| Bundle | Pillars | Best for |
|--------|---------|----------|
| **Starter** | Rewards | Points + prizes only |
| **Classroom** | Rewards + Classroom | Teachers running the room daily |
| **Culture** | Rewards + Classroom + Attendance + Homework | Whole-school positive behavior |
| **Full campus** | All pillars including Library | K–12 with library checkout |
| **Office add-on** | + School Office | Schools that need grades/billing on levelUp |

---

## Developer toggles

- **Developer → Product pillars** per school: `payClassroom`, `payAttendance`, `payLibrary`, `payHomework`, `payOffice`.
- **Admin → Settings → Product pillars** (school admin): same flags except Office entry is separate.
- Disabling `payClassroom` turns off `enableParentView` via `applyEntitlements` in `SettingsProvider`. Smart Screen is **not** tied to any pillar.

---

## Related

- `product-scope.md` — north star and core vs optional
- `future-addon-integration-map.md` — where parent digest, SSO, rubrics plug in
- `office-rewards-separation.md` — Office pillar boundaries
