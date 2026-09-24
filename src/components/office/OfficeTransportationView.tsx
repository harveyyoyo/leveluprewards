'use client';

import { useMemo, useState } from 'react';
import { Bus, History, MapPinned, Navigation, Route, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import { OfficeEmptyState } from '@/components/office/OfficeEmptyState';
import { OfficeTransportLive } from '@/components/office/OfficeTransportLive';
import { OfficeTransportRoutes } from '@/components/office/OfficeTransportRoutes';
import { OfficeTransportRiders } from '@/components/office/OfficeTransportRiders';
import { OfficeTransportHistory } from '@/components/office/OfficeTransportHistory';
import { OfficeBusDriverMode } from '@/components/office/OfficeBusDriverMode';
import { useOfficeBusRoutes, useOfficeBusTripsForDate } from '@/lib/office/useOfficeTransport';
import { useOfficeSettings } from '@/lib/office/useOfficeSettings';
import { DEFAULT_MAP_CENTER, localIsoDate, type LatLng } from '@/lib/office/officeTransport';
import type { OfficeFamily, OfficeStudent } from '@/lib/office/types';

type Section = 'live' | 'routes' | 'riders' | 'history';

type Props = {
  schoolId: string;
  students: OfficeStudent[];
  studentLabelById: Map<string, string>;
  classNameById: Map<string, string>;
  familyById: Map<string, OfficeFamily>;
  isLoading: boolean;
};

/** Transportation: live bus map, routes and stops, how each student gets home, and past trips. */
export function OfficeTransportationView({ schoolId, students, studentLabelById, classNameById, familyById, isLoading }: Props) {
  const [section, setSection] = useState<Section>('live');
  const [driving, setDriving] = useState(false);
  const today = localIsoDate();
  const { routes, allRoutes, isLoading: routesLoading, error } = useOfficeBusRoutes(schoolId);
  const { trips, isLoading: tripsLoading, error: tripsError } = useOfficeBusTripsForDate(schoolId, today);
  const { settings } = useOfficeSettings(schoolId);
  const school = settings?.transportSchoolLocation ?? null;
  const center: LatLng = school ?? routes.find((r) => r.stops?.length)?.stops[0] ?? DEFAULT_MAP_CENTER;

  const activeStudents = useMemo(() => students.filter((s) => (s.status ?? 'active') === 'active'), [students]);
  const activeRouteIds = useMemo(
    () => new Set(trips.filter((trip) => trip.status === 'active').map((trip) => trip.routeId)),
    [trips],
  );
  const onRoad = trips.filter((t) => t.status === 'active').length;
  const noPlan = activeStudents.filter((s) => !s.transportMode).length;

  if (error) {
    return (
      <OfficeEmptyState
        icon={Bus}
        title="Transportation is almost ready"
        description="It will open here after the next update. Everything else in the office works as usual."
      />
    );
  }

  if (tripsError) {
    return (
      <OfficeEmptyState
        icon={Bus}
        title="Live bus updates are unavailable"
        description="Routes and rider records are safe, but the office cannot load live runs right now. Try again in a moment."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ContentSectionTreeNav
          items={[
            { id: 'live', label: onRoad ? `Live (${onRoad})` : 'Live', icon: MapPinned },
            { id: 'routes', label: routes.length ? `Routes (${routes.length})` : 'Routes', icon: Route },
            { id: 'riders', label: noPlan ? `Riders · ${noPlan} not set` : 'Riders', icon: Users },
            { id: 'history', label: 'History', icon: History },
          ]}
          value={section}
          onValueChange={(v) => setSection(v as Section)}
          aria-label="Transportation section"
          className="min-w-0 flex-1"
        />
        <Button type="button" className="gap-2 rounded-xl" onClick={() => setDriving(true)} disabled={routes.length === 0}>
          <Navigation className="h-4 w-4" />
          Drive
        </Button>
      </div>

      {section === 'live' ? (
        <OfficeTransportLive
          schoolId={schoolId}
          routes={routes}
          trips={trips}
          students={activeStudents}
          familyById={familyById}
          studentNameById={studentLabelById}
          center={center}
          isLoading={isLoading || routesLoading || tripsLoading}
          onSetUpRoutes={() => setSection('routes')}
        />
      ) : section === 'routes' ? (
        <OfficeTransportRoutes
          schoolId={schoolId}
          routes={routes}
          students={students}
          familyById={familyById}
          classNameById={classNameById}
          school={school}
          center={center}
          activeRouteIds={activeRouteIds}
          isLoading={isLoading || routesLoading}
        />
      ) : section === 'riders' ? (
        <OfficeTransportRiders
          schoolId={schoolId}
          routes={routes}
          students={activeStudents}
          classNameById={classNameById}
          familyById={familyById}
          activeRouteIds={activeRouteIds}
          isLoading={isLoading || routesLoading}
        />
      ) : (
        <OfficeTransportHistory schoolId={schoolId} routes={allRoutes} studentNameById={studentLabelById} />
      )}

      {driving ? (
        <OfficeBusDriverMode
          schoolId={schoolId}
          routes={routes}
          trips={trips}
          students={activeStudents}
          familyById={familyById}
          center={center}
          onClose={() => setDriving(false)}
        />
      ) : null}
    </div>
  );
}
