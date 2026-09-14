'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, EyeOff, Library, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  DEFAULT_LIBRARY_LOCATION_ID,
  libraryLocationKindLabel,
  type LibraryLocation,
  type LibraryLocationKind,
} from '@/lib/library/libraryLocations';
import type { Class } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/providers/ConfirmProvider';

export function LibraryLocationsCard({
  locations,
  classes,
  activeId,
  onSelect,
  getHref,
  onCreate,
  onRename,
  onArchive,
  archivedLocations = [],
  onRestore,
  onDelete,
  /** Drop this card's own border/background — use when a parent already provides the card chrome. */
  bare = false,
}: {
  locations: LibraryLocation[];
  classes?: Class[] | null;
  activeId?: string;
  onSelect?: (id: string) => void;
  /** When set, each library shows a real link (opens in a new tab) instead of an onSelect click handler. */
  getHref?: (id: string) => string;
  onCreate: (input: { name: string; kind: LibraryLocationKind; classId?: string | null }) => Promise<string>;
  onRename: (id: string, name: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  archivedLocations?: LibraryLocation[];
  onRestore?: (id: string) => Promise<void>;
  /** Permanently remove a hidden library. Shown as "Delete" next to "Show again" when provided. */
  onDelete?: (id: string) => Promise<void>;
  bare?: boolean;
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState('');
  const [kind, setKind] = useState<LibraryLocationKind>('classroom');
  const [classId, setClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Record<string, string>>({});

  const addLibrary = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const id = await onCreate({
        name,
        kind,
        classId: kind === 'classroom' ? classId || null : null,
      });
      setName('');
      setClassId('');
      onSelect?.(id);
      toast({ title: 'Library added', description: 'Books you add now will stay in this library.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not add library',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={bare ? 'space-y-4' : 'space-y-4 rounded-2xl border bg-background p-4 sm:p-5'}>
      <div>
        <h3 className="text-lg font-bold">Your libraries</h3>
        <p className="text-sm text-muted-foreground">
          Most schools just need one. Add another if a classroom or room keeps its own set of books.
        </p>
      </div>

      <motion.ul
        className="space-y-2"
        initial="hidden"
        animate="show"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
      >
        {locations.map((location) => (
          <motion.li
            key={location.id}
            layoutId={`manage-library-${location.id}`}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
            }}
            className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-start"
          >
            <div className="flex min-w-0 flex-1 items-start gap-3">
              <div className="mt-0.5 rounded-lg border bg-muted/50 p-2">
                {location.kind === 'classroom' ? <BookOpen className="h-4 w-4" /> : <Library className="h-4 w-4" />}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  aria-label={`Name for ${location.name}`}
                  value={editing[location.id] ?? location.name}
                  onChange={(event) => setEditing((prev) => ({ ...prev, [location.id]: event.target.value }))}
                  onBlur={() => {
                    const next = (editing[location.id] ?? location.name).trim();
                    if (!next || next === location.name) return;
                    void onRename(location.id, next).catch((error) => {
                      toast({
                        variant: 'destructive',
                        title: 'Could not rename',
                        description: error instanceof Error ? error.message : 'Please try again.',
                      });
                    });
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{libraryLocationKindLabel(location.kind)}</Badge>
                  {location.id === activeId ? <Badge>Open now</Badge> : null}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {getHref ? (
                <Button
                  asChild
                  type="button"
                  size="sm"
                  className="rounded-full bg-gradient-to-r from-indigo-700 to-sky-600 font-bold shadow hover:from-indigo-600 hover:to-sky-500"
                >
                  <a href={getHref(location.id)} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1 h-3.5 w-3.5" aria-hidden />
                    Open
                  </a>
                </Button>
              ) : onSelect && location.id !== activeId ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onSelect(location.id)}>
                  Open
                </Button>
              ) : null}
              {location.id !== DEFAULT_LIBRARY_LOCATION_ID ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground"
                  onClick={() => {
                    void onArchive(location.id).catch((error) => {
                      toast({
                        variant: 'destructive',
                        title: 'Could not remove library',
                        description: error instanceof Error ? error.message : 'Please try again.',
                      });
                    });
                  }}
                >
                  <EyeOff className="mr-1 h-3.5 w-3.5" />
                  Hide
                </Button>
              ) : null}
            </div>
          </motion.li>
        ))}
      </motion.ul>

      <div className="space-y-3 rounded-xl bg-muted/25 p-4">
        <p className="text-sm font-semibold">Add a library</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-library-name">Name</Label>
            <Input
              id="new-library-name"
              placeholder="e.g. Room 12 class library"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-library-kind">Type</Label>
            <select
              id="new-library-kind"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={kind}
              onChange={(event) => setKind(event.target.value as LibraryLocationKind)}
            >
              <option value="classroom">One classroom&rsquo;s books</option>
              <option value="school">Whole school&rsquo;s books</option>
            </select>
          </div>
        </div>
        {kind === 'classroom' && (classes?.length ?? 0) > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="new-library-class">Which class? (optional)</Label>
            <select
              id="new-library-class"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">Not tied to one class</option>
              {classes?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button type="button" disabled={busy || !name.trim()} onClick={() => void addLibrary()}>
          <Plus className="mr-2 h-4 w-4" />
          Add library
        </Button>
      </div>

      {archivedLocations.length > 0 && onRestore ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold">Hidden libraries</p>
          {archivedLocations.map((location) => (
            <div key={location.id} className="flex items-center justify-between gap-2 rounded-xl border border-dashed p-3">
              <span className="text-sm">{location.name}</span>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void onRestore(location.id).catch((error) => {
                      toast({
                        variant: 'destructive',
                        title: 'Could not restore',
                        description: error instanceof Error ? error.message : 'Please try again.',
                      });
                    });
                  }}
                >
                  Show again
                </Button>
                {onDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => {
                      void (async () => {
                        const ok = await confirm({
                          title: `Delete "${location.name}" for good?`,
                          description: "This can't be undone.",
                          confirmLabel: 'Delete permanently',
                          destructive: true,
                        });
                        if (!ok) return;
                        try {
                          await onDelete(location.id);
                        } catch (error) {
                          toast({
                            variant: 'destructive',
                            title: 'Could not delete',
                            description: error instanceof Error ? error.message : 'Please try again.',
                          });
                        }
                      })();
                    }}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
