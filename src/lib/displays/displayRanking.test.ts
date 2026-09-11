import { describe, expect, it } from "vitest";
import type { Category, Class, Student } from "@/lib/types";
import { READY_MADE_PRESET_SCREENS } from "./modularDisplaySchema";
import { buildDisplayRanking } from "./displayRanking";
const config = READY_MADE_PRESET_SCREENS["hall-of-fame"];
const now = new Date(2026, 8, 11, 12);
const classes = [
  { id: "a", name: "Grade A" },
  { id: "b", name: "Grade B" },
] as Class[];
const categories = [
  { id: "kind", name: "Kindness" },
  { id: "work", name: "Classwork" },
] as Category[];
const students = [
  {
    id: "1",
    classId: "a",
    points: 5,
    lifetimePoints: 100,
    categoryPoints: { Kindness: 10, Classwork: 40 },
    categoryPointsByPeriod: { "2026-09": { Kindness: 3, Classwork: 5 } },
    pointsByPeriod: { "2026-09": 8 },
  },
  {
    id: "2",
    classId: "a",
    points: 50,
    lifetimePoints: 70,
    categoryPoints: { Kindness: 30, Classwork: 5 },
    categoryPointsByPeriod: { "2026-09": { Kindness: 12 } },
    pointsByPeriod: { "2026-09": 12 },
  },
  { id: "3", classId: "b", points: 200, lifetimePoints: 200 },
] as Student[];
describe("display ranking selection", () => {
  it("filters the class before ranking and applying the exact count", () => {
    const result = buildDisplayRanking(
      students,
      classes,
      categories,
      { ...config, classId: "a", studentLimit: 1 },
      now,
    );
    expect(result.visible.map((row) => row.student.id)).toEqual(["1"]);
    expect(result.totalPoints).toBe(170);
    expect(result.classRanks).toEqual([
      { id: "a", name: "Grade A", points: 170 },
    ]);
  });
  it("ranks by category names in stored counters and sums selected categories", () => {
    const one = buildDisplayRanking(
      students,
      classes,
      categories,
      { ...config, categoryIds: ["kind"] },
      now,
    );
    expect(one.visible.map((row) => row.points)).toEqual([30, 10, 0]);
    const both = buildDisplayRanking(
      students,
      classes,
      categories,
      { ...config, categoryIds: ["kind", "work"] },
      now,
    );
    expect(both.visible.map((row) => row.points)).toEqual([50, 35, 0]);
  });
  it("uses current period counters and never substitutes lifetime for an empty period", () => {
    const result = buildDisplayRanking(
      students,
      classes,
      categories,
      { ...config, pointBasis: "month", categoryIds: ["kind"] },
      now,
    );
    expect(result.visible.map((row) => row.points)).toEqual([12, 3, 0]);
    const next = buildDisplayRanking(
      students,
      classes,
      categories,
      { ...config, pointBasis: "month" },
      new Date(2026, 9, 1),
    );
    expect(next.totalPoints).toBe(0);
  });
  it("keeps balance distinct from earned points and does not broaden a missing category", () => {
    expect(
      buildDisplayRanking(
        students,
        classes,
        categories,
        { ...config, pointBasis: "balance" },
        now,
      ).visible.map((row) => row.points),
    ).toEqual([200, 50, 5]);
    expect(
      buildDisplayRanking(
        students,
        classes,
        categories,
        { ...config, categoryIds: ["removed"] },
        now,
      ).totalPoints,
    ).toBe(0);
  });
  it.each([1, 2, 3] as const)(
    "splits %i winners from remaining ranks without duplication",
    (podiumSize) => {
      const result = buildDisplayRanking(
        students,
        classes,
        categories,
        { ...config, podiumSize },
        now,
      );
      expect(result.podium).toHaveLength(podiumSize);
      expect(
        [...result.podium, ...result.remaining].map((row) => row.rank),
      ).toEqual([1, 2, 3]);
    },
  );
  it("supports more than 250 students and an arbitrary exact limit", () => {
    const roster = Array.from({ length: 320 }, (_, index) => ({
      id: String(index),
      points: index,
      lifetimePoints: index,
    })) as Student[];
    const result = buildDisplayRanking(
      roster,
      [],
      [],
      { ...config, studentLimit: 277 },
      now,
    );
    expect(result.visible).toHaveLength(277);
    expect(result.podium[0].student.id).toBe("319");
    expect(result.remaining).toHaveLength(274);
  });
});
