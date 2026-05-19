'use client';

import { useEffect, useState } from 'react';
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
import { normalizeLibraryUpc } from '@/lib/libraryScanCode';

export function LibraryItemModal({
  isOpen,
  setIsOpen,
  item,
  onSave,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: LibraryItem | null;
  onSave: (data: LibraryItemInput, existingId?: string) => Promise<void>;
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
  const { toast } = useToast();
  const playSound = useArcadeSound();
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

  const handleSave = async () => {
    const trimmedName = name.trim();
    const normalizedUpc = normalizeLibraryUpc(upc);
    if (!trimmedName) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Title is required' });
      return;
    }
    if (!normalizedUpc) {
      playSound('error');
      toast({ variant: 'destructive', title: 'Barcode / UPC is required' });
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
      toast({ title: isEditing ? 'Item updated' : 'Item added' });
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        size="md"
        className="flex max-h-[var(--dialog-max-h,min(90vh,calc(100dvh-2rem)))] flex-col overflow-hidden p-0"
      >
        <DialogHeader className="border-b px-6 pb-4 pt-6">
          <DialogTitle>{isEditing ? 'Edit library item' : 'Add library item'}</DialogTitle>
          <DialogDescription>
            Use a LIB barcode for school copies, or scan ISBN on the intake camera to auto-fill. Students check out by scanning their card, then the book.
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
              <Input
                id="lib-upc"
                value={upc}
                onChange={(e) => setUpc(e.target.value)}
                placeholder="Unique scan code"
                className="font-mono"
              />
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
        <DialogFooter className="border-t bg-muted/30 px-6 py-4">
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
