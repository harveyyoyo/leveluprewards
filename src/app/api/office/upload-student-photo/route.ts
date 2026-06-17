import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getFirebaseAdminApp } from '@/lib/server/firebaseAdminAuth';
import {
  checkSchoolRole,
  sameOriginCheck,
  verifyIdToken,
} from '@/lib/server/kioskSnapshotAuth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/webp']);

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
    imageBase64?: string;
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
  if (!schoolId || !studentId || !body.imageBase64) {
    return NextResponse.json({ error: 'Missing schoolId, studentId, or imageBase64' }, { status: 400 });
  }
  if (!ALLOWED.has(contentType)) {
    return NextResponse.json({ error: 'Unsupported image type' }, { status: 400 });
  }

  const allowed = await checkSchoolRole(idToken, verified.uid, schoolId);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let buffer: Buffer;
  try {
    buffer = Buffer.from(body.imageBase64, 'base64');
  } catch {
    return NextResponse.json({ error: 'Invalid base64' }, { status: 400 });
  }
  if (buffer.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Image too large' }, { status: 400 });
  }

  try {
    const admin = (await import('firebase-admin')).default;
    const app = await getFirebaseAdminApp();
    const bucket = admin.storage(app).bucket();
    const path = `office-student-photos/${schoolId}/${studentId}`;
    const file = bucket.file(path);
    const downloadToken = crypto.randomUUID();
    await file.save(buffer, {
      metadata: {
        contentType,
        metadata: { firebaseStorageDownloadTokens: downloadToken },
      },
      validation: false,
    });
    const encodedPath = encodeURIComponent(path);
    const photoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    await admin.firestore(app).collection('schools').doc(schoolId).collection('officeStudents').doc(studentId).update({
      photoUrl,
      updatedAt: Date.now(),
    });

    return NextResponse.json({ photoUrl });
  } catch (e) {
    console.error('office upload-student-photo', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
