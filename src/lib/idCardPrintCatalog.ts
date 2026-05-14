/**
 * Catalog of supported ID card printer families and paper/stock options.
 * Extend here when new print sheet layouts or hardware paths are implemented.
 */

export type IdCardPrinterFamilyId = 'browser_sheet' | 'dtc4500e';

export interface IdCardPrintProfile {
  id: string;
  name: string;
  family: IdCardPrinterFamilyId;
  paperId: string;
  createdAt?: number;
}

export const ID_CARD_FAMILIES: Array<{
  id: IdCardPrinterFamilyId;
  label: string;
  shortDescription: string;
}> = [
  {
    id: 'browser_sheet',
    label: 'Browser / office printer',
    shortDescription: 'Uses the browser print dialog (PDF or any connected printer). Best for sheet labels.',
  },
  {
    id: 'dtc4500e',
    label: 'Direct-to-card (DTC)',
    shortDescription: 'CR80 card stock — one physical card per student. Queue prints one card at a time.',
  },
];

export const ID_CARD_PAPERS: Record<
  IdCardPrinterFamilyId,
  Array<{ id: string; label: string; detail: string }>
> = {
  browser_sheet: [
    {
      id: 'avery25395_8up_letter',
      label: 'Avery 25395 — 8 cards per letter sheet',
      detail:
        'Matches the current layout (2×4). In the print dialog, use actual size / no scaling if edges are off.',
    },
  ],
  dtc4500e: [
    {
      id: 'cr80_iso_id1',
      label: 'CR80 / ISO ID-1 (85.6 × 53.98 mm)',
      detail: 'Standard credit-card size. Each student is printed on its own page.',
    },
  ],
};

export function isValidPaperForFamily(family: IdCardPrinterFamilyId, paperId: string): boolean {
  return ID_CARD_PAPERS[family].some((p) => p.id === paperId);
}

/** Maps catalog choices to the existing print pipeline (PrintProvider). */
export function idCardJobPrinterOptions(family: IdCardPrinterFamilyId): { printerType?: 'dtc4500e' } {
  if (family === 'dtc4500e') return { printerType: 'dtc4500e' };
  return {};
}

export function defaultPaperForFamily(family: IdCardPrinterFamilyId): string {
  return ID_CARD_PAPERS[family][0]?.id ?? '';
}

/** Settings subset used to resolve which ID card print pipeline to use (browser sheet vs DTC). */
export type IdCardPrintSettingsInput = {
  idCardPrintProfiles?: IdCardPrintProfile[];
  lastIdCardPrintProfileId?: string;
  idCardPrinterFamily?: IdCardPrinterFamilyId;
  idCardPaperId?: string;
};

/**
 * Resolves the active printer family from school settings (saved profile, explicit choice, or fallback).
 * Matches the priority used when printing ID cards from Admin → Students.
 */
export function resolveIdCardPrinterFamily(settings: IdCardPrintSettingsInput): IdCardPrinterFamilyId {
  const profiles = settings.idCardPrintProfiles ?? [];
  const lastId = settings.lastIdCardPrintProfileId;
  const match = lastId ? profiles.find((p) => p.id === lastId) : undefined;
  if (match && isValidPaperForFamily(match.family, match.paperId)) {
    return match.family;
  }
  const fam = settings.idCardPrinterFamily;
  const paperId = settings.idCardPaperId;
  if (fam && paperId && isValidPaperForFamily(fam, paperId)) {
    return fam;
  }
  if (profiles.length > 0) {
    const sorted = [...profiles].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    const p = sorted.find((x) => isValidPaperForFamily(x.family, x.paperId));
    if (p) return p.family;
  }
  return 'browser_sheet';
}

/** Options passed into the student ID print pipeline (`PrintProvider`). */
export function resolveIdCardPrintJobOptions(settings: IdCardPrintSettingsInput): { printerType?: 'dtc4500e' } {
  return idCardJobPrinterOptions(resolveIdCardPrinterFamily(settings));
}
