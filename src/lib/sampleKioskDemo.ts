/** Built-in kiosk demo student (short ID for manual entry). */
export const SAMPLE_KIOSK_STUDENT_ID = '100';

export const SAMPLE_KIOSK_STUDENT_FIRST_NAME = 'John';
export const SAMPLE_KIOSK_STUDENT_LAST_NAME = 'Doe';

export const SAMPLE_KIOSK_STUDENT_DISPLAY_NAME = 'John Doe';

/** Default reusable demo coupon code (student login stays 100; coupon is 000). */
export const SAMPLE_KIOSK_COUPON_CODE = '000';

export function isSampleKioskStudentId(raw: string): boolean {
  return raw.trim() === SAMPLE_KIOSK_STUDENT_ID;
}
