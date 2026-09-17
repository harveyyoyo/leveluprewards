'use client';

import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Library } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
}: {
  locations: LibraryLocation[];
  classNames?: Record<string, string>;
  onPick: (id: string) => void;
  title?: string;
  subtitle?: string;
  /** Optional escape hatch — shown above the choices when there's somewhere else to go instead. */
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col justify-center gap-6 p-6">
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
        <h1 className="text-3xl font-black tracking-tight">{title}</h1>
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
            layoutId={`station-${location.id}`}
            variants={{
              hidden: { opacity: 0, y: 12 },
              show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
            }}
          >
            <Button
              type="button"
              variant="outline"
              className="h-auto w-full justify-start gap-4 rounded-2xl p-5 text-left"
              onClick={() => onPick(location.id)}
            >
              <span className="rounded-2xl border bg-muted/60 p-3">
                {location.kind === 'classroom' ? <BookOpen className="h-6 w-6" /> : <Library className="h-6 w-6" />}
              </span>
              <span>
                <span className="block text-lg font-bold">
                  {libraryLocationLabel(location, classNames?.[location.id])}
                </span>
                <span className="block text-sm font-medium text-muted-foreground">
                  {libraryLocationKindLabel(location.kind)}
                </span>
              </span>
            </Button>
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
}
