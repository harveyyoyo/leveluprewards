/** Index for direct-to-card print jobs that print one physical card per browser print dialog. */
export type DtcPrintIndex = {
  dtcIndex?: number;
};

export function dtcPrintIndex(job: DtcPrintIndex | null | undefined): number {
  return job?.dtcIndex ?? 0;
}

export function nextDtcPrintIndex(currentIndex: number, total: number): number | null {
  const next = currentIndex + 1;
  return next < total ? next : null;
}

export const DTC_MULTI_CARD_START_TOAST = {
  title: 'Multiple cards queued',
  description:
    'The print dialog opens once per card. Click Print for each one until all cards are done.',
} as const;

export function dtcCardProgressToast(currentIndex: number, total: number) {
  return {
    title: `Card ${currentIndex + 1} of ${total}`,
    description: 'Click Print in the dialog for the next card.',
  };
}
