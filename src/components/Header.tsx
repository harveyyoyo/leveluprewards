
'use client';
import { useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
  Trophy,
  Zap,
  LogOut,
  Home,
  User,
  GraduationCap,
  Printer,
  Gift,
  UserCog,
  ArrowRightLeft,
  ArrowLeft,
  Server,
} from 'lucide-react';
import { Button } from './ui/button';
import { useAppContext, type SyncStatus } from './AppProvider';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SettingsModal } from './ui/SettingsModal';
import { useSettings } from './providers/SettingsProvider';
import { cn } from '@/lib/utils';
import { useArcadeSound } from '@/hooks/useArcadeSound';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import Logo from './Logo';
import { portalHoverTextClass, portalTextClass, type PortalColorKey } from '@/lib/portalColors';
import { rainbowForNavId } from '@/lib/rainbowNav';
import { requestStudentKioskExit } from '@/lib/student-kiosk';
import { Helper } from '@/components/ui/helper';
import {
  globalAnimatedBackdropActive,
  headerAnimatedBackdropClassName,
  appHeaderAnimatedBackdropClassName,
} from '@/lib/animatedBackdrop';

function subscribeNavigatorOnline(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getNavigatorOnlineSnapshot() {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

function getNavigatorOnlineServerSnapshot() {
  return true;
}

/** Live `navigator.onLine` so the pill does not rely only on Firestore cache metadata. */
function useBrowserOnline() {
  return useSyncExternalStore(
    subscribeNavigatorOnline,
    getNavigatorOnlineSnapshot,
    getNavigatorOnlineServerSnapshot
  );
}

const DISCONNECTED_UI = {
  label: 'No connection',
  dotClass: 'bg-rose-600',
  showPing: false,
  pillSurface: 'bg-rose-500/12 border-rose-500/30',
  pillText: 'text-rose-700 dark:text-rose-400',
} as const;

function syncConnectionUI(status: SyncStatus, browserOnline: boolean) {
  if (!browserOnline) {
    return DISCONNECTED_UI;
  }

  const live = status === 'synced';
  const syncing = status === 'syncing';
  const disconnected = status === 'offline' || status === 'error';

  const label = live ? 'Live' : disconnected ? 'No connection' : 'Syncing';

  const dotClass = live
    ? 'bg-emerald-500'
    : syncing
      ? 'bg-amber-400 animate-pulse'
      : 'bg-rose-600';

  const showPing = live;

  const pillSurface = live
    ? 'bg-emerald-500/10 border-emerald-500/20'
    : syncing
      ? 'bg-amber-500/10 border-amber-500/20'
      : 'bg-rose-500/12 border-rose-500/30';

  const pillText = live
    ? 'text-emerald-600/80'
    : syncing
      ? 'text-amber-700/90'
      : 'text-rose-700 dark:text-rose-400';

  return { label, dotClass, showPing, pillSurface, pillText };
}

export default function Header() {
  const pathname = usePathname();
  const { loginState, schoolId, isInitialized, syncStatus, logout, isAdmin, userName, isKioskLocked } = useAppContext();
  const browserOnline = useBrowserOnline();
  const syncUi = syncConnectionUI(syncStatus, browserOnline);
  const { settings, visualSettings } = useSettings();
  const playSound = useArcadeSound();
  const firestore = useFirestore();

  const schoolDocRef = useMemoFirebase(() => {
    if (!firestore || !schoolId) return null;
    return doc(firestore, 'schools', schoolId);
  }, [firestore, schoolId]);

  const { data: schoolData } = useDoc<{ name: string; logoUrl?: string }>(schoolDocRef);
  const schoolName = schoolData?.name || schoolId;

  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);

  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigDocRef);
  const appLogoUrl = appConfig?.appLogoUrl;

  const isLoginPage = pathname === '/' || pathname.startsWith('/s/');
  const isDeveloperMode = loginState === 'developer';
  const headerAnimBackdrop = globalAnimatedBackdropActive(visualSettings);

  const handleLogout = () => {
    playSound('swoosh');
    const onStudentPage = pathname === '/student' || pathname.startsWith('/student/');
    if (onStudentPage && loginState === 'school') {
      requestStudentKioskExit();
      return;
    }
    logout();
  };

  if (isLoginPage || !isInitialized) {
    return null;
  }

  if (isDeveloperMode && pathname === '/developer') {
    return (
      <header
        className={cn(
          'no-print w-full z-50 transition-colors border-b border-primary/10 sticky top-0',
          headerAnimatedBackdropClassName(headerAnimBackdrop),
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 min-h-20 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            {appLogoUrl ? (
              <span className="inline-flex h-12 w-12 sm:h-14 sm:w-14 rounded-2xl overflow-hidden bg-muted border border-border/40 shrink-0 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={appLogoUrl}
                  alt="App logo"
                  className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
                />
              </span>
            ) : (
              <Logo className="h-12 w-auto sm:h-14 shrink-0" />
            )}
            <div className="min-w-0">
              <Helper content="This page is for system administrators. It allows you to manage all school instances, create backups, and perform system-wide operations.">
                <h1 className="text-lg sm:text-xl font-bold font-headline flex items-center gap-2">
                  <Server className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <span className="truncate">Developer Mode</span>
                </h1>
              </Helper>
              <p className="text-xs sm:text-sm text-muted-foreground">Manage all school databases.</p>
            </div>
          </div>
          <Button variant="outline" className="shrink-0 w-full sm:w-auto" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to login
            </Link>
          </Button>
        </div>
      </header>
    );
  }

  const logoLink = '/';
  const centerLabel = schoolName;
  const centerHref = schoolId ? `/${schoolId}/portal` : '/portal';
  const adminAccent = rainbowForNavId('admin', visualSettings.colorScheme);


  // --- APP MODE HEADER ---
  if (settings.displayMode === 'app') {
    const navItems = [
      ...(isAdmin ? [{ id: 'admin', href: `/${schoolId}/admin`, icon: UserCog, label: 'Admin' }] : []),
      { id: 'print', href: `/${schoolId}/teacher`, icon: Printer, label: 'Teacher' },
      { id: 'redeem', href: `/${schoolId}/student`, icon: GraduationCap, label: 'Student' },
      { id: 'prize', href: `/${schoolId}/prize`, icon: Gift, label: 'Shop' },
      { id: 'fame', href: `/${schoolId}/halloffame`, icon: Trophy, label: 'Fame' },
    ].sort((a, b) => {
      const order = ['admin', 'print', 'redeem', 'prize', 'fame'];
      return order.indexOf(a.id) - order.indexOf(b.id);
    });

    return (
      <>
        <header className={cn('no-print grid grid-cols-3 w-full items-center relative z-20 px-4 pt-4 pb-4', appHeaderAnimatedBackdropClassName(headerAnimBackdrop))} style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <div className="flex justify-start">
            {/* Home button removed */}
          </div>
          <div className="flex items-center justify-center min-w-0 px-2">
            {schoolId && (
              <Link href={centerHref} className="flex items-center gap-2 font-headline font-bold text-lg truncate no-underline max-w-full">
                <span className="truncate text-foreground">{centerLabel}</span>
              </Link>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            {schoolId && loginState !== 'loggedOut' && (
              <div className="flex items-center justify-center h-9 w-9" title={syncUi.label}>
                <span className="relative flex h-2.5 w-2.5">
                  {syncUi.showPing && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />}
                  <span className={cn('relative inline-flex h-full w-full rounded-full', syncUi.dotClass)} />
                </span>
              </div>
            )}
            <Button variant="ghost" size="sm" className="h-9 px-2.5 rounded-xl gap-1.5 shrink-0" onClick={handleLogout}>
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-widest">Logout</span>
            </Button>
            <SettingsModal />
          </div>
        </header>

        {loginState !== 'loggedOut' && (
          <nav className={cn("fixed bottom-0 left-0 right-0 py-3 pb-[max(1rem,env(safe-area-inset-bottom))] z-[100] no-print border-t",
            settings.darkMode ? "bg-background/90 backdrop-blur-md border-border" : "bg-card border-border"
          )}>
            <div className="max-w-lg mx-auto flex justify-around items-center">
              {navItems.map(({ id, href, icon: Icon, label }) => {
                const isActive = pathname === href || (href !== `/${schoolId}/portal` && pathname.startsWith(href));
                const c = rainbowForNavId(id, visualSettings.colorScheme);
                const activeClass = isActive ? 'scale-110' : 'text-slate-400';
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn('relative flex flex-col items-center transition-all px-3 py-1', activeClass, !isActive && 'hover:text-[color:var(--nav-color)]')}
                    style={{ ['--nav-color' as any]: c, ...(isActive ? { color: c } : {}) }}
                  >
                    {isActive && <div className="active-nav-pill" />}
                    <Icon className="w-6 h-6" style={isActive ? { color: c } : undefined} />
                    <span className="text-[10px] font-bold mt-1 tracking-wider uppercase" style={isActive ? { color: c } : undefined}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </>
    );
  }

  // --- WEB MODE HEADER ---
  return (
    <header className={cn(
      "no-print w-full z-50 transition-colors border-b border-primary/10 sticky top-0",
      headerAnimatedBackdropClassName(headerAnimBackdrop),
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-20 flex justify-between items-center">
        {/* Left: Branding */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href={logoLink} className="flex items-center gap-4 group" data-home-button="true">
            {appLogoUrl ? (
              <span className="inline-flex h-10 w-10 rounded-2xl overflow-hidden bg-muted border border-border/40 shrink-0 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={appLogoUrl} alt="App logo" className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'} />
              </span>
            ) : (
              <Logo className="h-10 w-auto" />
            )}
            <div className="flex-col hidden sm:flex">
              <span className="text-lg font-black tracking-widest uppercase" style={{ color: adminAccent }}>levelUp EDU</span>
              <span className="text-xs font-bold uppercase text-muted-foreground tracking-wider">School Rewards System</span>
            </div>
          </Link>
        </div>

        {/* Center: School Name */}
        {schoolId && (
          <div className="flex-1 flex justify-center min-w-0 px-4 hidden lg:flex">
            <Link href={centerHref} className="flex items-center gap-3 text-center no-underline min-w-0 max-w-full">
              {schoolData?.logoUrl && (
                <span className="inline-flex h-10 w-10 rounded-full overflow-hidden bg-muted border border-border/40 shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={schoolData.logoUrl}
                    alt="Logo"
                    className={settings.logoDisplayMode === 'cover' ? 'h-full w-full object-cover' : 'h-full w-full object-contain'}
                  />
                </span>
              )}
              <span className="text-2xl xl:text-3xl font-headline font-bold text-slate-800 truncate">
                {centerLabel}
              </span>
            </Link>
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isInitialized && (
            <>
              {schoolId && loginState !== 'loggedOut' && (
                <div
                  className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full border', syncUi.pillSurface)}
                  title={syncUi.label}
                >
                  <span className="relative flex h-1.5 w-1.5">
                    {syncUi.showPing && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />}
                    <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', syncUi.dotClass)} />
                  </span>
                  <span className={cn('text-[10px] font-black uppercase tracking-tighter', syncUi.pillText)}>{syncUi.label}</span>
                </div>
              )}

              {loginState !== 'student' && loginState !== 'loggedOut' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="font-bold gap-2 h-12 px-4 rounded-xl text-primary">
                      <User className="w-5 h-5" />
                      <span className="hidden sm:inline">
                        {userName || (loginState === 'admin' ? 'Admin' : loginState === 'teacher' ? 'Teacher' : 'School')}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-base py-2 hover:bg-destructive/10 hover:text-destructive cursor-pointer">
                      <LogOut className="mr-2 h-5 w-5" /> Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="h-8 w-px bg-primary/20" />

              <Link
                href={schoolId ? `/${schoolId}/portal` : "/"}
                data-home-button="true"
                className="rounded-xl p-3 transition-all active:scale-90 flex items-center gap-2 hover:bg-primary/10"
                style={{ color: adminAccent, backgroundColor: 'transparent' }}
              >
                <Home className="h-6 w-6" />
                <span className="hidden sm:inline font-bold">Home</span>
              </Link>

              <div className="h-8 w-px bg-primary/20" />

              <SettingsModal />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
