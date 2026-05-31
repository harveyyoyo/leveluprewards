'use client';

import { useCallback, useMemo, useState } from 'react';
import { Barcode, Layers, Loader2, Trash2 } from 'lucide-react';
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
  createScanDeduper,
  fetchCatalogHitByIsbn,
  generateUniqueLibraryUpc,
} from '@/lib/library/libraryIntakeHelpers';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';

type BulkRowStatus =
  | 'lookup'
  | 'ready'
  | 'needs_title'
  | 'duplicate_catalog'
  | 'saved'
  | 'error';

type BulkRow = {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  status: BulkRowStatus;
  error?: string;
};

function newRowId() {
  return `bulk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function LibraryBookBulkIntakeScanner({
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
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [registering, setRegistering] = useState(false);

  const catalogIsbns = useMemo(() => catalogIsbnSet(libraryItems), [libraryItems]);
  const shouldAcceptScan = useMemo(() => createScanDeduper(2000), []);

  const upsertRow = useCallback((patch: Partial<BulkRow> & { id: string }) => {
    setRows((prev) => prev.map((r) => (r.id === patch.id ? { ...r, ...patch } : r)));
  }, []);

  const addScanToQueue = useCallback(
    async (rawCode: string) => {
      if (!isRetailIsbnBarcode(rawCode)) {
        toast({
          variant: 'destructive',
          title: 'Not an ISBN barcode',
          description: 'Scan the retail ISBN on the book, not a LIB checkout sticker.',
        });
        return;
      }
      const digits = primaryIsbnVariant(rawCode);
      if (catalogIsbns.has(digits)) {
        toast({ variant: 'destructive', title: 'Already in catalog', description: `ISBN ${digits} is already registered.` });
        return;
      }

      const id = newRowId();
      let duplicateInQueue = false;
      setRows((prev) => {
        if (prev.some((r) => r.isbn === digits)) {
          duplicateInQueue = true;
          return prev;
        }
        return [
          {
            id,
            isbn: digits,
            title: '',
            author: '',
            category: '',
            status: 'lookup' as const,
          },
          ...prev,
        ];
      });
      if (duplicateInQueue) {
        toast({ title: 'Already in queue', description: `ISBN ${digits} was scanned already.` });
        return;
      }

      const hit = await fetchCatalogHitByIsbn(digits);
      if (hit?.title) {
        upsertRow({
          id,
          title: hit.title,
          author: hit.author ?? '',
          category: hit.category ?? '',
          status: 'ready',
        });
        toast({ title: 'Book identified', description: hit.title });
      } else {
        upsertRow({ id, status: 'needs_title' });
        toast({
          title: 'ISBN added',
          description: `No online match for ${digits}. Type a title, or edit the ISBN and try again.`,
        });
      }
    },
    [catalogIsbns, toast, upsertRow],
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
    if (!toSave.length) {
      toast({ variant: 'destructive', title: 'Nothing to register', description: 'Scan ISBN barcodes first.' });
      return;
    }

    setRegistering(true);
    let saved = 0;
    for (const row of toSave) {
      upsertRow({ id: row.id, status: 'lookup' });
      const upc = await generateUniqueLibraryUpc(upcTaken);
      if (!upc) {
        upsertRow({ id: row.id, status: 'error', error: 'Could not generate LIB barcode' });
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
    focusReader();
    toast({
      title: 'Bulk register complete',
      description: `${saved} of ${toSave.length} book(s) added to the catalog.`,
    });
  };

  const statusLabel: Record<BulkRowStatus, string> = {
    lookup: 'Looking up…',
    ready: 'Ready',
    needs_title: 'Needs title',
    duplicate_catalog: 'In catalog',
    saved: 'Registered',
    error: 'Error',
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4" role="region" aria-label="Bulk barcode register">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Bulk register
          </h3>
          <p className="text-xs text-muted-foreground">
            Keep scanning ISBNs with your barcode reader. Each book is looked up online. Register all when finished.
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
          inputId="library-bulk-register-reader"
          inputRef={inputRef}
          scanBuffer={scanBuffer}
          onScanBufferChange={setScanBuffer}
          onSubmit={submitScan}
          active={!registering}
          hint="Scan each ISBN on the book cover. Books are added to the queue below."
        />
      ) : (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed bg-background/60 px-4 py-5 text-center">
          Press <strong className="text-foreground">Start scanning</strong> to scan ISBNs into the queue.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>
          Queue: <strong className="text-foreground">{rows.length}</strong>
        </span>
        {lookupCount > 0 ? <span>· {lookupCount} looking up</span> : null}
        {readyCount > 0 ? <span>· {readyCount} ready to save</span> : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
          Scan the first ISBN with your barcode reader to start the queue.
        </p>
      ) : (
        <ul className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {rows.map((row) => (
            <li
              key={row.id}
              className="grid gap-2 rounded-lg border bg-background/80 p-2 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  value={row.title}
                  onChange={(e) =>
                    upsertRow({
                      id: row.id,
                      title: e.target.value,
                      status: e.target.value.trim() ? 'ready' : row.status === 'saved' ? 'saved' : 'needs_title',
                    })
                  }
                  placeholder="Title"
                  disabled={row.status === 'saved' || row.status === 'lookup'}
                  className="h-8 text-sm sm:col-span-2"
                />
                <Input
                  value={row.author}
                  onChange={(e) => upsertRow({ id: row.id, author: e.target.value })}
                  placeholder="Author"
                  disabled={row.status === 'saved' || row.status === 'lookup'}
                  className="h-8 text-sm"
                />
                <Input value={row.isbn} readOnly className="h-8 text-sm font-mono bg-muted/50" aria-label="ISBN" />
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
                  className="text-[10px] shrink-0"
                >
                  {row.status === 'lookup' ? <Loader2 className="mr-1 h-3 w-3 animate-spin inline" /> : null}
                  {statusLabel[row.status]}
                </Badge>
                {row.status !== 'saved' ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
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
          Register all ({readyCount})
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
