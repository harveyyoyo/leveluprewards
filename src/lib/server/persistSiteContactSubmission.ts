import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { SiteContactIntent } from '@/lib/siteContact';
import { getFirebaseAdminAuth } from '@/lib/server/firebaseAdminAuth';

export type SiteContactSubmission = {
  intent: SiteContactIntent;
  name: string;
  email: string;
  organization: string;
  role: string;
  phone: string;
  message: string;
  referer: string | null;
  createdAt: Date;
};

async function getDb() {
  await getFirebaseAdminAuth();
  const admin = (await import('firebase-admin')).default;
  return admin.firestore();
}

async function persistToLocalDev(record: SiteContactSubmission): Promise<void> {
  const dir = join(process.cwd(), '.local', 'site-contact-submissions');
  await mkdir(dir, { recursive: true });
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const filePath = join(dir, `${id}.json`);
  await writeFile(
    filePath,
    JSON.stringify(
      {
        ...record,
        createdAt: record.createdAt.toISOString(),
      },
      null,
      2,
    ),
    'utf8',
  );
}

/**
 * Persists a marketing contact submission to Firestore (production path).
 * In local development, falls back to `.local/site-contact-submissions/` when
 * Firebase Admin credentials are missing or Firestore is unreachable.
 */
export async function persistSiteContactSubmission(
  record: SiteContactSubmission,
): Promise<'firestore' | 'local'> {
  try {
    const db = await getDb();
    await db.collection('siteContactSubmissions').add(record);
    return 'firestore';
  } catch (e) {
    if (process.env.NODE_ENV !== 'development') throw e;
    await persistToLocalDev(record);
    console.warn(
      '[site-contact] Firestore unavailable in development; saved to .local/site-contact-submissions/.',
      'Set FIREBASE_SERVICE_ACCOUNT_KEY or add serviceAccountKey.json for real persistence.',
      e,
    );
    return 'local';
  }
}
