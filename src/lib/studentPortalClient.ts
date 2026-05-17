export type StudentPortalLookupResult = {
  ok: boolean;
  found: boolean;
  studentId?: string;
  locked?: boolean;
  requiresPasscode?: boolean;
  deviceBlocked?: boolean;
  message?: string;
  error?: string;
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

export async function enterStudentPortalLobby(idToken: string, schoolId: string) {
  return postJson<{ ok: boolean }>('/api/student-portal/lobby', { idToken, schoolId });
}

export async function lookupStudentPortal(
  idToken: string,
  schoolId: string,
  badgeId: string,
): Promise<StudentPortalLookupResult> {
  return postJson<StudentPortalLookupResult>('/api/student-portal/lookup', {
    idToken,
    schoolId,
    badgeId,
  });
}

export async function verifyStudentPortal(
  idToken: string,
  schoolId: string,
  studentId: string,
  passcode?: string,
) {
  return postJson<{ ok: boolean; customToken: string; studentId: string }>(
    '/api/student-portal/verify',
    { idToken, schoolId, studentId, passcode: passcode ?? '' },
  );
}

export async function logoutStudentPortal(
  schoolId: string,
  studentId: string,
  options?: { clearDevice?: boolean },
) {
  return postJson<{ ok: boolean }>('/api/student-portal/logout', {
    schoolId,
    studentId,
    clearDevice: options?.clearDevice === true,
  });
}

export async function unlockStudentPortal(idToken: string, schoolId: string, studentId: string) {
  return postJson<{ ok: boolean }>('/api/student-portal/unlock', { idToken, schoolId, studentId });
}

export async function setStudentPortalPasscode(
  idToken: string,
  schoolId: string,
  studentId: string,
  passcode: string,
) {
  return postJson<{ ok: boolean }>('/api/student-portal/set-passcode', {
    idToken,
    schoolId,
    studentId,
    passcode,
  });
}

export async function clearStudentPortalPasscode(
  idToken: string,
  schoolId: string,
  studentId: string,
) {
  return postJson<{ ok: boolean }>('/api/student-portal/set-passcode', {
    idToken,
    schoolId,
    studentId,
    clear: true,
  });
}

export async function resetStudentPortalBrowser(
  idToken: string,
  schoolId: string,
  studentId: string,
) {
  return postJson<{ ok: boolean; cleared: number }>('/api/student-portal/reset-browser', {
    idToken,
    schoolId,
    studentId,
  });
}
