'use client';

import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  Cake,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CloudSun,
  Gift,
  Heart,
  Lightbulb,
  Loader2,
  Megaphone,
  Monitor,
  School,
  Sparkles,
  Star,
  Trophy,
  Users,
} from 'lucide-react';
import type { Settings } from '@/components/providers/SettingsProvider';
import { displayStudentNameOnSharedBoard, cn } from '@/lib/utils';
import {
  SMART_SCREEN_THEME_CLASSES,
  SMART_SCREEN_THEME_PAGE_META,
  resolveSmartScreenTheme,
  type SmartScreenTheme,
} from '@/lib/smartScreenThemes';
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
  timeGreeting,
} from '@/lib/smartScreen/smartScreenFormat';
import {
  type SmartScreenProfileSettingKey,
  type SmartScreenSettingsSnapshot,
  validSmartScreenLayout,
} from '@/lib/smartScreen/smartScreenSettings';
import type { BulletinIncentive, SmartScreenLocationInfo } from '@/hooks/useSmartScreenDisplayData';
import type { Class, House, Prize, Student } from '@/lib/types';
import { formatTodayHebrewDate, getUpcomingJewishHolidays } from '@/lib/hebrewCalendar';

export type SmartScreenDisplayVariant = 'fullscreen' | 'preview';
export type SmartScreenPreviewDensity = 'compact' | 'full';

export type SmartScreenDisplayProps = {
  schoolId: string;
  schoolSettings: Settings;
  screenSettings: SmartScreenSettingsSnapshot;
  screenProfileName?: string | null;
  variant?: SmartScreenDisplayVariant;
  /** Admin inline preview: `full` uses the real layout and typography; `compact` shrinks for thumbnails. */
  previewDensity?: SmartScreenPreviewDensity;
  now: Date;
  locationInfo: SmartScreenLocationInfo | null;
  schoolMeta?: { logoUrl?: string; name?: string } | null;
  students?: Student[] | null;
  classes?: Class[] | null;
  houses?: House[] | null;
  prizes?: Prize[] | null;
  bulletinItems?: BulletinIncentive[] | null;
  isJewishOrthodox?: boolean;
  loading?: boolean;
  loadingLabel?: string;
};

function readScreenSetting<K extends SmartScreenProfileSettingKey>(
  key: K,
  schoolSettings: Settings,
  screenSettings: SmartScreenSettingsSnapshot,
): Settings[K] {
  if (screenSettings[key] !== undefined) return screenSettings[key] as Settings[K];
  return schoolSettings[key];
}

function LoadingScreen({ label, themeKey }: { label: string; themeKey: SmartScreenTheme }) {
  const theme = SMART_SCREEN_THEME_CLASSES[themeKey];
  return (
    <div
      data-smart-screen-root
      className={cn(
        'flex min-h-dvh flex-col items-center justify-center gap-3 p-6',
        theme.page,
        theme.quiet,
      )}
    >
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      <p className="text-sm font-semibold">{label}</p>
    </div>
  );
}

function ModuleCard({
  title,
  icon,
  theme,
  compact,
  children,
}: {
  title: string;
  icon: ReactNode;
  theme: (typeof SMART_SCREEN_THEME_CLASSES)[SmartScreenTheme];
  compact: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-xl',
        compact ? 'p-2.5' : 'p-4',
        theme.panel,
      )}
    >
      <div className={cn('flex shrink-0 items-center gap-1.5', compact ? 'mb-1' : 'mb-3')}>
        <span className={cn('shrink-0', theme.accent)}>{icon}</span>
        <p className={cn('truncate font-black', compact ? 'text-[11px]' : 'text-base')}>{title}</p>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function SmartScreenDisplay({
  schoolId,
  schoolSettings,
  screenSettings,
  screenProfileName,
  variant = 'fullscreen',
  previewDensity = 'compact',
  now,
  locationInfo,
  schoolMeta,
  students,
  classes,
  houses,
  prizes,
  bulletinItems,
  isJewishOrthodox = false,
  loading = false,
  loadingLabel = 'Loading Smart Screen...',
}: SmartScreenDisplayProps) {
  const isPreview = variant === 'preview';
  const previewFull = isPreview && previewDensity === 'full';
  const previewCompact = isPreview && !previewFull;
  const themeKey = resolveSmartScreenTheme(readScreenSetting('smartScreenTheme', schoolSettings, screenSettings));
  const theme = SMART_SCREEN_THEME_CLASSES[themeKey];
  const themePageMeta = SMART_SCREEN_THEME_PAGE_META[themeKey];

  useEffect(() => {
    if (isPreview) return;
    const root = document.documentElement;
    root.setAttribute('data-smart-screen-theme', themeKey);
    root.style.setProperty('--smart-screen-page-bg', themePageMeta.pageBg);
    root.style.setProperty('--smart-screen-page-text', themePageMeta.pageText);
    root.style.setProperty('--smart-screen-color-scheme', themePageMeta.colorScheme);
    return () => {
      root.removeAttribute('data-smart-screen-theme');
      root.style.removeProperty('--smart-screen-page-bg');
      root.style.removeProperty('--smart-screen-page-text');
      root.style.removeProperty('--smart-screen-color-scheme');
    };
  }, [isPreview, themeKey, themePageMeta.colorScheme, themePageMeta.pageBg, themePageMeta.pageText]);

  const topStudents = useMemo(() => {
    return [...(students || [])]
      .sort((a, b) => (b.lifetimePoints ?? b.points ?? 0) - (a.lifetimePoints ?? a.points ?? 0))
      .slice(0, 5);
  }, [students]);

  const activePrizes = useMemo(() => {
    return [...(prizes || [])]
      .filter((prize) => prize.inStock !== false && (prize.stockCount ?? 1) > 0)
      .sort((a, b) => a.points - b.points)
      .slice(0, 4);
  }, [prizes]);

  const activeBulletin = useMemo(() => {
    return [...(bulletinItems || [])]
      .filter((item) => item.active !== false)
      .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 4);
  }, [bulletinItems]);

  const birthdayStudents = useMemo(() => {
    return (students || []).filter((student) => birthdayMatchesToday(student.birthday, now)).slice(0, 3);
  }, [students, now]);

  const classSpotlight = useMemo(() => {
    const allClasses = classes || [];
    if (allClasses.length === 0) return null;
    const counts = new Map<string, number>();
    (students || []).forEach((student) => {
      if (!student.classId) return;
      counts.set(student.classId, (counts.get(student.classId) || 0) + 1);
    });
    const sorted = [...allClasses].sort((a, b) => (counts.get(b.id) || 0) - (counts.get(a.id) || 0));
    return sorted[dayIndex(now, sorted.length)] || sorted[0];
  }, [classes, now, students]);

  const topHouses = useMemo(() => {
    return [...(houses || [])]
      .sort((a, b) => (b.lifetimePoints ?? b.points ?? 0) - (a.lifetimePoints ?? a.points ?? 0))
      .slice(0, 3);
  }, [houses]);

  if (loading) {
    return <LoadingScreen label={loadingLabel} themeKey={themeKey} />;
  }

  const layout = validSmartScreenLayout(readScreenSetting('smartScreenLayout', schoolSettings, screenSettings)) || 'mirror';
  const isPortrait = layout === 'portrait';
  const isDashboard = layout === 'dashboard';
  const isMirror = !isPortrait && !isDashboard;
  const compact = isPortrait || isDashboard || previewCompact;
  // Module cards are always space-constrained (many cards share a fixed-height panel),
  // so they use compact typography even in the large mirror layout where the hero stays big.
  const modulesCompact = compact || isMirror;
  const shellHeight = isPreview
    ? 'h-full'
    : 'h-[calc(100dvh-1.5rem)] sm:h-[calc(100dvh-2.5rem)] lg:h-[calc(100dvh-3rem)]';
  const showWeather = readScreenSetting('smartScreenShowWeather', schoolSettings, screenSettings) !== false;
  const showStats = readScreenSetting('smartScreenShowStats', schoolSettings, screenSettings) !== false;
  const showCompliments = readScreenSetting('smartScreenShowCompliments', schoolSettings, screenSettings) !== false;
  const showFocus = readScreenSetting('smartScreenShowFocus', schoolSettings, screenSettings) !== false;
  const showQuote = readScreenSetting('smartScreenShowQuote', schoolSettings, screenSettings) !== false;
  const showLeaderboard = readScreenSetting('smartScreenShowLeaderboard', schoolSettings, screenSettings) !== false;
  const showHouses = readScreenSetting('smartScreenShowHouses', schoolSettings, screenSettings) !== false;
  const showClasses = readScreenSetting('smartScreenShowClasses', schoolSettings, screenSettings) !== false;
  const showBirthdays = readScreenSetting('smartScreenShowBirthdays', schoolSettings, screenSettings) !== false;
  const showBulletin = readScreenSetting('smartScreenShowBulletin', schoolSettings, screenSettings) !== false;
  const showRewards = readScreenSetting('smartScreenShowRewards', schoolSettings, screenSettings) !== false;
  const showSchedule = readScreenSetting('smartScreenShowSchedule', schoolSettings, screenSettings) !== false;
  const showHebrewDate = isJewishOrthodox && readScreenSetting('smartScreenShowHebrewDate', schoolSettings, screenSettings) === true;
  const showJewishHolidays =
    isJewishOrthodox && readScreenSetting('smartScreenShowJewishHolidays', schoolSettings, screenSettings) === true;
  const enabled = !!readScreenSetting('smartScreenEnabled', schoolSettings, screenSettings);
  const hebrewDateLabel = formatTodayHebrewDate(now);
  const upcomingHolidays = showJewishHolidays
    ? getUpcomingJewishHolidays({ from: now, limit: compact ? 2 : 4 })
    : [];
  const schoolName =
    schoolMeta?.name ||
    (schoolId ? schoolId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'School');
  const title = (readScreenSetting('smartScreenTitle', schoolSettings, screenSettings) || 'Smart Screen').trim();
  const message = (readScreenSetting('smartScreenMessage', schoolSettings, screenSettings) || 'Make today count.').trim();
  const weatherLabel = (readScreenSetting('smartScreenWeatherLabel', schoolSettings, screenSettings) || 'Clear focus').trim();
  const weatherTemp = (readScreenSetting('smartScreenWeatherTemp', schoolSettings, screenSettings) || '72').trim();
  const displayTimeZone =
    safeTimeZone(locationInfo?.timeZone) || safeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const displayWeatherLabel = locationInfo?.ok && locationInfo.condition ? locationInfo.condition : weatherLabel;
  const displayWeatherTemp =
    locationInfo?.ok && typeof locationInfo.temperatureF === 'number'
      ? String(locationInfo.temperatureF)
      : weatherTemp;
  const locationLabel = locationInfo?.ok && locationInfo.locationName ? locationInfo.locationName : 'Local display';
  const locationSource = locationInfo?.ok
    ? locationInfo.source === 'zip'
      ? 'ZIP override'
      : 'IP location'
    : 'Fallback';
  const currentHour = hourInTimeZone(now, displayTimeZone);
  const totalPoints = (students || []).reduce((sum, student) => sum + (student.points || 0), 0);
  const studentCount = students?.length || 0;
  const compliment = SCHOOL_COMPLIMENTS[dayIndex(now, SCHOOL_COMPLIMENTS.length)];
  const learningQuote = LEARNING_QUOTES[dayIndex(now, LEARNING_QUOTES.length)];
  const focusSkill = FOCUS_SKILLS[dayIndex(now, FOCUS_SKILLS.length)];
  const maxHousePoints = Math.max(1, topHouses[0]?.lifetimePoints ?? topHouses[0]?.points ?? 1);
  const classCount = classSpotlight
    ? (students || []).filter((student) => student.classId === classSpotlight.id).length
    : 0;
  const privacyMode =
    schoolSettings.privacyStudentNameDisplayMode === 'preferred_only' ? 'preferred_only' : 'full';

  const rootStyle = {
    ...(isPreview
      ? {
          backgroundColor: themePageMeta.pageBg,
          color: themePageMeta.pageText,
          colorScheme: themePageMeta.colorScheme,
        }
      : {}),
  } as CSSProperties;

  const modules: ReactNode[] = [];

  if (showWeather) {
    modules.push(
      <ModuleCard key="weather" title="Weather" icon={<CloudSun className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <p className={cn('truncate font-black', modulesCompact ? 'text-lg' : 'text-2xl')}>{displayWeatherLabel}</p>
        <p className={cn('mt-1 font-black leading-none', modulesCompact ? 'text-3xl' : 'text-5xl')}>
          {displayWeatherTemp}
          <span className={modulesCompact ? 'text-base' : 'text-2xl'}> deg</span>
        </p>
        {!modulesCompact ? (
          <p className={cn('mt-1 truncate text-[10px] font-black uppercase tracking-wide', theme.quiet)}>
            {locationLabel} - {locationSource}
          </p>
        ) : null}
      </ModuleCard>,
    );
  }

  if (showSchedule) {
    modules.push(
      <ModuleCard key="schedule" title="Today" icon={<CalendarDays className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <p className={cn('font-black', modulesCompact ? 'text-sm' : 'text-lg')}>School is in motion</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {['Arrive', 'Learn', 'Level up'].map((label) => (
            <div
              key={label}
              className={cn('rounded-xl border px-1.5 py-2 font-black', modulesCompact ? 'text-[10px]' : 'text-xs', theme.badge)}
            >
              {label}
            </div>
          ))}
        </div>
      </ModuleCard>,
    );
  }

  if (showJewishHolidays && upcomingHolidays.length > 0) {
    modules.push(
      <ModuleCard key="holidays" title="Jewish holidays" icon={<Star className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <div className="space-y-1.5">
          {upcomingHolidays.map((holiday) => (
            <div key={holiday.id} className="rounded-xl border border-current/10 px-2 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn('truncate font-black', modulesCompact ? 'text-xs' : 'text-sm')}>{holiday.nameEn}</p>
                  <p
                    className={cn('truncate font-semibold', modulesCompact ? 'text-[10px]' : 'text-xs', theme.quiet)}
                    dir="rtl"
                    lang="he"
                  >
                    {holiday.nameHe}
                  </p>
                </div>
                <p className={cn('shrink-0 font-black uppercase', modulesCompact ? 'text-[9px]' : 'text-[10px]', theme.quiet)}>
                  {holiday.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ModuleCard>,
    );
  }

  if (showCompliments) {
    modules.push(
      <ModuleCard key="compliment" title="Compliment" icon={<Heart className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <p className={cn('font-black leading-snug', modulesCompact ? 'text-sm' : 'text-xl')}>{compliment}</p>
      </ModuleCard>,
    );
  }

  if (showFocus) {
    modules.push(
      <ModuleCard key="focus" title="Focus skill" icon={<Lightbulb className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <p className={cn('font-black leading-snug', modulesCompact ? 'text-sm' : 'text-xl')}>{focusSkill}</p>
      </ModuleCard>,
    );
  }

  if (showQuote) {
    modules.push(
      <ModuleCard key="quote" title="Learning quote" icon={<Sparkles className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <p className={cn('font-black leading-snug', modulesCompact ? 'text-sm' : 'text-xl')}>{learningQuote}</p>
      </ModuleCard>,
    );
  }

  if (showStats) {
    modules.push(
      <ModuleCard
        key="stats"
        title="School stats"
        icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />}
        theme={theme}
        compact={modulesCompact}
      >
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            ['Students', studentCount.toLocaleString()],
            ['Points', totalPoints.toLocaleString()],
            ['Rewards', activePrizes.length.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className={cn('rounded-xl border p-2', theme.badge)}>
              <p className="text-[9px] font-black uppercase opacity-75">{label}</p>
              <p className={cn('font-black', modulesCompact ? 'text-base' : 'text-2xl')}>{value}</p>
            </div>
          ))}
        </div>
      </ModuleCard>,
    );
  }

  if (showLeaderboard) {
    modules.push(
      <ModuleCard key="leaders" title="Top students" icon={<Trophy className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <div className="space-y-1.5">
          {topStudents.slice(0, modulesCompact ? 3 : 5).map((student, index) => (
            <div key={student.id} className="flex items-center gap-2">
              <span
                className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black', theme.badge)}
              >
                {index + 1}
              </span>
              <span className={cn('min-w-0 flex-1 truncate font-black', modulesCompact ? 'text-xs' : 'text-sm')}>
                {displayStudentNameOnSharedBoard(student, privacyMode)}
              </span>
              <span className={cn('font-black', modulesCompact ? 'text-[11px]' : 'text-sm')}>
                {(student.lifetimePoints ?? student.points ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
          {topStudents.length === 0 ? (
            <p className={cn('text-xs font-semibold', theme.quiet)}>Leaders appear after points are awarded.</p>
          ) : null}
        </div>
      </ModuleCard>,
    );
  }

  if (showHouses) {
    modules.push(
      <ModuleCard key="houses" title="House standings" icon={<Star className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <div className="space-y-1.5">
          {topHouses.length > 0 ? (
            topHouses.map((house) => {
              const points = house.lifetimePoints ?? house.points ?? 0;
              return (
                <div key={house.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate font-black', modulesCompact ? 'text-xs' : 'text-sm')}>{house.name}</p>
                    <p className={cn('font-black', modulesCompact ? 'text-[11px]' : 'text-sm')}>{points.toLocaleString()}</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-current/12">
                    <div
                      className={cn('h-full rounded-full', theme.rail)}
                      style={{ width: `${Math.max(10, Math.min(100, (points / maxHousePoints) * 100))}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <p className={cn('text-xs font-semibold', theme.quiet)}>House standings appear when houses are set up.</p>
          )}
        </div>
      </ModuleCard>,
    );
  }

  if (showClasses) {
    modules.push(
      <ModuleCard key="classes" title="Class spotlight" icon={<Users className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        {classSpotlight ? (
          <>
            <p className={cn('truncate font-black', modulesCompact ? 'text-lg' : 'text-2xl')}>{classSpotlight.name}</p>
            <p className={cn('mt-1 text-sm font-semibold', theme.quiet)}>
              {classCount > 0 ? `${classCount} students learning today` : 'Ready for a strong day'}
            </p>
          </>
        ) : (
          <p className={cn('text-xs font-semibold', theme.quiet)}>Classes appear after setup.</p>
        )}
      </ModuleCard>,
    );
  }

  if (showBirthdays) {
    modules.push(
      <ModuleCard key="birthdays" title="Birthdays" icon={<Cake className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        {birthdayStudents.length > 0 ? (
          <div className="space-y-1">
            {birthdayStudents.map((student) => (
              <p key={student.id} className={cn('truncate font-black', modulesCompact ? 'text-sm' : 'text-lg')}>
                {displayStudentNameOnSharedBoard(student, privacyMode)}
              </p>
            ))}
          </div>
        ) : (
          <p className={cn('font-black leading-snug', modulesCompact ? 'text-sm' : 'text-xl')}>
            Celebrate someone with kindness today.
          </p>
        )}
      </ModuleCard>,
    );
  }

  if (showBulletin) {
    modules.push(
      <ModuleCard key="bulletin" title="Bulletin" icon={<Megaphone className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <div className="space-y-1.5">
          {activeBulletin.slice(0, modulesCompact ? 2 : 4).map((item) => (
            <div key={item.id} className="rounded-xl border border-current/10 px-2 py-1.5">
              <p className={cn('truncate font-black', modulesCompact ? 'text-xs' : 'text-sm')}>{item.title}</p>
              {item.description && !modulesCompact ? (
                <p className={cn('mt-0.5 line-clamp-1 text-xs font-semibold', theme.quiet)}>{item.description}</p>
              ) : null}
            </div>
          ))}
          {activeBulletin.length === 0 ? (
            <p className={cn('text-xs font-semibold', theme.quiet)}>Add bulletin items in Admin.</p>
          ) : null}
        </div>
      </ModuleCard>,
    );
  }

  if (showRewards) {
    modules.push(
      <ModuleCard key="rewards" title="Rewards to chase" icon={<Gift className="h-5 w-5" />} theme={theme} compact={modulesCompact}>
        <div className="grid grid-cols-1 gap-1.5">
          {activePrizes.slice(0, modulesCompact ? 3 : 4).map((prize) => (
            <div
              key={prize.id}
              className="flex items-center justify-between gap-2 rounded-xl border border-current/10 px-2 py-1.5"
            >
              <p className={cn('truncate font-black', modulesCompact ? 'text-xs' : 'text-sm')}>{prize.name}</p>
              <p className={cn('shrink-0 font-black uppercase', modulesCompact ? 'text-[10px]' : 'text-xs', theme.accent)}>
                {prize.points.toLocaleString()} pts
              </p>
            </div>
          ))}
          {activePrizes.length === 0 ? (
            <p className={cn('text-xs font-semibold', theme.quiet)}>In-stock rewards appear here.</p>
          ) : null}
        </div>
      </ModuleCard>,
    );
  }

  return (
    <main
      data-smart-screen-root
      data-smart-screen-theme={themeKey}
      style={rootStyle}
      className={cn(
        'overflow-hidden font-sans',
        isPreview ? 'h-full w-full' : 'min-h-dvh',
        isPortrait ? 'p-2' : 'p-3 sm:p-5 lg:p-6',
        theme.page,
      )}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-[1800px] overflow-hidden',
          isPortrait && 'max-w-none',
          previewCompact && 'h-full grid-rows-[minmax(120px,0.45fr)_minmax(0,1.55fr)] gap-2',
          !previewCompact && isPortrait && cn(shellHeight, 'grid-rows-[minmax(0,0.88fr)_minmax(0,2.12fr)] gap-2'),
          !previewCompact && isDashboard && cn(shellHeight, 'grid-rows-[minmax(150px,0.42fr)_minmax(0,1.58fr)] gap-2 sm:gap-3'),
          !previewCompact && isMirror && cn(shellHeight, 'grid-cols-[2fr_3fr] gap-2 sm:gap-3'),
        )}
      >
        <section
          className={cn(
            'flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-2xl',
            isPortrait ? 'p-3' : compact ? 'p-5' : 'rounded-[2rem] p-7',
            theme.panel,
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {schoolMeta?.logoUrl ? (
                <img
                  src={schoolMeta.logoUrl}
                  alt=""
                  className={cn(
                    'shrink-0 rounded-2xl bg-white/80 object-contain p-1.5',
                    isPortrait || previewCompact ? 'h-9 w-9' : 'h-12 w-12',
                  )}
                />
              ) : (
                <div
                  className={cn(
                    'flex shrink-0 items-center justify-center rounded-2xl border',
                    isPortrait || previewCompact ? 'h-9 w-9' : 'h-12 w-12',
                    theme.badge,
                  )}
                >
                  <School className={isPortrait || previewCompact ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden />
                </div>
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    'truncate font-black uppercase tracking-wide',
                    isPortrait || previewCompact ? 'text-[10px]' : 'text-sm',
                    theme.quiet,
                  )}
                >
                  {schoolName}
                </p>
                <h1 className={cn('truncate font-black', isPortrait || previewCompact ? 'text-lg' : 'text-3xl')}>{title}</h1>
                {screenProfileName ? (
                  <p
                    className={cn(
                      'truncate font-bold uppercase tracking-[0.18em]',
                      isPortrait || previewCompact ? 'text-[9px]' : 'text-[10px]',
                      theme.quiet,
                    )}
                  >
                    Screen version: {screenProfileName}
                  </p>
                ) : null}
              </div>
            </div>
            {!isPortrait ? (
              <div className={cn('rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide', theme.badge)}>
                {isPreview ? 'Preview' : 'Live'}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex flex-1 flex-col justify-center">
              <p
                className={cn(
                  'font-black uppercase tracking-wide',
                  isPortrait || previewCompact ? 'mt-2 text-[10px]' : 'mb-2 mt-2 text-sm',
                  theme.accent,
                )}
              >
                {timeGreeting(currentHour)}
              </p>
              <p className={cn('font-black leading-none', isPortrait || previewCompact ? 'text-4xl' : compact ? 'text-6xl' : 'text-8xl')}>
                {formatSmartScreenTime(now, displayTimeZone)}
              </p>
              <p className={cn('mt-2 font-bold', isPortrait || previewCompact ? 'text-sm' : 'text-2xl', theme.quiet)}>
                {formatSmartScreenDate(now, displayTimeZone)}
              </p>
            </div>
            <div className={cn('mt-auto flex items-end justify-between gap-3 pt-3', isMirror && !previewCompact && 'pb-1')}>
              <p
                className={cn(
                  'min-w-0 font-black leading-tight',
                  isPortrait || previewCompact
                    ? 'line-clamp-2 text-base'
                    : compact
                      ? 'line-clamp-2 text-2xl'
                      : 'text-3xl sm:text-4xl',
                )}
              >
                {message}
              </p>
              {showHebrewDate ? (
                <p
                  className={cn(
                    'shrink-0 font-black text-amber-700 dark:text-amber-200',
                    isPortrait || previewCompact ? 'text-sm' : 'text-lg sm:text-xl',
                  )}
                  dir="rtl"
                  lang="he"
                >
                  {hebrewDateLabel}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section
          className={cn(
            'grid min-h-0 overflow-hidden',
            isPortrait && 'grid-cols-2 grid-rows-6 gap-2',
            (isDashboard || (previewCompact && !isPortrait)) &&
              'grid-cols-2 grid-rows-3 gap-2 sm:gap-3 lg:grid-cols-4 lg:grid-rows-3',
            isMirror && !previewCompact && 'grid-cols-2 gap-2 sm:gap-3 [grid-auto-rows:minmax(0,1fr)]',
          )}
        >
          {modules}
        </section>
      </div>

      {!enabled && !isPortrait ? (
        <div
          className={cn(
            'rounded-2xl border border-amber-300/40 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950 shadow-2xl',
            isPreview ? 'absolute inset-x-3 bottom-3' : 'fixed inset-x-4 bottom-4 mx-auto max-w-xl',
          )}
        >
          Smart Screen is currently off. Turn it on from Admin → Displays.
        </div>
      ) : null}

      {!isPortrait && !isPreview ? (
        <div
          className={cn(
            'pointer-events-none fixed bottom-5 right-5 hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase tracking-wide backdrop-blur-md md:flex',
            theme.watermark,
          )}
        >
          <Monitor className="h-4 w-4" aria-hidden />
          <span>Smart Screen</span>
        </div>
      ) : null}
    </main>
  );
}
