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

export function addPendingCouponRedemption(input: Omit<PendingCouponRedemption, 'id' | 'status'>) {
  const items = loadAll();
  const code = input.couponCode.toUpperCase();
  const dup = items.find(
    (x) =>
      x.schoolId === input.schoolId &&
      x.couponCode.toUpperCase() === code &&
      x.status !== 'rejected'
  );
  if (dup) return dup;
  const next: PendingCouponRedemption = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    status: 'pending',
    ...input,
    couponCode: code,
  };
  items.unshift(next);
  saveAll(items);
  return next;
}

export function listPendingCouponRedemptions(schoolId: string) {
  return loadAll().filter((x) => x.schoolId === schoolId && x.status === 'pending');
}

export function updatePendingCouponRedemptions(updates: Array<Pick<PendingCouponRedemption, 'id' | 'status' | 'message'>>) {
  const items = loadAll();
  const byId = new Map(updates.map((u) => [u.id, u]));
  const next = items.map((x) => {
    const u = byId.get(x.id);
    return u ? { ...x, status: u.status, message: u.message } : x;
  });
  saveAll(next);
}

