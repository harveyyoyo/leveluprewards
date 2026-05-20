# UI pattern: content section tree navigation

When a **single admin (or office) tab** contains **two or more major content panels** (separate cards or regions that could stand alone), do **not** stack them all on one long scroll page by default.

Use **`ContentSectionTreeNav`** (`@/components/ui/content-section-tree-nav`) so the user picks one panel at a time.

## Visual rules

- **Centered** under the tab header / filters.
- **Tree metaphor**: small vertical stem + horizontal branch line, then section labels as **text links** (not `TabsList` / pill buttons).
- Active section: foreground text + short primary underline.
- Inactive: muted; hover brightens.
- Optional `branchLabel` for context (usually the tab name).
- Optional `badge` per section (counts).

## Behavior

- Only one primary content panel visible at a time.
- Keep shared filters/toolbars **above** the tree nav when they apply to all sections.
- Section-specific actions stay inside that section’s panel.

## When to use

| Use tree nav | Skip (single panel is fine) |
|--------------|-----------------------------|
| Coupons: Available vs Redeemed | One card with one list |
| Attendance: Defaults / Periods / Teachers | Single settings form |
| Branding: Logo / Photos / Theme / … | One small card only |
| Hall of Fame: Settings vs Preview | Settings + preview in one flow |

## Bulk selection (Students tab)

Multi-select actions live on the **same row as “Add Student”** (count + Actions dropdown + Clear), not a second toolbar row that pushes the list.

## Adding a new tab

1. If you add a second `Card` (or equivalent major panel), add `ContentSectionTreeNav` + `useState` for `sectionId`.
2. Render the active section only.
3. Do not introduce a second row of pill tabs for the same level of navigation.
