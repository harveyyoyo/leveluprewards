'use client';

import { useState } from 'react';
import { LayoutGrid, Monitor, Tag } from 'lucide-react';
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import { ContentSectionTreeNav } from '@/components/ui/content-section-tree-nav';
import type { Settings } from '@/components/providers/SettingsProvider';
import { BulletinIncentivesPanel } from './displays/BulletinIncentivesPanel';
import { IncentiveSurfacesPanel } from '@/components/incentives/IncentiveSurfacesPanel';

type IncentivesSection = 'manage' | 'surfaces';

type AdminIncentivesTabProps = {
  schoolId: string;
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
};

export function AdminIncentivesTab({ schoolId, settings, updateSettings }: AdminIncentivesTabProps) {
  const [section, setSection] = useState<IncentivesSection>('manage');

  return (
    <StaffPortalTabPanel tabValue="incentives" trailing={<TabWalkthroughHeaderAction />}>
      <StaffPortalSectionCard className="w-full overflow-hidden">
        <StaffPortalSectionCardContent className="space-y-6">
          <ContentSectionTreeNav
            branchLabel="Incentives"
            fullWidth
            items={[
              { id: 'manage', label: 'Manage', icon: Tag },
              { id: 'surfaces', label: 'Where to show', icon: Monitor },
            ]}
            value={section}
            onValueChange={(id) => setSection(id as IncentivesSection)}
            aria-label="Incentives sections"
          />

          {section === 'manage' ? (
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/10 p-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <LayoutGrid className="h-4 w-4 text-ring" aria-hidden />
                  Point-earning opportunities
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create and delete your school&apos;s incentive catalog here. Use{' '}
                  <span className="font-semibold text-foreground/90">Where to show</span> to add or
                  remove incentives from the bulletin board, Smart Screen, kiosk, or student portal.
                </p>
              </div>
              <BulletinIncentivesPanel schoolId={schoolId} />
            </div>
          ) : null}

          {section === 'surfaces' ? (
            <IncentiveSurfacesPanel
              schoolId={schoolId}
              settings={settings}
              updateSettings={updateSettings}
            />
          ) : null}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}
