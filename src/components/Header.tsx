
'use client';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
  Trophy,
  Zap,
  LogOut,
  Home,
  User,
  GraduationCap,
  Printer,
  ShoppingBag,
  UserCog,
  ArrowRightLeft,
  Megaphone,
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
  () => import('./ui/SettingsModal').then(m => m.SettingsModal),
  { ssr: false },
);
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { useSchoolMetadataDocRef } from '@/hooks/useSchoolMetadataDocRef';
import Logo from './Logo';
import { portalHoverTextClass, portalTextClass, type PortalColorKey } from '@/lib/portalColors';
import { AdminLoginButton } from './AdminLoginButton';
import { getLevelUpLogoHref } from '@/lib/app-branding';


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
    fullscreen && (pathname?.includes('/halloffame') || pathname?.includes('/bulletin-board'));

  const handleLogout = () => {
    playSound('swoosh');
    logout();
  };

  if (isLoginPage || !isInitialized || isDeveloperMode || isFullscreenSpecialPage) {
    return null;
  }

  const logoLink = schoolId ? `/login?school=${encodeURIComponent(schoolId)}` : getLevelUpLogoHref();
  const centerLabel = schoolName;
  const centerHref = schoolId ? `/${schoolId}/portal` : '/portal';
  const webHomeHref = schoolId ? centerHref : '/';
  const isStaff =
    loginState === 'teacher' ||
    loginState === 'admin' ||
    loginState === 'secretary' ||
    loginState === 'prizeClerk' ||
    loginState === 'reports';
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
    const navItems = [
      ...(isAdmin
        ? [{ id: 'admin', href: `/${schoolId}/admin`, icon: UserCog, label: 'Admin', color: 'destructive' }]
        : isStaff
          ? [{ id: 'admin', href: `/${schoolId}/admin-signin`, icon: UserCog, label: 'Admin', color: 'destructive' }]
          : []),
      ...(isStaff ? [{ id: 'print', href: `/${schoolId}/teacher`, icon: Printer, label: 'Teacher', color: 'chart-2' }] : []),
      { id: 'redeem', href: `/${schoolId}/student`, icon: GraduationCap, label: 'Student', color: 'chart-1' },
    ].sort((a, b) => {
      const order = ['admin', 'print', 'redeem'];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });

    const colorClasses = portalTextClass;
    const hoverColorClasses = portalHoverTextClass;

    return (
      <div className="w-full">
        <header className="no-print grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] w-full items-center relative z-20 px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 border-b border-border/10">
          <div className="flex justify-start min-w-0 justify-self-start">
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
          <div className="flex min-w-0 max-w-full items-center justify-center px-2 justify-self-center">
            {schoolId && (
              <Link href={centerHref} className="flex min-w-0 max-w-full flex-col items-center gap-1 truncate no-underline font-school text-lg font-black sm:text-2xl md:text-3xl">
                <span className="truncate text-foreground font-bold">{centerLabel}</span>
              </Link>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1 sm:gap-2 justify-self-end">
            {schoolId && loginState !== 'loggedOut' && (
              <div className="flex h-8 w-6 items-center justify-center sm:h-9 sm:w-9">
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
            <AdminLoginButton />
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

        {loginState !== 'loggedOut' && !isKioskLocked && (
          <nav className={cn("fixed bottom-0 left-0 right-0 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-[100] no-print border-t",
            settings.darkMode ? "bg-background/90 backdrop-blur-md border-border" : "bg-card border-border"
          )}>
            <div className="max-w-lg mx-auto flex justify-around items-center">
              {navItems.map(({ href, icon: Icon, label, color }) => {
                const isActive = pathname === href || (href !== '/portal' && pathname.startsWith(href));
                const colorKey = color as PortalColorKey;
                const activeClass = isActive
                  ? `scale-110 ${colorClasses[colorKey] || 'text-primary'}`
                  : `text-slate-400 ${hoverColorClasses[colorKey] || 'hover:text-primary'}`;
                return (
                  <Link key={href} href={href} className={cn('flex flex-col items-center transition-all px-3 py-1', activeClass)}>
                    <Icon className="w-6 h-6" />
                    <span className="text-[10px] font-bold mt-1 tracking-wider uppercase">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    );
  }

  // --- WEB MODE HEADER ---
  return (
    <header className={cn(
      "no-print w-full z-50 transition-colors border-b border-primary/10 sticky top-0",
      "bg-background/80 backdrop-blur-xl"
    )}>
      <div className="max-w-7xl mx-auto px-2 sm:px-8 h-20 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-1 sm:gap-4 shrink-0 min-w-0 justify-self-start">
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

        {/* Center: School Name — equal 1fr side columns so title stays true viewport-center */}
        <div className="flex min-w-0 justify-center justify-self-center px-2 max-w-[min(100%,56vw)] sm:max-w-[min(100%,42rem)]">
          {schoolId ? (
            <Link href={centerHref} className="flex justify-center text-center no-underline min-w-0 max-w-full">
              <span className="inline-flex items-center gap-2 sm:gap-3 min-w-0">
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
                <div className="flex flex-col items-center justify-center min-w-0">
                  <span className="text-sm min-[400px]:text-base sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-headline font-bold text-foreground truncate">
                    {centerLabel}
                  </span>
                </div>
              </span>
            </Link>
          ) : null}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0 justify-self-end">
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

              {loginState === 'student' && <AdminLoginButton />}

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
  );
}
