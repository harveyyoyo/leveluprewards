import type { Category, Class, Student } from "@/lib/types";
import { getPeriodKeys } from "@/lib/db/helpers";
import type { ModularScreenConfig } from "./modularDisplaySchema";

export const POINT_BASES = [
  { value: "lifetime", label: "Lifetime earned" },
  { value: "balance", label: "Current balance" },
  { value: "day", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
  { value: "semester", label: "This semester" },
  { value: "year", label: "This year" },
] as const;

export function displayPointBasis(config: ModularScreenConfig) {
  const basis = config.pointBasis || "lifetime";
  // Category counters currently support month, semester, year and all-time only.
  return config.categoryIds?.length &&
    ["balance", "day", "week"].includes(basis)
    ? "lifetime"
    : basis;
}

export function positiveInteger(
  value: number | undefined,
  fallback: number,
  max = Number.MAX_SAFE_INTEGER,
) {
  return Number.isFinite(value) && value! > 0
    ? Math.min(max, Math.max(1, Math.floor(value!)))
    : fallback;
}

export function buildDisplayRanking(
  students: Student[],
  classes: Class[],
  categories: Category[],
  config: ModularScreenConfig,
  now: Date,
) {
  const scoped = config.classId
    ? students.filter((student) => student.classId === config.classId)
    : students;
  const keys = getPeriodKeys(now.getTime());
  const basis = displayPointBasis(config);
  const selectedCategories = (config.categoryIds || []).map((id) =>
    categories.find((category) => category.id === id),
  );
  const pointsFor = (student: Student) => {
    if (selectedCategories.length) {
      return selectedCategories.reduce((total, category) => {
        if (!category) return total;
        const points =
          basis === "lifetime"
            ? student.categoryPoints?.[category.name]
            : student.categoryPointsByPeriod?.[
                keys[basis as "month" | "semester" | "year"]
              ]?.[category.name];
        return total + (Number.isFinite(points) ? points! : 0);
      }, 0);
    }
    const points =
      basis === "balance"
        ? student.points
        : basis === "lifetime"
          ? (student.lifetimePoints ?? student.points)
          : student.pointsByPeriod?.[keys[basis]];
    return Number.isFinite(points) ? points! : 0;
  };
  const ranked = scoped
    .map((student) => ({ student, points: pointsFor(student) }))
    .sort(
      (a, b) => b.points - a.points || a.student.id.localeCompare(b.student.id),
    )
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const classTotals = new Map<string, number>();
  for (const row of ranked)
    if (row.student.classId)
      classTotals.set(
        row.student.classId,
        (classTotals.get(row.student.classId) || 0) + row.points,
      );
  const classRanks = classes
    .filter((item) => !config.classId || item.id === config.classId)
    .map((item) => ({
      id: item.id,
      name: item.name,
      points: classTotals.get(item.id) || 0,
    }))
    .sort((a, b) => b.points - a.points || a.id.localeCompare(b.id));
  const scopeLabel = config.classId
    ? classes.find((item) => item.id === config.classId)?.name ||
      "Selected class unavailable"
    : "Entire school";
  const categoryLabel = selectedCategories.length
    ? selectedCategories
        .map((item) => item?.name || "Category unavailable")
        .join(" + ")
    : "All categories";
  const basisLabel = POINT_BASES.find((item) => item.value === basis)!.label;
  const visible = ranked.slice(0, positiveInteger(config.studentLimit, 15));
  const podiumCount = config.enabledModules.includes("podium")
    ? Math.min(positiveInteger(config.podiumSize, 3, 3), visible.length)
    : 0;
  return {
    scoped,
    ranked,
    visible,
    podium: visible.slice(0, podiumCount),
    remaining: visible.slice(podiumCount),
    classRanks,
    totalPoints: ranked.reduce((sum, row) => sum + row.points, 0),
    scopeLabel,
    categoryLabel,
    basisLabel,
  };
}

export type DisplayRankedStudent = ReturnType<
  typeof buildDisplayRanking
>["ranked"][number];
