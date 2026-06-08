'use client';

import { useCallback, useMemo, useState } from 'react';
import { Barcode, Check, Loader2, ScanLine, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import {
  catalogIsbnSet,
  isRetailIsbnBarcode,
  primaryIsbnVariant,
} from '@/lib/library/libraryCatalogLookup';
import {
  catalogScannedCodeSet,
  createScanDeduper,
  fetchCatalogHitByIsbn,
  resolveIntakeCheckoutUpc,
  isBlockedLibraryIntakeBarcode,
  normalizeIntakeScanCode,
} from '@/lib/library/libraryIntakeHelpers';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import {
  LibraryBarcodeReaderField,
  type LibraryScanFeedback,
} from './LibraryBarcodeReaderField';

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
  status: IntakeRowStatus;
  error?: string;
};

function newRowId() {
  return `intake-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function lookupFailureMessage(scannedCode: string, meta: Awaited<ReturnType<typeof fetchCatalogHitByIsbn>>['meta']) {
  if (!meta.aiConfigured) {
    return `No catalog record for ${scannedCode}. AI lookup is not configured — add OPENAI_API_KEY or GEMINI_API_KEY to .env.local.`;
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
  upcTaken,
  libraryItems,
}: {
  onRegister: (data: LibraryItemInput) => Promise<void>;
  upcTaken: (upc: string) => Promise<boolean>;
  libraryItems?: LibraryItem[] | null;
}) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState<IntakeRow[]>([]);
  const [registering, setRegistering] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<LibraryScanFeedback | null>(null);

  const catalogIsbns = useMemo(() => catalogIsbnSet(libraryItems), [libraryItems]);
  const catalogScannedCodes = useMemo(() => catalogScannedCodeSet(libraryItems), [libraryItems]);
  const shouldAcceptScan = useMemo(() => createScanDeduper(2000), []);

  const upsertRow = useCallback((patch: Partial<IntakeRow> & { id: string }) => {
    setRows((prev) => prev.map((r) => (r.id === patch.id ? { ...r, ...patch } : r)));
  }, []);

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

      const isIsbn = isRetailIsbnBarcode(trimmed);
      const scannedCode = isIsbn ? primaryIsbnVariant(trimmed) : trimmed;
      const codeKey = scannedCode.toUpperCase();

      if (isIsbn && catalogIsbns.has(scannedCode)) {
        setScanFeedback({
          code: scannedCode,
          status: 'duplicate',
          message: 'This ISBN is already registered in your library.',
        });
        toast({
          variant: 'destructive',
          title: 'Already in catalog',
          description: `ISBN ${scannedCode} is already registered.`,
        });
        return;
      }
      if (!isIsbn && catalogScannedCodes.has(codeKey)) {
        setScanFeedback({
          code: scannedCode,
          status: 'duplicate',
          message: 'This barcode is already registered in your library.',
        });
        toast({
          variant: 'destructive',
          title: 'Already in catalog',
          description: `Barcode ${scannedCode} is already registered.`,
        });
        return;
      }

      const id = newRowId();
      let duplicateInQueue = false;
      setRows((prev) => {
        if (prev.some((r) => r.isbn.toUpperCase() === codeKey)) {
          duplicateInQueue = true;
          return prev;
        }
        return [
          {
            id,
            isbn: scannedCode,
            title: '',
            author: '',
            category: '',
            status: isIsbn ? ('lookup' as const) : ('needs_title' as const),
          },
          ...prev,
        ];
      });

      if (duplicateInQueue) {
        setScanFeedback({
          code: scannedCode,
          status: 'duplicate',
          message: 'This barcode is already in the queue.',
        });
        toast({ title: 'Already in queue', description: `${scannedCode} was scanned already.` });
        return;
      }

      setScanFeedback({ code: scannedCode, status: 'looking_up' });

      if (!isIsbn) {
        setScanFeedback({
          code: scannedCode,
          status: 'needs_title',
          message: 'Not an ISBN — type a title in the queue below.',
        });
        return;
      }

      try {
        const { hit, meta } = await fetchCatalogHitByIsbn(scannedCode);
        if (hit?.title) {
          const isAiGuess = hit.source === 'ai';
          upsertRow({
            id,
            title: hit.title,
            author: hit.author ?? '',
            category: hit.category ?? '',
            status: isAiGuess ? 'ai_review' : 'ready',
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
      }
    },
    [catalogIsbns, catalogScannedCodes, toast, upsertRow],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      void addScanToQueue(code);
    },
    [addScanToQueue, shouldAcceptScan],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: scanning,
    onScan: handleScan,
    disabled: registering,
  });

  const removeRow = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));
  const clearSaved = () => setRows((prev) => prev.filter((r) => r.status !== 'saved'));

  const readyCount = rows.filter((r) => r.status === 'ready' || r.status === 'needs_title').length;
  const lookupCount = rows.filter((r) => r.status === 'lookup').length;
  const aiReviewCount = rows.filter((r) => r.status === 'ai_review').length;

  const handleRegisterAll = async () => {
    const toSave = rows.filter((r) => r.status === 'ready' || (r.status === 'needs_title' && r.title.trim()));
    const missingTitle = rows.filter((r) => r.status === 'needs_title' && !r.title.trim());
    if (missingTitle.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Titles required',
        description: `${missingTitle.length} book(s) need a title before registering.`,
      });
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
    if (!toSave.length) {
      toast({
        variant: 'destructive',
        title: 'Nothing to register',
        description: 'Scan barcodes and add titles first.',
      });
      return;
    }

    setRegistering(true);
    let saved = 0;
    for (const row of toSave) {
      upsertRow({ id: row.id, status: 'lookup' });
      const upc = await resolveIntakeCheckoutUpc(row.isbn, upcTaken);
      if (!upc) {
        upsertRow({
          id: row.id,
          status: 'error',
          error: row.isbn.trim() ? 'Barcode already in catalog' : 'Could not generate checkout barcode',
        });
        continue;
      }
      try {
        await onRegister({
          name: row.title.trim(),
          upc,
          author: row.author.trim() || undefined,
          isbn: row.isbn,
          category: row.category.trim() || undefined,
        });
        upsertRow({ id: row.id, status: 'saved' });
        saved += 1;
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
      description: `${saved} of ${toSave.length} book(s) added to the catalog.`,
    });
  };

  const statusLabel: Record<IntakeRowStatus, string> = {
    lookup: 'Looking up…',
    ready: 'Ready',
    ai_review: 'Confirm AI guess',
    needs_title: 'Identify item',
    duplicate_catalog: 'In catalog',
    saved: 'Registered',
    error: 'Error',
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4" role="region" aria-label="Book intake scanner">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Book intake
          </h3>
          <p className="text-xs text-muted-foreground">
            Scan one or many barcodes with your reader. ISBNs are looked up online; other codes need a title in the
            queue. Each book&apos;s own barcode is used for checkout.
          </p>
        </div>
        <Button
          type="button"
          variant={scanning ? 'secondary' : 'default'}
          size="sm"
          className="rounded-xl"
          disabled={registering}
          onClick={() => {
            setScanning((on) => {
              const next = !on;
              if (next) {
                setScanFeedback(null);
                setTimeout(() => focusReader(), 0);
              }
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
          inputId="library-intake-reader"
          inputRef={inputRef}
          scanBuffer={scanBuffer}
          onScanBufferChange={setScanBuffer}
          onSubmit={submitScan}
          active={!registering}
          scanFeedback={scanFeedback}
          hint="Scan any barcode on the book (ISBN, UPC, or internal code)."
        />
      ) : (
        <p className="text-sm text-muted-foreground rounded-xl border border-dashed bg-background/60 px-4 py-5 text-center">
          Press <strong className="text-foreground">Start scanning</strong> to register books with the barcode reader.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Queue: <strong className="text-foreground">{rows.length}</strong>
        </span>
        {lookupCount > 0 ? <span>· {lookupCount} looking up</span> : null}
        {aiReviewCount > 0 ? <span className="text-violet-600">· {aiReviewCount} AI guess to confirm</span> : null}
        {readyCount > 0 ? <span>· {readyCount} ready to save</span> : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-xl">
          Scan the first barcode to start the queue.
        </p>
      ) : (
        <ul className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid gap-2 rounded-xl border bg-background/80 p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid gap-2 sm:grid-cols-2">
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
                    })
                  }
                  placeholder="Title"
                  disabled={row.status === 'saved' || row.status === 'lookup'}
                  className="h-8 text-sm sm:col-span-2 rounded-lg"
                />
                <Input
                  value={row.author}
                  onChange={(e) => upsertRow({ id: row.id, author: e.target.value })}
                  placeholder="Author"
                  disabled={row.status === 'saved' || row.status === 'lookup'}
                  className="h-8 text-sm rounded-lg"
                />
                <Input
                  value={row.isbn}
                  readOnly
                  className="h-8 text-sm font-mono bg-muted/50 rounded-lg"
                  aria-label={isRetailIsbnBarcode(row.isbn) ? 'ISBN' : 'Barcode'}
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <Badge
                  variant={
                    row.status === 'error' || row.status === 'duplicate_catalog'
                      ? 'destructive'
                      : row.status === 'saved'
                        ? 'secondary'
                        : 'outline'
                  }
                  className={`text-[10px] shrink-0 rounded-lg ${
                    row.status === 'ai_review' ? 'border-violet-500/50 text-violet-600' : ''
                  }`}
                >
                  {row.status === 'lookup' ? <Loader2 className="mr-1 h-3 w-3 animate-spin inline" /> : null}
                  {row.status === 'ai_review' ? <Sparkles className="mr-1 h-3 w-3 inline" /> : null}
                  {statusLabel[row.status]}
                </Badge>
                {row.status === 'ai_review' ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg border-violet-500/50 text-violet-600"
                    onClick={() => upsertRow({ id: row.id, status: 'ready' })}
                    aria-label="Confirm AI guess"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
                {row.status !== 'saved' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive"
                    onClick={() => removeRow(row.id)}
                    aria-label="Remove from queue"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                ) : null}
              </div>
              {row.error ? <p className="text-[10px] text-destructive sm:col-span-2">{row.error}</p> : null}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-xl"
          disabled={registering || lookupCount > 0 || readyCount === 0}
          onClick={() => void handleRegisterAll()}
        >
          {registering ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Register {readyCount === 1 ? 'book' : 'all'} ({readyCount})
        </Button>
        {rows.some((r) => r.status === 'saved') ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={clearSaved}>
            Clear registered
          </Button>
        ) : null}
        {rows.length > 0 ? (
          <Button type="button" variant="ghost" className="rounded-xl" onClick={() => setRows([])}>
            Clear queue
          </Button>
        ) : null}
      </div>
    </div>
  );
}
