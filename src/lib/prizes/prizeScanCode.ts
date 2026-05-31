/** Prefix for prize shelf / ID card barcodes (Code 39–safe, distinct from numeric student NFC IDs). */
export const PRIZE_SCAN_PREFIX = 'PZ';

const SCAN_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Strip scanner wrappers (*…*) and whitespace; uppercase. */
export function normalizeScanInput(raw: string): string {
  let s = raw.trim().toUpperCase();
  if (s.startsWith('*') && s.endsWith('*') && s.length >= 2) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function isPrizeScanCode(code: string): boolean {
  const n = normalizeScanInput(code);
  return n.startsWith(PRIZE_SCAN_PREFIX) && n.length >= PRIZE_SCAN_PREFIX.length + 4;
}

export function generatePrizeScanCode(): string {
  let code = PRIZE_SCAN_PREFIX;
  for (let i = 0; i < 6; i++) {
    code += SCAN_CHARS[Math.floor(Math.random() * SCAN_CHARS.length)];
  }
  return code;
}

/** Resolve the barcode value for a prize (stored or derived for legacy docs). */
export function prizeScanCodeFor(prize: { id: string; scanCode?: string }): string {
  const stored = prize.scanCode?.trim().toUpperCase();
  if (stored && isPrizeScanCode(stored)) return stored;
  return derivePrizeScanCode(prize.id);
}

/** Stable derived code when Firestore has no scanCode yet (until backfill). */
export function derivePrizeScanCode(prizeId: string): string {
  let h = 2166136261;
  for (let i = 0; i < prizeId.length; i++) {
    h ^= prizeId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let code = PRIZE_SCAN_PREFIX;
  let state = h >>> 0;
  for (let i = 0; i < 6; i++) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    code += SCAN_CHARS[state % SCAN_CHARS.length];
  }
  return code;
}
