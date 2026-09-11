"use client";

import type { Category, Class } from "@/lib/types";
import type { ModularScreenConfig } from "@/lib/displays/modularDisplaySchema";
import { displayPointBasis, POINT_BASES } from "@/lib/displays/displayRanking";

type Props = {
  screen: ModularScreenConfig;
  onChange: (updates: Partial<ModularScreenConfig>) => void;
};
const control =
  "h-10 w-full rounded-lg border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring";

export function validDisplayNumbers(screen: ModularScreenConfig) {
  return (
    [
      ["studentLimit", 1, Number.MAX_SAFE_INTEGER],
      ["itemsPerCard", 1, 20],
      ["modulesPerPage", 1, 12],
      ["pageSeconds", 3, 120],
    ] as const
  ).every(
    ([key, min, max]) =>
      screen[key] === undefined ||
      (Number.isInteger(screen[key]) &&
        screen[key]! >= min &&
        screen[key]! <= max),
  );
}

export function DisplayLeaderboardSettings({
  screen,
  onChange,
  classes,
  categories,
}: Props & { classes: Class[]; categories: Category[] }) {
  const selected = screen.categoryIds || [];
  const hasStudents = screen.enabledModules.some(
    (key) => key === "podium" || key === "studentLeaders",
  );
  const setCategories = (categoryIds: string[]) =>
    onChange({
      categoryIds,
      pointBasis: displayPointBasis({ ...screen, categoryIds }),
    });
  return (
    <fieldset className="space-y-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">Students & points</legend>
      <div className="space-y-2">
        <label htmlFor="ranking-class" className="text-sm font-semibold">
          Who is this screen for?
        </label>
        <select
          id="ranking-class"
          className={control}
          value={screen.classId || ""}
          onChange={(event) => onChange({ classId: event.target.value })}
        >
          <option value="">Entire school</option>
          {classes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
          {screen.classId &&
            !classes.some((item) => item.id === screen.classId) && (
              <option value={screen.classId}>Selected class unavailable</option>
            )}
        </select>
        <p className="text-xs text-muted-foreground">
          Filters student rankings, class totals, house student totals, and
          birthdays.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-2 text-sm font-semibold">
          Which point categories?
        </legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!selected.length}
            onChange={() => setCategories([])}
          />
          All categories
        </label>
        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex items-center gap-2 text-sm"
            >
              <input
                type="checkbox"
                checked={selected.includes(category.id)}
                onChange={(event) =>
                  setCategories(
                    event.target.checked
                      ? [...selected, category.id]
                      : selected.filter((id) => id !== category.id),
                  )
                }
              />
              {category.name}
            </label>
          ))}
          {!categories.length && (
            <p className="text-xs text-muted-foreground">
              School point categories will appear here.
            </p>
          )}
          {selected
            .filter((id) => !categories.some((category) => category.id === id))
            .map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked
                  onChange={() =>
                    setCategories(selected.filter((value) => value !== id))
                  }
                />
                Unavailable category (remove)
              </label>
            ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Select one or several categories to add their earned points together.
        </p>
      </fieldset>
      <div className="space-y-2">
        <label htmlFor="point-basis" className="text-sm font-semibold">
          Points to rank by
        </label>
        <select
          id="point-basis"
          className={control}
          value={displayPointBasis(screen)}
          onChange={(event) =>
            onChange({
              pointBasis: event.target
                .value as ModularScreenConfig["pointBasis"],
            })
          }
        >
          {POINT_BASES.filter(
            (item) =>
              !selected.length ||
              !["balance", "day", "week"].includes(item.value),
          ).map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {selected.length
            ? "Category breakdowns are available for lifetime, month, semester, and year."
            : "Earned points include points already spent. Current balance is what students can spend now."}
        </p>
      </div>
      {hasStudents && (
        <div className="space-y-2">
          <label htmlFor="student-limit" className="text-sm font-semibold">
            Students to show
          </label>
          <input
            id="student-limit"
            type="number"
            min={1}
            step={1}
            className={control}
            value={screen.studentLimit ?? 15}
            onChange={(event) =>
              onChange({ studentLimit: Number(event.target.value) })
            }
          />
          <p className="text-xs text-muted-foreground">
            Any whole number, including podium winners. Shows all available
            students if fewer match.
          </p>
          {screen.studentLimit !== undefined &&
            (!Number.isInteger(screen.studentLimit) ||
              screen.studentLimit < 1) && (
              <p role="alert" className="text-xs text-destructive">
                Enter a whole number of at least 1.
              </p>
            )}
        </div>
      )}
      {screen.enabledModules.includes("podium") && (
        <div className="space-y-2">
          <label htmlFor="podium-size" className="text-sm font-semibold">
            Podium places
          </label>
          <select
            id="podium-size"
            className={control}
            value={screen.podiumSize ?? 3}
            onChange={(event) =>
              onChange({ podiumSize: Number(event.target.value) as 1 | 2 | 3 })
            }
          >
            <option value={1}>1 · Winner only</option>
            <option value={2}>2 · First and second</option>
            <option value={3}>3 · First, second and third</option>
          </select>
          <p className="text-xs text-muted-foreground">
            In Hall of Fame, the podium stays visible while the remaining
            rankings move underneath.
          </p>
        </div>
      )}
      {screen.presetKey === "hall-of-fame" &&
        screen.enabledModules.includes("studentLeaders") && (
          <div className="space-y-2">
            <label
              htmlFor="leaderboard-columns"
              className="text-sm font-semibold"
            >
              Ranking columns
            </label>
            <select
              id="leaderboard-columns"
              className={control}
              value={screen.leaderboardColumns ?? 2}
              onChange={(event) =>
                onChange({
                  leaderboardColumns: Number(event.target.value) as 1 | 2 | 3,
                })
              }
            >
              {[1, 2, 3].map((count) => (
                <option key={count} value={count}>
                  {count}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Tall screens use one column for readability.
            </p>
          </div>
        )}
    </fieldset>
  );
}

export function DisplayLayoutSettings({ screen, onChange }: Props) {
  const hall =
    screen.presetKey === "hall-of-fame" || screen.id === "hall-of-fame";
  const fit = !hall && screen.presentation !== "scroll";
  return (
    <fieldset className="space-y-4 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">Fit & layout</legend>
      {!hall && (
        <div className="space-y-2">
          <label
            htmlFor="display-presentation"
            className="text-sm font-semibold"
          >
            When content fills the TV
          </label>
          <select
            id="display-presentation"
            className={control}
            value={screen.presentation || "fit"}
            onChange={(event) =>
              onChange({ presentation: event.target.value as "fit" | "scroll" })
            }
          >
            <option value="fit">Fit to screen · rotate extra pages</option>
            <option value="scroll">Scroll through content</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Fit keeps the screen still. Longer lists and extra cards rotate
            automatically without scrolling.
          </p>
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="grid-columns" className="text-sm font-semibold">
          Content columns
        </label>
        <select
          id="grid-columns"
          className={control}
          value={screen.gridColumns ?? 0}
          onChange={(event) =>
            onChange({
              gridColumns: Number(event.target.value) as 0 | 1 | 2 | 3 | 4,
            })
          }
        >
          <option value={0}>Automatic</option>
          {[1, 2, 3, 4].map((count) => (
            <option key={count} value={count}>
              {count}
            </option>
          ))}
        </select>
      </div>
      {fit && (
        <>
          {(
            [
              {
                key: "modulesPerPage",
                label: "Cards per screen",
                fallback: screen.orientation === "portrait" ? 6 : 9,
                min: 1,
                max: 12,
              },
              {
                key: "itemsPerCard",
                label: "Rows per card",
                fallback: 3,
                min: 1,
                max: 20,
              },
              {
                key: "pageSeconds",
                label: "Seconds between pages",
                fallback: 10,
                min: 3,
                max: 120,
              },
            ] as const
          ).map(({ key, label, fallback, min, max }) => (
            <div key={key} className="space-y-2">
              <label htmlFor={key} className="text-sm font-semibold">
                {label}
              </label>
              <input
                id={key}
                className={control}
                type="number"
                min={min}
                max={max}
                step={1}
                value={screen[key] ?? fallback}
                onChange={(event) =>
                  onChange({ [key]: Number(event.target.value) })
                }
              />
              {screen[key] !== undefined &&
                (!Number.isInteger(screen[key]) ||
                  screen[key]! < min ||
                  screen[key]! > max) && (
                  <p role="alert" className="text-xs text-destructive">
                    Enter a whole number from {min} to {max}.
                  </p>
                )}
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            Fewer cards and rows make text larger. Extra items stay in the
            rotation.
          </p>
        </>
      )}
    </fieldset>
  );
}
