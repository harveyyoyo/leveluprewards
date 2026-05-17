export type PendingCouponRedemption = {
  id: string;
  schoolId: string;
  studentId: string;
  couponCode: string;
  createdAt: number;
  status: 'pending' | 'confirmed' | 'rejected';
  message?: string;
};

const KEY = 'arcade:pendingCouponRedemptions:v1';

/** Auto-expire pending items older than 48 hours. */
const STALE_THRESHOLD_MS = 48 * 60 * 60 * 1000;

function loadAll(): PendingCouponRedemption[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingCouponRedemption[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items: PendingCouponRedemption[]) {
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 500)));
}

/**
 * Prune entries that are still `pending` but older than STALE_THRESHOLD_MS.
 * Called lazily on every read so stale items don't accumulate indefinitely.
 */
function pruneStale(items: PendingCouponRedemption[]): PendingCouponRedemption[] {
  const cutoff = Date.now() - STALE_THRESHOLD_MS;
  const before = items.length;
  const filtered = items.filter(
    (x) => x.status !== 'pending' || x.createdAt > cutoff,
  );
  // Only write back if something was actually pruned.
  if (filtered.length < before) {
    saveAll(filtered);
  }
  return filtered;
}

export function addPendingCouponRedemption(input: Omit<PendingCouponRedemption, 'id' | 'status'>) {
  const items = pruneStale(loadAll());
  const code = input.couponCode.toUpperCase();
  const dup = items.find(
    (x) =>
      x.schoolId === input.schoolId &&
      x.couponCode.toUpperCase() === code &&
      x.status !== 'rejected'
  );
  if (dup) return dup;
  const next: PendingCouponRedemption = {
    id: `${Date.now()}_${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`,
    status: 'pending',
    ...input,
    couponCode: code,
  };
  items.unshift(next);
  saveAll(items);
  return next;
}

export function listPendingCouponRedemptions(schoolId: string) {
  return pruneStale(loadAll()).filter((x) => x.schoolId === schoolId && x.status === 'pending');
}

export function updatePendingCouponRedemptions(updates: Array<Pick<PendingCouponRedemption, 'id' | 'status' | 'message'>>) {
  const items = pruneStale(loadAll());
  const byId = new Map(updates.map((u) => [u.id, u]));
  const next = items.map((x) => {
    const u = byId.get(x.id);
    return u ? { ...x, status: u.status, message: u.message } : x;
  });
  saveAll(next);
}
