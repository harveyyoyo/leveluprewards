'use client';

import { useState, useMemo } from 'react';
import {
  Compass,
  Search,
  BookOpen,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Filter,
  X,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
import { formatDueDate } from '@/lib/library/libraryPolicy';
import type { LibraryItem } from '@/lib/types';
import { useSettings } from '@/components/providers/SettingsProvider';

export function LibraryBookDiscoveryModal({
  isOpen,
  setIsOpen,
  catalogItems = [],
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  catalogItems: LibraryItem[];
}) {
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [selectedBook, setSelectedBook] = useState<LibraryItem | null>(null);

  // Deduplicate catalog by title/ISBN so copies don't clutter discovery
  const uniqueTitles = useMemo(() => {
    const map = new Map<string, { item: LibraryItem; totalCopies: number; availableCopies: number }>();
    catalogItems.forEach(item => {
      if (item.archived) return;
      const key = (item.isbn || item.name).toLowerCase().trim();
      const existing = map.get(key);
      const isAvail = item.status === 'available' && (!item.condition || item.condition === 'good');
      if (!existing) {
        map.set(key, {
          item,
          totalCopies: 1,
          availableCopies: isAvail ? 1 : 0,
        });
      } else {
        existing.totalCopies += 1;
        if (isAvail) existing.availableCopies += 1;
        // Prefer item with coverUrl
        if (!existing.item.coverUrl && item.coverUrl) {
          existing.item = item;
        }
      }
    });
    return Array.from(map.values());
  }, [catalogItems]);

  const genres = useMemo(() => {
    const set = new Set<string>();
    catalogItems.forEach(i => {
      if (i.category?.trim() && !i.archived) set.add(i.category.trim());
    });
    return ['all', ...Array.from(set).sort()];
  }, [catalogItems]);

  const filteredTitles = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return uniqueTitles.filter(({ item, availableCopies }) => {
      if (availableOnly && availableCopies <= 0) return false;
      if (selectedGenre !== 'all' && item.category !== selectedGenre) return false;
      if (!term) return true;
      return [item.name, item.author, item.category, item.shelfLocation, item.description, item.readingLevel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term);
    });
  }, [uniqueTitles, searchTerm, selectedGenre, availableOnly]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Compass className="h-5 w-5" />
            </div>
            <DialogTitle>Find &amp; Discover Books</DialogTitle>
          </div>
          <DialogDescription>
            Browse library books, find where they are shelved, and check if copies are available right now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search bar & Quick Filters */}
          <div className="flex flex-wrap gap-2.5">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, author, genre, or keyword..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-10 text-sm rounded-xl"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <Button
              variant={availableOnly ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAvailableOnly(v => !v)}
              className="rounded-xl text-xs font-semibold gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Available Now Only
            </Button>
          </div>

          {/* Genre chips */}
          {genres.length > 2 && (
            <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
              {genres.map(g => (
                <Button
                  key={g}
                  variant={selectedGenre === g ? 'default' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedGenre(g)}
                  className="h-7 text-xs rounded-lg px-2.5"
                >
                  {g === 'all' ? 'All Genres' : g}
                </Button>
              ))}
            </div>
          )}

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTitles.map(({ item, totalCopies, availableCopies }) => {
              const classification = resolveBookClassification(
                item.category,
                settings.libraryGenreDefinitions,
                item.shelfLocation,
              );
              const isAvailable = availableCopies > 0;

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedBook(item)}
                  className="rounded-2xl border p-3 bg-card hover:border-primary/60 hover:shadow-md transition-all cursor-pointer flex gap-3 text-left group"
                >
                  {/* Book Cover Thumbnail */}
                  <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border bg-muted/30 shadow-inner flex items-center justify-center">
                    {item.coverUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.coverUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div
                        className="h-full w-full flex flex-col items-center justify-center p-1.5 text-center text-[10px] font-bold text-white"
                        style={{ backgroundColor: classification.color }}
                      >
                        <BookOpen className="h-5 w-5 mb-1 opacity-80" />
                        <span className="line-clamp-2 leading-tight">{item.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Book Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h4 className="font-bold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                        {item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {item.author || 'Author not recorded'}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        {item.readingLevel && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-mono">
                            Level {item.readingLevel}
                          </Badge>
                        )}
                        {item.pageCount && (
                          <span className="text-[10px] text-muted-foreground">{item.pageCount} pages</span>
                        )}
                        {(item.ratingAvg ?? 0) > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                            <Star className="h-2.5 w-2.5 fill-amber-400" />
                            {item.ratingAvg}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-foreground">
                        <MapPin className="h-3 w-3 shrink-0 text-primary" />
                        <span className="truncate">{classification.shelfLocation}</span>
                      </div>
                      <div className="mt-1">
                        {isAvailable ? (
                          <Badge variant="default" className="text-[9px] bg-emerald-600 hover:bg-emerald-600 font-bold px-1.5 py-0">
                            {availableCopies} of {totalCopies} on shelf
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] font-medium px-1.5 py-0 text-muted-foreground">
                            All on loan
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!filteredTitles.length && (
            <div className="rounded-2xl border border-dashed p-10 text-center space-y-2">
              <BookOpen className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="font-semibold text-sm">No books found</p>
              <p className="text-xs text-muted-foreground">
                Try searching for a different word or clear the filter.
              </p>
            </div>
          )}
        </div>

        {/* Book Details Sub-Dialog / Drawer */}
        {selectedBook && (
          <Dialog open={Boolean(selectedBook)} onOpenChange={open => !open && setSelectedBook(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg leading-tight">{selectedBook.name}</DialogTitle>
                <DialogDescription>{selectedBook.author || 'Author not recorded'}</DialogDescription>
              </DialogHeader>

              <div className="flex gap-4 items-start">
                <div className="h-36 w-24 shrink-0 rounded-xl overflow-hidden border shadow-sm bg-muted/20">
                  {selectedBook.coverUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={selectedBook.coverUrl} alt={selectedBook.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-xs">
                  <div className="rounded-xl border bg-primary/5 p-2.5 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary" /> Shelf Location
                    </p>
                    <p className="font-black text-sm text-foreground">{selectedBook.shelfLocation || 'Main Stacks'}</p>
                    <p className="text-muted-foreground text-[11px]">Category: {selectedBook.category || 'General'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedBook.readingLevel && (
                      <Badge variant="outline">Reading Level: {selectedBook.readingLevel}</Badge>
                    )}
                    {selectedBook.pageCount && (
                      <Badge variant="outline">{selectedBook.pageCount} Pages</Badge>
                    )}
                    {selectedBook.publishedYear && (
                      <Badge variant="outline">Year: {selectedBook.publishedYear}</Badge>
                    )}
                  </div>
                </div>
              </div>

              {selectedBook.description && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Synopsis</p>
                  <p className="text-xs leading-relaxed text-foreground/90 max-h-36 overflow-y-auto rounded-xl border bg-muted/20 p-3">
                    {selectedBook.description}
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedBook(null)}>
                  Close
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
