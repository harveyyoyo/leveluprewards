export const DEFAULT_LIBRARY_LOCATION_ID = 'main';
export const DEFAULT_LIBRARY_LOCATION_NAME = 'School Library';

export type LibraryLocationKind = 'school' | 'classroom';

export interface LibraryLocation {
  id: string;
  name: string;
  kind: LibraryLocationKind;
  classId?: string | null;
  archived?: boolean;
  createdAt?: number;
}

export function normalizeLibraryLocationId(value?: string | null): string {
  if (typeof value !== 'string') return DEFAULT_LIBRARY_LOCATION_ID;
  const id = value.trim();
  if (!id || id.length > 80 || id.includes('/')) return DEFAULT_LIBRARY_LOCATION_ID;
  return id;
}

export function isValidLibraryLocationId(value: string): boolean {
  return Boolean(value.trim()) && value.trim().length <= 80 && !value.includes('/');
}

export function itemLibraryLocationId(item?: { libraryLocationId?: string | null } | null): string {
  return normalizeLibraryLocationId(item?.libraryLocationId);
}

export function itemBelongsToLibrary(
  item: { libraryLocationId?: string | null } | null | undefined,
  libraryLocationId?: string | null,
): boolean {
  return itemLibraryLocationId(item) === normalizeLibraryLocationId(libraryLocationId);
}

export function filterItemsForLibrary<T extends { libraryLocationId?: string | null }>(
  items: T[] | null | undefined,
  libraryLocationId?: string | null,
): T[] {
  const id = normalizeLibraryLocationId(libraryLocationId);
  return (items ?? []).filter((item) => itemLibraryLocationId(item) === id);
}

export function defaultLibraryLocation(now = Date.now()): LibraryLocation {
  return {
    id: DEFAULT_LIBRARY_LOCATION_ID,
    name: DEFAULT_LIBRARY_LOCATION_NAME,
    kind: 'school',
    createdAt: now,
  };
}

export function activeLibraryLocations(locations: LibraryLocation[] | null | undefined): LibraryLocation[] {
  const list = (locations ?? []).filter((location) => !location.archived);
  if (list.length === 0) return [defaultLibraryLocation()];
  if ((locations ?? []).some((location) => location.id === DEFAULT_LIBRARY_LOCATION_ID)) return list;
  return [defaultLibraryLocation(), ...list];
}

export function pickLibraryLocation(
  locations: LibraryLocation[] | null | undefined,
  requestedId?: string | null,
): LibraryLocation {
  const active = activeLibraryLocations(locations);
  const requested = requestedId ? normalizeLibraryLocationId(requestedId) : '';
  if (requested) {
    const match = active.find((location) => location.id === requested);
    if (match) return match;
  }
  return active.find((location) => location.id === DEFAULT_LIBRARY_LOCATION_ID) ?? active[0] ?? defaultLibraryLocation();
}

export function libraryLocationLabel(location: LibraryLocation, className?: string | null): string {
  const name = location.name.trim() || DEFAULT_LIBRARY_LOCATION_NAME;
  if (location.kind === 'classroom' && className?.trim()) {
    return `${name} · ${className.trim()}`;
  }
  return name;
}

export function libraryLocationKindLabel(kind: LibraryLocationKind): string {
  return kind === 'classroom' ? 'Class library' : 'School library';
}

export function suggestLibraryLocationId(name: string, existingIds: Iterable<string>): string {
  const taken = new Set([...existingIds].map((id) => id.trim()).filter(Boolean));
  taken.add(DEFAULT_LIBRARY_LOCATION_ID);
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'library';
  if (!taken.has(base)) return base;
  for (let index = 2; index < 100; index += 1) {
    const id = `${base}-${index}`;
    if (!taken.has(id)) return id;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function libraryPath(
  schoolId: string,
  suffix = '',
  libraryLocationId?: string | null,
): string {
  const base = `/${schoolId}/library${suffix}`;
  const id = normalizeLibraryLocationId(libraryLocationId);
  if (id === DEFAULT_LIBRARY_LOCATION_ID) return base;
  return `${base}${base.includes('?') ? '&' : '?'}library=${encodeURIComponent(id)}`;
}

export function libraryLocationStorageKey(schoolId: string): string {
  return `lur.libraryLocation.${schoolId}`;
}

export function readStoredLibraryLocationId(schoolId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(libraryLocationStorageKey(schoolId));
    return value ? normalizeLibraryLocationId(value) : null;
  } catch {
    return null;
  }
}

export function writeStoredLibraryLocationId(schoolId: string, libraryLocationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(libraryLocationStorageKey(schoolId), normalizeLibraryLocationId(libraryLocationId));
  } catch {
    // Private mode or disabled storage should not block library switching.
  }
}
