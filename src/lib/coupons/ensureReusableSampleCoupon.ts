import { deleteField, doc, Firestore, setDoc } from 'firebase/firestore';
import type { Settings } from '@/components/providers/SettingsProvider';
import {
  buildReusableSampleCouponDoc,
  resolveReusableSampleCouponConfig,
} from '@/lib/coupons/reusableSampleCoupon';

/** Upsert the configured reusable demo coupon when the setting is enabled. */
export async function ensureReusableSampleCoupon(
  firestore: Firestore,
  schoolId: string,
  appSettings: Partial<Settings>,
): Promise<void> {
  const cfg = resolveReusableSampleCouponConfig(appSettings);
  if (!cfg.enabled) return;

  const sid = schoolId.trim().toLowerCase();
  const ref = doc(firestore, 'schools', sid, 'coupons', cfg.code);
  await setDoc(
    ref,
    {
      ...buildReusableSampleCouponDoc(cfg),
      used: false,
      usedAt: deleteField(),
      usedBy: deleteField(),
    },
    { merge: true },
  );
}
