'use client';

import { useCallback, useEffect, useState } from 'react';

/** Seconds to ms; clamps 1-14400; invalid input defaults to 360 seconds. */
export function kioskRewardsIdleThresholdMs(idleOffSec: unknown): number {
  const raw = typeof idleOffSec === 'number' && Number.isFinite(idleOffSec) ? idleOffSec : 360;
  return Math.max(1, Math.min(14400, Math.floor(raw))) * 1000;
}

/**
 * After the configured idle windows without pointer/keyboard activity on the kiosk,
 * AI Fun and redeem print-voucher offers are treated as off until the user interacts again.
 * When the kiosk is locked (stays signed in), extras stay available.
 */
export function useKioskAiFunAndVoucherIdleActive(
  aiFunIdleOffSecSetting: number | undefined,
  voucherIdleOffSecSetting: number | undefined,
  isKioskLocked: boolean,
): {
  kioskAiFunActive: boolean;
  kioskVoucherActive: boolean;
  markKioskRewardsActivity: () => void;
} {
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

  const now = Date.now();
  const aiFunThresholdMs = kioskRewardsIdleThresholdMs(aiFunIdleOffSecSetting);
  const voucherThresholdMs = kioskRewardsIdleThresholdMs(voucherIdleOffSecSetting);
  void idleCheckSeq;

  return {
    kioskAiFunActive: isKioskLocked || now - activityAt < aiFunThresholdMs,
    kioskVoucherActive: isKioskLocked || now - activityAt < voucherThresholdMs,
    markKioskRewardsActivity,
  };
}
