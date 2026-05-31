import { describe, expect, it } from 'vitest';
import { normalizeServiceAccountForAdmin } from './firebaseAdminAuth';

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
