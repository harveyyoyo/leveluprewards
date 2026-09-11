'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Library, Plus, Trash2 } from 'lucide-react';
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

export function LibraryLocationsCard({
  locations,
  classes,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onArchive,
  archivedLocations = [],
  onRestore,
}: {
  locations: LibraryLocation[];
  classes?: Class[] | null;
  activeId?: string;
  onSelect?: (id: string) => void;
  onCreate: (input: { name: string; kind: LibraryLocationKind; classId?: string | null }) => Promise<string>;
  onRename: (id: string, name: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  archivedLocations?: LibraryLocation[];
  onRestore?: (id: string) => Promise<void>;
}) {
  const { toast } = useToast();
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
    <section className="space-y-4 rounded-2xl border bg-background p-4 sm:p-5">
      <div>
        <h3 className="text-lg font-bold">Libraries in this school</h3>
        <p className="text-sm text-muted-foreground">
          A school can have more than one library. Example: a main school library and a classroom library,
          each with its own books and checkouts.
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
            className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center"
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
              {onSelect && location.id !== activeId ? (
                <Button type="button" variant="outline" size="sm" onClick={() => onSelect(location.id)}>
                  Open
                </Button>
              ) : null}
              {location.id !== DEFAULT_LIBRARY_LOCATION_ID ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
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
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Hide
                </Button>
              ) : null}
            </div>
          </motion.li>
        ))}
      </motion.ul>

      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <p className="text-sm font-semibold">Add another library</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="new-library-name">Name</Label>
            <Input
              id="new-library-name"
              placeholder="Room 12 class library"
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
              <option value="classroom">Class library</option>
              <option value="school">School library</option>
            </select>
          </div>
        </div>
        {kind === 'classroom' && (classes?.length ?? 0) > 0 ? (
          <div className="space-y-1.5">
            <Label htmlFor="new-library-class">Class (optional)</Label>
            <select
              id="new-library-class"
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
            >
              <option value="">Not linked to one class</option>
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
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
