'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  primaryIsbnVariant,
  isRetailIsbnBarcode,
  isbn13ToIsbn10,
  isbn10ToIsbn13,
} from '@/lib/library/libraryCatalogLookup';
import {
  getCachedCoverByIsbn,
  resolveCoverByIsbn,
} from '@/lib/library/libraryCoverResolver';

export type LibraryBookCoverProps = {
  coverUrl?: string | null;
  isbn?: string | null;
  title?: string;
  author?: string;
  className?: string;
  imgClassName?: string;
  aspect?: 'portrait' | 'square' | 'thumb';
  showTitleInFallback?: boolean;
  /** When false, always render the stylized placeholder instead of resolving/loading a real cover image. Defaults to true. */
  showImage?: boolean;
  onCoverResolved?: (resolvedUrl: string) => void;
};

/** Deterministically pick an attractive book spine/cover gradient based on title */
function getCoverGradient(title = ''): string {
  const gradients = [
    'from-sky-800 via-blue-900 to-slate-950 text-sky-50 border-sky-600/40',
    'from-emerald-700 via-teal-900 to-slate-950 text-emerald-50 border-emerald-600/40',
    'from-amber-700 via-amber-900 to-stone-950 text-amber-50 border-amber-600/40',
    'from-purple-800 via-violet-950 to-slate-950 text-purple-50 border-purple-600/40',
    'from-rose-800 via-rose-950 to-stone-950 text-rose-50 border-rose-600/40',
    'from-teal-800 via-cyan-950 to-slate-950 text-teal-50 border-teal-600/40',
    'from-indigo-800 via-slate-900 to-stone-950 text-indigo-50 border-indigo-600/40',
    'from-stone-700 via-stone-900 to-zinc-950 text-stone-100 border-stone-600/40',
  ];
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}

export function LibraryBookCover({
  coverUrl,
  isbn,
  title,
  author,
  className,
  imgClassName,
  aspect = 'portrait',
  showTitleInFallback = true,
  showImage = true,
  onCoverResolved,
}: LibraryBookCoverProps) {
  const [resolvedCover, setResolvedCover] = useState<string | null>(() => {
    if (coverUrl?.trim()) return null;
    return getCachedCoverByIsbn(isbn) ?? null;
  });

  // Automatically resolve missing cover if an ISBN is present
  useEffect(() => {
    if (!showImage) return;
    if (coverUrl?.trim()) return;
    if (!isbn?.trim() || !isRetailIsbnBarcode(isbn.trim())) return;
    if (resolvedCover) return;

    let cancelled = false;
    resolveCoverByIsbn(isbn.trim()).then((url) => {
      if (!cancelled && url) {
        setResolvedCover(url);
        onCoverResolved?.(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [showImage, coverUrl, isbn, resolvedCover, onCoverResolved]);

  // Build ordered candidate URLs to try
  const candidates = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const add = (url?: string | null) => {
      if (!url) return;
      const clean = url.trim().replace(/^http:\/\//i, 'https://');
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push(clean);
      }
    };

    // 1. Explicitly passed coverUrl
    add(coverUrl);

    // 2. Confirmed resolved cover from metadata lookup API
    add(resolvedCover);

    // 3. Direct ISBN endpoints
    if (isbn?.trim() && isRetailIsbnBarcode(isbn.trim())) {
      const primary = primaryIsbnVariant(isbn.trim());
      if (primary) {
        add(`https://covers.openlibrary.org/b/isbn/${primary}-M.jpg?default=false`);
        const ten = isbn13ToIsbn10(primary);
        if (ten) add(`https://covers.openlibrary.org/b/isbn/${ten}-M.jpg?default=false`);
        const thirteen = isbn10ToIsbn13(primary);
        if (thirteen) add(`https://covers.openlibrary.org/b/isbn/${thirteen}-M.jpg?default=false`);
      }
    }
    return list;
  }, [coverUrl, resolvedCover, isbn]);

  const [candidateIndex, setCandidateIndex] = useState(0);
  const [hasError, setHasError] = useState(false);

  // Reset when candidates change
  useEffect(() => {
    setCandidateIndex(0);
    setHasError(false);
  }, [candidates]);

  const currentSrc = candidates[candidateIndex];

  const handleError = () => {
    if (candidateIndex + 1 < candidates.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasError(true);
    }
  };

  const gradientClass = useMemo(() => getCoverGradient(title), [title]);

  const aspectClass =
    aspect === 'portrait' ? 'aspect-[2/3]' : aspect === 'square' ? 'aspect-square' : 'h-12 w-9';

  if (showImage && !hasError && currentSrc) {
    return (
      <div className={cn('relative overflow-hidden bg-muted/30 select-none', aspectClass, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={title || 'Book cover'}
          onError={handleError}
          className={cn('h-full w-full object-cover transition-opacity duration-200', imgClassName)}
          loading="lazy"
        />
        {/* Subtle book spine edge highlight */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-r from-black/25 via-white/10 to-transparent" />
      </div>
    );
  }

  // Fallback stylized book cover
  return (
    <div
      className={cn(
        'relative flex flex-col justify-between overflow-hidden bg-gradient-to-b p-2 shadow-xs select-none',
        gradientClass,
        aspectClass,
        className,
      )}
    >
      {/* Book spine simulated crease line */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-r from-black/30 via-white/15 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-1.5 w-px bg-black/20" />

      {/* Top Header / Glyph */}
      <div className="flex items-center justify-between pl-1">
        <BookOpen className="h-4 w-4 opacity-70" />
      </div>

      {/* Title & Author on Cover */}
      {showTitleInFallback && aspect !== 'thumb' && (
        <div className="space-y-1 pl-1 pr-0.5 my-auto text-center">
          <p className="line-clamp-3 text-[11px] font-extrabold leading-tight tracking-tight drop-shadow-xs">
            {title || 'Untitled Book'}
          </p>
          {author && (
            <p className="line-clamp-1 text-[9px] font-medium opacity-80 drop-shadow-xs">
              {author}
            </p>
          )}
        </div>
      )}

      {/* Bottom accent band */}
      <div className="h-1 w-full rounded-full bg-white/20 pl-1" />
    </div>
  );
}
