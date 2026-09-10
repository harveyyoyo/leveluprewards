'use client';

import { useEffect, useRef, useState } from 'react';
import { Barcode, BookOpen, ChevronDown, CopyPlus, Loader2, MapPin, Printer, Search, Sparkles, Trash2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { LibraryItem, LibraryItemInput } from '@/lib/types';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { generateUniqueLibraryUpc, fetchCatalogHitByIsbn, fetchCatalogHitsByTitle } from '@/lib/library/libraryIntakeHelpers';
import {
  isSchoolLibraryBarcode,
  normalizeLibraryUpc,
  LIBRARY_LABEL_OPTIONS,
  getLibraryLabelOption,
  type LibraryLabelFormat,
} from '@/lib/library/libraryScanCode';
import { usePrint } from '@/components/providers/PrintProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { LibraryCatalogHit } from '@/lib/library/libraryCatalogLookup';
import { LibraryBookCover } from './LibraryBookCover';
import { resolveCoverByIsbn } from '@/lib/library/libraryCoverResolver';
import {
  generateGenreBarcode,
  resolveBookClassification,
  DEFAULT_LIBRARY_PLACEMENT_ZONES,
  getActiveLibraryGenres,
} from '@/lib/library/libraryClassification';
import { resolveBookPhysicalLocation } from '@/lib/library/libraryOrganization';

export function LibraryItemModal({
  isOpen,
  setIsOpen,
  item,
  onSave,
  onAddCopy,
  onDelete,
  upcTaken,
  schoolId,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: LibraryItem | null;
  onSave: (data: LibraryItemInput, existingId?: string) => Promise<void>;
  onAddCopy?: (item: LibraryItem) => Promise<void>;
  onDelete?: (item: LibraryItem) => Promise<void>;
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
  const [copies, setCopies] = useState(1);
  const [coverUrl, setCoverUrl] = useState('');
  const [description, setDescription] = useState('');
  const [readingLevel, setReadingLevel] = useState('');
  const [pageCount, setPageCount] = useState('');
  const [publishedYear, setPublishedYear] = useState('');
  const [series, setSeries] = useState('');
  const [volume, setVolume] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingCopy, setAddingCopy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [lookingUpIsbn, setLookingUpIsbn] = useState(false);
  const [titleSuggestions, setTitleSuggestions] = useState<LibraryCatalogHit[]>([]);
  const [isSearchingTitle, setIsSearchingTitle] = useState(false);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const titleSearchContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const playSound = useArcadeSound();
  const { setLibraryStickersToPrint } = usePrint();
  const firestore = useFirestore();
  const isEditing = !!item;

  useEffect(() => {
    if (!isOpen) {
      setShowTitleSuggestions(false);
      setTitleSuggestions([]);
      return;
    }
    setCopies(1);
    if (item) {
      setName(item.name);
      setUpc(item.upc);
      setAuthor(item.author ?? '');
      setIsbn(item.isbn ?? '');
      setCategory(item.category ?? '');
      setShelfLocation(item.shelfLocation ?? '');
      setCopyNumber(item.copyNumber ?? '');
      setNotes(item.notes ?? '');
      setCoverUrl(item.coverUrl ?? '');
      if (!item.coverUrl?.trim() && item.isbn?.trim()) {
        resolveCoverByIsbn(item.isbn.trim()).then((url) => {
          if (url) setCoverUrl((prev) => prev.trim() || url);
        });
      }
      setDescription(item.description ?? '');
      setReadingLevel(item.readingLevel ?? '');
      setPageCount(item.pageCount ? String(item.pageCount) : '');
      setPublishedYear(item.publishedYear ?? '');
      setSeries(item.series ?? '');
      setVolume(item.volume ?? '');
    } else {
      setName('');
      setUpc('');
      setAuthor('');
      setIsbn('');
      setCategory('');
      setShelfLocation('');
      setCopyNumber('');
      setNotes('');
      setCoverUrl('');
      setDescription('');
      setReadingLevel('');
      setPageCount('');
      setPublishedYear('');
      setSeries('');
      setVolume('');
    }
  }, [item, isOpen]);

  // Live title autocomplete debounced search when entering book name manually
  useEffect(() => {
    if (isEditing || !isOpen) return;
    const query = name.trim();
    if (query.length < 2) {
      setTitleSuggestions([]);
      setShowTitleSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTitle(true);
      try {
        const hits = await fetchCatalogHitsByTitle(query);
        setTitleSuggestions(hits);
        if (hits.length > 0) {
          setShowTitleSuggestions(true);
          setHighlightedIndex(-1);
        }
      } catch {
        setTitleSuggestions([]);
      } finally {
        setIsSearchingTitle(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [name, isEditing, isOpen]);

  // Click outside listener for title suggestions
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (titleSearchContainerRef.current && !titleSearchContainerRef.current.contains(e.target as Node)) {
        setShowTitleSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimOptional = (v: string) => {
    const t = v.trim();
    return t.length > 0 ? t : undefined;
  };

  const { settings } = useSettings();
  const genres = getActiveLibraryGenres(settings.libraryGenreDefinitions);
  const classification = resolveBookClassification(category, settings.libraryGenreDefinitions, shelfLocation);
  const placementZones =
    settings.libraryPlacementZones && settings.libraryPlacementZones.length > 0
      ? settings.libraryPlacementZones
      : DEFAULT_LIBRARY_PLACEMENT_ZONES;
  const physicalGuide = resolveBookPhysicalLocation(
    { name, author, category, shelfLocation },
    settings.libraryGenreDefinitions,
  );

  const applyBookAutofill = async (hit: LibraryCatalogHit) => {
    setName(hit.title);
    if (hit.author) setAuthor(hit.author);
    if (hit.isbn) setIsbn(hit.isbn);
    if (hit.coverUrl) setCoverUrl(hit.coverUrl);
    if (hit.description) setDescription(hit.description);
    if (hit.pageCount) setPageCount(String(hit.pageCount));
    if (hit.publishedYear) setPublishedYear(hit.publishedYear);
    if (hit.readingLevel) setReadingLevel(hit.readingLevel);
    if (hit.series) setSeries(hit.series);

    // Genre / classification and default shelf placement
    if (hit.category) {
      setCategory(hit.category);
      const resolved = resolveBookClassification(hit.category, settings.libraryGenreDefinitions);
      if (!shelfLocation.trim() && resolved.shelfLocation) {
        setShelfLocation(resolved.shelfLocation);
      }
    }

    // Auto-generate barcode if empty
    if (!upc.trim() && upcTaken) {
      const candidate = generateGenreBarcode({
        category: hit.category?.trim() || undefined,
        scheme: settings.libraryBarcodeNumberScheme ?? 'genre_code',
        customGenres: settings.libraryGenreDefinitions,
        sequenceNumber: 1,
      });
      const taken = await upcTaken(candidate, item?.id);
      if (!taken) {
        setUpc(candidate);
      } else {
        const unique = await generateUniqueLibraryUpc((code) => upcTaken(code, item?.id));
        if (unique) setUpc(unique);
      }
    }

    setShowTitleSuggestions(false);
    playSound('success');
    toast({
      title: 'Book details autofilled',
      description: `Loaded details for "${hit.title}"${hit.author ? ` by ${hit.author}` : ''}.`,
    });
  };

  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    // If shelf location is empty, auto-populate the default shelf location for this genre
    const resolved = resolveBookClassification(newCat, settings.libraryGenreDefinitions);
    if (!shelfLocation.trim() && resolved.shelfLocation) {
      setShelfLocation(resolved.shelfLocation);
    }
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
      let candidate = '';
      let seq = 1;
      let attempts = 0;
      do {
        candidate = generateGenreBarcode({
          category: category.trim() || undefined,
          scheme: settings.libraryBarcodeNumberScheme ?? 'genre_code',
          customGenres: settings.libraryGenreDefinitions,
          sequenceNumber: seq,
        });
        const taken = await upcTaken(candidate, item?.id);
        if (!taken) break;
        seq++;
        attempts++;
      } while (attempts < 500);

      if (!candidate) {
        playSound('error');
        toast({ variant: 'destructive', title: 'Could not generate a unique barcode' });
        return;
      }
      setUpc(candidate);
      playSound('success');
      toast({
        title: 'Barcode generated',
        description: `${candidate} — formatted for ${classification.genre.label}`,
      });
    } finally {
      setGenerating(false);
    }
  };

  const defaultLabelFormat = (settings.libraryLabelFormat as LibraryLabelFormat) || 'sticker';

  const handlePrintLabel = (format: LibraryLabelFormat = defaultLabelFormat) => {
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
    const printItem: LibraryItem = {
      ...item,
      id: item?.id ?? 'draft-label',
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
    if (firestore && sid && item?.id && item.id !== 'draft-label') {
      const itemRef = doc(firestore, 'schools', sid, 'library', item.id);
      updateDoc(itemRef, { labeled: true, labeledAt: Date.now() }).catch(() => {});
      item.labeled = true;
      item.labeledAt = Date.now();
    }
    const opt = getLibraryLabelOption(format);
    toast({ title: `Printing ${opt.shortName}`, description: normalizedUpc });
  };

  const handleLookupIsbn = async () => {
    const trimmedIsbn = isbn.trim();
    if (!trimmedIsbn) {
      toast({ variant: 'destructive', title: 'Enter an ISBN first' });
      return;
    }
    setLookingUpIsbn(true);
    try {
      const { hit } = await fetchCatalogHitByIsbn(trimmedIsbn);
      if (hit?.title) {
        setName((prev) => prev.trim() || hit.title);
        if (hit.author) setAuthor((prev) => prev.trim() || hit.author || '');
        if (hit.category) {
          setCategory((prev) => prev.trim() || hit.category || '');
          const res = resolveBookClassification(hit.category, settings.libraryGenreDefinitions);
          if (!shelfLocation.trim() && res.shelfLocation) setShelfLocation(res.shelfLocation);
        }
        if (hit.coverUrl) setCoverUrl((prev) => prev.trim() || hit.coverUrl || '');
        if (hit.description) setDescription((prev) => prev.trim() || hit.description || '');
        if (hit.pageCount) setPageCount((prev) => prev || String(hit.pageCount));
        if (hit.publishedYear) setPublishedYear((prev) => prev || hit.publishedYear || '');
        if (hit.readingLevel) setReadingLevel((prev) => prev || hit.readingLevel || '');
        playSound('success');
        toast({ title: 'Book found', description: `Loaded details for "${hit.title}".` });
      } else {
        playSound('error');
        toast({
          variant: 'destructive',
          title: 'No match found',
          description: 'Could not find book details online for this ISBN.',
        });
      }
    } catch (err) {
      toast({ variant: 'destructive', title: 'Lookup error', description: (err as Error).message });
    } finally {
      setLookingUpIsbn(false);
    }
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
      copies,
      name: trimmedName,
      upc: normalizedUpc,
      author: trimOptional(author),
      isbn: trimOptional(isbn),
      category: trimOptional(category),
      shelfLocation: trimOptional(shelfLocation),
      copyNumber: trimOptional(copyNumber),
      notes: trimOptional(notes),
      coverUrl: trimOptional(coverUrl),
      description: trimOptional(description),
      readingLevel: trimOptional(readingLevel),
      pageCount: pageCount.trim() && !isNaN(Number(pageCount)) ? Number(pageCount) : undefined,
      publishedYear: trimOptional(publishedYear),
      series: trimOptional(series),
      volume: trimOptional(volume),
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
          <div className="flex flex-col sm:flex-row gap-4 mb-4 p-3.5 rounded-2xl border bg-muted/20 items-center sm:items-start">
            <div className="shrink-0">
              <LibraryBookCover
                coverUrl={coverUrl}
                isbn={isbn}
                title={name}
                author={author}
                aspect="portrait"
                className="h-28 w-20 rounded-xl shadow-xs border"
                onCoverResolved={(url) => {
                  setCoverUrl((prev) => prev.trim() || url);
                }}
              />
            </div>
            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div className="space-y-1">
                <Label htmlFor="lib-cover-url" className="text-xs">Cover Image URL</Label>
                <Input
                  id="lib-cover-url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://covers.openlibrary.org/..."
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="lib-series" className="text-xs">Series (optional)</Label>
                  <Input
                    id="lib-series"
                    value={series}
                    onChange={(e) => setSeries(e.target.value)}
                    placeholder="Series title"
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label htmlFor="lib-volume" className="text-xs">Volume / Book #</Label>
                  <Input
                    id="lib-volume"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="Vol 1, Book 2"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2 relative" ref={titleSearchContainerRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="lib-name">Title / item name</Label>
                {!isEditing && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 gap-1 px-2 rounded-lg"
                    disabled={isSearchingTitle || !name.trim()}
                    onClick={async () => {
                      if (!name.trim()) return;
                      setIsSearchingTitle(true);
                      try {
                        const hits = await fetchCatalogHitsByTitle(name);
                        if (hits.length > 0) {
                          await applyBookAutofill(hits[0]);
                        } else {
                          toast({
                            variant: 'destructive',
                            title: 'No book found',
                            description: `Could not find book details online for "${name}".`,
                          });
                        }
                      } finally {
                        setIsSearchingTitle(false);
                      }
                    }}
                  >
                    {isSearchingTitle ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    <span>Autofill details</span>
                  </Button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="lib-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setShowTitleSuggestions(true);
                  }}
                  onFocus={() => {
                    if (titleSuggestions.length > 0) setShowTitleSuggestions(true);
                  }}
                  onKeyDown={(e) => {
                    if (showTitleSuggestions && titleSuggestions.length > 0) {
                      if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        setHighlightedIndex((prev) => (prev + 1) % titleSuggestions.length);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        setHighlightedIndex((prev) => (prev <= 0 ? titleSuggestions.length - 1 : prev - 1));
                      } else if (e.key === 'Enter') {
                        if (highlightedIndex >= 0 && highlightedIndex < titleSuggestions.length) {
                          e.preventDefault();
                          void applyBookAutofill(titleSuggestions[highlightedIndex]);
                        }
                      } else if (e.key === 'Escape') {
                        setShowTitleSuggestions(false);
                      }
                    }
                  }}
                  placeholder="Type book title to search & autofill…"
                  className="pr-8 font-medium"
                />
                {isSearchingTitle ? (
                  <div className="absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="absolute right-2.5 top-2.5 pointer-events-none text-muted-foreground">
                    <Search className="h-4 w-4 opacity-40" />
                  </div>
                )}

                {/* Autocomplete Suggestions Popup */}
                {showTitleSuggestions && titleSuggestions.length > 0 && (
                  <div
                    className="absolute top-full left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-xl border border-border/80 bg-popover p-1.5 shadow-xl animate-in fade-in"
                    role="listbox"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center justify-between border-b border-border/40 mb-1">
                      <span>Matching books (tap to autofill)</span>
                      <span className="text-[9px] font-normal lowercase">enter to select</span>
                    </div>
                    {titleSuggestions.map((hit, idx) => {
                      const isHighlighted = idx === highlightedIndex;
                      return (
                        <button
                          key={`${hit.title}-${hit.isbn || idx}`}
                          type="button"
                          className={cn(
                            'w-full text-left p-2 rounded-lg flex items-start gap-3 transition-colors text-xs',
                            isHighlighted ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-muted/70 text-foreground',
                          )}
                          onClick={() => void applyBookAutofill(hit)}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                        >
                          <div className="shrink-0 h-11 w-8 rounded overflow-hidden bg-muted border flex items-center justify-center">
                            {hit.coverUrl ? (
                              <img src={hit.coverUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <BookOpen className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-foreground truncate">{hit.title}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {hit.author ? `${hit.author}` : 'Unknown author'}
                              {hit.publishedYear ? ` · ${hit.publishedYear}` : ''}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {hit.isbn && (
                                <span className="font-mono text-[9px] bg-muted px-1.5 py-0.2 rounded text-muted-foreground">
                                  ISBN {hit.isbn}
                                </span>
                              )}
                              {hit.category && (
                                <span className="text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                                  {hit.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
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
            {!isEditing && <div className="space-y-1">
              <Label htmlFor="lib-quantity">Number of copies</Label>
              <Input id="lib-quantity" type="number" min={1} max={25} value={copies} onChange={e => setCopies(Math.max(1, Math.min(25, Number(e.target.value) || 1)))} />
              <p className="text-xs text-muted-foreground">Extra copies get unique labels to print after saving.</p>
            </div>}
            <div className="space-y-1">
              <Label htmlFor="lib-copy">Copy # (optional)</Label>
              <Input id="lib-copy" value={copyNumber} onChange={(e) => setCopyNumber(e.target.value)} placeholder="1, A, etc." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-author">Author</Label>
              <Input id="lib-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="lib-category">Genre / Category</Label>
                {category.trim() ? (
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] font-bold px-1.5 py-0"
                    style={{
                      borderColor: `${classification.color}60`,
                      backgroundColor: `${classification.color}15`,
                      color: classification.color,
                    }}
                  >
                    {classification.genre.callPrefix} · {classification.genre.label}
                  </Badge>
                ) : null}
              </div>
              <Input
                id="lib-category"
                list="lib-genre-options"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                placeholder="Fiction, STEM, History, etc."
              />
              <datalist id="lib-genre-options">
                {genres.map((g) => (
                  <option key={g.id} value={g.label} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="lib-isbn">ISBN</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[11px] gap-1 text-primary hover:text-primary font-semibold"
                  disabled={lookingUpIsbn || !isbn.trim()}
                  onClick={() => void handleLookupIsbn()}
                >
                  {lookingUpIsbn ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Auto-fill details
                </Button>
              </div>
              <Input id="lib-isbn" value={isbn} onChange={(e) => setIsbn(e.target.value)} className="font-mono" placeholder="10 or 13-digit ISBN" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="lib-shelf" className="flex items-center gap-1.5 font-bold text-xs">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>Where in Library (Shelf / Location)</span>
                </Label>
                {shelfLocation.trim() && (
                  <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 bg-primary/5 text-primary border-primary/20">
                    📍 {shelfLocation}
                  </Badge>
                )}
              </div>
              <Input
                id="lib-shelf"
                list="lib-shelf-options"
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="Aisle 1 - Fiction Bays, Science Stacks..."
              />
              <datalist id="lib-shelf-options">
                {placementZones.map((zone) => (
                  <option key={zone} value={zone} />
                ))}
              </datalist>
              <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 truncate">
                  <span className="font-semibold text-foreground">Filing Guide:</span>
                  <span className="truncate">{physicalGuide.directionalGuide}</span>
                </div>
                <span className="font-mono text-[10px] font-bold text-primary shrink-0">
                  [{physicalGuide.letter}] {physicalGuide.filingName}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="lib-reading-level">Reading level (optional)</Label>
              <Input
                id="lib-reading-level"
                value={readingLevel}
                onChange={(e) => setReadingLevel(e.target.value)}
                placeholder="e.g. Lexile 650L, Grade 3-5, AR 4.2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="lib-pages">Pages</Label>
                <Input
                  id="lib-pages"
                  type="number"
                  min={1}
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  placeholder="320"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lib-year">Year</Label>
                <Input
                  id="lib-year"
                  value={publishedYear}
                  onChange={(e) => setPublishedYear(e.target.value)}
                  placeholder="2023"
                />
              </div>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="lib-desc">Synopsis / Description</Label>
              <Textarea
                id="lib-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary of the book..."
                rows={2}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="lib-notes">Internal catalog notes</Label>
              <Textarea id="lib-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
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
        <DialogFooter className="border-t bg-muted/30 px-6 py-4 flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing && item && onDelete && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive gap-1.5 text-xs font-bold h-9 rounded-xl"
                disabled={saving}
                onClick={async () => {
                  await onDelete(item);
                  setIsOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Book</span>
              </Button>
            )}

            {isEditing && item && onAddCopy && (
              <Button
                type="button"
                variant="outline"
                className="gap-1.5 text-xs font-bold h-9 rounded-xl border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                disabled={saving || addingCopy}
                onClick={async () => {
                  setAddingCopy(true);
                  try {
                    await onAddCopy(item);
                    setIsOpen(false);
                  } finally {
                    setAddingCopy(false);
                  }
                }}
                title="Register an additional physical copy of this book in your catalog"
              >
                {addingCopy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CopyPlus className="h-4 w-4 text-amber-500" />}
                <span>Add another copy</span>
              </Button>
            )}

            {showLibPrint && (
              <div className="flex items-center">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-l-xl rounded-r-none border-r-0 gap-1.5 font-semibold text-xs h-9"
                  disabled={saving || !name.trim()}
                  onClick={() => handlePrintLabel(defaultLabelFormat)}
                  title={`Print using default ${getLibraryLabelOption(defaultLabelFormat).shortName}`}
                >
                  <Printer className="h-4 w-4" /> Print label
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-l-none rounded-r-xl px-2 text-xs h-9"
                      disabled={saving || !name.trim()}
                      title="Choose label format size"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56 rounded-xl">
                    {LIBRARY_LABEL_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.id}
                        onClick={() => handlePrintLabel(opt.id)}
                        className="flex flex-col items-start gap-0.5 py-1.5 cursor-pointer text-xs"
                      >
                        <div className="font-bold flex items-center justify-between w-full">
                          <span>{opt.shortName}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{opt.badge}</span>
                        </div>
                        <span className="text-[10.5px] text-muted-foreground">{opt.dimensions}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)} disabled={saving} className="rounded-xl h-9 text-xs">
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleSave()} disabled={saving} className="rounded-xl h-9 text-xs font-bold">
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
