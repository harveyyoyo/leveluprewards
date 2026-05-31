'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Users } from 'lucide-react';
import Link from 'next/link';
import { useAppContext } from '@/components/AppProvider';
import { useSettings } from '@/components/providers/SettingsProvider';
import { isClassroomPillarOn } from '@/lib/productPillars';
import { ParentPortalLogin } from '@/components/parent-portal/ParentPortalLogin';
import { ParentPortalDashboardView } from '@/components/parent-portal/ParentPortalDashboardView';
import { Button } from '@/components/ui/button';

export default function ParentPortalPage() {
  const params = useParams<{ schoolId: string }>();
  const { schoolId: ctxSchoolId } = useAppContext();
  const schoolId = (ctxSchoolId || params.schoolId || '').trim().toLowerCase();
  const { settings } = useSettings();
  const [signedIn, setSignedIn] = useState(false);

  const checkSession = useCallback(async () => {
    if (!schoolId) return;
    try {
      const res = await fetch(`/api/parent-portal/dashboard?schoolId=${encodeURIComponent(schoolId)}`, {
        credentials: 'same-origin',
      });
      setSignedIn(res.ok);
    } catch {
      setSignedIn(false);
    }
  }, [schoolId]);

  useEffect(() => {
    void checkSession();
  }, [checkSession]);

  const portalOn = isClassroomPillarOn(settings) && settings.enableParentView === true;

  if (!portalOn) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-8 text-center">
        <Users className="h-10 w-10 text-muted-foreground" />
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-black">Parent portal is off</h1>
          <p className="text-sm text-muted-foreground">
            Ask your school to enable Classroom Management and turn on Parent portal in Admin → Classroom.
          </p>
        </div>
        {schoolId ? (
          <Button asChild variant="outline">
            <Link href={`/${schoolId}/portal`}>Back to portal</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
      <div className="mb-8 flex items-center gap-2 text-violet-600">
        <Users className="h-6 w-6" />
        <span className="text-sm font-black uppercase tracking-wider">Parent portal</span>
      </div>
      {signedIn ? (
        <ParentPortalDashboardView schoolId={schoolId} onSignedOut={() => setSignedIn(false)} />
      ) : (
        <ParentPortalLogin
          schoolId={schoolId}
          onSignedIn={() => {
            setSignedIn(true);
          }}
        />
      )}
    </div>
  );
}
