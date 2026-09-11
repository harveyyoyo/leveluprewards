'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, User, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LibraryStudentNamedLabel, useLibraryStudentDisplay } from './LibraryStudentNamedLabel';

function matchesStudentSearch(s: Student, term: string): boolean {
  const terms = term.split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;

  const first = (s.firstName ?? '').toLowerCase();
  const last = (s.lastName ?? '').toLowerCase();
  const nick = (s.nickname ?? '').toLowerCase();
  const id = (s.id ?? '').toLowerCase();
  const nfc = (s.nfcId ?? '').toLowerCase();
  const full = `${first} ${last} ${nick}`;

  return terms.every(
    (t) =>
      first.includes(t) ||
      last.includes(t) ||
      nick.includes(t) ||
      full.includes(t) ||
      id.includes(t) ||
      nfc.includes(t),
  );
}

export interface LibraryStudentNamePickerProps {
  students: Student[] | null | undefined;
  disabled?: boolean;
  onSelect: (student: Student) => void;
  variant?: 'default' | 'kiosk';
  clearOnSelect?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  label?: string;
}

export function LibraryStudentNamePicker({
  students,
  disabled,
  onSelect,
  variant = 'default',
  clearOnSelect = false,
  placeholder,
  autoFocus = false,
  className,
  label = 'Find student by name',
}: LibraryStudentNamePickerProps) {
  const { formatName } = useLibraryStudentDisplay();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalized = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalized) return [];
    const list = (students ?? []).filter((s) => matchesStudentSearch(s, normalized));

    // Sort: exact prefix match first, then alphabetically
    list.sort((a, b) => {
      const nameA = formatName(a).toLowerCase();
      const nameB = formatName(b).toLowerCase();
      const aStarts = nameA.startsWith(normalized);
      const bStarts = nameB.startsWith(normalized);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return nameA.localeCompare(nameB);
    });

    return list.slice(0, 10);
  }, [students, normalized, formatName]);

  // Reset active index when matches change
  useEffect(() => {
    setActiveIndex(0);
  }, [matches]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const pick = (student: Student) => {
    if (clearOnSelect) {
      setQuery('');
    } else {
      setQuery(formatName(student));
    }
    setOpen(false);
    onSelect(student);
  };

  const isKiosk = variant === 'kiosk';

  return (
    <div ref={rootRef} className={cn('space-y-1.5', className)}>
      {label ? (
        <Label
          htmlFor={`${listId}-input`}
          className={cn(
            'font-semibold flex items-center gap-1.5',
            isKiosk ? 'text-xs sm:text-sm text-foreground' : 'text-xs text-foreground',
          )}
        >
          <User className={cn('text-primary shrink-0', isKiosk ? 'h-4 w-4' : 'h-3.5 w-3.5')} aria-hidden />
          {label}
        </Label>
      ) : null}
      <div className="relative">
        <Search
          className={cn(
            'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors',
            isKiosk ? 'h-5 w-5' : 'h-4 w-4',
            open && normalized ? 'text-primary' : '',
          )}
          aria-hidden
        />
        <Input
          ref={inputRef}
          id={`${listId}-input`}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          aria-activedescendant={
            open && matches[activeIndex] ? `${listId}-opt-${matches[activeIndex].id}` : undefined
          }
          disabled={disabled}
          autoFocus={autoFocus}
          placeholder={placeholder || (isKiosk ? 'Type your name (e.g. Alex, Sarah)...' : 'Start typing a name…')}
          className={cn(
            'transition-all [&::-webkit-search-cancel-button]:hidden',
            isKiosk
              ? 'h-12 sm:h-13 rounded-2xl pl-11 pr-10 text-base sm:text-lg font-medium border-2 focus-visible:ring-4 focus-visible:ring-primary/20'
              : 'rounded-xl pl-9 pr-8',
          )}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              return;
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              if (!open) {
                setOpen(true);
              } else if (matches.length > 0) {
                setActiveIndex((prev) => (prev + 1) % matches.length);
              }
              return;
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              if (matches.length > 0) {
                setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
              }
              return;
            }
            if (e.key === 'Enter') {
              if (matches.length > 0 && activeIndex >= 0 && activeIndex < matches.length) {
                e.preventDefault();
                pick(matches[activeIndex]);
              }
            }
          }}
        />

        {query ? (
          <button
            type="button"
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
            )}
            onClick={() => {
              setQuery('');
              setOpen(false);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X className={isKiosk ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
          </button>
        ) : null}

        {open && normalized && matches.length > 0 ? (
          <div
            id={`${listId}-listbox`}
            role="listbox"
            className={cn(
              'absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border-2 border-primary/30 bg-popover/95 backdrop-blur-md shadow-2xl animate-in fade-in zoom-in-95 duration-150',
              isKiosk ? 'max-h-72' : 'max-h-56',
            )}
          >
            <div className="border-b border-border/60 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Matching Students ({matches.length})</span>
              <span className="text-[10px] lowercase font-normal opacity-70">press enter or tap to select</span>
            </div>
            <ul className="overflow-y-auto max-h-[inherit] p-1.5 space-y-1">
              {matches.map((s, idx) => {
                const isSelected = idx === activeIndex;
                const initials = (
                  (s.firstName?.[0] || '') + (s.lastName?.[0] || '')
                ).toUpperCase() || 'ST';

                return (
                  <li key={s.id} id={`${listId}-opt-${s.id}`} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      className={cn(
                        'group flex w-full items-center justify-between gap-3 rounded-xl text-left transition-all',
                        isKiosk ? 'p-2.5 sm:p-3 text-base' : 'px-3 py-2 text-sm',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-md'
                          : 'hover:bg-accent/80 text-foreground',
                      )}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => pick(s)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl font-black text-xs sm:text-sm tracking-wider shadow-inner',
                            isSelected
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'bg-primary/10 text-primary',
                          )}
                        >
                          {s.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={s.photoUrl}
                              alt={formatName(s)}
                              className="h-full w-full object-cover rounded-xl"
                            />
                          ) : (
                            <span>{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              'truncate font-black tracking-tight leading-tight',
                              isSelected ? 'text-primary-foreground' : 'text-foreground',
                            )}
                          >
                            <LibraryStudentNamedLabel
                              student={s}
                              applyColor={!isSelected}
                              nameClassName={cn(
                                'truncate font-black tracking-tight leading-tight',
                                isSelected ? 'text-primary-foreground' : 'text-foreground',
                              )}
                            />
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
                            {s.nickname && s.firstName && s.nickname.toLowerCase() !== s.firstName.toLowerCase() ? (
                              <span
                                className={cn(
                                  'font-medium text-[11px]',
                                  isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                                )}
                              >
                                ({s.firstName})
                              </span>
                            ) : null}
                            {s.nfcId ? (
                              <span
                                className={cn(
                                  'rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                                  isSelected
                                    ? 'bg-primary-foreground/20 text-primary-foreground'
                                    : 'bg-muted text-muted-foreground',
                                )}
                              >
                                ID {s.nfcId}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-1">
                        <span
                          className={cn(
                            'text-xs font-bold px-2 py-1 rounded-lg transition-opacity',
                            isSelected
                              ? 'bg-primary-foreground text-primary shadow-sm opacity-100'
                              : 'opacity-0 group-hover:opacity-100 bg-muted text-muted-foreground',
                          )}
                        >
                          Select ↵
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}

        {open && normalized && matches.length === 0 ? (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border-2 border-border/80 bg-popover/95 p-4 text-center text-sm shadow-xl backdrop-blur-md">
            <p className="font-bold text-foreground">No students match &ldquo;{query.trim()}&rdquo;</p>
            <p className="text-xs text-muted-foreground pt-1">
              Try typing your first name or scan your student badge card instead.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
