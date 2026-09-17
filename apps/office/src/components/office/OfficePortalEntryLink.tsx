'use client';

import { useCallback, useState } from 'react';
import { useFirebase } from '@/firebase';
import { officePortalEntryHref, officePortalHandoffHref } from '@/lib/officePublicUrl';
import {
  syncFirebaseSessionCookie,
  syncSchoolGateCookie,
} from '@/lib/auth/syncFirebaseSessionCookie';

type OfficePortalEntryLinkProps = {
  schoolId: string;
  className?: string;
  children?: React.ReactNode;
};

function resolveOpenUrl(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (typeof window === 'undefined') return href;
  return `${window.location.origin}${href.startsWith('/') ? href : `/${href}`}`;
}

/** Opens School Office after syncing HttpOnly session cookies required for portal → office handoff. */
export function OfficePortalEntryLink({
  schoolId,
  className,
  children = 'Open School Office',
}: OfficePortalEntryLinkProps) {
  const { auth } = useFirebase();
  const [busy, setBusy] = useState(false);
  const publicHref = officePortalEntryHref(schoolId);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      const openNewTab =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1;
      if (openNewTab) return;

      event.preventDefault();
      if (busy) return;

      const sid = schoolId.trim().toLowerCase();
      if (!sid) return;

      const openTarget = resolveOpenUrl(officePortalHandoffHref(sid));
      if (!auth?.currentUser) {
        window.open(openTarget, '_blank', 'noopener,noreferrer');
        return;
      }

      // Open the tab synchronously, in direct response to the click - opening it only
      // after the awaits below would lose the "user gesture" context that lets browsers
      // (Safari in particular) allow a popup at all, and it would silently get blocked.
      // Can't pass noopener here since we need the handle back to navigate it below.
      const tab = window.open('', '_blank', 'noreferrer');

      setBusy(true);
      try {
        await syncFirebaseSessionCookie(auth);
        await syncSchoolGateCookie(auth, sid);
      } catch {
        // Handoff redirect sends unauthenticated users to portal login.
      } finally {
        setBusy(false);
      }

      if (tab) tab.location.href = openTarget;
      else window.open(openTarget, '_blank', 'noopener,noreferrer');
    },
    [auth, busy, schoolId],
  );

  return (
    <a
      href={publicHref}
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
