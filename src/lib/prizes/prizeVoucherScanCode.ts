import { normalizeScanInput } from '@/lib/prizes/prizeScanCode';

/** Prefix for printed pickup vouchers (distinct from shelf cards `PZ`). */
export const PRIZE_VOUCHER_PREFIX = 'VR';

const SCAN_CHARS = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generatePrizeVoucherScanCode(): string {
  let code = PRIZE_VOUCHER_PREFIX;
  for (let i = 0; i < 8; i++) {
    code += SCAN_CHARS[Math.floor(Math.random() * SCAN_CHARS.length)];
  }
  return code;
}

export function isPrizeVoucherScanCode(raw: string): boolean {
  const n = normalizeScanInput(raw);
  return n.startsWith(PRIZE_VOUCHER_PREFIX) && n.length >= PRIZE_VOUCHER_PREFIX.length + 6;
}

export function normalizePrizeVoucherScanCode(raw: string): string {
  return normalizeScanInput(raw);
}
