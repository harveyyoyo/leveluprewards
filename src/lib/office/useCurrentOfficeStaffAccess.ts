'use client';

import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { StaffAccount } from '@/lib/types';
import type { OfficeNavId } from '@/lib/office/officeNav';

/**
 * Which office nav sections the *currently signed-in* desk account is limited to, if any.
 *
 * Matched by display name against `staffAccounts`, since the app doesn't otherwise track which
 * specific staff account is signed in on the client — only broad role flags. This is a soft,
 * best-effort match (two accounts could share a display name) meant to keep the sidebar tidy for
 * a restricted account, not a security boundary; Firestore rules are unchanged regardless.
 *
 * Returns `null` when unrestricted (no matching account, or the match has no `officeSections`
 * set) — callers should treat `null` as "show everything," matching accounts created before
 * this feature existed.
 */
export function useCurrentOfficeStaffAccess(schoolId: string | null, userName: string | null | undefined) {
  const firestore = useFirestore();

  const staffQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'staffAccounts') : null),
    [firestore, schoolId],
  );
  const { data: staffAccounts, isLoading } = useCollection<StaffAccount>(staffQuery);

  const allowedSections = useMemo<OfficeNavId[] | null>(() => {
    const name = userName?.trim().toLowerCase();
    if (!name || !staffAccounts) return null;
    const match = staffAccounts.find((a) => (a.displayName ?? '').trim().toLowerCase() === name);
    if (!match?.officeSections?.length) return null;
    return match.officeSections as OfficeNavId[];
  }, [staffAccounts, userName]);

  return { allowedSections, isLoading };
}
