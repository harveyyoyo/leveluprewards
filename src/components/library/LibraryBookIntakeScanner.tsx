'use client';

import { useCallback, useMemo, useState } from 'react';
import { Barcode, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import {
  catalogIsbnSet,
  isRetailIsbnBarcode,
  normalizeIsbnDigits,
  primaryIsbnVariant,
} from '@/lib/library/libraryCatalogLookup';
import {
  createScanDeduper,
  fetchCatalogHitByIsbn,
  generateUniqueLibraryUpc,
} from '@/lib/library/libraryIntakeHelpers';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import { LibraryBarcodeReaderField } from './LibraryBarcodeReaderField';

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
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');

  const existingIsbns = useMemo(() => catalogIsbnSet(libraryItems), [libraryItems]);
  const shouldAcceptScan = useMemo(() => createScanDeduper(2500), []);

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCategory('');
    setShelfLocation('');
  };

  const applyCatalogHit = useCallback(
    async (rawIsbn: string) => {
      if (!isRetailIsbnBarcode(rawIsbn)) return;
      const digits = primaryIsbnVariant(rawIsbn);
      if (existingIsbns.has(digits)) {
        toast({
          variant: 'destructive',
          title: 'Already in catalog',
          description: 'This ISBN is already registered in your library.',
        });
        return;
      }
      setBusy(true);
      try {
        const hit = await fetchCatalogHitByIsbn(digits);
        if (hit) {
          setTitle(hit.title);
          if (hit.author) setAuthor(hit.author);
          if (hit.isbn) setIsbn(hit.isbn);
          if (hit.category) setCategory(hit.category);
          toast({ title: 'Book identified', description: hit.title });
        } else {
          setIsbn(digits);
          toast({
            title: 'ISBN scanned',
            description: `No online match for ${digits}. You can still enter the title and register, or tap Lookup after fixing the number.`,
          });
        }
      } finally {
        setBusy(false);
      }
    },
    [existingIsbns, toast],
  );

  const handleScan = useCallback(
    (code: string) => {
      if (!shouldAcceptScan(code)) return;
      const digits = normalizeIsbnDigits(code.trim());
      if (isRetailIsbnBarcode(digits)) {
        void applyCatalogHit(digits);
      } else {
        toast({
          variant: 'destructive',
          title: 'Not an ISBN barcode',
          description: 'Scan the ISBN on the book (10 or 13 digits), not the school LIB checkout sticker.',
        });
      }
    },
    [applyCatalogHit, shouldAcceptScan, toast],
  );

  const { inputRef, scanBuffer, setScanBuffer, submitScan, focusReader } = useBarcodeReaderWedge({
    active: scanning,
    onScan: handleScan,
    disabled: busy,
  });

  const handleLookupManual = () => {
    const digits = normalizeIsbnDigits(isbn);
    if (!isRetailIsbnBarcode(digits)) {
      toast({ variant: 'destructive', title: 'Enter a valid ISBN (10 or 13 digits)' });
      return;
    }
    void applyCatalogHit(digits);
  };

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    const upc = await generateUniqueLibraryUpc(upcTaken);
    if (!upc) {
      toast({ variant: 'destructive', title: 'Could not generate a unique barcode' });
      return;
    }
    setBusy(true);
    try {
      await onRegister({
        name: trimmedTitle,
        upc,
        author: author.trim() || undefined,
        isbn: isbn.trim() || undefined,
        category: category.trim() || undefined,
        shelfLocation: shelfLocation.trim() || undefined,
      });
      toast({ title: 'Book registered', description: `School barcode: ${upc}` });
      resetForm();
      focusReader();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Save failed',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border bg-muted/20 p-4 space-y-4" role="region">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-primary" />
            Register one book
          </h3>
          <p className="text-xs text-muted-foreground">
            Scan the ISBN with a barcode reader. Title and author are filled from the internet when possible, then a
            unique LIB sticker barcode is generated.
          </p>
        </div>
        <Button
          type="button"
          variant={scanning ? 'secondary' : 'default'}
          size="sm"
          className="rounded-xl"
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
          inputId="library-single-register-reader"
          inputRef={inputRef}
          scanBuffer={scanBuffer}
          onScanBufferChange={setScanBuffer}
          onSubmit={submitScan}
          active={!busy}
          hint="Scan the ISBN on the book cover (not the LIB sticker)."
        />
      ) : (
        <p className="text-sm text-muted-foreground rounded-lg border border-dashed bg-background/60 px-4 py-5 text-center">
          Press <strong className="text-foreground">Start scanning</strong> to register books with the barcode reader.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Filled from ISBN lookup" />
        </div>
        <div className="space-y-1">
          <Label>Author</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>ISBN</Label>
          <div className="flex gap-2">
            <Input
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              className="font-mono"
              placeholder="From reader or type"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-lg"
              disabled={busy}
              onClick={handleLookupManual}
            >
              Lookup
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Category</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Shelf</Label>
          <Input value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} />
        </div>
      </div>

      <Button type="button" className="rounded-xl w-full sm:w-auto" disabled={busy} onClick={() => void handleSave()}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Register book &amp; generate LIB barcode
      </Button>
    </div>
  );
}
