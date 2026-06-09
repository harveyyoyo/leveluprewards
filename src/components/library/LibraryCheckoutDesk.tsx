'use client';

import { useCallback, useMemo, useState } from 'react';
import { ArrowLeftRight, Barcode, ChevronUp, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirestore, useFunctions } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { lookupStudentId } from '@/lib/db/lookup';
import { performLibraryCheckoutOrReturn, findLibraryItemByUpc } from '@/lib/library/libraryOperations';
import { formatDueDate, getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import { isSchoolLibraryBarcode } from '@/lib/library/libraryScanCode';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { createScanDeduper } from '@/lib/library/libraryIntakeHelpers';
import type { Category, Student } from '@/lib/types';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryStudentNamePicker } from './LibraryStudentNamePicker';

export function LibraryCheckoutDesk({
  getStudentName,
  categories,
  students,
}: {
  getStudentName: (id?: string) => string;
  categories?: Category[] | null;
  students?: Student[] | null;
}) {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const [deskOpen, setDeskOpen] = useState(true);
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

  const selectStudentById = useCallback(
    (id: string, source: 'scan' | 'manual') => {
      setStudentId(id);
      setLastBookTitle(null);
      playSound('success');
      toast({
        title: 'Student ready',
        description:
          source === 'manual'
            ? `${getStudentName(id)} — scan book LIB barcodes or press Start scanning.`
            : `Now scan a book LIB barcode for ${getStudentName(id)}.`,
      });
    },
    [getStudentName, playSound, toast],
  );

  const processBook = useCallback(
    async (code: string, targetStudentId?: string) => {
      const activeStudentId = targetStudentId || studentId;
      if (!firestore || !schoolId || !activeStudentId) return;
      setBusy(true);
      try {
        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, activeStudentId, code, {
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
            description: 'Scan a valid student ID card or find the student by name.',
          });
          return;
        }
        selectStudentById(id, 'scan');
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, selectStudentById, playSound, toast],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      const trimmed = code.trim();
      if (!trimmed) return;

      if (isSchoolLibraryBarcode(trimmed)) {
        if (!studentId) {
          // If no student is selected, look up the book copy.
          // If it is currently checked out, we can automatically process the check-in (return) for the borrower!
          if (!firestore || !schoolId) return;
          setBusy(true);
          findLibraryItemByUpc(firestore, schoolId, trimmed)
            .then((found) => {
              setBusy(false);
              if (!found) {
                playSound('error');
                toast({
                  variant: 'destructive',
                  title: 'Book not found',
                  description: 'Scan the LIB sticker barcode on this school copy.',
                });
                return;
              }
              if (found.item.status === 'checked_out' && found.item.checkedOutTo) {
                // Instantly check it in for the borrowing student!
                void processBook(trimmed, found.item.checkedOutTo);
              } else {
                playSound('error');
                toast({
                  variant: 'destructive',
                  title: 'Select student first',
                  description: 'Find a student by name or scan their ID card first to check out this available book.',
                });
              }
            })
            .catch(() => {
              setBusy(false);
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
    [firestore, schoolId, processBook, processStudent, shouldAcceptScan, studentId, playSound, toast],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: scanning && deskOpen,
    onScan: handleScan,
    disabled: busy,
  });

  const stepHint = !studentId
    ? 'Step 1: Scan the student ID card (or pick a student by name above).'
    : 'Step 2: Scan the book LIB barcode (repeat for more books).';

  return (
    <div
      className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-4"
      role="region"
      aria-label="Library checkout desk"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ArrowLeftRight className="h-4 w-4 text-ring" />
            Check out &amp; check in
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Pick a student by name or scan their ID card, then scan each book&apos;s LIB barcode.
          </p>
        </div>
      </div>

      {!studentId ? (
        <LibraryStudentNamePicker
          students={students}
          disabled={busy}
          onSelect={(s) => selectStudentById(s.id, 'manual')}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {scanning
            ? 'Scanner active — scan student ID or book LIB barcode.'
            : 'Press Start scanning when ready.'}
        </p>
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
        <User className="h-5 w-5 text-ring shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current student</p>
          <p className="font-bold truncate">{studentLabel ?? 'None — find by name or scan ID'}</p>
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
