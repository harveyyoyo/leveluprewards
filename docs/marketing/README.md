# Marketing assets

## LevelUp flyer (`levelup-flyer.html`)

Print-ready **US Letter (8.5×11)** one-pager aligned with the [level-up-arcade](/src/app/level-up-arcade/page.tsx) landing and `src/lib/appBranding.ts`.

**Promotions hub:** `/promotions` — lists all flyer styles with preview cards.

**Flyer styles** (under `public/marketing/`):

| File | Style |
|------|--------|
| `flyer-arcade.html` | Arcade neon (dark, fuchsia/cyan) |
| `flyer-scholastic.html` | Scholastic indigo (light, parent-friendly) |
| `flyer-professional.html` | Professional brief (white, admin/procurement) |
| `flyer-bold.html` | Bold navy (high-contrast poster) |
| `flyer-sunset.html` | Sunset warm (open house / community) |
| `flyer-retro.html` | Retro pixel (student-facing) |
| `flyer-minimal.html` | Minimal mono (low ink) |
| `flyer-teachers-quickstart.html` | Teachers & staff quickstart |
| `flyer-staff-pbis-playbook.html` | Staff PBIS playbook |
| `flyer-families-home-portal.html` | Families - home portal access |
| `flyer-feature-rewards-shop.html` | Feature - rewards shop |
| `flyer-students-elementary.html` | Elementary K–5 (playful) |
| `flyer-students-middle.html` | Middle school 6–8 |
| `flyer-students-high.html` | High school 9–12 |
| `flyer-principal-data.html` | Principals — PBIS data |
| `flyer-principal-rollout.html` | Principals — rollout steps |
| `flyer-principal-roi.html` | Principals — value & budget |
| `flyer-principal-tech.html` | Principals — technology, safety & compliance |
| `flyer-feature-houses.html` | Feature — school houses |
| `flyer-feature-raffle.html` | Feature — weekly raffle |
| `flyer-feature-library.html` | Feature — school library |
| `flyer-feature-student-portal.html` | Feature — student home portal |
| `flyer-feature-bulletin.html` | Feature — bulletin board display |
| `flyer-feature-engagement.html` | Feature — achievements & engagement |
| `flyer-feature-hall-of-fame.html` | Feature — Hall of Fame display |
| `flyer-feature-attendance.html` | Feature — attendance & periods |
| `flyer-feature-notifications.html` | Feature — staff notifications |
| `flyer-feature-id-cards-themes.html` | Feature — student ID cards & theme designer |
| `flyer-feature-student-kiosk.html` | Feature — student kiosk (scan card) |

**Screenshots:** Flyers use live app captures in `public/marketing/screenshots/`—cropped to the active feature content (tab panel, kiosk card, leaderboard, etc.), not the full page with header/navigation. Regenerate with `npm run capture:flyer-screenshots` or `node scripts/recapture-marketing-weak.mjs` (see `scripts/marketing-screenshot-content.mjs`).

Previews on `/promotions` use scaled iframes (`?embed=1` hides print hints). Shared assets: `flyer-embed.js` (loads `flyer-print.css` for screenshot scaling). Catalog & sections: `src/lib/marketingPromotions.ts`.

### Unified footer (all flyers)

Every `public/marketing/flyer-*.html` ends with the same block:

1. **Approved NYC Department of Education (DOE) vendor**
2. **leveluprewards.app** · **contact@leveluprewards.app**
3. **© 2026 LevelUp EdTech Enterprises LLC**

Styles live in `public/marketing/flyer-print.css` (`.flyer-footer`). To re-apply after editing footers manually, run `node scripts/apply-flyer-footer.mjs`.

**Capture helpers:** `npm run capture:flyer-screenshots`, `node scripts/recapture-marketing-weak.mjs`, `npm run capture:flyer-id-cards-themes`.

`levelup-flyer.html` redirects to `/promotions`. Catalog: `src/lib/marketingPromotions.ts`.

### Open locally

From the repo root (paths in the HTML are relative to `docs/marketing/`):

```bash
# Windows
start docs/marketing/levelup-flyer.html

# macOS
open docs/marketing/levelup-flyer.html
```

### Print or save as PDF

1. Open the file in Chrome or Edge.
2. **Ctrl+P** (or **Cmd+P**).
3. Paper: **Letter**, margins **None** (or minimum).
4. Enable **Background graphics**.
5. Destination: **Save as PDF** or your printer.

### Customize

Edit copy, stats, and URLs directly in `levelup-flyer.html`. Preview images load from `public/` via relative paths (`../../public/...`).
