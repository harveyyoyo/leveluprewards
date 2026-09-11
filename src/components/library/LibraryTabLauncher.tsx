'use client';

import { motion } from 'framer-motion';
import { BookOpen, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isPillarOn } from '@/lib/productPillars';

export function LibraryTabLauncher({ schoolId }: { schoolId: string }) {
  const { settings } = useSettings();
  const libraryOn = isPillarOn(settings, 'payLibrary');
  const libraryUrl = `/${schoolId}/library`;

  if (!libraryOn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-center text-muted-foreground">
          Turn on Library in Settings to manage book catalog, circulation loans, and student self-checkout.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-2xl shadow-indigo-900/20"
      >
        <BookOpen className="h-10 w-10 text-white" aria-hidden />
      </motion.div>

      <div className="max-w-md space-y-3">
        <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
          Library
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Library opens in its own dedicated space — book catalog, barcode scanning intake, library desk,
          student self-checkout kiosk, and return policies.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button
          asChild
          size="lg"
          className="min-w-[14rem] rounded-full bg-gradient-to-r from-indigo-700 to-sky-600 px-8 text-base font-bold shadow-lg hover:from-indigo-600 hover:to-sky-500"
        >
          <a href={libraryUrl} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-5 w-5" aria-hidden />
            Open Library
          </a>
        </Button>

      </div>

      <p className="text-xs text-muted-foreground">Opens in a new tab</p>
    </div>
  );
}
