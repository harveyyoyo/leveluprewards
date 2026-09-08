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
        'flex flex-col overflow-hidden rounded-3xl border-2 p-4 sm:p-5 shadow-2xl backdrop-blur-md transition-all',
        theme.cardClass,
        accentBorder && theme.heroBorderClass,
        cardCls,
      )}
    >
      <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-current/20 pb-3">
        <div className="flex items-center gap-2.5">
          <Icon className={cn('h-5 w-5 shrink-0', theme.accentClass)} />
          <h3 className={cn('text-sm sm:text-base font-black uppercase tracking-wider', theme.textClass)}>{title}</h3>
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
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          {schoolMeta?.logoUrl ? (
            <img
              src={schoolMeta.logoUrl}
              alt=""
              className="h-14 w-14 rounded-2xl bg-white/20 p-2 object-contain shadow-lg border-2 border-white/20"
            />
          ) : (
            <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl border-2 shadow-lg', theme.badgeClass)}>
              <School className="h-7 w-7" />
            </div>
          )}
          <div>
            <h1 className={cn('text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight', theme.textClass)}>{schoolTitle}</h1>
            <p className={cn('text-xs sm:text-sm font-bold mt-0.5', theme.quietClass)}>{schoolMessage}</p>
          </div>
        </div>

        {/* Integrated Weather & Clock Pill if enabled */}
        <div className="flex items-center gap-3">
          {enabledSet.has('weather') && (
            <div className={cn('flex items-center gap-2.5 rounded-2xl border-2 px-4 py-2.5 shadow-lg', theme.cardClass)}>
              <CloudSun className={cn('h-6 w-6', theme.accentClass)} />
              <div>
                <p className={cn('text-sm sm:text-base font-black leading-none', theme.textClass)}>
                  {locationInfo?.temperatureF ?? 72}°F
                </p>
                <p className={cn('text-xs font-bold leading-none mt-1', theme.quietClass)}>
                  {locationInfo?.condition || 'Clear'}
                </p>
              </div>
            </div>
          )}

          {enabledSet.has('clockDate') && (
            <div className={cn('flex items-center gap-3 rounded-2xl border-2 px-5 py-2.5 shadow-lg', theme.cardClass)}>
              <Clock className={cn('h-6 w-6', theme.accentClass)} />
              <div>
                <p className={cn('text-base sm:text-lg font-black tracking-wider leading-none', theme.textClass)}>{timeFormatted}</p>
                <p className={cn('text-xs font-bold leading-none mt-1', theme.quietClass)}>{dateFormatted}</p>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* School-wide Goal Progress Bar (if enabled) */}
      {enabledSet.has('schoolGoal') && activeGoal && (
        <div className={cn('mb-5 rounded-3xl border-2 p-4 sm:p-5 shadow-xl', theme.cardClass)}>
          <div className="flex items-center justify-between text-sm sm:text-base font-black mb-2">
            <span className={cn('flex items-center gap-2', theme.textClass)}>
              <Target className={cn('h-5 w-5', theme.accentClass)} />
              School Milestone: {activeGoal.title || 'Community Goal'}
            </span>
            <span className={cn('text-base font-black', theme.accentClass)}>
              {totalPoints.toLocaleString()} / {(activeGoal.targetPoints || 50000).toLocaleString()} pts
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-black/40 border border-white/20 overflow-hidden shadow-inner">
            <div
              className={cn('h-full transition-all duration-1000', theme.meterFillClass)}
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
          'grid gap-4 sm:gap-5 flex-1 min-h-0 overflow-hidden',
          isPortrait ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {/* Hall of Fame: Podium */}
        {enabledSet.has('podium') && (
          <ModuleCard title="Podium Leaders" icon={Crown} className="md:col-span-2 lg:col-span-2">
            <div className="flex h-full items-end justify-center gap-3 sm:gap-6 pt-7 pb-2">
              {/* 2nd Place */}
              <div className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-100 bg-slate-200 text-slate-900 font-black text-base mb-1.5 shadow-lg">
                  2
                </div>
                <p className={cn('text-sm sm:text-base font-black text-center truncate w-full', theme.textClass)}>
                  {secondPlace ? displayStudentNameOnSharedBoard(secondPlace, 'preferred_only') : 'Leading Scholar'}
                </p>
                <p className={cn('text-xs sm:text-sm font-black', theme.accentClass)}>
                  {(secondPlace?.lifetimePoints ?? secondPlace?.points ?? 1250).toLocaleString()} pts
                </p>
                <div className="mt-2 h-24 w-full rounded-t-2xl bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 border-t-4 border-white flex flex-col items-center justify-center font-black text-slate-900 shadow-xl text-sm">
                  <span>SILVER</span>
                  <span className="text-[10px] font-extrabold uppercase opacity-75">2nd Place</span>
                </div>
              </div>

              {/* 1st Place */}
              <div className="flex flex-col items-center flex-1 max-w-[160px]">
                <Crown className="h-8 w-8 text-amber-400 mb-1 animate-bounce drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]" />
                <div className="flex h-13 w-13 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-400 text-amber-950 font-black text-xl mb-1.5 shadow-xl shadow-amber-400/30">
                  1
                </div>
                <p className={cn('text-base sm:text-lg font-black text-center truncate w-full drop-shadow-sm', theme.textClass)}>
                  {firstPlace ? displayStudentNameOnSharedBoard(firstPlace, 'preferred_only') : 'Top Champion'}
                </p>
                <p className={cn('text-sm sm:text-base font-black', theme.accentClass)}>
                  {(firstPlace?.lifetimePoints ?? firstPlace?.points ?? 2400).toLocaleString()} pts
                </p>
                <div className="mt-2 h-36 w-full rounded-t-2xl bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 border-t-4 border-amber-200 flex flex-col items-center justify-center font-black text-amber-950 shadow-2xl text-base">
                  <span>GOLD</span>
                  <span className="text-xs font-extrabold uppercase opacity-85">1st Place</span>
                </div>
              </div>

              {/* 3rd Place */}
              <div className="flex flex-col items-center flex-1 max-w-[140px]">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-700 text-white font-black text-base mb-1.5 shadow-lg">
                  3
                </div>
                <p className={cn('text-sm sm:text-base font-black text-center truncate w-full', theme.textClass)}>
                  {thirdPlace ? displayStudentNameOnSharedBoard(thirdPlace, 'preferred_only') : 'Rising Star'}
                </p>
                <p className={cn('text-xs sm:text-sm font-black', theme.accentClass)}>
                  {(thirdPlace?.lifetimePoints ?? thirdPlace?.points ?? 980).toLocaleString()} pts
                </p>
                <div className="mt-2 h-18 w-full rounded-t-2xl bg-gradient-to-b from-amber-600 via-amber-700 to-amber-800 border-t-4 border-amber-400 flex flex-col items-center justify-center font-black text-amber-100 shadow-xl text-sm">
                  <span>BRONZE</span>
                  <span className="text-[10px] font-extrabold uppercase opacity-75">3rd Place</span>
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
                <div
                  key={student.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-current/15 bg-black/15 dark:bg-white/10 px-3.5 py-2.5 text-sm font-bold shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg font-black text-xs bg-white/20 text-current shadow-inner">
                      {idx + 1}
                    </span>
                    <span className={cn('truncate font-bold', theme.textClass)}>{displayStudentNameOnSharedBoard(student, 'preferred_only')}</span>
                  </div>
                  <span className={cn('shrink-0 font-black', theme.accentClass)}>
                    {(student.lifetimePoints ?? student.points ?? 0).toLocaleString()} pts
                  </span>
                </div>
              ))}
              {topStudents.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>Points awarded will appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Hall of Fame: House Standings */}
        {enabledSet.has('houseStandings') && (
          <ModuleCard title="House Standings" icon={Star}>
            <div className="space-y-3">
              {topHouses.map((house) => {
                const pts = house.lifetimePoints ?? house.points ?? 0;
                const max = Math.max(1, topHouses[0]?.lifetimePoints ?? topHouses[0]?.points ?? 1);
                const pct = Math.round((pts / max) * 100);
                return (
                  <div key={house.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm font-black">
                      <span className={cn('truncate', theme.textClass)}>{house.name}</span>
                      <span className={theme.accentClass}>{pts.toLocaleString()} pts</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-black/30 border border-white/15 overflow-hidden shadow-inner">
                      <div
                        className={cn('h-full rounded-full transition-all', theme.meterFillClass)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {topHouses.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>House rankings will appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Hall of Fame: Class Standings */}
        {enabledSet.has('classStandings') && (
          <ModuleCard title="Class Standings" icon={Users}>
            <div className="space-y-2">
              {classes.slice(0, 5).map((cls, i) => (
                <div
                  key={cls.id}
                  className="flex items-center justify-between text-sm font-bold rounded-2xl border border-current/15 bg-black/15 dark:bg-white/10 px-3.5 py-2.5 shadow-sm"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg font-black text-xs bg-white/20 text-current">
                      {i + 1}
                    </span>
                    <span className={cn('truncate', theme.textClass)}>{cls.name}</span>
                  </div>
                  <span className={cn('shrink-0 rounded-lg px-2 py-0.5 text-xs font-black bg-white/20', theme.quietClass)}>
                    Class
                  </span>
                </div>
              ))}
              {classes.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>Classes will appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Bulletin: Celebration Posts Feed */}
        {enabledSet.has('celebrationPosts') && (
          <ModuleCard title="Live Celebrations" icon={Megaphone} className="md:col-span-2">
            <div className="space-y-2.5">
              {bulletinPosts.slice(0, 4).map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between gap-3.5 rounded-2xl border-2 border-current/20 bg-black/15 dark:bg-white/10 p-3 shadow-md"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{post.emoji || '🎉'}</span>
                    <div className="min-w-0">
                      <p className={cn('text-sm font-black truncate', theme.textClass)}>{post.title || 'Celebration'}</p>
                      <p className={cn('text-xs font-semibold truncate mt-0.5', theme.quietClass)}>
                        {post.message || ''}
                      </p>
                    </div>
                  </div>
                  {post.createdAt && (
                    <span className={cn('text-xs font-black uppercase shrink-0 px-2 py-1 rounded-lg bg-white/15', theme.accentClass)}>
                      {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                </div>
              ))}
              {bulletinPosts.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>
                  Teacher shoutouts and praise posts will appear live here.
                </p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Bulletin: Point Opportunities (Incentives) */}
        {enabledSet.has('incentiveTasks') && (
          <ModuleCard title="Earn Points (Opportunities)" icon={Target}>
            <div className="space-y-2.5">
              {bulletinIncentives.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border-2 border-current/20 bg-black/15 dark:bg-white/10 p-3 shadow-md"
                >
                  <div className="min-w-0">
                    <p className={cn('text-sm font-black truncate', theme.textClass)}>{inc.title}</p>
                    {inc.description && (
                      <p className={cn('text-xs font-semibold truncate mt-0.5', theme.quietClass)}>{inc.description}</p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-xl px-2.5 py-1 text-xs font-black bg-emerald-500 text-emerald-950 shadow-sm">
                    +{inc.points ?? 0} pts
                  </span>
                </div>
              ))}
              {bulletinIncentives.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>No active incentives scheduled.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Bulletin: Rewards to Chase */}
        {enabledSet.has('rewardsShowcase') && (
          <ModuleCard title="Rewards to Chase" icon={Gift}>
            <div className="space-y-2">
              {activePrizes.slice(0, 4).map((prize) => (
                <div
                  key={prize.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-current/15 bg-black/15 dark:bg-white/10 px-3.5 py-2.5 text-sm font-bold shadow-sm"
                >
                  <span className={cn('truncate font-black', theme.textClass)}>{prize.name}</span>
                  <span className={cn('shrink-0 font-black', theme.accentClass)}>
                    {Number(prize.points ?? 0).toLocaleString()} pts
                  </span>
                </div>
              ))}
              {activePrizes.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>In-stock shop rewards appear here.</p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Daily Stats */}
        {enabledSet.has('schoolStats') && (
          <ModuleCard title="School Stats" icon={ChartNoAxesColumnIncreasing}>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className={cn('rounded-2xl border-2 p-3.5 shadow-lg flex flex-col justify-center', theme.statCardClass)}>
                <p className={cn('text-xs font-black uppercase tracking-wider', theme.quietClass)}>Scholars</p>
                <p className={cn('text-xl sm:text-2xl lg:text-3xl font-black mt-1', theme.textClass)}>{students.length}</p>
              </div>
              <div className={cn('rounded-2xl border-2 p-3.5 shadow-lg flex flex-col justify-center', theme.statCardClass)}>
                <p className={cn('text-xs font-black uppercase tracking-wider', theme.quietClass)}>Points</p>
                <p className={cn('text-xl sm:text-2xl lg:text-3xl font-black mt-1', theme.accentClass)}>
                  {totalPoints.toLocaleString()}
                </p>
              </div>
              <div className={cn('rounded-2xl border-2 p-3.5 shadow-lg flex flex-col justify-center', theme.statCardClass)}>
                <p className={cn('text-xs font-black uppercase tracking-wider', theme.quietClass)}>Rewards</p>
                <p className={cn('text-xl sm:text-2xl lg:text-3xl font-black mt-1', theme.textClass)}>{activePrizes.length}</p>
              </div>
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Today's Schedule */}
        {enabledSet.has('daySchedule') && (
          <ModuleCard title="School is in Motion" icon={CalendarDays}>
            <div className="grid grid-cols-3 gap-3 text-center text-xs font-black">
              {['Arrive', 'Learn', 'Level Up'].map((step, idx) => (
                <div key={step} className={cn('rounded-2xl border-2 py-3 px-2 shadow-md', theme.statCardClass)}>
                  <p className={cn('text-[11px] font-black uppercase', theme.accentClass)}>Step {idx + 1}</p>
                  <p className="text-sm font-black mt-1">{step}</p>
                </div>
              ))}
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Compliment */}
        {enabledSet.has('compliment') && (
          <ModuleCard title="Daily Compliment" icon={Heart}>
            <p className="text-sm sm:text-base font-bold leading-relaxed">{compliment}</p>
          </ModuleCard>
        )}

        {/* Smart Screen: Focus Skill */}
        {enabledSet.has('focusSkill') && (
          <ModuleCard title="Focus Skill" icon={Lightbulb}>
            <p className="text-sm sm:text-base font-bold leading-relaxed">{focusSkill}</p>
          </ModuleCard>
        )}

        {/* Smart Screen: Quote */}
        {enabledSet.has('quote') && (
          <ModuleCard title="Growth Quote" icon={Sparkles}>
            <p className="text-sm sm:text-base font-bold italic leading-relaxed">"{quote}"</p>
          </ModuleCard>
        )}

        {/* Smart Screen: Birthdays */}
        {enabledSet.has('birthdays') && (
          <ModuleCard title="Happy Birthday!" icon={Cake}>
            <div className="space-y-2">
              {birthdayStudents.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2.5 rounded-xl border border-current/15 bg-black/15 dark:bg-white/10 px-3 py-2 text-sm font-black"
                >
                  <span className="text-lg">🎂</span>
                  <span className="truncate">{displayStudentNameOnSharedBoard(s, 'preferred_only')}</span>
                </div>
              ))}
              {birthdayStudents.length === 0 && (
                <p className={cn('text-sm font-semibold', theme.quietClass)}>
                  No birthdays today. Celebrating every scholar!
                </p>
              )}
            </div>
          </ModuleCard>
        )}

        {/* Smart Screen: Hebrew Date & Holidays */}
        {enabledSet.has('hebrewCalendar') && isJewishOrthodox && (
          <ModuleCard title="Hebrew Calendar" icon={Star}>
            <div className="space-y-2 text-sm font-bold">
              <p className="text-base font-black">{formatTodayHebrewDate(now)}</p>
              {getUpcomingJewishHolidays({ from: now, limit: 2 }).map((h) => (
                <div key={h.id} className="flex items-center justify-between text-xs rounded-lg bg-black/15 dark:bg-white/10 p-2">
                  <span className="font-black">{h.nameEn}</span>
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


