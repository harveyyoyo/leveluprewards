'use client';
import { useMemo } from 'react';
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
import { Button } from './ui/button';
import { useAppContext } from './AppProvider';
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
  () => import('./settings/SettingsModal').then(m => m.SettingsModal),
  { ssr: false },
);
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import Logo from './Logo';
import { portalHoverTextClass, portalTextClass, type PortalColorKey } from '@/lib/portalColors';
import { getLevelUpLogoHref } from '@/lib/appBranding';

export default function Header() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ schoolId?: string }>();
  const { loginState, schoolId: contextSchoolId, isInitialized, syncStatus, logout, isAdmin, userName, isKioskLocked } = useAppContext();
  const { settings } = useSettings();
  const playSound = useArcadeSound();
  const { firestore } = useFirebase();
  const schoolDocRef = useSchoolMetadataDocRef();

  const { data: schoolData } = useDoc<{ name: string; logoUrl?: string }>(schoolDocRef);
  const schoolId = contextSchoolId ?? params?.schoolId ?? null;
  const schoolName =
    schoolData?.name ||
    (schoolId ? schoolId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '');

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
    fullscreen && (pathname?.includes('/hall-of-fame') || pathname?.includes('/bulletin-board'));

  const handleLogout = () => {
    playSound('swoosh');
    logout();
  };

  const syncStatusDescription = useMemo(() => {
    switch (syncStatus) {
      case 'synced':
        return 'Firestore is connected and syncing in real time. (This is not the same as “production” vs localhost.)';
      case 'syncing':
        return 'Connecting to Firestore…';
      case 'offline':
        return 'Browser appears offline; data may not sync until you are back online.';
      case 'error':
        return 'Firestore sync error; check the browser console for details.';
      default:
        return `Connection status: ${syncStatus}`;
    }
  }, [syncStatus]);

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
      { id: 'admin', href: adminHref, icon: UserCog, label: 'Admin', color: 'destructive' },
      { id: 'print', href: `/${schoolId}/teacher`, icon: Printer, label: 'Teacher', color: 'chart-2' },
    ];
    items.push({
      id: 'redeem',
      href: `/${schoolId}/student`,
      icon: GraduationCap,
      label: 'Student',
      color: 'chart-1',
    });
    return items;
  }, [schoolId, isAdmin]);

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
        aria-label="Portal shortcuts"
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
                onClick={() => playSound('click')}
              >
                <Icon className="h-6 w-6" />
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    ) : null;

  if (isLoginPage || !isInitialized || isDeveloperMode || isFullscreenSpecialPage) {
    return null;
  }

  const centerLabel = schoolName;
  /** Portal lives only under `/{schoolId}/portal`; there is no app root `/portal` page. */
  const centerHref = schoolId ? `/${schoolId}/portal` : '/';
  const logoLink = getLevelUpLogoHref();
  const webHomeHref = schoolId ? centerHref : '/';
  const isDeveloperSupportSession = loginState === 'developer' && !!schoolId;
  const canLogout = loginState !== 'loggedOut' && loginState !== 'student';

  const paidProducts: string[] = [];
  if (settings.payRewards ?? true) paidProducts.push('Rewards');
  if (settings.payAttendance ?? true) paidProducts.push('Attendance');
  if (settings.payHomework ?? true) paidProducts.push('Homework');
  if (settings.payLibrary ?? true) paidProducts.push('Library');
  const paidProductsLabel = paidProducts.join(' • ');

  // --- APP MODE HEADER ---
  if (settings.displayMode === 'app') {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
        <header className="no-print relative flex w-full min-w-0 items-center justify-between z-20 pt-3 sm:pt-4 pb-3 sm:pb-4 border-b border-border/10 shadow-[0_4px_20px_hsl(var(--primary)/0.08)]">
          <div className="relative z-10 flex shrink-0 justify-start">
            {schoolId && (
              <Link
                href={centerHref}
                data-home-button="true"
                className="rounded-xl p-2 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all flex items-center gap-1"
                aria-label="Home"
              >
                <Home className="h-5 w-5 sm:h-6 sm:w-6" />
              </Link>
            )}
          </div>
          {schoolId && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 sm:px-24 md:px-32">
              <Link
                href={centerHref}
                className="pointer-events-auto flex w-full max-w-full flex-col items-center gap-1 text-center no-underline font-school font-black"
              >
                <span
                  className="w-full min-w-0 break-words text-foreground font-bold [overflow-wrap:anywhere] line-clamp-2 sm:line-clamp-3 text-[clamp(1.125rem,4.5vw,1.875rem)] sm:text-[clamp(1.25rem,5vw,2.25rem)]"
                  title={centerLabel}
                >
                  {centerLabel}
                </span>
              </Link>
            </div>
          )}
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-1 sm:gap-2">
            {schoolId && loginState !== 'loggedOut' && (
              <div
                className="flex h-8 w-6 items-center justify-center sm:h-9 sm:w-9"
                title={syncStatusDescription}
              >
                <span className="relative flex h-2.5 w-2.5">
                  {syncStatus === 'synced' && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />}
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
            )}
            {canLogout && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-slate-500 hover:bg-primary/10 hover:text-primary"
                aria-label={isDeveloperSupportSession ? 'End support session' : 'Sign out'}
                title={isDeveloperSupportSession ? 'End support session' : 'Sign out'}
                onClick={handleLogout}
              >
                {isDeveloperSupportSession ? <ArrowRightLeft className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              </Button>
            )}
            <SettingsModal />
          </div>
        </header>
        </div>

        {portalDockNav}
      </div>
    );
  }

  // --- WEB MODE HEADER ---
  return (
    <>
    <header className={cn(
      "no-print z-50 transition-colors border-b border-primary/10 sticky top-0",
      "bg-background/80 backdrop-blur-xl shadow-[0_4px_24px_hsl(var(--primary)/0.1)]",
      "mx-auto w-full max-w-7xl min-w-0 px-4 md:px-8"
    )}>
      <div className="relative h-20 min-w-0">
        {/* Left: Branding */}
        <div className="absolute inset-y-0 left-0 z-10 flex min-w-0 shrink-0 items-center gap-1 sm:gap-4">
          <div className={cn("items-center gap-1 sm:gap-4", schoolId ? "hidden sm:flex" : "flex")}>
            <Link href={logoLink} className="flex items-center gap-1 sm:gap-4 group" data-home-button="true">
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

        {/* Center: school name — absolutely centered in the full header width */}
        {schoolId ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-[clamp(5.5rem,24vw,20rem)] sm:px-[clamp(7rem,28vw,22rem)]">
            <Link href={centerHref} className="pointer-events-auto flex w-full max-w-full justify-center text-center no-underline">
              <span className="inline-flex max-w-full min-w-0 items-center justify-center gap-2 sm:gap-3">
                {schoolData?.logoUrl && (
                  <span className={cn(
                    "inline-flex h-10 w-auto max-w-[200px] shrink-0 items-center justify-center transition-all duration-300",
                    settings.logoDropShadow === 'sm' && 'drop-shadow-sm',
                    settings.logoDropShadow === 'md' && 'drop-shadow-md',
                    settings.logoDropShadow === 'lg' && 'drop-shadow-xl',
                    settings.logoDropShadow === 'none' && 'drop-shadow-none',
                  )}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={schoolData.logoUrl}
                      alt="Logo"
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
                )}
                <span
                  className="min-w-0 break-words text-center font-headline font-bold text-foreground [overflow-wrap:anywhere] line-clamp-2 text-[clamp(1rem,4.5vw,2.25rem)] sm:text-[clamp(1.25rem,5vw,2.75rem)] xl:text-[clamp(1.5rem,4vw,2.75rem)]"
                  title={centerLabel}
                >
                  {centerLabel}
                </span>
              </span>
            </Link>
          </div>
        ) : null}

        {/* Right: Actions */}
        <div className="absolute inset-y-0 right-0 z-10 flex shrink-0 items-center justify-end gap-1 sm:gap-2 min-w-0">
          {isInitialized && (
            <>
                <div
                  className={cn(
                    'flex items-center gap-1 px-1.5 sm:px-2.5 py-1 rounded-full shadow-sm shrink-0',
                    syncStatus === 'synced' && 'bg-emerald-500',
                    syncStatus === 'syncing' && 'bg-amber-500',
                    syncStatus === 'offline' && 'bg-red-600',
                    syncStatus === 'error' && 'bg-slate-600',
                  )}
                  title={syncStatusDescription}
                  role="status"
                  aria-live="polite"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    {syncStatus === 'synced' && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                    )}
                    {syncStatus === 'syncing' && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                    )}
                    <span
                      className={cn(
                        'relative inline-flex h-1.5 w-1.5 rounded-full',
                        syncStatus === 'synced' || syncStatus === 'offline'
                          ? 'bg-white'
                          : syncStatus === 'syncing'
                            ? 'bg-white animate-pulse'
                            : 'bg-slate-200',
                      )}
                    />
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white leading-none">
                    {syncStatus === 'synced' ? 'LIVE' : syncStatus}
                  </span>
                </div>

              {loginState !== 'student' && loginState !== 'loggedOut' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="font-bold gap-1 sm:gap-2 h-10 sm:h-12 px-2 sm:px-4 rounded-xl text-primary shrink-0">
                      <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      <span className="hidden sm:inline">
                        {userName || (loginState === 'admin' ? 'Admin' : loginState === 'teacher' ? 'Teacher' : 'School')}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 font-semibold" onClick={handleLogout}>
                      {isDeveloperSupportSession ? <ArrowRightLeft className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                      {isDeveloperSupportSession ? 'End support session' : 'Sign out'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="h-6 sm:h-8 w-px bg-primary/20 shrink-0" />

              <Link href={webHomeHref} data-home-button="true" className="rounded-xl p-2 sm:p-3 text-slate-500 hover:text-primary hover:bg-primary/10 transition-all active:scale-90 flex items-center gap-1 sm:gap-2 shrink-0">
                <Home className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden sm:inline font-bold">Home</span>
              </Link>

              <div className="h-6 sm:h-8 w-px bg-primary/20 shrink-0" />

              <SettingsModal />
            </>
          )}
        </div>
      </div>
    </header>
    {portalDockNav}
    </>
  );
}
