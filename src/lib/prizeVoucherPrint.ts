/**
 * Browser `window.print()` layout for prize redeem slips.
 * Pick the format that matches hardware in School Settings → Printing → Prize voucher paper size.
 *
 * - `label_50x70` — small die-cut labels / portable printers (e.g. Phomemo M110/M110S class), ~50×70 mm @page.
 * - `thermal_80mm` — 80 mm POS/receipt roll thermal printers (e.g. VCP-8370 / POS-80 drivers).
 */
export type PrizeVoucherPaperFormat = 'label_50x70' | 'thermal_80mm';
