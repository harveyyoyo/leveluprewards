'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Loader2, Lock, ScanBarcode, User, X } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { lookupStudentId } from '@/lib/db/lookup';
import { performLibraryCheckoutOrReturn, findLibraryItemByUpc, getStudentLibraryCheckouts } from '@/lib/library/libraryOperations';
import { getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { createScanDeduper } from '@/lib/library/libraryIntakeHelpers';
import type { Category, LibraryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryStaffExitDialog } from './LibraryStaffExitDialog';
import { LibraryStudentLoansSummary } from './LibraryStudentLoansSummary';

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
  const [studentLoans, setStudentLoans] = useState<LibraryItem[]>([]);
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
    setStudentLoans([]);
    setLastBookTitle(null);
    setLastAction(null);
    setStep('student');
  }, []);

  const handleBack = useCallback(() => {
    if (step !== 'student') {
      resetForNextStudent();
      return;
    }
    if (staffCanDismissWithoutPasscode && onExit) {
      onExit();
      return;
    }
    setExitOpen(true);
  }, [step, resetForNextStudent, staffCanDismissWithoutPasscode, onExit, setExitOpen]);

  const handleExit = useCallback(() => {
    if (staffCanDismissWithoutPasscode && onExit) {
      onExit();
      return;
    }
    setExitOpen(true);
  }, [staffCanDismissWithoutPasscode, onExit, setExitOpen]);

  const refreshStudentLoans = useCallback(
    async (id: string) => {
      if (!firestore || !schoolId) {
        setStudentLoans([]);
        return;
      }
      const items = await getStudentLibraryCheckouts(firestore, schoolId, id);
      setStudentLoans(items);
    },
    [firestore, schoolId],
  );

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
          await refreshStudentLoans(studentId);
        } else if (result.action === 'return') {
          playSound('success');
          setLastBookTitle(result.item.name);
          setLastAction('return');
          setStep('success');
          await refreshStudentLoans(studentId);
        } else if (result.action === 'limit_reached') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Checkout limit reached',
            description: `You already have ${result.currentCount} of ${result.max} allowed books.`,
          });
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
            description: 'Scan the barcode on this school copy (ISBN or LIB sticker).',
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, studentId, libraryPolicy, functions, playSound, toast, refreshStudentLoans],
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
        await refreshStudentLoans(id);
        playSound('success');
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, playSound, toast, refreshStudentLoans],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      const trimmed = code.trim();
      if (!trimmed || !firestore || !schoolId) return;

      void (async () => {
        const found = await findLibraryItemByUpc(firestore, schoolId, trimmed);

        if (step === 'student') {
          if (found) {
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
          if (!found) {
            if (isRetailIsbnBarcode(trimmed)) {
              toast({
                variant: 'destructive',
                title: 'Book not in catalog',
                description: 'This ISBN is not registered. Ask library staff for help.',
              });
            } else if (step === 'book') {
              toast({
                variant: 'destructive',
                title: 'Book not found',
                description: 'Scan the barcode on the book cover (ISBN or LIB sticker).',
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
      })();
    },
    [step, processBook, processStudent, shouldAcceptScan, toast, firestore, schoolId],
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
        ? `Scan each book barcode for ${studentLabel ?? 'this student'}.`
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
        'relative flex h-[100dvh] min-h-[100dvh] w-full flex-1 flex-col overflow-hidden',
        'bg-gradient-to-b from-primary/8 via-background to-background',
      )}
    >
      <header className="sticky top-0 z-40 flex shrink-0 items-center gap-2 border-b border-border/80 bg-background px-3 py-2.5 shadow-sm supports-[padding:max(0px)]:pt-[max(0.5rem,env(safe-area-inset-top))]">
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 gap-2 rounded-xl border-2 border-foreground/20 bg-background px-3 font-bold shadow-sm hover:bg-muted"
          onClick={handleBack}
          aria-label={step !== 'student' ? 'Back to scan student card' : 'Close self checkout'}
        >
          <X className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="text-sm">{step !== 'student' ? 'Back' : 'Close'}</span>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Library</p>
          <h1 className="truncate text-base font-black tracking-tight sm:text-lg">Check out books</h1>
        </div>
        {step !== 'student' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 shrink-0 rounded-xl border-2 font-bold"
            onClick={handleExit}
          >
            <Lock className="mr-1.5 h-4 w-4 shrink-0" aria-hidden />
            Exit
          </Button>
        ) : (
          <span className="w-[4.5rem] shrink-0 sm:w-[5.25rem]" aria-hidden />
        )}
      </header>

      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto p-4 md:p-8 max-w-lg mx-auto w-full">
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-sm',
            step === 'student' && 'border-primary bg-ring/10 text-ring',
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

        <div className="text-center space-y-2 w-full">
          {studentLabel && step !== 'student' ? (
            <p className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-foreground leading-none px-2">
              {studentLabel}
            </p>
          ) : null}
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Step {step === 'student' ? '1' : step === 'book' ? '2' : 'Done'}
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-muted-foreground">
            {step === 'student'
              ? 'Scan your card'
              : step === 'book'
                ? 'Scan your book'
                : lastAction === 'return'
                  ? 'Book returned!'
                  : 'Book checked out!'}
          </h2>
          {lastBookTitle && step === 'success' ? (
            <p className="text-base sm:text-lg font-semibold text-primary">{lastBookTitle}</p>
          ) : null}
        </div>

        {studentId && step !== 'student' ? (
          <LibraryStudentLoansSummary
            items={studentLoans}
            maxCheckouts={libraryPolicy.maxCheckoutsPerStudent}
            libraryPolicy={libraryPolicy}
            compact
          />
        ) : null}

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
