import { describe, expect, it } from 'vitest';
import {
  buildOfficeRouteSuggestions,
  type OfficeRouteFamily,
  type OfficeRouteStudent,
} from './officeRouteSuggestions';

const school = { lat: 40, lng: -74 };

function student(id: string, familyId: string | null, overrides: Partial<OfficeRouteStudent> = {}): OfficeRouteStudent {
  return { id, familyId, ...overrides };
}

function family(id: string, homeAddress: string | null = `${id} home`): OfficeRouteFamily {
  return { id, homeAddress };
}

describe('buildOfficeRouteSuggestions', () => {
  it('groups nearby families, counts siblings, and keeps the draft private', () => {
    const families = [family('f1', '1 Oak Street'), family('f2', '2 Oak Street'), family('f3', '3 far Road')];
    const students = [
      student('s2', 'f1'),
      student('s1', 'f1'),
      student('s3', 'f2'),
      student('s4', 'f3'),
      student('s5', 'f3', { status: 'withdrawn' }),
    ];
    const before = JSON.stringify({ families, students });

    const result = buildOfficeRouteSuggestions({
      students,
      families,
      familyPoints: new Map([
        ['f1', { lat: 40.0002, lng: -74 }],
        ['f2', { lat: 40.0003, lng: -74 }],
        ['f3', { lat: 40.01, lng: -74 }],
      ]),
      schoolPoint: school,
      existingRouteCapacities: [2, 20],
      options: { maxRoutes: 2, clusterRadiusMeters: 200, defaultCapacity: 2 },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      familyIds: ['f1', 'f2'],
      studentIds: ['s1', 's2', 's3'],
      studentCount: 3,
      capacity: 2,
    });
    expect(result[0].centroid?.lat).toBeCloseTo(40.00025);
    expect(result[0].spread).toBeGreaterThan(0);
    expect(result[0].warnings).toContain('This draft is over capacity: 3 students but only 2 seats.');
    expect(result[1]).toMatchObject({ familyIds: ['f3'], studentIds: ['s4'], studentCount: 1, capacity: 20 });
    expect(Object.keys(result[0]).sort()).toEqual(
      ['capacity', 'centroid', 'familyIds', 'spread', 'studentCount', 'studentIds', 'warnings'].sort(),
    );
    expect(JSON.stringify(result)).not.toContain('Oak Street');
    expect(JSON.stringify(result)).not.toContain('far Road');
    expect(JSON.stringify({ families, students })).toBe(before);
  });

  it('is deterministic even when input order and equal-distance ties change', () => {
    const families = [family('b'), family('a')];
    const students = [student('s-b', 'b'), student('s-a', 'a')];
    const points = new Map([
      ['b', { lat: 40.0011, lng: -74 }],
      ['a', { lat: 40.001, lng: -74 }],
    ]);
    const options = { maxRoutes: 2, clusterRadius: 1, defaultCapacity: 10 };

    const first = buildOfficeRouteSuggestions({ students, families, familyPoints: points, schoolPoint: school, options });
    const second = buildOfficeRouteSuggestions({
      students: [...students].reverse(),
      families: [...families].reverse(),
      familyPoints: new Map([...points].reverse()),
      schoolPoint: school,
      options,
    });

    expect(second).toEqual(first);
    expect(first.map((route) => route.familyIds[0])).toEqual(['a', 'b']);
  });

  it('keeps the number of routes within the limit and reports forced placement', () => {
    const families = [family('north'), family('south'), family('east')];
    const result = buildOfficeRouteSuggestions({
      students: [student('s-n', 'north'), student('s-s', 'south'), student('s-e', 'east')],
      families,
      familyPoints: {
        north: { lat: 40.02, lng: -74 },
        south: { lat: 39.98, lng: -74 },
        east: { lat: 40, lng: -73.98 },
      },
      schoolPoint: school,
      options: { maxRoutes: 2, clusterRadius: 10, defaultCapacity: 20 },
    });

    expect(result).toHaveLength(2);
    expect(new Set(result.flatMap((route) => route.familyIds))).toEqual(new Set(['north', 'south', 'east']));
    expect(result.some((route) => route.warnings.some((warning) => warning.includes('route limit')))).toBe(true);
  });

  it('keeps families without usable coordinates in a reviewable draft with warnings', () => {
    const result = buildOfficeRouteSuggestions({
      students: [student('located', 'located'), student('no-point', 'no-point'), student('no-address', 'no-address'), student('unlinked', null)],
      families: [family('located', 'Known address'), family('no-point', 'Known but not geocoded'), family('no-address', null)],
      familyPoints: new Map([['located', { lat: 40.001, lng: -74 }]]),
      schoolPoint: school,
      options: { maxRoutes: 1, clusterRadius: 100, defaultCapacity: 4 },
    });

    expect(result).toHaveLength(1);
    expect(result[0].familyIds).toEqual(['located', 'no-address', 'no-point']);
    expect(result[0].studentIds).toEqual(['located', 'no-address', 'no-point', 'unlinked']);
    expect(result[0].warnings).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/missing coordinates/i),
        expect.stringMatching(/home address is missing/i),
        expect.stringMatching(/not linked to a family/i),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain('Known but not geocoded');
  });

  it('uses family ID order and warns when the school point is missing', () => {
    const result = buildOfficeRouteSuggestions({
      students: [student('s-b', 'b'), student('s-a', 'a')],
      families: [family('b'), family('a')],
      familyPoints: { b: { lat: 40.0011, lng: -74 }, a: { lat: 40.001, lng: -74 } },
      options: { maxRoutes: 2, clusterRadius: 1, defaultCapacity: 10 },
    });

    expect(result.map((route) => route.familyIds[0])).toEqual(['a', 'b']);
    expect(result[0].warnings).toContain('The school point was not supplied; family IDs were used for deterministic ordering.');
  });

  it('excludes archived and non-active students', () => {
    const result = buildOfficeRouteSuggestions({
      students: [
        student('active', 'f'),
        student('withdrawn', 'f', { status: 'withdrawn' }),
        student('archived', 'f', { archived: true }),
        student('graduated', 'f', { status: 'graduated' }),
        student('car', 'f', { transportMode: 'car' }),
        student('walk', 'f', { transportMode: 'walk' }),
      ],
      families: [family('f')],
      familyPoints: { f: { lat: 40.001, lng: -74 } },
      schoolPoint: school,
    });

    expect(result[0].studentIds).toEqual(['active']);
    expect(result[0].studentCount).toBe(1);
  });
});
