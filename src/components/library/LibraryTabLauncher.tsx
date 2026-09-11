'use client';

import { useCallback, useMemo, useState } from 'react';
import { BookOpen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettings } from '@/components/providers/SettingsProvider';
import { useLibraryLocations } from '@/hooks/useLibraryLocations';
import { DEFAULT_LIBRARY_LOCATION_ID, libraryPath } from '@/lib/library/libraryLocations';
import { isPillarOn } from '@/lib/productPillars';
import { LibraryLocationsCard } from './LibraryLocationsCard';
import { useToast } from '@/hooks/use-toast';
import type { Class } from '@/lib/types';

export function LibraryTabLauncher({ schoolId, classes }: { schoolId: string; classes?: Class[] | null }) {
  const { toast } = useToast();
  const { settings } = useSettings();
  const {
    locations,
    storedLocations,
    isLoading: locationsLoading,
    isFirstLibrary,
    createFirstLibrary,
    createLocation,
    renameLocation,
    archiveLocation,
    restoreLocation,
    deleteLocation,
  } = useLibraryLocations(schoolId);
  const archivedLocations = useMemo(
    () => storedLocations.filter((location) => location.archived && location.id !== DEFAULT_LIBRARY_LOCATION_ID),
    [storedLocations],
  );
  const libraryOn = isPillarOn(settings, 'payLibrary');
  const getLibraryHref = useCallback((id: string) => libraryPath(schoolId, '', id), [schoolId]);

  const [firstName, setFirstName] = useState('');
  const [creatingFirst, setCreatingFirst] = useState(false);

  const createFirst = async () => {
    if (creatingFirst || !firstName.trim()) return;
    setCreatingFirst(true);
    try {
      await createFirstLibrary(firstName);
      setFirstName('');
      toast({ title: 'Library created', description: 'You can add more libraries any time.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create library',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setCreatingFirst(false);
    }
  };

  if (!libraryOn) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <p className="text-center text-muted-foreground">
          Turn on Library in Settings to look up books, check them in and out, and let students check out on their own.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6">
      <div className="space-y-6 rounded-2xl border bg-background p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-500 shadow-md">
            <BookOpen className="h-6 w-6 text-white" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-foreground">Library</h2>
            <p className="text-sm text-muted-foreground">
              Look up books, check them in and out, and let students check out on their own.
            </p>
          </div>
        </div>

        {locationsLoading ? null : isFirstLibrary ? (
          <div className="space-y-3 rounded-xl bg-muted/25 p-4">
            <div>
              <p className="text-sm font-semibold">Name your library</p>
              <p className="text-xs text-muted-foreground">
                This is what staff and students will see. You can add more libraries later — for example, if a
                classroom keeps its own set of books.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="first-library-name">Name</Label>
              <Input
                id="first-library-name"
                placeholder="School Library"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </div>
            <Button type="button" disabled={creatingFirst || !firstName.trim()} onClick={() => void createFirst()}>
              <Plus className="mr-2 h-4 w-4" />
              Create library
            </Button>
          </div>
        ) : (
          <div className="border-t pt-6">
            <LibraryLocationsCard
              bare
              locations={locations}
              classes={classes}
              getHref={getLibraryHref}
              onCreate={createLocation}
              onRename={renameLocation}
              onArchive={archiveLocation}
              archivedLocations={archivedLocations}
              onRestore={restoreLocation}
              onDelete={deleteLocation}
            />
          </div>
        )}
      </div>
    </div>
  );
}
