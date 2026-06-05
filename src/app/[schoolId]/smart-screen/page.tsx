'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { collection, query, limit } from 'firebase/firestore';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import type { Settings } from '@/components/providers/SettingsProvider';
import { useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import { displayStudentNameOnSharedBoard, cn } from '@/lib/utils';
import {
  SMART_SCREEN_THEME_CLASSES,
  validSmartScreenTheme,
  type SmartScreenTheme,
} from '@/lib/smartScreenThemes';
import type { Class, House, Prize, Student } from '@/lib/types';

type BulletinIncentive = {
  id: string;
  title: string;
  description?: string;
  points?: number;
  icon?: string;
  active?: boolean;
  createdAt?: number;
};

type SmartScreenLayout = 'mirror' | 'dashboard' | 'portrait';
type SmartScreenLocationInfo = {
  ok: boolean;
  source?: 'zip' | 'ip';
  locationName?: string;
  timeZone?: string;
  temperatureF?: number | null;
  condition?: string;
};

type SmartScreenScopedSettings = Pick<
  Settings,
  | 'smartScreenEnabled'
  | 'smartScreenTitle'
  | 'smartScreenMessage'
  | 'smartScreenTheme'
  | 'smartScreenLayout'
  | 'smartScreenLocationZip'
  | 'smartScreenWeatherLabel'
  | 'smartScreenWeatherTemp'
  | 'smartScreenShowWeather'
  | 'smartScreenShowStats'
  | 'smartScreenShowCompliments'
  | 'smartScreenShowFocus'
  | 'smartScreenShowQuote'
  | 'smartScreenShowLeaderboard'
  | 'smartScreenShowHouses'
  | 'smartScreenShowClasses'
  | 'smartScreenShowBirthdays'
  | 'smartScreenShowBulletin'
  | 'smartScreenShowRewards'
  | 'smartScreenShowSchedule'
>;

const VIEWER_LOGIN_STATES = new Set([
  'teacher',
  'admin',
  'school',
  'developer',
  'secretary',
  'prizeClerk',
  'reports',
  'librarian',
  'houseCoordinator',
]);

const SCHOOL_COMPLIMENTS = [
  'Your effort makes this school stronger.',
  'Thank you for choosing kindness today.',
  'You are growing every time you try again.',
  'Your good choices help others feel welcome.',
  'A calm reset is a strong choice.',
  'You bring something valuable to your class.',
  'Your focus today can become progress tomorrow.',
];

const LEARNING_QUOTES = [
  'Small steps count when you keep taking them.',
  'Mistakes are information. Use them and keep going.',
  'Practice turns hard things into familiar things.',
  'Good questions are a sign of strong thinking.',
  'Respect makes learning easier for everyone.',
  'The best time to start is the next right moment.',
  'Listen well, speak kindly, work honestly.',
];

const FOCUS_SKILLS = [
  'Pause, breathe once, then begin.',
  'Choose one task and give it your full attention.',
  'Ask for help early and listen to the answer.',
  'Use kind words, even when the work is hard.',
  'Check your work before you call it finished.',
  'Include someone who needs a place.',
  'Celebrate progress, then take the next step.',
];

function safeTimeZone(timeZone: string | undefined) {
  if (!timeZone) return undefined;
  try {
    Intl.DateTimeFormat(undefined, { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return undefined;
  }
}

function formatDate(now: Date, timeZone?: string) {
  return now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone,
  });
}

function formatTime(now: Date, timeZone?: string) {
  return now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  });
}

function hourInTimeZone(now: Date, timeZone?: string) {
  const value = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    hour12: false,
    timeZone,
  }).format(now);
  return Number(value) || now.getHours();
}

function timeGreeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function dayIndex(now: Date, length: number) {
  if (length <= 0) return 0;
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const day = Math.floor(diff / 86400000);
  return day % length;
}

function validLayout(value: string | null | undefined): SmartScreenLayout | null {
  return value === 'mirror' || value === 'dashboard' || value === 'portrait' ? value : null;
}

function birthdayMatchesToday(birthday: string | undefined, now: Date) {
  if (!birthday) return false;
  const parts = birthday.trim().split('-');
  if (parts.length < 3) return false;
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return parts[1] === mm && parts[2] === dd;
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
        'min-h-0 overflow-hidden rounded-2xl border shadow-xl',
        compact ? 'p-2.5' : 'p-4',
        theme.panel,
      )}
    >
      <div className={cn('flex items-center gap-2', compact ? 'mb-1.5' : 'mb-3')}>
        <span className={cn('shrink-0', theme.accent)}>{icon}</span>
        <p className={cn('truncate font-black', compact ? 'text-[11px]' : 'text-base')}>{title}</p>
      </div>
      {children}
    </div>
  );
}

export default function SmartScreenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginState, isInitialized, schoolId } = useAppContext();
  const { settings } = useSettings();
  const firestore = useFirestore();
  const [now, setNow] = useState(() => new Date());
  const [locationInfo, setLocationInfo] = useState<SmartScreenLocationInfo | null>(null);
  const queryZipOverride = (searchParams.get('zip') || '').trim();
  const screenProfileId = (searchParams.get('screenProfileId') || '').trim();
  const activeScreenProfile = screenProfileId ? settings.smartScreenProfiles?.[screenProfileId] : null;
  const activeProfileSettings = activeScreenProfile?.settings ?? {};
  const readScreenSetting = <K extends keyof SmartScreenScopedSettings>(key: K): SmartScreenScopedSettings[K] => {
    const profileValue = activeProfileSettings[key as keyof typeof activeProfileSettings];
    if (profileValue !== undefined) return profileValue as SmartScreenScopedSettings[K];
    return settings[key];
  };
  const configuredZip = (readScreenSetting('smartScreenLocationZip') || '').trim();

  const schoolDocRef = useSchoolMetadataDocRef();
  const { data: schoolMeta } = useDoc<{ logoUrl?: string; name?: string }>(schoolDocRef);

  const studentsQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'students'), limit(250)) : null),
    [firestore, schoolId],
  );
  const { data: students } = useCollection<Student>(studentsQuery);

  const classesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'classes'), limit(120)) : null),
    [firestore, schoolId],
  );
  const { data: classes } = useCollection<Class>(classesQuery);

  const housesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'houses'), limit(24)) : null),
    [firestore, schoolId],
  );
  const { data: houses } = useCollection<House>(housesQuery);

  const prizesQuery = useMemoFirebase(
    () => (schoolId ? query(collection(firestore, 'schools', schoolId, 'prizes'), limit(80)) : null),
    [firestore, schoolId],
  );
  const { data: prizes } = useCollection<Prize>(prizesQuery);

  const bulletinQuery = useMemoFirebase(
    () =>
      schoolId
        ? query(collection(firestore, 'schools', schoolId, 'bulletinBoardIncentives'), limit(40))
        : null,
    [firestore, schoolId],
  );
  const { data: bulletinItems } = useCollection<BulletinIncentive>(bulletinQuery);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const zip = (/^\d{5}$/.test(queryZipOverride) ? queryZipOverride : configuredZip || '').trim();

    const loadLocation = async () => {
      try {
        const params = new URLSearchParams();
        if (/^\d{5}$/.test(zip)) params.set('zip', zip);
        const response = await fetch(`/api/smart-screen/location?${params.toString()}`, {
          cache: 'no-store',
        });
        const data = (await response.json()) as SmartScreenLocationInfo;
        if (!cancelled) setLocationInfo(data);
      } catch {
        if (!cancelled) setLocationInfo({ ok: false });
      }
    };

    void loadLocation();
    const id = window.setInterval(loadLocation, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [configuredZip, queryZipOverride]);

  useEffect(() => {
    if (isInitialized && !VIEWER_LOGIN_STATES.has(loginState)) {
      router.replace('/login');
    }
  }, [isInitialized, loginState, router]);

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

  const themeKey =
    validSmartScreenTheme(searchParams.get('theme')) ||
    validSmartScreenTheme(readScreenSetting('smartScreenTheme')) ||
    'midnight';
  const theme = SMART_SCREEN_THEME_CLASSES[themeKey];

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-smart-screen-theme', themeKey);
    return () => root.removeAttribute('data-smart-screen-theme');
  }, [themeKey]);

  if (!isInitialized || !VIEWER_LOGIN_STATES.has(loginState)) {
    return <LoadingScreen label="Loading Smart Screen..." themeKey={themeKey} />;
  }

  const layout = validLayout(searchParams.get('layout')) || readScreenSetting('smartScreenLayout') || 'mirror';
  const isPortrait = layout === 'portrait';
  const isDashboard = layout === 'dashboard';
  const compact = isPortrait || isDashboard;
  const showWeather = readScreenSetting('smartScreenShowWeather') !== false;
  const showStats = readScreenSetting('smartScreenShowStats') !== false;
  const showCompliments = readScreenSetting('smartScreenShowCompliments') !== false;
  const showFocus = readScreenSetting('smartScreenShowFocus') !== false;
  const showQuote = readScreenSetting('smartScreenShowQuote') !== false;
  const showLeaderboard = readScreenSetting('smartScreenShowLeaderboard') !== false;
  const showHouses = readScreenSetting('smartScreenShowHouses') !== false;
  const showClasses = readScreenSetting('smartScreenShowClasses') !== false;
  const showBirthdays = readScreenSetting('smartScreenShowBirthdays') !== false;
  const showBulletin = readScreenSetting('smartScreenShowBulletin') !== false;
  const showRewards = readScreenSetting('smartScreenShowRewards') !== false;
  const showSchedule = readScreenSetting('smartScreenShowSchedule') !== false;
  const enabled = !!readScreenSetting('smartScreenEnabled');
  const schoolName =
    schoolMeta?.name ||
    (schoolId ? schoolId.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'School');
  const title = (readScreenSetting('smartScreenTitle') || 'Smart Screen').trim();
  const message = (readScreenSetting('smartScreenMessage') || 'Make today count.').trim();
  const weatherLabel = (readScreenSetting('smartScreenWeatherLabel') || 'Clear focus').trim();
  const weatherTemp = (readScreenSetting('smartScreenWeatherTemp') || '72').trim();
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

  const modules: ReactNode[] = [];

  if (showWeather) {
    modules.push(
      <ModuleCard key="weather" title="Weather" icon={<CloudSun className="h-5 w-5" />} theme={theme} compact={compact}>
        <p className={cn('truncate font-black', compact ? 'text-lg' : 'text-2xl')}>{displayWeatherLabel}</p>
        <p className={cn('mt-1 font-black leading-none', compact ? 'text-3xl' : 'text-5xl')}>
          {displayWeatherTemp}<span className={compact ? 'text-base' : 'text-2xl'}> deg</span>
        </p>
        <p className={cn('mt-1 truncate text-[10px] font-black uppercase tracking-wide', theme.quiet)}>
          {locationLabel} - {locationSource}
        </p>
      </ModuleCard>,
    );
  }

  if (showSchedule) {
    modules.push(
      <ModuleCard key="schedule" title="Today" icon={<CalendarDays className="h-5 w-5" />} theme={theme} compact={compact}>
        <p className={cn('font-black', compact ? 'text-sm' : 'text-lg')}>School is in motion</p>
        <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
          {['Arrive', 'Learn', 'Level up'].map((label) => (
            <div key={label} className={cn('rounded-xl border px-1.5 py-2 font-black', compact ? 'text-[10px]' : 'text-xs', theme.badge)}>
              {label}
            </div>
          ))}
        </div>
      </ModuleCard>,
    );
  }

  if (showCompliments) {
    modules.push(
      <ModuleCard key="compliment" title="Compliment" icon={<Heart className="h-5 w-5" />} theme={theme} compact={compact}>
        <p className={cn('font-black leading-snug', compact ? 'text-sm' : 'text-xl')}>{compliment}</p>
      </ModuleCard>,
    );
  }

  if (showFocus) {
    modules.push(
      <ModuleCard key="focus" title="Focus skill" icon={<Lightbulb className="h-5 w-5" />} theme={theme} compact={compact}>
        <p className={cn('font-black leading-snug', compact ? 'text-sm' : 'text-xl')}>{focusSkill}</p>
      </ModuleCard>,
    );
  }

  if (showQuote) {
    modules.push(
      <ModuleCard key="quote" title="Learning quote" icon={<Sparkles className="h-5 w-5" />} theme={theme} compact={compact}>
        <p className={cn('font-black leading-snug', compact ? 'text-sm' : 'text-xl')}>{learningQuote}</p>
      </ModuleCard>,
    );
  }

  if (showStats) {
    modules.push(
      <ModuleCard key="stats" title="School stats" icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />} theme={theme} compact={compact}>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          {[
            ['Students', studentCount.toLocaleString()],
            ['Points', totalPoints.toLocaleString()],
            ['Rewards', activePrizes.length.toLocaleString()],
          ].map(([label, value]) => (
            <div key={label} className={cn('rounded-xl border p-2', theme.badge)}>
              <p className="text-[9px] font-black uppercase opacity-75">{label}</p>
              <p className={cn('font-black', compact ? 'text-base' : 'text-2xl')}>{value}</p>
            </div>
          ))}
        </div>
      </ModuleCard>,
    );
  }

  if (showLeaderboard) {
    modules.push(
      <ModuleCard key="leaders" title="Top students" icon={<Trophy className="h-5 w-5" />} theme={theme} compact={compact}>
        <div className="space-y-1.5">
          {topStudents.slice(0, compact ? 3 : 5).map((student, index) => (
            <div key={student.id} className="flex items-center gap-2">
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black', theme.badge)}>
                {index + 1}
              </span>
              <span className={cn('min-w-0 flex-1 truncate font-black', compact ? 'text-xs' : 'text-sm')}>
                {displayStudentNameOnSharedBoard(
                  student,
                  settings.privacyStudentNameDisplayMode === 'preferred_only' ? 'preferred_only' : 'full',
                )}
              </span>
              <span className={cn('font-black', compact ? 'text-[11px]' : 'text-sm')}>
                {(student.lifetimePoints ?? student.points ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
          {topStudents.length === 0 ? <p className={cn('text-xs font-semibold', theme.quiet)}>Leaders appear after points are awarded.</p> : null}
        </div>
      </ModuleCard>,
    );
  }

  if (showHouses) {
    modules.push(
      <ModuleCard key="houses" title="House standings" icon={<Star className="h-5 w-5" />} theme={theme} compact={compact}>
        <div className="space-y-1.5">
          {topHouses.length > 0 ? (
            topHouses.map((house) => {
              const points = house.lifetimePoints ?? house.points ?? 0;
              return (
                <div key={house.id}>
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate font-black', compact ? 'text-xs' : 'text-sm')}>{house.name}</p>
                    <p className={cn('font-black', compact ? 'text-[11px]' : 'text-sm')}>{points.toLocaleString()}</p>
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
      <ModuleCard key="classes" title="Class spotlight" icon={<Users className="h-5 w-5" />} theme={theme} compact={compact}>
        {classSpotlight ? (
          <>
            <p className={cn('truncate font-black', compact ? 'text-lg' : 'text-2xl')}>{classSpotlight.name}</p>
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
      <ModuleCard key="birthdays" title="Birthdays" icon={<Cake className="h-5 w-5" />} theme={theme} compact={compact}>
        {birthdayStudents.length > 0 ? (
          <div className="space-y-1">
            {birthdayStudents.map((student) => (
              <p key={student.id} className={cn('truncate font-black', compact ? 'text-sm' : 'text-lg')}>
                {displayStudentNameOnSharedBoard(
                  student,
                  settings.privacyStudentNameDisplayMode === 'preferred_only' ? 'preferred_only' : 'full',
                )}
              </p>
            ))}
          </div>
        ) : (
          <p className={cn('font-black leading-snug', compact ? 'text-sm' : 'text-xl')}>Celebrate someone with kindness today.</p>
        )}
      </ModuleCard>,
    );
  }

  if (showBulletin) {
    modules.push(
      <ModuleCard key="bulletin" title="Bulletin" icon={<Megaphone className="h-5 w-5" />} theme={theme} compact={compact}>
        <div className="space-y-1.5">
          {activeBulletin.slice(0, compact ? 2 : 4).map((item) => (
            <div key={item.id} className="rounded-xl border border-current/10 px-2 py-1.5">
              <p className={cn('truncate font-black', compact ? 'text-xs' : 'text-sm')}>{item.title}</p>
              {item.description && !compact ? <p className={cn('mt-0.5 line-clamp-1 text-xs font-semibold', theme.quiet)}>{item.description}</p> : null}
            </div>
          ))}
          {activeBulletin.length === 0 ? <p className={cn('text-xs font-semibold', theme.quiet)}>Add bulletin items in Admin.</p> : null}
        </div>
      </ModuleCard>,
    );
  }

  if (showRewards) {
    modules.push(
      <ModuleCard key="rewards" title="Rewards to chase" icon={<Gift className="h-5 w-5" />} theme={theme} compact={compact}>
        <div className="grid grid-cols-1 gap-1.5">
          {activePrizes.slice(0, compact ? 3 : 4).map((prize) => (
            <div key={prize.id} className="flex items-center justify-between gap-2 rounded-xl border border-current/10 px-2 py-1.5">
              <p className={cn('truncate font-black', compact ? 'text-xs' : 'text-sm')}>{prize.name}</p>
              <p className={cn('shrink-0 font-black uppercase', compact ? 'text-[10px]' : 'text-xs', theme.accent)}>
                {prize.points.toLocaleString()} pts
              </p>
            </div>
          ))}
          {activePrizes.length === 0 ? <p className={cn('text-xs font-semibold', theme.quiet)}>In-stock rewards appear here.</p> : null}
        </div>
      </ModuleCard>,
    );
  }

  return (
    <main
      data-smart-screen-root
      className={cn(
          'min-h-dvh overflow-hidden font-sans',
        isPortrait ? 'p-2' : 'p-3 sm:p-5 lg:p-6',
        theme.page,
      )}
    >
      <div
        className={cn(
          'mx-auto grid w-full max-w-[1800px] overflow-hidden',
          isPortrait && 'max-w-none',
          isPortrait
            ? 'h-[calc(100dvh-1rem)] grid-rows-[minmax(0,0.9fr)_minmax(0,2.2fr)] gap-2'
            : isDashboard
              ? 'h-[calc(100dvh-1.5rem)] grid-rows-[minmax(160px,0.5fr)_minmax(0,1.5fr)] gap-3 sm:h-[calc(100dvh-2.5rem)] lg:h-[calc(100dvh-3rem)]'
              : 'h-[calc(100dvh-1.5rem)] grid-cols-1 gap-4 sm:h-[calc(100dvh-2.5rem)] lg:h-[calc(100dvh-3rem)] xl:grid-cols-[0.88fr_1.12fr]',
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
                  className={cn('shrink-0 rounded-2xl bg-white/80 object-contain p-1.5', isPortrait ? 'h-9 w-9' : 'h-12 w-12')}
                />
              ) : (
                <div className={cn('flex shrink-0 items-center justify-center rounded-2xl border', isPortrait ? 'h-9 w-9' : 'h-12 w-12', theme.badge)}>
                  <School className={isPortrait ? 'h-5 w-5' : 'h-6 w-6'} aria-hidden />
                </div>
              )}
              <div className="min-w-0">
                <p className={cn('truncate font-black uppercase tracking-wide', isPortrait ? 'text-[10px]' : 'text-sm', theme.quiet)}>
                  {schoolName}
                </p>
                <h1 className={cn('truncate font-black', isPortrait ? 'text-lg' : 'text-3xl')}>{title}</h1>
                {activeScreenProfile?.name ? (
                  <p className={cn('truncate font-bold uppercase tracking-[0.18em]', isPortrait ? 'text-[9px]' : 'text-[10px]', theme.quiet)}>
                    Screen version: {activeScreenProfile.name}
                  </p>
                ) : null}
              </div>
            </div>
            {!isPortrait ? (
              <div className={cn('rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide', theme.badge)}>
                Live
              </div>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <p className={cn('font-black uppercase tracking-wide', isPortrait ? 'mt-2 text-[10px]' : 'mb-3 mt-4 text-sm', theme.accent)}>
              {timeGreeting(currentHour)}
            </p>
            <p className={cn('font-black leading-none', isPortrait ? 'text-4xl' : compact ? 'text-6xl' : 'text-8xl')}>
              {formatTime(now, displayTimeZone)}
            </p>
            <p className={cn('mt-2 font-bold', isPortrait ? 'text-sm' : 'text-2xl', theme.quiet)}>
              {formatDate(now, displayTimeZone)}
            </p>
            <p className={cn('mt-3 max-w-4xl font-black leading-tight', isPortrait ? 'line-clamp-2 text-base' : compact ? 'line-clamp-2 text-2xl' : 'text-4xl')}>
              {message}
            </p>
          </div>
        </section>

        <section
          className={cn(
            'grid min-h-0 overflow-hidden',
            isPortrait
              ? 'grid-cols-2 grid-rows-6 gap-2'
              : isDashboard
                ? 'grid-cols-2 grid-rows-3 gap-3 xl:grid-cols-4 xl:grid-rows-3'
                : 'grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-2',
          )}
        >
          {modules}
        </section>
      </div>

      {!enabled && !isPortrait ? (
        <div className="fixed inset-x-4 bottom-4 mx-auto max-w-xl rounded-2xl border border-amber-300/40 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950 shadow-2xl">
          Smart Screen is currently off. Turn it on from Admin → Displays.
        </div>
      ) : null}

      {!isPortrait ? (
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
