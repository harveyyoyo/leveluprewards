'use client';

import { useEffect, useRef, useState } from 'react';

const WEDGE_IGNORED_KEYS = new Set([
  'Escape',
  'Tab',
  'Shift',
  'CapsLock',
  'Control',
  'Alt',
  'Meta',
]);

function shouldIgnoreWedgeTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'TEXTAREA') return true;
  if (tag !== 'INPUT') return false;
  const input = target as HTMLInputElement;
  if (input.type === 'hidden') return false;
  if (input.getAttribute('aria-hidden') === 'true') return false;
  if (input.classList.contains('sr-only')) return false;
  return true;
}

/**
 * USB barcode wedge: accumulates keypresses until Enter, then calls onScan.
 * Skips when focus is in a visible text field (coupon code, search, etc.).
 */
export function usePrizeShelfWedgeScan({
  enabled,
  busy = false,
  onScan,
}: {
  enabled: boolean;
  busy?: boolean;
  onScan: (raw: string) => void | Promise<void>;
}) {
  const [buffer, setBuffer] = useState('');
  const bufferRef = useRef(buffer);
  const onScanRef = useRef(onScan);
  const busyRef = useRef(busy);

  useEffect(() => {
    bufferRef.current = buffer;
  }, [buffer]);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    if (!enabled) {
      setBuffer('');
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.visibilityState !== 'visible' || busyRef.current) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (WEDGE_IGNORED_KEYS.has(e.key) || /^F\d+$/.test(e.key)) return;
      if (shouldIgnoreWedgeTarget(e.target)) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        const raw = bufferRef.current.trim();
        setBuffer('');
        if (raw) void onScanRef.current(raw);
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        setBuffer((prev) => {
          const next = prev + e.key;
          bufferRef.current = next;
          return next;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);

  return { wedgeBuffer: buffer };
}
