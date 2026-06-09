'use client';

import { Activity, LayoutDashboard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  StaffPortalSectionCard,
  StaffPortalSectionCardContent,
  StaffPortalSectionCardHeader,
  StaffPortalSectionCardTitle,
} from '@/components/staff/StaffPortalSection';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';
import type { Class, Coupon, Student, Teacher } from '@/lib/types';

export function AdminStatsTab({
  students,
  classes,
  teachers,
  coupons,
  usedCouponsCount,
  totalPointsAwarded,
}: {
  students: Student[] | null | undefined;
  classes: Class[] | null | undefined;
  teachers: Teacher[] | null | undefined;
  coupons: Coupon[] | null | undefined;
  usedCouponsCount: number;
  totalPointsAwarded: number;
}) {
  return (
    <StaffPortalTabPanel
      tabValue="insights"
      trailing={<TabWalkthroughHeaderAction />}
    >
      <StaffPortalSectionCard className="">
        <StaffPortalSectionCardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-secondary/30 border-0 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Points Issued</h3>
                <p className="text-4xl font-black text-foreground">
                  {students?.reduce((sum, s) => sum + (s.lifetimePoints || s.points || 0), 0).toLocaleString() || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-0 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Coupons Redeemed</h3>
                <p className="text-4xl font-black text-foreground">{usedCouponsCount.toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-0 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Active Students</h3>
                <p className="text-4xl font-black text-foreground">{students?.length || 0}</p>
              </CardContent>
            </Card>
            <Card className="bg-secondary/30 border-0 shadow-none">
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Value Redeemed</h3>
                <p className="text-4xl font-black text-foreground">{totalPointsAwarded.toLocaleString()} pts</p>
              </CardContent>
            </Card>
          </div>
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>

      <StaffPortalSectionCard>
        <StaffPortalSectionCardHeader>
          <div className="flex items-center gap-1.5">
            <StaffPortalSectionCardTitle className="flex items-center gap-2">
              <LayoutDashboard className="w-5 h-5 text-ring" /> System Stats
            </StaffPortalSectionCardTitle>
            <StaffPortalTabInfoPopover
              sections={[staffPortalTabInfoSection("A high-level overview of your school's data, including counts for students, classes, teachers, and coupon activity.")]}
              ariaLabel="About system stats"
            />
          </div>
        </StaffPortalSectionCardHeader>
        <StaffPortalSectionCardContent className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-center">
          {[
            { label: 'Students', val: students?.length || 0 },
            { label: 'Classes', val: classes?.length || 0 },
            { label: 'Teachers', val: teachers?.length || 0 },
            { label: 'Coupons', val: coupons?.length || 0 },
            { label: 'Used', val: usedCouponsCount },
            { label: 'Points Issued', val: totalPointsAwarded.toLocaleString() },
          ].map((stat, i) => (
            <div key={i} className="bg-secondary/30 border p-6 rounded-2xl">
              <p className="text-3xl font-bold font-code">{stat.val}</p>
              <p className="text-xs text-muted-foreground uppercase font-bold tracking-tighter mt-1">{stat.label}</p>
            </div>
          ))}
        </StaffPortalSectionCardContent>
      </StaffPortalSectionCard>
    </StaffPortalTabPanel>
  );
}

