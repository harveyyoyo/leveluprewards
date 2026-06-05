'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Film,
  ImageIcon,
  Loader2,
  FilePenLine,
  RefreshCw,
  Save,
  Trash2,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { SchoolDeveloperLoginForm } from '@/components/auth/SchoolDeveloperLoginForm';
import { useAppContext } from '@/components/AppProvider';
import { isAllowedDeveloperGoogleUser } from '@/lib/developerAccess';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MEDIA_USAGE_OPTIONS,
  WIDESCREEN_CLIP_USAGE,
  canRecaptureMediaAsset,
  emptyMediaLabel,
  getRecaptureSummary,
  normalizeMediaLabelsFile,
  type MediaAssetItem,
  type MediaAssetLabel,
  type MediaAssetLabelsFile,
  type MediaUsageSlot,
} from '@/lib/marketing/mediaAssetTypes';
import { mediaFilenameFromLabel } from '@/lib/marketing/mediaFilename';

type LibraryPayload = {
  clips: MediaAssetItem[];
  screenshots: MediaAssetItem[];
  labels: MediaAssetLabelsFile;
};

async function devFetch<T>(
  url: string,
  token: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `${url} failed`);
  }
  return data;
}

export function DeveloperMediaAssetLabeler() {
  const { loginState, isInitialized, isUserLoading } = useAppContext();
  const { auth, user } = useFirebase();
  const { toast } = useToast();

  const allowedDeveloper =
    !!user && isAllowedDeveloperGoogleUser(auth.currentUser ?? user);

  const [items, setItems] = useState<MediaAssetItem[]>([]);
  const [labels, setLabels] = useState<MediaAssetLabelsFile>(() =>
    normalizeMediaLabelsFile(null),
  );
  const [source, setSource] = useState<'clips' | 'screenshots'>('clips');
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unreviewed'>('all');
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recapturing, setRecapturing] = useState(false);
  const [renaming, setRenaming] = useState(false);

  const reloadLibrary = useCallback(
    async (focusPath?: string) => {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const data = await devFetch<LibraryPayload>('/api/developer/media-assets', token);
      const merged = [...data.clips, ...data.screenshots];
      setItems(merged);
      setLabels(normalizeMediaLabelsFile(data.labels));
      if (focusPath) {
        const pool =
          source === 'clips'
            ? merged.filter((i) => i.kind === 'video')
            : merged.filter((i) => i.kind === 'image');
        const nextIndex = pool.findIndex((i) => i.path === focusPath);
        if (nextIndex >= 0) setIndex(nextIndex);
      }
    },
    [source, user],
  );

  useEffect(() => {
    if (!allowedDeveloper || loginState !== 'developer') return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      try {
        await reloadLibrary();
        if (!cancelled) {
          toast({
            title: 'Media library loaded',
            description: 'Labels save to public/marketing/media-labels.json for the whole app.',
          });
        }
      } catch (e) {
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Could not load media library',
            description: e instanceof Error ? e.message : 'Unknown error',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [allowedDeveloper, loginState, reloadLibrary, toast]);

  const visibleItems = useMemo(() => {
    const pool =
      source === 'clips'
        ? items.filter((i) => i.kind === 'video')
        : items.filter((i) => i.kind === 'image');
    if (filter === 'unreviewed') {
      return pool.filter((i) => !labels.items[i.path]?.reviewed);
    }
    return pool;
  }, [items, source, filter, labels.items]);

  const current = visibleItems[index] ?? null;
  const currentLabel: MediaAssetLabel = current
    ? { ...emptyMediaLabel(), ...labels.items[current.path] }
    : emptyMediaLabel();
  const wiredUsage = current ? WIDESCREEN_CLIP_USAGE[current.path] : undefined;
  const recaptureSummary = current ? getRecaptureSummary(current.path) : null;
  const canRecapture = current ? canRecaptureMediaAsset(current.path) : false;

  const targetFilename = current
    ? mediaFilenameFromLabel(
        currentLabel.displayName ||
          current.filename.replace(/\.[^.]+$/, ''),
        current.filename,
      )
    : '';
  const renamePending = !!current && targetFilename !== current.filename;

  useEffect(() => {
    if (index >= visibleItems.length) {
      setIndex(Math.max(0, visibleItems.length - 1));
    }
  }, [index, visibleItems.length]);

  const patchLabel = useCallback(
    (patch: Partial<MediaAssetLabel>) => {
      if (!current) return;
      setLabels((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [current.path]: {
            ...emptyMediaLabel(),
            ...prev.items[current.path],
            ...patch,
          },
        },
      }));
      setDirty(true);
    },
    [current],
  );

  const saveLabels = useCallback(async () => {
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const payload: MediaAssetLabelsFile = {
        ...labels,
        updatedAt: new Date().toISOString(),
      };
      const data = await devFetch<{ labels: MediaAssetLabelsFile }>(
        '/api/developer/media-assets/labels',
        token,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      setLabels(normalizeMediaLabelsFile(data.labels));
      setDirty(false);
      toast({ title: 'Labels saved', description: 'Usable across marketing, flyers, and promo video.' });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
    }
  }, [labels, toast, user]);

  const deleteCurrent = useCallback(async () => {
    if (!current || deleting) return;
    const wiredNote = wiredUsage
      ? '\n\nThis file is wired into the widescreen promo.'
      : '';
    if (
      !window.confirm(
        `Delete "${current.filename}" from disk? This cannot be undone.${wiredNote}`,
      )
    ) {
      return;
    }

    setDeleting(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Sign in required');
      await devFetch('/api/developer/media-assets/delete', token, {
        method: 'POST',
        body: JSON.stringify({ path: current.path }),
      });
      setLabels((prev) => {
        const nextItems = { ...prev.items };
        delete nextItems[current.path];
        return { ...prev, items: nextItems };
      });
      setDirty(false);
      await reloadLibrary();
      toast({ title: 'File deleted', description: current.filename });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setDeleting(false);
    }
  }, [current, deleting, reloadLibrary, toast, user, wiredUsage]);

  const recaptureCurrent = useCallback(async () => {
    if (!current || recapturing || !canRecapture) return;

    const summary = recaptureSummary ?? current.filename;
    if (
      !window.confirm(
        `Re-capture "${current.filename}"?\n\n${summary}\n\nPlaywright will record a fresh take (about 1–3 minutes).`,
      )
    ) {
      return;
    }

    setRecapturing(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const res = await fetch('/api/developer/media-assets/recapture', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: current.path }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        output?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? data.output ?? 'Recapture failed');
      }
      await reloadLibrary();
      patchLabel({ reviewed: false });
      toast({
        title: 'Recaptured',
        description: `${current.filename} was re-recorded.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Recapture failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setRecapturing(false);
    }
  }, [
    canRecapture,
    current,
    patchLabel,
    recaptureSummary,
    recapturing,
    reloadLibrary,
    toast,
    user,
  ]);

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));
  const goNext = () =>
    setIndex((i) => Math.min(visibleItems.length - 1, i + 1));

  const markReviewedAndNext = () => {
    patchLabel({ reviewed: true });
    if (index < visibleItems.length - 1) setIndex((i) => i + 1);
  };

  const renameCurrent = useCallback(async () => {
    if (!current || !renamePending || renaming) return;
    if (
      !window.confirm(
        `Rename "${current.filename}" → "${targetFilename}"?\n\nThis renames the file on disk and updates flyers, scripts, and code references.`,
      )
    ) {
      return;
    }

    setRenaming(true);
    try {
      const token = await user?.getIdToken();
      if (!token) throw new Error('Sign in required');
      const data = await devFetch<{
        ok: boolean;
        newPath: string;
        referencesUpdated: number;
        filesTouched: string[];
      }>('/api/developer/media-assets/rename', token, {
        method: 'POST',
        body: JSON.stringify({
          path: current.path,
          newFilename: targetFilename,
        }),
      });
      await reloadLibrary(data.newPath);
      toast({
        title: 'File renamed',
        description: `${targetFilename} — updated ${data.referencesUpdated} file(s) in the repo.`,
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Rename failed',
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setRenaming(false);
    }
  }, [
    current,
    renamePending,
    renaming,
    reloadLibrary,
    targetFilename,
    toast,
    user,
  ]);

  const reviewedCount = visibleItems.filter(
    (i) => labels.items[i.path]?.reviewed,
  ).length;

  const usageGroups = {
    promo: MEDIA_USAGE_OPTIONS.filter((o) => o.group === 'promo'),
    marketing: MEDIA_USAGE_OPTIONS.filter((o) => o.group === 'marketing'),
    other: MEDIA_USAGE_OPTIONS.filter((o) => o.group === 'other'),
  };

  if (!isInitialized || isUserLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowedDeveloper || loginState !== 'developer') {
    return <SchoolDeveloperLoginForm mode="developer-only" />;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 pb-12 pt-6 sm:px-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" className="-ml-2 gap-2" asChild>
            <Link href="/developer">
              <ArrowLeft className="h-4 w-4" />
              Developer console
            </Link>
          </Button>
          <h1 className="font-headline text-2xl font-bold tracking-tight sm:text-3xl">
            Media asset library
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Rename screenshot and clip files on disk; labels live in{' '}
            <code className="text-xs">public/marketing/media-labels.json</code>.
            Renaming also updates flyer HTML and other references in the repo.
          </p>
        </div>
        <Button
          className="gap-2 shrink-0"
          disabled={!dirty || saving}
          onClick={() => void saveLabels()}
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {dirty ? 'Save labels *' : 'Save labels'}
        </Button>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={source === 'clips' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => {
                setSource('clips');
                setIndex(0);
              }}
            >
              <Film className="h-4 w-4" />
              Promo clips (MP4)
            </Button>
            <Button
              type="button"
              size="sm"
              variant={source === 'screenshots' ? 'default' : 'outline'}
              className="gap-2"
              onClick={() => {
                setSource('screenshots');
                setIndex(0);
              }}
            >
              <ImageIcon className="h-4 w-4" />
              Marketing screenshots (PNG)
            </Button>
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={filter === 'unreviewed'}
                onCheckedChange={(checked) => {
                  setFilter(checked ? 'unreviewed' : 'all');
                  setIndex(0);
                }}
              />
              Unreviewed only
            </label>
            <Badge variant="secondary" className="font-mono tabular-nums">
              {visibleItems.length ? index + 1 : 0}/{visibleItems.length} · {reviewedCount}{' '}
              reviewed
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !current ? (
            <p className="py-12 text-center text-muted-foreground">No items in this list.</p>
          ) : (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center gap-2 border-b pb-4">
                <Button type="button" variant="outline" onClick={goPrev} disabled={index === 0}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Previous
                </Button>
                <Button type="button" className="gap-2" onClick={markReviewedAndNext}>
                  <Check className="h-4 w-4" />
                  Mark reviewed & next
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={goNext}
                  disabled={index >= visibleItems.length - 1}
                >
                  Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </div>

              <div className="overflow-hidden rounded-lg border bg-black">
                {current.kind === 'video' ? (
                  <video
                    key={current.path}
                    src={current.publicUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="max-h-[520px] w-full object-contain"
                  />
                ) : (
                  <img
                    key={current.path}
                    src={current.publicUrl}
                    alt={current.filename}
                    className="max-h-[520px] w-full object-contain"
                  />
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  <code className="break-all">{current.path}</code>
                  <span>{current.category}</span>
                </div>
              </div>

              <div className="space-y-4">
                {wiredUsage && (
                  <Card className="border-sky-500/30 bg-sky-500/5">
                    <CardContent className="p-3 text-sm text-muted-foreground">
                      Wired in widescreen promo as{' '}
                      <strong className="text-foreground">
                        {MEDIA_USAGE_OPTIONS.find((o) => o.value === wiredUsage)?.label ??
                          wiredUsage}
                      </strong>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label htmlFor="displayName">File name</Label>
                  <Input
                    id="displayName"
                    value={currentLabel.displayName}
                    placeholder={current.filename.replace(/\.[^.]+$/, '')}
                    onChange={(e) => patchLabel({ displayName: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    On disk: <code className="text-[11px]">{targetFilename}</code>
                    {renamePending ? ' (not saved yet)' : ''}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    disabled={!renamePending || renaming || deleting}
                    onClick={() => void renameCurrent()}
                  >
                    {renaming ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FilePenLine className="h-4 w-4" />
                    )}
                    {renaming ? 'Renaming…' : 'Rename file on disk'}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Usage (app-wide)</Label>
                  <Select
                    value={currentLabel.usage || 'unset'}
                    onValueChange={(value) =>
                      patchLabel({
                        usage: (value === 'unset' ? '' : value) as MediaUsageSlot,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pick where this asset belongs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Promo video</SelectLabel>
                        {usageGroups.promo.map((o) => (
                          <SelectItem key={o.value || 'empty'} value={o.value || 'unset'}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Marketing site</SelectLabel>
                        {usageGroups.marketing.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        <SelectLabel>Other</SelectLabel>
                        {usageGroups.other.map((o) => (
                          <SelectItem key={o.value || 'unset-other'} value={o.value || 'unset'}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {MEDIA_USAGE_OPTIONS.find((o) => o.value === currentLabel.usage)?.hint && (
                    <p className="text-xs text-muted-foreground">
                      {
                        MEDIA_USAGE_OPTIONS.find((o) => o.value === currentLabel.usage)
                          ?.hint
                      }
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">What happens on screen?</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={currentLabel.description}
                    placeholder="e.g. Student scans badge at kiosk, points popup appears"
                    onChange={(e) => patchLabel({ description: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    rows={2}
                    value={currentLabel.notes}
                    placeholder="Wrong timing, replace capture, etc."
                    onChange={(e) => patchLabel({ notes: e.target.value })}
                  />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={currentLabel.reviewed}
                    onCheckedChange={(checked) =>
                      patchLabel({ reviewed: checked === true })
                    }
                  />
                  Reviewed
                </label>

                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2"
                  disabled={!canRecapture || recapturing || deleting}
                  onClick={() => void recaptureCurrent()}
                >
                  {recapturing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {recapturing ? 'Recapturing…' : 'Redo · recapture'}
                </Button>
                {recaptureSummary && (
                  <p className="text-xs text-muted-foreground">{recaptureSummary}</p>
                )}

                <Button
                  type="button"
                  variant="destructive"
                  className="w-full gap-2"
                  disabled={deleting}
                  onClick={() => void deleteCurrent()}
                >
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete file
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jump to asset</CardTitle>
          <CardDescription>
            {visibleItems.length} items in this tab
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {visibleItems.map((item, i) => {
              const label = labels.items[item.path];
              const usageLabel = label?.usage
                ? MEDIA_USAGE_OPTIONS.find((o) => o.value === label.usage)?.label
                : null;
              return (
                <li key={item.path}>
                  <Button
                    type="button"
                    variant={i === index ? 'secondary' : 'ghost'}
                    className="h-auto w-full justify-start whitespace-normal px-2 py-2 text-left text-xs"
                    onClick={() => setIndex(i)}
                  >
                    {label?.reviewed ? '✓ ' : '○ '}
                    {item.filename}
                    {usageLabel ? ` · ${usageLabel}` : ''}
                  </Button>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
