'use client';

import React, { useState, useMemo } from 'react';
import { useFirestore, useFunctions } from '@/firebase';
import { callLibrary } from '@/lib/library/libraryOperations';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  LIBRARY_LABEL_OPTIONS,
  getLibraryLabelOption,
  type LibraryLabelFormat,
} from '@/lib/library/libraryScanCode';
import { LibraryBarcodeSticker } from '@/components/print/LibraryBarcodeSticker';
import { usePrint } from '@/components/providers/PrintProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem } from '@/lib/types';
import { Printer, Check, Copy, ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryPrintLabelsModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  items: LibraryItem[];
  schoolId: string | null;
  schoolName?: string;
}

export function LibraryPrintLabelsModal({
  isOpen,
  setIsOpen,
  items,
  schoolId,
  schoolName = 'School Library',
}: LibraryPrintLabelsModalProps) {
  const { setLibraryStickersToPrint } = usePrint();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const functions = useFunctions();
  const { toast } = useToast();

  const defaultFormat = (settings.libraryLabelFormat as LibraryLabelFormat) || 'sticker';
  const [selectedFormat, setSelectedFormat] = useState<LibraryLabelFormat>(defaultFormat);
  const [copies, setCopies] = useState<number>(1);
  const [startOffset, setStartOffset] = useState<number>(0);
  const [previewIndex, setPreviewIndex] = useState<number>(0);

  // Fallback sample item if no items provided
  const sampleItem: LibraryItem = useMemo(
    () => ({
      id: 'preview_sample',
      name: 'Harry Potter and the Sorcerer’s Stone',
      author: 'J.K. Rowling',
      upc: 'LIB10293847',
      category: 'Fantasy',
      shelfLocation: 'A-ROW-2',
      copyNumber: '1',
      status: 'available',
      publishedYear: '1997',
      description: 'A young wizard begins his journey at Hogwarts School of Witchcraft and Wizardry.',
      createdAt: Date.now(),
      checkedOutTo: null,
      checkedOutAt: null,
      dueAt: null,
    }),
    [],
  );

  const activeItem = items[previewIndex] || items[0] || sampleItem;
  const currentOption = getLibraryLabelOption(selectedFormat);

  const totalLabels = (items.length || 1) * copies;
  const sheetsNeeded =
    selectedFormat === 'thermal'
      ? totalLabels
      : Math.ceil((totalLabels + startOffset) / currentOption.itemsPerPage);

  const handlePrint = () => {
    if (!schoolId) {
      toast({
        variant: 'destructive',
        title: 'Cannot print labels',
        description: 'Missing school ID.',
      });
      return;
    }

    const baseItems = items.length ? items : [sampleItem];
    const finalItems: LibraryItem[] = [];
    for (const it of baseItems) {
      for (let c = 0; c < copies; c++) {
        finalItems.push(it);
      }
    }

    setLibraryStickersToPrint(finalItems, {
      schoolId,
      format: selectedFormat,
      startOffset: selectedFormat === 'thermal' ? 0 : startOffset,
    });

    // Only a trusted Cloud Function can flip "labeled" — firestore.rules blocks direct client
    // writes to library/{itemId}. The catalog's live Firestore listener picks up the change once
    // this resolves, so there's no need to (and no safe way to) optimistically mutate it here.
    if (schoolId && items.length > 0) {
      for (const it of items) {
        if (it.id && it.id !== 'preview_sample') {
          callLibrary(functions, 'libraryCirculation', { schoolId, itemId: it.id, action: 'label' }).catch(() => {
            toast({
              variant: 'destructive',
              title: 'Label not saved',
              description: `Couldn't mark "${it.name}" as labeled. It'll still show as unlabeled in the catalog.`,
            });
          });
        }
      }
    }

    toast({
      title: 'Printing Library Labels',
      description: `${finalItems.length} label(s) sent to print (${currentOption.shortName}).`,
    });

    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
        <DialogHeader className="p-6 pb-4 bg-muted/30 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black tracking-tight text-foreground">
                  Print Library Labels &amp; Barcodes
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Choose your sticker sheet format, specify copies, or skip already peeled labels.
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-bold text-xs bg-background">
                {items.length || 1} Book{items.length === 1 ? '' : 's'}
              </Badge>
              <Badge variant="secondary" className="font-bold text-xs">
                {totalLabels} Total Label{totalLabels === 1 ? '' : 's'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[72vh] overflow-y-auto divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Left Column: Format Picker & Print Options */}
          <div className="md:col-span-7 p-6 space-y-5">
            <div>
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 block">
                Select Label Format ({LIBRARY_LABEL_OPTIONS.length} sizes)
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LIBRARY_LABEL_OPTIONS.map((opt) => {
                  const isSelected = selectedFormat === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedFormat(opt.id)}
                      className={cn(
                        'text-left p-3 rounded-xl border transition-all relative flex flex-col justify-between group',
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs'
                          : 'border-border/70 hover:border-primary/50 hover:bg-muted/30 bg-card',
                      )}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-bold text-xs text-foreground group-hover:text-primary transition-colors">
                            {opt.shortName}
                          </span>
                          {isSelected && (
                            <span className="h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {opt.description}
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 text-[10px]">
                        <span className="font-mono text-muted-foreground font-semibold">
                          {opt.dimensions}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-[9px] px-1.5 py-0 h-4 font-bold',
                            isSelected ? 'bg-primary/15 text-primary' : '',
                          )}
                        >
                          {opt.badge}
                        </Badge>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Print Configuration Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="label-copies" className="text-xs font-bold flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Copies per Book</span>
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="label-copies"
                    type="number"
                    min={1}
                    max={20}
                    value={copies}
                    onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="h-9 rounded-xl font-bold text-xs"
                  />
                  <div className="flex gap-1">
                    {[1, 2, 3].map((num) => (
                      <Button
                        key={num}
                        type="button"
                        size="sm"
                        variant={copies === num ? 'default' : 'outline'}
                        onClick={() => setCopies(num)}
                        className="h-9 w-9 p-0 text-xs font-bold rounded-xl"
                      >
                        {num}
                      </Button>
                    ))}
                  </div>
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Prints extra stickers for multiple copies or replacement backup tags.
                </p>
              </div>

              {selectedFormat !== 'thermal' && (
                <div className="space-y-1.5">
                  <Label htmlFor="label-offset" className="text-xs font-bold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Start Position Offset</span>
                  </Label>
                  <Input
                    id="label-offset"
                    type="number"
                    min={0}
                    max={currentOption.itemsPerPage - 1}
                    value={startOffset}
                    onChange={(e) =>
                      setStartOffset(
                        Math.max(
                          0,
                          Math.min(
                            currentOption.itemsPerPage - 1,
                            parseInt(e.target.value, 10) || 0,
                          ),
                        ),
                      )
                    }
                    className="h-9 rounded-xl font-bold text-xs"
                  />
                  <p className="text-[10.5px] text-muted-foreground">
                    Skip {startOffset} previously peeled label{startOffset === 1 ? '' : 's'} on page 1 to save paper.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Interactive Sticker Preview */}
          <div className="md:col-span-5 p-6 bg-muted/15 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Live Label Preview
                  </span>
                </div>
                {items.length > 1 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-md"
                      disabled={previewIndex === 0}
                      onClick={() => setPreviewIndex((i) => Math.max(0, i - 1))}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                      {previewIndex + 1}/{items.length}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 rounded-md"
                      disabled={previewIndex >= items.length - 1}
                      onClick={() => setPreviewIndex((i) => Math.min(items.length - 1, i + 1))}
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Preview Container simulating physical label */}
              <div className="bg-white dark:bg-slate-900 border border-border/80 rounded-xl p-4 shadow-inner flex items-center justify-center min-h-[220px] overflow-hidden">
                <div className="scale-95 transform-gpu transition-all origin-center">
                  <LibraryBarcodeSticker
                    item={activeItem}
                    schoolName={schoolName}
                    format={selectedFormat}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Sheet Standard:</span>
                  <span className="font-semibold text-foreground">{currentOption.sheetType}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Physical Size:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {currentOption.dimensions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Sheets Needed:</span>
                  <span className="font-bold text-primary">
                    {sheetsNeeded} {selectedFormat === 'thermal' ? 'Label(s)' : 'Page(s)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground text-center">
              Works with standard laser/inkjet printers, Avery sheets, and continuous thermal roll printers.
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/30 border-t flex items-center justify-between gap-3 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsOpen(false)}
            className="rounded-xl text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            className="rounded-xl text-xs font-bold gap-2 px-5 shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Printer className="h-4 w-4" />
            <span>
              Print {totalLabels} Label{totalLabels === 1 ? '' : 's'} ({currentOption.shortName})
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
