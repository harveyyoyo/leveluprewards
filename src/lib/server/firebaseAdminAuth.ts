import type { Auth } from 'firebase-admin/auth';
import { firebaseConfig } from '@/firebase/config';

/**
 * Lazily initializes firebase-admin for Auth operations (session cookies).
 * Mirrors the lightweight init used elsewhere in this repo (project id + ADC when available).
 */
export async function getFirebaseAdminAuth(): Promise<Auth> {
  const admin = (await import('firebase-admin')).default;
  if (!admin.apps.length) {
    const projectId =
      process.env.FIREBASE_ADMIN_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT ||
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
      firebaseConfig.projectId;
    if (!projectId) {
      throw new Error('Firebase Admin: missing project id for session cookies.');
    }
    admin.initializeApp({ projectId });
  }
  return admin.auth();
}
