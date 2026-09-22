'use client';

import { useCallback, useMemo, useState } from 'react';
import { collection } from 'firebase/firestore';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import type { Goal } from '@/lib/types';
import { clearStudentWishlist, setStudentWishlist } from '@/lib/goals/studentWishlistClient';
import { useToast } from '@/hooks/use-toast';

/** Active student-created savings wishlist prize id + toggle helper. */
export function useStudentWishlist(args: {
  schoolId: string | null | undefined;
  studentId: string | null | undefined;
  enabled: boolean;
}) {
  const { schoolId, studentId, enabled } = args;
  const firestore = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const [busyPrizeId, setBusyPrizeId] = useState<string | null>(null);

  const goalsQuery = useMemoFirebase(
    () => (enabled && schoolId ? collection(firestore, 'schools', schoolId, 'goals') : null),
    [enabled, firestore, schoolId],
  );
  const { data: goals } = useCollection<Goal>(goalsQuery);

  const activeWishlistPrizeId = useMemo(() => {
    if (!enabled || !studentId || !goals) return null;
    const hit = goals.find(
      (g) =>
        g.status === 'active' &&
        g.type === 'prize_savings' &&
        g.createdByStudent === true &&
        g.studentId === studentId &&
        !!g.prizeId,
    );
    return hit?.prizeId ?? null;
  }, [enabled, goals, studentId]);

  const toggleWishlist = useCallback(
    async (prizeId: string) => {
      if (!enabled || !schoolId || !studentId) return;
      setBusyPrizeId(prizeId);
      try {
        if (activeWishlistPrizeId === prizeId) {
          const result = await clearStudentWishlist(auth, { schoolId, studentId, prizeId });
          if (!result.ok) {
            toast({ variant: 'destructive', title: 'Could not update wishlist', description: result.error });
            return;
          }
          toast({ title: 'Wishlist cleared', description: 'You can pick another reward anytime.' });
        } else {
          const result = await setStudentWishlist(auth, { schoolId, studentId, prizeId });
          if (!result.ok) {
            toast({ variant: 'destructive', title: 'Could not save wishlist', description: result.error });
            return;
          }
          toast({
            title: 'Saving toward this reward',
            description: result.title || 'Watch your goals card fill up as you earn points.',
          });
        }
      } finally {
        setBusyPrizeId(null);
      }
    },
    [enabled, schoolId, studentId, activeWishlistPrizeId, auth, toast],
  );

  return {
    enableWishlist: enabled,
    activeWishlistPrizeId,
    wishlistBusyPrizeId: busyPrizeId,
    toggleWishlist,
  };
}
