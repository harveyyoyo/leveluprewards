'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Barcode,
  Bookmark,
  BookOpen,
  Calendar,
  Camera,
  CameraOff,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Scan,
  ScanBarcode,
  Search,
  Sparkles,
  Undo2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useFirestore, useFunctions } from '@/firebase';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { lookupStudentId } from '@/lib/db/lookup';
import {
  performLibraryCheckoutOrReturn,
  findLibraryItemByUpc,
  getStudentLibraryCheckouts,
  forceReturnLibraryItem,
  callLibrary,
} from '@/lib/library/libraryOperations';
import { formatDueDate, computeDaysOverdue, getLibraryPolicyFromSettings } from '@/lib/library/libraryPolicy';
import {
  playLibraryReturnAudio,
  resolveLibraryReturnFeedback,
} from '@/lib/library/libraryAudio';
import { computeStudentLibraryStanding } from '@/lib/library/libraryBehavior';
import { isRetailIsbnBarcode } from '@/lib/library/libraryCatalogLookup';
import { isSchoolLibraryBarcode } from '@/lib/library/libraryScanCode';
import type { Category, LibraryItem, Student } from '@/lib/types';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';
import { LibraryStudentNamePicker } from './LibraryStudentNamePicker';
import { LibraryStudentBehaviorBadge } from './LibraryStudentBehaviorBadge';
import { LibraryBookCover } from './LibraryBookCover';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import { cn } from '@/lib/utils';

type RecentActivityItem = {
  id: string;
  action: 'checkout' | 'return';
  bookTitle: string;
  studentName?: string;
  timestamp: string;
  coverUrl?: string;
  shelf?: string;
  isOverdue?: boolean;
};

export function LibraryCheckoutDesk({
  getStudentName,
  categories,
  students,
  initialScanCode,
  onClearInitialScan,
  copiesCount,
  activeLoansCount,
  overdueLoansCount,
  catalogItems,
  onViewCatalog,
  libraryLocationId,
  libraryLocations,
}: {
  getStudentName: (id?: string) => string;
  categories?: Category[] | null;
  students?: Student[] | null;
  initialScanCode?: string | null;
  onClearInitialScan?: () => void;
  copiesCount?: number;
  activeLoansCount?: number;
  overdueLoansCount?: number;
  catalogItems?: LibraryItem[] | null;
  onViewCatalog?: () => void;
  libraryLocationId?: string | null;
  libraryLocations?: { id: string; name: string }[];
}) {
  const { schoolId } = useAppContext();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { settings } = useSettings();
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId);
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const [mode, setMode] = useState<'auto' | 'checkout' | 'return'>('auto');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentLoans, setStudentLoans] = useState<LibraryItem[]>([]);
  const [pendingBook, setPendingBook] = useState<{ item: LibraryItem; raw: string } | null>(null);
  const [message, setMessage] = useState('Ready for library desk. Scan a student badge or book.');
  const [error, setError] = useState(false);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const cameraEnabled = Boolean(settings.libraryCameraScanEnabled);
  const [cameraActive, setCameraActive] = useState(false);
  const [lastScannedItem, setLastScannedItem] = useState<LibraryItem | null>(null);
  const [lastAction, setLastAction] = useState<'checkout' | 'return' | null>(null);
  const [returnPlacement, setReturnPlacement] = useState<{
    title: string;
    shelf: string;
    callPrefix: string;
    genreLabel: string;
    color: string;
  } | null>(null);

  const policy = useMemo(() => getLibraryPolicyFromSettings(settings, categories), [settings, categories]);
  const student = useMemo(() => students?.find((s) => s.id === studentId), [students, studentId]);
  const describeWrongLibrary = useCallback((resultLibraryId: string) => {
    const otherName = libraryLocations?.find((location) => location.id === resultLibraryId)?.name;
    return otherName
      ? `This book belongs to ${otherName}. Switch to that library to check it out.`
      : 'This book belongs to a different library.';
  }, [libraryLocations]);

  useEffect(() => {
    if (!policy.autoDetectCirculation && mode === 'auto') {
      setMode('checkout');
    }
  }, [policy.autoDetectCirculation, mode]);

  const executeCheckout = useCallback(
    async (targetStudentId: string, bookRaw: string, bookItem?: LibraryItem) => {
      if (!firestore || !schoolId) return;
      const sName = getStudentName(targetStudentId);
      const result = await performLibraryCheckoutOrReturn(firestore, schoolId, targetStudentId, bookRaw, {
        policy,
        functions,
        action: 'checkout',
        libraryLocationId,
      });

      if (result.action === 'wrong_library') {
        throw new Error(describeWrongLibrary(result.libraryLocationId));
      }
      if (result.action === 'limit_reached') {
        throw new Error(`Loan limit reached: ${sName} already has ${result.currentCount} of ${result.max} books.`);
      }
      if (result.action === 'wrong_borrower') {
        throw new Error('This copy is on loan to another student. Please return it first.');
      }
      if (result.action === 'not_found') {
        throw new Error('Book barcode not recognized in catalog.');
      }
      if (result.action === 'already_done') {
        setMessage(`Already checked out: ${bookItem?.name || 'Book'}`);
        return;
      }
      if (result.action !== 'checkout') return;

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setReturnPlacement(null);
      setLastScannedItem(result.item);
      setLastAction('checkout');
      const text = `Checked out "${result.item.name}" to ${sName} · Due ${formatDueDate(result.dueAt)}`;
      setMessage(text);
      playSound('success');
      setRecentActivities((prev) => [
        {
          id: String(Date.now()),
          action: 'checkout' as const,
          bookTitle: result.item.name,
          studentName: sName,
          timestamp: timeStr,
          coverUrl: result.item.coverUrl,
        },
        ...prev,
      ].slice(0, 10));

      setStudentLoans(await getStudentLibraryCheckouts(firestore, schoolId, targetStudentId, { libraryLocationId }));
    },
    [describeWrongLibrary, firestore, functions, getStudentName, libraryLocationId, playSound, policy, schoolId],
  );

  const selectStudent = async (id: string) => {
    if (!firestore || !schoolId || locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      const loans = await getStudentLibraryCheckouts(firestore, schoolId, id, { libraryLocationId });
      setStudentId(id);
      setStudentLoans(loans);
      const sName = getStudentName(id);

      if (pendingBook) {
        const bookToLend = pendingBook;
        setPendingBook(null);
        await executeCheckout(id, bookToLend.raw, bookToLend.item);
      } else {
        setReturnPlacement(null);
        setLastScannedItem(null);
        setLastAction(null);
        setMessage(`${sName} active. Scan a book to borrow or return.`);
        setError(false);
        playSound('click');
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Action failed', description: (e as Error).message });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };

  const handleReturnAllForStudent = async () => {
    if (!firestore || !schoolId || !studentId || !studentLoans.length || busy) return;
    setBusy(true);
    try {
      const returnCount = studentLoans.length;
      const sName = getStudentName(studentId);
      for (const loanItem of studentLoans) {
        await forceReturnLibraryItem(firestore, schoolId, loanItem, {
          policy,
          functions,
        });
      }
      playSound('success');
      toast({
        title: 'All books returned',
        description: `Successfully returned ${returnCount} books for ${sName}.`,
      });
      setStudentLoans([]);
      setMessage(`All ${returnCount} books returned for ${sName}.`);
      setReturnPlacement(null);
      setLastScannedItem(null);
      setRecentActivities((prev) => [
        {
          id: String(Date.now()),
          action: 'return' as const,
          bookTitle: `Returned all ${returnCount} books`,
          studentName: sName,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        ...prev,
      ].slice(0, 10));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Batch return failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleReturnSingleItem = async (item: LibraryItem) => {
    if (!firestore || !schoolId || busy) return;
    setBusy(true);
    try {
      await forceReturnLibraryItem(firestore, schoolId, item, { policy, functions });
      playSound('success');
      toast({ title: 'Book returned', description: `"${item.name}" is now available in the library.` });
      if (studentId) {
        setStudentLoans((prev) => prev.filter((i) => i.id !== item.id));
      }
      const classification = resolveBookClassification(
        item.category,
        settings.libraryGenreDefinitions,
        item.shelfLocation,
      );
      setReturnPlacement({
        title: item.name,
        shelf: classification.shelfLocation,
        callPrefix: classification.genre.callPrefix,
        genreLabel: classification.genre.label,
        color: classification.color,
      });
      setLastScannedItem(item);
      setLastAction('return');
      setMessage(`Returned: ${item.name}`);
      setRecentActivities((prev) => [
        {
          id: String(Date.now()),
          action: 'return' as const,
          bookTitle: item.name,
          studentName: item.checkedOutTo ? getStudentName(item.checkedOutTo) : undefined,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          coverUrl: item.coverUrl,
          shelf: classification.shelfLocation,
        },
        ...prev,
      ].slice(0, 10));
    } catch (e) {
      toast({ variant: 'destructive', title: 'Return failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleRenewSingleItem = async (item: LibraryItem) => {
    if (!functions || !schoolId || busy) return;
    setBusy(true);
    try {
      await callLibrary(functions, 'libraryCirculation', {
        schoolId,
        action: 'renew',
        itemId: item.id,
        studentId: item.checkedOutTo ?? studentId,
      });
      playSound('success');
      toast({ title: 'Loan renewed', description: `Renewed "${item.name}" for ${policy.renewalDays} days.` });
      if (studentId && firestore) {
        setStudentLoans(await getStudentLibraryCheckouts(firestore, schoolId, studentId, { libraryLocationId }));
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Renewal failed', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const handleScan = useCallback(
    (raw: string) => {
      const cleanRaw = raw.trim();
      if (locked.current || !firestore || !schoolId || !cleanRaw) return;
      locked.current = true;
      setBusy(true);
      setError(false);
      void (async () => {
        try {
          // Parallel lookup: check both student badge and book catalog item
          const [foundItemRaw, studentFoundId] = await Promise.all([
            findLibraryItemByUpc(firestore, schoolId, cleanRaw, {
              allowIsbn: policy.allowIsbnCheckout,
              preferredStatus: mode === 'return' ? 'checked_out' : (mode === 'checkout' ? 'available' : undefined),
              studentId: studentId || undefined,
            }),
            (async () => {
              // 1. Fast local student match from props if available
              if (students?.length) {
                const local = students.find(
                  (s) => s.id === cleanRaw || String(s.nfcId ?? '').trim() === cleanRaw,
                );
                if (local) return local.id;
              }
              // 2. Fallback to lookupStudentId, catching permission errors gracefully
              try {
                return await lookupStudentId(firestore, schoolId, cleanRaw);
              } catch {
                return null;
              }
            })(),
          ]);

          // Fallback: If cleanRaw is not a recognized barcode, check if it matches a catalog book title manually entered
          let foundItem = foundItemRaw;
          if (!foundItem && !studentFoundId && catalogItems?.length) {
            const cleanLower = cleanRaw.toLowerCase().trim();
            const exactTitle = catalogItems.filter((it) => it.name.toLowerCase().trim() === cleanLower);
            if (exactTitle.length === 1) {
              foundItem = { item: exactTitle[0], itemId: exactTitle[0].id };
            }
          }

          // 1. STUDENT BADGE SCANNED
          if (studentFoundId && !foundItem) {
            setStudentId(studentFoundId);
            const loans = await getStudentLibraryCheckouts(firestore, schoolId, studentFoundId, { libraryLocationId });
            setStudentLoans(loans);
            const sName = getStudentName(studentFoundId);

            // If a book was already scanned first, check it out right away!
            if (pendingBook) {
              const bookToLend = pendingBook;
              setPendingBook(null);
              await executeCheckout(studentFoundId, bookToLend.raw, bookToLend.item);
            } else {
              setMessage(`${sName} loaded. Scan a book to borrow or return.`);
              playSound('success');
            }
            return;
          }

          // 2. BOOK SCANNED
          if (foundItem) {
            let effectiveAction: 'checkout' | 'return' =
              mode === 'auto' ? (foundItem.item.status === 'checked_out' ? 'return' : 'checkout') : mode;

            // Return action
            if (effectiveAction === 'return') {
              const target = foundItem.item.checkedOutTo || studentId;
              if (!target) {
                setMessage(`"${foundItem.item.name}" is already returned and available.`);
                playSound('success');
                return;
              }

              const result = await performLibraryCheckoutOrReturn(firestore, schoolId, target, cleanRaw, {
                policy,
                functions,
                action: 'return',
                allowCrossReturn: true,
                libraryLocationId,
              });

              if (result.action === 'wrong_library') {
                throw new Error(describeWrongLibrary(result.libraryLocationId));
              }
              if (result.action === 'not_found') throw new Error('Book barcode not recognized in catalog.');
              if (result.action === 'already_done') {
                setMessage(`Already returned: ${foundItem.item.name}`);
                return;
              }
              if (result.action === 'wrong_borrower') {
                throw new Error('This copy is on loan to another student. Please return it first.');
              }
              if (result.action === 'limit_reached') {
                throw new Error(`Loan limit reached: Student already has ${result.currentCount} of ${result.max} books.`);
              }
              if (result.action !== 'return') return;

              const sName = getStudentName(target);
              const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              setLastScannedItem(result.item);
              setLastAction('return');
              const classification = resolveBookClassification(
                result.item.category,
                settings.libraryGenreDefinitions,
                result.item.shelfLocation,
              );
              setReturnPlacement({
                title: result.item.name,
                shelf: classification.shelfLocation,
                callPrefix: classification.genre.callPrefix,
                genreLabel: classification.genre.label,
                color: classification.color,
              });

              const isOverdue = (result.daysOverdue ?? 0) > 0;
              const daysOverdue = result.daysOverdue ?? 0;
              const feedback = resolveLibraryReturnFeedback(
                { isOverdue, daysOverdue, bookTitle: result.item.name, studentName: sName },
                settings,
              );
              if (settings.libraryKioskSoundEffects !== false) {
                playLibraryReturnAudio(feedback.soundId);
              } else {
                playSound('success');
              }
              const text = `Returned: "${result.item.name}" · ${sName} (${feedback.badgeText})`;
              setMessage(text);
              setRecentActivities((prev) => [
                {
                  id: String(Date.now()),
                  action: 'return' as const,
                  bookTitle: result.item.name,
                  studentName: sName,
                  timestamp: timeStr,
                  coverUrl: result.item.coverUrl,
                  shelf: classification.shelfLocation,
                  isOverdue,
                },
                ...prev,
              ].slice(0, 10));

              if (studentId) {
                setStudentLoans(await getStudentLibraryCheckouts(firestore, schoolId, studentId, { libraryLocationId }));
              }
              return;
            }

            // Checkout action
            if (studentId) {
              setPendingBook(null);
              await executeCheckout(studentId, cleanRaw, foundItem.item);
              return;
            }

            // No student loaded yet -> Stage the book!
            setPendingBook({ item: foundItem.item, raw: cleanRaw });
            setLastScannedItem(foundItem.item);
            setMessage(`Book ready: "${foundItem.item.name}". Scan student badge to complete loan.`);
            playSound('success');
            return;
          }

          // 3. NEITHER BOOK NOR STUDENT FOUND
          if (isRetailIsbnBarcode(cleanRaw) || isSchoolLibraryBarcode(cleanRaw)) {
            throw new Error('Book not in catalog. Click "+ Add books" above to onboard it.');
          }
          throw new Error('Unrecognized barcode. Scan a student badge or catalog barcode.');
        } catch (e) {
          setError(true);
          setMessage((e as Error).message || 'Could not process scan. Try again.');
          playSound('error');
        } finally {
          locked.current = false;
          setBusy(false);
        }
      })();
    },
    [
      firestore,
      schoolId,
      studentId,
      mode,
      policy,
      functions,
      getStudentName,
      playSound,
      settings,
      students,
      pendingBook,
      executeCheckout,
      libraryLocationId,
      describeWrongLibrary,
      catalogItems,
    ],
  );

  useEffect(() => {
    if (initialScanCode?.trim()) {
      handleScan(initialScanCode.trim());
      onClearInitialScan?.();
    }
  }, [initialScanCode, handleScan, onClearInitialScan]);

  const reader = useBarcodeReaderWedge({ active: true, disabled: busy, onScan: handleScan });

  const { videoRef, hasCameraPermission, zoom, setZoom } = useBarcodeScanner(
    cameraEnabled && cameraActive && !busy,
    (scanned) => handleScan(scanned),
    () => {},
    { cameraEnabled: cameraEnabled && cameraActive, keepCameraWarm: true },
  );

  const maxAllowed = policy.maxCheckoutsPerStudent || 3;
  const loanRatio = studentLoans.length / maxAllowed;
  const studentStanding = useMemo(() => {
    return computeStudentLibraryStanding(studentLoans, { fineBalance: student?.libraryFineBalance });
  }, [studentLoans, student]);

  const isNightDesk = currentTheme.id === 'night_desk';
  const isReadingRoom = currentTheme.id === 'reading_room';

  const [deskBookMatches, setDeskBookMatches] = useState<LibraryItem[]>([]);
  const [showDeskDropdown, setShowDeskDropdown] = useState(false);
  const deskSearchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = reader.scanBuffer.trim().toLowerCase();
    if (q.length < 2 || !catalogItems?.length || /^\d{8,}$/.test(q)) {
      setDeskBookMatches([]);
      setShowDeskDropdown(false);
      return;
    }
    const matches = catalogItems
      .filter((it) => it.name.toLowerCase().includes(q) || (it.author && it.author.toLowerCase().includes(q)))
      .slice(0, 5);
    setDeskBookMatches(matches);
    setShowDeskDropdown(matches.length > 0);
  }, [reader.scanBuffer, catalogItems]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (deskSearchRef.current && !deskSearchRef.current.contains(e.target as Node)) {
        setShowDeskDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const renderDeskSuggestions = () => {
    if (!showDeskDropdown || deskBookMatches.length === 0) return null;
    return (
      <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-64 overflow-y-auto rounded-2xl border border-border/80 bg-popover p-1.5 shadow-2xl text-left animate-in fade-in">
        <div className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/40 mb-1">
          <span>Matching books in catalog</span>
          <span className="text-[9px] font-normal lowercase">click to select &amp; scan</span>
        </div>
        {deskBookMatches.map((book) => (
          <button
            key={book.id}
            type="button"
            className="w-full text-left p-2.5 rounded-xl flex items-center justify-between gap-3 hover:bg-muted/70 transition-colors text-xs"
            onClick={() => {
              reader.setScanBuffer('');
              setShowDeskDropdown(false);
              handleScan(book.upc);
            }}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-9 w-7 rounded bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                {book.coverUrl ? (
                  <img src={book.coverUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-foreground truncate">{book.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {book.author ? `${book.author} · ` : ''}Barcode: <span className="font-mono">{book.upc}</span>
                </div>
              </div>
            </div>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border',
                book.status === 'available'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
              )}
            >
              {book.status === 'available' ? 'Available' : 'On Loan'}
            </span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6" aria-label="Library desk">
      {isNightDesk ? (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Concept B Hero Typography */}
          <div className="space-y-1 text-left pt-2 pb-1">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white">
              Scan a badge.
            </h2>
            <h3 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-500">
              We&apos;ll figure out the rest.
            </h3>
          </div>

          {/* Concept B Console Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl space-y-5">
            {/* Input Bar with Amber Scan Icon and Go Button */}
            <div className="relative" ref={deskSearchRef}>
              <div className="flex items-center gap-3 rounded-2xl bg-slate-950/80 border border-slate-800 p-2 sm:p-2.5 focus-within:border-amber-500/80 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                <div className="text-amber-500 pl-3 shrink-0">
                  <Scan className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <Input
                  id="library-desk-reader"
                  ref={reader.inputRef as any}
                  type="text"
                  autoFocus
                  value={reader.scanBuffer}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => reader.setScanBuffer(e.target.value)}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      reader.submitScan();
                    }
                  }}
                  placeholder="Badge, barcode, or book title…"
                  className="h-11 flex-1 border-0 bg-transparent px-2 text-white placeholder:text-slate-500 text-base sm:text-lg font-medium focus-visible:ring-0 focus-visible:outline-none shadow-none"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  disabled={busy}
                />
                <Button
                  type="button"
                  disabled={busy || !reader.scanBuffer.trim()}
                  onClick={() => reader.submitScan()}
                  className="h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-6 text-sm shrink-0 shadow-md transition-colors"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Go'}
                </Button>
              </div>
              {renderDeskSuggestions()}
            </div>

            {/* Sub-mode pill selectors matching Concept B */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2">
                {[
                  { id: 'auto' as const, label: 'Smart auto' },
                  { id: 'checkout' as const, label: 'Force borrow' },
                  { id: 'return' as const, label: 'Force return' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMode(id);
                      setMessage(
                        id === 'auto'
                          ? 'Auto-detect active: scan student badge or book.'
                          : id === 'return'
                            ? 'Force return active: scan book barcodes to return.'
                            : 'Force borrow active: choose patron, then scan books.',
                      );
                    }}
                    className={cn(
                      'rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all',
                      mode === id
                        ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {cameraEnabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-slate-400 hover:text-white gap-1.5"
                  onClick={() => setCameraActive((v) => !v)}
                >
                  {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                  <span>{cameraActive ? 'Close camera' : 'Camera scan'}</span>
                </Button>
              )}
            </div>

            {/* Camera View Drawer if active */}
            {cameraEnabled && cameraActive && (
              <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950/80 p-3 shadow-inner animate-in fade-in">
                <BarcodeScannerCameraView
                  videoRef={videoRef}
                  hasCameraPermission={hasCameraPermission}
                  zoom={zoom}
                  onZoomChange={setZoom}
                  viewportClassName="aspect-video max-h-52 rounded-xl overflow-hidden shadow-inner"
                  hintText="Align barcode within target frame"
                />
              </div>
            )}

            {/* Feedback / status line */}
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
                  <span className="text-amber-400">Processing barcode…</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                  <span className="text-rose-400">{message}</span>
                </>
              ) : lastAction === 'return' ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400">{message}</span>
                </>
              ) : (
                <span>{message}</span>
              )}
            </div>

            {/* Quick Patron Name Search below (when no student selected) */}
            {!studentId && (
              <div className="pt-3 border-t border-slate-800/80">
                <LibraryStudentNamePicker
                  students={students}
                  disabled={busy}
                  onSelect={(s) => void selectStudent(s.id)}
                  variant="default"
                  label="Can't scan card? Find patron by name"
                  placeholder="Type student name to start session…"
                />
              </div>
            )}
          </div>

          {/* 3 Metric Cards Grid matching Concept B */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 flex flex-col justify-between h-36">
              <BookOpen className="h-5 w-5 text-slate-400" />
              <div>
                <div className="text-3xl font-black text-white">{copiesCount ?? 0}</div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-1">
                  COPIES ON SHELF
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 flex flex-col justify-between h-36">
              <Users className="h-5 w-5 text-slate-400" />
              <div>
                <div className="text-3xl font-black text-white">{activeLoansCount ?? 0}</div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-400 mt-1">
                  ACTIVE LOANS
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-900/60 p-6 flex flex-col justify-between h-36">
              <AlertTriangle className={cn("h-5 w-5", (overdueLoansCount ?? 0) > 0 ? "text-rose-400" : "text-slate-400")} />
              <div>
                <div className={cn("text-3xl font-black", (overdueLoansCount ?? 0) > 0 ? "text-rose-400" : "text-white")}>
                  {overdueLoansCount ?? 0}
                </div>
                <div className={cn("text-[11px] font-black uppercase tracking-wider mt-1", (overdueLoansCount ?? 0) > 0 ? "text-rose-400" : "text-slate-400")}>
                  OVERDUE
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : isReadingRoom ? (
        <div className="space-y-10 animate-in fade-in duration-200">
          {/* Concept C: Editorial Two-Column Main Stage */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start pt-2">
            {/* Left Column: Hero & Input */}
            <div className="lg:col-span-8 space-y-4">
              <div className="text-[11px] font-black uppercase tracking-widest text-blue-700">
                Circulation Desk
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-stone-950 leading-[1.15] font-serif">
                Every book has a reader waiting for it.
              </h2>
              <p className="text-sm text-stone-700 leading-relaxed max-w-xl">
                Check books in and out with one scan. The desk decides whether it&apos;s a borrow or a return, so you can keep talking to the student in front of you.
              </p>

              {/* Editorial Scan Input Bar */}
              <div className="relative max-w-xl" ref={deskSearchRef}>
                <div className="flex items-center gap-3 border-b-2 border-stone-900 pb-2.5 pt-4">
                  <Search className="h-4 w-4 text-stone-500 shrink-0" />
                  <Input
                    id="library-desk-reader"
                    ref={reader.inputRef as any}
                    type="text"
                    autoFocus
                    value={reader.scanBuffer}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => reader.setScanBuffer(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        reader.submitScan();
                      }
                    }}
                    placeholder="Scan badge or search a title…"
                    className="h-10 flex-1 border-0 bg-transparent px-1 text-stone-900 placeholder:text-stone-500 text-sm sm:text-base font-medium focus-visible:ring-0 focus-visible:outline-none shadow-none"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    disabled={busy}
                  />
                  <Button
                    type="button"
                    disabled={busy || !reader.scanBuffer.trim()}
                    onClick={() => reader.submitScan()}
                    className="h-9 rounded-full bg-stone-900 hover:bg-stone-800 text-stone-100 font-bold px-6 text-xs shrink-0 shadow-xs"
                  >
                    {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Scan'}
                  </Button>
                </div>
                {renderDeskSuggestions()}
              </div>

              {/* Mode & Camera Controls */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex rounded-full border border-stone-300 bg-stone-100 p-0.5">
                  {[
                    { id: 'auto' as const, label: 'Smart Auto' },
                    { id: 'checkout' as const, label: 'Borrow' },
                    { id: 'return' as const, label: 'Return' },
                  ].map(({ id, label }) => (
                    <button
                      key={id}
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setMode(id);
                        setMessage(
                          id === 'auto'
                            ? 'Auto-detect active: scan student badge or book.'
                            : id === 'return'
                              ? 'Return mode active: scan books to return.'
                              : 'Borrow mode active: select student, then scan books.',
                        );
                      }}
                      className={cn(
                        'rounded-full px-3.5 py-1 text-xs font-semibold transition-all',
                        mode === id
                          ? 'bg-white text-stone-950 shadow-2xs font-bold'
                          : 'text-stone-600 hover:text-stone-900',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {cameraEnabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-stone-600 hover:text-stone-950 gap-1.5"
                    onClick={() => setCameraActive((v) => !v)}
                  >
                    {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                    <span>{cameraActive ? 'Close camera' : 'Camera'}</span>
                  </Button>
                )}
              </div>

              {/* Camera drawer if active */}
              {cameraEnabled && cameraActive && (
                <div className="overflow-hidden rounded-xl border border-stone-300 bg-stone-50 p-3 shadow-inner animate-in fade-in max-w-xl">
                  <BarcodeScannerCameraView
                    videoRef={videoRef}
                    hasCameraPermission={hasCameraPermission}
                    zoom={zoom}
                    onZoomChange={setZoom}
                    viewportClassName="aspect-video max-h-52 rounded-lg overflow-hidden shadow-inner"
                    hintText="Align barcode within target frame"
                  />
                </div>
              )}

              {/* Status feedback */}
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 pt-1">
                {busy ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                    <span>Processing barcode…</span>
                  </>
                ) : error ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                    <span className="text-rose-600 font-bold">{message}</span>
                  </>
                ) : lastAction === 'return' ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">{message}</span>
                  </>
                ) : (
                  <span>{message}</span>
                )}
              </div>

              {/* Student Name Picker if no student selected */}
              {!studentId && (
                <div className="pt-3 max-w-xl">
                  <LibraryStudentNamePicker
                    students={students}
                    disabled={busy}
                    onSelect={(s) => void selectStudent(s.id)}
                    variant="default"
                    label="Can't scan card? Find patron by name"
                    placeholder="Type student name to start session…"
                  />
                </div>
              )}
            </div>

            {/* Right Column: 3 Clean Editorial Metric Stat Rows */}
            <div className="lg:col-span-4 space-y-6 pt-4 lg:border-l lg:border-stone-200 lg:pl-8">
              <div className="flex items-start gap-3.5">
                <Bookmark className="h-5 w-5 text-stone-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-950 leading-none">
                    {copiesCount ?? 0}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 mt-1">
                    COPIES CATALOGUED
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Clock className="h-5 w-5 text-stone-500 mt-0.5 shrink-0" />
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-stone-950 leading-none">
                    {activeLoansCount ?? 0}
                  </div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 mt-1">
                    OUT ON LOAN
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <RotateCcw className={cn("h-5 w-5 mt-0.5 shrink-0", (overdueLoansCount ?? 0) > 0 ? "text-rose-600" : "text-stone-500")} />
                <div>
                  <div className={cn("text-2xl sm:text-3xl font-black leading-none", (overdueLoansCount ?? 0) > 0 ? "text-rose-600" : "text-stone-950")}>
                    {overdueLoansCount ?? 0}
                  </div>
                  <div className={cn("text-[10px] font-black uppercase tracking-widest mt-1", (overdueLoansCount ?? 0) > 0 ? "text-rose-600" : "text-stone-600")}>
                    NEED CHASING
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Concept C: ON THE SHELF TODAY Ledger */}
          <div className="pt-8 border-t border-stone-200 space-y-4">
            <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-stone-600">
              <span>On the shelf today</span>
              {onViewCatalog && (
                <button
                  type="button"
                  onClick={onViewCatalog}
                  className="text-blue-700 hover:text-blue-900 font-bold lowercase tracking-normal flex items-center gap-1 hover:underline"
                >
                  <span>view catalog</span>
                  <span>&rarr;</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-stone-200 border-t border-b border-stone-200">
              {(catalogItems && catalogItems.length > 0
                ? catalogItems.slice(0, 5)
                : [
                    { id: '1', name: 'The Hobbit', status: 'available', shelfLocation: 'Fiction' },
                    { id: '2', name: 'Pirkei Avos Companion', status: 'checked_out', shelfLocation: 'Judaica' },
                    { id: '3', name: 'A Brief History of Time', status: 'checked_out', shelfLocation: 'Science' },
                    { id: '4', name: 'Holes', status: 'available', shelfLocation: 'Fiction' },
                  ]
              ).map((item, idx) => {
                const dotColor = idx % 3 === 0 ? 'bg-blue-600' : idx % 3 === 1 ? 'bg-amber-600' : 'bg-rose-600';
                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={cn('h-2 w-2 rounded-full shrink-0', dotColor)} />
                      <span className="font-bold text-stone-900 truncate">{item.name}</span>
                    </div>
                    <span className="text-stone-600 shrink-0 font-medium">
                      {item.status === 'available'
                        ? `Available · ${item.shelfLocation || 'General'}`
                        : `Out on loan · ${item.shelfLocation || 'Desk'}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Library Desk Hero Card matching Lovable Concept A */
        <div className={cn('rounded-[32px] border border-border/80 bg-card p-6 sm:p-8 shadow-xs space-y-6', currentTheme.uiClasses.cardRadius)}>
          {/* Card Header: Title + Scanner Status + Mode Segmented Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-inner">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-black tracking-tight text-foreground">
                  Library Desk
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Scanner Ready
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {cameraEnabled && (
                <Button
                  type="button"
                  variant={cameraActive ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 gap-1.5 rounded-full text-xs font-semibold px-3"
                  onClick={() => setCameraActive((v) => !v)}
                  aria-pressed={cameraActive}
                >
                  {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                  <span>{cameraActive ? 'Close Camera' : 'Camera'}</span>
                </Button>
              )}

              {/* Segmented Mode Selector Capsule */}
              <div className="inline-flex rounded-full border border-border/70 bg-muted/50 p-1">
                {[
                  { id: 'auto' as const, label: 'Smart Auto' },
                  { id: 'checkout' as const, label: 'Borrow' },
                  { id: 'return' as const, label: 'Return' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setMode(id);
                      setMessage(
                        id === 'auto'
                          ? 'Auto-detect active: scan student badge or book.'
                          : id === 'return'
                            ? 'Drop box return: scan book barcodes to return.'
                            : 'Borrow mode: choose patron, then scan books.',
                      );
                    }}
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-bold transition-all',
                      mode === id
                        ? 'bg-background text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground font-semibold',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Camera Live View Drawer */}
          {cameraEnabled && cameraActive && (
            <div className="overflow-hidden rounded-2xl border border-primary/20 bg-muted/40 p-3 shadow-inner animate-in fade-in">
              <BarcodeScannerCameraView
                videoRef={videoRef}
                hasCameraPermission={hasCameraPermission}
                zoom={zoom}
                onZoomChange={setZoom}
                viewportClassName="aspect-video max-h-52 rounded-xl overflow-hidden shadow-inner"
                hintText="Align barcode within target frame"
              />
            </div>
          )}

          {/* Big Dashed Barcode Stage matching Lovable */}
          <div className="rounded-3xl border-2 border-dashed border-border/80 bg-muted/10 p-8 sm:p-14 flex flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80 text-muted-foreground/80 mb-3 border border-border/40 shadow-inner">
              <ScanBarcode className="h-7 w-7 text-muted-foreground/70" />
            </div>
            <h4 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
              Ready to scan
            </h4>
            <p className="text-xs text-muted-foreground mt-1">
              Position barcode in front of camera or scanner
            </p>

            <div className="w-full max-w-xl mt-6 relative" ref={deskSearchRef}>
              <Input
                id="library-desk-reader"
                ref={reader.inputRef as any}
                type="text"
                autoFocus
                value={reader.scanBuffer}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => reader.setScanBuffer(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    reader.submitScan();
                  }
                }}
                placeholder="Scan student badge or book barcode / ISBN…"
                className="h-12 w-full rounded-2xl border-2 border-border/80 bg-background px-5 py-3 text-center text-sm font-medium shadow-xs focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 transition-all"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                disabled={busy}
              />
              {renderDeskSuggestions()}
            </div>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {busy ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  <span>PROCESSING BARCODE…</span>
                </>
              ) : error ? (
                <>
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-destructive font-semibold">{message}</span>
                </>
              ) : lastAction === 'return' ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{message}</span>
                </>
              ) : (
                <span>WAITING FOR INPUT · · ·</span>
              )}
            </div>
          </div>

          {/* Quick Patron Name Search below the stage (when no student selected) */}
          {!studentId && (
            <div className="pt-2 border-t border-border/50">
              <div className="max-w-md mx-auto">
                <LibraryStudentNamePicker
                  students={students}
                  disabled={busy}
                  onSelect={(s) => void selectStudent(s.id)}
                  variant="default"
                  label="Can't scan card? Find patron by name"
                  placeholder="Type student name to start session…"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Dual-Column Workstation (Reveals when patron is active or activity has occurred) */}
      {(studentId || lastScannedItem || recentActivities.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in duration-200">
          {/* Left Column (5/12): Patron Console */}
          <div className="lg:col-span-5 space-y-4">
          <div className={cn('border border-border/80 bg-card p-5 shadow-sm space-y-4', currentTheme.uiClasses.cardRadius)}>
            <div className="flex items-center justify-between gap-2 border-b pb-3.5">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <GraduationCap className="h-4 w-4 text-primary" />
                <span>Patron Console</span>
              </div>
              {studentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setStudentId(null);
                    setStudentLoans([]);
                    setPendingBook(null);
                    setMessage('Scan student badge or book barcode.');
                    playSound('click');
                  }}
                  className={cn('h-8 text-xs font-bold hover:bg-muted text-muted-foreground hover:text-foreground', currentTheme.uiClasses.buttonRadius)}
                >
                  Switch Patron
                  <X className="ml-1 h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Pending Book Staged Banner */}
            {pendingBook && (
              <div className={cn('border-2 border-primary/40 bg-primary/5 p-3.5 space-y-2 animate-in fade-in slide-in-from-top-2', currentTheme.uiClasses.cardRadius)}>
                <div className="flex items-center justify-between">
                  <Badge variant="default" className={cn('bg-primary text-primary-foreground text-[10px] font-black gap-1 uppercase tracking-wider', currentTheme.uiClasses.badgeRadius)}>
                    <Sparkles className="h-3 w-3 text-amber-300" />
                    Book Ready to Lend
                  </Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPendingBook(null);
                      setMessage('Scan student badge or book barcode.');
                    }}
                    className="h-6 px-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
                  >
                    Clear Book
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <LibraryBookCover
                    coverUrl={pendingBook.item.coverUrl}
                    isbn={pendingBook.item.isbn}
                    title={pendingBook.item.name}
                    author={pendingBook.item.author}
                    aspect="thumb"
                    className="h-14 w-10 shrink-0 rounded-lg shadow-xs"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-black text-sm text-foreground truncate">{pendingBook.item.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{pendingBook.item.author || 'Author not recorded'}</p>
                    <p className="text-xs font-bold text-primary flex items-center gap-1.5 pt-0.5">
                      <ScanBarcode className="h-3.5 w-3.5 animate-pulse" />
                      Scan student badge or select name below
                    </p>
                  </div>
                </div>
              </div>
            )}

            {studentId ? (
              <div className="space-y-4">
                {/* Active Student Hero Card */}
                <div className="flex items-center gap-4 rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <Avatar className="h-14 w-14 border-2 border-primary/40 shadow-sm">
                    <AvatarFallback className="bg-primary/10 text-primary font-black text-lg">
                      {getStudentName(studentId)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-black tracking-tight text-foreground truncate">
                        {getStudentName(studentId)}
                      </h4>
                      <LibraryStudentBehaviorBadge standing={studentStanding} compact />
                    </div>
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      ID: {(student as any)?.barcode || student?.id || studentId}
                    </p>
                  </div>
                </div>

                {/* Quota Progress Meter */}
                <div className="rounded-2xl border border-border/60 bg-background p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-muted-foreground">Borrowing Allowance</span>
                    <span
                      className={cn(
                        studentLoans.length >= maxAllowed
                          ? 'text-destructive'
                          : 'text-primary font-black',
                      )}
                    >
                      {studentLoans.length} of {maxAllowed} books
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round(loanRatio * 100))}
                    className={cn(
                      'h-2 rounded-full',
                      studentLoans.length >= maxAllowed && '[&>div]:bg-destructive',
                    )}
                  />
                </div>

                {/* Active Student Loans Accordion */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Current Loans ({studentLoans.length})
                    </span>
                    {studentLoans.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={handleReturnAllForStudent}
                        className="h-7 rounded-lg text-[11px] font-bold text-destructive border-destructive/30 hover:bg-destructive/10 gap-1"
                      >
                        <Undo2 className="h-3 w-3" />
                        Return All ({studentLoans.length})
                      </Button>
                    )}
                  </div>

                  {studentLoans.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center text-xs text-muted-foreground">
                      <BookOpen className="mx-auto h-8 w-8 opacity-40 mb-2" />
                      No books currently borrowed.
                      <p className="mt-1 font-semibold text-foreground">Scan a book barcode to check it out.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {studentLoans.map((loan) => {
                        const daysOverdue = computeDaysOverdue(loan.dueAt);
                        const isLate = daysOverdue > 0;
                        return (
                          <div
                            key={loan.id}
                            className={cn(
                              'flex items-center gap-3 rounded-2xl border p-3 transition-all',
                              isLate
                                ? 'border-destructive/40 bg-destructive/5'
                                : 'border-border/80 bg-background hover:border-primary/40',
                            )}
                          >
                            <LibraryBookCover
                              coverUrl={loan.coverUrl}
                              isbn={loan.isbn}
                              title={loan.name}
                              author={loan.author}
                              aspect="thumb"
                              className="h-12 w-9 shrink-0 rounded-lg shadow-xs"
                            />
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <p className="text-xs font-bold text-foreground truncate">{loan.name}</p>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="h-3 w-3 text-primary/70" />
                                  {isLate ? (
                                    <span className="text-destructive font-black">
                                      {daysOverdue}d overdue
                                    </span>
                                  ) : (
                                    `Due ${formatDueDate(loan.dueAt)}`
                                  )}
                                </span>
                                <span>·</span>
                                <span className="font-mono">{loan.upc}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busy}
                                onClick={() => void handleRenewSingleItem(loan)}
                                title="Renew loan (+14 days)"
                                className="h-8 w-8 rounded-lg p-0 text-muted-foreground hover:text-foreground"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => void handleReturnSingleItem(loan)}
                                title="Return this book"
                                className="h-8 rounded-lg px-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                              >
                                Return
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3.5 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground">Scan Badge or Search Patron</p>
                    <p className="text-[11px] text-muted-foreground">Scan a student barcode or type their name below</p>
                  </div>
                </div>
                <LibraryStudentNamePicker
                  students={students}
                  disabled={busy}
                  onSelect={(s) => void selectStudent(s.id)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7/12): Last Scanned Hero & Live Activity Feed */}
        <div className="lg:col-span-7 space-y-4">
          {/* Spotlight Hero: Last Scanned Book Card */}
          {lastScannedItem && (
            <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Last Scanned Item
                </span>
                <Badge
                  variant={lastAction === 'return' ? 'default' : 'secondary'}
                  className={cn(
                    'font-bold text-xs capitalize',
                    lastAction === 'return' && 'bg-emerald-600 text-white',
                  )}
                >
                  {lastAction === 'return' ? 'Returned to Library' : 'Checked Out'}
                </Badge>
              </div>

              <div className="flex gap-4 items-start">
                <LibraryBookCover
                  coverUrl={lastScannedItem.coverUrl}
                  isbn={lastScannedItem.isbn}
                  title={lastScannedItem.name}
                  author={lastScannedItem.author}
                  aspect="portrait"
                  className="h-28 w-20 shrink-0 rounded-xl shadow-md"
                />

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h4 className="text-base sm:text-lg font-black text-foreground leading-snug">
                    {lastScannedItem.name}
                  </h4>
                  <p className="text-xs font-medium text-muted-foreground">
                    {lastScannedItem.author || 'Author not recorded'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                    <Badge variant="outline" className="text-[10px]">
                      {lastScannedItem.upc}
                    </Badge>
                    {lastScannedItem.readingLevel && (
                      <Badge variant="outline" className="text-[10px]">
                        Level {lastScannedItem.readingLevel}
                      </Badge>
                    )}
                    {lastScannedItem.pageCount && (
                      <span className="text-[10px] text-muted-foreground">{lastScannedItem.pageCount} pages</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Instant Reshelving Guide */}
              {returnPlacement && (
                <div
                  className="rounded-2xl border p-4 flex flex-wrap items-center justify-between gap-3 shadow-inner"
                  style={{
                    borderColor: `${returnPlacement.color}50`,
                    backgroundColor: `${returnPlacement.color}15`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <MapPin className="h-5 w-5 shrink-0" style={{ color: returnPlacement.color }} />
                    <div>
                      <p className="text-xs font-bold text-muted-foreground">Physical Shelf Destination</p>
                      <p className="text-sm font-black text-foreground" style={{ color: returnPlacement.color }}>
                        {returnPlacement.shelf}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="font-bold text-xs px-3 py-1 shadow-sm"
                    style={{
                      borderColor: `${returnPlacement.color}60`,
                      backgroundColor: `${returnPlacement.color}25`,
                      color: returnPlacement.color,
                    }}
                  >
                    {returnPlacement.callPrefix} · {returnPlacement.genreLabel}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* Live Activity Stream */}
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Live Desk Activity
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                {recentActivities.length} recent events
              </span>
            </div>

            {recentActivities.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center text-xs text-muted-foreground">
                <Barcode className="mx-auto h-8 w-8 opacity-40 mb-2" />
                Scan activity will stream here in real time as books are borrowed or returned.
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentActivities.map((act) => (
                  <div
                    key={act.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-muted/20 p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs shadow-inner',
                          act.action === 'checkout'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
                        )}
                      >
                        {act.action === 'checkout' ? (
                          <BookOpen className="h-4 w-4" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{act.bookTitle}</p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {act.studentName ? `${act.studentName} · ` : ''}
                          {act.action === 'checkout' ? 'Checked out' : 'Returned'}
                          {act.shelf ? ` · Shelve at ${act.shelf}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {act.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
