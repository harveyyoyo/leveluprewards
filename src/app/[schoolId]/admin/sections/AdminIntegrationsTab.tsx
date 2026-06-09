'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StaffPortalTabPanel } from '@/components/staff/StaffPortalTabHeader';
import { StaffPortalTabInfoPopover, staffPortalTabInfoSection } from '@/components/staff/StaffPortalTabInfoPopover';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Link2, Shield } from 'lucide-react';
import { TabWalkthroughHeaderAction } from '@/components/tabWalkthrough/TabWalkthroughContext';

type StatusPayload = {
  googleClassroomConfigured: boolean;
  cleverConfigured: boolean;
  classlinkConfigured: boolean;
  message?: string;
};

export function AdminIntegrationsTab() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/integrations/status')
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled) setStatus(j as StatusPayload);
      })
      .catch((e: unknown) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : 'Could not load status.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const Row = ({
    label,
    configured,
  }: {
    label: string;
    configured: boolean;
  }) => (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
      <span className="font-semibold text-sm">{label}</span>
      {configured ? (
        <Badge className="bg-emerald-600 hover:bg-emerald-600">Credentials present</Badge>
      ) : (
        <Badge variant="secondary">Not configured</Badge>
      )}
    </div>
  );

  return (
    <StaffPortalTabPanel
      className="mx-auto max-w-3xl"
      tabValue="integrations"
      trailing={<TabWalkthroughHeaderAction />}
    >
      {err ? (
        <Alert variant="destructive">
          <AlertTitle>Status unavailable</AlertTitle>
          <AlertDescription>{err}</AlertDescription>
        </Alert>
      ) : null}

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Implementation note</AlertTitle>
        <AlertDescription>
          This tab reflects whether integration API keys are present in the hosting environment. Full Google
          Classroom, Clever, and ClassLink flows require OAuth app registration, consent screens, and secure token
          storage—extend <code className="text-xs bg-muted px-1 rounded">src/app/api/integrations/</code> when ready.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-1.5">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5" aria-hidden />
              Roster and SSO
            </CardTitle>
            <StaffPortalTabInfoPopover
              sections={[staffPortalTabInfoSection('Server-side configuration only (no student data leaves your school without setup).')]}
              ariaLabel="About roster and SSO"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!status ? (
            <p className="text-sm text-muted-foreground">Loading integration status…</p>
          ) : (
            <>
              <Row label="Google Classroom API" configured={status.googleClassroomConfigured} />
              <Row label="Clever" configured={status.cleverConfigured} />
              <Row label="ClassLink" configured={status.classlinkConfigured} />
              {status.message ? (
                <p className="text-xs text-muted-foreground pt-2">{status.message}</p>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </StaffPortalTabPanel>
  );
}
