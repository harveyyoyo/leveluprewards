'use client';

import React, { useCallback, useState } from 'react';
import { Camera, Loader2, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useToast } from '@/hooks/use-toast';
import { lookupBookByIsbn } from '@/lib/libraryCatalogLookup';
import { generateLibraryBarcode } from '@/lib/libraryScanCode';
import type { LibraryItemInput } from '@/lib/types';

export function LibraryBookIntakeScanner({
  onRegister,
  upcTaken,
}: {
  onRegister: (data: LibraryItemInput) => Promise<void>;
  upcTaken: (upc: string) => Promise<boolean>;
}) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setIsbn('');
    setCategory('');
    setShelfLocation('');
  };

  const applyCatalogHit = useCallback(
    async (rawIsbn: string) => {
      const digits = rawIsbn.replace(/\D/g, '');
      if (digits.length < 10) return;
      setBusy(true);
      try {
        const hit = await lookupBookByIsbn(digits);
        if (hit) {
          setTitle(hit.title);
          if (hit.author) setAuthor(hit.author);
          if (hit.isbn) setIsbn(hit.isbn);
          if (hit.category) setCategory(hit.category);
          toast({ title: 'Book found', description: hit.title });
        } else {
          setIsbn(digits);
          toast({ title: 'ISBN scanned', description: 'Enter title and author manually if needed.' });
        }
      } finally {
        setBusy(false);
      }
    },
    [toast],
  );

  const handleScan = useCallback(
    (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length >= 10) {
        void applyCatalogHit(digits);
      } else {
        toast({
          variant: 'destructive',
          title: 'Not an ISBN',
          description: 'Scan the ISBN barcode on the back of the book, or add the item manually.',
        });
      }
    },
    [applyCatalogHit, toast],
  );

  const { videoRef, hasCameraPermission } = useBarcodeScanner(scanning, handleScan, (err) => {
    setScanning(false);
    toast({ variant: 'destructive', title: 'Camera error', description: err });
  });

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    let upc = '';
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = generateLibraryBarcode();
      if (!(await upcTaken(candidate))) {
        upc = candidate;
        break;
      }
    }
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
      toast({ title: 'Book registered', description: `Barcode: ${upc}` });
      resetForm();
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
            Scan to register
          </h3>
          <p className="text-xs text-muted-foreground">
            Scan the book ISBN with the camera. A unique LIB barcode is generated for checkout.
          </p>
        </div>
        <Button
          type="button"
          variant={scanning ? 'secondary' : 'outline'}
          size="sm"
          className="rounded-xl"
          onClick={() => setScanning((v) => !v)}
        >
          <Camera className="mr-2 h-4 w-4" />
          {scanning ? 'Stop camera' : 'Start camera'}
        </Button>
      </div>

      {scanning ? (
        <div className="relative aspect-video max-h-48 overflow-hidden rounded-lg border bg-black">
          <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="h-full w-full object-cover" playsInline muted />
          {!hasCameraPermission ? (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
              Allow camera access to scan ISBN
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1 sm:col-span-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Book title" />
        </div>
        <div className="space-y-1">
          <Label>Author</Label>
          <Input value={author} onChange={(e) => setAuthor(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>ISBN</Label>
          <Input
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
            className="font-mono"
            placeholder="Scan or type"
          />
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
        Register book &amp; generate barcode
      </Button>
    </div>
  );
}
