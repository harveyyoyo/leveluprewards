'use client';

import React from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  CopyPlus,
  Layers,
  MapPin,
  Pencil,
  RotateCcw,
  Star,
  Tag,
  User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { LibraryBookCover } from './LibraryBookCover';
import type { LibraryItem } from '@/lib/types';
import type { BookPile } from '@/lib/library/bookPiles';
import { cn } from '@/lib/utils';

function loanedToLabel(item: LibraryItem, getName: (id?: string) => string) {
  const who = item.checkedOutTo ? getName(item.checkedOutTo).trim() : '';
  return who ? `On loan to ${who}` : 'On loan';
}

function pileLoanBorrowers(pile: BookPile, getName: (id?: string) => string) {
  const names = pile.copies
    .filter((copy) => copy.status === 'checked_out')
    .map((copy) => {
      const who = copy.checkedOutTo ? getName(copy.checkedOutTo).trim() : '';
      return who || 'Unknown student';
    });
  return [...new Set(names)];
}

export interface LibraryBookPileGridProps {
  piles: BookPile[];
  unstackedPileKeys: Set<string>;
  onTogglePile: (pileKey: string) => void;
  selected: Set<string>;
  onToggleSelect: (id: string) => void;
  onOpenDetails: (item: LibraryItem) => void;
  onAddCopy?: (item: LibraryItem) => Promise<void>;
  getName: (id?: string) => string;
  currentTheme: {
    uiClasses: {
      cardRadius: string;
      badgeRadius: string;
      buttonRadius: string;
    };
  };
  viewMode: 'grid' | 'list';
  defaultShelf?: string;
  /** Show real book cover images. Defaults to true. */
  showCoverImages?: boolean;
  /** Resolves a genre-coded hex color for a copy — shown as a thin "spine" accent on its card. */
  getGenreColor?: (item: LibraryItem) => string;
}

export function LibraryBookPileGrid({
  piles,
  unstackedPileKeys,
  onTogglePile,
  selected,
  onToggleSelect,
  onOpenDetails,
  onAddCopy,
  getName,
  currentTheme,
  viewMode,
  defaultShelf,
  showCoverImages = true,
  getGenreColor,
}: LibraryBookPileGridProps) {
  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {piles.map((pile) => {
          const isUnstacked = unstackedPileKeys.has(pile.pileKey);

          // CASE 1: Single Book (Not a pile)
          if (!pile.hasMultipleCopies) {
            const item = pile.copies[0];
            const isChecked = selected.has(item.id);
            const isLoaned = item.status === 'checked_out';
            const isDamaged = item.condition === 'lost' || item.condition === 'damaged';
            const needsProcessing = !item.labeled || !item.shelfLocation;

            return (
              <div
                key={item.id}
                onClick={() => onOpenDetails(item)}
                className={cn(
                  'group relative flex flex-col border bg-background overflow-hidden cursor-pointer select-none transition-all duration-200',
                  currentTheme.uiClasses.cardRadius,
                  isChecked
                    ? 'ring-3 ring-primary border-primary shadow-lg bg-primary/5 -translate-y-0.5'
                    : 'border-border/70 shadow-2xs hover:shadow-md hover:-translate-y-0.5',
                )}
              >
                {getGenreColor && (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 w-1 z-20"
                    style={{ backgroundColor: getGenreColor(item) }}
                  />
                )}
                {/* Book Cover Container */}
                <div className="relative aspect-[2/3] w-full overflow-hidden flex items-center justify-center bg-muted/20">
                  <LibraryBookCover
                    showImage={showCoverImages}
                    coverUrl={item.coverUrl}
                    isbn={item.isbn}
                    title={item.name}
                    author={item.author}
                    aspect="portrait"
                    className="h-full w-full"
                    imgClassName={cn(
                      'transition-transform duration-300',
                      isChecked ? 'scale-105' : 'group-hover:scale-105',
                    )}
                  />

                  {/* Select Checkbox — its own click target, independent of the card's "open details" click */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect(item.id);
                    }}
                    aria-label={isChecked ? 'Deselect book' : 'Select book'}
                    className="absolute top-2 left-2 z-10"
                  >
                    <div
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full transition-all shadow-md',
                        isChecked
                          ? 'bg-primary text-primary-foreground ring-2 ring-white scale-110'
                          : 'bg-background/80 text-transparent hover:text-foreground hover:bg-background',
                      )}
                    >
                      <Check className={cn('h-3.5 w-3.5', isChecked ? 'opacity-100' : 'opacity-0')} />
                    </div>
                  </button>

                  {/* Status Ribbon */}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge
                      variant={isDamaged ? 'destructive' : isLoaned ? 'default' : needsProcessing ? 'outline' : 'secondary'}
                      className={cn(
                        'text-[9px] font-black px-1.5 py-0.5 shadow-md capitalize',
                        needsProcessing && !isDamaged && !isLoaned && 'border-amber-500/60 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                      )}
                    >
                      {isDamaged ? item.condition : isLoaned ? loanedToLabel(item, getName) : needsProcessing ? 'Needs Processing' : 'Available'}
                    </Badge>
                  </div>

                  {/* Selection banner */}
                  {isChecked && (
                    <div className="absolute inset-x-0 bottom-0 z-10 bg-primary/90 text-primary-foreground py-0.5 text-center text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                      Selected
                    </div>
                  )}
                </div>

                {/* Card Metadata */}
                <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5 bg-card text-[11px]">
                  <div>
                    <h5 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">
                      {item.name}
                    </h5>
                    <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {item.author || 'Author not recorded'}
                    </p>
                    {isLoaned ? (
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 truncate">
                        <User className="h-3 w-3 shrink-0" />
                        <span className="truncate">{loanedToLabel(item, getName)}</span>
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-1 pt-1 border-t text-[10px]">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium truncate text-foreground/90">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        {item.shelfLocation || defaultShelf || 'Main Stacks'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="font-mono text-muted-foreground truncate text-[9px]">
                        {item.upc}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // CASE 2: Pile with multiple copies (STACKED STATE)
          if (!isUnstacked) {
            const allChecked = pile.copies.every((c) => selected.has(c.id));
            const someChecked = pile.copies.some((c) => selected.has(c.id));
            const copyCount = pile.copies.length;

            return (
              <div
                key={pile.pileKey}
                onClick={() => onTogglePile(pile.pileKey)}
                title={`Pile of ${copyCount} copies. Click to break up into individual books.`}
                className={cn(
                  'group relative flex flex-col cursor-pointer select-none transition-all duration-300 pt-2 pr-2',
                  currentTheme.uiClasses.cardRadius,
                )}
              >
                {/* 3D Physical Stack / Pile Layers Behind Cover */}
                {copyCount >= 3 && (
                  <div
                    className={cn(
                      'absolute top-0 right-0 bottom-2 left-2 rounded-2xl border border-amber-500/25 bg-amber-100/60 dark:bg-amber-950/40 shadow-sm pointer-events-none transition-transform duration-300',
                      'rotate-[3.5deg] translate-x-1.5 -translate-y-1 group-hover:rotate-[6deg] group-hover:translate-x-2.5 group-hover:-translate-y-1.5',
                    )}
                    style={{ zIndex: 0 }}
                  />
                )}
                <div
                  className={cn(
                    'absolute top-1 right-1 bottom-1 left-1 rounded-2xl border border-border/80 bg-card/90 shadow-sm pointer-events-none transition-transform duration-300',
                    '-rotate-[2deg] -translate-x-0.5 -translate-y-0.5 group-hover:-rotate-[3.5deg] group-hover:-translate-x-1 group-hover:-translate-y-1',
                  )}
                  style={{ zIndex: 1 }}
                />

                {/* Primary Card (Top of the pile) */}
                <div
                  className={cn(
                    'relative z-10 flex flex-col h-full bg-card overflow-hidden border transition-all duration-300',
                    currentTheme.uiClasses.cardRadius,
                    allChecked
                      ? 'ring-3 ring-primary border-primary shadow-xl bg-primary/5 -translate-y-1'
                      : 'border-border/90 shadow-sm group-hover:shadow-xl group-hover:-translate-y-1 group-hover:border-primary/60',
                  )}
                >
                  {/* Book Cover Container */}
                  <div className="relative aspect-[2/3] w-full overflow-hidden flex items-center justify-center bg-muted/20">
                    <LibraryBookCover
                      showImage={showCoverImages}
                      coverUrl={pile.coverUrl}
                      isbn={pile.isbn}
                      title={pile.title}
                      author={pile.author}
                      aspect="portrait"
                      className="h-full w-full"
                      imgClassName="transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Top Left Pile Badge */}
                    <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          const copyIds = pile.copies.map((c) => c.id);
                          const shouldCheck = !allChecked;
                          copyIds.forEach((id) => {
                            if (shouldCheck && !selected.has(id)) onToggleSelect(id);
                            if (!shouldCheck && selected.has(id)) onToggleSelect(id);
                          });
                        }}
                        title={allChecked ? 'Deselect pile' : 'Select all copies in pile'}
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full transition-all shadow-md',
                          allChecked
                            ? 'bg-primary text-primary-foreground ring-2 ring-white scale-110'
                            : someChecked
                              ? 'bg-primary/70 text-white ring-1 ring-white'
                              : 'bg-background/80 text-transparent hover:text-muted-foreground/50 hover:bg-background',
                        )}
                      >
                        <Check className={cn('h-3 w-3', allChecked || someChecked ? 'opacity-100' : 'opacity-0')} />
                      </div>

                      <Badge
                        className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] px-2 py-0.5 shadow-md flex items-center gap-1 border border-amber-400/60 backdrop-blur-xs"
                      >
                        <Layers className="h-3 w-3" />
                        <span>{copyCount} in pile</span>
                      </Badge>
                    </div>

                    {/* Top Right Availability Badge */}
                    <div className="absolute top-2 right-2 z-20">
                      <Badge
                        variant={pile.availableCount > 0 ? 'secondary' : 'destructive'}
                        className="text-[9px] font-black px-1.5 py-0.5 shadow-md capitalize bg-background/95 text-foreground border"
                      >
                        {pile.availableCount > 0
                          ? `${pile.availableCount} avail`
                          : pileLoanBorrowers(pile, getName).length === 1
                            ? `On loan to ${pileLoanBorrowers(pile, getName)[0]}`
                            : `${pile.loanCount} on loan`}
                      </Badge>
                    </div>

                    {/* Interactive Break-Up Banner on Hover */}
                    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-transparent p-2 pt-6 text-white text-center opacity-90 group-hover:opacity-100 transition-opacity">
                      <div className="inline-flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300 group-hover:scale-105 transition-transform">
                        <Layers className="h-3.5 w-3.5" />
                        <span>Click to break up pile</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Metadata */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5 bg-card text-[11px]">
                    <div>
                      <h5 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">
                        {pile.title}
                      </h5>
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                        {pile.author || 'Author not recorded'}
                      </p>
                      {pile.loanCount > 0 ? (
                        <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400 truncate">
                          <User className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {pileLoanBorrowers(pile, getName).length === 1
                              ? `On loan to ${pileLoanBorrowers(pile, getName)[0]}`
                              : `On loan to ${pileLoanBorrowers(pile, getName).join(', ')}`}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1 pt-1 border-t text-[10px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="flex items-center gap-1 font-medium truncate text-foreground/90">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          {pile.shelfLocation || defaultShelf || 'Main Stacks'}
                        </span>
                        <span className="font-semibold text-amber-600 dark:text-amber-400 text-[10px]">
                          Pile of {copyCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-muted-foreground truncate text-[9px] italic">
                          {copyCount} distinct copies
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePile(pile.pileKey);
                          }}
                          className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                        >
                          <span>Break up</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // CASE 3: Pile with multiple copies (BROKEN-UP / UNSTACKED STATE)
          return (
            <div
              key={`unstacked-${pile.pileKey}`}
              className={cn(
                'col-span-full rounded-2xl border-2 border-primary/30 bg-muted/15 p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in zoom-in-98 duration-200',
                currentTheme.uiClasses.cardRadius,
              )}
            >
              {/* Tray Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-black text-sm text-foreground">
                        {pile.title}
                      </h4>
                      <Badge className="bg-amber-600 text-white font-black text-[10px] px-2 py-0.5 shadow-2xs">
                        Pile broken up into {pile.copies.length} individual books
                      </Badge>
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {pile.availableCount} available · {pile.loanCount} on loan
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pile.author || 'Author not recorded'} · <span className="font-medium text-foreground">{pile.shelfLocation || defaultShelf || 'Main Stacks'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const copyIds = pile.copies.map((c) => c.id);
                      const allSelected = copyIds.every((id) => selected.has(id));
                      copyIds.forEach((id) => {
                        if (allSelected && selected.has(id)) onToggleSelect(id);
                        if (!allSelected && !selected.has(id)) onToggleSelect(id);
                      });
                    }}
                    className={cn('h-8 text-xs font-bold gap-1.5', currentTheme.uiClasses.buttonRadius)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>
                      {pile.copies.every((c) => selected.has(c.id))
                        ? 'Deselect all copies'
                        : 'Select all copies'}
                    </span>
                  </Button>

                  {onAddCopy && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void onAddCopy(pile.copies[0])}
                      className={cn('h-8 text-xs font-bold gap-1.5 border-amber-500/50 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10', currentTheme.uiClasses.buttonRadius)}
                      title="Add another physical copy to this pile"
                    >
                      <CopyPlus className="h-3.5 w-3.5 text-amber-500" />
                      <span>Add another copy</span>
                    </Button>
                  )}

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onTogglePile(pile.pileKey)}
                    className={cn('h-8 text-xs font-black gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90', currentTheme.uiClasses.buttonRadius)}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Stack back into pile</span>
                  </Button>
                </div>
              </div>

              {/* Individual Book Cards Grid inside Broken-up Tray */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
                {pile.copies.map((copy, copyIdx) => {
                  const isChecked = selected.has(copy.id);
                  const isLoaned = copy.status === 'checked_out';
                  const isDamaged = copy.condition === 'lost' || copy.condition === 'damaged';
                  const needsProcessing = !copy.labeled || !copy.shelfLocation;

                  return (
                    <div
                      key={copy.id}
                      onClick={() => onOpenDetails(copy)}
                      className={cn(
                        'group relative flex flex-col border bg-card overflow-hidden cursor-pointer select-none transition-all duration-200',
                        currentTheme.uiClasses.cardRadius,
                        isChecked
                          ? 'ring-3 ring-primary border-primary shadow-lg bg-primary/5 -translate-y-0.5'
                          : 'border-border/70 shadow-2xs hover:shadow-md hover:-translate-y-0.5',
                      )}
                    >
                      {/* Book Cover Container */}
                      <div className="relative aspect-[2/3] w-full overflow-hidden flex items-center justify-center bg-muted/20">
                        <LibraryBookCover
                          showImage={showCoverImages}
                          coverUrl={copy.coverUrl || pile.coverUrl}
                          isbn={copy.isbn || pile.isbn}
                          title={copy.name}
                          author={copy.author}
                          aspect="portrait"
                          className="h-full w-full"
                          imgClassName={cn(
                            'transition-transform duration-300',
                            isChecked ? 'scale-105' : 'group-hover:scale-105',
                          )}
                        />

                        {/* Top Left: Select Checkbox & Copy Number Badge */}
                        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleSelect(copy.id);
                            }}
                            aria-label={isChecked ? 'Deselect book' : 'Select book'}
                            className={cn(
                              'flex h-6 w-6 items-center justify-center rounded-full transition-all shadow-md',
                              isChecked
                                ? 'bg-primary text-primary-foreground ring-2 ring-white scale-110'
                                : 'bg-background/80 text-transparent hover:text-foreground hover:bg-background',
                            )}
                          >
                            <Check className={cn('h-3.5 w-3.5', isChecked ? 'opacity-100' : 'opacity-0')} />
                          </button>
                          <Badge variant="outline" className="bg-background/95 font-mono text-[9px] font-bold shadow-xs">
                            #{copy.copyNumber || copyIdx + 1}
                          </Badge>
                        </div>

                        {/* Top Right: Status Ribbon */}
                        <div className="absolute top-2 right-2 z-10">
                          <Badge
                            variant={isDamaged ? 'destructive' : isLoaned ? 'default' : needsProcessing ? 'outline' : 'secondary'}
                            className={cn(
                              'text-[9px] font-black px-1.5 py-0.5 shadow-md capitalize',
                              needsProcessing && !isDamaged && !isLoaned && 'border-amber-500/60 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                            )}
                          >
                            {isDamaged ? copy.condition : isLoaned ? loanedToLabel(copy, getName) : needsProcessing ? 'Needs Processing' : 'Available'}
                          </Badge>
                        </div>

                        {/* Selection banner */}
                        {isChecked && (
                          <div className="absolute inset-x-0 bottom-0 z-10 bg-primary/90 text-primary-foreground py-0.5 text-center text-[9px] font-black uppercase tracking-wider backdrop-blur-xs">
                            Selected
                          </div>
                        )}
                      </div>

                      {/* Card Metadata Details */}
                      <div className="p-2.5 flex-1 flex flex-col justify-between space-y-1.5 bg-card text-[11px]">
                        <div>
                          <h5 className="font-bold text-xs text-foreground line-clamp-1 leading-snug">
                            {copy.name}
                          </h5>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5 font-mono">
                            UPC: {copy.upc}
                          </p>
                        </div>

                        <div className="space-y-1 pt-1 border-t text-[10px]">
                          <div className="flex items-center justify-between text-muted-foreground">
                            <span className="flex items-center gap-1 font-medium truncate text-foreground/90">
                              <MapPin className="h-3 w-3 text-primary shrink-0" />
                              {copy.shelfLocation || pile.shelfLocation || defaultShelf || 'Main Stacks'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="font-semibold text-amber-600 dark:text-amber-400 text-[9px]">
                              Book {copyIdx + 1} of {pile.copies.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // LIST / TABLE VIEW
  return (
    <div className="border border-border/70 rounded-xl overflow-hidden divide-y divide-border/50 bg-background text-xs">
      {piles.map((pile) => {
        const isUnstacked = unstackedPileKeys.has(pile.pileKey);

        // CASE 1: Single Book in List
        if (!pile.hasMultipleCopies) {
          const item = pile.copies[0];
          const isChecked = selected.has(item.id);
          const isLoaned = item.status === 'checked_out';
          const isDamaged = item.condition === 'lost' || item.condition === 'damaged';
          const needsProcessing = !item.labeled || !item.shelfLocation;

          return (
            <div
              key={item.id}
              onClick={() => onOpenDetails(item)}
              className={cn(
                'flex items-center gap-3 p-2.5 hover:bg-muted/30 transition-colors cursor-pointer select-none',
                isChecked && 'bg-primary/10 font-medium',
              )}
            >
              <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                <Checkbox
                  checked={isChecked}
                  onCheckedChange={() => onToggleSelect(item.id)}
                />
              </span>
              <div className="h-10 w-7 shrink-0 overflow-hidden rounded-md border shadow-2xs">
                <LibraryBookCover
                  showImage={showCoverImages}
                  coverUrl={item.coverUrl}
                  isbn={item.isbn}
                  title={item.name}
                  author={item.author}
                  aspect="thumb"
                  className="h-full w-full"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-bold text-xs text-foreground truncate">{item.name}</span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{item.author || 'Author not recorded'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <MapPin className="h-3 w-3 text-primary" />
                  {item.shelfLocation || defaultShelf || 'Main Stacks'}
                </span>
                <Badge
                  variant={isDamaged ? 'destructive' : isLoaned ? 'default' : needsProcessing ? 'outline' : 'secondary'}
                  className={cn(
                    'text-[10px] capitalize font-bold',
                    needsProcessing && !isDamaged && !isLoaned && 'border-amber-500/60 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                  )}
                >
                  {isDamaged ? item.condition : isLoaned ? loanedToLabel(item, getName) : needsProcessing ? 'Needs Processing' : 'Available'}
                </Badge>
              </div>
            </div>
          );
        }

        // CASE 2: Pile in List (Stacked)
        if (!isUnstacked) {
          const allChecked = pile.copies.every((c) => selected.has(c.id));
          const someChecked = pile.copies.some((c) => selected.has(c.id));

          return (
            <div
              key={pile.pileKey}
              onClick={() => onTogglePile(pile.pileKey)}
              className={cn(
                'flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors cursor-pointer select-none bg-amber-50/20 dark:bg-amber-950/10',
                allChecked && 'bg-primary/10 font-medium',
              )}
            >
              <Checkbox
                checked={allChecked}
                onCheckedChange={() => {
                  const copyIds = pile.copies.map((c) => c.id);
                  const shouldCheck = !allChecked;
                  copyIds.forEach((id) => {
                    if (shouldCheck && !selected.has(id)) onToggleSelect(id);
                    if (!shouldCheck && selected.has(id)) onToggleSelect(id);
                  });
                }}
                className="shrink-0"
              />
              <div className="relative h-11 w-8 shrink-0">
                <div className="absolute inset-0 bg-amber-200/50 dark:bg-amber-900/50 rounded-md rotate-3 border" />
                <div className="relative h-full w-full overflow-hidden rounded-md border shadow-xs bg-background">
                  <LibraryBookCover
                    showImage={showCoverImages}
                    coverUrl={pile.coverUrl}
                    isbn={pile.isbn}
                    title={pile.title}
                    author={pile.author}
                    aspect="thumb"
                    className="h-full w-full"
                  />
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-black text-xs text-foreground truncate">{pile.title}</span>
                  <Badge className="bg-amber-600 text-white font-bold text-[10px] px-1.5 py-0">
                    <Layers className="h-3 w-3 mr-1" />
                    {pile.copies.length} copies
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{pile.author || 'Author not recorded'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
                  <MapPin className="h-3 w-3 text-primary" />
                  {pile.shelfLocation || defaultShelf || 'Main Stacks'}
                </span>
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {pile.availableCount} avail
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePile(pile.pileKey);
                  }}
                  className="h-7 text-xs font-bold text-amber-700 dark:text-amber-300 gap-1 border-amber-300"
                >
                  <Layers className="h-3 w-3" />
                  <span>Break up</span>
                </Button>
              </div>
            </div>
          );
        }

        // CASE 3: Pile in List (Broken-Up)
        return (
          <div
            key={`unstacked-${pile.pileKey}`}
            className="p-3 bg-muted/20 space-y-2 border-l-4 border-l-amber-500"
          >
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-border/60">
              <div className="flex items-center gap-2 min-w-0">
                <Layers className="h-4 w-4 text-amber-600 shrink-0" />
                <span className="font-black text-xs text-foreground truncate">
                  {pile.title}
                </span>
                <Badge className="bg-amber-600 text-white text-[10px]">
                  {pile.copies.length} copies unstacked
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {onAddCopy && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void onAddCopy(pile.copies[0])}
                    className="h-6 text-[11px] font-bold gap-1 border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                    title="Add another physical copy to this pile"
                  >
                    <CopyPlus className="h-3 w-3 text-amber-500" />
                    <span>Add copy</span>
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onTogglePile(pile.pileKey)}
                  className="h-6 text-[11px] font-bold gap-1 bg-primary text-primary-foreground"
                >
                  <Layers className="h-3 w-3" />
                  <span>Stack pile</span>
                </Button>
              </div>
            </div>

            <div className="divide-y divide-border/40 pl-2">
              {pile.copies.map((copy, copyIdx) => {
                const isChecked = selected.has(copy.id);
                const isLoaned = copy.status === 'checked_out';
                const isDamaged = copy.condition === 'lost' || copy.condition === 'damaged';
                const needsProcessing = !copy.labeled || !copy.shelfLocation;

                return (
                  <div
                    key={copy.id}
                    onClick={() => onOpenDetails(copy)}
                    className={cn(
                      'flex items-center gap-3 py-2 px-2 hover:bg-background/80 rounded-lg transition-colors cursor-pointer select-none',
                      isChecked && 'bg-primary/10 font-medium',
                    )}
                  >
                    <span onClick={(e) => e.stopPropagation()} className="shrink-0">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => onToggleSelect(copy.id)}
                      />
                    </span>
                    <Badge variant="outline" className="font-mono text-[9px] font-bold shrink-0">
                      Copy #{copy.copyNumber || copyIdx + 1}
                    </Badge>
                    <div className="min-w-0 flex-1 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-foreground font-bold">{copy.upc}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={isDamaged ? 'destructive' : isLoaned ? 'default' : needsProcessing ? 'outline' : 'secondary'}
                        className={cn(
                          'text-[10px] capitalize font-bold',
                          needsProcessing && !isDamaged && !isLoaned && 'border-amber-500/60 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
                        )}
                      >
                        {isDamaged ? copy.condition : isLoaned ? loanedToLabel(copy, getName) : needsProcessing ? 'Needs Processing' : 'Available'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
