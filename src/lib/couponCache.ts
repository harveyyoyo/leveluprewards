export type CachedCoupon = {
  code: string;
  value?: number;
  category?: string;
  expiresAt?: number;
};

export type CouponSnapshot = {
  updatedAt: number;
  couponsByCode: Record<string, CachedCoupon>;
};

function keyForSchool(schoolId: string) {
  return `arcade:couponSnapshot:v1:${schoolId}`;
}

export function loadCouponSnapshot(schoolId: string): CouponSnapshot | null {
  try {
    const raw = localStorage.getItem(keyForSchool(schoolId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CouponSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.updatedAt !== 'number' || !parsed.couponsByCode || typeof parsed.couponsByCode !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCouponSnapshot(schoolId: string, snapshot: CouponSnapshot) {
  localStorage.setItem(keyForSchool(schoolId), JSON.stringify(snapshot));
}

export function couponIsKnownAndValidOffline(schoolId: string, couponCode: string): { ok: boolean; reason?: string } {
  const snap = loadCouponSnapshot(schoolId);
  if (!snap) return { ok: false, reason: 'No cached coupon list on this kiosk yet.' };
  // Require at least one online sync in last 30 days.
  const ageMs = Date.now() - snap.updatedAt;
  if (ageMs > 30 * 24 * 60 * 60 * 1000) {
    return { ok: false, reason: 'Coupon cache is too old. Reconnect to sync.' };
  }
  const code = couponCode.toUpperCase();
  const c = snap.couponsByCode[code];
  if (!c) return { ok: false, reason: 'Coupon not recognized (offline).' };
  if (typeof c.expiresAt === 'number' && Date.now() > c.expiresAt) return { ok: false, reason: 'This coupon has expired.' };
  return { ok: true };
}

