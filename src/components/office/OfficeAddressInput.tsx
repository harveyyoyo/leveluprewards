'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthFetch } from '@/lib/authFetch';
import { cn } from '@/lib/utils';

/**
 * Address box that suggests real addresses as you type. Picking one fills it in; anything typed
 * by hand is kept as-is, so it still works when suggestions are unavailable.
 */
export function OfficeAddressInput({
  id,
  value,
  onChange,
  placeholder = 'Start typing an address…',
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const authFetch = useAuthFetch();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  // Only look up while the person is typing — not when a saved address is loaded or one was just picked.
  const typed = useRef(false);

  useEffect(() => {
    if (!typed.current) return;
    const q = value.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await authFetch(`/api/office/address-suggest?q=${encodeURIComponent(q)}`);
        const data = (await res.json()) as { suggestions?: string[] };
        if (!cancelled) {
          setSuggestions(data.suggestions ?? []);
          setActive(-1);
          setOpen(true);
        }
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, authFetch]);

  const pick = (s: string) => {
    typed.current = false;
    onChange(s);
    setSuggestions([]);
    setOpen(false);
  };

  const showList = open && suggestions.length > 0;

  return (
    <div className="relative">
      <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id={id}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        className="rounded-xl pl-9"
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => {
          typed.current = true;
          onChange(e.target.value);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!showList) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((i) => Math.min(i + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((i) => Math.max(i - 1, 0));
          } else if (e.key === 'Enter' && active >= 0) {
            e.preventDefault();
            pick(suggestions[active]);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {showList ? (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-xl border bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          {suggestions.map((s, i) => (
            <li
              key={s}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s);
              }}
              className={cn(
                'cursor-pointer px-3 py-2 text-sm',
                i === active ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              {s}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
