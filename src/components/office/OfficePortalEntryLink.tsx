'use client';

import { useCallback, useState } from 'react';
import { useFirebase } from '@/firebase';
import { officePortalEntryHref } from '@/lib/officePublicUrl';
import {
  syncFirebaseSessionCookie,
  syncSchoolGateCookie,
} from '@/lib/auth/syncFirebaseSessionCookie';

type OfficePortalEntryLinkProps = {
  schoolId: string;
  className?: string;
  children?: React.ReactNode;
};

/** Opens School Office after syncing HttpOnly session cookies required for portal → office handoff. */
export function OfficePortalEntryLink({
  schoolId,
  className,
  children = 'Open School Office',
}: OfficePortalEntryLinkProps) {
  const { auth } = useFirebase();
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (busy) return;

      const sid = schoolId.trim().toLowerCase();
      if (!sid) return;

      const target = officePortalEntryHref(sid);
      if (!auth?.currentUser) {
        window.open(target, '_blank', 'noopener,noreferrer');
        return;
      }

      setBusy(true);
      try {
        await syncFirebaseSessionCookie(auth);
        await syncSchoolGateCookie(auth, sid);
      } catch {
        // Handoff redirect sends unauthenticated users to portal login.
      } finally {
        setBusy(false);
      }

      window.open(target, '_blank', 'noopener,noreferrer');
    },
    [auth, busy, schoolId],
  );

  return (
    <a
      href={officePortalEntryHref(schoolId)}
      target="_blank"
      rel="noreferrer"
      aria-busy={busy}
      className={className}
      onClick={(event) => void handleClick(event)}
    >
      {busy ? 'Opening…' : children}
    </a>
  );
}
