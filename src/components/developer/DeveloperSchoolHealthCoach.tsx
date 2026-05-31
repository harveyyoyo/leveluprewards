'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { useFunctions } from '@/firebase';
import {
  AlertTriangle,
  Bot,
  ChevronRight,
  Info,
  Loader2,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  DeveloperFleetSchoolSummary,
  DeveloperSchoolUsageDetail,
} from '@/lib/developer/schoolUsageInsights';
import {
  compactAlertsForAi,
  compactFleetForAi,
  evaluateFleetHealth,
  type SchoolHealthAlert,
  type SchoolHealthReport,
} from '@/lib/developer/schoolHealthRules';
import type { SendDeveloperHealthEmailResult } from '@/lib/developer/developerHealthEmail';
import { DeveloperHealthEmailSettings } from '@/components/developer/DeveloperHealthEmailSettings';

type AiCoachResponse = {
  executiveSummary: string;
  topPriorities: Array<{ schoolId: string; issue: string; action: string }>;
  fleetPatterns: string[];
  coachingTips: string[];
};

function severityIcon(severity: SchoolHealthAlert['severity']) {
  if (severity === 'critical') return <ShieldAlert className="h-4 w-4 text-destructive" aria-hidden />;
  if (severity === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden />;
  return <Info className="h-4 w-4 text-muted-foreground" aria-hidden />;
}

function severityBadgeVariant(severity: SchoolHealthAlert['severity']) {
  if (severity === 'critical') return 'destructive' as const;
  if (severity === 'warning') return 'secondary' as const;
  return 'outline' as const;
}

export function DeveloperSchoolHealthCoach({
  fleet,
  generatedAt,
  detail,
  onFocusSchool,
}: {
  fleet: DeveloperFleetSchoolSummary[] | null;
  generatedAt: number | null;
  /** When a school detail sheet is open, adds deeper activity-based rules. */
  detail?: DeveloperSchoolUsageDetail | null;
  onFocusSchool?: (schoolId: string) => void;
}) {
  const { user } = useFirebase();
  const functions = useFunctions();
  const autoEmailAttempted = useRef(false);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning'>('all');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCoach, setAiCoach] = useState<AiCoachResponse | null>(null);

  const report: SchoolHealthReport | null = useMemo(() => {
    if (!fleet?.length) return null;
    const detailsBySchoolId =
      detail?.schoolId != null ? { [detail.schoolId]: detail } : undefined;
    return evaluateFleetHealth(fleet, detailsBySchoolId, generatedAt ?? Date.now());
  }, [detail, fleet, generatedAt]);

  const filteredAlerts = useMemo(() => {
    if (!report) return [];
    if (filter === 'critical') return report.alerts.filter((a) => a.severity === 'critical');
    if (filter === 'warning') {
      return report.alerts.filter((a) => a.severity === 'critical' || a.severity === 'warning');
    }
    return report.alerts;
  }, [report, filter]);

  const runAiCoach = useCallback(async () => {
    if (!report || !fleet?.length || !user) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/developer/school-health-coach', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alerts: compactAlertsForAi(report.alerts),
          fleetSnapshot: compactFleetForAi(fleet),
        }),
      });
      const data = (await res.json()) as AiCoachResponse & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || 'AI coach request failed.');
      }
      setAiCoach(data);
    } catch (e: unknown) {
      setAiCoach(null);
      setAiError((e as Error)?.message || 'Could not run AI coach.');
    } finally {
      setAiLoading(false);
    }
  }, [fleet, report, user]);

  useEffect(() => {
    setAiCoach(null);
    setAiError(null);
    autoEmailAttempted.current = false;
  }, [fleet, generatedAt]);

  useEffect(() => {
    if (!functions || !report || autoEmailAttempted.current) return;
    if (report.criticalCount === 0) return;
    autoEmailAttempted.current = true;
    const fn = httpsCallable<{ force?: boolean }, SendDeveloperHealthEmailResult>(
      functions,
      'sendDeveloperHealthAlertEmailNow',
    );
    void fn({ force: false }).catch(() => {
      /* silent — deduped or disabled is normal */
    });
  }, [functions, report]);

  if (!fleet?.length) return null;

  return (
    <>
    <DeveloperHealthEmailSettings
      criticalCount={report?.criticalCount ?? 0}
      warningCount={report?.warningCount ?? 0}
    />

    <Card className="border-amber-500/25 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-amber-500" aria-hidden />
              Usage health alerts
            </CardTitle>
            <CardDescription className="mt-1 text-pretty">
              Automatic checks for misconfiguration, dormant schools, and inefficient reward usage. Optional AI coach
              explains what to fix first.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="shrink-0 gap-2"
            disabled={aiLoading || !report?.alerts.length}
            onClick={() => void runAiCoach()}
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
            AI coach
          </Button>
        </div>
        {report ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="destructive" className="tabular-nums">
              {report.criticalCount} critical
            </Badge>
            <Badge variant="secondary" className="tabular-nums">
              {report.warningCount} warning
            </Badge>
            <Badge variant="outline" className="tabular-nums">
              {report.infoCount} info
            </Badge>
            <Badge variant="outline" className="tabular-nums">
              {report.schoolsNeedingAttention} school{report.schoolsNeedingAttention === 1 ? '' : 's'} need attention
            </Badge>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {(['all', 'warning', 'critical'] as const).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
            >
              {key === 'all' ? 'All alerts' : key === 'warning' ? 'Warnings +' : 'Critical only'}
            </Button>
          ))}
        </div>

        {aiError ? (
          <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 p-3">
            {aiError}
          </p>
        ) : null}

        {aiCoach ? (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" aria-hidden />
              AI coach summary
            </p>
            {aiCoach.executiveSummary ? (
              <p className="leading-relaxed text-foreground/90">{aiCoach.executiveSummary}</p>
            ) : null}
            {aiCoach.topPriorities.length > 0 ? (
              <ul className="space-y-2">
                {aiCoach.topPriorities.map((p) => (
                  <li key={`${p.schoolId}-${p.issue}`} className="rounded-md border bg-background p-3">
                    <button
                      type="button"
                      className="font-mono text-xs font-bold text-primary hover:underline"
                      onClick={() => onFocusSchool?.(p.schoolId)}
                    >
                      {p.schoolId}
                    </button>
                    <p className="mt-1 font-medium">{p.issue}</p>
                    <p className="mt-0.5 text-muted-foreground">{p.action}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {aiCoach.fleetPatterns.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                  Patterns
                </p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {aiCoach.fleetPatterns.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <ul className="max-h-[420px] overflow-y-auto rounded-lg border divide-y">
          {filteredAlerts.length === 0 ? (
            <li className="p-6 text-center text-sm text-muted-foreground">
              No issues at this filter level — schools look healthy on these checks.
            </li>
          ) : (
            filteredAlerts.map((alert) => (
              <li key={alert.id} className="p-3 hover:bg-accent/30 transition-colors">
                <div className="flex gap-2">
                  <div className="mt-0.5 shrink-0">{severityIcon(alert.severity)}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="font-mono text-xs font-bold hover:text-primary hover:underline"
                        onClick={() => onFocusSchool?.(alert.schoolId)}
                      >
                        {alert.schoolId}
                      </button>
                      <Badge variant={severityBadgeVariant(alert.severity)} className="text-[10px]">
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {alert.category.replace(/_/g, ' ')}
                      </Badge>
                      {alert.isDemoSchool ? (
                        <Badge variant="outline" className="text-[10px]">
                          demo
                        </Badge>
                      ) : null}
                    </div>
                    <p className="mt-1 font-semibold text-sm">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                    <p className={cn('mt-2 text-xs rounded-md bg-muted/50 p-2 border')}>
                      <span className="font-semibold text-foreground/80">Fix: </span>
                      {alert.recommendation}
                    </p>
                  </div>
                  {onFocusSchool ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label={`Open insights for ${alert.schoolId}`}
                      onClick={() => onFocusSchool(alert.schoolId)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>
      </CardContent>
    </Card>
    </>
  );
}
