import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import type { Auth } from 'firebase-admin/auth';
import type { ServiceAccount } from 'firebase-admin/app';
import { firebaseConfig } from '@/firebase/config';

type FirebaseServiceAccountJson = ServiceAccount & {
  private_key?: string;
};

function resolveAdminProjectId(): string | undefined {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId
  );
}

export function normalizeServiceAccountForAdmin(
  serviceAccount: ServiceAccount,
): ServiceAccount {
  const raw = serviceAccount as FirebaseServiceAccountJson;
  if (typeof raw.private_key === 'string') {
    return {
      ...raw,
      private_key: raw.private_key.replace(/\\n/g, '\n'),
    } as ServiceAccount;
  }
  if (typeof raw.privateKey === 'string') {
    return {
      ...raw,
      privateKey: raw.privateKey.replace(/\\n/g, '\n'),
    };
  }
  return serviceAccount;
}

/** Supports `FIREBASE_SERVICE_ACCOUNT_KEY` JSON (same as backup/upload scripts). */
function serviceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  if (!raw) return null;
  try {
    return normalizeServiceAccountForAdmin(JSON.parse(raw) as ServiceAccount);
  } catch {
    return null;
  }
}

/** Optional local dev file (gitignored as `serviceAccountKey.json`). */
function serviceAccountFromKeyFile(): ServiceAccount | null {
  const path = join(process.cwd(), 'serviceAccountKey.json');
  if (!existsSync(path)) return null;
  try {
    return normalizeServiceAccountForAdmin(
      JSON.parse(readFileSync(path, 'utf8')) as ServiceAccount,
    );
  } catch {
    return null;
  }
}

function resolveServiceAccount(): ServiceAccount | null {
  return serviceAccountFromEnv() || serviceAccountFromKeyFile();
}

/**
 * Lazily initializes firebase-admin for Auth operations (session cookies).
 * Mirrors the lightweight init used elsewhere in this repo (project id + ADC when available).
 */
export async function getFirebaseAdminAuth(): Promise<Auth> {
  const [{ applicationDefault, cert, getApp, initializeApp }, { getAuth }] = await Promise.all([
    import('firebase-admin/app'),
    import('firebase-admin/auth'),
  ]);

  try {
    getApp();
  } catch {
    const projectId = resolveAdminProjectId();
    const serviceAccount = resolveServiceAccount();
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId || serviceAccount.projectId,
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
      // Managed Firebase runtimes inject FIREBASE_CONFIG for Admin SDK auto-init.
      initializeApp();
    } else {
      try {
        initializeApp({
          credential: applicationDefault(),
          projectId,
        });
      } catch {
        if (projectId) {
          initializeApp({ projectId });
        } else {
          throw new Error('Firebase Admin: missing project id for session cookies.');
        }
      }
    }
  }

  return getAuth();
}
