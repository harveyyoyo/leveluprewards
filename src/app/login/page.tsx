'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SchoolDeveloperLoginForm } from '@/components/SchoolDeveloperLoginForm';

function LoginFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6 text-center">
      <div className="animate-pulse mb-4 text-primary font-bold text-xl uppercase tracking-tighter">Loading levelUp EDU…</div>
    </div>
  );
}

function LoginFormWithQuery() {
  const sp = useSearchParams();
  const school = sp.get('school') ?? undefined;
  return <SchoolDeveloperLoginForm mode="full" initialSchoolId={school} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginFormWithQuery />
    </Suspense>
  );
}
