'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Loader2, Lock, ScanBarcode, User } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { lookupStudentId } from '@/lib/db/lookup';
import { performLibraryCheckoutOrReturn } from '@/lib/libraryOperations';
import { getLibraryPolicyFromSettings } from '@/lib/libraryPolicy';
import { isSchoolLibraryBarcode } from '@/lib/libraryScanCode';
import { isRetailIsbnBarcode } from '@/lib/libraryCatalogLookup';
import { createScanDeduper } from '@/lib/libraryIntakeHelpers';
import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryStaffExitDialog } from './LibraryStaffExitDialog';

type PortalStep = 'student' | 'book' | 'success';

const STAFF_LIBRARY_SESSION_STATES = new Set([
  'admin',
  'librarian',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'office',
  'houseCoordinator',
  'developer',
]);

export function LibraryStudentSelfCheckoutPortal({
  schoolId,
  categories,
  getStudentName,
  embedded = false,
  exitOpen: exitOpenProp,
  onExitOpenChange,
  onExit,
}: {
  schoolId: string;
  categories?: Category[] | null;
  getStudentName: (id?: string) => string;
  /** When true, renders inside a modal overlay instead of a full-page route. */
  embedded?: boolean;
  exitOpen?: boolean;
  onExitOpenChange?: (open: boolean) => void;
  /** Called after staff passcode unlock (embedded mode closes the overlay). */
  onExit?: () => void;
}) {
  const router = useRouter();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const { login, loginState, isInitialized } = useAppContext();
  const { toast } = useToast();
  const playSound = useArcadeSound();

  const [step, setStep] = useState<PortalStep>('student');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [lastBookTitle, setLastBookTitle] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'checkout' | 'return' | null>(null);
  const [busy, setBusy] = useState(false);
  const [exitOpenInternal, setExitOpenInternal] = useState(false);
  const exitOpen = exitOpenProp ?? exitOpenInternal;
  const setExitOpen = onExitOpenChange ?? setExitOpenInternal;
  const [sessionReady, setSessionReady] = useState(false);

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );
  const shouldAcceptScan = useMemo(() => createScanDeduper(1500), []);
  const studentLabel = studentId ? getStudentName(studentId) : null;

  const staffCanDismissWithoutPasscode =
    embedded && (loginState === 'librarian' || loginState === 'admin');

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'student' || loginState === 'school') {
      setSessionReady(true);
      return;
    }
    if (embedded && STAFF_LIBRARY_SESSION_STATES.has(loginState)) {
      setSessionReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const authResult = await login('student', { schoolId });
      if (!cancelled) setSessionReady(authResult.ok);
      if (!cancelled && !authResult.ok) {
        toast({
          variant: 'destructive',
          title: 'Could not start library kiosk',
          description: authResult.message,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [embedded, isInitialized, login, loginState, schoolId, toast]);

  const resetForNextStudent = useCallback(() => {
    setStudentId(null);
    setLastBookTitle(null);
    setLastAction(null);
    setStep('student');
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
          setLastAction('checkout');
          setStep('success');
        } else if (result.action === 'return') {
          playSound('success');
          setLastBookTitle(result.item.name);
          setLastAction('return');
          setStep('success');
        } else if (result.action === 'wrong_borrower') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Wrong student',
            description: 'This book is checked out to someone else.',
          });
        } else {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Book not found',
            description: 'Scan the LIB sticker on this school copy.',
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
        setStep('book');
        playSound('success');
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, playSound, toast],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      const trimmed = code.trim();
      if (!trimmed) return;

      if (step === 'student') {
        if (isSchoolLibraryBarcode(trimmed) || isRetailIsbnBarcode(trimmed)) {
          toast({
            variant: 'destructive',
            title: 'Scan your ID card first',
            description: 'Use your student ID card, then scan the book.',
          });
          return;
        }
        void processStudent(trimmed);
        return;
      }

      if (step === 'book' || step === 'success') {
        if (!isSchoolLibraryBarcode(trimmed)) {
          if (isRetailIsbnBarcode(trimmed)) {
            toast({
              variant: 'destructive',
              title: 'ISBN barcode',
              description: 'Scan the school LIB sticker on the book.',
            });
          } else if (step === 'book') {
            toast({
              variant: 'destructive',
              title: 'Not a book barcode',
              description: 'Scan the LIB sticker on the book cover.',
            });
          }
          return;
        }
        if (step === 'success') {
          setStep('book');
          setLastAction(null);
        }
        void processBook(trimmed);
      }
    },
    [step, processBook, processStudent, shouldAcceptScan, toast],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: sessionReady && !exitOpen,
    onScan: handleScan,
    disabled: busy,
  });

  useEffect(() => {
    if (sessionReady) {
      const t = setTimeout(() => focusReader(), 100);
      return () => clearTimeout(t);
    }
  }, [sessionReady, step, focusReader]);

  const stepHint =
    step === 'student'
      ? 'Scan your student ID card.'
      : step === 'book'
        ? `Scan each book for ${studentLabel ?? 'this student'}.`
        : 'Scan another book or tap Next student.';

  if (!sessionReady) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-background',
          'min-h-[100dvh]',
        )}
      >
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-gradient-to-b from-primary/8 via-background to-background',
        'min-h-[100dvh] h-full w-full flex-1 overflow-y-auto',
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b bg-background/90 backdrop-blur px-4 py-3 shrink-0">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Library</p>
          <h1 className="text-lg font-black tracking-tight">Check out books</h1>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl shrink-0"
          onClick={() => {
            if (staffCanDismissWithoutPasscode && onExit) {
              onExit();
              return;
            }
            setExitOpen(true);
          }}
        >
          <Lock className="mr-2 h-4 w-4" />
          {staffCanDismissWithoutPasscode ? 'Close' : 'Staff'}
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 max-w-lg mx-auto w-full gap-6">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-sm',
            step === 'student' && 'border-primary bg-primary/10 text-primary',
            step === 'book' && 'border-amber-400 bg-amber-50 text-amber-800',
            step === 'success' && 'border-emerald-400 bg-emerald-50 text-emerald-800',
          )}
        >
          {step === 'student' ? (
            <User className="h-8 w-8" />
          ) : step === 'book' ? (
            <BookOpen className="h-8 w-8" />
          ) : (
            <CheckCircle2 className="h-8 w-8" />
          )}
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Step {step === 'student' ? '1' : step === 'book' ? '2' : 'Done'}
          </p>
          <h2 className="text-2xl font-black">
            {step === 'student'
              ? 'Scan your card'
              : step === 'book'
                ? 'Scan your book'
                : lastAction === 'return'
                  ? 'Book returned!'
                  : 'Book checked out!'}
          </h2>
          {studentLabel && step !== 'student' ? (
            <p className="text-sm text-muted-foreground font-medium">{studentLabel}</p>
          ) : null}
          {lastBookTitle && step === 'success' ? (
            <p className="text-sm font-semibold text-primary">{lastBookTitle}</p>
          ) : null}
        </div>

        <div className="w-full space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
            <ScanBarcode className="h-4 w-4" />
            Scanner ready
          </div>
          <LibraryBarcodeReaderField
            inputId="library-self-checkout-reader"
            inputRef={inputRef}
            scanBuffer={scanBuffer}
            onScanBufferChange={setScanBuffer}
            onSubmit={submitScan}
            active={!busy}
            hint={stepHint}
          />
        </div>

        {busy ? (
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        ) : null}

        {step === 'success' ? (
          <div className="flex flex-col gap-2 w-full">
            <Button type="button" className="rounded-xl w-full" onClick={() => setStep('book')}>
              Scan another book
            </Button>
            <Button type="button" variant="outline" className="rounded-xl w-full" onClick={resetForNextStudent}>
              Next student
            </Button>
          </div>
        ) : step === 'book' ? (
          <Button type="button" variant="ghost" className="rounded-xl text-muted-foreground" onClick={resetForNextStudent}>
            Wrong student? Start over
          </Button>
        ) : null}
      </main>

      <LibraryStaffExitDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onUnlocked={() => {
          if (onExit) {
            onExit();
            return;
          }
          if (loginState === 'admin') {
            router.push(`/${schoolId}/admin`);
          } else {
            router.push(`/${schoolId}/librarian`);
          }
        }}
      />
    </div>
  );
}
