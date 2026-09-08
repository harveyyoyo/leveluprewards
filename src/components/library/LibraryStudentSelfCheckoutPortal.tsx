'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CheckCircle2, Loader2, Lock, ScanBarcode, User, X } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { useFirestore, useFunctions } from '@/firebase';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useLibraryIdleReset } from '@/hooks/useLibraryIdleReset';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { lookupStudentId } from '@/lib/db/lookup';
import { performLibraryCheckoutOrReturn, findLibraryItemByUpc, getStudentLibraryCheckouts } from '@/lib/library/libraryOperations';
import { getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { createScanDeduper } from '@/lib/library/libraryIntakeHelpers';
import { resolveLibraryTheme } from '@/lib/library/libraryThemes';
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
  const scanLock = useRef(false);
  const [mode, setMode] = useState<'checkout' | 'return'>('checkout');
  const [scanError, setScanError] = useState<string | null>(null);
  const [exitOpenInternal, setExitOpenInternal] = useState(false);
  const exitOpen = exitOpenProp ?? exitOpenInternal;
  const setExitOpen = onExitOpenChange ?? setExitOpenInternal;
  const [sessionReady, setSessionReady] = useState(false);

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );
  const libraryTheme = useMemo(() => resolveLibraryTheme(settings.libraryTheme), [settings.libraryTheme]);
  const matchKioskTheme = settings.libraryThemeMatchKiosk !== false;
  const shouldAcceptScan = useMemo(() => createScanDeduper(1500), []);
  const studentLabel = studentId ? getStudentName(studentId) : null;

  const staffCanDismissWithoutPasscode = false;

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
    setMode('checkout');
    setScanError(null);
  }, []);
  const idleRemaining = useLibraryIdleReset(!!studentId && !busy && !exitOpen, resetForNextStudent);

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
          action: mode,
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
        } else if (result.action === 'already_done') {
          toast({ title: 'Already scanned', description: mode === 'checkout' ? 'This book is already checked out to you.' : 'This book is already returned.' });
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
    [firestore, schoolId, studentId, libraryPolicy, functions, mode, playSound, toast, refreshStudentLoans],
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
      if (scanLock.current || !shouldAcceptScan(code) || !firestore || !schoolId) return;
      scanLock.current = true;
      setBusy(true); setScanError(null);
      void (async () => {
        try {
          const found = await findLibraryItemByUpc(firestore, schoolId, code);
          if (step === 'student') {
            if (found) throw new Error('Scan your student ID card first, then the book.');
            await processStudent(code);
          } else if (found) {
            await processBook(code);
          } else if (!isRetailIsbnBarcode(code)) {
            // Scanning the next student's card explicitly starts their session.
            const id = await lookupStudentId(firestore, schoolId, code);
            if (!id) throw new Error('Book or student not found. Ask library staff for help.');
            setLastBookTitle(null); setLastAction(null); setMode('checkout');
            await processStudent(code);
          } else {
            throw new Error('Book not in the catalog. Ask library staff for help.');
          }
        } catch (e) {
          setScanError((e as Error).message || 'Could not save the scan. Please try again.');
          playSound('error');
        } finally {
          scanLock.current = false; setBusy(false);
        }
      })();
    },
    [step, processBook, processStudent, shouldAcceptScan, firestore, schoolId, playSound],
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
        : 'Scan another book or tap Done.';

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
        'relative flex h-[100dvh] min-h-[100dvh] w-full flex-1 flex-col overflow-hidden transition-colors',
        matchKioskTheme && libraryTheme.tone === 'dark' ? 'dark' : '',
        'bg-gradient-to-b from-primary/10 via-background to-background',
      )}
      style={matchKioskTheme ? { backgroundColor: libraryTheme.swatches.bg } : undefined}
    >
      <header
        className={cn(
          'sticky top-0 z-40 flex shrink-0 items-center gap-2 border-b border-border/80 bg-background/90 px-3 py-2.5 shadow-sm backdrop-blur-md supports-[padding:max(0px)]:pt-[max(0.5rem,env(safe-area-inset-top))]',
          matchKioskTheme ? libraryTheme.classes.header : ''
        )}
      >
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 gap-2 rounded-xl border-2 border-foreground/20 bg-background px-3 font-bold shadow-sm hover:bg-muted"
          disabled={busy}
          onClick={handleBack}
          aria-label={step !== 'student' ? 'Back to scan student card' : 'Close self checkout'}
        >
          <X className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
          <span className="text-sm">{step !== 'student' ? 'Back' : 'Close'}</span>
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1.5">
            <span>Library</span>
            {matchKioskTheme && (
              <span className="opacity-75 font-normal">· {libraryTheme.icon} {libraryTheme.label}</span>
            )}
          </p>
          <h1 className="truncate text-base font-black tracking-tight sm:text-lg">Borrow &amp; return</h1>
        </div>
        {step !== 'student' ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 shrink-0 rounded-xl border-2 font-bold"
            disabled={busy}
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

        {studentId && <div className="flex gap-2" role="group" aria-label="Choose library action">
          <Button disabled={busy} variant={mode === 'checkout' ? 'default' : 'outline'} aria-pressed={mode === 'checkout'} onClick={() => { setMode('checkout'); setStep('book'); }}>Check out</Button>
          <Button disabled={busy} variant={mode === 'return' ? 'default' : 'outline'} aria-pressed={mode === 'return'} onClick={() => { setMode('return'); setStep('book'); }}>Return</Button>
        </div>}
        {scanError && <p role="alert" className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-destructive">{scanError}</p>}
        {studentId && idleRemaining <= 15 && <p role="status" className="text-sm">Returning to the start in {idleRemaining}s. Tap anywhere to keep going.</p>}
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
            <Button type="button" className="rounded-xl w-full" disabled={busy} onClick={() => setStep('book')}>
              Scan another book
            </Button>
            <Button type="button" variant="outline" className="rounded-xl w-full" disabled={busy} onClick={resetForNextStudent}>
              Done · Next student
            </Button>
          </div>
        ) : step === 'book' ? (
          <Button type="button" variant="ghost" className="rounded-xl text-muted-foreground" disabled={busy} onClick={resetForNextStudent}>
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
