'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Library, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettings } from '@/components/providers/SettingsProvider';
import { resolveLibraryTheme, type LibraryTheme } from '@/lib/library/libraryThemes';
import { LibraryBackdrop } from './LibraryBackdrop';
import {
  libraryLocationKindLabel,
  libraryLocationLabel,
  type LibraryLocation,
} from '@/lib/library/libraryLocations';

export function LibraryStationPicker({
  locations,
  classNames,
  onPick,
  title = 'Which library is this station?',
  subtitle = 'Choose once for this device. Students will only borrow books from that library here.',
  backHref,
  backLabel = 'Back',
  theme,
}: {
  locations: LibraryLocation[];
  classNames?: Record<string, string>;
  onPick: (id: string) => void;
  title?: string;
  subtitle?: string;
  /** Optional escape hatch — shown above the choices when there's somewhere else to go instead. */
  backHref?: string;
  backLabel?: string;
  theme?: LibraryTheme;
}) {
  const { settings } = useSettings();
  const activeTheme = theme ?? resolveLibraryTheme(settings.libraryTheme);
  const [pickingId, setPickingId] = useState<string | null>(null);

  const handlePick = (id: string) => {
    if (pickingId) return;
    setPickingId(id);
    onPick(id);
  };

  return (
    <div
      className={cn(
        'library-readable relative flex min-h-dvh w-full flex-col justify-center overflow-x-hidden p-4 sm:p-6 transition-colors duration-500',
        activeTheme.classes.wrapper,
      )}
    >
      <LibraryBackdrop theme={activeTheme} />
      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-col justify-center gap-6">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : null}
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-black tracking-tight text-foreground">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        <motion.div
          className="grid gap-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
        >
          {locations.map((location) => (
            <motion.div
              key={location.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
              }}
            >
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(pickingId)}
                className={cn(
                  'h-auto w-full justify-start gap-4 rounded-2xl border-border/80 bg-card/90 p-5 text-left shadow-sm backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-md',
                  pickingId === location.id && 'ring-2 ring-primary border-primary bg-primary/5 shadow-md',
                  pickingId && pickingId !== location.id && 'opacity-60',
                )}
                onClick={() => handlePick(location.id)}
              >
                <span className="rounded-2xl border bg-muted/60 p-3 text-primary shrink-0">
                  {pickingId === location.id ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : location.kind === 'classroom' ? (
                    <BookOpen className="h-6 w-6" />
                  ) : (
                    <Library className="h-6 w-6" />
                  )}
                </span>
                <span className="flex-1">
                  <span className="block text-lg font-bold text-foreground">
                    {libraryLocationLabel(location, classNames?.[location.id])}
                  </span>
                  <span className="block text-sm font-medium text-muted-foreground">
                    {pickingId === location.id ? 'Opening…' : libraryLocationKindLabel(location.kind)}
                  </span>
                </span>
              </Button>
            </motion.div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
