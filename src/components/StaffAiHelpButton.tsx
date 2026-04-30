'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/** Admin, teacher, and other staff sign-in roles (not students). */
const STAFF_OR_ADMIN_LOGIN = new Set([
  'admin',
  'teacher',
  'secretary',
  'prizeClerk',
  'reports',
  'school',
]);

function isPublicRoute(pathname: string) {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/developer' ||
    pathname.startsWith('/s/')
  );
}

export function StaffAiHelpButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { loginState, isInitialized, isUserLoading } = useAppContext();
  const { settings } = useSettings();

  const show =
    isInitialized &&
    !isUserLoading &&
    !isPublicRoute(pathname) &&
    STAFF_OR_ADMIN_LOGIN.has(loginState);

  if (!show) return null;

  const isApp = settings.displayMode === 'app';

  return (
    <>
      <div
        className={cn(
          'no-print fixed right-4 z-[105] flex flex-col items-end gap-2',
          isApp
            ? 'bottom-[calc(5.75rem+env(safe-area-inset-bottom,0px))]'
            : 'bottom-6',
        )}
      >
        <Button
          type="button"
          size="lg"
          className="h-12 w-12 rounded-full shadow-lg border border-primary/20 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => setOpen(true)}
          aria-label="Open AI help"
        >
          <Sparkles className="h-5 w-5" aria-hidden />
        </Button>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>AI help and tips</SheetTitle>
            <SheetDescription>
              Quick guidance for school staff. Open the settings gear for display options and feature toggles.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4 text-sm text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Helper tips.</span>{' '}
              In Settings, under Printing and guidance, enable “Helper tips” to show ? icons next to controls across the app.
            </p>
            <p>
              <span className="font-semibold text-foreground">Welcome tour.</span>{' '}
              Admins can turn on “Show welcome tour” in the same section for a step-by-step walkthrough.
            </p>
            <p>
              <span className="font-semibold text-foreground">AI features.</span>{' '}
              Some screens offer AI-assisted imports or suggestions where your school has enabled them (for example period scheduling in Admin).
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
