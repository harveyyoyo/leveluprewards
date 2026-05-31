export type ParentPortalDashboard = {
  student: {
    id: string;
    displayName: string;
    points: number;
    className?: string;
  };
  recentActivity: { desc: string; amount: number; date: number }[];
  behaviorNotes: {
    kind: string;
    note: string;
    createdAt: number;
    teacherName: string;
    pointsLabel?: string;
    pointsAmount?: number;
  }[];
  attendanceToday?: { signedIn: boolean; onTime?: boolean; signedInAt?: number };
};

async function postJson<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data;
}

export async function verifyParentPortal(args: {
  schoolId: string;
  studentLookup: string;
  parentEmail: string;
}) {
  return postJson<{ ok: boolean }>('/api/parent-portal/verify', args);
}

export async function fetchParentPortalDashboard(schoolId: string) {
  const res = await fetch(`/api/parent-portal/dashboard?schoolId=${encodeURIComponent(schoolId)}`, {
    credentials: 'same-origin',
  });
  const data = (await res.json().catch(() => ({}))) as ParentPortalDashboard & { error?: string };
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `Request failed (${res.status})`);
  }
  return data;
}

export async function logoutParentPortal() {
  return postJson<{ ok: boolean }>('/api/parent-portal/logout', {});
}
