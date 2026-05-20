'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Student } from '@/lib/types';
import { cn, getStudentNickname } from '@/lib/utils';

function studentDisplayName(s: Student): string {
  return `${getStudentNickname(s)} ${s.lastName ?? ''}`.trim() || s.id;
}

function matchesStudentSearch(s: Student, term: string): boolean {
  const computedName = `${getStudentNickname(s)} ${s.lastName ?? ''} ${s.nickname ?? ''}`.toLowerCase();
  return (
    computedName.includes(term) ||
    s.id.toLowerCase().includes(term) ||
    (s.nfcId?.toLowerCase().includes(term) ?? false)
  );
}

export function LibraryStudentNamePicker({
  students,
  disabled,
  onSelect,
}: {
  students: Student[] | null | undefined;
  disabled?: boolean;
  onSelect: (student: Student) => void;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const normalized = query.trim().toLowerCase();

  const matches = useMemo(() => {
    if (!normalized) return [];
    const list = (students ?? []).filter((s) => matchesStudentSearch(s, normalized));
    list.sort((a, b) => studentDisplayName(a).localeCompare(studentDisplayName(b)));
    return list.slice(0, 12);
  }, [students, normalized]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const pick = (student: Student) => {
    setQuery(studentDisplayName(student));
    setOpen(false);
    onSelect(student);
  };

  return (
    <div ref={rootRef} className="space-y-2">
      <Label htmlFor={`${listId}-input`} className="text-xs font-semibold flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
        Find student by name
      </Label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          id={`${listId}-input`}
          type="search"
          autoComplete="off"
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={`${listId}-listbox`}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder="Start typing a name…"
          className="rounded-xl pl-9"
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
            if (e.key === 'Enter' && matches.length === 1) {
              e.preventDefault();
              pick(matches[0]);
            }
          }}
        />
        {open && normalized && matches.length > 0 ? (
          <ul
            id={`${listId}-listbox`}
            role="listbox"
            className="absolute z-50 mt-1 max-h-52 w-full overflow-auto rounded-xl border bg-popover py-1 shadow-lg"
          >
            {matches.map((s) => (
              <li key={s.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent',
                    'focus-visible:bg-accent focus-visible:outline-none',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                >
                  <span className="font-medium">{studentDisplayName(s)}</span>
                  {s.nfcId ? (
                    <span className="text-[10px] text-muted-foreground">ID {s.nfcId}</span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {open && normalized && matches.length === 0 ? (
          <p className="absolute z-50 mt-1 w-full rounded-xl border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-lg">
            No students match &ldquo;{query.trim()}&rdquo;
          </p>
        ) : null}
      </div>
    </div>
  );
}
