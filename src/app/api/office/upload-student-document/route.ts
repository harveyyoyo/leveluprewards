import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirebaseAdminApp } from '@/lib/server/firebaseAdminAuth';
import { checkSchoolRole, sameOriginCheck, verifyIdToken } from '@/lib/server/kioskSnapshotAuth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/webp']);

function sanitizeFileName(name: string): string {
  const trimmed = name.trim().slice(-120) || 'document';
  return trimmed.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: NextRequest) {
  if (!sameOriginCheck(req)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const verified = await verifyIdToken(idToken);
  if (!verified) return NextResponse.json({ error: 'Invalid token' }, { status: 401 });

  let body: {
    schoolId?: string;
    studentId?: string;
    fileName?: string;
    fileBase64?: string;
    contentType?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const schoolId = body.schoolId?.trim().toLowerCase();
  const studentId = body.studentId?.trim();
  const contentType = body.contentType?.trim().toLowerCase() ?? '';
  const fileName = sanitizeFileName(body.fileName ?? 'document');
  if (!schoolId || !studentId || !body.fileBase64) {
    return NextResponse.json({ error: 'Missing schoolId, studentId, or fileBase64' }, { status: 400 });
  }
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: 'Use a PDF, PNG, JPG, or WebP file.' }, { status: 400 });
  }

  const allowed = await checkSchoolRole(idToken, verified.uid, schoolId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.fileBase64, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid base64' }, { status: 400 });
  }
  if (buffer.length === 0 || buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'File must be under 10MB.' }, { status: 400 });
  }

  try {
    const admin = (await import('firebase-admin')).default;
    const app = await getFirebaseAdminApp();
    const bucket = admin.storage(app).bucket();
    const docId = crypto.randomUUID();
    const storagePath = `office-student-documents/${schoolId}/${studentId}/${docId}-${fileName}`;
    await bucket.file(storagePath).save(buffer, {
      metadata: { contentType },
      validation: false,
    });

    const firestore = admin.firestore(app);
    const now = Date.now();
    const docRef = firestore
      .collection('schools')
      .doc(schoolId)
      .collection('officeStudentDocuments')
      .doc(docId);
    const payload = {
      studentId,
      name: fileName,
      storagePath,
      contentType,
      sizeBytes: buffer.length,
      uploadedAt: now,
      uploadedBy: verified.uid,
    };
    await docRef.set(payload);

    await firestore.collection('schools').doc(schoolId).collection('officeAuditLog').add({
      entityType: 'officeStudentDocument',
      entityId: docId,
      action: 'create',
      summary: `Uploaded document "${fileName}"`,
      before: null,
      after: { name: fileName, studentId, sizeBytes: buffer.length },
      changedBy: verified.uid,
      changedAt: now,
    });

    return NextResponse.json({ id: docId, ...payload });
  } catch (e) {
    console.error('office upload-student-document', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
