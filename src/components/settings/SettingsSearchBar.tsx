'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  groupSettingsSearchItems,
  type SettingsSearchGroup,
  type SettingsSearchItem,
} from '@/lib/settings/settingsSearchIndex';

const resultVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 420, damping: 34 },
  },
};

export function SettingsSearchBar({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative w-full sm:w-64 sm:shrink-0">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        className="h-9 rounded-xl border-border/50 bg-background/70 pl-9 pr-9"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

export function SettingsSearchResults({
  query,
  results,
  onSelect,
  groupLabel,
  noResults,
}: {
  query: string;
  results: SettingsSearchItem[];
  onSelect: (item: SettingsSearchItem) => void;
  groupLabel: (group: SettingsSearchGroup) => string;
  noResults: string;
}) {
  const groups = groupSettingsSearchItems(results);

  return (
    <AnimatePresence mode="wait">
      {results.length === 0 ? (
        <motion.p
          key="empty"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
          className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground"
        >
          {noResults}
        </motion.p>
      ) : (
        <motion.div
          key={query}
          className="space-y-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.04, type: 'spring', stiffness: 420, damping: 34 },
            },
          }}
        >
          {groups.map((bucket) => (
            <div key={bucket.group} className="space-y-2">
              <p className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {groupLabel(bucket.group)}
              </p>
              <div className="space-y-2">
                {bucket.items.map((entry) => (
                  <motion.button
                    key={entry.id}
                    type="button"
                    variants={resultVariants}
                    onClick={() => onSelect(entry)}
                    className={cn(
                      'flex w-full items-center justify-between gap-3 rounded-2xl border border-border/50 bg-card/70 px-4 py-3 text-left',
                      'transition-colors hover:border-primary/40 hover:bg-primary/5',
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-foreground">{entry.label}</span>
                      {entry.description ? (
                        <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                          {entry.description}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  </motion.button>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
