import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAdminApp } from '@/lib/server/firebaseAdminAuth';
import { checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';

export const dynamic = 'force-dynamic';

async function authorize(req: NextRequest, schoolId: string | null) {
  if (!sameOriginCheck(req)) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const verified = await verifyIdToken(idToken);
  if (!verified) return { error: NextResponse.json({ error: 'Invalid token' }, { status: 401 }) };

  if (!schoolId) return { error: NextResponse.json({ error: 'Missing schoolId' }, { status: 400 }) };

  const allowed = await checkSchoolRole(idToken, verified.uid, schoolId);
  if (!allowed) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };

  return { uid: verified.uid };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const schoolId = req.nextUrl.searchParams.get('schoolId')?.trim().toLowerCase() ?? null;
  const auth = await authorize(req, schoolId);
  if ('error' in auth) return auth.error;

  try {
    const admin = (await import('firebase-admin')).default;
    const app = await getFirebaseAdminApp();
    const snap = await admin
      .firestore(app)
      .collection('schools')
      .doc(schoolId!)
      .collection('officeStudentDocuments')
      .doc(docId)
      .get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = snap.data() as { storagePath: string };
    const bucket = admin.storage(app).bucket();
    const [url] = await bucket.file(data.storagePath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 5 * 60 * 1000,
    });
    return NextResponse.json({ url });
  } catch (e) {
    console.error('office student-document GET', e);
    return NextResponse.json({ error: 'Could not open document' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const schoolId = req.nextUrl.searchParams.get('schoolId')?.trim().toLowerCase() ?? null;
  const auth = await authorize(req, schoolId);
  if ('error' in auth) return auth.error;

  try {
    const admin = (await import('firebase-admin')).default;
    const app = await getFirebaseAdminApp();
    const firestore = admin.firestore(app);
    const ref = firestore.collection('schools').doc(schoolId!).collection('officeStudentDocuments').doc(docId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = snap.data() as { storagePath: string; name: string; studentId: string };
    // Office records are never erased: the file and its record are kept and only hidden.
    const archivedAt = Date.now();
    await ref.update({ archived: true, archivedAt, archivedBy: auth.uid });

    await firestore.collection('schools').doc(schoolId!).collection('officeAuditLog').add({
      entityType: 'officeStudentDocument',
      entityId: docId,
      action: 'delete',
      summary: `Archived document "${data.name}"`,
      before: { name: data.name, studentId: data.studentId },
      after: { archived: true, archivedAt },
      changedBy: auth.uid,
      changedAt: Date.now(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('office student-document DELETE', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
