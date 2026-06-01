import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { initializeFirebase } from '@/firebase/init';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';

/**
 * Ensures allowlisted developers have Firestore roles for classroom writes in this school.
 * Callable uses deployed Functions (works even when local Admin SDK key is wrong).
 */
export async function ensureDeveloperSchoolAccess(schoolId: string): Promise<void> {
  const user = getAuth().currentUser;
  if (!user || !isAllowedDeveloperGoogleUser(user)) return;

  const sid = schoolId.trim().toLowerCase();
  if (!sid) return;

  const sdks = initializeFirebase();
  const functions = sdks?.functions;
  if (!functions) return;

  if (process.env.NODE_ENV === 'development') {
    try {
      await httpsCallable(functions, 'addDeveloperMe')({});
    } catch {
      /* already on allow-list */
    }
  }

  await httpsCallable(functions, 'startDeveloperSupportSession')({ schoolId: sid });
}
