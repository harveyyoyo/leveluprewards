import type { StudentTheme } from '@/lib/types';

/** Resolve whether a student ID card should render a QR code (vs bottom barcode). */
export function resolveStudentIdCardUseQr(
  studentTheme: Pick<StudentTheme, 'idCardUseQr'> | null | undefined,
  schoolUseQr: boolean,
): boolean {
  if (typeof studentTheme?.idCardUseQr === 'boolean') return studentTheme.idCardUseQr;
  return schoolUseQr;
}
