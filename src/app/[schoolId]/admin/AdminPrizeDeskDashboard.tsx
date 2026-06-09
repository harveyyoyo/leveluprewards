'use client';

import { TooltipProvider } from '@/components/ui/tooltip';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { useSettings } from '@/components/providers/SettingsProvider';
import { appearanceVarsForSurface } from '@/lib/appearance';
import { AdminPrizeDeskPanel } from './AdminPrizeDeskPanel';

/** Minimal admin shell for prize desk staff — catalog management stays with full admins. */
export function AdminPrizeDeskDashboard() {
  const { settings } = useSettings();

  return (
    <TooltipProvider>
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6 p-4 md:p-8"
        style={appearanceVarsForSurface(settings, 'admin')}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-primary">
                Prizes — desk
              </h2>
              <StaffPortalTabInfoPopover
                sections={[staffPortalTabInfoSection('Desk accounts redeem prizes for students from this screen. The student-facing kiosk uses student sign-in, not this account.')]}
                ariaLabel="About prizes desk"
              />
            </div>
            <p className="text-muted-foreground">Scan a student, then complete redemption. This is the staff prize desk (not the student kiosk).</p>
          </div>
        </div>

        <AdminPrizeDeskPanel className="min-h-0 flex-1" />
      </div>
    </TooltipProvider>
  );
}
