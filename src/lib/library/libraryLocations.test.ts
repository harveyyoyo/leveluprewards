import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIBRARY_LOCATION_ID,
  activeLibraryLocations,
  filterItemsForLibrary,
  itemBelongsToLibrary,
  itemLibraryLocationId,
  libraryPath,
  normalizeLibraryLocationId,
  pickLibraryLocation,
  suggestLibraryLocationId,
} from './libraryLocations';

describe('libraryLocations', () => {
  it('treats missing ids as the school library', () => {
    expect(normalizeLibraryLocationId(undefined)).toBe(DEFAULT_LIBRARY_LOCATION_ID);
    expect(itemLibraryLocationId({})).toBe(DEFAULT_LIBRARY_LOCATION_ID);
    expect(itemBelongsToLibrary({}, 'main')).toBe(true);
    expect(itemBelongsToLibrary({ libraryLocationId: 'room-12' }, 'main')).toBe(false);
  });

  it('keeps existing books in the school library when filtering', () => {
    const items = [
      { id: 'a', libraryLocationId: undefined },
      { id: 'b', libraryLocationId: 'main' },
      { id: 'c', libraryLocationId: 'room-12' },
    ];
    expect(filterItemsForLibrary(items, 'main').map((item) => item.id)).toEqual(['a', 'b']);
    expect(filterItemsForLibrary(items, 'room-12').map((item) => item.id)).toEqual(['c']);
  });

  it('adds a default school library when none is stored yet', () => {
    const active = activeLibraryLocations([{ id: 'room-12', name: 'Room 12', kind: 'classroom' }]);
    expect(active[0]?.id).toBe(DEFAULT_LIBRARY_LOCATION_ID);
    expect(active.some((location) => location.id === 'room-12')).toBe(true);
  });

  it('picks a requested library or falls back to the school library', () => {
    const locations = [
      { id: 'main', name: 'School Library', kind: 'school' as const },
      { id: 'room-12', name: 'Room 12 Class Library', kind: 'classroom' as const },
    ];
    expect(pickLibraryLocation(locations, 'room-12').id).toBe('room-12');
    expect(pickLibraryLocation(locations, 'missing').id).toBe('main');
  });

  it('builds library links and unique ids', () => {
    expect(libraryPath('demo', '', 'main')).toBe('/demo/library');
    expect(libraryPath('demo', '/kiosk', 'room-12')).toBe('/demo/library/kiosk?library=room-12');
    expect(suggestLibraryLocationId('Room 12 Class Library', ['room-12-class-library'])).toBe(
      'room-12-class-library-2',
    );
  });
});
