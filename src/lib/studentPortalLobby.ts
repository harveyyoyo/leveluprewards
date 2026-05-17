import { httpsCallable } from 'firebase/functions';
import type { Functions } from 'firebase/functions';
import { enterStudentPortalLobby } from '@/lib/studentPortalClient';

/** Registers this browser for student-home (callable first, then API fallback). */
export async function establishStudentPortalLobby(
  functions: Functions | null | undefined,
  idToken: string,
  schoolId: string,
): Promise<void> {
  const sid = schoolId.trim().toLowerCase();
  if (functions) {
    try {
      const enter = httpsCallable<{ schoolId: string }, { success?: boolean }>(
        functions,
        'enterStudentPortalLobby',
      );
      await enter({ schoolId: sid });
      return;
    } catch {
      // Fall through to Next.js API (local dev without deployed functions).
    }
  }
  await enterStudentPortalLobby(idToken, sid);
}
