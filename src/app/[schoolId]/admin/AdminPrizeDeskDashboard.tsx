'use client';

import type { CSSProperties } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Helper } from '@/components/ui/helper';
import { useSettings } from '@/components/providers/SettingsProvider';
import { rainbowForNavId, rainbowTripletForNavId, complementTripletForNavId } from '@/lib/rainbowNav';
import { AdminPrizeDeskPanel } from './AdminPrizeDeskPanel';

/** Minimal admin shell for prize desk staff — catalog management stays with full admins. */
export function AdminPrizeDeskDashboard() {
  const { settings } = useSettings();

  return (
    <TooltipProvider>
      <div
        className="mx-auto flex h-full min-h-0 w-full max-w-7xl flex-col gap-6 p-4 md:p-8"
        style={
          {
            ['--primary' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
            ['--chart-1' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
            ['--chart-2' as string]: complementTripletForNavId('admin', settings.colorScheme),
            ['--chart-3' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
            ['--chart-4' as string]: complementTripletForNavId('admin', settings.colorScheme),
            ['--chart-5' as string]: rainbowTripletForNavId('admin', settings.colorScheme),
            ['--ring' as string]: complementTripletForNavId('admin', settings.colorScheme),
          } as CSSProperties
        }
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <Helper content="Desk accounts redeem prizes for students from this screen. The student-facing kiosk uses student sign-in, not this account.">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: rainbowForNavId('admin', settings.colorScheme) }}>
              Prizes — desk
            </h2>
            <p className="text-muted-foreground">Scan a student, then complete redemption. This is the staff prize desk (not the student kiosk).</p>
          </Helper>
        </div>

        <AdminPrizeDeskPanel className="min-h-0 flex-1" />
      </div>
    </TooltipProvider>
  );
}
