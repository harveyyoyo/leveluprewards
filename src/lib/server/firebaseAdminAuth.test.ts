import { afterEach, describe, expect, it } from 'vitest';
import {
  normalizeServiceAccountForAdmin,
  shouldPreferManagedRuntimeAdminCredentials,
} from './firebaseAdminAuth';

const MANAGED_RUNTIME_KEYS = [
  'K_SERVICE',
  'FUNCTION_TARGET',
  'FUNCTION_NAME',
  'FIREBASE_CONFIG',
] as const;

const originalManagedRuntimeEnv = Object.fromEntries(
  MANAGED_RUNTIME_KEYS.map((key) => [key, process.env[key]]),
);

afterEach(() => {
  for (const key of MANAGED_RUNTIME_KEYS) {
    const previous = originalManagedRuntimeEnv[key];
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
  }
});

describe('normalizeServiceAccountForAdmin', () => {
  it('converts escaped newlines in service account JSON private keys', () => {
    const serviceAccount = {
      project_id: 'test-project',
      client_email: 'firebase-adminsdk@test-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n',
    } as Record<string, string>;

    const normalized = normalizeServiceAccountForAdmin(serviceAccount);

    expect((normalized as Record<string, string>).private_key).toBe(
      '-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----\n',
    );
  });

  it('converts escaped newlines in camelCase private keys', () => {
    const serviceAccount = {
      projectId: 'test-project',
      clientEmail: 'firebase-adminsdk@test-project.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----\\n',
    };

    const normalized = normalizeServiceAccountForAdmin(serviceAccount);

    expect(normalized.privateKey).toBe(
      '-----BEGIN PRIVATE KEY-----\nabc123\n-----END PRIVATE KEY-----\n',
    );
  });
});

describe('shouldPreferManagedRuntimeAdminCredentials', () => {
  function clearManagedRuntimeEnv() {
    for (const key of MANAGED_RUNTIME_KEYS) {
      delete process.env[key];
    }
  }

  it('is off on a regular machine (use the JSON key)', () => {
    clearManagedRuntimeEnv();
    expect(shouldPreferManagedRuntimeAdminCredentials()).toBe(false);
  });

  it('is on in Cloud Run / Hosting SSR so school login can save the session', () => {
    clearManagedRuntimeEnv();
    process.env.K_SERVICE = 'ssrlevelupedu';
    expect(shouldPreferManagedRuntimeAdminCredentials()).toBe(true);
  });
});
