import { resolveStudentThemeWithSchoolDefault } from '@/lib/themeContrast';
import type { Prize, Student } from '@/lib/types';
import type { PrizeRedeemTicket } from '@/components/prizes/PrizeRedeemTicketPrintSheet';
import { getStudentNickname } from '@/lib/utils';

export function buildPrizeRedeemTicketPayload(
  student: Student & { id: string },
  prize: Prize,
  activityId: string,
  redeemedAt: number,
  totalCost: number,
  quantity: number,
  options: {
    enableStudentThemes: boolean;
    defaultStudentTheme?: Student['theme'];
    enableStudentEmojiOnPrizeTickets: boolean;
    voucherScanCode?: string;
    aiSurprise?: Pick<PrizeRedeemTicket, 'aiSurpriseKind' | 'aiSurpriseText' | 'aiSurpriseAnswer'>;
  },
): PrizeRedeemTicket {
  const displayFirst = getStudentNickname(student);
  const legalFirst = (student.firstName || '').trim();
  const nick = student.nickname?.trim();
  const themeForTicket = resolveStudentThemeWithSchoolDefault(
    student.theme,
    options.defaultStudentTheme,
    options.enableStudentThemes,
  );
  const emojiRaw =
    options.enableStudentEmojiOnPrizeTickets === true ? themeForTicket?.emoji : undefined;
  const studentEmoji = typeof emojiRaw === 'string' && emojiRaw.trim() ? emojiRaw.trim() : undefined;

  return {
    activityId,
    ticketNo: String(redeemedAt).replace(/\D/g, '').slice(-6) || String(redeemedAt).slice(-6),
    redeemedAt,
    studentId: student.id,
    studentName: `${displayFirst} ${student.lastName}`.trim(),
    studentNickname: nick && legalFirst && displayFirst.trim() !== legalFirst ? legalFirst : undefined,
    studentEmoji,
    prizeName: prize.name,
    prizeIcon: prize.icon || 'Gift',
    quantity,
    totalCost,
    voucherScanCode: options.voucherScanCode,
    ...options.aiSurprise,
  };
}
