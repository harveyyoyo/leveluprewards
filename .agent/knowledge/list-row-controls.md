# List row controls (staff admin lists)

When a staff list row has a setting or permission that can be turned on or off, **show the control on the row** — not only inside an edit dialog.

## Rule

- **All toggles that exist for a record type should appear on every row** in that list (desktop grid and a sensible mobile stack).
- Use compact `Switch` controls with short column headers (e.g. **House pts**, **Golden**, **Houses**).
- Edit dialogs may repeat the same fields for bulk context, but **must not be the only place** to flip a toggle.
- Prefer immediate save on toggle (`onUpdateCategory` / `onUpdateTeacher` / `updateSettings`).

## Examples in this repo

| List | Row toggles |
|------|-------------|
| Points → Categories | Counts toward house points, Golden ticket |
| Admin → Teachers | Can manage houses (when houses enabled) |

## Ceremony / presentation routes

Routes meant for an audience (e.g. `/house-sorting`) are **presentation only**:

- Full screen, no app header.
- No admin copy, settings switches, or “open admin” links on the main view.
- Configure options in Admin (Houses tab, Settings) before launching the ceremony.
