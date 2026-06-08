'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
  LogOut,
  Home,
  User,
  GraduationCap,
  Printer,
  UserCog,
  ArrowRightLeft,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAppContext } from '../AppProvider';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import dynamic from 'next/dynamic';
// 120 KB modal — only fetched when the user actually opens settings.
const SettingsModal = dynamic(
  () => import('../settings/SettingsModal').then(m => m.SettingsModal),
  { ssr: false },
);
import { useSettings } from '@/components/providers/SettingsProvider';
import { isRewardsPillarOn } from '@/lib/productPillars';
import { cn } from '@/lib/utils';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import Logo from '../logos/Logo';
import { portalHoverTextClass, portalTextClass, type PortalColorKey } from '@/lib/portalColors';
import { getLevelUpLogoHref } from '@/lib/appBranding';
import { shouldHideGlobalAppChrome } from '@/lib/officeRouting';
import { useHeaderManagedShell } from '@/components/layout/HeaderChromeContext';
import {
  staffPortalGlobalHeaderClassName,
  staffPortalGlobalHeaderInnerClassName,
  staffPortalHeaderWrapClassName,
} from '@/components/staff/staffPortalNavStyles';
import { useStaffPortalLayoutMode } from '@/lib/staffPortal/useStaffPortalLayoutMode';
import { useTranslation } from '@/components/providers/LocaleProvider';

function schoolNameCacheKey(schoolId: string) {
  return `levelup_school_name_${schoolId.trim().toLowerCase()}`;
}

function readCachedSchoolName(schoolId: string | null): string | null {
  if (!schoolId || typeof window === 'undefined') return null;
  try {
    const value = sessionStorage.getItem(schoolNameCacheKey(schoolId));
    return value?.trim() || null;
  } catch {
    return null;
  }
}

function writeCachedSchoolName(schoolId: string, name: string) {
  try {
    sessionStorage.setItem(schoolNameCacheKey(schoolId), name.trim());
  } catch {
    // ignore quota / private mode
  }
}

function formatSchoolIdSlug(schoolId: string) {
  return schoolId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolId?: string }>();
  const { loginState, schoolId: contextSchoolId, isInitialized, syncStatus, logout, isAdmin, userName, isKioskLocked } = useAppContext();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const playSound = useArcadeSound();
  const { firestore } = useFirebase();
  const schoolDocRef = useSchoolMetadataDocRef();
  const headerManagedShell = useHeaderManagedShell();
  const { isWide: staffPortalWide } = useStaffPortalLayoutMode();

  const { data: schoolData, isLoading: isSchoolMetaLoading } = useDoc<{ name: string; logoUrl?: string }>(
    schoolDocRef,
  );
  const schoolId = contextSchoolId ?? params?.schoolId ?? null;
  const [cachedSchoolName, setCachedSchoolName] = useState<string | null>(() => readCachedSchoolName(schoolId));

  useEffect(() => {
    setCachedSchoolName(readCachedSchoolName(schoolId));
  }, [schoolId]);

  useEffect(() => {
    const name = schoolData?.name?.trim();
    if (!name || !schoolId) return;
    writeCachedSchoolName(schoolId, name);
    setCachedSchoolName(name);
  }, [schoolData?.name, schoolId]);

  const schoolName = useMemo(() => {
    const fromDoc = schoolData?.name?.trim();
    if (fromDoc) return fromDoc;
    // Avoid flashing the URL slug (e.g. "yty") while Firestore is still loading.
    if (isSchoolMetaLoading) return cachedSchoolName ?? '';
    if (cachedSchoolName) return cachedSchoolName;
    return schoolId ? formatSchoolIdSlug(schoolId) : '';
  }, [schoolData?.name, isSchoolMetaLoading, cachedSchoolName, schoolId]);

  const isSchoolNamePending = Boolean(schoolId && isSchoolMetaLoading && !schoolName.trim());

  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);

  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigDocRef);
  const appLogoUrl = appConfig?.appLogoUrl;

  const isLoginPage = pathname === '/' || pathname.startsWith('/s/');
  const isDeveloperMode = loginState === 'developer' && !schoolId;
  const fullscreen = searchParams?.get('fullscreen') === '1';
  const isFullscreenSpecialPage =
    fullscreen &&
    (pathname?.includes('/hall-of-fame') ||
      pathname?.includes('/bulletin-board') ||
      pathname?.includes('/smart-screen') ||
      pathname?.includes('/displays') ||
      pathname?.includes('/classroom'));

  const handleLogout = () => {
    playSound('swoosh');
    logout();
  };

  const syncStatusDescription = useMemo(() => {
    switch (syncStatus) {
      case 'synced':
        return t('header.sync.synced');
      case 'syncing':
        return t('header.sync.syncing');
      case 'offline':
        return t('header.sync.offline');
      case 'error':
        return t('header.sync.error');
      default:
        return `Connection status: ${syncStatus}`;
    }
  }, [syncStatus, t]);

  const portalDockItems = useMemo(() => {
    if (!schoolId) return [];
    const adminHref = isAdmin ? `/${schoolId}/admin` : `/${schoolId}/portal`;
    const items: Array<{
      id: 'admin' | 'print' | 'redeem';
      href: string;
      icon: typeof UserCog;
      label: string;
      color: 'destructive' | 'chart-2' | 'chart-1';
    }> = [
      { id: 'admin', href: adminHref, icon: UserCog, label: t('header.dock.admin'), color: 'destructive' },
      { id: 'print', href: `/${schoolId}/teacher`, icon: Printer, label: t('header.dock.teacher'), color: 'chart-2' },
    ];
    items.push({
      id: 'redeem',
      href: `/${schoolId}/student`,
      icon: GraduationCap,
      label: t('header.dock.student'),
      color: 'chart-1',
    });
    if (!isRewardsPillarOn(settings)) {
      return items.filter((item) => item.id !== 'redeem');
    }
    return items;
  }, [schoolId, isAdmin, settings, t]);

  const showPortalDock =
    !!schoolId && loginState !== 'loggedOut' && loginState !== 'student' && !isKioskLocked;

  const isPortalDockActive = (dockId: 'admin' | 'print' | 'redeem') => {
    if (!schoolId) return false;
    if (dockId === 'admin') {
      return (
        pathname.startsWith(`/${schoolId}/admin-sign-in`) ||
        pathname === `/${schoolId}/admin` ||
        pathname.startsWith(`/${schoolId}/admin/`)
      );
    }
    if (dockId === 'print') {
      return (
        pathname.startsWith(`/${schoolId}/teacher`) ||
        pathname.startsWith(`/${schoolId}/secretary`) ||
        pathname.startsWith(`/${schoolId}/reports`) ||
        pathname.startsWith(`/${schoolId}/prize-clerk`)
      );
    }
    return pathname.startsWith(`/${schoolId}/student`) || pathname.startsWith(`/${schoolId}/student-home`);
  };

  const colorClasses = portalTextClass;
  const hoverColorClasses = portalHoverTextClass;

  const portalDockNav =
    settings.displayMode === 'app' && showPortalDock && portalDockItems.length > 0 ? (
      <nav
        className={cn(
          'fixed bottom-0 left-0 right-0 z-[100] border-t py-3 pb-[max(1rem,env(safe-area-inset-bottom))] no-print',
          settings.darkMode
            ? 'border-border bg-background/90 shadow-[0_-8px_28px_hsl(222_47%_11%/0.35)] backdrop-blur-md'
            : 'border-border bg-card shadow-[0_-8px_28px_hsl(var(--primary)/0.1)]',
        )}
        aria-label={t('header.dock.shortcuts')}
      >
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {portalDockItems.map(({ id, href, icon: Icon, label, color }) => {
            const isActive = isPortalDockActive(id);
            const colorKey = color as PortalColorKey;
            const activeClass = isActive
              ? `scale-110 ${colorClasses[colorKey] || 'text-primary'}`
              : `text-slate-400 ${hoverColorClasses[colorKey] || 'hover:text-primary'}`;
            return (
              <Link
                key={id}
                href={href}
                className={cn('flex flex-col items-center px-3 py-1 transition-all', activeClass)}
                onClick={(e) => {
                  playSound('click');
                  if (id === 'redeem' && loginState === 'admin') {
                    e.preventDefault();
                    logout({ staffNavigateTo: 'student' });
                  }
                }}
              >
                <Icon className="h-6 w-6" />
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    ) : null;

  const host = typeof window !== 'undefined' ? window.location.host : '';
  if (shouldHideGlobalAppChrome(pathname, host)) {
    return null;
  }

  if (isLoginPage || !isInitialized || isDeveloperMode || isFullscreenSpecialPage) {
    return null;
  }

  const centerLabel = schoolName.trim();
  /** Portal lives only under `/{schoolId}/portal`; there is no app root `/portal` page. */
  const centerHref = schoolId ? `/${schoolId}/portal` : '/';
  const logoLink = getLevelUpLogoHref();
  const webHomeHref = schoolId ? centerHref : '/';
  const isDeveloperSupportSession = loginState === 'developer' && !!schoolId;
  const isSchoolGateSession = loginState === 'school' && !!schoolId;
  const canLogout =
    loginState !== 'loggedOut' && loginState !== 'student' && !isSchoolGateSession;

  const paidProducts: string[] = [];
  if (settings.payRewards ?? true) paidProducts.push(t('header.products.rewards'));
  if (settings.payClassroom ?? true) paidProducts.push(t('header.products.classroom'));
  if (settings.payAttendance ?? true) paidProducts.push(t('header.products.attendance'));
  if (settings.payHomework ?? true) paidProducts.push(t('header.products.homework'));
  if (settings.payLibrary ?? true) paidProducts.push(t('header.products.library'));
  const paidProductsLabel = paidProducts.join(' • ');
  const adminSideTabHeader =
    !!schoolId &&
    typeof pathname === 'string' &&
    new RegExp(`^/${schoolId}/(?:admin|teacher|secretary|reports|librarian)(?:/|$)`).test(pathname);

  const headerWrapClassName = adminSideTabHeader
    ? staffPortalHeaderWrapClassName(staffPortalWide)
    : 'mx-auto max-w-7xl px-4 md:px-8';

  /** Long school names wrap; header row must grow (fixed h-20 + absolute center caused top clipping). */
  const headerSchoolNameClass =
    'min-w-0 break-words font-headline font-bold text-foreground [overflow-wrap:anywhere] leading-tight line-clamp-2 sm:line-clamp-3 text-[clamp(0.9375rem,3.2vw,1.75rem)] sm:text-[clamp(1.0625rem,3.8vw,2.25rem)]';

  const syncStatusDot = (
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center"
      title={syncStatusDescription}
      role="status"
      aria-live="polite"
    >
      <span className="relative flex h-2.5 w-2.5">
        {syncStatus === 'synced' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
        )}
        {syncStatus === 'syncing' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
        )}
        <span
          className={cn(
            'relative inline-flex h-full w-full rounded-full',
            syncStatus === 'synced'
              ? 'bg-emerald-500'
              : syncStatus === 'syncing'
                ? 'bg-amber-400 animate-pulse'
                : syncStatus === 'offline'
                  ? 'bg-red-500'
                  : 'bg-slate-400',
          )}
        />
      </span>
    </div>
  );

  const schoolNameBlock = () => (
    <span
      className="inline-flex max-w-full min-w-0 flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-2.5"
    >
      {schoolData?.logoUrl && (
        <span
          className={cn(
            'inline-flex h-9 w-auto max-w-[96px] shrink-0 items-center justify-center sm:max-w-[120px]',
            settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
            settings.logoDropShadow === 'md' && 'drop-shadow-md',
            settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
            settings.logoDropShadow === 'none' && 'drop-shadow-none',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={schoolData.logoUrl}
            alt=""
            className={cn(
              'h-full w-auto object-contain',
              settings.logoDisplayMode === 'cover' && 'w-full object-cover',
              settings.logoBorderRadius === 'sm' && 'rounded-sm',
              settings.logoBorderRadius === 'md' && 'rounded-md',
              settings.logoBorderRadius === 'lg' && 'rounded-2xl',
              settings.logoBorderRadius === 'full' && 'rounded-full',
              settings.logoBorderRadius === 'none' && 'rounded-none',
            )}
          />
        </span>
      )}
      {isSchoolNamePending ? (
        <span
          className="inline-block h-[1.05em] w-[min(11rem,58vw)] max-w-full animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ) : (
        <span
          className={cn(headerSchoolNameClass, 'text-center')}
          title={centerLabel || undefined}
        >
          {centerLabel}
        </span>
      )}
    </span>
  );

  // --- APP MODE HEADER ---
  if (settings.displayMode === 'app') {
    return (
      <div id="levelup-global-app-header" className="w-full">
        <div className={cn('w-full min-w-0', headerWrapClassName)}>
        <header
          className={cn(
            'no-print relative z-20 grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2',
            adminSideTabHeader
              ? cn(
                  staffPortalGlobalHeaderClassName(),
                  staffPortalGlobalHeaderInnerClassName(),
                  'py-2 sm:py-3',
                )
              : cn(
                  'mb-2 rounded-b-2xl border border-border/10 border-t-0 bg-card/95 px-1 py-2 shadow-[0_4px_20px_hsl(var(--primary)/0.08)] backdrop-blur-md',
                  'sm:mb-3 sm:gap-x-3 sm:rounded-b-3xl sm:px-2 sm:py-3',
                ),
          )}
        >
          <div className="relative z-10 flex shrink-0 justify-start">
            {schoolId && (
              <Link
                href={centerHref}
                data-home-button="true"
                className="rounded-xl p-2 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
                aria-label={t('common.home')}
              >
                <Home className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            )}
          </div>
          {schoolId ? (
            <div
              className="pointer-events-none z-0 flex min-w-0 items-center justify-center px-2 sm:px-4"
            >
              {isSchoolNamePending ? (
                <span
                  className="inline-block h-[1.05em] w-[min(11rem,58vw)] max-w-full animate-pulse rounded-md bg-muted"
                  aria-hidden
                />
              ) : (
                <span
                  className={cn(
                    'w-full max-w-full text-center font-school font-black',
                    headerSchoolNameClass,
                  )}
                  title={centerLabel || undefined}
                >
                  {centerLabel}
                </span>
              )}
            </div>
          ) : (
            <div aria-hidden="true" />
          )}
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-0.5 sm:gap-1">
            {isInitialized ? syncStatusDot : null}

            {loginState !== 'student' && loginState !== 'loggedOut' && !isSchoolGateSession && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-xl text-primary"
                    aria-label={t('header.account.label')}
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('header.account.label')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 font-semibold" onClick={handleLogout}>
                    {isDeveloperSupportSession ? <ArrowRightLeft className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                    {isDeveloperSupportSession ? t('header.account.endSupportSession') : t('header.account.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {schoolId ? (
              <Link
                href={webHomeHref}
                data-home-button="true"
                className="rounded-xl p-2 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all active:scale-90 flex items-center shrink-0"
                aria-label={t('common.home')}
                title="Home"
              >
                <Home className="h-5 w-5" />
              </Link>
            ) : null}

            <SettingsModal />
          </div>
        </header>
        </div>

        {portalDockNav}
      </div>
    );
  }

  // --- WEB MODE HEADER (rounded bottom shell, same card shape as app mode) ---
  return (
    <>
    <div
      id="levelup-global-app-header"
      className={cn(
        'no-print z-50 w-full transition-colors',
        headerManagedShell ? 'relative' : 'sticky top-0',
      )}
    >
      <div className={cn('w-full min-w-0', headerWrapClassName)}>
        <header
          className={cn(
            'relative z-20 w-full min-w-0',
            adminSideTabHeader
              ? staffPortalGlobalHeaderClassName()
              : cn(
                  'mb-2 rounded-b-2xl border border-border/10 border-t-0 bg-card/95 shadow-[0_4px_20px_hsl(var(--primary)/0.08)] backdrop-blur-md',
                  'sm:mb-3 sm:rounded-b-3xl',
                ),
          )}
        >
      <div
        className={cn(
          'grid min-h-20 min-w-0 w-full grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] items-center gap-x-2 gap-y-1 px-3 py-2 sm:gap-x-3 sm:px-5 sm:py-3',
          adminSideTabHeader && staffPortalGlobalHeaderInnerClassName(),
        )}
      >
        {/* Left: Branding */}
        <div className="z-10 flex min-w-0 shrink-0 items-center justify-self-start gap-1 sm:gap-4">
          <div className={cn("items-center gap-1 sm:gap-4", schoolId ? "hidden sm:flex" : "flex")}>
            <Link href={logoLink} className="flex items-center gap-1 sm:gap-4 pl-0.5 group" data-home-button="true">
            {appLogoUrl ? (
              <span className={cn(
                "inline-flex h-10 w-auto max-w-[200px] shrink-0 items-center justify-center transition-all duration-300",
                settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
                settings.logoDropShadow === 'md' && 'drop-shadow-md',
                settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
                settings.logoDropShadow === 'none' && 'drop-shadow-none',
              )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={appLogoUrl} 
                  alt="App logo" 
                  className={cn(
                    "h-full w-auto object-contain transition-all duration-300",
                    settings.logoDisplayMode === 'cover' && 'w-full object-cover',
                    settings.logoBorderRadius === 'sm' && 'rounded-sm',
                    settings.logoBorderRadius === 'md' && 'rounded-md',
                    settings.logoBorderRadius === 'lg' && 'rounded-2xl',
                    settings.logoBorderRadius === 'full' && 'rounded-full',
                    settings.logoBorderRadius === 'none' && 'rounded-none',
                  )} 
                />
              </span>
            ) : (
              <Logo className="h-10 w-auto" />
            )}
            <div className="flex-col hidden sm:flex">
              <span className="text-lg font-black tracking-widest uppercase text-primary">levelUp EDU</span>
              {paidProductsLabel && (
                <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">{paidProductsLabel}</span>
              )}
            </div>
          </Link>
        </div>
        </div>

        {/* Center: school name — in document flow so multi-line names expand the header */}
        {schoolId ? (
          <div
            className="pointer-events-none z-0 flex min-w-0 items-center justify-center justify-self-center px-1 sm:px-2"
          >
            {schoolNameBlock()}
          </div>
        ) : (
          <div aria-hidden="true" />
        )}

        {/* Right: Actions */}
        <div className="z-10 flex min-w-0 shrink-0 items-center justify-end justify-self-end gap-0.5 sm:gap-1">
          {isInitialized ? syncStatusDot : null}

          {loginState !== 'student' && loginState !== 'loggedOut' && !isSchoolGateSession && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl text-primary"
                  aria-label="Account"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{t('header.account.label')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 font-semibold" onClick={handleLogout}>
                  {isDeveloperSupportSession ? <ArrowRightLeft className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                  {isDeveloperSupportSession ? 'End support session' : 'Sign out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {schoolId ? (
            <Link
              href={webHomeHref}
              data-home-button="true"
              className="rounded-xl p-2 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all active:scale-90 flex items-center shrink-0"
              aria-label="Home"
              title="Home"
            >
              <Home className="h-5 w-5" />
            </Link>
          ) : null}

          <SettingsModal />
        </div>
      </div>
        </header>
      </div>
    </div>
    {portalDockNav}
    </>
  );
}
