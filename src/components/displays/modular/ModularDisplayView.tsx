'use client';

import { useMemo, type CSSProperties } from 'react';
import {
  Cake,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  Clock,
  CloudSun,
  Crown,
  Gift,
  Heart,
  Lightbulb,
  Megaphone,
  School,
  Sparkles,
  Star,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { cn, displayStudentNameOnSharedBoard } from '@/lib/utils';
import type { DisplaysLiveFeed } from '@/hooks/useDisplaysLiveFeed';
import {
  MODULAR_THEMES,
  resolveScreenTheme,
  type DisplayModuleKey,
  type ModularScreenConfig,
} from '@/lib/displays/modularDisplaySchema';
import {
  FOCUS_SKILLS,
  LEARNING_QUOTES,
  SCHOOL_COMPLIMENTS,
  birthdayMatchesToday,
  dayIndex,
  formatSmartScreenDate,
  formatSmartScreenTime,
  hourInTimeZone,
  safeTimeZone,
} from '@/lib/smartScreen/smartScreenFormat';
import { formatTodayHebrewDate, getUpcomingJewishHolidays } from '@/lib/hebrewCalendar';

export type ModularDisplayVariant = 'fullscreen' | 'preview';

export interface ModularDisplayViewProps {
  config: ModularScreenConfig;
  feed: DisplaysLiveFeed;
  variant?: ModularDisplayVariant;
  className?: string;
  style?: CSSProperties;
}

export function ModularDisplayView({
  config,
  feed,
  variant = 'fullscreen',
  className,
  style,
}: ModularDisplayViewProps) {
  const {
    now,
    schoolMeta,
    students,
    classes,
    houses,
    prizes,
    goals,
    bulletinIncentives,
    bulletinPosts,
    locationInfo,
    isJewishOrthodox,
    schoolId,
  } = feed;

  const isPreview = variant === 'preview';
  const theme = resolveScreenTheme(config.theme);
  const isPortrait = config.orientation === 'portrait';
  const enabledSet = useMemo(() => new Set(config.enabledModules || []), [config.enabledModules]);

  // Calculations
  const displayTimeZone = safeTimeZone(locationInfo?.timeZone) || safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const timeFormatted = formatSmartScreenTime(now, displayTimeZone);
  const dateFormatted = formatSmartScreenDate(now, displayTimeZone);

  const totalPoints = useMemo(
    () => students.reduce((acc, s) => acc + (s.points || 0), 0),
    [students],
  );

  const topStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => (b.lifetimePoints ?? b.points ?? 0) - (a.lifetimePoints ?? a.points ?? 0))
      .slice(0, 10);
  }, [students]);

  const topHouses = useMemo(() => {
    return [...houses]
      .sort((a, b) => (b.lifetimePoints ?? b.points ?? 0) - (a.lifetimePoints ?? a.points ?? 0))
      .slice(0, 4);
  }, [houses]);

  const activePrizes = useMemo(() => {
    return [...prizes]
      .filter((p) => p.inStock !== false && (p.stockCount ?? 1) > 0)
      .sort((a, b) => Number(a.points ?? 0) - Number(b.points ?? 0))
      .slice(0, 6);
  }, [prizes]);

  const birthdayStudents = useMemo(() => {
    return students.filter((s) => birthdayMatchesToday(s.birthday, now)).slice(0, 4);
  }, [students, now]);

  const activeGoal = useMemo(() => {
    return goals.find((g) => (g as any).active !== false) || goals[0] || null;
  }, [goals]);

  const schoolTitle = config.customTitle || schoolMeta?.name || schoolId.replace(/-/g, ' ').toUpperCase();
  const schoolMessage = config.customMessage || 'Learn, level up, and lead today!';

  const compliment = SCHOOL_COMPLIMENTS[dayIndex(now, SCHOOL_COMPLIMENTS.length)];
  const focusSkill = FOCUS_SKILLS[dayIndex(now, FOCUS_SKILLS.length)];
  const quote = LEARNING_QUOTES[dayIndex(now, LEARNING_QUOTES.length)];

  // Podium slots
  const podiumTop3 = topStudents.slice(0, 3);
  const firstPlace = podiumTop3[0];
  const secondPlace = podiumTop3[1];
  const thirdPlace = podiumTop3[2];

  // Helper card wrapper
  const ModuleCard = ({
    title,
    icon: Icon,
    children,
    className: cardCls,
    accentBorder,
  }: {
    title: string;
    icon: any;
    children: React.ReactNode;
    className?: string;
    accentBorder?: boolean;
  }) => (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all',
        theme.cardClass,
        accentBorder && theme.heroBorderClass,
        cardCls,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4 shrink-0', theme.accentClass)} />
          <h3 className="text-xs font-black uppercase tracking-wider">{title}</h3>
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );

  return (
    <div
      data-modular-display-root
      style={style}
      className={cn(
        'relative flex w-full flex-col font-sans select-none overflow-hidden',
        isPreview ? 'h-full' : 'min-h-screen',
        isPortrait ? 'p-3 sm:p-5' : 'p-4 sm:p-6 lg:p-8',
        theme.pageClass,
        className,
      )}
    >
      {/* Top Banner & Hero Header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3.5">
          {schoolMeta?.logoUrl ? (
            <img
              src={schoolMeta.logoUrl}
              alt=""
              className="h-12 w-12 rounded-2xl bg-white/20 p-1.5 object-contain shadow-md"
            />
          ) : (
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl border', theme.badgeClass)}>
              <School className="h-6 w-6" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">{schoolTitle}</h1>
            <p className={cn('text-xs font-semibold', theme.quietClass)}>{schoolMessage}</p>
          </div>
        </div>

        {/* Integrated Weather & Clock Pill if enabled */}
        <div className="flex items-center gap-3">
          {enabledSet.has('weather') && (
            <div className={cn('flex items-center gap-2 rounded-2xl border px-3.5 py-2 shadow-md', theme.cardClass)}>
              <CloudSun className={cn('h-5 w-5', theme.accentClass)} />
              <div>
                <p className="text-xs font-black leading-none">
                  {locationInfo?.temperatureF ?? 72}°F
                </p>
                <p className={cn('text-[10px] font-bold leading-none mt-0.5', theme.quietClass)}>
                  {locationInfo?.condition || 'Clear'}
                </p>
              </div>
            </div>
          )}

          {enabledSet.has('clockDate') && (
            <div className={cn('flex items-center gap-3 rounded-2xl border px-4 py-2 shadow-md', theme.cardClass)}>
              <Clock className={cn('h-5 w-5', theme.accentClass)} />
              <div>
                <p className="text-sm font-black tracking-wider leading-none">{timeFormatted}</p>
                <p className={cn('text-[10px] font-bold leading-none mt-1', theme.quietClass)}>{dateFormatted}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* School-wide Goal Progress Bar (if enabled) */}
      {enabledSet.has('schoolGoal') && activeGoal && (
        <div className={cn('mb-4 rounded-2xl border p-3.5 shadow-lg', theme.cardClass)}>
          <div className="flex items-center justify-between text-xs font-black mb-1.5">
            <span className="flex items-center gap-1.5">
              <Target className={cn('h-4 w-4', theme.accentClass)} />
              School Milestone: {activeGoal.title || 'Community Goal'}
            </span>
            <span className={theme.accentClass}>
              {totalPoints.toLocaleString()} / {(activeGoal.targetPoints || 50000).toLocaleString()} pts
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-black/20 overflow-hidden">
            <div
              className={cn('h-full transition-all duration-1000', theme.badgeClass)}
              style={{
                width: `${Math.min(100, Math.round((totalPoints / (activeGoal.targetPoints || 50000)) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Main Grid of Modules */}
      <div
        className={cn(
          'grid gap-4 flex-1 min-h-0 overflow-hidden',
          isPortrait ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {/* Hall of Fame: Podium */}
        {enabledSet.has('podium') && (
          <ModuleCard title="Podium Leaders" icon={Crown} className="md:col-span-2 lg:col-span-2">
            <div className="flex h-full items-end justify-center gap-3 sm:gap-6 pt-4 pb-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center flex-1 max-w-[130px]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-300 bg-slate-200/20 font-black text-xs mb-1.5">
                  2
                </div>
                <p className="text-xs font-black text-center truncate w-full">
                  {secondPlace ? displayStudentNameOnSharedBoard(secondPlace, 'preferred_only') : 'Leading Scholar'}
                </p>
                <p className={cn('text-[11px] font-bold', theme.accentClass)}>
                  {(secondPlace?.lifetimePoints ?? secondPlace?.points ?? 1250).toLocaleString()} pts
                </p>
                <div className="mt-2 h-20 w-full rounded-t-xl bg-slate-400/30 border-t-2 border-slate-300 flex items-center justify-center font-black text-sm">
                  SILVER
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center flex-1 max-w-[150px]">
                <Crown className="h-6 w-6 text-amber-400 mb-1 animate-bounce" />
                <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-amber-400 bg-amber-400/20 font-black text-sm mb-1.5 shadow-lg shadow-amber-400/20">
                  1
                </div>
                <p className="text-sm font-black text-center truncate w-full">
                  {firstPlace ? displayStudentNameOnSharedBoard(firstPlace, 'preferred_only') : 'Top Champion'}
                </p>
                <p className={cn('text-xs font-black', theme.accentClass)}>
                  {(firstPlace?.lifetimePoints ?? firstPlace?.points ?? 2400).toLocaleString()} pts
                </p>
                <div className="mt-2 h-28 w-full rounded-t-xl bg-amber-400/40 border-t-2 border-amber-400 flex items-center justify-center font-black text-sm text-amber-200 shadow-xl">
                  GOLD
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center flex-1 max-w-[130px]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-amber-700 bg-amber-700/20 font-black text-xs mb-1.5">
                  3
                </div>
                <p className="text-xs font-black text-center truncate w-full">
                  {thirdPlace ? displayStudentNameOnSharedBoard(thirdPlace, 'preferred_only') : 'Rising Star'}
                </p>
                <p className={cn('text-[11px] font-bold', theme.accentClass)}>
                  {(thirdPlace?.lifetimePoints ?? thirdPlace?.points ?? 980).toLocaleString()} pts
                </p>
                <div className="mt-2 h-14 w-full rounded-t-xl bg-amber-700/30 border-t-2 border-amber-700 flex items-center justify-center font-black text-sm">
                  BRONZE
                </div>
              </div>
            </div>
          </ModuleCard>
        )}

        {/* Hall of Fame: Student Leaderboard */}
        {enabledSet.has('studentLeaders') && (
          <ModuleCard title="Top Students" icon={Trophy}>
            <div className="space-y-2">
              {topStudents.slice(0, 5).map((student, idx) => (
                <div key={student.id} className="flex items-center justify-between gap-2 text-xs font-bold">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-md font-black text-[10px]', theme.badgeClass)}>
                      {idx + 1}
                    </span>
                    <span className="truncate">{displayStudentNameOnSharedBoard(student, 'preferred_only')}</span>
                  </div>
                  <span className={cn('shrink-0 font-black', theme.accentClass)}>
                    {(student.lifetimePoints ?? student.points ?? 0).toLocaleString()} pts
                  </span>
                </div>
              ))}
              {topStudents.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>Points awarded will appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Hall of Fame: House Standings */}
        {enabledSet.has('houseStandings') && (
          <ModuleCard title="House Standings" icon={Star}>
            <div className="space-y-2.5">
              {topHouses.map((house) => {
                const pts = house.lifetimePoints ?? house.points ?? 0;
                const max = Math.max(1, topHouses[0]?.lifetimePoints ?? topHouses[0]?.points ?? 1);
                const pct = Math.round((pts / max) * 100);
                return (
                  <div key={house.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="truncate">{house.name}</span>
                      <span className={theme.accentClass}>{pts.toLocaleString()} pts</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-black/20 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', theme.badgeClass)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {topHouses.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>House rankings will appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Hall of Fame: Class Standings */}
        {enabledSet.has('classStandings') && (
          <ModuleCard title="Class Standings" icon={Users}>
            <div className="space-y-2">
              {classes.slice(0, 5).map((cls, i) => (
                <div key={cls.id} className="flex items-center justify-between text-xs font-bold">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={cn('flex h-5 w-5 items-center justify-center rounded-md font-black text-[10px]', theme.badgeClass)}>
                      {i + 1}
                    </span>
                    <span className="truncate">{cls.name}</span>
                  </div>
                  <span className={cn('shrink-0 font-semibold', theme.quietClass)}>Class</span>
                </div>
              ))}
              {classes.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>Classes will appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Bulletin: Celebration Posts Feed */}
        {enabledSet.has('celebrationPosts') && (
          <ModuleCard title="Live Celebrations" icon={Megaphone} className="md:col-span-2">
            <div className="space-y-2">
              {bulletinPosts.slice(0, 4).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 p-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-xl shrink-0">{post.emoji || '🎉'}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">{post.title || 'Celebration'}</p>
                      <p className={cn('text-[11px] font-medium truncate', theme.quietClass)}>
                        {post.message || ''}
                      </p>
                    </div>
                  </div>
                  {post.createdAt && (
                    <span className={cn('text-[10px] font-bold uppercase shrink-0', theme.quietClass)}>
                      {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
              {bulletinPosts.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>
                  Teacher shoutouts and praise posts will appear live here.
                </p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Bulletin: Point Opportunities (Incentives) */}
        {enabledSet.has('incentiveTasks') && (
          <ModuleCard title="Earn Points (Opportunities)" icon={Target}>
            <div className="space-y-2">
              {bulletinIncentives.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 p-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black truncate">{inc.title}</p>
                    {inc.description && (
                      <p className={cn('text-[10px] font-medium truncate', theme.quietClass)}>{inc.description}</p>
                    )}
                  </div>
                  <span className={cn('shrink-0 rounded-lg px-2 py-1 text-[10px] font-black', theme.badgeClass)}>
                    +{inc.points ?? 0} pts
                  </span>
                </div>
              ))}
              {bulletinIncentives.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>No active incentives scheduled.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Bulletin: Rewards to Chase */}
        {enabledSet.has('rewardsShowcase') && (
          <ModuleCard title="Rewards to Chase" icon={Gift}>
            <div className="space-y-2">
              {activePrizes.slice(0, 4).map((prize) => (
                <div key={prize.id} className="flex items-center justify-between gap-2 text-xs font-bold">
                  <span className="truncate">{prize.name}</span>
                  <span className={cn('shrink-0 font-black', theme.accentClass)}>
                    {Number(prize.points ?? 0).toLocaleString()} pts
                  </span>
                </div>
              ))}
              {activePrizes.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>In-stock shop rewards appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Daily Stats */}
        {enabledSet.has('schoolStats') && (
          <ModuleCard title="School Stats" icon={ChartNoAxesColumnIncreasing}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={cn('rounded-xl border p-2', theme.badgeClass)}>
                <p className="text-[10px] font-bold uppercase opacity-80">Scholars</p>
                <p className="text-base font-black">{students.length}</p>
              </div>
              <div className={cn('rounded-xl border p-2', theme.badgeClass)}>
                <p className="text-[10px] font-bold uppercase opacity-80">Points</p>
                <p className="text-base font-black">{totalPoints.toLocaleString()}</p>
              </div>
              <div className={cn('rounded-xl border p-2', theme.badgeClass)}>
                <p className="text-[10px] font-bold uppercase opacity-80">Rewards</p>
                <p className="text-base font-black">{activePrizes.length}</p>
              </div>
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Today's Schedule */}
        {enabledSet.has('daySchedule') && (
          <ModuleCard title="School is in Motion" icon={CalendarDays}>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-black">
              {['Arrive', 'Learn', 'Level Up'].map((step, idx) => (
                <div key={step} className={cn('rounded-xl border py-2.5', theme.badgeClass)}>
                  <p className="text-[10px] font-extrabold opacity-75">Step {idx + 1}</p>
                  <p className="mt-0.5">{step}</p>
                </div>
              ))}
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Compliment */}
        {enabledSet.has('compliment') && (
          <ModuleCard title="Daily Compliment" icon={Heart}>
            <p className="text-xs font-bold leading-relaxed">{compliment}</p>
          </ModuleCard>
        )}

        {/* Smart Screen: Focus Skill */}
        {enabledSet.has('focusSkill') && (
          <ModuleCard title="Focus Skill" icon={Lightbulb}>
            <p className="text-xs font-bold leading-relaxed">{focusSkill}</p>
          </ModuleCard>
        )}

        {/* Smart Screen: Quote */}
        {enabledSet.has('quote') && (
          <ModuleCard title="Growth Quote" icon={Sparkles}>
            <p className="text-xs font-bold italic leading-relaxed">"{quote}"</p>
          </ModuleCard>
        )}

        {/* Smart Screen: Birthdays */}
        {enabledSet.has('birthdays') && (
          <ModuleCard title="Happy Birthday!" icon={Cake}>
            <div className="space-y-1.5">
              {birthdayStudents.map((s) => (
                <div key={s.id} className="flex items-center gap-2 text-xs font-black">
                  <span>🎂</span>
                  <span className="truncate">{displayStudentNameOnSharedBoard(s, 'preferred_only')}</span>
                </div>
              ))}
              {birthdayStudents.length === 0 && (
                <p className={cn('text-xs font-semibold', theme.quietClass)}>
                  No birthdays today. Celebrating every scholar!
                </p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Hebrew Date & Holidays */}
        {enabledSet.has('hebrewCalendar') && isJewishOrthodox && (
          <ModuleCard title="Hebrew Calendar" icon={Star}>
            <div className="space-y-1 text-xs font-bold">
              <p>{formatTodayHebrewDate(now)}</p>
              {getUpcomingJewishHolidays({ from: now, limit: 2 }).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-[11px]">
                  <span>{h.nameEn}</span>
                  <span className={theme.quietClass}>{h.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </ModuleCard>
        )}
      </div>
    </div>
  );
}
