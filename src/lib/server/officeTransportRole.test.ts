// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Firestore } from 'firebase-admin/firestore';

const { checkDeveloperAllowlist } = vi.hoisted(() => ({ checkDeveloperAllowlist: vi.fn() }));
vi.mock('./kioskSnapshotAuth', () => ({ checkDeveloperAllowlist }));

import { hasOfficeTransportRole } from './officeTransportRole';

function fakeDb(roles: Record<string, string>) {
  return {
    collection() {
      return {
        doc() {
          return {
            collection(name: string) {
              return {
                doc(uid: string) {
                  return { get: async () => ({ exists: roles[`${name}/${uid}`] != null, data: () => ({ role: roles[`${name}/${uid}`] }) }) };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as Firestore;
}

describe('Office transportation role', () => {
  beforeEach(() => checkDeveloperAllowlist.mockResolvedValue(false));

  it('allows Office and admin roles but not other school roles', async () => {
    await expect(hasOfficeTransportRole(fakeDb({ 'roles_office/u1': 'office' }), 'token', 'u1', 'school')).resolves.toBe(true);
    await expect(hasOfficeTransportRole(fakeDb({ 'roles_admin/u2': 'admin' }), 'token', 'u2', 'school')).resolves.toBe(true);
    await expect(hasOfficeTransportRole(fakeDb({ 'roles_teacher/u3': 'admin' }), 'token', 'u3', 'school')).resolves.toBe(false);
  });

  it('allows an allowlisted developer', async () => {
    checkDeveloperAllowlist.mockResolvedValue(true);
    await expect(hasOfficeTransportRole(fakeDb({}), 'token', 'u4', 'school')).resolves.toBe(true);
  });
});
