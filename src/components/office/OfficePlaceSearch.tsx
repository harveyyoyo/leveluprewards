'use client';

import { useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAuthFetch } from '@/lib/authFetch';
import type { LatLng } from '@/lib/office/officeTransport';
import { cn } from '@/lib/utils';

type Place = LatLng & { label: string };

/** Type an address or place name, pick a match, get its spot on the map. */
export function OfficePlaceSearch({
  onPick,
  near,
  placeholder = 'Find an address or place…',
  className,
  id,
}: {
  onPick: (place: Place) => void;
  near?: LatLng | null;
  placeholder?: string;
  className?: string;
  id?: string;
}) {
  const authFetch = useAuthFetch();
  const [text, setText] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 3) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const nearParam = near ? `&lat=${near.lat.toFixed(4)}&lng=${near.lng.toFixed(4)}` : '';
        const res = await authFetch(`/api/office/geocode?q=${encodeURIComponent(q)}${nearParam}`);
        const data = (await res.json()) as { results?: Place[] };
        if (!cancelled) {
          setResults(data.results ?? []);
          setActive(0);
        }
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // `near` only nudges results; re-searching when the map moves would be noisy.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, authFetch]);

  const pick = (p: Place) => {
    onPick(p);
    setText('');
    setResults([]);
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        id={id}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActive((a) => Math.min(results.length - 1, a + 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActive((a) => Math.max(0, a - 1));
          } else if (e.key === 'Enter') {
            e.preventDefault();
            pick(results[active]);
          } else if (e.key === 'Escape') {
            setResults([]);
          }
        }}
        placeholder={placeholder}
        className="h-10 rounded-xl pl-9"
        autoComplete="off"
      />
      {text.trim().length >= 3 && (results.length > 0 || !searching) ? (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">No matches. You can also tap the map to drop a spot.</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.label}-${i}`}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(r)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left text-sm',
                    i === active ? 'bg-teal-50 dark:bg-teal-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800',
                  )}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700 dark:text-teal-400" aria-hidden />
                  <span>{r.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
