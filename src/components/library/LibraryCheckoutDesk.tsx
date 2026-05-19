'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowLeftRight, Barcode, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useFunctions } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { lookupStudentId } from '@/lib/db/lookup';
import { performLibraryCheckoutOrReturn } from '@/lib/libraryOperations';
import { formatDueDate, getLibraryPolicyFromSettings } from '@/lib/libraryPolicy';
import { isSchoolLibraryBarcode } from '@/lib/libraryScanCode';
import { isRetailIsbnBarcode } from '@/lib/libraryCatalogLookup';
import { createScanDeduper } from '@/lib/libraryIntakeHelpers';
import type { Category } from '@/lib/types';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';

export function LibraryCheckoutDesk({
  getStudentName,
  categories,
}: {
  getStudentName: (id?: string) => string;
  categories?: Category[] | null;
}) {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [lastBookTitle, setLastBookTitle] = useState<string | null>(null);

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );

  const shouldAcceptScan = useMemo(() => createScanDeduper(1500), []);
  const studentLabel = studentId ? getStudentName(studentId) : null;

  const clearStudent = useCallback(() => {
    setStudentId(null);
    setLastBookTitle(null);
  }, []);

  const processBook = useCallback(
    async (code: string) => {
      if (!firestore || !schoolId || !studentId) return;
      setBusy(true);
      try {
        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, studentId, code, {
          policy: libraryPolicy,
          functions,
        });
        if (result.action === 'checkout') {
          playSound('success');
          setLastBookTitle(result.item.name);
          toast({
            title: 'Checked out',
            description: result.dueAt
              ? `${result.item.name} — due ${formatDueDate(result.dueAt)}`
              : result.item.name,
          });
        } else if (result.action === 'return') {
          playSound('success');
          setLastBookTitle(result.item.name);
          toast({
            title: 'Checked in',
            description: result.pointsMessage || result.item.name,
          });
        } else if (result.action === 'wrong_borrower') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Wrong student',
            description: 'This book is checked out to a different student.',
          });
        } else {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Book not found',
            description: 'Scan the LIB sticker barcode on this school copy.',
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, studentId, libraryPolicy, functions, playSound, toast],
  );

  const processStudent = useCallback(
    async (badgeId: string) => {
      if (!firestore || !schoolId) return;
      setBusy(true);
      try {
        const id = await lookupStudentId(firestore, schoolId, badgeId);
        if (!id) {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Student not found',
            description: 'Scan a valid student ID card.',
          });
          return;
        }
        setStudentId(id);
        setLastBookTitle(null);
        playSound('success');
        toast({
          title: 'Student ready',
          description: `Now scan a book LIB barcode for ${getStudentName(id)}.`,
        });
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, getStudentName, playSound, toast],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      const trimmed = code.trim();
      if (!trimmed) return;

      if (isSchoolLibraryBarcode(trimmed)) {
        if (!studentId) {
          toast({
            variant: 'destructive',
            title: 'Scan student first',
            description: 'Scan the student ID card, then the book LIB barcode.',
          });
          return;
        }
        void processBook(trimmed);
        return;
      }

      if (isRetailIsbnBarcode(trimmed)) {
        toast({
          variant: 'destructive',
          title: 'ISBN barcode',
          description: 'For checkout, scan the school LIB sticker on the book, not the retail ISBN.',
        });
        return;
      }

      void processStudent(trimmed);
    },
    [processBook, processStudent, shouldAcceptScan, studentId, toast],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: scanning,
    onScan: handleScan,
    disabled: busy,
  });

  const stepHint = !studentId
    ? 'Step 1: Scan the student ID card.'
    : 'Step 2: Scan the book LIB barcode (repeat for more books).';

  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-4" role="region" aria-label="Library checkout desk">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            Check out &amp; check in
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Desk checkout: student card, then book LIB barcode. Returns use the same flow when the same student scans the
            book back in.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="rounded-xl shrink-0"
          variant={scanning ? 'secondary' : 'default'}
          disabled={busy}
          onClick={() => {
            setScanning((on) => {
              const next = !on;
              if (next) setTimeout(() => focusReader(), 0);
              return next;
            });
          }}
        >
          <Barcode className="mr-2 h-4 w-4" />
          {scanning ? 'Stop scanning' : 'Start scanning'}
        </Button>
      </div>

      {scanning ? (
        <LibraryBarcodeReaderField
          inputId="library-checkout-reader"
          inputRef={inputRef}
          scanBuffer={scanBuffer}
          onScanBufferChange={setScanBuffer}
          onSubmit={submitScan}
          active={!busy}
          hint={stepHint}
        />
      ) : (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed bg-background/60 px-4 py-6 text-center">
          Press <strong className="text-foreground">Start scanning</strong> when a student is at the desk with their ID
          card and book.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-background/80 px-3 py-2.5">
        <User className="h-5 w-5 text-primary shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current student</p>
          <p className="font-bold truncate">{studentLabel ?? 'None — scan student ID first'}</p>
          {lastBookTitle ? (
            <p className="text-xs text-muted-foreground truncate">Last book: {lastBookTitle}</p>
          ) : null}
        </div>
        {busy ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground shrink-0" /> : null}
        {studentId ? (
          <Button type="button" variant="outline" size="sm" className="rounded-lg shrink-0" onClick={clearStudent}>
            Next student
          </Button>
        ) : null}
      </div>
    </div>
  );
}
