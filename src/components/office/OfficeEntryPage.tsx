'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2, LogIn } from 'lucide-react';
import { useAppContext } from '@/components/AppProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  hasOfficePortalLoginIntent,
  hasVerifiedOfficeFirestoreAccess,
} from '@/lib/office/officeAccess';
import { officePublicHref, schoolPortalHref } from '@/lib/officePublicUrl';

function readStoredSchoolId(): string {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem('schoolId')?.trim() || '' : '';
  } catch {
    return '';
  }
}

export function OfficeEntryPage() {
  const router = useRouter();
  const { isInitialized, loginState, schoolId, isAdmin, isOffice } = useAppContext();
  const [schoolInput, setSchoolInput] = useState(readStoredSchoolId);
  const [bootReady, setBootReady] = useState(false);
  const redirectAttempted = useRef(false);

  useEffect(() => {
    const id = window.setTimeout(() => setBootReady(true), 2_500);
    return () => window.clearTimeout(id);
  }, []);

  const canShowForm = isInitialized || bootReady;

  useEffect(() => {
    if (!isInitialized || redirectAttempted.current) return;

    const sid = (schoolId?.trim() || readStoredSchoolId()).toLowerCase();
    if (!sid || !hasOfficePortalLoginIntent(loginState)) return;

    const verified = hasVerifiedOfficeFirestoreAccess({
      loginState,
      isAdmin,
      isOffice,
      schoolId: sid,
    });

    if (!verified && loginState !== 'developer') return;

    redirectAttempted.current = true;
    const target = officePublicHref(sid);
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.location.assign(target);
      return;
    }
    router.replace(target);
  }, [isInitialized, loginState, router, schoolId, isAdmin, isOffice]);

  const handleContinue = () => {
    const sid = schoolInput.trim().toLowerCase();
    if (!sid) return;
    const target = officePublicHref(sid);
    if (target.startsWith('http://') || target.startsWith('https://')) {
      window.location.assign(target);
      return;
    }
    router.push(target);
  };

  if (!canShowForm) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#f4f7f9] p-6 dark:bg-slate-950">
        <Loader2 className="h-7 w-7 animate-spin text-teal-700" aria-hidden />
        <p className="text-sm font-medium text-muted-foreground">Loading School Office…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7f9] p-6 dark:bg-slate-950">
      <Card className="w-full max-w-md rounded-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-teal-700" aria-hidden />
            School Office
          </CardTitle>
          <CardDescription>
            Grades and billing for your school. Enter your school ID to sign in with your office desk
            account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="office-school-id">School ID</Label>
            <Input
              id="office-school-id"
              value={schoolInput}
              onChange={(e) => setSchoolInput(e.target.value)}
              placeholder="e.g. yeshiva"
              autoComplete="organization"
              className="rounded-xl"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleContinue();
              }}
            />
          </div>
          <Button
            className="w-full gap-2 rounded-xl"
            onClick={handleContinue}
            disabled={!schoolInput.trim()}
          >
            <LogIn className="h-4 w-4" aria-hidden />
            Continue
          </Button>
          {schoolInput.trim() ? (
            <p className="text-center text-xs text-muted-foreground">
              <a
                href={schoolPortalHref(schoolInput.trim())}
                className="underline-offset-2 hover:underline"
              >
                Open rewards portal instead
              </a>
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
