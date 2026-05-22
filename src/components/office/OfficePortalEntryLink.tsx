'use client';

import { useCallback, useState } from 'react';
import { useFirebase } from '@/firebase';
import { officePortalEntryHref } from '@/lib/officePublicUrl';
import {
  syncFirebaseSessionCookie,
  syncSchoolGateCookie,
} from '@/lib/auth/syncFirebaseSessionCookie';
import { useToast } from '@/hooks/use-toast';

type OfficePortalEntryLinkProps = {
  schoolId: string;
  className?: string;
  children?: React.ReactNode;
};

function entryUrl(schoolId: string): string {
  const path = officePortalEntryHref(schoolId);
  if (typeof window === 'undefined' || path.startsWith('http')) return path;
  return new URL(path, window.location.origin).href;
}

/** Opens School Office after syncing HttpOnly session cookies required for portal → office handoff. */
export function OfficePortalEntryLink({
  schoolId,
  className,
  children = 'Open School Office',
}: OfficePortalEntryLinkProps) {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleClick = useCallback(
    async (event: React.MouseEvent<HTMLAnchorElement>) => {
      const sid = schoolId.trim().toLowerCase();
      if (!sid) return;

      const openNewTab =
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button === 1;
      if (openNewTab) return;

      event.preventDefault();
      if (busy) return;

      const target = entryUrl(sid);

      if (!auth?.currentUser) {
        window.location.assign(target);
        return;
      }

      setBusy(true);
      try {
        const okFb = await syncFirebaseSessionCookie(auth);
        const okGate = await syncSchoolGateCookie(auth, sid);
        if (!okFb || !okGate) {
          toast({
            variant: 'destructive',
            title: 'Could not refresh sign-in',
            description:
              'Opening School Office anyway. If it fails, refresh this page and try again.',
          });
        }
      } catch {
        toast({
          variant: 'destructive',
          title: 'Could not refresh sign-in',
          description:
            'Opening School Office anyway. If it fails, refresh this page and try again.',
        });
      } finally {
        setBusy(false);
      }

      window.location.assign(target);
    },
    [auth, busy, schoolId, toast],
  );

  return (
    <a
      href={officePortalEntryHref(schoolId)}
      rel="noreferrer"
      aria-busy={busy}
      className={className}
      onClick={(event) => void handleClick(event)}
    >
      {busy ? 'Opening…' : children}
    </a>
  );
}
