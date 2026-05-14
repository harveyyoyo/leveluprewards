export type PendingTeacherAward = {
  id: string;
  schoolId: string;
  studentIds: string[];
  points: number;
  description: string;
  createdAt: number;
  status: 'pending' | 'synced' | 'failed';
  message?: string;
};

const KEY = 'arcade:pendingTeacherAwards:v1';

function loadAll(): PendingTeacherAward[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingTeacherAward[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items: PendingTeacherAward[]) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
}

export function addPendingTeacherAward(input: Omit<PendingTeacherAward, 'id' | 'status'>) {
  const items = loadAll();
  const next: PendingTeacherAward = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    status: 'pending',
    ...input,
  };
  items.unshift(next);
  saveAll(items);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('arcade-pending-teacher-awards'));
  }
  return next;
}

export function listPendingTeacherAwards(schoolId: string) {
  return loadAll().filter((x) => x.schoolId === schoolId && x.status === 'pending');
}

export function countPendingTeacherAwards(schoolId: string): number {
  return listPendingTeacherAwards(schoolId).length;
}

export function updatePendingTeacherAwards(
  updates: Array<Pick<PendingTeacherAward, 'id' | 'status' | 'message'>>,
) {
  const items = loadAll();
  const byId = new Map(updates.map((u) => [u.id, u]));
  const next = items.map((x) => {
    const u = byId.get(x.id);
    return u ? { ...x, status: u.status, message: u.message } : x;
  });
  saveAll(next);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('arcade-pending-teacher-awards'));
  }
}
