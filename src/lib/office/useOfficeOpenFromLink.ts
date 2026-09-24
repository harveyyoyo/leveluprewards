'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Forms asked for by a link, waiting for their page to be ready: `${page}|${action}` -> when asked. */
const pending = new Map<string, number>();
/** A request this old is stale (e.g. the form was open when someone left the page). */
const PENDING_MS = 15_000;

/**
 * Opens something on the page (like the Add student form) when the link says `?action=<action>`,
 * e.g. from "Take me there" or Home's "Jump to". `action` comes off the address right away, so a
 * refresh doesn't open it again and the same link works again later. The request is remembered
 * until a form actually shows: while a page loads, a form can show for a moment and be replaced
 * by the real one, which then opens instead.
 */
export function useOfficeOpenFromLink(action: string, isOpen: boolean, open: () => void, ready = true) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = `${pathname}|${action}`;
  const linked = searchParams.get('action') === action;
  const openRef = useRef(open);
  openRef.current = open;
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  // Whether this form is the one showing the linked request (so it can hand it on if replaced).
  const owns = useRef(false);

  // Take the request off the address and remember it.
  useEffect(() => {
    if (!linked) return;
    pending.set(key, Date.now());
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete('action');
    const q = rest.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [linked, key, searchParams, router, pathname]);

  useEffect(() => {
    if (!isOpen) owns.current = false;
  }, [isOpen]);

  // Open once the page is ready.
  useEffect(() => {
    const askedAt = pending.get(key);
    if (!ready || isOpen || askedAt == null) return;
    pending.delete(key);
    if (Date.now() - askedAt > PENDING_MS) return;
    owns.current = true;
    openRef.current();
  }, [ready, isOpen, key, linked]);

  // Replaced while showing the request (the page finished loading): let the new form open it.
  useEffect(
    () => () => {
      if (owns.current && isOpenRef.current) pending.set(key, Date.now());
    },
    [key],
  );
}
