'use client';

import { useCallback, useEffect, useState } from 'react';

/** Minutes → ms; clamps 1–240; invalid input defaults to 6 minutes. */
export function kioskAiFunVoucherIdleThresholdMs(idleOffMin: unknown): number {
  const raw = typeof idleOffMin === 'number' && Number.isFinite(idleOffMin) ? idleOffMin : 6;
  return Math.max(1, Math.min(240, Math.floor(raw))) * 60_000;
}

/**
 * After this many minutes without pointer/keyboard activity on the kiosk, AI Fun and
 * redeem print-voucher offers are treated as off until the user interacts again.
 * When the kiosk is locked (stays signed in), extras stay available.
 */
export function useKioskAiFunAndVoucherIdleActive(
  idleOffMinutesSetting: number | undefined,
  isKioskLocked: boolean,
): { kioskAiFunAndVoucherActive: boolean; markKioskRewardsActivity: () => void } {
  const [activityAt, setActivityAt] = useState(() => Date.now());
  const [idleCheckSeq, setIdleCheckSeq] = useState(0);

  const markKioskRewardsActivity = useCallback(() => {
    if (isKioskLocked) return;
    setActivityAt(Date.now());
  }, [isKioskLocked]);

  useEffect(() => {
    if (isKioskLocked) return;
    const id = window.setInterval(() => {
      setIdleCheckSeq((n) => n + 1);
    }, 4000);
    return () => window.clearInterval(id);
  }, [isKioskLocked]);

  const thresholdMs = kioskAiFunVoucherIdleThresholdMs(idleOffMinutesSetting);
  void idleCheckSeq;
  const kioskAiFunAndVoucherActive =
    isKioskLocked || Date.now() - activityAt < thresholdMs;

  return { kioskAiFunAndVoucherActive, markKioskRewardsActivity };
}
