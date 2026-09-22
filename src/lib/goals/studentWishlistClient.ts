import type { Auth } from 'firebase/auth';
import { authFetch } from '@/lib/authFetch';

export async function setStudentWishlist(
  auth: Auth | null | undefined,
  args: { schoolId: string; studentId: string; prizeId: string },
): Promise<{ ok: boolean; title?: string; error?: string }> {
  const res = await authFetch(auth, '/api/goals/student-wishlist', {
    method: 'POST',
    body: JSON.stringify({
      schoolId: args.schoolId,
      studentId: args.studentId,
      prizeId: args.prizeId,
      action: 'set',
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; title?: string; error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Could not save wishlist.' };
  }
  return { ok: true, title: data.title };
}

export async function clearStudentWishlist(
  auth: Auth | null | undefined,
  args: { schoolId: string; studentId: string; prizeId?: string },
): Promise<{ ok: boolean; error?: string }> {
  const res = await authFetch(auth, '/api/goals/student-wishlist', {
    method: 'POST',
    body: JSON.stringify({
      schoolId: args.schoolId,
      studentId: args.studentId,
      prizeId: args.prizeId,
      action: 'clear',
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Could not clear wishlist.' };
  }
  return { ok: true };
}
