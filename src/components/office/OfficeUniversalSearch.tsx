'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { filterOfficeSearchIndex, type OfficeSearchResultKind } from '@/lib/office/officeSearchIndex';
import { officePublicHref } from '@/lib/officePublicUrl';
import { useOfficePortalChrome } from '@/components/office/OfficePortalChrome';

const KIND_LABELS: Record<OfficeSearchResultKind, string> = {
  student: 'Students',
  family: 'Families',
  class: 'Classes',
  teacher: 'Teachers',
  billing: 'Billing',
  invoice: 'Invoices',
  mark: 'Marks',
};

export function OfficeUniversalSearch() {
  const router = useRouter();
  const { schoolId, searchIndex, marksLabels } = useOfficePortalChrome();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(
    () => filterOfficeSearchIndex(searchIndex, query),
    [searchIndex, query],
  );

  const grouped = useMemo(() => {
    const map = new Map<OfficeSearchResultKind, typeof results>();
    for (const row of results) {
      const list = map.get(row.kind) ?? [];
      list.push(row);
      map.set(row.kind, list);
    }
    return map;
  }, [results]);

  const goTo = useCallback(
    (row: (typeof results)[number]) => {
      const base = officePublicHref(schoolId, row.hrefSegment);
      const href = row.queryParam ? `${base}?${row.queryParam}` : base;
      setOpen(false);
      setQuery('');
      router.push(href);
    },
    [router, schoolId],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const kindLabel = (kind: OfficeSearchResultKind) =>
    kind === 'mark' ? marksLabels.section : KIND_LABELS[kind];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="hidden h-8 gap-2 rounded-lg px-2.5 text-xs text-muted-foreground sm:inline-flex"
        onClick={() => setOpen(true)}
        aria-label="Search School Office"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden md:inline">Search</span>
        <kbd className="pointer-events-none hidden rounded border bg-muted px-1 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-lg sm:hidden"
        onClick={() => setOpen(true)}
        aria-label="Search School Office"
      >
        <Search className="h-3.5 w-3.5" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen} label="Search School Office">
        <CommandInput
          placeholder={`Search students, families, billing, ${marksLabels.plural}…`}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No matches. Try a name, phone, invoice label, or subject.</CommandEmpty>
          {Array.from(grouped.entries()).map(([kind, rows]) => (
            <CommandGroup key={kind} heading={kindLabel(kind)}>
              {rows.map((row) => (
                <CommandItem key={row.id} value={`${row.title} ${row.subtitle}`} onSelect={() => goTo(row)}>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{row.subtitle}</p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
