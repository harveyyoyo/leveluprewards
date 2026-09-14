'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, BookOpen, Check, Library, Loader2, PartyPopper, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLibraryLocations } from '@/hooks/useLibraryLocations';
import { DEFAULT_LIBRARY_LOCATION_ID, libraryPath } from '@/lib/library/libraryLocations';

const STEPS = ['name', 'books', 'staff', 'done'] as const;
type Step = (typeof STEPS)[number];

/**
 * A short, linear setup flow for a school opening its Library for the first time: name it,
 * add the first books, invite a librarian. Each step mostly links out to the real feature
 * (Catalog, Staff Accounts) rather than re-implementing it here — this is just the map.
 */
export function LibrarySetupWizard({
  schoolId,
  onFinish,
}: {
  schoolId: string;
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

  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];
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

  const goNext = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  const goBack = () => setStepIndex((i) => Math.max(i - 1, 0));

  const saveNameAndContinue = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      if (isFirstLibrary) {
        await createFirstLibrary(trimmed);
      } else if (trimmed !== currentName) {
        await renameLocation(DEFAULT_LIBRARY_LOCATION_ID, trimmed);
      }
      setName(trimmed);
      goNext();
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
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6">
      <div className="space-y-6 rounded-2xl border bg-background p-5 shadow-sm sm:p-8">
        {step !== 'done' && (
          <div className="flex items-center gap-1.5" aria-hidden>
            {STEPS.slice(0, 3).map((s, i) => (
              <span
                key={s}
                className={`h-1.5 flex-1 rounded-full ${i <= stepIndex ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Library className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Name your library</h2>
                <p className="text-sm text-muted-foreground">This is what staff and students will see.</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setup-library-name">Library name</Label>
              <Input
                id="setup-library-name"
                placeholder="School Library"
                value={name}
                disabled={!dataReady}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={saving || !dataReady || !name.trim()}
                onClick={() => void saveNameAndContinue()}
              >
                {!dataReady ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 'books' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Add your first books</h2>
                <p className="text-sm text-muted-foreground">
                  Scan barcodes or import a list from the Catalog page — you can always add more later.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href={libraryPath(schoolId, '', DEFAULT_LIBRARY_LOCATION_ID) + '?tab=catalog'}>
                Open Catalog to add books
              </Link>
            </Button>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={goNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'staff' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight">Invite a librarian</h2>
                <p className="text-sm text-muted-foreground">
                  Add desk staff and turn on "Library catalog & checkouts" so they can check books in and out.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full" asChild>
              <Link href={`/${schoolId}/admin?tab=teachers`}>Open Teachers &amp; Staff</Link>
            </Button>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={goBack}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="button" onClick={goNext}>
                Finish
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <PartyPopper className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">You're all set!</h2>
              <p className="text-sm text-muted-foreground">
                Your library is ready. You can revisit this setup any time from the library home page.
              </p>
            </div>
            <ul className="mx-auto max-w-xs space-y-1.5 text-left text-sm">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                Library named
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                Ready to add books anytime
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                Ready to invite staff anytime
              </li>
            </ul>
            <Button type="button" className="w-full" onClick={onFinish}>
              Go to your Library
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
