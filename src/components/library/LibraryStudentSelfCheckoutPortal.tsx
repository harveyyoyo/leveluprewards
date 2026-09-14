'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BookOpen,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Compass,
  CornerDownLeft,
  Loader2,
  Lock,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  ScanBarcode,
  Sparkles,
  Star,
  User,
  X,
} from 'lucide-react';
import { resolveBookClassification, type LibraryGenreConfig } from '@/lib/library/libraryClassification';
import { collection, query, where, limit } from 'firebase/firestore';
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
  callLibrary,
} from '@/lib/library/libraryOperations';
import { filterItemsForLibrary } from '@/lib/library/libraryLocations';
import { LibraryStationPicker } from './LibraryStationPicker';
import { computeDaysOverdue, getLibraryPolicyFromSettings, resolveStudentMaxCheckouts } from '@/lib/library/libraryPolicy';
import {
  playLibraryReturnAudio,
  resolveLibraryReturnFeedback,
  type LibraryReturnFeedback,
} from '@/lib/library/libraryAudio';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { isSchoolLibraryBarcode } from '@/lib/library/libraryScanCode';
import { createScanDeduper } from '@/lib/library/libraryIntakeHelpers';
import { resolveLibraryTheme } from '@/lib/library/libraryThemes';
import { getLibraryBookRecommendations } from '@/lib/library/libraryRecommendations';
import { shouldAskStudentToRateReturnedBook } from '@/lib/library/libraryStudentRating';
import { computeStudentLibraryStanding } from '@/lib/library/libraryBehavior';
import type { Category, LibraryBookReview, LibraryItem, Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { LibraryBackdrop } from './LibraryBackdrop';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryBookCover } from './LibraryBookCover';
import { LibraryStaffExitDialog } from './LibraryStaffExitDialog';
import { LibraryStudentLoansSummary } from './LibraryStudentLoansSummary';
import { LibraryStudentBehaviorBadge } from './LibraryStudentBehaviorBadge';
import { LibraryBookDiscoveryModal } from './LibraryBookDiscoveryModal';
import { LibraryBookReviewDialog } from './LibraryBookReviewDialog';
import { AnimatedScannerLogo } from './AnimatedScannerLogo';
import { LibraryStudentNamedLabel } from './LibraryStudentNamedLabel';

type PortalStep = 'student' | 'book' | 'success';

function studentNameMatches(list: Student[] | null | undefined, term: string): Student[] {
  const q = term.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return (list ?? [])
    .filter((s) => {
      const first = (s.firstName ?? '').toLowerCase();
      const last = (s.lastName ?? '').toLowerCase();
      const nick = (s.nickname ?? '').toLowerCase();
      const full = `${first} ${last} ${nick}`;
      return terms.every((t) => first.includes(t) || last.includes(t) || nick.includes(t) || full.includes(t));
    })
    .slice(0, 6);
}

function looksLikeTypedStudentName(code: string): boolean {
  const t = code.trim();
  if (!/[a-zA-Z]/.test(t)) return false;
  if (isSchoolLibraryBarcode(t)) return false;
  if (/^\d{8,}$/.test(t.replace(/[\s-]/g, ''))) return false;
  return true;
}

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
  students: studentsProp,
  embedded = false,
  exitOpen: exitOpenProp,
  onExitOpenChange,
  onExit,
  initialStudentId,
  onInitialStudentConsumed,
  initialMode,
  libraryLocationId: libraryLocationIdProp,
  libraryLocations: libraryLocationsProp,
}: {
  schoolId: string;
  categories?: Category[] | null;
  getStudentName: (id?: string) => string;
  students?: Student[] | null;
  /** When true, renders inside a modal overlay instead of a full-page route. */
  embedded?: boolean;
  exitOpen?: boolean;
  onExitOpenChange?: (open: boolean) => void;
  /** Called after staff passcode unlock (embedded mode closes the overlay). */
  onExit?: () => void;
  /** A student already chosen before this kiosk opened (e.g. "Open Kiosk for {name}" from the
   * Library Desk) — logs them straight in instead of showing the student-picker step. */
  initialStudentId?: string | null;
  /** Called once the initial student has been applied, so the caller can clear its own state. */
  onInitialStudentConsumed?: () => void;
  /** Open already locked to Drop Box (return only) or another kiosk mode. */
  initialMode?: 'auto' | 'checkout' | 'return';
  /** When the parent already chose a library (staff workspace), use that station. */
  libraryLocationId?: string | null;
  libraryLocations?: { id: string; name: string }[];
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
  const [lastBookItem, setLastBookItem] = useState<LibraryItem | null>(null);
  // A quick, non-final confirmation shown right under the scan box — a held-for-borrow book
  // waiting on the student's ID, or a book just dropped in the box — distinct from the full
  // "success" screen below (which only applies once a checkout/return has actually completed).
  const [bookFlash, setBookFlash] = useState<{ item: LibraryItem; headline: string; subline: string } | null>(null);
  const [damageReported, setDamageReported] = useState(false);
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  /** "Help me choose a book" while no student is signed in: ask whether to scan a card for
   * personalized picks, or just show general picks without signing in. */
  const [discoveryChoiceOpen, setDiscoveryChoiceOpen] = useState(false);
  const [awaitingDiscoveryScan, setAwaitingDiscoveryScan] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewStudentId, setReviewStudentId] = useState<string | null>(null);
  const [reviewedThisReturn, setReviewedThisReturn] = useState(false);
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
  /** Next drop-box barcode, if they scan while the last return is still saving. */
  const dropBoxQueueRef = useRef<string | null>(null);
  const defaultMode = initialMode ?? settings.libraryKioskDefaultMode ?? 'auto';
  const [mode, setMode] = useState<'auto' | 'checkout' | 'return'>(defaultMode);

  useEffect(() => {
    if (initialMode) setMode(initialMode);
  }, [initialMode]);
  const [scanError, setScanError] = useState<string | null>(null);
  // Scan problems stay visible inline (a kiosk isn't always watched closely) but should also pop
  // up as a toast like every other kiosk error, instead of only some of them doing that.
  const reportScanError = useCallback(
    (message: string) => {
      setScanError(message);
      toast({ variant: 'destructive', title: 'Scan problem', description: message });
    },
    [toast],
  );
  const [exitOpenInternal, setExitOpenInternal] = useState(false);
  const exitOpen = exitOpenProp ?? exitOpenInternal;
  const setExitOpen = onExitOpenChange ?? setExitOpenInternal;
  const [sessionReady, setSessionReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const kioskRootRef = useRef<HTMLDivElement>(null);
  /** A book scanned before the student card, in Borrow/Auto mode — held until a student is identified. */
  const [pendingBookCode, setPendingBookCode] = useState<string | null>(null);

  // Load catalog items for recommendation engine and discovery
  const catalogQuery = useMemoFirebase(
    () => (firestore && schoolId ? query(collection(firestore, 'schools', schoolId, 'library'), limit(500)) : null),
    [firestore, schoolId],
  );
  const { data: catalogItems } = useCollection<LibraryItem>(catalogQuery);

  const studentsQuery = useMemoFirebase(
    () => (firestore && schoolId && !studentsProp ? collection(firestore, 'schools', schoolId, 'students') : null),
    [firestore, schoolId, studentsProp],
  );
  const { data: queriedStudents } = useCollection<Student>(studentsQuery);
  const students = studentsProp ?? queriedStudents;
  const studentReviewsQuery = useMemoFirebase(
    () =>
      firestore && schoolId && studentId
        ? query(
            collection(firestore, 'schools', schoolId, 'libraryReviews'),
            where('studentId', '==', studentId),
            limit(40),
          )
        : null,
    [firestore, schoolId, studentId],
  );
  const { data: studentReviews } = useCollection<LibraryBookReview>(studentReviewsQuery, {
    reportPermissionErrors: false,
  });
  const { locations: loadedLocations } = useLibraryLocations(schoolId);
  const parentChoseLibrary = Boolean(libraryLocationIdProp);
  const { active: activeLibrary, setActive: setActiveLibrary, needsChoice } = useActiveLibraryLocation(
    schoolId,
    loadedLocations,
    { requireExplicitChoice: !parentChoseLibrary },
  );
  const resolvedLibraryId = libraryLocationIdProp || activeLibrary.id;
  const libraryNames = useMemo(
    () => Object.fromEntries((libraryLocationsProp ?? loadedLocations).map((location) => [location.id, location.name])),
    [libraryLocationsProp, loadedLocations],
  );
  const scopedCatalog = useMemo(
    () => filterItemsForLibrary(catalogItems, resolvedLibraryId),
    [catalogItems, resolvedLibraryId],
  );

  const libraryPolicy = useMemo(
    () => getLibraryPolicyFromSettings(settings, categories),
    [settings, categories],
  );
  const libraryTheme = useMemo(
    () => resolveLibraryTheme(settings.libraryTheme, settings.libraryBoxOpacity),
    [settings.libraryTheme, settings.libraryBoxOpacity],
  );
  const matchKioskTheme = settings.libraryThemeMatchKiosk !== false;
  const dropBoxOn = settings.libraryKioskAllowDropBoxReturn !== false;
  const isDropBoxMode = mode === 'return';
  const shouldAcceptScan = useMemo(() => createScanDeduper(1500), []);
  const studentLabel = studentId ? getStudentName(studentId) : null;
  const currentStudent = useMemo(
    () => (studentId ? students?.find((s) => s.id === studentId) : null),
    [students, studentId],
  );
  const effectiveMaxCheckouts = useMemo(
    () => resolveStudentMaxCheckouts(currentStudent, libraryPolicy.maxCheckoutsPerStudent),
    [currentStudent, libraryPolicy.maxCheckoutsPerStudent],
  );

  const studentReviewsForPicks = useMemo(
    () =>
      (studentReviews ?? []).map((review) => ({
        itemId: review.itemId,
        rating: review.rating,
        bookTitle: review.bookTitle,
        didNotRead: review.didNotRead,
        reviewText: review.reviewText,
      })),
    [studentReviews],
  );
  const readItems = useMemo(
    () =>
      studentId
        ? (scopedCatalog ?? []).filter(
            (item) => item.lastCheckedOutTo === studentId || item.checkedOutTo === studentId,
          )
        : [],
    [scopedCatalog, studentId],
  );
  const hasPersonalHistory = studentReviewsForPicks.length > 0 || readItems.length > 0;
  const studentFirstName = currentStudent?.firstName?.trim() || '';
  const alreadyRatedItemIds = useMemo(
    () => studentReviewsForPicks.map((review) => review.itemId).filter(Boolean),
    [studentReviewsForPicks],
  );

  const openStudentReturnRating = useCallback(
    (who: string | null | undefined, itemId: string | null | undefined) => {
      if (
        !shouldAskStudentToRateReturnedBook({
          actor: 'student',
          studentId: who,
          itemId,
          alreadyRatedItemIds,
          enabled: settings.libraryStudentRatingsEnabled !== false,
        })
      ) {
        return;
      }
      setReviewStudentId(who!.trim());
      setReviewedThisReturn(false);
      setReviewOpen(true);
    },
    [alreadyRatedItemIds, settings.libraryStudentRatingsEnabled],
  );

  const recommendations = useMemo(() => {
    return getLibraryBookRecommendations(scopedCatalog, {
      studentLoans,
      currentStudentId: studentId || undefined,
      reviews: studentReviewsForPicks,
      readItems,
      limit: 6,
    });
  }, [scopedCatalog, studentLoans, studentId, studentReviewsForPicks, readItems]);

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

  const enterFullscreen = useCallback(async () => {
    const el = kioskRootRef.current;
    if (!el || typeof document === 'undefined') return;
    if (document.fullscreenElement === el) return;
    try {
      await el.requestFullscreen();
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not go fullscreen',
        description: 'Your browser blocked fullscreen. Allow it for this site, or press F11.',
      });
    }
  }, [toast]);

  const leaveFullscreen = useCallback(async () => {
    if (typeof document === 'undefined' || !document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // Some browsers reject this if the user already left fullscreen.
    }
  }, []);

  useEffect(() => {
    const sync = () => {
      const el = kioskRootRef.current;
      setIsFullscreen(!!el && document.fullscreenElement === el);
    };
    document.addEventListener('fullscreenchange', sync);
    sync();
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    if (!isInitialized || !schoolId) return;
    if (loginState === 'student' || loginState === 'school' || STAFF_LIBRARY_SESSION_STATES.has(loginState)) {
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
  }, [isInitialized, login, loginState, schoolId, toast]);

  const resetForNextStudent = useCallback(() => {
    setStudentId(null);
    setStudentLoans([]);
    setLastBookTitle(null);
    setLastBookItem(null);
    setLastAction(null);
    setLastReturnBorrower(null);
    setLastReturnFeedback(null);
    setLastReturnPlacement(null);
    setBookFlash(null);
    setReviewOpen(false);
    setReviewStudentId(null);
    setReviewedThisReturn(false);
    setStep('student');
    setMode(settings.libraryKioskDefaultMode ?? 'auto');
    setScanError(null);
    setPendingBookCode(null);
  }, [settings.libraryKioskDefaultMode]);

  // 0 means "disabled (manual tap only)" — the Library → Settings station auto-reset option.
  const autoResetSeconds = settings.libraryKioskAutoResetSeconds ?? 8;
  const isModalActive = exitOpen || reviewOpen || discoveryOpen;
  const idleActive =
    autoResetSeconds > 0 &&
    !busy &&
    !isModalActive &&
    (!!studentId || step === 'success');

  const idleRemaining = useLibraryIdleReset(
    idleActive,
    resetForNextStudent,
    autoResetSeconds,
  );

  const exitToLibrary = useCallback(() => {
    void leaveFullscreen();
    if (onExit) {
      onExit();
      return;
    }
    router.push(`/${schoolId}/library`);
  }, [leaveFullscreen, onExit, router, schoolId]);

  const finishStaffExit = useCallback(() => {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      void leaveFullscreen();
      return;
    }
    exitToLibrary();
  }, [exitToLibrary, leaveFullscreen]);

  const handleBack = useCallback(() => {
    if (step !== 'student') {
      resetForNextStudent();
      return;
    }
    finishStaffExit();
  }, [step, resetForNextStudent, finishStaffExit]);

  const handleExit = useCallback(() => {
    if (settings.libraryKioskExitRequiresPasscode) {
      setExitOpen(true);
      return;
    }
    finishStaffExit();
  }, [finishStaffExit, setExitOpen, settings.libraryKioskExitRequiresPasscode]);

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
        const circulationAction =
          !libraryPolicy.kioskAllowSelfReturn
            ? 'checkout'
            : libraryPolicy.autoDetectCirculation
              ? mode
              : mode === 'auto'
                ? 'checkout'
                : mode;
        if (circulationAction === 'return' && !libraryPolicy.kioskAllowSelfReturn) {
          toast({
            variant: 'destructive',
            title: 'Self-return is turned off',
            description: 'Please give this book to a librarian.',
          });
          return;
        }
        const result = await performLibraryCheckoutOrReturn(firestore, schoolId, studentId, code, {
          policy: libraryPolicy,
          functions,
          action: circulationAction,
          libraryLocationId: resolvedLibraryId,
        });
        if (result.action === 'checkout') {
          playSound('success');
          setLastBookTitle(result.item.name);
          setLastBookItem(result.item);
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
          setDamageReported(false);

          if (settings.libraryKioskSoundEffects !== false) {
            playLibraryReturnAudio(feedback.soundId);
          } else {
            playSound('success');
          }

          setLastBookTitle(result.item.name);
          setLastBookItem(result.item);
          setLastAction('return');
          setStep('success');
          openStudentReturnRating(studentId, result.item.id);
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
            description: `You already have ${result.currentCount} of ${result.max} allowed books.`,
          });
        } else if (result.action === 'wrong_library') {
          playSound('error');
          toast({
            variant: 'destructive',
            title: 'Different library',
            description: libraryNames[result.libraryLocationId]
              ? `This book belongs to ${libraryNames[result.libraryLocationId]}.`
              : 'This book belongs to a different library.',
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
    [firestore, schoolId, studentId, libraryPolicy, functions, mode, playSound, toast, refreshStudentLoans, settings, studentLabel, resolvedLibraryId, libraryNames, openStudentReturnRating],
  );

  // A book scanned before the student card (Borrow/Auto mode) resolves as soon as the student is identified.
  useEffect(() => {
    if (!studentId || !pendingBookCode) return;
    const code = pendingBookCode;
    setPendingBookCode(null);
    void processBook(code);
  }, [studentId, pendingBookCode, processBook]);

  // Quick Return for Drop Box mode: beep and stay ready for the next book.
  const processDropBoxReturn = useCallback(
    async (bookItem: LibraryItem) => {
      if (!firestore || !schoolId) return;
      if (bookItem.status !== 'checked_out') {
        playSound('error');
        reportScanError('Already in the library. Scan the next book.');
        return;
      }
      try {
        await forceReturnLibraryItem(firestore, schoolId, bookItem, {
          policy: libraryPolicy,
          functions,
        });
        playSound('success');
        toast({ title: 'Book returned', description: `"${bookItem.name}" is back in the library. Thanks!` });
        setScanError(null);
        setLastBookTitle(null);
        setLastBookItem(null);
        setLastAction(null);
        setLastReturnFeedback(null);
        setLastReturnPlacement(null);
        setLastReturnBorrower(null);
        setBookFlash({
          item: bookItem,
          headline: 'Book returned!',
          subline: `"${bookItem.name}" is back in the library. Thanks!`,
        });
        setReviewOpen(false);
        setReviewStudentId(null);
        setStep('student');
      } catch (err) {
        playSound('error');
        reportScanError((err as Error).message || 'Could not return this book. Try the next one, or tell a librarian.');
      }
    },
    [firestore, schoolId, libraryPolicy, functions, playSound, toast, reportScanError],
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

  const selectStudent = useCallback(
    async (selectedStudentId: string) => {
      if (!firestore || !schoolId || !selectedStudentId) return;
      setBusy(true);
      try {
        setStudentId(selectedStudentId);
        setStep('book');
        setScanError(null);
        await refreshStudentLoans(selectedStudentId);
        if (settings.libraryKioskSoundEffects !== false) {
          playSound('success');
        }
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Error loading account',
          description: (err as Error).message || 'Could not load student account.',
        });
      } finally {
        setBusy(false);
      }
    },
    [firestore, schoolId, refreshStudentLoans, settings.libraryKioskSoundEffects, playSound, toast],
  );

  // Once a student who scanned their card to get personalized picks is actually signed in,
  // open the discovery modal for them (covers every sign-in path: typed name, scanned ID, etc.).
  useEffect(() => {
    if (awaitingDiscoveryScan && studentId) {
      setAwaitingDiscoveryScan(false);
      setDiscoveryOpen(true);
    }
  }, [awaitingDiscoveryScan, studentId]);

  // A student already chosen elsewhere (e.g. "Open Kiosk for {name}" on the Library Desk) —
  // log them straight in instead of showing the student-picker step. Mount-only: this component
  // remounts fresh each time the kiosk tab is reopened, so there's nothing to guard against re-firing.
  useEffect(() => {
    if (initialStudentId) {
      void selectStudent(initialStudentId);
      onInitialStudentConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScan = useCallback(
    (code: string) => {
      if (!firestore || !schoolId) return;
      if (scanLock.current) {
        if (mode === 'return') dropBoxQueueRef.current = code;
        return;
      }
      if (!shouldAcceptScan(code)) return;
      scanLock.current = true;
      if (mode !== 'return') setBusy(true);
      setScanError(null);
      setBookFlash(null);
      void (async () => {
        try {
          const found = await findLibraryItemByUpc(firestore, schoolId, code, {
            allowIsbn: libraryPolicy.allowIsbnCheckout,
            preferredStatus: mode === 'return' ? 'checked_out' : 'available',
            studentId: studentId || undefined,
          });

          if (step === 'student') {
            if (mode !== 'return' && looksLikeTypedStudentName(code)) {
              const matches = studentNameMatches(students, code);
              if (matches.length === 1) {
                await selectStudent(matches[0].id);
                return;
              }
              if (matches.length > 1) {
                const typed = code.trim().toLowerCase();
                const exact = matches.find((s) => {
                  const full = `${s.firstName ?? ''} ${s.lastName ?? ''}`.trim().toLowerCase();
                  const nick = `${s.nickname ?? ''} ${s.lastName ?? ''}`.trim().toLowerCase();
                  return full === typed || nick === typed;
                });
                if (exact) {
                  await selectStudent(exact.id);
                  return;
                }
                reportScanError('Tap your name in the list, or keep typing.');
                return;
              }
            }

            // 1. First check if this barcode is for an item currently checked out (on loan)
            const returnCandidate = await findLibraryItemByUpc(firestore, schoolId, code, {
              allowIsbn: libraryPolicy.allowIsbnCheckout,
              preferredStatus: 'checked_out',
            });

            if (returnCandidate && (returnCandidate.item.status === 'checked_out' || returnCandidate.item.activeLoanId)) {
              if (dropBoxOn || mode === 'return') {
                await processDropBoxReturn(returnCandidate.item);
                return;
              }
              toast({
                title: 'Scan your student ID first',
                description: 'Drop-box returns are turned off. Sign in, then return the book.',
              });
              return;
            }

            if (mode === 'return') {
              playSound('error');
              reportScanError(
                found
                  ? 'This book is already in the library. Scan the next book.'
                  : 'Book not found. Scan the next book.',
              );
              return;
            }

            // 2. Otherwise, check for an available book to borrow
            const borrowCandidate = await findLibraryItemByUpc(firestore, schoolId, code, {
              allowIsbn: libraryPolicy.allowIsbnCheckout,
              preferredStatus: 'available',
            });

            if (borrowCandidate) {
              // Auto/Borrow: hold the book and wait for the student card — either order works.
              setPendingBookCode(code);
              setMode('checkout');
              setBookFlash({
                item: borrowCandidate.item,
                headline: 'Ready to borrow!',
                subline: 'Now scan your student ID card to finish borrowing.',
              });
              playSound('success');
              toast({ title: 'Book ready to borrow', description: 'Now scan your student ID card to finish borrowing.' });
              return;
            }

            // A book-shaped barcode (ISBN) that matched nothing above is a book that isn't in
            // this school's catalog — not a student ID, even though it also didn't match one.
            if (isRetailIsbnBarcode(code)) {
              playSound('error');
              reportScanError('Book not in the catalog. Ask library staff for help.');
              return;
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
          reportScanError((e as Error).message || 'Could not save the scan. Please try again.');
          playSound('error');
        } finally {
          scanLock.current = false;
          setBusy(false);
          const queued = dropBoxQueueRef.current;
          dropBoxQueueRef.current = null;
          if (queued && mode === 'return') {
            handleScan(queued);
          }
        }
      })();
    },
    [step, mode, processBook, processStudent, processDropBoxReturn, selectStudent, students, dropBoxOn, shouldAcceptScan, firestore, schoolId, libraryPolicy.allowIsbnCheckout, playSound, toast, studentId, reportScanError],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, clearBuffer, focusReader } = useBarcodeReaderWedge({
    active: sessionReady && !exitOpen,
    onScan: handleScan,
    disabled: busy && !isDropBoxMode,
  });

  // One shared box handles both typing a name and scanning a barcode — live-match student names
  // as they're typed here, so there's no separate "type your name" field alongside the scanner.
  const nameMatches = useMemo(() => studentNameMatches(students, scanBuffer), [students, scanBuffer]);

  useEffect(() => {
    if (!libraryPolicy.autoDetectCirculation && mode === 'auto') {
      setMode('checkout');
    }
  }, [libraryPolicy.autoDetectCirculation, mode]);

  const cameraSettingEnabled = Boolean(settings.libraryCameraScanEnabled);
  const [cameraActive, setCameraActive] = useState(false);

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

  if (!sessionReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!parentChoseLibrary && needsChoice) {
    return <LibraryStationPicker locations={loadedLocations} onPick={setActiveLibrary} />;
  }

  return (
    <div
      ref={kioskRootRef}
      className={cn(
        embedded
          ? 'relative flex w-full flex-1 flex-col overflow-hidden transition-colors rounded-3xl min-h-[min(460px,calc(100dvh-7rem))] md:min-h-[460px]'
          : 'relative flex h-[100dvh] min-h-[100dvh] w-full flex-1 flex-col overflow-hidden transition-colors',
        matchKioskTheme && libraryTheme.tone === 'dark' ? 'dark' : '',
        'border shadow-lg',
        matchKioskTheme ? libraryTheme.classes.card : 'border-border/70 bg-card',
        embedded && !isFullscreen && (step === 'student' ? 'mx-auto max-w-2xl' : 'mx-auto max-w-6xl'),
        isFullscreen && 'min-h-[100dvh] rounded-none',
      )}
    >
      {(!embedded || isFullscreen) && <LibraryBackdrop theme={libraryTheme} />}
      <header
        className={cn(
          'sticky top-0 z-40 flex shrink-0 items-center justify-between gap-1.5 sm:gap-2 border-b border-border/80 bg-background/90 px-2 sm:px-3 py-2 sm:py-2.5 shadow-sm backdrop-blur-md supports-[padding:max(0px)]:pt-[max(0.5rem,env(safe-area-inset-top))]',
          matchKioskTheme ? libraryTheme.classes.header : '',
        )}
      >
        <div className="flex items-center gap-2">
          {(step !== 'student' || (!embedded && onExit)) && (
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
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-xl text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (isFullscreen) handleExit();
              else void enterFullscreen();
            }}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen Kiosk'}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen kiosk'}
          >
            {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </Button>
        </div>

        <div className="min-w-0 flex-1 text-center">
          <p className="flex items-center justify-center gap-1.5 truncate text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            <span className="truncate">{schoolName || 'Library Station'}</span>
            {matchKioskTheme && (
              <span className="hidden sm:inline shrink-0 font-normal opacity-75">
                · {libraryTheme.icon} {libraryTheme.label}
              </span>
            )}
          </p>
          <h1 className="truncate text-sm font-black tracking-tight sm:text-lg">
            {step === 'student' && mode === 'return'
              ? 'Quick Book Return'
              : 'Student Borrow & Return'}
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {embedded && !isFullscreen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 sm:h-11 shrink-0 gap-1.5 rounded-xl border-2 font-bold bg-background shadow-sm hover:bg-muted"
              onClick={() => void enterFullscreen()}
            >
              <Maximize2 className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Launch Fullscreen Kiosk</span>
            </Button>
          )}
          {isFullscreen ? (
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
          ) : null}
        </div>
      </header>

      <main
        className={cn(
          'relative z-10 mx-auto flex min-h-0 w-full flex-1 flex-col items-center justify-start gap-3 sm:gap-4 overflow-y-auto p-3 sm:p-6 md:p-8',
          step === 'student' ? 'max-w-3xl' : 'max-w-6xl',
        )}
      >

        {/* Student Session Header */}
        <div className="w-full space-y-1 text-center">
          {studentLabel && step !== 'student' ? (
            <div className="relative mx-auto max-w-md animate-in fade-in zoom-in-95 slide-in-from-bottom-3 duration-500">
              {/* Catalog-card stack illusion: two faint cards fanned out behind the real one */}
              <div
                aria-hidden
                className={cn(
                  'absolute inset-0 rotate-3 translate-x-2 rounded-[22px] border-2 opacity-40',
                  matchKioskTheme ? libraryTheme.classes.card : 'border-border/70 bg-card',
                )}
              />
              <div
                aria-hidden
                className={cn(
                  'absolute inset-0 -rotate-2 -translate-x-1 rounded-[22px] border-2 opacity-70',
                  matchKioskTheme ? libraryTheme.classes.card : 'border-border/70 bg-card',
                )}
              />
              <div
                className={cn(
                  'relative rounded-[22px] border-2 p-1.5 shadow-lg',
                  matchKioskTheme ? libraryTheme.classes.card : 'border-border/70 bg-card',
                )}
              >
                <div className="rounded-[16px] px-6 py-5">
                  <div className="flex items-center justify-between border-b-2 border-dashed border-current/15 pb-2.5 mb-3">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] opacity-60">
                      <BookOpen className="h-3.5 w-3.5" />
                      Library Card
                    </span>
                    <LibraryStudentBehaviorBadge standing={standing} />
                  </div>
                  <p className="text-2xl font-black tracking-tight sm:text-4xl leading-none">
                    {currentStudent ? (
                      <LibraryStudentNamedLabel
                        student={currentStudent}
                        nameClassName="text-2xl font-black tracking-tight sm:text-4xl leading-none"
                      />
                    ) : (
                      studentLabel
                    )}
                  </p>
                  {autoResetSeconds > 0 && (
                    <div
                      className={cn(
                        'mt-3 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold shadow-xs transition-colors',
                        idleRemaining <= 5
                          ? 'border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200 animate-pulse'
                          : 'border-border/60 bg-muted/50 text-muted-foreground',
                      )}
                      role="timer"
                      aria-live="polite"
                    >
                      <RotateCcw
                        className={cn(
                          'h-3 w-3 text-primary',
                          idleRemaining <= 5 && 'text-amber-600 animate-spin',
                        )}
                      />
                      <span>
                        Auto-reset in <strong className="font-mono font-bold text-foreground">{idleRemaining}s</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <h2 className="whitespace-nowrap text-center text-[clamp(0.95rem,2.3vw,1.35rem)] font-black leading-none text-foreground">
            {step === 'student'
              ? mode === 'return'
                ? 'Scan a book to return.'
                : mode === 'checkout'
                  ? 'Scan or type your name to borrow.'
                  : 'Scan a book to return, or scan/type your name to borrow.'
              : step === 'book'
                ? mode === 'checkout'
                  ? 'Scan a book to borrow.'
                  : mode === 'return'
                    ? 'Scan a book to return.'
                    : 'Scan a book to borrow or return.'
                : lastAction === 'return'
                  ? 'Book returned.'
                  : 'Book checked out.'}
          </h2>

          <div className="flex flex-col items-center gap-1 pt-1">
            {!isDropBoxMode ? (
              <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-11 gap-1.5 rounded-xl border-2 px-5 font-bold bg-background shadow-sm hover:bg-muted"
              onClick={() => (studentId ? setDiscoveryOpen(true) : setDiscoveryChoiceOpen(true))}
            >
              <Compass className="h-4 w-4 text-primary" />
              {studentId
                ? studentFirstName
                  ? `Picks for ${studentFirstName}`
                  : 'Picks for you'
                : 'Help me choose a book'}
            </Button>
            {studentId ? (
              <p className="max-w-sm text-center text-[11px] font-semibold text-muted-foreground">
                {hasPersonalHistory
                  ? 'Based on what you read and how you rated them'
                  : 'Rate the books you finish and these picks get better'}
              </p>
            ) : null}
              </>
            ) : null}
          </div>

          {lastBookTitle && step === 'success' ? (
            <div className="flex flex-col items-center justify-center gap-3 pt-2 animate-in zoom-in-90 fade-in duration-300">
              <LibraryBookCover
                coverUrl={lastBookItem?.coverUrl}
                isbn={lastBookItem?.isbn}
                title={lastBookTitle || lastBookItem?.name}
                author={lastBookItem?.author}
                aspect="portrait"
                className="h-36 w-24 sm:h-44 sm:w-28 shrink-0 rounded-2xl shadow-xl border-2 border-white/60 ring-1 ring-black/5"
              />
              <div className="text-center space-y-0.5">
                <p className="text-lg font-black text-primary sm:text-xl leading-tight">{lastBookTitle}</p>
                {lastBookItem?.author && (
                  <p className="text-xs text-muted-foreground">{lastBookItem.author}</p>
                )}
                {lastReturnBorrower ? (
                  <p className="text-xs text-muted-foreground">
                    Returned for <span className="font-semibold text-foreground">{lastReturnBorrower}</span>
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {bookFlash ? (
            <div className="flex flex-col items-center justify-center gap-3 pt-2 animate-in zoom-in-90 fade-in duration-300">
              <LibraryBookCover
                coverUrl={bookFlash.item.coverUrl}
                isbn={bookFlash.item.isbn}
                title={bookFlash.item.name}
                author={bookFlash.item.author}
                aspect="portrait"
                className="h-36 w-24 sm:h-44 sm:w-28 shrink-0 rounded-2xl shadow-xl border-2 border-white/60 ring-1 ring-black/5"
              />
              <div className="text-center space-y-0.5">
                <p className="text-xl font-black text-primary sm:text-2xl leading-tight">{bookFlash.headline}</p>
                <p className="text-sm font-bold text-foreground">{bookFlash.item.name}</p>
                {bookFlash.item.author && (
                  <p className="text-xs text-muted-foreground">{bookFlash.item.author}</p>
                )}
                <p className="text-xs text-muted-foreground">{bookFlash.subline}</p>
              </div>
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

          {step === 'success' && lastAction === 'return' && (
            <div className="pt-1 flex flex-wrap justify-center gap-2">
              {!reviewedThisReturn && reviewStudentId && settings.libraryStudentRatingsEnabled !== false ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewOpen(true)}
                  className="gap-1.5 rounded-xl border-amber-400/80 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-200 text-xs font-bold shadow-sm"
                >
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  Rate this book
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={damageReported}
                onClick={async () => {
                  if (!lastBookItem?.id || !schoolId) return;
                  try {
                    await callLibrary(functions, 'libraryCirculation', {
                      schoolId,
                      itemId: lastBookItem.id,
                      studentId: studentId ?? undefined,
                      action: 'report_damage',
                    });
                    setDamageReported(true);
                    playSound('click');
                    toast({
                      title: 'Thanks for letting us know',
                      description: 'A librarian will take a look at this book.',
                    });
                  } catch (e) {
                    toast({
                      variant: 'destructive',
                      title: 'Could not report damage',
                      description: (e as Error).message || 'Please tell a librarian directly.',
                    });
                  }
                }}
                className="gap-1.5 rounded-xl border-rose-400/80 bg-rose-50/70 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 text-xs font-bold shadow-sm disabled:opacity-70"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {damageReported ? 'Reported — thanks!' : 'This book is damaged'}
              </Button>
            </div>
          )}

          {/* Success Auto-Reset Countdown Banner */}
          {step === 'success' && autoResetSeconds > 0 && !reviewOpen && (
            <div className="w-full max-w-md mx-auto rounded-2xl border-2 border-primary/25 bg-card/90 p-3.5 text-center space-y-2 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-primary">
                  <RotateCcw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>Auto-Reset Countdown</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-black text-primary border border-primary/20">
                  {idleRemaining}s remaining
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-linear rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, (idleRemaining / (autoResetSeconds || 8)) * 100))}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">
                Returning to start screen in <strong className="text-foreground">{idleRemaining} second{idleRemaining === 1 ? '' : 's'}</strong> for next student.
              </p>
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
            className="flex w-full max-w-md gap-2 rounded-2xl bg-muted/60 p-1.5"
            role="group"
            aria-label="Choose library action"
          >
            <Button
              type="button"
              disabled={busy}
              variant={mode === 'auto' ? 'default' : 'ghost'}
              className="flex-1 rounded-xl font-black text-sm sm:text-base h-12 sm:h-14 gap-1.5"
              aria-pressed={mode === 'auto'}
              onClick={() => {
                setMode('auto');
                playSound('click');
              }}
            >
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
              Auto
            </Button>
            <Button
              type="button"
              disabled={busy}
              variant={mode === 'checkout' ? 'default' : 'ghost'}
              className="flex-1 rounded-xl font-black text-sm sm:text-base h-12 sm:h-14"
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
              className="flex-1 rounded-xl font-black text-sm sm:text-base h-12 sm:h-14"
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
            <div className="flex items-center justify-end px-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 text-xs font-semibold"
                onClick={() => setCameraActive((v) => !v)}
              >
                {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                {cameraActive ? 'Hide camera' : 'Show camera'}
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
        <div className="w-full space-y-3">
          {(() => {
            const scanPrimary = matchKioskTheme ? libraryTheme.swatches.primary : '#4338ca';
            return (
              <div
                className="relative flex flex-wrap items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-4 text-center sm:px-4 sm:py-6 bg-background border-border/80 text-foreground"
                role="status"
                aria-live="polite"
                style={{ '--scanner-color': scanPrimary } as CSSProperties}
              >
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
                  <div className="scanner-beam" aria-hidden />
                  <div
                    className="absolute inset-x-0 top-0 h-6 rounded-t-[inherit] border-2 border-b-0"
                    style={{ borderColor: 'color-mix(in oklab, var(--scanner-color) 45%, transparent)' }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-6 rounded-b-[inherit] border-2 border-t-0"
                    style={{ borderColor: 'color-mix(in oklab, var(--scanner-color) 45%, transparent)' }}
                    aria-hidden
                  />
                </div>
                <div className="relative z-[1] flex w-full flex-col items-center justify-center gap-2.5">
                  <div className="relative w-full max-w-md">
                    <LibraryBarcodeReaderField
                      inputId="library-self-checkout-reader"
                      inputRef={inputRef}
                      scanBuffer={scanBuffer}
                      onScanBufferChange={setScanBuffer}
                      onSubmit={submitScan}
                      active={!busy || isDropBoxMode}
                      showIcon={false}
                      showEnterHint={false}
                      showSweep={false}
                      placeholder=""
                      className="[&_input]:bg-white/95 [&_input]:text-slate-900 [&_input]:dark:bg-slate-950/80 [&_input]:dark:text-slate-100 [&_input]:shadow-md"
                    />
                    {step === 'student' && mode !== 'return' && nameMatches.length > 0 && (
              <div
                role="listbox"
                className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border-2 border-primary/30 bg-popover/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              >
                <div className="border-b border-border/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                  <span>Matching Students ({nameMatches.length})</span>
                  <span className="text-[10px] lowercase font-normal opacity-70">tap to select</span>
                </div>
                <ul className="overflow-y-auto max-h-72 p-1.5 space-y-1">
                  {nameMatches.map((s) => {
                    const initials = ((s.firstName?.[0] || '') + (s.lastName?.[0] || '')).toUpperCase() || 'ST';
                    return (
                      <li key={s.id} role="option">
                        <button
                          type="button"
                          className="group flex w-full items-center gap-3 rounded-xl p-2.5 sm:p-3 text-left text-base transition-all hover:bg-accent/80 text-foreground"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            clearBuffer();
                            void selectStudent(s.id);
                          }}
                        >
                          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-black text-xs sm:text-sm tracking-wider text-primary shadow-inner">
                            {s.photoUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={s.photoUrl} alt="" className="h-full w-full object-cover rounded-xl" />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <LibraryStudentNamedLabel
                            student={s}
                            className="min-w-0"
                            nameClassName="font-black tracking-tight leading-tight text-foreground"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
          </div>
          </div>
          );
        })()}
        </div>

        {scanError && (
          <p
            role="alert"
            className="w-full rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-center text-sm font-semibold text-destructive"
          >
            {scanError}
          </p>
        )}

        {/* Student Loans Summary Card — shown below the scanner so scanning stays front and center */}
        {studentId && step !== 'student' ? (
          <LibraryStudentLoansSummary
            items={studentLoans}
            maxCheckouts={effectiveMaxCheckouts}
            libraryPolicy={libraryPolicy}
            libraryLocationId={resolvedLibraryId}
          />
        ) : null}

        {/* Step 1 Quick Mode Switcher (Non-intrusive) */}
        {step === 'student' && dropBoxOn && (
          <div className="pt-1 text-center">
            {mode === 'return' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl text-xs font-bold text-primary hover:bg-primary/10 gap-1.5 border-primary/30"
                onClick={() => {
                  setMode('auto');
                  playSound('click');
                }}
              >
                <User className="h-3.5 w-3.5" />
                <span>Switch to Student Sign-In / Borrow</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => {
                  setStudentId(null);
                  setStudentLoans([]);
                  setLastBookTitle(null);
                  setLastBookItem(null);
                  setLastAction(null);
                  setLastReturnBorrower(null);
                  setLastReturnFeedback(null);
                  setLastReturnPlacement(null);
                  setReviewOpen(false);
                  setPendingBookCode(null);
                  setScanError(null);
                  setStep('student');
                  setMode('return');
                  playSound('click');
                }}
              >
                <RotateCcw className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Return only? Lock to Drop Box Mode</span>
              </Button>
            )}
          </div>
        )}

        {/* Idle Countdown Alert Banner */}
        {studentId && step === 'book' && autoResetSeconds > 0 && idleRemaining <= 5 && (
          <div
            role="status"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50/95 py-2 px-3 text-center text-xs font-semibold text-amber-900 shadow-sm dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200 animate-bounce"
          >
            <RotateCcw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
            <span>
              Session resetting in <strong className="font-mono font-extrabold">{idleRemaining}s</strong>! Move the mouse, tap, or scan to keep going.
            </span>
          </div>
        )}

        {busy && !isDropBoxMode ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : null}

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
              Done · Next Student {autoResetSeconds > 0 ? `(${idleRemaining}s)` : ''}
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
        onUnlocked={() => {
          finishStaffExit();
        }}
      />

      <Dialog open={discoveryChoiceOpen} onOpenChange={setDiscoveryChoiceOpen}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center">Help you choose a book</DialogTitle>
            <DialogDescription className="text-center">
              Scan your library card for picks made just for you, or skip that and see general picks.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              className="h-11 gap-2 rounded-xl font-bold"
              onClick={() => {
                setDiscoveryChoiceOpen(false);
                setAwaitingDiscoveryScan(true);
                focusReader();
                toast({ title: 'Scan your card', description: "We'll show your picks as soon as you scan." });
              }}
            >
              <ScanBarcode className="h-4 w-4" />
              Scan my card for picks just for me
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 rounded-xl border-2 font-bold"
              onClick={() => {
                setDiscoveryChoiceOpen(false);
                setDiscoveryOpen(true);
              }}
            >
              <Compass className="h-4 w-4" />
              Just show me general picks
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <LibraryBookDiscoveryModal
        isOpen={discoveryOpen}
        setIsOpen={setDiscoveryOpen}
        catalogItems={scopedCatalog}
        studentFirstName={studentFirstName}
        recommendations={studentId ? recommendations : []}
        hasPersonalHistory={hasPersonalHistory}
      />

      <LibraryBookReviewDialog
        isOpen={reviewOpen}
        setIsOpen={setReviewOpen}
        schoolId={schoolId}
        studentId={reviewStudentId || studentId || ''}
        studentName={
          reviewStudentId && reviewStudentId !== studentId
            ? getStudentName(reviewStudentId)
            : studentLabel || undefined
        }
        itemId={lastBookItem?.id || ''}
        bookTitle={lastBookTitle || ''}
        coverUrl={lastBookItem?.coverUrl}
        onReviewed={() => setReviewedThisReturn(true)}
      />
    </div>
  );
}
