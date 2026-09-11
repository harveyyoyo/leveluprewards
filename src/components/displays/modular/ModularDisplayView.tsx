"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Clock,
  CloudSun,
  Crown,
  Pause,
  Play,
  School,
  Trophy,
} from "lucide-react";
import { cn, displayStudentNameOnSharedBoard } from "@/lib/utils";
import type { DisplaysLiveFeed } from "@/hooks/useDisplaysLiveFeed";
import {
  DISPLAY_MODULE_CATALOG,
  resolveScreenTheme,
  type DisplayModuleKey,
  type ModularScreenConfig,
  type ModularThemeConfig,
} from "@/lib/displays/modularDisplaySchema";
import {
  buildDisplayRanking,
  positiveInteger,
  type DisplayRankedStudent,
} from "@/lib/displays/displayRanking";
import {
  FOCUS_SKILLS,
  LEARNING_QUOTES,
  SCHOOL_COMPLIMENTS,
  birthdayMatchesToday,
  dayIndex,
  formatSmartScreenDate,
  formatSmartScreenTime,
  safeTimeZone,
} from "@/lib/smartScreen/smartScreenFormat";
import {
  formatTodayHebrewDate,
  getUpcomingJewishHolidays,
} from "@/lib/hebrewCalendar";
import { incentiveCategoriesForSurface } from "@/lib/incentives/incentiveSurfaces";
import { DisplayFitGrid, FitCardContent, pageItems } from "./DisplayFitGrid";

export type ModularDisplayVariant = "fullscreen" | "preview";
export interface ModularDisplayViewProps {
  config: ModularScreenConfig;
  feed: DisplaysLiveFeed;
  variant?: ModularDisplayVariant;
  autoScroll?: boolean;
  onToggleAutoScroll?: () => void;
  className?: string;
  style?: CSSProperties;
}

function DisplayCard({
  title,
  children,
  theme,
  fit = false,
  className,
}: {
  title: string;
  children: ReactNode;
  theme: ModularThemeConfig;
  fit?: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border p-4 shadow-lg",
        theme.cardClass,
        fit && "h-full",
        className,
      )}
    >
      <h3
        className={cn(
          "mb-3 shrink-0 truncate border-b border-current/15 pb-2 text-sm font-black uppercase tracking-wide",
          theme.textClass,
        )}
      >
        {title}
      </h3>
      {fit ? (
        <FitCardContent>{children}</FitCardContent>
      ) : (
        <div className="min-w-0">{children}</div>
      )}
    </section>
  );
}

function Podium({
  rows,
  theme,
}: {
  rows: DisplayRankedStudent[];
  theme: ModularThemeConfig;
}) {
  const ordered =
    rows.length >= 2 ? [rows[1], rows[0], ...rows.slice(2)] : rows;
  if (!rows.length)
    return (
      <p className="p-4 text-center text-base">
        No students match this selection yet.
      </p>
    );
  return (
    <div
      className="flex items-end justify-center gap-6 px-4 pb-1 pt-2"
      data-display-podium
    >
      {ordered.map(({ student, points, rank }) => (
        <div
          key={student.id}
          className="flex min-w-0 max-w-[320px] flex-1 flex-col items-center text-center"
          data-podium-place={rank}
        >
          {rank === 1 && <Crown className="mb-1 h-7 w-7 text-amber-400" />}
          <span
            className={cn(
              "mb-2 flex h-10 w-10 items-center justify-center rounded-full text-lg font-black",
              rank === 1
                ? "bg-amber-400 text-amber-950"
                : rank === 2
                  ? "bg-slate-200 text-slate-900"
                  : "bg-amber-700 text-white",
            )}
          >
            {rank}
          </span>
          <p
            className="w-full truncate text-2xl font-black"
            title={displayStudentNameOnSharedBoard(student, "preferred_only")}
          >
            {displayStudentNameOnSharedBoard(student, "preferred_only")}
          </p>
          <p
            className={cn(
              "mb-2 text-lg font-bold tabular-nums",
              theme.accentClass,
            )}
          >
            {points.toLocaleString()} pts
          </p>
          <div
            className={cn(
              "flex w-full items-center justify-center rounded-t-2xl border-t-4 text-sm font-black shadow-lg",
              rank === 1
                ? "h-24 border-amber-200 bg-gradient-to-b from-amber-400 to-amber-600 text-amber-950"
                : rank === 2
                  ? "h-16 border-white bg-gradient-to-b from-slate-200 to-slate-400 text-slate-900"
                  : "h-12 border-amber-400 bg-gradient-to-b from-amber-600 to-amber-800 text-white",
            )}
          >
            {rank === 1 ? "1st place" : rank === 2 ? "2nd place" : "3rd place"}
          </div>
        </div>
      ))}
    </div>
  );
}

function RankedStudent({
  row,
  theme,
}: {
  row: DisplayRankedStudent;
  theme: ModularThemeConfig;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-xl border border-current/15 bg-black/5 px-3 py-2.5 text-sm"
      data-student-rank={row.rank}
    >
      <span className="flex h-7 min-w-7 items-center justify-center rounded-lg bg-current/10 font-black">
        {row.rank}
      </span>
      <span className="min-w-0 flex-1 truncate font-bold">
        {displayStudentNameOnSharedBoard(row.student, "preferred_only")}
      </span>
      <span
        className={cn("shrink-0 font-black tabular-nums", theme.accentClass)}
      >
        {row.points.toLocaleString()} pts
      </span>
    </div>
  );
}

export function ModularDisplayView({
  config,
  feed,
  variant = "fullscreen",
  autoScroll: autoScrollProp,
  onToggleAutoScroll,
  className,
  style,
}: ModularDisplayViewProps) {
  const theme = resolveScreenTheme(config.theme);
  const enabled = useMemo(
    () => new Set(config.enabledModules),
    [config.enabledModules],
  );
  const hall =
    config.presetKey === "hall-of-fame" || config.id === "hall-of-fame";
  const fit = !hall && config.presentation !== "scroll";
  const ranking = useMemo(
    () =>
      buildDisplayRanking(
        feed.students,
        feed.classes,
        feed.categories || [],
        config,
        feed.now,
      ),
    [feed.students, feed.classes, feed.categories, config, feed.now],
  );
  const timeZone =
    safeTimeZone(feed.locationInfo?.timeZone) ||
    safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const title = config.customTitle || feed.schoolMeta?.name || feed.schoolId;
  const message = config.customMessage || "Learn, level up, and lead today!";
  const bodyKeys = config.enabledModules.filter(
    (key) =>
      key !== "clockDate" &&
      key !== "weather" &&
      (key !== "hebrewCalendar" || feed.isJewishOrthodox) &&
      (!hall || (key !== "podium" && key !== "studentLeaders")),
  );
  const pageCapacity = positiveInteger(
    config.modulesPerPage,
    config.orientation === "portrait" ? 6 : 9,
    12,
  );
  const modulePages = fit
    ? Math.max(1, Math.ceil(bodyKeys.length / pageCapacity))
    : 1;
  const [tick, setTick] = useState(0);
  const listTick = Math.floor(tick / modulePages);
  const itemsPerCard = positiveInteger(config.itemsPerCard, 3, 20);
  useEffect(() => {
    setTick(0);
    if (!fit) return;
    const timer = setInterval(
      () => setTick((value) => value + 1),
      positiveInteger(config.pageSeconds, 10, 120) * 1000,
    );
    return () => clearInterval(timer);
  }, [fit, config.id, config.pageSeconds, modulePages]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const interactionUntil = useRef(0);
  const shouldScroll =
    !fit && (autoScrollProp ?? config.autoScroll ?? hall) && !paused;
  useEffect(() => {
    setPaused(false);
    scrollRef.current?.scrollTo?.({ top: 0 });
  }, [
    config.id,
    config.classId,
    config.pointBasis,
    config.categoryIds,
    config.studentLimit,
    config.podiumSize,
  ]);
  useEffect(() => {
    if (!shouldScroll) return;
    let frame = 0;
    let previous = 0;
    let holdUntil = performance.now() + 3500;
    let resetAt = 0;
    let position = scrollRef.current?.scrollTop || 0;
    const step = (now: number) => {
      const element = scrollRef.current;
      if (!element) return;
      const delta = previous ? Math.min(50, now - previous) : 0;
      previous = now;
      if (Date.now() < interactionUntil.current) position = element.scrollTop;
      else if (
        now >= holdUntil &&
        element.scrollHeight > element.clientHeight + 2
      ) {
        if (resetAt && now >= resetAt) {
          element.scrollTop = 0;
          position = 0;
          resetAt = 0;
          holdUntil = now + 3500;
        } else if (!resetAt) {
          position += delta * 0.035;
          element.scrollTop = position;
          if (
            element.scrollTop + element.clientHeight >=
            element.scrollHeight - 2
          )
            resetAt = now + 3500;
        }
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [
    shouldScroll,
    config.id,
    config.classId,
    config.pointBasis,
    config.categoryIds,
    config.studentLimit,
    config.podiumSize,
  ]);

  const list = <T,>(
    rows: T[],
    render: (row: T, index: number) => ReactNode,
    empty: string,
  ) => {
    const page = fit
      ? pageItems(rows, listTick, itemsPerCard)
      : { items: rows, pages: 1, page: 0 };
    return (
      <div className="space-y-2">
        {page.items.length ? (
          page.items.map(render)
        ) : (
          <p className={cn("text-sm", theme.quietClass)}>{empty}</p>
        )}
        {page.pages > 1 && (
          <p
            className={cn(
              "pt-1 text-right text-xs font-semibold",
              theme.quietClass,
            )}
          >
            {page.page * itemsPerCard + 1}–
            {Math.min(rows.length, (page.page + 1) * itemsPerCard)} of{" "}
            {rows.length} · Rotating
          </p>
        )}
      </div>
    );
  };
  const simpleRow = (
    name: string,
    points: number,
    key: string,
    description?: string,
  ) => (
    <div
      key={key}
      className="flex items-center justify-between gap-3 rounded-xl border border-current/15 bg-black/5 p-3"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-bold" title={name}>
          {name}
        </p>
        {description && (
          <p className={cn("mt-1 line-clamp-2 text-xs", theme.quietClass)}>
            {description}
          </p>
        )}
      </div>
      <span
        className={cn(
          "shrink-0 text-sm font-black tabular-nums",
          theme.accentClass,
        )}
      >
        {points.toLocaleString()} pts
      </span>
    </div>
  );
  const activePrizes = feed.prizes
    .filter((prize) => prize.inStock !== false && (prize.stockCount ?? 1) > 0)
    .sort((a, b) => Number(a.points || 0) - Number(b.points || 0));
  const houseRows = feed.houses
    .map((house) => ({
      house,
      points: ranking.ranked
        .filter((row) => row.student.houseId === house.id)
        .reduce((sum, row) => sum + row.points, 0),
    }))
    .sort((a, b) => b.points - a.points);
  const birthdays = ranking.scoped.filter((student) =>
    birthdayMatchesToday(student.birthday, feed.now),
  );

  const renderModule = (key: DisplayModuleKey) => {
    let content: ReactNode;
    switch (key) {
      case "podium":
        content = <Podium rows={ranking.podium} theme={theme} />;
        break;
      case "studentLeaders":
        content = list(
          enabled.has("podium") ? ranking.remaining : ranking.visible,
          (row) => (
            <RankedStudent key={row.student.id} row={row} theme={theme} />
          ),
          "No more students in this selection.",
        );
        break;
      case "classStandings":
        content = list(
          ranking.classRanks,
          (row, index) =>
            simpleRow(
              `${fit ? (listTick % Math.max(1, Math.ceil(ranking.classRanks.length / itemsPerCard))) * itemsPerCard + index + 1 : index + 1}. ${row.name}`,
              row.points,
              row.id,
            ),
          "No classes match this selection.",
        );
        break;
      case "houseStandings":
        content = (
          <>
            {list(
              houseRows,
              ({ house, points }) => simpleRow(house.name, points, house.id),
              "No houses set up yet.",
            )}
            <p className={cn("mt-2 text-xs", theme.quietClass)}>
              Student totals for the selected scope and points.
            </p>
          </>
        );
        break;
      case "schoolStats":
        content = (
          <dl className="space-y-2">
            {[
              { label: "Students", value: ranking.scoped.length },
              { label: "Selected points", value: ranking.totalPoints },
              { label: "Rewards", value: activePrizes.length },
            ].map(({ label, value }) => (
              <div
                key={label}
                className={cn(
                  "flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3",
                  theme.statCardClass,
                )}
              >
                <dt className="text-xs font-bold">{label}</dt>
                <dd
                  className={cn(
                    "text-xl font-black tabular-nums",
                    theme.accentClass,
                  )}
                >
                  {value.toLocaleString()}
                </dd>
              </div>
            ))}
          </dl>
        );
        break;
      case "celebrationPosts":
        content = list(
          feed.bulletinPosts,
          (post) => (
            <div
              key={post.id}
              className="flex gap-3 rounded-xl border border-current/15 bg-black/5 p-3"
            >
              <span className="text-2xl">{post.emoji || "🎉"}</span>
              <div className="min-w-0">
                <p className="line-clamp-2 text-sm font-bold">
                  {post.title || "Celebration"}
                </p>
                <p
                  className={cn("mt-1 line-clamp-3 text-xs", theme.quietClass)}
                >
                  {post.message}
                </p>
              </div>
            </div>
          ),
          "Teacher celebrations will appear here.",
        );
        break;
      case "incentiveTasks":
        content = list(
          incentiveCategoriesForSurface(
            feed.categories,
            config.presetKey === "smart-screen"
              ? "smartScreen"
              : "bulletinBoard",
          ),
          (item) =>
            simpleRow(
              item.title || "Point opportunity",
              item.value || 0,
              item.id,
              item.description,
            ),
          "No active point opportunities.",
        );
        break;
      case "rewardsShowcase":
        content = list(
          activePrizes,
          (prize) => simpleRow(prize.name, Number(prize.points || 0), prize.id),
          "In-stock rewards will appear here.",
        );
        break;
      case "birthdays":
        content = list(
          birthdays,
          (student) => (
            <p
              key={student.id}
              className="rounded-xl border border-current/15 p-3 text-sm font-bold"
            >
              🎂 {displayStudentNameOnSharedBoard(student, "preferred_only")}
            </p>
          ),
          "No birthdays today. Celebrate someone with kindness!",
        );
        break;
      case "compliment":
        content = (
          <p className="text-base font-semibold leading-relaxed">
            {SCHOOL_COMPLIMENTS[dayIndex(feed.now, SCHOOL_COMPLIMENTS.length)]}
          </p>
        );
        break;
      case "focusSkill":
        content = (
          <p className="text-base font-semibold leading-relaxed">
            {FOCUS_SKILLS[dayIndex(feed.now, FOCUS_SKILLS.length)]}
          </p>
        );
        break;
      case "quote":
        content = (
          <p className="text-base font-semibold italic leading-relaxed">
            {LEARNING_QUOTES[dayIndex(feed.now, LEARNING_QUOTES.length)]}
          </p>
        );
        break;
      case "daySchedule":
        content = (
          <div className="flex gap-2">
            {["Arrive", "Learn", "Level up"].map((label, index) => (
              <div
                key={label}
                className={cn(
                  "min-w-0 flex-1 rounded-xl border p-3 text-center",
                  theme.statCardClass,
                )}
              >
                <p className="text-xs opacity-70">Step {index + 1}</p>
                <p className="mt-2 text-sm font-bold">{label}</p>
              </div>
            ))}
          </div>
        );
        break;
      case "hebrewCalendar":
        content = (
          <div className="space-y-3">
            <p className="text-lg font-bold">
              {formatTodayHebrewDate(feed.now)}
            </p>
            {getUpcomingJewishHolidays({ from: feed.now, limit: 2 }).map(
              (holiday) => (
                <p key={holiday.id} className="text-sm">
                  {holiday.nameEn} ·{" "}
                  {holiday.date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ),
            )}
          </div>
        );
        break;
      case "schoolGoal": {
        // Goal cards must not compare an unrelated school balance against a personal goal.
        const goal = feed.goals.find(
          (item) =>
            item.type === "class" &&
            item.status === "active" &&
            !item.categoryId &&
            !item.startDate &&
            !item.endDate &&
            (!config.classId || item.classId === config.classId),
        );
        const points = goal
          ? feed.students
              .filter((student) => student.classId === goal.classId)
              .reduce(
                (sum, student) =>
                  sum + (student.lifetimePoints ?? student.points ?? 0),
                0,
              )
          : 0;
        content = goal ? (
          <div className="space-y-3">
            <p className="text-base font-bold">{goal.title}</p>
            <p className="text-sm">
              {points.toLocaleString()} / {goal.targetPoints.toLocaleString()}{" "}
              pts
            </p>
            <div className="h-3 overflow-hidden rounded-full bg-black/15">
              <div
                className={cn("h-full", theme.meterFillClass)}
                style={{
                  width: `${Math.max(0, Math.min(100, (points / Math.max(1, goal.targetPoints)) * 100))}%`,
                }}
              />
            </div>
            <p className="text-xs">
              {feed.classes.find((item) => item.id === goal.classId)?.name} ·
              Lifetime class points
            </p>
          </div>
        ) : (
          <p className="text-sm">
            No active class milestone available for this view.
          </p>
        );
        break;
      }
      default:
        return null;
    }
    return (
      <DisplayCard
        key={key}
        title={
          DISPLAY_MODULE_CATALOG.find((item) => item.key === key)?.label || key
        }
        theme={theme}
        fit={fit}
      >
        {content}
      </DisplayCard>
    );
  };

  const showScope =
    enabled.has("podium") ||
    enabled.has("studentLeaders") ||
    enabled.has("classStandings") ||
    enabled.has("schoolStats") ||
    enabled.has("houseStandings");
  return (
    <div
      data-modular-display-root
      data-presentation={hall ? "hall-of-fame" : fit ? "fit" : "scroll"}
      style={style}
      className={cn(
        "flex w-full flex-col gap-3 overflow-hidden p-4 font-sans",
        variant === "preview" ? "h-full" : "h-dvh",
        theme.pageClass,
        theme.textClass,
        className,
      )}
    >
      <header className="flex shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {feed.schoolMeta?.logoUrl ? (
            <img
              src={feed.schoolMeta.logoUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl bg-white/20 p-1.5 object-contain"
            />
          ) : (
            <School className="h-10 w-10 shrink-0" />
          )}
          <div className="min-w-0">
            <h1 className="line-clamp-2 text-3xl font-black leading-tight">
              {title}
            </h1>
            <p
              className={cn(
                "mt-1 line-clamp-2 text-sm font-semibold",
                theme.quietClass,
              )}
            >
              {message}
            </p>
          </div>
        </div>
        <div
          className="flex shrink-0 flex-wrap justify-end gap-2"
          style={{ maxWidth: "40%" }}
        >
          {!fit && (config.autoScroll ?? hall) && (
            <button
              type="button"
              onClick={() =>
                onToggleAutoScroll ? onToggleAutoScroll() : setPaused(!paused)
              }
              className={cn(
                "flex items-center gap-1 rounded-xl border px-3 py-2 text-xs font-bold",
                theme.badgeClass,
              )}
            >
              {shouldScroll ? (
                <Pause className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              {shouldScroll ? "Pause scrolling" : "Resume scrolling"}
            </button>
          )}
          {enabled.has("weather") && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3",
                theme.cardClass,
              )}
            >
              <CloudSun className="h-5 w-5" />
              <div className="text-xs font-bold">
                <p>
                  {feed.locationInfo?.ok &&
                  typeof feed.locationInfo.temperatureF === "number"
                    ? `${feed.locationInfo.temperatureF}°F`
                    : "Weather unavailable"}
                </p>
                <p className="mt-1 opacity-70">
                  {feed.locationInfo?.ok ? feed.locationInfo.condition : ""}
                </p>
              </div>
            </div>
          )}
          {enabled.has("clockDate") && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border p-3",
                theme.cardClass,
              )}
            >
              <Clock className="h-5 w-5" />
              <div className="text-xs">
                <p className="whitespace-nowrap text-sm font-black">
                  {formatSmartScreenTime(feed.now, timeZone)}
                </p>
                <p className="mt-1">
                  {formatSmartScreenDate(feed.now, timeZone)}
                </p>
              </div>
            </div>
          )}
        </div>
      </header>
      {showScope && (
        <p
          className={cn(
            "shrink-0 truncate text-xs font-bold",
            theme.quietClass,
          )}
          title={`${ranking.scopeLabel} · ${ranking.categoryLabel} · ${ranking.basisLabel}`}
        >
          {ranking.scopeLabel} · {ranking.categoryLabel} · {ranking.basisLabel}
        </p>
      )}
      {hall && enabled.has("podium") && (
        <div
          className="min-h-0 shrink-0"
          style={{ height: "36%" }}
          data-fixed-podium
        >
          <DisplayCard title="Podium leaders" theme={theme} fit>
            <Podium rows={ranking.podium} theme={theme} />
          </DisplayCard>
        </div>
      )}
      {fit ? (
        <DisplayFitGrid config={config} pageTick={tick}>
          {bodyKeys.map(renderModule)}
        </DisplayFitGrid>
      ) : (
        <div
          ref={scrollRef}
          role="region"
          aria-label={
            hall ? "Rankings below the podium" : "Display screen content"
          }
          tabIndex={0}
          onWheel={() => {
            interactionUntil.current = Date.now() + 4500;
          }}
          onTouchStart={() => {
            interactionUntil.current = Date.now() + 4500;
          }}
          onPointerDown={() => {
            interactionUntil.current = Date.now() + 4500;
          }}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 focus-visible:outline focus-visible:outline-2"
        >
          {hall && enabled.has("studentLeaders") && (
            <section aria-label="Student rankings">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-black">
                <Trophy className="h-4 w-4" />
                {ranking.podium.length
                  ? "More student leaders"
                  : "Student leaders"}{" "}
                · {ranking.visible.length} of {ranking.scoped.length} students
              </h2>
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${config.orientation === "portrait" ? 1 : config.leaderboardColumns || 2},minmax(0,1fr))`,
                }}
              >
                {ranking.remaining.map((row) => (
                  <RankedStudent key={row.student.id} row={row} theme={theme} />
                ))}
              </div>
              {!ranking.remaining.length && (
                <p className="text-sm opacity-70">
                  {ranking.visible.length
                    ? "All selected students are on the podium."
                    : "No students match this selection."}
                </p>
              )}
            </section>
          )}
          <div
            className="grid items-start gap-3"
            style={{
              gridTemplateColumns: `repeat(${config.gridColumns || (config.orientation === "portrait" ? 1 : 3)},minmax(0,1fr))`,
            }}
          >
            {bodyKeys.map(renderModule)}
          </div>
        </div>
      )}
    </div>
  );
}
