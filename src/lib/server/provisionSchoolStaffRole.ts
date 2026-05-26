import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';

/** Ensures Firestore role docs exist so Security Rules match office / admin handoff. */
export async function provisionSchoolStaffRole(
  schoolId: string,
  uid: string,
  loginState: 'admin' | 'office',
): Promise<void> {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  const db = admin.firestore();
  const school = schoolId.trim().toLowerCase();
  const collection = loginState === 'admin' ? 'roles_admin' : 'roles_office';
  await db
    .collection('schools')
    .doc(school)
    .collection(collection)
    .doc(uid)
    .set({ role: loginState }, { merge: true });
}
