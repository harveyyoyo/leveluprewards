'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * USB / Bluetooth barcode readers that emulate a keyboard (wedge).
 * Captures rapid key input ending with Enter.
 */
export function useBarcodeReaderWedge({
  active,
  onScan,
  disabled = false,
}: {
  active: boolean;
  onScan: (code: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const bufferRef = useRef('');
  const [scanBuffer, setScanBuffer] = useState('');
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  const clearBuffer = useCallback(() => {
    bufferRef.current = '';
    setScanBuffer('');
  }, []);

  const submitScan = useCallback(
    (raw?: string) => {
      const code = (raw ?? bufferRef.current).trim();
      clearBuffer();
      if (code) onScanRef.current(code);
      inputRef.current?.focus();
    },
    [clearBuffer],
  );

  useEffect(() => {
    if (!active || disabled) return;
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [active, disabled]);

  useEffect(() => {
    if (!active || disabled) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (document.visibilityState !== 'visible') return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const ignored = ['Escape', 'Tab', 'Shift', 'CapsLock', 'Control', 'Alt', 'Meta'];
      if (ignored.includes(e.key) || /^F\d+$/.test(e.key)) return;

      const focused = document.activeElement;
      const isScanField = focused === inputRef.current;
      if (
        focused &&
        !isScanField &&
        (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA' || focused.tagName === 'SELECT')
      ) {
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        submitScan();
        return;
      }

      if (e.key.length === 1) {
        e.preventDefault();
        bufferRef.current += e.key;
        setScanBuffer(bufferRef.current);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [active, disabled, submitScan]);

  return {
    inputRef,
    scanBuffer,
    setScanBuffer: (value: string) => {
      bufferRef.current = value;
      setScanBuffer(value);
    },
    submitScan,
    clearBuffer,
    focusReader: () => inputRef.current?.focus(),
  };
}
