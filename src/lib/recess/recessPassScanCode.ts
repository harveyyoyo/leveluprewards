import type { RecessReason } from '@/lib/types';
import { normalizeScanInput } from '@/lib/prizes/prizeScanCode';

/** Prefix for recess / bathroom pass barcodes (Code 39–safe). */
export const RECESS_PASS_SCAN_PREFIX = 'RC';

/** Fixed kiosk pass codes — print one card per category; same codes for every school. */
export const RECESS_PASS_SCAN_CODES: Record<RecessReason, string> = {
  bathroom: 'RCBATH',
  break: 'RCBREAK',
  water: 'RCWATER',
  nurse: 'RCNURSE',
  office: 'RCOFFICE',
};

const REASON_BY_CODE = new Map<string, RecessReason>(
  Object.entries(RECESS_PASS_SCAN_CODES).map(([reason, code]) => [code, reason as RecessReason]),
);

/** Barcode value printed on a physical recess pass card. */
export function recessPassScanCodeFor(reason: RecessReason): string {
  return RECESS_PASS_SCAN_CODES[reason];
}

export function isRecessPassScanCode(raw: string): boolean {
  return parseRecessPassScanCode(raw) != null;
}

/** Resolve a scanned pass to its checkout reason, or null if not a recess pass. */
export function parseRecessPassScanCode(raw: string): RecessReason | null {
  const normalized = normalizeScanInput(raw).replace(/-/g, '');
  if (!normalized.startsWith(RECESS_PASS_SCAN_PREFIX)) return null;
  return REASON_BY_CODE.get(normalized) ?? null;
}

export function allRecessPassScanCodes(): { reason: RecessReason; code: string }[] {
  return (Object.entries(RECESS_PASS_SCAN_CODES) as [RecessReason, string][]).map(([reason, code]) => ({
    reason,
    code,
  }));
}
