import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';
import { getFirestore } from 'firebase-admin/firestore';

const APP_CONFIG_GLOBAL = 'global';

/**
 * Resolves coarse access scopes for a Firebase UID at a school (Admin SDK reads).
 * Mirrors client `SchoolSessionGate` expectations for edge enforcement.
 */
export async function resolveSchoolGateScopes(uid: string, schoolId: string): Promise<string[]> {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  const db = admin.firestore();
  const sid = schoolId.trim().toLowerCase();
  const scopes = new Set<string>();

  const globalSnap = await db.collection('appConfig').doc('developerAllowlist').get();
  const devList = globalSnap.exists ? (globalSnap.data()?.uids as unknown) : undefined;
  if (Array.isArray(devList) && devList.includes(uid)) {
    scopes.add('dev');
  }

  const schoolRef = db.collection('schools').doc(sid);
  const [
    adminSnap,
    teacherSnap,
    secretarySnap,
    prizeClerkSnap,
    reportsSnap,
    librarianSnap,
    officeSnap,
    houseCoordinatorSnap,
    kioskSnap,
    portalSnap,
    studentPortalLobbySnap,
    studentPortalSessionSnap,
  ] = await Promise.all([
    schoolRef.collection('roles_admin').doc(uid).get(),
    schoolRef.collection('roles_teacher').doc(uid).get(),
    schoolRef.collection('roles_secretary').doc(uid).get(),
    schoolRef.collection('roles_prizeClerk').doc(uid).get(),
    schoolRef.collection('roles_reports').doc(uid).get(),
    schoolRef.collection('roles_librarian').doc(uid).get(),
    schoolRef.collection('roles_office').doc(uid).get(),
    schoolRef.collection('roles_houseCoordinator').doc(uid).get(),
    schoolRef.collection('kioskMembers').doc(uid).get(),
    schoolRef.collection('anonymousPortalSessions').doc(uid).get(),
    schoolRef.collection('studentPortalMembers').doc(uid).get(),
    schoolRef.collection('studentPortalSessions').doc(uid).get(),
  ]);

  if (adminSnap.exists && adminSnap.data()?.role === 'admin') scopes.add('admin');
  if (teacherSnap.exists && teacherSnap.data()?.role === 'teacher') scopes.add('teacher');
  if (secretarySnap.exists && secretarySnap.data()?.role === 'secretary') scopes.add('secretary');
  if (prizeClerkSnap.exists && prizeClerkSnap.data()?.role === 'prizeClerk') scopes.add('prizeClerk');
  if (reportsSnap.exists && reportsSnap.data()?.role === 'reports') scopes.add('reports');
  if (librarianSnap.exists && librarianSnap.data()?.role === 'librarian') scopes.add('librarian');
  if (officeSnap.exists && officeSnap.data()?.role === 'office') scopes.add('office');
  if (houseCoordinatorSnap.exists && houseCoordinatorSnap.data()?.role === 'houseCoordinator') {
    scopes.add('houseCoordinator');
  }
  if (kioskSnap.exists) scopes.add('kiosk');
  if (portalSnap.exists) scopes.add('portal');
  if (studentPortalLobbySnap.exists || studentPortalSessionSnap.exists) {
    scopes.add('studentPortal');
  }

  return [...scopes];
}
