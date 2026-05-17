import type { Auth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

function resolveAdminProjectId(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId
  );
}

/** Supports `FIREBASE_SERVICE_ACCOUNT_KEY` JSON (same as backup/upload scripts). */
function serviceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ServiceAccount;
  } catch {
    return null;
  }
}

/**
 * Lazily initializes firebase-admin for Auth operations (session cookies).
 * Mirrors the lightweight init used elsewhere in this repo (project id + ADC when available).
 */
export async function getFirebaseAdminAuth(): Promise<Auth> {
  const [{ cert, getApp, initializeApp }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]);

  try {
    getApp();
  } catch {
    const projectId = resolveAdminProjectId();
    const serviceAccount = serviceAccountFromEnv();
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || projectId,
      });
    } else if (clientEmail && privateKey && projectId) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
    } else if (process.env.FIREBASE_CONFIG) {
      // App Hosting injects FIREBASE_CONFIG and expects Admin SDK auto-init.
      initializeApp();
    } else if (projectId) {
      initializeApp({ projectId });
    } else {
      throw new Error('Firebase Admin: missing project id for session cookies.');
    }
  }

  return getAuth();
}
