'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  CornerDownLeft,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  ScanBarcode,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { resolveBookClassification, type LibraryGenreConfig } from '@/lib/library/libraryClassification';
import { collection, query, limit } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useDoc, useFirestore, useFunctions, useCollection, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useLibraryIdleReset } from '@/hooks/useLibraryIdleReset';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import { lookupStudentId } from '@/lib/db/lookup';
import { useActiveLibraryLocation, useLibraryLocations } from '@/hooks/useLibraryLocations';
import {
  performLibraryCheckoutOrReturn,
  findLibraryItemByUpc,
  getStudentLibraryCheckouts,
  forceReturnLibraryItem,
} from '@/lib/library/libraryOperations';
import { filterItemsForLibrary } from '@/lib/library/libraryLocations';
import { LibraryStationPicker } from './LibraryStationPicker';
import { computeDaysOverdue, getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import {
  playLibraryReturnAudio,
  resolveLibraryReturnFeedback,
  type LibraryReturnFeedback,
} from '@/lib/library/libraryAudio';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { createScanDeduper } from '@/lib/library/libraryIntakeHelpers';
import { resolveLibraryTheme } from '@/lib/library/libraryThemes';
import { getLibraryBookRecommendations } from '@/lib/library/libraryRecommendations';
import { computeStudentLibraryStanding } from '@/lib/library/libraryBehavior';
import type { Category, LibraryItem } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryStaffExitDialog } from './LibraryStaffExitDialog';
import { LibraryStudentLoansSummary } from './LibraryStudentLoansSummary';
import { LibraryStudentBehaviorBadge } from './LibraryStudentBehaviorBadge';
import { LibraryRecommendationsCard } from './LibraryRecommendationsCard';

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
  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolData } = useDoc<{ name?: string }>(schoolDocRef);
  const schoolName = schoolData?.name?.trim();

  const [step, setStep] = useState<PortalStep>('student');
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLoans, setStudentLoans] = useState<LibraryItem[]>([]);
  const [lastBookTitle, setLastBookTitle] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<'checkout' | 'return' | null>(null);
  const [lastReturnBorrower, setLastReturnBorrower] = useState<string | null>(null);
  const [lastReturnFeedback, setLastReturnFeedback] = useState<LibraryReturnFeedback | null>(null);
  const [lastReturnPlacement, setLastReturnPlacement] = useState<{
    shelf: string;
    genre: LibraryGenreConfig;
    color: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const scanLock = useRef(false);
  const [mode, setMode] = useState<'auto' | 'checkout' | 'return'>('auto');
  const [scanError, setScanError] = useState<string | null>(null);
  const [exitOpenInternal, setExitOpenInternal] = useState(false);
  const exitOpen = exitOpenProp ?? exitOpenInternal;
  const setExitOpen = onExitOpenChange ?? setExitOpenInternal;
  const [sessionReady, setSessionReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Load catalog items for recommendation engine
  const catalogQuery = useMemoFirebase(
    () => (firestore && schoolId ? query(collection(firestore, 'schools', schoolId, 'library'), limit(150)) : null),
    [firestore, schoolId],
  );
  const { data: catalogItems } = useCollection<LibraryItem>(catalogQuery);
  const { locations } = useLibraryLocations(schoolId);
  const { active: activeLibrary, setActive: setActiveLibrary, resetChoice, needsChoice } = useActiveLibraryLocation(
    schoolId,
    locations,
    { requireExplicitChoice: true },
  );
  const scopedCatalog = useMemo(
    () => filterItemsForLibrary(catalogItems, activeLibrary.id),
    [activeLibrary.id, catalogItems],
  );
  const libraryNames = useMemo(
    () => Object.fromEntries(locations.map((location) => [location.id, location.name])),
    [locations],
  );

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );
  const libraryTheme = useMemo(() => resolveLibraryTheme(settings.libraryTheme), [settings.libraryTheme]);
  const matchKioskTheme = settings.libraryThemeMatchKiosk !== false;
  const shouldAcceptScan = useMemo(() => createScanDeduper(1500), []);
  const studentLabel = studentId ? getStudentName(studentId) : null;

  // Recommendations and standing computations
  const recommendations = useMemo(() => {
    return getLibraryBookRecommendations(scopedCatalog, {
      studentLoans,
      limit: 6,
    });
  }, [scopedCatalog, studentLoans]);

  const standing = useMemo(() => {
    return computeStudentLibraryStanding(studentLoans);
  }, [studentLoans]);

  const overdueLoans = useMemo(
    () => studentLoans.filter((l) => computeDaysOverdue(l.dueAt) > 0),
    [studentLoans],
  );
  const dueSoonLoans = useMemo(
    () =>
      studentLoans.filter((l) => {
        const days = computeDaysOverdue(l.dueAt);
        return days <= 0 && l.dueAt && l.dueAt - Date.now() < 3 * 86_400_000;
      }),
    [studentLoans],
  );

  const toggleFullscreen = useCallback(() => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

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
    setLastReturnBorrower(null);
    setLastReturnFeedback(null);
    setLastReturnPlacement(null);
    setStep('student');
    setMode('auto');
    setScanError(null);
  }, []);

  // 0 means "disabled (manual tap only)" — the Library → Settings station auto-reset option.
  const autoResetSeconds = settings.libraryKioskAutoResetSeconds ?? 8;
  const idleRemaining = useLibraryIdleReset(
    autoResetSeconds > 0 && !!studentId && !busy && !exitOpen,
    resetForNextStudent,
    autoResetSeconds,
  );

  /** No passcode was required, so this tab was never authenticated as staff —
   *  land somewhere that doesn't need a staff session instead of a login wall. */
  const exitToNeutral = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }
    router.push(`/${schoolId}/portal`);
  }, [onExit, router, schoolId]);

  const requestExit = useCallback(() => {
    if (settings.libraryKioskExitRequiresPasscode) {
      setExitOpen(true);
    } else {
      exitToNeutral();
    }
  }, [settings.libraryKioskExitRequiresPasscode, setExitOpen, exitToNeutral]);

  const handleBack = useCallback(() => {
    if (step !== 'student') {
      resetForNextStudent();
      return;
    }
    requestExit();
  }, [step, resetForNextStudent, requestExit]);

  const handleExit = useCallback(() => {
    requestExit();
  }, [requestExit]);

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
          libraryLocationId: activeLibrary.id,
        });
        if (result.action === 'checkout') {
          playSound('success');
          setLastBookTitle(result.item.name);
          setLastAction('checkout');
          setLastReturnFeedback(null);
          setStep('success');
          await refreshStudentLoans(studentId);
        } else if (result.action === 'return') {
          const classification = resolveBookClassification(
            result.item.category,
            settings.libraryGenreDefinitions,
            result.item.shelfLocation,
          );
          setLastReturnPlacement({
            shelf: classification.shelfLocation,
            genre: classification.genre,
            color: classification.color,
          });

          const isOverdue = (result.daysOverdue ?? 0) > 0;
          const daysOverdue = result.daysOverdue ?? 0;
          const feedback = resolveLibraryReturnFeedback(
            {
              isOverdue,
              daysOverdue,
              bookTitle: result.item.name,
              studentName: studentLabel || undefined,
            },
            settings,
          );
          setLastReturnFeedback(feedback);

          if (settings.libraryKioskSoundEffects !== false) {
            playLibraryReturnAudio(feedback.soundId);
          } else {
            playSound('success');
          }

          setLastBookTitle(result.item.name);
          setLastAction('return');
          setStep('success');
          await refreshStudentLoans(studentId);
        } else if (result.action === 'already_done') {
          toast({
            title: 'Already scanned',
            description:
              mode === 'checkout'
                ? 'This book is already checked out to you.'
                : 'This book is already returned.',
          });
        } else if (result.action === 'limit_reached') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Checkout limit reached',
            description: `You already have ${result.currentCount} of ${result.max} allowed books from ${activeLibrary.name}.`,
          });
        } else if (result.action === 'wrong_library') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Different library',
            description: `This book belongs to ${libraryNames[result.libraryLocationId] ?? 'another library'}. Use that station to borrow it.`,
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
    [firestore, schoolId, studentId, libraryPolicy, functions, mode, playSound, toast, refreshStudentLoans, settings, studentLabel, activeLibrary.id, libraryNames],
  );

  // Quick Return for Drop Box mode (no student card swipe needed)
  const processDropBoxReturn = useCallback(
    async (bookItem: LibraryItem) => {
      if (!firestore || !schoolId) return;
      if (bookItem.status !== 'checked_out') {
        toast({
          title: 'Already in library',
          description: `"${bookItem.name}" is already marked as available.`,
        });
        playSound('error');
        return;
      }
      setBusy(true);
      try {
        const res = await forceReturnLibraryItem(firestore, schoolId, bookItem, {
          policy: libraryPolicy,
          functions,
        });
        const computedOverdue =
          bookItem.dueAt && Date.now() > bookItem.dueAt
            ? Math.ceil((Date.now() - bookItem.dueAt) / (1000 * 60 * 60 * 24))
            : 0;
        const daysOverdue = res.daysOverdue ?? computedOverdue;
        const isOverdue = daysOverdue > 0;
        const feedback = resolveLibraryReturnFeedback(
          {
            isOverdue,
            daysOverdue,
            bookTitle: bookItem.name,
            studentName: bookItem.checkedOutTo ? getStudentName(bookItem.checkedOutTo) : undefined,
          },
          settings,
        );
        setLastReturnFeedback(feedback);

        if (settings.libraryKioskSoundEffects !== false) {
          playLibraryReturnAudio(feedback.soundId);
        } else {
          playSound('success');
        }

        setLastBookTitle(bookItem.name);
        setLastAction('return');
        const classification = resolveBookClassification(
          bookItem.category,
          settings.libraryGenreDefinitions,
          bookItem.shelfLocation,
        );
        setLastReturnPlacement({
          shelf: classification.shelfLocation,
          genre: classification.genre,
          color: classification.color,
        });
        setLastReturnBorrower(bookItem.checkedOutTo ? getStudentName(bookItem.checkedOutTo) : null);
        setStep('success');
        toast({
          title: 'Book returned!',
          description: `"${bookItem.name}" returned. ${res.pointsDelta ? `+${res.pointsDelta} points awarded!` : ''}`,
        });
      } catch (err) {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'Return failed',
          description: (err as Error).message || 'Could not complete book return.',
        });
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, libraryPolicy, functions, playSound, toast, getStudentName, settings],
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
            description: 'Scan a valid student ID card or badge.',
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
      setBusy(true);
      setScanError(null);
      void (async () => {
        try {
          const found = await findLibraryItemByUpc(firestore, schoolId, code);

          if (step === 'student') {
            if (found) {
              if (mode === 'return') {
                // Quick drop-box book return without prior student ID scan
                await processDropBoxReturn(found.item);
                return;
              }
              throw new Error('Scan your student ID card first to borrow books.');
            }
            await processStudent(code);
          } else if (found) {
            await processBook(code);
          } else if (!isRetailIsbnBarcode(code)) {
            // Scanning the next student's card explicitly starts their session.
            const id = await lookupStudentId(firestore, schoolId, code);
            if (!id) throw new Error('Book or student not found. Ask library staff for help.');
            setLastBookTitle(null);
            setLastAction(null);
            setMode('checkout');
            await processStudent(code);
          } else {
            throw new Error('Book not in the catalog. Ask library staff for help.');
          }
        } catch (e) {
          setScanError((e as Error).message || 'Could not save the scan. Please try again.');
          playSound('error');
        } finally {
          scanLock.current = false;
          setBusy(false);
        }
      })();
    },
    [step, mode, processBook, processStudent, processDropBoxReturn, shouldAcceptScan, firestore, schoolId, playSound],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: sessionReady && !exitOpen,
    onScan: handleScan,
    disabled: busy,
  });

  const cameraSettingEnabled = Boolean(settings.libraryCameraScanEnabled);
  const [cameraActive, setCameraActive] = useState(cameraSettingEnabled);

  const { videoRef, hasCameraPermission, zoom, setZoom } = useBarcodeScanner(
    cameraSettingEnabled && cameraActive && sessionReady && !exitOpen && !busy,
    (code) => handleScan(code),
    () => {},
    { cameraEnabled: cameraSettingEnabled && cameraActive, keepCameraWarm: true },
  );

  useEffect(() => {
    if (sessionReady) {
      const t = setTimeout(() => focusReader(), 100);
      return () => clearTimeout(t);
    }
  }, [sessionReady, step, mode, focusReader]);

  const stepHint =
    step === 'student'
      ? mode === 'checkout'
        ? 'Scan your student ID card to start borrowing.'
        : 'Scan any book barcode to return it.'
      : step === 'book'
        ? `Scan each book barcode for ${studentLabel ?? 'this student'}.`
        : 'Scan another book or tap Done.';

  if (!sessionReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (needsChoice) {
    return <LibraryStationPicker locations={locations} onPick={setActiveLibrary} />;
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
          'sticky top-0 z-40 flex shrink-0 items-center justify-between gap-2 border-b border-border/80 bg-background/90 px-3 py-2.5 shadow-sm backdrop-blur-md supports-[padding:max(0px)]:pt-[max(0.5rem,env(safe-area-inset-top))]',
          matchKioskTheme ? libraryTheme.classes.header : '',
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0 gap-2 rounded-xl border-2 border-foreground/20 bg-background px-3 font-bold shadow-sm hover:bg-muted"
            disabled={busy}
            onClick={handleBack}
            aria-label={step !== 'student' ? 'Back to start' : 'Exit kiosk'}
          >
            {step !== 'student' ? (
              <>
                <CornerDownLeft className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="text-sm">Back</span>
              </>
            ) : (
              <>
                <X className="h-5 w-5 shrink-0" strokeWidth={2.5} aria-hidden />
                <span className="text-sm">Close</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Kiosk'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="flex items-center justify-center gap-1.5 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="truncate">{activeLibrary.name || schoolName || 'Library Station'}</span>
            {matchKioskTheme && (
              <span className="shrink-0 font-normal opacity-75">
                · {libraryTheme.icon} {libraryTheme.label}
              </span>
            )}
          </p>
          <h1 className="truncate text-base font-black tracking-tight sm:text-lg">
            {step === 'student' && mode === 'return'
              ? 'Quick Book Return'
              : 'Student Borrow & Return'}
          </h1>
          {locations.length > 1 ? (
            <button
              type="button"
              className="text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
              onClick={resetChoice}
            >
              Change library
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-11 shrink-0 gap-1.5 rounded-xl border-2 font-bold"
            disabled={busy}
            onClick={handleExit}
          >
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">Staff Exit</span>
          </Button>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col items-center justify-start gap-4 overflow-y-auto p-4 sm:p-6 md:p-8">
        {/* Step 1: Mode Picker (Borrow/Return vs Drop Box Return) on Idle */}
        {step === 'student' && (
          <div className="grid w-full grid-cols-2 gap-3 pb-2 pt-1">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode('auto');
                playSound('click');
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                mode !== 'return'
                  ? 'border-primary bg-primary/10 shadow-md ring-2 ring-primary/30'
                  : 'border-border/80 bg-card hover:border-primary/40',
              )}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl font-bold',
                  mode !== 'return'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <BookOpen className="h-6 w-6" />
              </div>
              <span className="text-base font-black text-foreground">Borrow &amp; Return</span>
              <span className="text-xs text-muted-foreground leading-tight">
                Scan ID badge to start (auto-detect)
              </span>
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setMode('return');
                playSound('click');
              }}
              className={cn(
                'flex flex-col items-center justify-center gap-2 rounded-2xl border-2 p-4 text-center transition-all',
                mode === 'return'
                  ? 'border-emerald-500 bg-emerald-500/10 shadow-md ring-2 ring-emerald-500/30'
                  : 'border-border/80 bg-card hover:border-emerald-500/40',
              )}
            >
              <div
                className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl font-bold',
                  mode === 'return'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <RotateCcw className="h-6 w-6" />
              </div>
              <span className="text-base font-black text-foreground">Quick Return</span>
              <span className="text-xs text-muted-foreground leading-tight">
                Scan book barcode directly
              </span>
            </button>
          </div>
        )}

        {/* Big Icon Status Indicator */}
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-2xl border-2 shadow-sm shrink-0',
            step === 'student' &&
              (mode === 'return'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'border-primary bg-ring/10 text-ring'),
            step === 'book' && 'border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
            step === 'success' &&
              'border-emerald-400 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
          )}
        >
          {step === 'student' ? (
            mode === 'return' ? (
              <RotateCcw className="h-8 w-8" />
            ) : (
              <User className="h-8 w-8" />
            )
          ) : step === 'book' ? (
            <BookOpen className="h-8 w-8" />
          ) : (
            <CheckCircle2 className="h-8 w-8" />
          )}
        </div>

        {/* Student Session Header */}
        <div className="w-full space-y-1 text-center">
          {studentLabel && step !== 'student' ? (
            <div className="space-y-1.5 pb-1">
              <p className="px-2 text-3xl font-black tracking-tight text-foreground sm:text-4xl leading-none">
                {studentLabel}
              </p>
              <LibraryStudentBehaviorBadge standing={standing} />
            </div>
          ) : null}

          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {step === 'student'
              ? mode === 'return'
                ? 'Drop Box Mode'
                : 'Step 1 of 2'
              : step === 'book'
                ? 'Step 2 of 2'
                : 'Complete'}
          </p>

          <h2 className="text-xl font-black text-foreground sm:text-2xl">
            {step === 'student'
              ? mode === 'return'
                ? 'Scan book barcode to return'
                : 'Scan your student ID card'
              : step === 'book'
                ? mode === 'checkout'
                  ? 'Scan book barcode to borrow'
                  : mode === 'return'
                    ? 'Scan book barcode to return'
                    : 'Scan book to borrow or return'
                : lastAction === 'return'
                  ? 'Book returned successfully!'
                  : 'Book checked out!'}
          </h2>

          {step === 'book' && mode === 'auto' && (
            <p className="text-xs font-medium text-muted-foreground flex items-center justify-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span>Smart auto-detect: borrowed books return; available books are borrowed</span>
            </p>
          )}

          {lastBookTitle && step === 'success' ? (
            <div className="space-y-0.5 pt-1">
              <p className="text-base font-bold text-primary sm:text-lg">{lastBookTitle}</p>
              {lastReturnBorrower ? (
                <p className="text-xs text-muted-foreground">
                  Returned for <span className="font-semibold text-foreground">{lastReturnBorrower}</span>
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 'success' && lastAction === 'return' && lastReturnFeedback && (
            <div
              className={cn(
                'mt-2.5 w-full rounded-2xl border-2 p-3.5 text-center space-y-1.5 shadow-sm transition-all animate-in fade-in zoom-in-95 duration-200',
                lastReturnFeedback.tone === 'warning'
                  ? 'border-amber-400/80 bg-amber-50 text-amber-950 dark:border-amber-700/80 dark:bg-amber-950/40 dark:text-amber-200'
                  : 'border-emerald-400/80 bg-emerald-50 text-emerald-950 dark:border-emerald-700/80 dark:bg-emerald-950/40 dark:text-emerald-200',
              )}
            >
              <div className="flex items-center justify-center gap-2">
                {lastReturnFeedback.tone === 'warning' ? (
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="font-bold text-sm sm:text-base">{lastReturnFeedback.title}</span>
                <span
                  className={cn(
                    'text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full border',
                    lastReturnFeedback.tone === 'warning'
                      ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300 dark:border-amber-700'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300 dark:border-emerald-700',
                  )}
                >
                  {lastReturnFeedback.badgeText}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-medium">
                &ldquo;{lastReturnFeedback.message}&rdquo;
              </p>
            </div>
          )}

          {step === 'success' && lastAction === 'return' && lastReturnPlacement && (
            <div
              className="w-full rounded-2xl border-2 p-3.5 text-center space-y-1 shadow-sm animate-in fade-in duration-200"
              style={{
                borderColor: `${lastReturnPlacement.color}60`,
                backgroundColor: `${lastReturnPlacement.color}15`,
              }}
            >
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base font-bold">
                <MapPin className="h-4 w-4 shrink-0" style={{ color: lastReturnPlacement.color }} />
                <span className="text-foreground">Please return book to:</span>
                <span className="font-black underline" style={{ color: lastReturnPlacement.color }}>
                  {lastReturnPlacement.shelf}
                </span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{
                    borderColor: `${lastReturnPlacement.color}60`,
                    backgroundColor: `${lastReturnPlacement.color}25`,
                    color: lastReturnPlacement.color,
                  }}
                >
                  {lastReturnPlacement.genre.callPrefix} · {lastReturnPlacement.genre.label}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Student Overdue & Due Soon Alerts (Notification Banner) */}
        {studentId && step !== 'student' && overdueLoans.length > 0 && (
          <div
            role="alert"
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-rose-300 bg-rose-50 p-3.5 text-rose-950 shadow-sm dark:border-rose-900 dark:bg-rose-950/70 dark:text-rose-200"
          >
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" />
            <div className="min-w-0 flex-1 text-xs sm:text-sm font-medium">
              <strong className="font-bold">Overdue Alert:</strong> You have {overdueLoans.length}{' '}
              book{overdueLoans.length === 1 ? '' : 's'} past the return due date. Please return to
              clear your account!
            </div>
          </div>
        )}

        {studentId && step !== 'student' && overdueLoans.length === 0 && dueSoonLoans.length > 0 && (
          <div
            role="status"
            className="flex w-full items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-3 text-amber-950 shadow-sm dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
          >
            <Calendar className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0 flex-1 text-xs sm:text-sm">
              <strong className="font-bold">Friendly Reminder:</strong> {dueSoonLoans.length} book(s)
              due within 3 days. Return on time to earn bonus reward points!
            </div>
          </div>
        )}

        {/* Action Toggle During Student Session */}
        {studentId && step === 'book' && (
          <div
            className="flex w-full max-w-xs gap-1.5 rounded-xl bg-muted/60 p-1"
            role="group"
            aria-label="Choose library action"
          >
            <Button
              type="button"
              disabled={busy}
              variant={mode === 'auto' ? 'default' : 'ghost'}
              className="flex-1 rounded-lg font-bold text-xs sm:text-sm h-9 gap-1"
              aria-pressed={mode === 'auto'}
              onClick={() => {
                setMode('auto');
                playSound('click');
              }}
            >
              <Sparkles className="h-3 w-3 text-amber-500" />
              Auto
            </Button>
            <Button
              type="button"
              disabled={busy}
              variant={mode === 'checkout' ? 'default' : 'ghost'}
              className="flex-1 rounded-lg font-bold text-xs sm:text-sm h-9"
              aria-pressed={mode === 'checkout'}
              onClick={() => {
                setMode('checkout');
                playSound('click');
              }}
            >
              Borrow
            </Button>
            <Button
              type="button"
              disabled={busy}
              variant={mode === 'return' ? 'default' : 'ghost'}
              className="flex-1 rounded-lg font-bold text-xs sm:text-sm h-9"
              aria-pressed={mode === 'return'}
              onClick={() => {
                setMode('return');
                playSound('click');
              }}
            >
              Return
            </Button>
          </div>
        )}

        {/* Camera Scanner Viewfinder (Enabled via Library Settings) */}
        {cameraSettingEnabled && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <Camera className="h-3.5 w-3.5 text-primary" />
                <span>Camera Scanner</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-semibold"
                onClick={() => setCameraActive((v) => !v)}
              >
                {cameraActive ? 'Hide Camera' : 'Show Camera'}
              </Button>
            </div>
            {cameraActive && (
              <div className="overflow-hidden rounded-2xl border-2 border-primary/20 bg-muted/30 p-2 shadow-inner">
                <BarcodeScannerCameraView
                  videoRef={videoRef}
                  hasCameraPermission={hasCameraPermission}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  viewportClassName="aspect-video max-h-48 sm:max-h-56 rounded-xl overflow-hidden shadow-inner"
                  hintText={
                    step === 'student'
                      ? 'Align student card barcode in frame'
                      : 'Align book ISBN or LIB barcode in frame'
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Scanner Barcode Input Field */}
        <div className="w-full space-y-2">
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-muted-foreground">
            <ScanBarcode className="h-4 w-4 text-primary" />
            <span>Barcode Reader Ready</span>
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

        {scanError && (
          <p
            role="alert"
            className="w-full rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm font-semibold text-destructive"
          >
            {scanError}
          </p>
        )}

        {/* Student Loans Summary Card */}
        {studentId && step !== 'student' ? (
          <LibraryStudentLoansSummary
            items={studentLoans}
            maxCheckouts={libraryPolicy.maxCheckoutsPerStudent}
            libraryPolicy={libraryPolicy}
            compact
            libraryLocationId={activeLibrary.id}
            libraryNames={libraryNames}
          />
        ) : null}

        {/* Recommended Books For Student */}
        {studentId && step !== 'student' && recommendations.length > 0 && (
          <LibraryRecommendationsCard recommendations={recommendations} className="mt-1" />
        )}

        {/* Idle Countdown Status */}
        {studentId && idleRemaining <= 15 && (
          <p role="status" className="text-center text-xs font-semibold text-muted-foreground">
            Session resetting in {idleRemaining}s. Tap or scan to keep going.
          </p>
        )}

        {busy ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : null}

        {/* Finish & Flow Buttons */}
        {step === 'success' ? (
          <div className="flex w-full flex-col gap-2 pt-2">
            <Button
              type="button"
              size="lg"
              className="w-full rounded-xl font-bold"
              disabled={busy}
              onClick={() => setStep('book')}
            >
              {mode === 'checkout' ? 'Scan another book to borrow' : 'Scan another book to return'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full rounded-xl font-bold"
              disabled={busy}
              onClick={resetForNextStudent}
            >
              Done · Next Student
            </Button>
          </div>
        ) : step === 'book' ? (
          <Button
            type="button"
            variant="ghost"
            className="rounded-xl text-xs font-bold text-muted-foreground hover:text-foreground"
            disabled={busy}
            onClick={resetForNextStudent}
          >
            Finished? Return to start
          </Button>
        ) : null}
      </main>

      <LibraryStaffExitDialog
        open={exitOpen}
        onOpenChange={setExitOpen}
        onUnlocked={(role) => {
          if (onExit) {
            onExit();
            return;
          }
          router.push(`/${schoolId}/${role === 'admin' ? 'admin' : 'library'}`);
        }}
      />
    </div>
  );
}
