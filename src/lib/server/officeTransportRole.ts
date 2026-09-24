import type { Firestore } from 'firebase-admin/firestore';
import { checkDeveloperAllowlist } from '@/lib/server/kioskSnapshotAuth';

/** Only Office staff, administrators, and developers may manage private transportation records. */
export async function hasOfficeTransportRole(db: Firestore, idToken: string, uid: string, schoolId: string): Promise<boolean> {
  if (await checkDeveloperAllowlist(idToken, uid)) return true;
  const schoolRef = db.collection('schools').doc(schoolId);
  const [office, admin] = await Promise.all([
    schoolRef.collection('roles_office').doc(uid).get(),
    schoolRef.collection('roles_admin').doc(uid).get(),
  ]);
  return (office.exists && office.data()?.role === 'office') || (admin.exists && admin.data()?.role === 'admin');
}
