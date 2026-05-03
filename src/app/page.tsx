/* eslint-disable @next/next/no-img-element */
'use client';

import Link from 'next/link';
import { LevelUpLogoBrutalist } from '@/components/LevelUpLogoBrutalist';
import { Button } from '@/components/ui/button';
import { doc } from 'firebase/firestore';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';

export default function RootPage() {
  const firestore = useFirestore();
  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'appConfig', 'global');
  }, [firestore]);

  const { data: appConfig } = useDoc<{ appLogoUrl?: string }>(appConfigDocRef);
  const appLogoUrl = (appConfig?.appLogoUrl ?? '').trim() || null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-8 text-center">
        {appLogoUrl ? (
          <img
            src={appLogoUrl}
            alt="App logo"
            className="h-48 w-48 sm:h-64 sm:w-64 object-contain"
          />
        ) : (
          <div className="flex w-full flex-col items-center">
            <LevelUpLogoBrutalist className="items-center text-center [&_h1]:text-center" />
          </div>
        )}

        <div className="w-full space-y-3">
          <Button asChild className="h-12 w-full rounded-xl font-bold">
            <Link href="/login">School Login</Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl font-bold">
            <Link href="/developer">Developer Tools</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
