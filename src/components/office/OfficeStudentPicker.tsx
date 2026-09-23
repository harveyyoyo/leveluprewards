'use client';

import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { OfficeStudent } from '@/lib/office/types';
import { getOfficeStudentFullName } from '@/lib/office/officeUtils';
import { cn } from '@/lib/utils';

const MAX_RESULTS = 8;

/**
 * Pick one student by typing part of their name or class. Built as a plain text box with a list
 * under it (no pop-up layer), so it works inside dialogs and sheets.
 */
export function OfficeStudentPicker({
  students,
  classNameById,
  value,
  onChange,
  id,
}: {
  students: OfficeStudent[];
  classNameById: Map<string, string>;
  value: string;
  onChange: (studentId: string) => void;
  id?: string;
}) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const selected = students.find((s) => s.id === value);

  const matches = useMemo(() => {
    const q = text.trim().toLowerCase();
    if (!q) return [];
    return students
      .filter((s) => {
        const cls = (s.classId && classNameById.get(s.classId)) || '';
        return `${getOfficeStudentFullName(s)} ${cls}`.toLowerCase().includes(q);
      })
      .sort((a, b) => getOfficeStudentFullName(a).localeCompare(getOfficeStudentFullName(b)))
      .slice(0, MAX_RESULTS);
  }, [students, classNameById, text]);

  const pick = (s: OfficeStudent) => {
    onChange(s.id);
    setText('');
    setOpen(false);
  };

  if (selected) {
    const cls = selected.classId ? classNameById.get(selected.classId) : undefined;
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-xl border bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900">
        <span className="truncate">
          <span className="font-medium">{getOfficeStudentFullName(selected)}</span>
          {cls ? <span className="text-muted-foreground"> · {cls}</span> : null}
        </span>
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Choose a different student"
          className="rounded-full p-1 text-muted-foreground hover:bg-slate-100 hover:text-foreground dark:hover:bg-slate-800"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const showList = open && text.trim().length > 0;

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id={id}
        value={text}
        autoComplete="off"
        placeholder="Type a student’s name…"
        className="h-10 rounded-xl pl-9"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => {
          setText(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList || matches.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, matches.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(matches[active]);
          }
        }}
      />
      {showList ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-xl border bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">No student found.</li>
          ) : (
            matches.map((s, i) => {
              const cls = s.classId ? classNameById.get(s.classId) : undefined;
              return (
                <li
                  key={s.id}
                  role="option"
                  aria-selected={i === active}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(s);
                  }}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm',
                    i === active ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800',
                  )}
                >
                  <span>{getOfficeStudentFullName(s)}</span>
                  {cls ? <span className="text-xs text-muted-foreground">{cls}</span> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}
    </div>
  );
}
