'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Barcode, BookOpen, Camera, CameraOff, Check, ClipboardList, CopyPlus, Layers, Loader2, Minus, Plus, ScanLine, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { BarcodeScannerCameraView } from '@/components/barcode/BarcodeScannerCameraView';
import {
  catalogIsbnSet,
  isLikelyStoreProductBarcode,
  isRetailIsbnBarcode,
  primaryIsbnVariant,
  isSuspiciousCatalogTitle,
  pickBestTitleHit,
} from '@/lib/library/libraryCatalogLookup';
import {
  allocateNextGenreBarcode,
  catalogScannedCodeSet,
  createScanDeduper,
  fetchCatalogHitByIsbn,
  fetchCatalogHitsByTitle,
  resolveIntakeCheckoutUpc,
  isBlockedLibraryIntakeBarcode,
  normalizeIntakeScanCode,
  type IsbnLookupPhase,
} from '@/lib/library/libraryIntakeHelpers';
import {
  LIBRARY_ISBN_AI_LOOKUP,
  LIBRARY_ISBN_LIST_LOOKUP,
  LIBRARY_STORE_BARCODE_BODY,
  LIBRARY_STORE_BARCODE_MANUAL_HINT,
  LIBRARY_STORE_BARCODE_SCAN_ISBN,
  LIBRARY_STORE_BARCODE_TITLE,
  LIBRARY_STORE_BARCODE_TYPE_MANUAL,
} from '@/lib/library/libraryCatalogingCopy';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import {
  LibraryBarcodeReaderField,
  type LibraryScanFeedback,
} from './LibraryBarcodeReaderField';
import { LibraryBookCover } from './LibraryBookCover';
import {
  DEFAULT_LIBRARY_PLACEMENT_ZONES,
  getActiveLibraryGenres,
  resolveBookClassification,
} from '@/lib/library/libraryClassification';

type IntakeRowStatus =
  | 'lookup'
  | 'ready'
  | 'ai_review'
  | 'needs_title'
  | 'duplicate_catalog'
  | 'saved'
  | 'error';

type IntakeRow = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  shelfLocation?: string;
  status: IntakeRowStatus;
  error?: string;
  copies?: number;
  /** Set once a barcode scan or "Find this book" search has confidently matched this row —
   * hides the redundant "Find this book" button until the title is edited again. */
  identifiedByLookup?: boolean;
  coverUrl?: string;
  description?: string;
  pageCount?: number;
  readingLevel?: string;
  publishedYear?: string;
};

function newRowId() {
  return `intake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lookupFailureMessage(scannedCode: string, meta: Awaited<ReturnType<typeof fetchCatalogHitByIsbn>>['meta']) {
  if (!meta.aiConfigured) {
    return `No catalog record for ${scannedCode}. Type the title below to continue.`;
  }
  if (meta.aiStatus === 'error') {
    return meta.aiError
      ? `Catalogs had no match and AI search errored: ${meta.aiError}`
      : `Catalogs had no match and AI search failed for ${scannedCode}. Type a title below.`;
  }
  if (meta.aiAttempted) {
    return `No catalog or AI match for ${scannedCode}. Type a title below.`;
  }
  return `No online match for ${scannedCode}. Type a title below.`;
}

export function LibraryBookIntakeScanner({
  onRegister,
  onComplete,
  upcTaken,
  libraryItems,
  reservedCodes,
  className,
  initialScanCode,
}: {
  onRegister: (data: LibraryItemInput) => Promise<void>;
  onComplete?: () => void;
  upcTaken: (upc: string) => Promise<boolean>;
  libraryItems?: LibraryItem[] | null;
  reservedCodes?: Set<string>;
  className?: string;
  /** A barcode/ISBN already scanned before this scanner opened (e.g. from the Library Desk's
   * "Book Not Found" prompt) — queued automatically so the staff member doesn't re-scan it. */
  initialScanCode?: string | null;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const { settings } = useSettings();
  const placementZones =
    settings.libraryPlacementZones && settings.libraryPlacementZones.length > 0
      ? settings.libraryPlacementZones
      : DEFAULT_LIBRARY_PLACEMENT_ZONES;
  const genres = getActiveLibraryGenres(settings.libraryGenreDefinitions);
  const defaultGenre = resolveBookClassification(
    settings.libraryDefaultCategory,
    settings.libraryGenreDefinitions,
  ).genre;
  const [scanning, setScanning] = useState(true);
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const rowsRef = useRef<IntakeRow[]>(rows);
  rowsRef.current = rows;
  const [registering, setRegistering] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<LibraryScanFeedback | null>(null);
  const [lookupPhase, setLookupPhase] = useState<IsbnLookupPhase | null>(null);
  const [findingTitleId, setFindingTitleId] = useState<string | null>(null);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  const catalogIsbns = useMemo(() => catalogIsbnSet(libraryItems), [libraryItems]);
  const catalogScannedCodes = useMemo(() => catalogScannedCodeSet(libraryItems), [libraryItems]);
  const shouldAcceptScan = useMemo(() => createScanDeduper(2000), []);

  const upsertRow = useCallback((patch: Partial<IntakeRow> & { id: string }) => {
    setRows((prev) => prev.map((r) => (r.id === patch.id ? { ...r, ...patch } : r)));
  }, []);

  const playSound = useArcadeSound();

  const autofillRowFromTitle = useCallback(
    async (rowId: string, title: string) => {
      const trimmed = title.trim();
      if (!trimmed) return;
      setFindingTitleId(rowId);
      try {
        const hits = await fetchCatalogHitsByTitle(trimmed);
        const hit = pickBestTitleHit(trimmed, hits) ?? hits[0] ?? null;
        if (hit) {
          const classification = resolveBookClassification(hit.category, settings.libraryGenreDefinitions);
          const isAiGuess = hit.source === 'ai';
          upsertRow({
            id: rowId,
            title: hit.title,
            author: hit.author || undefined,
            isbn: hit.isbn ?? '',
            coverUrl: hit.coverUrl || undefined,
            description: hit.description || undefined,
            pageCount: hit.pageCount,
            publishedYear: hit.publishedYear,
            readingLevel: hit.readingLevel,
            category: classification.genre.label,
            shelfLocation: classification.shelfLocation,
            status: isAiGuess ? 'ai_review' : 'ready',
            identifiedByLookup: true,
            error: undefined,
          });
          playSound('success');
          toast({
            title: isAiGuess ? 'AI found a match — please check it' : 'Details filled in',
            description: `Loaded details for "${hit.title}"${hit.author ? ` by ${hit.author}` : ''}.`,
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'No match found',
            description: `Could not find book details online for "${trimmed}". Type the author yourself.`,
          });
        }
      } catch (e) {
        toast({ variant: 'destructive', title: 'Lookup error', description: (e as Error).message });
      } finally {
        setFindingTitleId(null);
      }
    },
    [upsertRow, playSound, toast, settings.libraryGenreDefinitions],
  );

  const addScanToQueue = useCallback(
    async (rawCode: string) => {
      const trimmed = normalizeIntakeScanCode(rawCode);
      if (!trimmed) return;

      if (isBlockedLibraryIntakeBarcode(trimmed)) {
        setScanFeedback({
          code: trimmed,
          status: 'blocked',
          message: 'Scan the barcode on the book, not the LIB sticker used for checkout.',
        });
        toast({
          variant: 'destructive',
          title: 'School checkout sticker',
          description: 'Scan the barcode on the book, not the LIB sticker used for checkout.',
        });
        return;
      }

      if (isLikelyStoreProductBarcode(trimmed)) {
        const scanBookNumberInstead = await confirm({
          title: LIBRARY_STORE_BARCODE_TITLE,
          description: LIBRARY_STORE_BARCODE_BODY,
          confirmLabel: LIBRARY_STORE_BARCODE_SCAN_ISBN,
          cancelLabel: LIBRARY_STORE_BARCODE_TYPE_MANUAL,
        });
        if (scanBookNumberInstead) {
          setScanFeedback({
            code: trimmed,
            status: 'blocked',
            message: 'Look inside the front cover for the book number, then scan that.',
          });
          return;
        }

        const id = newRowId();
        setRows((prev) => [
          {
            id,
            isbn: '',
            title: '',
            author: '',
            category: defaultGenre.label,
            shelfLocation: defaultGenre.defaultShelf,
            status: 'needs_title',
            copies: 1,
          },
          ...prev,
        ]);
        setScanFeedback({
          code: trimmed,
          status: 'needs_title',
          message: LIBRARY_STORE_BARCODE_MANUAL_HINT,
        });
        toast({
          title: 'Type this book in',
          description: LIBRARY_STORE_BARCODE_MANUAL_HINT,
        });
        return;
      }

      const isIsbn = isLikelyStoreProductBarcode(trimmed) ? false : isRetailIsbnBarcode(trimmed);
      const scannedCode = isIsbn ? primaryIsbnVariant(trimmed) : trimmed;
      const codeKey = scannedCode.toUpperCase();

      // 1. Check if barcode is already queued in the current session
      const existingInQueue = rowsRef.current.find((r) => r.isbn.toUpperCase() === codeKey);
      if (existingInQueue) {
        const row = existingInQueue;
        const label = row.title.trim() || scannedCode;
        setScanFeedback({
          code: scannedCode,
          status: 'duplicate',
          message: 'This barcode is already in the queue — confirm to add another copy.',
        });
        const isAnotherCopy = await confirm({
          title: 'Scanned again',
          description: `"${label}" is already in the queue. Is this another physical copy, or did you scan it by mistake?`,
          confirmLabel: 'Add another copy',
          cancelLabel: 'It was a mistake',
        });
        if (isAnotherCopy) {
          const nextCopies = (row.copies ?? 1) + 1;
          upsertRow({ id: row.id, copies: nextCopies });
          toast({ title: 'Copy added', description: `"${label}" is now set to ${nextCopies} copies.` });
          setScanFeedback({
            code: scannedCode,
            status: 'identified',
            title: label,
            message: `Added copy (${nextCopies} copies total).`,
          });
        }
        return;
      }

      // 2. Check if already registered in the library catalog
      const existingCatalogItem = (libraryItems ?? []).find((i) => {
        const itemIsbn = i.isbn ? primaryIsbnVariant(i.isbn) : '';
        return (isIsbn && itemIsbn === scannedCode) || (i.upc && i.upc.toUpperCase() === codeKey);
      });

      if (existingCatalogItem) {
        setScanFeedback({
          code: scannedCode,
          status: 'duplicate',
          message: 'This barcode is already in your catalog — confirm to add another copy.',
        });
        const isAnotherCopy = await confirm({
          title: 'Already in your catalog',
          description: `"${existingCatalogItem.name}" is already registered. Is this another physical copy, or did you scan it by mistake?`,
          confirmLabel: 'Add another copy',
          cancelLabel: 'It was a mistake',
        });
        if (!isAnotherCopy) return;

        // Pre-fill directly from existing catalog data — no need to re-query or show blank fields!
        const id = newRowId();
        setRows((prev) => [
          {
            id,
            isbn: scannedCode,
            title: existingCatalogItem.name,
            author: existingCatalogItem.author ?? '',
            category: resolveBookClassification(
              existingCatalogItem.category,
              settings.libraryGenreDefinitions,
            ).genre.label,
            shelfLocation: existingCatalogItem.shelfLocation ?? '',
            coverUrl: existingCatalogItem.coverUrl,
            description: existingCatalogItem.description,
            pageCount: existingCatalogItem.pageCount,
            readingLevel: existingCatalogItem.readingLevel,
            publishedYear: existingCatalogItem.publishedYear,
            status: 'ready',
            copies: 1,
          },
          ...prev,
        ]);
        setScanFeedback({
          code: scannedCode,
          status: 'identified',
          title: existingCatalogItem.name,
          message: 'Added another copy to verification queue — ready to register.',
        });
        toast({
          title: 'Copy queued',
          description: `"${existingCatalogItem.name}" added to queue as an additional copy.`,
        });
        return;
      }

      // 3. New book — query external book catalog
      const id = newRowId();
      setRows((prev) => [
        {
          id,
          isbn: scannedCode,
          title: '',
          author: '',
          category: defaultGenre.label,
          shelfLocation: defaultGenre.defaultShelf,
          status: isIsbn ? ('lookup' as const) : ('needs_title' as const),
          copies: 1,
        },
        ...prev,
      ]);

      setLookupPhase('catalog');
      setScanFeedback({
        code: scannedCode,
        status: 'looking_up',
        message: LIBRARY_ISBN_LIST_LOOKUP,
      });

      if (!isIsbn) {
        setLookupPhase(null);
        setScanFeedback({
          code: scannedCode,
          status: 'needs_title',
          message: 'Not an ISBN — type a title in the queue below.',
        });
        return;
      }

      try {
        const { hit, meta } = await fetchCatalogHitByIsbn(scannedCode, {
          onPhase: (phase) => {
            setLookupPhase(phase);
            setScanFeedback({
              code: scannedCode,
              status: 'looking_up',
              message: phase === 'ai' ? LIBRARY_ISBN_AI_LOOKUP : LIBRARY_ISBN_LIST_LOOKUP,
            });
          },
        });
        setLookupPhase(null);
        if (hit?.title && !isSuspiciousCatalogTitle(hit.title)) {
          const isAiGuess = hit.source === 'ai';
          const classification = resolveBookClassification(hit.category, settings.libraryGenreDefinitions);
          const initialShelf =
            (settings.libraryDefaultShelf || '').trim() || classification.shelfLocation;
          upsertRow({
            id,
            title: hit.title,
            author: hit.author ?? '',
            category: classification.genre.label,
            shelfLocation: initialShelf,
            status: isAiGuess ? 'ai_review' : 'ready',
            identifiedByLookup: true,
            coverUrl: hit.coverUrl,
            description: hit.description,
            pageCount: hit.pageCount,
            readingLevel: hit.readingLevel,
            publishedYear: hit.publishedYear,
          });
          setScanFeedback({
            code: scannedCode,
            status: isAiGuess ? 'ai_guess' : 'identified',
            title: hit.title,
            message: isAiGuess
              ? 'AI suggested this title — confirm in the queue before registering.'
              : hit.author
                ? `By ${hit.author}`
                : undefined,
          });
        } else {
          upsertRow({ id, status: 'needs_title' });
          const message = lookupFailureMessage(scannedCode, meta);
          setScanFeedback({
            code: scannedCode,
            status: 'needs_title',
            message,
          });
          if (!meta.aiConfigured || meta.aiStatus === 'error') {
            toast({
              variant: 'destructive',
              title: meta.aiStatus === 'error' ? 'AI lookup failed' : 'No online match',
              description: message,
            });
          }
        }
      } catch (e) {
        upsertRow({
          id,
          status: 'needs_title',
          error: e instanceof Error ? e.message : 'Lookup failed',
        });
        setScanFeedback({
          code: scannedCode,
          status: 'error',
          message: e instanceof Error ? e.message : 'Lookup failed — type a title manually.',
        });
      } finally {
        setLookupPhase(null);
      }
    },
    [toast, confirm, upsertRow, libraryItems, defaultGenre, settings.libraryDefaultShelf, settings.libraryGenreDefinitions],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      void addScanToQueue(code);
    },
    [addScanToQueue, shouldAcceptScan],
  );

  const consumedInitialCodeRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialScanCode && consumedInitialCodeRef.current !== initialScanCode) {
      consumedInitialCodeRef.current = initialScanCode;
      void addScanToQueue(initialScanCode);
    }
  }, [initialScanCode, addScanToQueue]);

  const handleBatchQueue = useCallback(async () => {
    const lines = batchInput
      .split(/[\r\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!lines.length) return;
    setIsProcessingBatch(true);
    let count = 0;
    for (const code of lines) {
      await addScanToQueue(code);
      count++;
    }
    setIsProcessingBatch(false);
    setBatchInput('');
    setIsBatchOpen(false);
    toast({ title: 'Batch queued', description: `${count} barcode(s) added to verification queue.` });
  }, [batchInput, addScanToQueue, toast]);

  const cameraEnabled = Boolean(settings.libraryCameraScanEnabled);
  const [cameraActive, setCameraActive] = useState(false);

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: scanning,
    onScan: handleScan,
    disabled: registering,
  });

  const { videoRef, hasCameraPermission, zoom, setZoom } = useBarcodeScanner(
    cameraEnabled && cameraActive && scanning && !registering,
    (code) => handleScan(code),
    () => {},
    { cameraEnabled: cameraEnabled && cameraActive, keepCameraWarm: true },
  );

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const clearSaved = () => setRows((prev) => prev.filter((r) => r.status !== 'saved'));

  const readyRows = rows.filter(
    (r) => (r.status === 'ready' || r.status === 'needs_title' || r.status === 'error') && Boolean(r.title.trim()),
  );
  const readyCount = readyRows.length;
  const readyCopiesCount = readyRows.reduce((sum, r) => sum + (r.copies ?? 1), 0);
  const totalCopiesCount = rows.reduce((sum, r) => sum + (r.copies ?? 1), 0);
  const lookupCount = rows.filter((r) => r.status === 'lookup').length;
  const aiReviewCount = rows.filter((r) => r.status === 'ai_review').length;
  const missingTitleCount = rows.filter((r) => r.status === 'needs_title' && !r.title.trim()).length;

  const handleRegisterAll = async () => {
    const toSave = rows.filter((r) => r.status === 'ready' || ((r.status === 'needs_title' || r.status === 'error') && r.title.trim()));
    const missingTitle = rows.filter((r) => r.status === 'needs_title' && !r.title.trim());

    if (toSave.length === 0) {
      if (missingTitle.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Title required',
          description: `Please type a title for ${missingTitle.length === 1 ? 'the book' : `${missingTitle.length} books`} before registering.`,
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Nothing to register',
          description: 'Scan barcodes or enter book details first.',
        });
      }
      return;
    }

    if (aiReviewCount > 0) {
      toast({
        variant: 'destructive',
        title: 'Confirm AI guesses',
        description: `${aiReviewCount} AI-suggested book(s) need confirming before registering.`,
      });
      return;
    }

    setRegistering(true);
    let saved = 0;
    let savedCopies = 0;
    const reserved = reservedCodes ?? new Set<string>();
    for (const row of toSave) {
      upsertRow({ id: row.id, status: 'lookup' });
      const classification = resolveBookClassification(row.category, settings.libraryGenreDefinitions);
      const copiesToSave = row.copies ?? 1;
      try {
        const upc = await allocateNextGenreBarcode({
          category: classification.genre.label,
          scheme: settings.libraryBarcodeNumberScheme ?? 'genre_code',
          customGenres: settings.libraryGenreDefinitions,
          upcTaken,
          reserved,
          existingUpcs: (libraryItems ?? []).map((item) => item.upc),
        });
        if (!upc) {
          upsertRow({
            id: row.id,
            status: 'error',
            error: 'Could not make a genre code for this book.',
          });
          continue;
        }
        await onRegister({
          name: row.title.trim(),
          upc,
          copies: 1,
          author: row.author.trim() || undefined,
          isbn: row.isbn,
          category: classification.genre.label,
          shelfLocation: row.shelfLocation?.trim() || undefined,
          coverUrl: row.coverUrl,
          description: row.description,
          pageCount: row.pageCount,
          readingLevel: row.readingLevel,
          publishedYear: row.publishedYear,
        });
        for (let extra = 1; extra < copiesToSave; extra++) {
          const extraUpc = await allocateNextGenreBarcode({
            category: classification.genre.label,
            scheme: settings.libraryBarcodeNumberScheme ?? 'genre_code',
            customGenres: settings.libraryGenreDefinitions,
            upcTaken,
            reserved,
            existingUpcs: (libraryItems ?? []).map((item) => item.upc),
          });
          if (!extraUpc) throw new Error('Could not make a genre code for an extra copy.');
          await onRegister({
            name: row.title.trim(),
            upc: extraUpc,
            copies: 1,
            author: row.author.trim() || undefined,
            isbn: row.isbn,
            category: classification.genre.label,
            shelfLocation: row.shelfLocation?.trim() || undefined,
            coverUrl: row.coverUrl,
            description: row.description,
            pageCount: row.pageCount,
            readingLevel: row.readingLevel,
            publishedYear: row.publishedYear,
          });
        }
        upsertRow({ id: row.id, status: 'saved' });
        saved += 1;
        savedCopies += copiesToSave;
      } catch (e) {
        upsertRow({
          id: row.id,
          status: 'error',
          error: e instanceof Error ? e.message : 'Save failed',
        });
      }
    }
    setRegistering(false);
    setScanFeedback(null);
    focusReader();
    toast({
      title: 'Registration complete',
      description:
        missingTitle.length > 0
          ? `${savedCopies} copy/copies (${saved} titles) added to catalog. ${missingTitle.length} book(s) remaining in queue need a title.`
          : `${savedCopies} copy/copies (${saved} titles) added to the catalog.`,
    });
    if (saved > 0 && missingTitle.length === 0) {
      onComplete?.();
    }
  };

  const statusLabel: Record<IntakeRowStatus, string> = {
    lookup: 'Processing…',
    ready: 'Processed',
    ai_review: 'Confirm AI guess',
    needs_title: 'Identify item',
    duplicate_catalog: 'In catalog',
    saved: 'Registered',
    error: 'Error',
  };

  return (
    <div
      className={cn('flex flex-col h-full min-h-0 overflow-hidden space-y-2', className)}
      role="region"
      aria-label="Book intake scanner"
    >
      {/* Top Header & Scanner Controls (Fixed, non-scrolling) */}
      <div className="shrink-0 space-y-2 pb-1 border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Rapid Barcode Scanner</span>
            <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
              ISBN / UPC
            </Badge>
          </div>
          <div className="flex items-center gap-1.5">
            {cameraEnabled && (
              <Button
                type="button"
                variant={cameraActive ? 'default' : 'outline'}
                size="sm"
                className="h-7 px-2.5 gap-1.5 rounded-xl text-xs font-semibold"
                disabled={registering}
                onClick={() => {
                  if (!scanning) setScanning(true);
                  setCameraActive((v) => !v);
                }}
              >
                {cameraActive ? <CameraOff className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
                <span>{cameraActive ? 'Close Camera' : 'Camera Scan'}</span>
              </Button>
            )}
            <Button
              type="button"
              variant={isBatchOpen ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2.5 gap-1.5 rounded-xl text-xs font-semibold"
              disabled={registering}
              onClick={() => setIsBatchOpen((v) => !v)}
            >
              <ClipboardList className="h-3.5 w-3.5" />
              <span>Paste ISBNs</span>
            </Button>
            <Button
              type="button"
              variant={scanning ? 'secondary' : 'default'}
              size="sm"
              className="h-7 px-2.5 rounded-xl text-xs font-semibold"
              disabled={registering}
              onClick={() => {
                setScanning((on) => {
                  const next = !on;
                  if (next) {
                    setScanFeedback(null);
                    setTimeout(() => focusReader(), 0);
                  } else {
                    setCameraActive(false);
                  }
                  return next;
                });
              }}
            >
              <Barcode className="mr-1 h-3.5 w-3.5" />
              {scanning ? 'Pause' : 'Resume'}
            </Button>
          </div>
        </div>

        {isBatchOpen && (
          <div className="rounded-xl border border-primary/30 bg-card p-2.5 space-y-1.5 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground">Paste List of ISBN Barcodes</p>
              <span className="text-[10px] text-muted-foreground">One per line or comma-separated</span>
            </div>
            <Textarea
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder={'9780545139700\n9780439064873\n9780385737951...'}
              className="font-mono text-xs h-16 rounded-lg"
              disabled={isProcessingBatch}
            />
            <div className="flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs rounded-lg h-6 px-2"
                disabled={isProcessingBatch}
                onClick={() => {
                  setBatchInput('');
                  setIsBatchOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs rounded-lg font-bold gap-1 h-6 px-2.5"
                disabled={!batchInput.trim() || isProcessingBatch}
                onClick={() => void handleBatchQueue()}
              >
                {isProcessingBatch ? <Loader2 className="h-3 w-3 animate-spin" /> : <ClipboardList className="h-3 w-3" />}
                <span>Queue ISBNs</span>
              </Button>
            </div>
          </div>
        )}

        {cameraEnabled && cameraActive && scanning && (
          <div className="overflow-hidden rounded-xl border bg-muted/30 p-1.5 shadow-inner">
            <BarcodeScannerCameraView
              videoRef={videoRef}
              hasCameraPermission={hasCameraPermission}
              zoom={zoom}
              onZoomChange={setZoom}
              viewportClassName="aspect-video max-h-32 rounded-lg overflow-hidden shadow-inner"
              hintText="Align book ISBN barcode in the camera frame"
            />
          </div>
        )}

        {scanning ? (
          <>
          <LibraryBarcodeReaderField
            inputId="library-intake-reader"
            inputRef={inputRef}
            scanBuffer={scanBuffer}
            onScanBufferChange={setScanBuffer}
            onSubmit={submitScan}
            active={!registering}
            scanFeedback={scanFeedback}
            hint="Scan any barcode on the book (ISBN, UPC, or internal code)."
          />
          {lookupPhase === 'ai' ? (
            <p className="rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs text-violet-900">
              {LIBRARY_ISBN_AI_LOOKUP}
            </p>
          ) : null}
          </>
        ) : (
          <p className="text-xs text-muted-foreground rounded-lg border border-dashed bg-background/60 px-3 py-1.5 text-center">
            Press <strong className="text-foreground">Resume reader</strong> {cameraEnabled ? 'or Camera Scan ' : ''}to register books.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span>
              Queue: <strong className="text-foreground">{rows.length}</strong> title{rows.length === 1 ? '' : 's'}{' '}
              <span className="font-semibold text-foreground">({totalCopiesCount} {totalCopiesCount === 1 ? 'copy' : 'copies'})</span>
            </span>
            {lookupCount > 0 ? <span>· {lookupCount} looking up</span> : null}
            {aiReviewCount > 0 ? <span className="text-violet-600">· {aiReviewCount} AI guess</span> : null}
            {readyCopiesCount > 0 ? (
              <span className="text-emerald-600 font-semibold">
                · {readyCopiesCount} {readyCopiesCount === 1 ? 'copy' : 'copies'} ready to save
              </span>
            ) : null}
            {missingTitleCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold">· ⚠️ {missingTitleCount} needs title</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Middle Queue Items Area (Scrolls only when list overflows) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-0.5">
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6 border border-dashed rounded-xl">
            Scan the first barcode or paste ISBNs to start the queue.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className={cn(
                  'flex items-start gap-2.5 rounded-xl border p-2 shadow-2xs transition-all',
                  !row.title.trim()
                    ? 'border-amber-400 bg-amber-500/5 ring-1 ring-amber-400/40'
                    : 'border-border/80 bg-card',
                )}
              >
                <div className="shrink-0">
                  <LibraryBookCover
                    coverUrl={row.coverUrl}
                    isbn={row.isbn}
                    title={row.title}
                    author={row.author}
                    aspect="thumb"
                    className="h-16 w-11 rounded-md border shadow-xs"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Input
                      value={row.title}
                      onChange={(e) =>
                        upsertRow({
                          id: row.id,
                          title: e.target.value,
                          status:
                            row.status === 'ai_review' || row.status === 'lookup' || row.status === 'saved'
                              ? row.status
                              : e.target.value.trim()
                                ? 'ready'
                                : 'needs_title',
                          // Editing a title by hand means it no longer necessarily reflects the
                          // matched record — bring back "Find this book" so it can be re-checked.
                          identifiedByLookup: false,
                          error: undefined,
                        })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && row.title.trim().length >= 2 && row.status !== 'saved' && row.status !== 'lookup') {
                          e.preventDefault();
                          void autofillRowFromTitle(row.id, row.title);
                        }
                      }}
                      placeholder={!row.title.trim() ? 'Type the book name…' : 'Book Title'}
                      disabled={row.status === 'saved' || row.status === 'lookup'}
                      className={cn(
                        'h-7 text-xs font-semibold rounded-lg flex-1 transition-all',
                        !row.title.trim() && 'border-amber-500 bg-amber-500/10 placeholder:text-amber-700/70 dark:placeholder:text-amber-300/70 focus-visible:ring-amber-500',
                      )}
                    />
                    {row.status !== 'saved' && row.status !== 'lookup' && !row.identifiedByLookup && row.title.trim().length >= 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-bold text-violet-600 dark:text-violet-400 gap-1 rounded-lg shrink-0 hover:bg-violet-500/10"
                        disabled={findingTitleId === row.id}
                        onClick={() => void autofillRowFromTitle(row.id, row.title)}
                        title="Look up this book name and fill in the rest"
                      >
                        {findingTitleId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        <span>Find this book</span>
                      </Button>
                    )}
                    <Badge
                      variant={
                        !row.title.trim()
                          ? 'outline'
                          : row.status === 'error' || row.status === 'duplicate_catalog'
                            ? 'destructive'
                            : row.status === 'saved'
                              ? 'secondary'
                              : 'outline'
                      }
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 shrink-0 rounded-md',
                        !row.title.trim() && 'border-amber-500 text-amber-700 dark:text-amber-300 font-bold bg-amber-500/10',
                        row.status === 'ai_review' && 'border-violet-500/50 text-violet-600',
                      )}
                    >
                      {row.status === 'lookup' ? <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin inline" /> : null}
                      {row.status === 'ai_review' ? <Sparkles className="mr-1 h-2.5 w-2.5 inline" /> : null}
                      {!row.title.trim() ? '⚠️ Needs title' : statusLabel[row.status]}
                    </Badge>
                    {(row.copies ?? 1) > 1 && (
                      <Badge variant="secondary" className="text-[9px] font-black px-1.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 shrink-0">
                        <Layers className="mr-1 h-2.5 w-2.5 inline" />
                        {row.copies} copies
                      </Badge>
                    )}
                    {row.status === 'ai_review' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded-lg border-violet-500/50 text-violet-600"
                        onClick={() => upsertRow({ id: row.id, status: 'ready' })}
                        aria-label="Confirm AI guess"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    {row.status !== 'saved' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive hover:bg-destructive/10"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove from queue"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {!row.title.trim() && row.status !== 'saved' ? (
                    <p className="text-[11px] text-muted-foreground">
                      Type the book name, then tap Find this book. We will fill in the rest.
                    </p>
                  ) : null}

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-semibold text-muted-foreground">Copies</span>
                      <div className="flex items-center border rounded-md overflow-hidden bg-background h-7">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-6 rounded-none text-muted-foreground hover:text-foreground px-0 shrink-0"
                          disabled={row.status === 'saved' || registering || (row.copies ?? 1) <= 1}
                          onClick={() => upsertRow({ id: row.id, copies: Math.max(1, (row.copies ?? 1) - 1) })}
                          aria-label="Decrease copies"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <Input
                          aria-label={`Copies of ${row.title || row.isbn}`}
                          type="number"
                          min={1}
                          max={25}
                          value={row.copies ?? 1}
                          disabled={row.status === 'saved' || registering}
                          onChange={(event) =>
                            upsertRow({ id: row.id, copies: Math.min(25, Math.max(1, Number(event.target.value) || 1)) })
                          }
                          className="h-7 w-8 text-xs rounded-none border-0 text-center font-bold px-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-6 rounded-none text-muted-foreground hover:text-foreground px-0 shrink-0"
                          disabled={row.status === 'saved' || registering || (row.copies ?? 1) >= 25}
                          onClick={() => upsertRow({ id: row.id, copies: Math.min(25, (row.copies ?? 1) + 1) })}
                          aria-label="Increase copies"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-semibold text-muted-foreground">Author</span>
                      <Input
                        value={row.author}
                        onChange={(e) => upsertRow({ id: row.id, author: e.target.value })}
                        placeholder="Who wrote it"
                        disabled={row.status === 'saved' || row.status === 'lookup'}
                        className="h-7 text-xs rounded-md"
                      />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-semibold text-muted-foreground">Genre</span>
                      <select
                        aria-label="Genre"
                        value={resolveBookClassification(row.category, settings.libraryGenreDefinitions).genre.id}
                        disabled={row.status === 'saved' || row.status === 'lookup'}
                        onChange={(event) => {
                          const picked = genres.find((genre) => genre.id === event.target.value);
                          if (!picked) return;
                          const res = resolveBookClassification(picked.label, settings.libraryGenreDefinitions);
                          upsertRow({
                            id: row.id,
                            category: picked.label,
                            shelfLocation: res.shelfLocation,
                          });
                        }}
                        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-medium"
                      >
                        {genres.map((genre) => (
                          <option key={genre.id} value={genre.id}>
                            {genre.label} ({genre.callPrefix})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-semibold text-muted-foreground">Shelving location</span>
                      <select
                        aria-label="Shelving location"
                        value={
                          (row.shelfLocation &&
                            (placementZones.includes(row.shelfLocation) || row.shelfLocation.trim())
                            ? row.shelfLocation
                            : placementZones[0]) || 'Main Stacks'
                        }
                        disabled={row.status === 'saved' || row.status === 'lookup'}
                        onChange={(event) => upsertRow({ id: row.id, shelfLocation: event.target.value })}
                        className="h-7 w-full rounded-md border border-input bg-background px-2 text-xs font-medium"
                      >
                        {row.shelfLocation && !placementZones.includes(row.shelfLocation) ? (
                          <option value={row.shelfLocation}>{row.shelfLocation}</option>
                        ) : null}
                        {placementZones.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <span className="text-[10px] font-semibold text-muted-foreground">
                        {isRetailIsbnBarcode(row.isbn) ? 'ISBN' : 'Barcode'}
                      </span>
                      <Input
                        value={row.isbn}
                        readOnly
                        className="h-7 text-xs font-mono bg-muted/50 rounded-md"
                        aria-label={isRetailIsbnBarcode(row.isbn) ? 'ISBN' : 'Barcode'}
                      />
                    </div>
                  </div>

                  {row.error && <p className="text-[10px] font-medium text-destructive">{row.error}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Bottom Actions Bar (Pinned at bottom, fixed!) */}
      <div className="shrink-0 pt-2 border-t flex flex-wrap items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="h-8 rounded-xl text-xs font-bold px-4"
            disabled={registering || lookupCount > 0 || readyCount === 0}
            onClick={() => void handleRegisterAll()}
          >
            {registering ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
            Register {readyCopiesCount} {readyCopiesCount === 1 ? 'copy' : 'copies'} ({readyCount} {readyCount === 1 ? 'title' : 'titles'})
          </Button>
          {rows.some((r) => r.status === 'saved') ? (
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={clearSaved}>
              Clear registered
            </Button>
          ) : null}
          {rows.length > 0 ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 rounded-xl text-xs text-muted-foreground hover:text-foreground" onClick={() => setRows([])}>
              Clear queue
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground hidden sm:block">
          Scanner active · Press Enter or scan next book
        </p>
      </div>
    </div>
  );
}
