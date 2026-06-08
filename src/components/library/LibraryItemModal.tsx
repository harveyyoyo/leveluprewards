'use client';

import { useEffect, useState } from 'react';
import { Barcode, Loader2, Printer } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { generateUniqueLibraryUpc } from '@/lib/library/libraryIntakeHelpers';
import { isSchoolLibraryBarcode, normalizeLibraryUpc, type LibraryLabelFormat } from '@/lib/library/libraryScanCode';
import { usePrint } from '@/components/providers/PrintProvider';

export function LibraryItemModal({
  isOpen,
  setIsOpen,
  item,
  onSave,
  upcTaken,
  schoolId,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: LibraryItem | null;
  onSave: (data: LibraryItemInput, existingId?: string) => Promise<void>;
  upcTaken?: (upc: string, excludeId?: string) => Promise<boolean>;
  schoolId?: string | null;
}) {
  const [name, setName] = useState('');
  const [upc, setUpc] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [category, setCategory] = useState('');
  const [shelfLocation, setShelfLocation] = useState('');
  const [copyNumber, setCopyNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { setLibraryStickersToPrint } = usePrint();
  const isEditing = !!item;

  useEffect(() => {
    if (!isOpen) return;
    if (item) {
      setName(item.name);
      setUpc(item.upc);
      setAuthor(item.author ?? '');
      setIsbn(item.isbn ?? '');
      setCategory(item.category ?? '');
      setShelfLocation(item.shelfLocation ?? '');
      setCopyNumber(item.copyNumber ?? '');
      setNotes(item.notes ?? '');
    } else {
      setName('');
      setUpc('');
      setAuthor('');
      setIsbn('');
      setCategory('');
      setShelfLocation('');
      setCopyNumber('');
      setNotes('');
    }
  }, [item, isOpen]);

  const trimOptional = (v: string) => {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };

  const handleGenerateBarcode = async () => {
    if (!upcTaken) {
      toast({
        variant: 'destructive',
        title: 'Cannot generate barcode',
        description: 'Barcode uniqueness check is not available on this screen.',
      });
      return;
    }
    setGenerating(true);
    try {
      const candidate = await generateUniqueLibraryUpc((code) => upcTaken(code, item?.id));
      if (!candidate) {
        playSound('error');
        toast({ variant: 'destructive', title: 'Could not generate a unique barcode' });
        return;
      }
      setUpc(candidate);
      playSound('success');
      toast({
        title: 'Barcode generated',
        description: `${candidate} — save the item, then print a LIB sticker label.`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintLabel = (format: LibraryLabelFormat = 'sticker') => {
    const trimmedName = name.trim();
    const normalizedUpc = normalizeLibraryUpc(upc);
    const sid = (schoolId ?? '').trim();
    if (!trimmedName || !normalizedUpc) {
      toast({ variant: 'destructive', title: 'Enter a title and barcode first' });
      return;
    }
    if (!sid) {
      toast({ variant: 'destructive', title: 'Cannot print labels', description: 'Missing schoolId.' });
      return;
    }
    const printItem: LibraryItem = item ?? {
      id: 'draft-label',
      name: trimmedName,
      upc: normalizedUpc,
      status: 'available',
      author: trimOptional(author),
      isbn: trimOptional(isbn),
      category: trimOptional(category),
      shelfLocation: trimOptional(shelfLocation),
      copyNumber: trimOptional(copyNumber),
      notes: trimOptional(notes),
      checkedOutTo: null,
      checkedOutAt: null,
      dueAt: null,
      createdAt: Date.now(),
    };
    setLibraryStickersToPrint([printItem], { format, schoolId: sid });
    toast({ title: 'Printing label', description: normalizedUpc });
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    let normalizedUpc = normalizeLibraryUpc(upc);
    if (!trimmedName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    if (!normalizedUpc && upcTaken) {
      normalizedUpc = (await generateUniqueLibraryUpc((code) => upcTaken(code, item?.id))) ?? '';
    }
    if (!normalizedUpc) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Barcode required',
        description: 'Generate a LIB barcode or enter an existing scan code.',
      });
      return;
    }

    const payload: LibraryItemInput = {
      name: trimmedName,
      upc: normalizedUpc,
      author: trimOptional(author),
      isbn: trimOptional(isbn),
      category: trimOptional(category),
      shelfLocation: trimOptional(shelfLocation),
      copyNumber: trimOptional(copyNumber),
      notes: trimOptional(notes),
    };

    setSaving(true);
    try {
      await onSave(payload, item?.id);
      playSound('success');
      if (isSchoolLibraryBarcode(normalizedUpc)) {
        toast({
          title: isEditing ? 'Item updated' : 'Item added',
          description: `${normalizedUpc} — print a LIB sticker from the catalog or use Print label below.`,
        });
      } else {
        toast({ title: isEditing ? 'Item updated' : 'Item added' });
      }
      setIsOpen(false);
    } catch (e) {
      playSound('error');
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Save failed.',
      });
    } finally {
      setSaving(false);
    }
  };

  const normalizedUpc = normalizeLibraryUpc(upc);
  const showLibPrint = Boolean(normalizedUpc && isSchoolLibraryBarcode(normalizedUpc) && schoolId);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        size="md"
        className="flex max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>{isEditing ? 'Edit library item' : 'Add library item'}</DialogTitle>
          <DialogDescription>
            Items without a barcode can generate a LIB code. Books scanned on the Book Intake tab use their own ISBN/barcode for checkout when possible.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="lib-name">Title / item name</Label>
              <Input id="lib-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Book or equipment name" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-upc">Barcode / UPC</Label>
              <div className="flex gap-2">
                <Input
                  id="lib-upc"
                  value={upc}
                  onChange={(e) => setUpc(e.target.value)}
                  placeholder="Scan code or generate LIB"
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-lg gap-1"
                  disabled={generating || saving || !upcTaken}
                  onClick={() => void handleGenerateBarcode()}
                  title="Generate a unique LIB barcode"
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Barcode className="h-4 w-4" />}
                  Generate
                </Button>
              </div>
              {!upc.trim() ? (
                <p className="text-[11px] text-muted-foreground">
                  Leave blank to auto-generate a LIB barcode on save, or tap Generate now.
                </p>
              ) : showLibPrint ? (
                <p className="text-[11px] text-muted-foreground">LIB sticker barcode — print a label after saving.</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-copy">Copy # (optional)</Label>
              <Input id="lib-copy" value={copyNumber} onChange={(e) => setCopyNumber(e.target.value)} placeholder="1, A, etc." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-author">Author</Label>
              <Input id="lib-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-category">Category</Label>
              <Input id="lib-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Fiction, STEM, etc." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-isbn">ISBN</Label>
              <Input id="lib-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-shelf">Shelf / location</Label>
              <Input id="lib-shelf" value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} placeholder="A-12, Room 204" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="lib-notes">Notes (staff only)</Label>
              <Textarea id="lib-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            {isEditing && item ? (
              <div className="sm:col-span-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Status: </span>
                {item.status === 'checked_out' ? 'Checked out' : 'Available'}
                {item.status === 'checked_out' && item.checkedOutAt
                  ? ` · since ${new Date(item.checkedOutAt).toLocaleString()}`
                  : null}
              </div>
            ) : null}
          </div>
        </div>
        <DialogFooter className="border-t bg-muted/30 px-6 py-4 flex-wrap gap-2">
          {showLibPrint ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl gap-1.5 mr-auto"
              disabled={saving || !name.trim()}
              onClick={() => handlePrintLabel('sticker')}
            >
              <Printer className="h-4 w-4" /> Print label
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
