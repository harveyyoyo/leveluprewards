'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, MapPin, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuthFetch } from '@/lib/authFetch';
import { BUS_ROUTE_COLORS, newTransportId } from '@/lib/office/officeTransport';
import { useOfficeWrite } from '@/lib/office/useOfficeWrite';
import type { OfficeRouteSuggestion } from '@/lib/office/officeRouteSuggestions';
import type { OfficeBusRoute, OfficeBusStop } from '@/lib/office/types';
import { cn } from '@/lib/utils';

type Props = {
  schoolId: string;
  school: { address?: string | null; lat: number; lng: number } | null;
  routes: OfficeBusRoute[];
  onRouteCreated: (routeId: string) => void;
};

type SuggestionsResponse = {
  suggestions?: OfficeRouteSuggestion[];
  assignmentsCreated?: boolean;
  error?: string;
};

function routeDraftName(routes: readonly OfficeBusRoute[], suggestionIndex: number): string {
  const base = `Suggested route ${suggestionIndex + 1}`;
  if (!routes.some((route) => route.name.trim().toLowerCase() === base.toLowerCase())) return base;
  let copyNumber = 2;
  while (routes.some((route) => route.name.trim().toLowerCase() === `${base} (${copyNumber})`.toLowerCase())) {
    copyNumber += 1;
  }
  return `${base} (${copyNumber})`;
}

function routeColor(routes: readonly OfficeBusRoute[], suggestionIndex: number): string {
  const unused = BUS_ROUTE_COLORS.find((color) => !routes.some((route) => route.color.toLowerCase() === color.toLowerCase()));
  return unused ?? BUS_ROUTE_COLORS[suggestionIndex % BUS_ROUTE_COLORS.length];
}

function countLabel(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function schoolStop(school: NonNullable<Props['school']>): OfficeBusStop {
  return {
    id: newTransportId('stop'),
    name: 'School',
    address: school.address?.trim() || null,
    lat: school.lat,
    lng: school.lng,
    amTime: null,
    pmTime: null,
    isSchool: true,
  };
}

function suggestedPickupStop(suggestion: OfficeRouteSuggestion): OfficeBusStop | null {
  if (!suggestion.centroid) return null;
  return {
    id: newTransportId('stop'),
    name: 'Suggested pickup area',
    address: null,
    lat: suggestion.centroid.lat,
    lng: suggestion.centroid.lng,
    amTime: null,
    pmTime: null,
  };
}

export function OfficeRouteSuggestionsPanel({ schoolId, school, routes, onRouteCreated }: Props) {
  const authFetch = useAuthFetch();
  const write = useOfficeWrite(schoolId);
  const { toast } = useToast();
  const [useHomeAddresses, setUseHomeAddresses] = useState(false);
  const [suggestions, setSuggestions] = useState<OfficeRouteSuggestion[]>([]);
  const [hasRequested, setHasRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [creatingIndex, setCreatingIndex] = useState<number | null>(null);
  const [createdIndexes, setCreatedIndexes] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState<string | null>(null);

  const requestSuggestions = async () => {
    if (!school || requesting) return;
    setRequesting(true);
    setError(null);
    setSuggestions([]);
    setHasRequested(false);
    setCreatedIndexes(new Set());
    try {
      const response = await authFetch('/api/office/transport/suggestions', {
        method: 'POST',
        body: JSON.stringify({
          schoolId,
          geocodeAddresses: useHomeAddresses,
          schoolPoint: { lat: school.lat, lng: school.lng },
        }),
      });
      const data = (await response.json()) as SuggestionsResponse;
      if (!response.ok) throw new Error(data.error || 'Could not build route suggestions.');
      if (!Array.isArray(data.suggestions)) throw new Error('The office could not read the route suggestions.');
      if (data.assignmentsCreated !== false) throw new Error('Suggestions must not assign riders.');
      setSuggestions(data.suggestions);
      setHasRequested(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not build route suggestions.');
    } finally {
      setRequesting(false);
    }
  };

  const createRouteDraft = async (suggestion: OfficeRouteSuggestion, suggestionIndex: number) => {
    if (!write.ctx || !school || creatingIndex !== null || createdIndexes.has(suggestionIndex)) return;
    setCreatingIndex(suggestionIndex);
    try {
      const pickupStop = suggestedPickupStop(suggestion);
      const routeId = await write.upsertOfficeBusRoute(write.ctx, {
        name: routeDraftName(routes, suggestionIndex),
        busNumber: null,
        color: routeColor(routes, suggestionIndex),
        driverName: null,
        driverPhone: null,
        capacity: Math.min(200, Math.max(1, Math.round(suggestion.capacity))),
        vehicle: null,
        notifyFamiliesOnAlert: false,
        requireReleaseConfirmations: false,
        stops: [...(pickupStop ? [pickupStop] : []), schoolStop(school)],
        notes: 'Draft created from family roster suggestions. No riders are assigned.',
      });
      setCreatedIndexes((current) => new Set(current).add(suggestionIndex));
      toast({
        title: 'Route draft added',
        description: 'The suggested pickup area and school stop are ready. No students were assigned.',
      });
      onRouteCreated(routeId);
    } catch (cause) {
      toast({
        variant: 'destructive',
        title: 'Could not add the route draft',
        description: cause instanceof Error ? cause.message : undefined,
      });
    } finally {
      setCreatingIndex(null);
    }
  };

  return (
    <section
      id="office-route-suggestions"
      aria-labelledby="office-route-suggestions-title"
      className="space-y-4 rounded-2xl border border-teal-700/20 bg-teal-50/50 p-4 dark:border-teal-800 dark:bg-teal-950/20"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2 id="office-route-suggestions-title" className="font-semibold">Draft route suggestions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Nothing is sent to the suggestion service until you choose Build draft suggestions. The request only returns draft groups; it does not save a route or assign any students.
          </p>
        </div>
      </div>

      {!school ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Set the school location above before asking for route suggestions.
        </p>
      ) : null}

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
        <Checkbox
          className="mt-0.5"
          checked={useHomeAddresses}
          disabled={requesting || !school}
          onCheckedChange={(checked) => {
            setUseHomeAddresses(checked === true);
            setSuggestions([]);
            setHasRequested(false);
            setCreatedIndexes(new Set());
            setError(null);
          }}
          aria-label="Use family home addresses for this request"
        />
        <span className="min-w-0">
          <span className="block text-sm font-medium">Use family home addresses for this request</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            When this is on and you choose Build draft suggestions, home addresses are sent to the mapping service to compare locations. They are not returned to this screen or saved here. Without it, families stay together in one review draft.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="gap-2 rounded-xl"
          disabled={!school || requesting || !write.ready}
          onClick={() => void requestSuggestions()}
        >
          {requesting ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
          {requesting ? 'Building suggestions…' : 'Build draft suggestions'}
        </Button>
        {!useHomeAddresses ? (
          <span className="text-xs text-muted-foreground">Home addresses will not be used.</span>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100">
          {error}
        </p>
      ) : null}

      {hasRequested && !error && suggestions.length === 0 ? (
        <p className="rounded-xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
          No draft suggestions were found. Check that the roster has active students linked to family records, then try again.
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Review these drafts</h3>
            <p className="mt-1 text-xs text-muted-foreground">Counts come from the family roster. Home addresses are not shown.</p>
          </div>
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((suggestion, index) => {
              const created = createdIndexes.has(index);
              return (
                <li
                  key={`${suggestion.familyIds.join('-')}-${suggestion.studentIds.join('-')}-${index}`}
                  className="flex min-h-56 flex-col rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">Draft route {index + 1}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {countLabel(suggestion.familyIds.length, 'family', 'families')} · {countLabel(suggestion.studentCount, 'student')}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {suggestion.capacity} seats
                    </span>
                  </div>

                  <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-teal-800 dark:text-teal-300">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    Pickup area and school stop added when you create the draft
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">No riders are assigned automatically.</p>

                  {suggestion.warnings.length > 0 ? (
                    <ul className="mt-3 space-y-1 text-xs text-amber-800 dark:text-amber-200">
                      {suggestion.warnings.map((warning) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  ) : null}

                  <Button
                    type="button"
                    variant={created ? 'secondary' : 'outline'}
                    className={cn('mt-auto w-full rounded-xl', created && 'cursor-default')}
                    disabled={!school || !write.ready || creatingIndex !== null || created}
                    onClick={() => void createRouteDraft(suggestion, index)}
                  >
                    {created ? (
                      <>
                        <CheckCircle2 aria-hidden /> Route draft added
                      </>
                    ) : creatingIndex === index ? (
                      <>
                        <Loader2 className="animate-spin" aria-hidden /> Adding draft…
                      </>
                    ) : (
                      'Create route draft'
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
