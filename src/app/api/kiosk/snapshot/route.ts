export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyIdToken,
  sameOriginCheck,
  checkSchoolRole,
  checkDeveloperAllowlist,
} from '@/lib/server/kioskSnapshotAuth';
import { getFirebaseAdminFirestore } from '@/lib/server/firebaseAdminAuth';
import {
  STUDENT_PORTAL_PREVIEW_DEVICE_ID,
  type SchoolScreenSurface,
} from '@/lib/kiosk/kioskScreenTypes';

const MAX_BODY_BYTES = 512 * 1024;

async function canUploadKioskSnapshot(
  idToken: string,
  uid: string,
  schoolId: string,
): Promise<boolean> {
  if (await checkDeveloperAllowlist(idToken, uid)) return true;
  if (await checkSchoolRole(idToken, uid, schoolId)) return true;
  return checkKioskMember(idToken, schoolId, uid);
}

async function canUploadStudentPortalSnapshot(
  idToken: string,
  uid: string,
  schoolId: string,
  studentId: string,
): Promise<boolean> {
  if (await checkDeveloperAllowlist(idToken, uid)) return true;
  if (await checkSchoolRole(idToken, uid, schoolId)) return true;
  if (uid !== studentId) return false;
  return checkStudentPortalSession(idToken, schoolId, uid);
}

async function checkKioskMember(idToken: string, schoolId: string, uid: string): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}/kioskMembers/${encodeURIComponent(uid)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function checkStudentPortalSession(
  idToken: string,
  schoolId: string,
  uid: string,
): Promise<boolean> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) return false;
  const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId,
  )}/databases/(default)/documents/schools/${encodeURIComponent(schoolId)}/studentPortalSessions/${encodeURIComponent(uid)}`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    return res.ok;
  } catch {
    return false;
  }
}

function parseSurface(value: unknown): SchoolScreenSurface {
  return value === 'studentPortal' ? 'studentPortal' : 'kiosk';
}

export async function POST(req: NextRequest) {
  try {
    if (!sameOriginCheck(req)) {
      return NextResponse.json({ error: 'Cross-origin requests are not allowed.' }, { status: 403 });
    }

    const authHeader = req.headers.get('authorization') || '';
    const match = /^Bearer\s+(.+)$/i.exec(authHeader);
    if (!match) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const idToken = match[1]!;
    const verified = await verifyIdToken(idToken);
    if (!verified) {
      return NextResponse.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Snapshot payload too large.' }, { status: 413 });
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }

    const schoolId = typeof body.schoolId === 'string' ? body.schoolId.trim().toLowerCase() : '';
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
    const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.trim() : '';
    const surface = parseSurface(body.surface);
    const forceRefresh = body.forceRefresh === true;

    if (!schoolId || !deviceId || !imageBase64) {
      return NextResponse.json({ error: 'schoolId, deviceId, and imageBase64 are required.' }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_-]{4,128}$/.test(deviceId)) {
      return NextResponse.json({ error: 'deviceId is invalid.' }, { status: 400 });
    }

    const studentId =
      typeof body.studentId === 'string' ? body.studentId.trim() || null : null;

    const allowed =
      surface === 'studentPortal'
        ? studentId
          ? await canUploadStudentPortalSnapshot(idToken, verified.uid, schoolId, studentId)
          : false
        : await canUploadKioskSnapshot(idToken, verified.uid, schoolId);

    if (!allowed) {
      return NextResponse.json({ error: 'You do not have permission to upload this snapshot.' }, { status: 403 });
    }

    const db = await getFirebaseAdminFirestore();
    const screenRef = db.collection('schools').doc(schoolId).collection('schoolScreens').doc(deviceId);

    if (
      surface === 'studentPortal'
      && deviceId === STUDENT_PORTAL_PREVIEW_DEVICE_ID
      && !forceRefresh
    ) {
      const existing = await screenRef.get();
      if (existing.exists && typeof existing.data()?.capturedAt === 'number') {
        return NextResponse.json({
          success: true,
          skipped: true,
          deviceId,
          capturedAt: existing.data()?.capturedAt,
          snapshotUrl: existing.data()?.snapshotUrl ?? null,
        });
      }
    }

    const buffer = Buffer.from(imageBase64, 'base64');
    if (!buffer.length || buffer.length > 400 * 1024) {
      return NextResponse.json({ error: 'Snapshot image is empty or too large.' }, { status: 400 });
    }

    const admin = (await import('firebase-admin')).default;
    const { getFirebaseAdminApp } = await import('@/lib/server/firebaseAdminAuth');
    const app = await getFirebaseAdminApp();
    const bucket = admin.storage(app).bucket();
    const storagePath = `school-screenshots/${schoolId}/${surface}/${deviceId}.jpg`;
    const file = bucket.file(storagePath);
    await file.save(buffer, {
      contentType: 'image/jpeg',
      resumable: false,
      metadata: {
        cacheControl: 'private, max-age=60',
      },
    });

    const expires = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const [snapshotUrl] = await file.getSignedUrl({
      action: 'read',
      expires,
    });

    const now = Date.now();
    const kioskProfileId =
      typeof body.kioskProfileId === 'string' ? body.kioskProfileId.trim() || null : null;
    const profileName =
      typeof body.profileName === 'string' ? body.profileName.trim().slice(0, 120) || null : null;
    const studentName =
      typeof body.studentName === 'string' ? body.studentName.trim().slice(0, 120) || null : null;
    const pathname =
      typeof body.pathname === 'string' ? body.pathname.trim().slice(0, 240) : '';

    await screenRef.set(
      {
        deviceId,
        schoolId,
        surface,
        storagePath,
        snapshotUrl,
        snapshotUrlExpiresAt: expires,
        capturedAt: now,
        updatedAt: now,
        kioskProfileId,
        profileName,
        studentId,
        studentName,
        pathname,
        userAgent: req.headers.get('user-agent') || '',
        uploaderUid: verified.uid,
      },
      { merge: true },
    );

    return NextResponse.json({ success: true, deviceId, capturedAt: now, snapshotUrl });
  } catch (error) {
    console.error('[kiosk/snapshot]', error);
    return NextResponse.json({ error: 'Could not save snapshot.' }, { status: 500 });
  }
}
