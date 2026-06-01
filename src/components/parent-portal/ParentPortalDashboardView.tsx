'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  fetchParentPortalDashboard,
  logoutParentPortal,
  type ParentPortalDashboard,
} from '@/lib/parentPortal/parentPortalClient';
import { cn } from '@/lib/utils';

export function ParentPortalDashboardView({
  schoolId,
  onSignedOut,
}: {
  schoolId: string;
  onSignedOut: () => void;
}) {
  const [data, setData] = useState<ParentPortalDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchParentPortalDashboard(schoolId));
    } catch (e) {
      setError((e as Error).message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logoutParentPortal();
      onSignedOut();
    } finally {
      setSigningOut(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground py-12">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="max-w-lg w-full">
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm text-destructive">{error || 'Could not load dashboard.'}</p>
          <Button variant="outline" onClick={() => void load()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{data.student.displayName}</h1>
          {data.student.className ? (
            <p className="text-sm text-muted-foreground">{data.student.className}</p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={handleSignOut} disabled={signingOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>

      <Card className="border-t-4 border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{data.student.pointsLabel}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-4xl font-black tabular-nums">{data.student.points.toLocaleString()}</p>
          {data.student.rewardsPillarOn && data.student.classroomPoints > 0 ? (
            <p className="text-xs text-muted-foreground">
              Classroom points (separate): {data.student.classroomPoints.toLocaleString()}
            </p>
          ) : null}
          {!data.student.rewardsPillarOn ? (
            <p className="text-xs text-muted-foreground">
              Saved from classroom quick awards — not the school kiosk or prize shop balance.
            </p>
          ) : null}
        </CardContent>
      </Card>

      {data.attendanceToday ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Today&apos;s attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {data.attendanceToday.signedIn ? (
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-800">
                {data.attendanceToday.onTime === false ? 'Signed in (late)' : 'Signed in on time'}
                {data.attendanceToday.signedInAt
                  ? ` · ${format(data.attendanceToday.signedInAt, 'h:mm a')}`
                  : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-muted text-muted-foreground">
                Not signed in yet today
              </Badge>
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent points activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            data.recentActivity.slice(0, 12).map((row, i) => (
              <div key={`${row.date}-${i}`} className="flex justify-between gap-3 text-sm border-b border-border/50 pb-2 last:border-0">
                <div>
                  <p className="font-medium">{row.desc}</p>
                  <p className="text-xs text-muted-foreground">{row.date ? format(row.date, 'MMM d, h:mm a') : ''}</p>
                </div>
                <span className={cn('font-bold tabular-nums', row.amount >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                  {row.amount > 0 ? '+' : ''}
                  {row.amount}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Teacher notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.behaviorNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes shared with parents yet.</p>
          ) : (
            data.behaviorNotes.map((n, i) => (
              <div key={`${n.createdAt}-${i}`} className="rounded-xl border bg-muted/20 p-3 text-sm">
                <div className="flex justify-between gap-2 mb-1">
                  <span className="font-semibold capitalize">{n.kind}</span>
                  <span className="text-xs text-muted-foreground">
                    {n.createdAt ? format(n.createdAt, 'MMM d') : ''}
                  </span>
                </div>
                <p>{n.note}</p>
                <p className="text-xs text-muted-foreground mt-1">{n.teacherName}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
