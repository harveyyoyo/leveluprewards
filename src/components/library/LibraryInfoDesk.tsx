'use client';

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Search,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Monitor,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Info,
  Calendar,
  SlidersHorizontal,
  Plus,
  X,
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useSettings } from '@/components/providers/SettingsProvider';
import { resolveLibraryTheme, type LibraryThemeId } from '@/lib/library/libraryThemes';
import { resolveBookClassification } from '@/lib/library/libraryClassification';
import { formatDueDate, computeDaysOverdue, resolveStudentMaxCheckouts } from '@/lib/library/libraryPolicy';
import { useBarcodeReaderWedge } from '@/hooks/useBarcodeReaderWedge';
import type { Category, LibraryItem, Student } from '@/lib/types';
import { cn } from '@/lib/utils';

export interface LibraryInfoDeskProps {
  catalogItems?: LibraryItem[] | null;
  students?: Student[] | null;
  categories?: Category[] | null;
  getStudentName: (id?: string) => string;
  copiesCount?: number;
  activeLoansCount?: number;
  overdueLoansCount?: number;
  onSwitchToKiosk: () => void;
  onViewCatalog: (statusFilter?: 'available' | 'checked_out') => void;
  onViewLoans?: (subTab: 'active' | 'overdue') => void;
  onOpenIntake?: (initialCode?: string) => void;
  onOpenBookDetails?: (book: LibraryItem) => void;
  schoolId: string | null;
  schoolName?: string;
}


// Count-up animation hook (matches the welcome page pattern)
function useCountUp(target: number, duration = 900, enabled = true): number {
  const [current, setCurrent] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!enabled || hasAnimated.current || target === 0) {
      setCurrent(target);
      return;
    }
    hasAnimated.current = true;
    const startTime = performance.now();
    let rafId: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, enabled]);

  return current;
}

// Elegant, subtle ambient scan sweep meant to sit inside the search bar's relative/overflow-hidden container
function LibrarySearchScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]" aria-hidden>
      <div
        className="student-kiosk-scan-beam-horizontal absolute inset-y-0 w-[16%] max-w-[5rem] opacity-[0.12] blur-[16px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, hsl(var(--primary) / 0.6) 50%, transparent 100%)',
          animationDuration: '3.4s',
        }}
      />
    </div>
  );
}

export function LibraryInfoDesk({
  catalogItems = [],
  students = [],
  categories = [],
  getStudentName,
  copiesCount = 0,
  activeLoansCount = 0,
  overdueLoansCount = 0,
  onSwitchToKiosk,
  onViewCatalog,
  onViewLoans,
  onOpenIntake,
  onOpenBookDetails,
  schoolId,
  schoolName = 'School Library',
}: LibraryInfoDeskProps) {
  const { settings } = useSettings();
  const currentThemeId = (settings.libraryTheme as LibraryThemeId) || 'classic_oak';
  const currentTheme = resolveLibraryTheme(currentThemeId);
  const isNightDesk = currentTheme.id === 'night_desk';
  const isReadingRoom = currentTheme.id === 'reading_room';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<LibraryItem | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [unrecognizedCode, setUnrecognizedCode] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savingLimit, setSavingLimit] = useState(false);
  const [customLimitInput, setCustomLimitInput] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Available copies calculation — must match the Catalog tab's "available" filter
  // (status === 'available' AND good condition), otherwise lost/damaged copies inflate this stat.
  const availableCopiesCount = useMemo(
    () => (catalogItems ?? []).filter((i) => i.status === 'available' && (!i.condition || i.condition === 'good')).length,
    [catalogItems],
  );

  // Count-up animated values for stat cards
  const totalsAnimated = settings.libraryDeskTotalsAnimated ?? true;
  const animCopies = useCountUp(copiesCount, 900, totalsAnimated);
  const animAvailable = useCountUp(availableCopiesCount, 900, totalsAnimated);
  const animLoans = useCountUp(activeLoansCount, 900, totalsAnimated);
  const animOverdue = useCountUp(overdueLoansCount, 900, totalsAnimated);

  const [shelfFilter, setShelfFilter] = useState<'all' | 'available' | 'checked_out' | 'overdue'>('all');

  // Search matches: books and students
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q || q.length < 2) return { books: [], students: [] };

    const books = (catalogItems || [])
      .filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          (b.author && b.author.toLowerCase().includes(q)) ||
          b.upc.toLowerCase().includes(q) ||
          (b.isbn && b.isbn.toLowerCase().includes(q)) ||
          (b.shelfLocation && b.shelfLocation.toLowerCase().includes(q)),
      )
      .slice(0, 6);

    const matchedStudents = (students || [])
      .filter((s) => {
        const full = `${s.firstName ?? ''} ${s.lastName ?? ''}`.toLowerCase();
        const nickname = (s.nickname ?? '').toLowerCase();
        const id = (s.id ?? '').toLowerCase();
        const nfc = String(s.nfcId ?? '').toLowerCase();
        return (
          full.includes(q) ||
          nickname.includes(q) ||
          id.includes(q) ||
          nfc.includes(q)
        );
      })
      .slice(0, 4);

    return { books, students: matchedStudents };
  }, [searchQuery, catalogItems, students]);

  // Handle barcode wedge scan in info mode -> look up item/student without checking out!
  const handleScanLookup = useCallback(
    (raw: string) => {
      const clean = raw.trim();
      if (!clean) return;
      setSearchQuery(clean);

      // Check if student
      const studentMatch = (students || []).find(
        (s) => s.id === clean || String(s.nfcId ?? '').trim() === clean,
      );
      if (studentMatch) {
        setSelectedStudent(studentMatch);
        setSelectedBook(null);
        setUnrecognizedCode(null);
        setShowSuggestions(false);
        return;
      }

      // Check if book
      const bookMatch = (catalogItems || []).find(
        (b) => b.upc.toUpperCase() === clean.toUpperCase() || b.isbn === clean,
      );
      if (bookMatch) {
        setSelectedBook(bookMatch);
        setSelectedStudent(null);
        setUnrecognizedCode(null);
        setShowSuggestions(false);

        // Auto-mark copy as labeled if verified by physical scan
        if (firestore && schoolId && !bookMatch.labeled) {
          const itemRef = doc(firestore, 'schools', schoolId, 'library', bookMatch.id);
          updateDoc(itemRef, { labeled: true, labeledAt: Date.now() }).catch(() => {});
          bookMatch.labeled = true;
        }
        return;
      }

      // If length >= 4 and not recognized as student or book, flag as unrecognized
      if (clean.length >= 4) {
        setUnrecognizedCode(clean);
      } else {
        setUnrecognizedCode(null);
      }
      setSelectedBook(null);
      setSelectedStudent(null);
      setShowSuggestions(true);
    },
    [students, catalogItems, firestore, schoolId],
  );

  const reader = useBarcodeReaderWedge({
    active: true,
    onScan: handleScanLookup,
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When a book is selected, calculate its details
  const bookClassification = useMemo(() => {
    if (!selectedBook) return null;
    return resolveBookClassification(
      selectedBook.category,
      settings.libraryGenreDefinitions,
      selectedBook.shelfLocation,
    );
  }, [selectedBook, settings.libraryGenreDefinitions]);

  // If a student is selected, get their active loans
  const studentLoans = useMemo(() => {
    if (!selectedStudent || !catalogItems) return [];
    return catalogItems.filter((i) => i.checkedOutTo === selectedStudent.id);
  }, [selectedStudent, catalogItems]);

  const effectiveStudentLimit = useMemo(() => {
    return resolveStudentMaxCheckouts(selectedStudent, settings.libraryMaxCheckoutsPerStudent ?? 3);
  }, [selectedStudent, settings.libraryMaxCheckoutsPerStudent]);

  const handleUpdateStudentLimit = async (newLimit: number | null) => {
    if (!firestore || !schoolId || !selectedStudent?.id) return;
    try {
      setSavingLimit(true);
      const studentRef = doc(firestore, 'schools', schoolId, 'students', selectedStudent.id);
      await updateDoc(studentRef, { libraryMaxCheckouts: newLimit });
      setSelectedStudent((prev) => (prev ? { ...prev, libraryMaxCheckouts: newLimit } : null));
      toast({
        title: 'Borrowing limit updated',
        description:
          newLimit === null
            ? `Reset to school default (${settings.libraryMaxCheckoutsPerStudent ?? 3} books)`
            : newLimit === 0
            ? `Allowed unlimited checkouts for ${selectedStudent.firstName}`
            : `Set to ${newLimit} books for ${selectedStudent.firstName}`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to update borrowing limit',
        description: err?.message || 'Could not save student setting.',
      });
    } finally {
      setSavingLimit(false);
    }
  };

  const clearSelection = () => {
    setSelectedBook(null);
    setSelectedStudent(null);
    setSearchQuery('');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200" aria-label="Library Desk">
      {/* 1. STATS OVERVIEW CARDS (LINK OUT TO CATALOG / LOANS) */}
      {(settings.libraryDeskShowTotals ?? true) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => onViewCatalog()}
            className={cn(
              'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
              isNightDesk
                ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
                : isReadingRoom
                  ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
                  : 'border-border/80 bg-card hover:border-blue-500/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                Total Catalog
              </span>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center transition-transform group-hover:scale-110">
                <BookOpen className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black tracking-tight">{animCopies}</div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
                <span>Physical books in library</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onViewCatalog('available')}
            className={cn(
              'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
              isNightDesk
                ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
                : isReadingRoom
                  ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
                  : 'border-border/80 bg-card hover:border-emerald-500/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                On Shelf Today
              </span>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center transition-transform group-hover:scale-110">
                <CheckCircle2 className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {animAvailable}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
                <span>Ready for immediate loan</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onViewLoans?.('active')}
            className={cn(
              'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
              isNightDesk
                ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
                : isReadingRoom
                  ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
                  : 'border-border/80 bg-card hover:border-amber-500/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Active Loans
              </span>
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center transition-transform group-hover:scale-110">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div className="text-lg sm:text-xl font-black tracking-tight">{animLoans}</div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
                <span>Currently with students</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onViewLoans?.('overdue')}
            className={cn(
              'group rounded-xl border p-3 sm:p-3.5 flex flex-col justify-between text-left transition-all duration-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer',
              overdueLoansCount > 0
                ? 'border-rose-500/30 bg-rose-500/5 hover:border-rose-500/50'
                : isNightDesk
                  ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700 text-white'
                  : isReadingRoom
                    ? 'border-stone-300 bg-stone-50/90 hover:border-stone-400 text-stone-900'
                    : 'border-border/80 bg-card hover:border-rose-500/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'text-[10px] font-black uppercase tracking-wider',
                  overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
                )}
              >
                Overdue
              </span>
              <div
                className={cn(
                  'h-6 w-6 sm:h-7 sm:w-7 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110',
                  overdueLoansCount > 0
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-1.5">
              <div
                className={cn(
                  'text-lg sm:text-xl font-black tracking-tight',
                  overdueLoansCount > 0 ? 'text-rose-600 dark:text-rose-400' : '',
                )}
              >
                {animOverdue}
              </div>
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 font-medium">
                <span>{overdueLoansCount > 0 ? 'Reminders needed' : 'All loans on schedule'}</span>
                <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* 2. INFO LOOKUP SEARCH BAR (READ ONLY LOOKUPS) — centered on the page while idle, moves to the top once a search/result appears */}
      <div
        className={cn(
          'transition-all duration-300',
          !selectedBook && !selectedStudent
            ? 'flex flex-1 flex-col items-center justify-center min-h-[42vh] sm:min-h-[48vh]'
            : '',
        )}
      >
      <div
        className={cn(
          'w-full rounded-3xl border p-6 sm:p-8 shadow-lg space-y-5 relative transition-all',
          isNightDesk
            ? 'border-slate-800 bg-slate-900/90 text-white'
            : isReadingRoom
              ? 'border-stone-300 bg-white text-stone-900'
              : 'border-border/80 bg-card',
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                Quick Information &amp; Shelf Lookup
              </h3>
              <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                Info &amp; Scan
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Search or scan any barcode to check live availability, borrower details, and shelf bay.
            </p>
          </div>
        </div>

        <div className="relative" ref={searchContainerRef}>
          <div
            className={cn(
              'relative flex items-center gap-3 rounded-2xl border p-3 focus-within:ring-2 transition-all shadow-xs overflow-hidden',
              isNightDesk
                ? 'bg-slate-950 border-slate-800 focus-within:border-amber-500/80 focus-within:ring-amber-500/20'
                : 'bg-background border-border/80 focus-within:border-primary/80 focus-within:ring-primary/20',
            )}
          >
            <LibrarySearchScanOverlay />
            <div className="relative ml-2 shrink-0">
              <span className="absolute -inset-1.5 rounded-full bg-primary/15 animate-ping" aria-hidden />
              <Search className="relative h-7 w-7 text-muted-foreground" />
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-background" aria-hidden />
            </div>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleScanLookup(searchQuery);
                }
              }}
              placeholder="Search title, author, barcode, shelf location, or student name…"
              className="h-14 flex-1 border-0 bg-transparent text-lg sm:text-xl font-medium placeholder:text-muted-foreground shadow-none focus-visible:ring-0 focus-visible:outline-none"
            />
            {searchQuery ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <kbd className="hidden sm:inline-flex h-6 select-none items-center gap-1 rounded border border-border/80 bg-muted px-2 font-mono text-[10px] font-semibold text-muted-foreground">
                ↵ Lookup
              </kbd>
            )}
          </div>

          {/* Quick Query Chips (opt-in via Library Settings, off by default) */}
          {(settings.libraryDeskShowQuickFilters || shelfFilter !== 'all' || searchQuery || selectedBook || selectedStudent) && (
            <div className="flex items-center gap-2 pt-1.5 flex-wrap">
              {settings.libraryDeskShowQuickFilters && (
                <>
                  <span className="text-[11px] font-bold text-muted-foreground mr-1">Quick:</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShelfFilter((curr) => (curr === 'available' ? 'all' : 'available'));
                      setSelectedBook(null);
                      setSelectedStudent(null);
                    }}
                    className={cn(
                      'h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 transition-colors',
                      shelfFilter === 'available'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                        : 'bg-background/50 hover:bg-muted border-border/60',
                    )}
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    <span>Available Books</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShelfFilter((curr) => (curr === 'checked_out' ? 'all' : 'checked_out'));
                      setSelectedBook(null);
                      setSelectedStudent(null);
                    }}
                    className={cn(
                      'h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 transition-colors',
                      shelfFilter === 'checked_out'
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                        : 'bg-background/50 hover:bg-muted border-border/60',
                    )}
                  >
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Active Loans</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (students && students.length > 0) {
                        setSelectedStudent(students[0]);
                        setSelectedBook(null);
                      }
                    }}
                    className={cn(
                      'h-7 px-2.5 text-xs font-semibold rounded-lg gap-1.5 transition-colors',
                      selectedStudent
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'bg-background/50 hover:bg-muted border-border/60',
                    )}
                  >
                    <User className="h-3 w-3 text-primary" />
                    <span>Student Patrons</span>
                  </Button>
                </>
              )}

              {(shelfFilter !== 'all' || searchQuery || selectedBook || selectedStudent) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShelfFilter('all');
                    clearSelection();
                  }}
                  className="h-7 px-2.5 text-xs font-bold text-muted-foreground hover:text-foreground ml-auto"
                >
                  Reset Filters
                </Button>
              )}
            </div>
          )}

          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && (searchMatches.books.length > 0 || searchMatches.students.length > 0) && (
            <div className="absolute top-full left-0 right-0 z-50 mt-1.5 max-h-80 overflow-y-auto rounded-2xl border border-border/80 bg-popover p-2 shadow-2xl space-y-2 animate-in fade-in">
              {searchMatches.books.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Books in Catalog ({searchMatches.books.length})
                  </div>
                  {searchMatches.books.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setSelectedBook(b);
                        setSelectedStudent(null);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-muted/80 flex items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-6 rounded bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                          {b.coverUrl ? (
                            <img src={b.coverUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <BookOpen className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">{b.name}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {b.author ? `${b.author} · ` : ''}Shelf: {b.shelfLocation || 'Main Stacks'}
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={b.status === 'available' ? 'default' : 'secondary'}
                        className={cn(
                          'text-[10px] font-bold shrink-0',
                          b.status === 'available' ? 'bg-emerald-600' : 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
                        )}
                      >
                        {b.status === 'available' ? 'Available' : 'On Loan'}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}

              {searchMatches.students.length > 0 && (
                <div className="border-t pt-1 border-border/50">
                  <div className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    Patrons &amp; Students ({searchMatches.students.length})
                  </div>
                  {searchMatches.students.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setSelectedStudent(s);
                        setSelectedBook(null);
                        setShowSuggestions(false);
                      }}
                      className="w-full text-left p-2.5 rounded-xl hover:bg-muted/80 flex items-center justify-between gap-3 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {s.firstName?.[0] || 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-foreground truncate">
                            {s.firstName} {s.lastName}
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            Student ID: {s.id}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] text-primary font-bold">View loan info &rarr;</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Unrecognized Book Prompt Card */}
        {unrecognizedCode && !selectedBook && !selectedStudent && (
          <div className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/10 p-4 sm:p-5 space-y-3 animate-in fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-bold text-sm text-foreground">Book Not Found in Catalog</h4>
                  <p className="text-xs text-muted-foreground">
                    Barcode or ISBN <strong className="font-mono text-foreground font-bold">&ldquo;{unrecognizedCode}&rdquo;</strong> is not yet registered in the school library.
                  </p>
                  <p className="text-xs font-semibold text-foreground pt-1">
                    Would you like to register and add this book to the catalog now?
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUnrecognizedCode(null)}
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={() => {
                  if (onOpenIntake) {
                    onOpenIntake(unrecognizedCode);
                  }
                  setUnrecognizedCode(null);
                }}
                className="rounded-xl text-xs font-bold gap-1.5 bg-amber-600 hover:bg-amber-500 text-white shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Register &amp; Add Book</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnrecognizedCode(null)}
                className="rounded-xl text-xs font-semibold"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}
      </div>

        {/* 4. LOOKED UP ITEM INFORMATION PANEL */}
        {selectedBook && bookClassification && (
          <div
            className={cn(
              'rounded-2xl border p-5 space-y-4 animate-in fade-in',
              isNightDesk ? 'border-slate-800 bg-slate-950/60' : 'border-border/80 bg-muted/20',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4 min-w-0">
                <div className="w-16 h-22 rounded-xl bg-muted border overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                  {selectedBook.coverUrl ? (
                    <img src={selectedBook.coverUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookOpen className="h-7 w-7 text-muted-foreground" />
                  )}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="text-[10px] font-black uppercase tracking-wide px-2 py-0.5 rounded text-white"
                      style={{ backgroundColor: bookClassification.color }}
                    >
                      {bookClassification.genre.callPrefix} &middot; {bookClassification.genre.label}
                    </span>
                    <Badge
                      variant={selectedBook.status === 'available' ? 'default' : 'destructive'}
                      className={cn(
                        'text-xs font-bold',
                        selectedBook.status === 'available'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-amber-600 text-white',
                      )}
                    >
                      {selectedBook.status === 'available' ? 'Available on Shelf' : 'Currently On Loan'}
                    </Badge>
                  </div>

                  <h4 className="text-lg font-black text-foreground truncate">{selectedBook.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    {selectedBook.author ? `By ${selectedBook.author}` : 'Author unknown'}
                    {selectedBook.publishedYear ? ` · (${selectedBook.publishedYear})` : ''}
                    {selectedBook.copyNumber ? ` · Copy #${selectedBook.copyNumber}` : ''}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground pt-1 flex-wrap">
                    <span>
                      Barcode: <strong className="text-foreground">{selectedBook.upc}</strong>
                    </span>
                    {selectedBook.isbn ? <span>ISBN: {selectedBook.isbn}</span> : null}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* "Book Details" action lives in the Direct Actions row below — no need to duplicate it here. */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedBook(null)}
                  className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Location & Loan Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
              <div className="rounded-xl border bg-background/80 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span>Physical Shelf Location</span>
                </div>
                <div className="font-bold text-foreground text-sm">
                  {selectedBook.shelfLocation || bookClassification.shelfLocation || 'Main Stacks'}
                </div>
                <p className="text-[10.5px] text-muted-foreground">
                  Where this book is physically placed in the library
                </p>
              </div>

              <div className="rounded-xl border bg-background/80 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Circulation Status</span>
                </div>
                {selectedBook.status === 'checked_out' ? (
                  <div>
                    <div className="font-bold text-foreground text-sm">
                      Loaned to: {selectedBook.checkedOutTo ? getStudentName(selectedBook.checkedOutTo) : 'Student'}
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      Due: {formatDueDate(selectedBook.dueAt)}
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      Ready for checkout
                    </div>
                    <p className="text-[10.5px] text-muted-foreground">
                      Available for any patron to borrow at the Kiosk
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Actions: Book Details, View in Catalog & Kiosk */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-border/40">
              <div className="flex items-center gap-2 flex-wrap">
                {onOpenBookDetails && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenBookDetails(selectedBook)}
                    className="rounded-xl text-xs font-bold gap-1.5 hover:bg-muted"
                  >
                    <Info className="h-3.5 w-3.5 text-primary" />
                    <span>Book Details</span>
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onViewCatalog()}
                  className="rounded-xl text-xs font-bold gap-1.5"
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  <span>View in Catalog</span>
                </Button>
              </div>

              <Button
                type="button"
                size="sm"
                onClick={onSwitchToKiosk}
                className="rounded-xl text-xs font-black gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>
                  {selectedBook.status === 'checked_out' ? 'Return this Book in Kiosk' : 'Borrow in Kiosk'}
                </span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* 5. LOOKED UP PATRON INFORMATION PANEL */}
        {selectedStudent && (
          <div
            className={cn(
              'rounded-2xl border p-5 space-y-4 animate-in fade-in',
              isNightDesk ? 'border-slate-800 bg-slate-950/60' : 'border-border/80 bg-muted/20',
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg">
                  {selectedStudent.firstName?.[0] || 'S'}
                </div>
                <div>
                  <h4 className="text-base font-black text-foreground">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Student ID: {selectedStudent.id}
                    {selectedStudent.classId ? ` · Class ${selectedStudent.classId}` : ''}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedStudent(null)}
                className="h-8 w-8 p-0 rounded-lg text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Student Borrowing Limit & Custom Privileges */}
            <div className={cn(
              'rounded-xl border p-3.5 space-y-3',
              isNightDesk ? 'border-slate-800 bg-slate-900/60' : 'border-primary/20 bg-primary/5',
            )}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-foreground flex items-center gap-1.5">
                      <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
                      Borrowing Limit &amp; Privileges
                    </span>
                    {selectedStudent.libraryMaxCheckouts === 0 ? (
                      <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30 text-[10px] font-black uppercase">
                        Unlimited Books (∞)
                      </Badge>
                    ) : selectedStudent.libraryMaxCheckouts != null ? (
                      <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] font-black uppercase">
                        Custom: {selectedStudent.libraryMaxCheckouts} Books
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold text-muted-foreground">
                        School Default ({settings.libraryMaxCheckoutsPerStudent ?? 3} Books)
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Allow this specific student to borrow more books simultaneously.
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-xs font-bold text-foreground">
                    {studentLoans.length} of {effectiveStudentLimit === 0 ? '∞' : effectiveStudentLimit} books
                  </span>
                  <div className="text-[10px] text-muted-foreground">
                    {effectiveStudentLimit === 0
                      ? 'No checkout cap'
                      : studentLoans.length >= effectiveStudentLimit
                      ? 'Checkout limit reached'
                      : `${effectiveStudentLimit - studentLoans.length} more available`}
                  </div>
                </div>
              </div>

              {/* Preset Buttons & Custom Input */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-muted-foreground">Change limit:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedStudent.libraryMaxCheckouts == null ? 'default' : 'outline'}
                    disabled={savingLimit}
                    onClick={() => handleUpdateStudentLimit(null)}
                    className={cn(
                      'h-7 px-3 text-xs font-bold rounded-lg transition-all',
                      selectedStudent.libraryMaxCheckouts == null ? 'shadow-xs' : 'hover:bg-muted'
                    )}
                  >
                    Default ({settings.libraryMaxCheckoutsPerStudent ?? 3})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={selectedStudent.libraryMaxCheckouts === 0 ? 'default' : 'outline'}
                    disabled={savingLimit}
                    onClick={() => handleUpdateStudentLimit(0)}
                    className={cn(
                      'h-7 px-3 text-xs font-bold rounded-lg transition-all',
                      selectedStudent.libraryMaxCheckouts === 0 ? 'shadow-xs' : 'hover:bg-muted'
                    )}
                  >
                    Unlimited (∞)
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground">Custom:</span>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Limit #"
                    value={customLimitInput}
                    onChange={(e) => setCustomLimitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const num = parseInt(customLimitInput, 10);
                        if (!isNaN(num) && num > 0) {
                          handleUpdateStudentLimit(num);
                          setCustomLimitInput('');
                        }
                      }
                    }}
                    className="h-7 w-20 text-xs px-2 rounded-lg"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={savingLimit || !customLimitInput || parseInt(customLimitInput, 10) <= 0}
                    onClick={() => {
                      const num = parseInt(customLimitInput, 10);
                      if (!isNaN(num) && num > 0) {
                        handleUpdateStudentLimit(num);
                        setCustomLimitInput('');
                      }
                    }}
                    className="h-7 text-xs font-bold px-2.5 rounded-lg border-primary/40 text-primary hover:bg-primary/10"
                  >
                    Set
                  </Button>
                </div>
              </div>
            </div>

            {/* Student's Current Active Loans */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground">
                  Current Active Loans ({studentLoans.length})
                </span>
                {selectedStudent.libraryFineBalance ? (
                  <span className="text-rose-600 dark:text-rose-400 font-bold">
                    Fine Balance: {selectedStudent.libraryFineBalance} units
                  </span>
                ) : null}
              </div>

              {studentLoans.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">
                  No books currently on loan. Ready to borrow up to {effectiveStudentLimit === 0 ? 'unlimited' : effectiveStudentLimit} books.
                </p>
              ) : (
                <div className="space-y-2">
                  {studentLoans.map((loan) => {
                    const daysOverdue = computeDaysOverdue(loan.dueAt);
                    const isLate = daysOverdue > 0;
                    return (
                      <div
                        key={loan.id}
                        className="flex items-center justify-between p-3 rounded-xl border bg-background text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate">{loan.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Due: {formatDueDate(loan.dueAt)}
                            </div>
                          </div>
                        </div>

                        {isLate ? (
                          <Badge variant="destructive" className="text-[10px] font-bold shrink-0">
                            {daysOverdue}d Overdue
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground shrink-0">
                            On Time
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button
                type="button"
                size="sm"
                onClick={onSwitchToKiosk}
                className="rounded-xl text-xs font-black gap-1.5 bg-primary text-primary-foreground shadow-xs"
              >
                <Monitor className="h-3.5 w-3.5" />
                <span>Open Kiosk for {selectedStudent.firstName}</span>
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
