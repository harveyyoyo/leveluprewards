export type OfficeTransportParentAccessStatus = 'active' | 'revoked';

export type OfficeTransportParentAccess = {
  id: string;
  familyId: string;
  label: string;
  status: OfficeTransportParentAccessStatus;
  createdAt: number;
  createdBy: string;
  expiresAt: number;
  lastUsedAt?: number | null;
  revokedAt?: number | null;
  updatedAt: number;
  updatedBy: string;
  consentVersion: number;
};

export const TRANSPORT_PARENT_ACCESS_DEFAULT_DAYS = 30;
export const TRANSPORT_PARENT_ACCESS_MAX_DAYS = 90;

export function transportParentAccessIsUsable(
  access: Pick<OfficeTransportParentAccess, 'status' | 'expiresAt'>,
  now = Date.now(),
): boolean {
  return access.status === 'active' && access.expiresAt > now;
}

export function transportParentAccessSafeSummary(
  access: OfficeTransportParentAccess,
  familyName?: string,
) {
  return {
    id: access.id,
    familyId: access.familyId,
    familyName: familyName || null,
    label: access.label,
    status: access.status,
    createdAt: access.createdAt,
    expiresAt: access.expiresAt,
    lastUsedAt: access.lastUsedAt ?? null,
    revokedAt: access.revokedAt ?? null,
    consentVersion: access.consentVersion,
  };
}
