'use client';

const STORAGE_KEY = 'staff-portal-quick-action-counts';

export type AdminQuickActionId =
  | 'students'
  | 'coupons'
  | 'prizes'
  | 'reports'
  | 'import'
  | 'settings';

export type AdminQuickAction = {
  id: AdminQuickActionId;
  tabValue: string;
  label: string;
  score: number;
};

type Counts = Partial<Record<AdminQuickActionId, number>>;

function readCounts(schoolId: string): Counts {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}-${schoolId}`);
    return raw ? (JSON.parse(raw) as Counts) : {};
  } catch {
    return {};
  }
}

export function trackStaffPortalQuickAction(schoolId: string, id: AdminQuickActionId): void {
  if (typeof window === 'undefined') return;
  const counts = readCounts(schoolId);
  counts[id] = (counts[id] ?? 0) + 1;
  localStorage.setItem(`${STORAGE_KEY}-${schoolId}`, JSON.stringify(counts));
}

export function buildAdminQuickActions(schoolId: string): AdminQuickAction[] {
  const counts = readCounts(schoolId);
  const base = (id: AdminQuickActionId, tabValue: string, label: string, boost = 0): AdminQuickAction => ({
    id,
    tabValue,
    label,
    score: (counts[id] ?? 0) + boost,
  });

  const all: AdminQuickAction[] = [
    base('students', 'students', 'Manage students', 2),
    base('coupons', 'coupons', 'Print coupons', 1),
    base('prizes', 'prizes', 'Prize shop', 1),
    base('reports', 'reports', 'Reports', 0),
    base('import', 'welcome', 'Import roster', 1),
    base('settings', 'settings', 'Settings', 0),
  ];

  return all.sort((a, b) => b.score - a.score).slice(0, 4);
}

export function adminWelcomeTitle(userName?: string | null): string {
  const first = userName?.trim().split(/\s+/)[0];
  return first ? `Welcome back, ${first}` : 'Admin overview';
}
