import type { House, Student } from '@/lib/types';

export type HouseStandingsRow = {
  id: string;
  house: House;
  points: number;
  members: number;
  perCapita: number;
  rank: number;
  imbalanced: boolean;
  chartLabel: string;
  barPercent: number;
  avgMembersPerHouse: number;
};

/** Rank houses by current points for standings column and optional charts. */
export function buildHouseStandingsRows(houses: House[], students: Student[]): HouseStandingsRow[] {
  if (houses.length === 0) return [];

  const totalStudents = students.filter((s) => s.houseId).length;
  const avgMembersPerHouse = totalStudents > 0 ? Math.round(totalStudents / houses.length) : 0;
  const imbalanceThreshold = Math.max(3, Math.round(avgMembersPerHouse * 0.35));
  const memberCounts = new Map(
    houses.map((h) => [h.id, students.filter((s) => s.houseId === h.id).length]),
  );

  const ranked = [...houses].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const maxPts = Math.max(...ranked.map((h) => h.points ?? 0), 1);

  return ranked.map((house, index) => {
    const members = memberCounts.get(house.id) ?? 0;
    const points = house.points ?? 0;
    return {
      id: house.id,
      house,
      points,
      members,
      perCapita: members > 0 ? Math.round(points / members) : 0,
      rank: index + 1,
      imbalanced: Math.abs(members - avgMembersPerHouse) >= imbalanceThreshold,
      chartLabel: house.name.length > 10 ? `${house.name.slice(0, 9)}…` : house.name,
      barPercent: maxPts > 0 ? Math.round((points / maxPts) * 100) : 0,
      avgMembersPerHouse,
    };
  });
}

export function houseStandingsById(rows: HouseStandingsRow[]): Map<string, HouseStandingsRow> {
  return new Map(rows.map((r) => [r.id, r]));
}
