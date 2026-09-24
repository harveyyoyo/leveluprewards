import type { OfficeFamily, OfficeStudent } from './types';

export type OfficeRoutePoint = { lat: number; lng: number };

export type OfficeRoutePointInput =
  | OfficeRoutePoint
  | { latitude: number; longitude: number }
  | readonly [number, number]
  | null
  | undefined;

export type OfficeFamilyPointEntry =
  | { familyId: string; point?: OfficeRoutePointInput }
  | { familyId: string; lat: number; lng: number }
  | { familyId: string; latitude: number; longitude: number };

export type OfficeFamilyPointSource =
  | ReadonlyMap<string, OfficeRoutePointInput>
  | Readonly<Record<string, OfficeRoutePointInput>>
  | readonly OfficeFamilyPointEntry[];

export type OfficeRouteCapacitySource =
  | number
  | readonly (number | null | undefined | { capacity?: number | null | undefined })[]
  | ReadonlyMap<string, number | null | undefined | { capacity?: number | null | undefined }>
  | Readonly<
      Record<string, number | null | undefined | { capacity?: number | null | undefined }>
    >;

export type OfficeRouteSuggestionOptions = {
  /** Maximum number of draft routes to return. */
  maxRoutes?: number;
  /** Maximum distance from a draft's current centroid, in metres. */
  clusterRadius?: number;
  /** Seats to use when no existing capacity is available. */
  defaultCapacity?: number;
  /** Alias for callers that want the unit to be explicit. */
  clusterRadiusMeters?: number;
};

export type OfficeRouteStudent = Pick<OfficeStudent, 'id' | 'familyId' | 'status' | 'archived' | 'transportMode'>;
export type OfficeRouteFamily = Pick<OfficeFamily, 'id' | 'homeAddress' | 'archived'>;

export type OfficeRouteSuggestionInput = {
  students: readonly OfficeRouteStudent[];
  families: readonly OfficeRouteFamily[];
  familyPoints?: OfficeFamilyPointSource;
  schoolPoint?: OfficeRoutePointInput;
  /** Existing capacities are used in order; missing entries use the default. */
  existingRouteCapacities?: OfficeRouteCapacitySource;
  options?: OfficeRouteSuggestionOptions;
  /** These top-level values are accepted as a convenience for callers that do not use `options`. */
  maxRoutes?: number;
  clusterRadius?: number;
  defaultCapacity?: number;
  clusterRadiusMeters?: number;
};

export type OfficeRouteSuggestion = {
  familyIds: string[];
  studentIds: string[];
  studentCount: number;
  centroid: OfficeRoutePoint | null;
  /** Largest distance from the centroid to a located family, in metres. */
  spread: number;
  capacity: number;
  warnings: string[];
};

const DEFAULT_MAX_ROUTES = 3;
const DEFAULT_CLUSTER_RADIUS_METERS = 800;
const DEFAULT_CAPACITY = 48;
const DISTANCE_EPSILON_METERS = 1e-9;
const EARTH_RADIUS_METERS = 6_371_000;

type FamilyBucket = {
  familyId: string | null;
  studentIds: string[];
  point: OfficeRoutePoint | null;
  missingAddress: boolean;
  missingRecord: boolean;
  missingPoint: boolean;
  unlinked: boolean;
};

type Cluster = {
  buckets: FamilyBucket[];
  locatedBuckets: FamilyBucket[];
  warnings: Set<string>;
  forcedFamilyCount: number;
};

type NormalizedSettings = {
  maxRoutes: number;
  clusterRadius: number;
  defaultCapacity: number;
};

function cleanId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function compareIds(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function finiteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizePoint(value: unknown): OfficeRoutePoint | null {
  if (Array.isArray(value)) {
    if (value.length < 2) return null;
    return normalizePoint({ lat: value[0], lng: value[1] });
  }
  if (!value || typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  if ('point' in record) return normalizePoint(record.point);

  const lat = finiteNumber(record.lat) ?? finiteNumber(record.latitude);
  const lng = finiteNumber(record.lng) ?? finiteNumber(record.longitude);
  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }
  return { lat: lat === 0 ? 0 : lat, lng: lng === 0 ? 0 : lng };
}

function familyPointFor(
  source: OfficeFamilyPointSource | undefined,
  familyId: string,
): OfficeRoutePointInput | undefined {
  if (!source) return undefined;
  if (source instanceof Map) return source.get(familyId);
  if (Array.isArray(source)) {
    const entry = source.find((candidate) => cleanId(candidate.familyId) === familyId);
    if (!entry) return undefined;
    if ('point' in entry) return entry.point;
    return normalizePoint(entry);
  }
  if (typeof source === 'object') {
    return (source as Readonly<Record<string, OfficeRoutePointInput>>)[familyId];
  }
  return undefined;
}

function positiveCapacity(value: unknown): number | null {
  const candidate =
    value && typeof value === 'object' && 'capacity' in value
      ? (value as { capacity?: unknown }).capacity
      : value;
  const number = finiteNumber(candidate);
  return number !== null && number > 0 ? Math.max(1, Math.round(number)) : null;
}

function capacityList(source: OfficeRouteCapacitySource | undefined): Array<number | null> {
  if (source == null) return [];
  if (typeof source === 'number') return [positiveCapacity(source)];

  if (Array.isArray(source)) {
    return source.map((value) => positiveCapacity(value));
  }
  if (source instanceof Map) {
    return [...source.entries()]
      .sort(([a], [b]) => compareIds(cleanId(a), cleanId(b)))
      .map(([, value]) => positiveCapacity(value));
  }
  if (typeof source === 'object') {
    return Object.keys(source)
      .sort(compareIds)
      .map((key) => positiveCapacity((source as Record<string, unknown>)[key]));
  }
  return [];
}

function settingsFor(
  input: OfficeRouteSuggestionInput,
  extraOptions?: OfficeRouteSuggestionOptions,
): NormalizedSettings {
  const options = {
    ...(input.options ?? {}),
    ...(extraOptions ?? {}),
  };
  const maxRoutesValue = options.maxRoutes ?? input.maxRoutes ?? DEFAULT_MAX_ROUTES;
  const radiusValue =
    options.clusterRadius ??
    options.clusterRadiusMeters ??
    input.clusterRadius ??
    input.clusterRadiusMeters ??
    DEFAULT_CLUSTER_RADIUS_METERS;
  const capacityValue = options.defaultCapacity ?? input.defaultCapacity ?? DEFAULT_CAPACITY;
  const maxRoutes = finiteNumber(maxRoutesValue);
  const radius = finiteNumber(radiusValue);
  const defaultCapacity = finiteNumber(capacityValue);

  return {
    maxRoutes: maxRoutes === null ? DEFAULT_MAX_ROUTES : Math.max(0, Math.floor(maxRoutes)),
    clusterRadius: radius === null ? DEFAULT_CLUSTER_RADIUS_METERS : Math.max(0, radius),
    defaultCapacity:
      defaultCapacity === null || defaultCapacity <= 0
        ? DEFAULT_CAPACITY
        : Math.max(1, Math.round(defaultCapacity)),
  };
}

function distanceMeters(a: OfficeRoutePoint, b: OfficeRoutePoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lng - a.lng);
  const aLatitude = toRadians(a.lat);
  const bLatitude = toRadians(b.lat);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(aLatitude) * Math.cos(bLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(value)));
}

function centroidOf(buckets: readonly FamilyBucket[]): OfficeRoutePoint | null {
  const points = buckets.map((bucket) => bucket.point).filter((point): point is OfficeRoutePoint => point !== null);
  if (points.length === 0) return null;
  const lat = points.reduce((sum, point) => sum + point.lat, 0) / points.length;
  const lng = points.reduce((sum, point) => sum + point.lng, 0) / points.length;
  return { lat, lng };
}

function nearestCluster(
  clusters: readonly Cluster[],
  point: OfficeRoutePoint,
): { cluster: Cluster; distance: number } | null {
  let best: { cluster: Cluster; distance: number } | null = null;
  for (const cluster of clusters) {
    const centroid = centroidOf(cluster.locatedBuckets);
    if (!centroid) continue;
    const distance = distanceMeters(centroid, point);
    const clusterId = cluster.locatedBuckets[0]?.familyId ?? '';
    const bestId = best?.cluster.locatedBuckets[0]?.familyId ?? '';
    if (
      !best ||
      distance < best.distance - DISTANCE_EPSILON_METERS ||
      (Math.abs(distance - best.distance) <= DISTANCE_EPSILON_METERS && compareIds(clusterId, bestId) < 0)
    ) {
      best = { cluster, distance };
    }
  }
  return best;
}

function activeStudents(students: readonly OfficeRouteStudent[]): OfficeRouteStudent[] {
  const byId = new Map<string, OfficeRouteStudent>();
  for (const student of students) {
    if (student.archived === true || (student.status != null && student.status !== 'active')) continue;
    if (student.transportMode != null && student.transportMode !== 'bus') continue;
    const id = cleanId(student.id);
    if (!id) continue;
    const previous = byId.get(id);
    if (!previous || compareIds(cleanId(student.familyId), cleanId(previous.familyId)) < 0) {
      byId.set(id, student);
    }
  }
  return [...byId.values()].sort((a, b) => compareIds(cleanId(a.id), cleanId(b.id)));
}

function familyRecords(families: readonly OfficeRouteFamily[]): Map<string, OfficeRouteFamily> {
  const byId = new Map<string, OfficeRouteFamily>();
  const sorted = [...families]
    .filter((family) => family.archived !== true)
    .sort((a, b) => {
      const idOrder = compareIds(cleanId(a.id), cleanId(b.id));
      if (idOrder !== 0) return idOrder;
      return Number(typeof a.homeAddress !== 'string' || a.homeAddress.trim() === '') -
        Number(typeof b.homeAddress !== 'string' || b.homeAddress.trim() === '');
    });
  for (const family of sorted) {
    const id = cleanId(family.id);
    if (id && !byId.has(id)) byId.set(id, family);
  }
  return byId;
}

function makeBuckets(
  students: readonly OfficeRouteStudent[],
  families: ReadonlyMap<string, OfficeRouteFamily>,
  points: OfficeFamilyPointSource | undefined,
): FamilyBucket[] {
  const byFamily = new Map<string | null, FamilyBucket>();
  for (const student of students) {
    const familyId = cleanId(student.familyId) || null;
    let bucket = byFamily.get(familyId);
    if (!bucket) {
      const family = familyId ? families.get(familyId) : undefined;
      const hasAddress = typeof family?.homeAddress === 'string' && family.homeAddress.trim().length > 0;
      const suppliedPoint = familyId ? normalizePoint(familyPointFor(points, familyId)) : null;
      const point = familyId && hasAddress ? suppliedPoint : null;
      bucket = {
        familyId,
        studentIds: [],
        point,
        missingAddress: !hasAddress,
        missingRecord: Boolean(familyId && !family),
        missingPoint: Boolean(familyId && hasAddress && !suppliedPoint),
        unlinked: familyId === null,
      };
      byFamily.set(familyId, bucket);
    }
    bucket.studentIds.push(cleanId(student.id));
  }

  return [...byFamily.values()]
    .map((bucket) => ({
      ...bucket,
      studentIds: [...new Set(bucket.studentIds)].sort(compareIds),
    }))
    .sort((a, b) => compareIds(a.familyId ?? '', b.familyId ?? ''));
}

function warningForMissingItems(
  cluster: Cluster,
  unplaced: readonly FamilyBucket[],
): void {
  const missingPoints = unplaced.filter((bucket) => bucket.missingPoint && !bucket.unlinked).length;
  const missingAddresses = unplaced.filter((bucket) => bucket.missingAddress && !bucket.unlinked).length;
  const missingRecords = unplaced.filter((bucket) => bucket.missingRecord).length;
  const unlinkedStudents = unplaced
    .filter((bucket) => bucket.unlinked)
    .reduce((sum, bucket) => sum + bucket.studentIds.length, 0);

  if (missingPoints > 0) {
    cluster.warnings.add(
      `Missing coordinates for ${missingPoints} ${missingPoints === 1 ? 'family' : 'families'}; review them before using this draft.`,
    );
  }
  if (missingAddresses > 0) {
    cluster.warnings.add(
      `A home address is missing for ${missingAddresses} ${missingAddresses === 1 ? 'family' : 'families'}; review them before using this draft.`,
    );
  }
  if (missingRecords > 0) {
    cluster.warnings.add(
      `${missingRecords} ${missingRecords === 1 ? 'family is' : 'families are'} not linked to an available family record.`,
    );
  }
  if (unlinkedStudents > 0) {
    cluster.warnings.add(
      `${unlinkedStudents} active ${unlinkedStudents === 1 ? 'student is' : 'students are'} not linked to a family.`,
    );
  }
}

function addBucketWarningForCap(cluster: Cluster): void {
  cluster.forcedFamilyCount += 1;
}

function makeSuggestion(
  cluster: Cluster,
  index: number,
  capacities: readonly (number | null)[],
  defaultCapacity: number,
): OfficeRouteSuggestion {
  const familyIds = [
    ...new Set(
      cluster.buckets
        .map((bucket) => bucket.familyId)
        .filter((id): id is string => Boolean(id)),
    ),
  ].sort(compareIds);
  const studentIds = [...new Set(cluster.buckets.flatMap((bucket) => bucket.studentIds))].sort(compareIds);
  const centroid = centroidOf(cluster.locatedBuckets);
  let spread = 0;
  if (centroid) {
    for (const bucket of cluster.locatedBuckets) {
      if (bucket.point) spread = Math.max(spread, distanceMeters(centroid, bucket.point));
    }
  }

  const capacity = capacities[index] ?? defaultCapacity;
  const warnings = [...cluster.warnings];
  if (cluster.forcedFamilyCount > 0) {
    warnings.push(
      `The route limit was reached; ${cluster.forcedFamilyCount} ${cluster.forcedFamilyCount === 1 ? 'family was' : 'families were'} placed in the nearest draft.`,
    );
  }
  if (studentIds.length > capacity) {
    warnings.push(`This draft is over capacity: ${studentIds.length} students but only ${capacity} seats.`);
  }

  return {
    familyIds,
    studentIds,
    studentCount: studentIds.length,
    centroid,
    spread,
    capacity,
    warnings,
  };
}

/**
 * Builds geographic draft routes without changing any student or family record.
 * Distances and the returned spread are metres; a family with no usable point
 * stays in a draft with a warning so the office can review it before saving.
 */
export function buildOfficeRouteSuggestions(
  input: OfficeRouteSuggestionInput,
  extraOptions?: OfficeRouteSuggestionOptions,
): OfficeRouteSuggestion[] {
  const settings = settingsFor(input, extraOptions);
  const students = activeStudents(input.students ?? []);
  if (students.length === 0 || settings.maxRoutes === 0) return [];

  const families = familyRecords(input.families ?? []);
  const buckets = makeBuckets(students, families, input.familyPoints);
  const schoolPoint = normalizePoint(input.schoolPoint);
  const located = buckets.filter((bucket) => bucket.point !== null);
  const unplaced = buckets.filter((bucket) => bucket.point === null);
  const capacities = capacityList(input.existingRouteCapacities);
  const clusters: Cluster[] = [];

  const orderedLocated = [...located].sort((a, b) => {
    const aDistance = schoolPoint && a.point ? distanceMeters(schoolPoint, a.point) : 0;
    const bDistance = schoolPoint && b.point ? distanceMeters(schoolPoint, b.point) : 0;
    if (Math.abs(aDistance - bDistance) > DISTANCE_EPSILON_METERS) return aDistance - bDistance;
    return compareIds(a.familyId ?? '', b.familyId ?? '');
  });

  for (const bucket of orderedLocated) {
    const point = bucket.point;
    if (!point) continue;
    const nearest = nearestCluster(clusters, point);
    let cluster: Cluster | null = null;

    if (nearest && nearest.distance <= settings.clusterRadius) {
      cluster = nearest.cluster;
    } else if (clusters.length < settings.maxRoutes) {
      cluster = {
        buckets: [],
        locatedBuckets: [],
        warnings: new Set<string>(),
        forcedFamilyCount: 0,
      };
      clusters.push(cluster);
    } else if (nearest) {
      cluster = nearest.cluster;
      addBucketWarningForCap(cluster);
    } else {
      cluster = clusters[0];
      addBucketWarningForCap(cluster);
    }

    cluster.buckets.push(bucket);
    cluster.locatedBuckets.push(bucket);
  }

  if (clusters.length === 0 && unplaced.length > 0) {
    clusters.push({
      buckets: [],
      locatedBuckets: [],
      warnings: new Set<string>(),
      forcedFamilyCount: 0,
    });
  }

  if (unplaced.length > 0) {
    const reviewCluster = clusters[0];
    if (reviewCluster) {
      reviewCluster.buckets.push(...unplaced);
      warningForMissingItems(reviewCluster, unplaced);
    }
  }

  if (!schoolPoint && clusters.length > 0) {
    clusters[0].warnings.add(
      'The school point was not supplied; family IDs were used for deterministic ordering.',
    );
  }

  return clusters.map((cluster, index) =>
    makeSuggestion(cluster, index, capacities, settings.defaultCapacity),
  );
}

/** Shorter aliases for callers that think in terms of suggesting, rather than building, routes. */
export const suggestOfficeRouteSuggestions = buildOfficeRouteSuggestions;
export const suggestOfficeBusRoutes = buildOfficeRouteSuggestions;
