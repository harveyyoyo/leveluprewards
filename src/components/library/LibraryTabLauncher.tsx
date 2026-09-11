'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, Library, Plus } from 'lucide-react';
import { collection } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { useLibraryLocations } from '@/hooks/useLibraryLocations';
import { isPillarOn } from '@/lib/productPillars';
import { DEFAULT_LIBRARY_LOCATION_ID, libraryLocationKindLabel, libraryPath } from '@/lib/library/libraryLocations';
import type { Class } from '@/lib/types';
import { LibraryLocationsCard } from './LibraryLocationsCard';

export function LibraryTabLauncher({ schoolId }: { schoolId: string }) {
  const { settings } = useSettings();
  const firestore = useFirestore();
  const libraryOn = isPillarOn(settings, 'payLibrary');
  const { locations, storedLocations, createLocation, renameLocation, archiveLocation, restoreLocation } = useLibraryLocations(schoolId);
  const archivedLocations = storedLocations.filter((location) => location.archived && location.id !== DEFAULT_LIBRARY_LOCATION_ID);
  const classesQuery = useMemoFirebase(
    () => (firestore && schoolId ? collection(firestore, 'schools', schoolId, 'classes') : null),
    [firestore, schoolId],
  );
  const { data: classes } = useCollection<Class>(classesQuery);
  const [manageOpen, setManageOpen] = useState(false);
  const classNames = useMemo(() => {
    const names: Record<string, string> = {};
    for (const location of locations) {
      const className = classes?.find((item) => item.id === location.classId)?.name;
      if (className) names[location.id] = `${location.name} · ${className}`;
    }
    return names;
  }, [classes, locations]);

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
          Libraries
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          This school can have more than one library — for example a school library and a class library —
          each with its own books and checkouts.
        </p>
      </div>

      <motion.div
        className="grid w-full max-w-2xl gap-3"
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } }}
      >
        {locations.map((location) => (
          <motion.div
            key={location.id}
            layoutId={`launch-library-${location.id}`}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 22 } },
            }}
            className="flex flex-col items-center justify-between gap-3 rounded-2xl border bg-card p-4 text-left sm:flex-row"
          >
            <div className="flex items-center gap-3">
              <span className="rounded-2xl border bg-muted/60 p-2.5">
                {location.kind === 'classroom' ? <BookOpen className="h-5 w-5" /> : <Library className="h-5 w-5" />}
              </span>
              <div>
                <p className="font-bold">{classNames[location.id] || location.name}</p>
                <p className="text-xs text-muted-foreground">{libraryLocationKindLabel(location.kind)}</p>
              </div>
            </div>
            <Button
              asChild
              className="rounded-full bg-gradient-to-r from-indigo-700 to-sky-600 px-5 font-bold shadow-lg hover:from-indigo-600 hover:to-sky-500"
            >
              <a href={libraryPath(schoolId, '', location.id)} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
                Open
              </a>
            </Button>
          </motion.div>
        ))}
      </motion.div>

      <Button type="button" variant="outline" className="rounded-full" onClick={() => setManageOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Add or manage libraries
      </Button>

      <p className="text-xs text-muted-foreground">Each library opens in its own tab</p>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage libraries</DialogTitle>
            <DialogDescription>
              Add a class library or another school library. Existing books stay in School Library until you move them.
            </DialogDescription>
          </DialogHeader>
          <LibraryLocationsCard
            locations={locations}
            classes={classes}
            onCreate={async (input) => {
              const id = await createLocation(input);
              setManageOpen(false);
              return id;
            }}
            onRename={renameLocation}
            onArchive={archiveLocation}
            archivedLocations={archivedLocations}
            onRestore={restoreLocation}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
