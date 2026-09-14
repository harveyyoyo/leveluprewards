'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Check, Library, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLibraryLocations } from '@/hooks/useLibraryLocations';
import { DEFAULT_LIBRARY_LOCATION_ID, libraryPath } from '@/lib/library/libraryLocations';

/**
 * A short "getting started" checklist for the library, reachable any time from the library
 * home page — not a forced first-run wizard. Each card shows real, current status (not a
 * fake "step complete" claim) and either lets you finish the task right there (the name) or
 * sends you to the real page for it with plain-language instructions for what to do once you
 * arrive (books, staff) — nothing here is required to use the library.
 */
export function LibraryGettingStarted({
  schoolId,
  catalogCount,
  onFinish,
}: {
  schoolId: string;
  catalogCount: number;
  onFinish: () => void;
}) {
  const { toast } = useToast();
  const { locations, storedLocations, isFirstLibrary, createFirstLibrary, renameLocation } =
    useLibraryLocations(schoolId);
  const currentName = locations.find((l) => l.id === DEFAULT_LIBRARY_LOCATION_ID)?.name ?? '';
  // `useLibraryLocations`'s own `isLoading` is unreliable on the very first render (see its
  // source comment — it starts false before the collection listener has even run), so use its
  // already-debounced `isFirstLibrary` instead: once that's confidently true or false, we know
  // `storedLocations`/`currentName` reflect real data rather than a pre-fetch default.
  const dataReady = isFirstLibrary || storedLocations.length > 0;

  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // Seed the field from the real name exactly once real data has arrived, instead of capturing
  // whatever (possibly still-empty) value happened to be there on the very first render.
  const seededNameRef = useRef(false);
  useEffect(() => {
    if (dataReady && !seededNameRef.current) {
      seededNameRef.current = true;
      setName(currentName);
    }
  }, [dataReady, currentName]);

  const trimmedName = name.trim();
  const nameChanged = dataReady && trimmedName.length > 0 && trimmedName !== currentName;

  const saveName = async () => {
    if (!nameChanged) return;
    setSaving(true);
    try {
      if (isFirstLibrary) {
        await createFirstLibrary(trimmedName);
      } else {
        await renameLocation(DEFAULT_LIBRARY_LOCATION_ID, trimmedName);
      }
      setName(trimmedName);
      toast({ title: 'Saved', description: `Your library is now named "${trimmedName}".` });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not save the name',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-black tracking-tight">Getting started</h1>
          <p className="text-sm text-muted-foreground">
            A few things worth checking when you're setting up. Come back any time — none of this is required.
          </p>
        </div>

        {/* Library name — editable right here, no separate page needed */}
        <div className="space-y-3 rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Library className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Library name</h2>
              <p className="text-xs text-muted-foreground">This is what staff and students will see.</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={name}
              disabled={!dataReady}
              onChange={(event) => setName(event.target.value)}
              placeholder="School Library"
              aria-label="Library name"
              className="flex-1"
            />
            <Button type="button" disabled={!dataReady || saving || !nameChanged} onClick={() => void saveName()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        {/* Books — shows the real, current count instead of a fake "done" claim */}
        <div className="space-y-3 rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold">Books</h2>
              <p className="text-xs text-muted-foreground">
                {catalogCount > 0
                  ? `You have ${catalogCount} ${catalogCount === 1 ? 'book' : 'books'} in your catalog.`
                  : "You haven't added any books yet."}
              </p>
            </div>
            {catalogCount > 0 && <Check className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />}
          </div>
          <Button type="button" variant="outline" className="w-full" asChild>
            <Link href={libraryPath(schoolId, '', DEFAULT_LIBRARY_LOCATION_ID) + '?tab=catalog'}>
              {catalogCount > 0 ? 'Add more books' : 'Add your first books'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Staff access — this lives on a different page, so spell out exactly what to click there */}
        <div className="space-y-3 rounded-2xl border bg-background p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Give someone else access</h2>
              <p className="text-xs text-muted-foreground">
                Optional — only needed if someone besides you should check books in and out.
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This happens on a different page. Once there, click <strong>"Add desk staff,"</strong> fill in their name,
            then turn on <strong>"Library catalog &amp; checkouts."</strong>
          </p>
          <Button type="button" variant="outline" className="w-full" asChild>
            <Link href={`/${schoolId}/admin?tab=teachers`}>
              Open Teachers &amp; Staff
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Button type="button" variant="ghost" className="w-full" onClick={onFinish}>
          Back to Library
        </Button>
      </div>
    </div>
  );
}
