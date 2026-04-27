/* eslint-disable @next/next/no-img-element */
'use client';

import Logo from '@/components/Logo';
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
      {appLogoUrl ? (
        <img
          src={appLogoUrl}
          alt="App logo"
          className="h-[260px] w-[260px] sm:h-[360px] sm:w-[360px] lg:h-[520px] lg:w-[520px] object-contain"
        />
      ) : (
        <Logo className="h-[260px] w-[260px] sm:h-[360px] sm:w-[360px] lg:h-[520px] lg:w-[520px]" />
      )}
    </div>
  );
}
