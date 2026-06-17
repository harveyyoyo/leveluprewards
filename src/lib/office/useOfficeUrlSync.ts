'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/** Push filter/query state into the URL after the first render (keeps deep links shareable). */
export function useOfficeUrlSync(params: Record<string, string | undefined>): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skip = useRef(true);

  const serialized = JSON.stringify(params);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    const parsed = JSON.parse(serialized) as Record<string, string | undefined>;
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(parsed)) {
      if (value && value !== 'all') next.set(key, value);
      else next.delete(key);
    }
    const q = next.toString();
    const target = q ? `${pathname}?${q}` : pathname;
    const current = searchParams.toString();
    const currentTarget = current ? `${pathname}?${current}` : pathname;
    if (target !== currentTarget) {
      router.replace(target, { scroll: false });
    }
  }, [pathname, router, searchParams, serialized]);
}
