import type { OfficeSettings } from '@/lib/office/types';

export type OfficeMarksLabels = {
  /** Nav + page title: "Marks" or "Grades" */
  section: string;
  /** Singular: "mark" or "grade" */
  singular: string;
  /** Plural: "marks" or "grades" */
  plural: string;
  /** Verb phrase: "Enter marks" or "Enter grades" */
  enterAction: string;
  /** Missing work: "missing marks" or "missing grades" */
  missing: string;
};

const GRADES_LABELS: OfficeMarksLabels = {
  section: 'Grades',
  singular: 'grade',
  plural: 'grades',
  enterAction: 'Enter grades',
  missing: 'missing grades',
};

const MARKS_LABELS: OfficeMarksLabels = {
  section: 'Marks',
  singular: 'mark',
  plural: 'marks',
  enterAction: 'Enter marks',
  missing: 'missing marks',
};

export function officeUsesMarksTerminology(settings: Pick<OfficeSettings, 'useMarksTerminology'> | null | undefined): boolean {
  return settings?.useMarksTerminology === true;
}

export function getOfficeMarksLabels(
  settings: Pick<OfficeSettings, 'useMarksTerminology'> | null | undefined,
): OfficeMarksLabels {
  return officeUsesMarksTerminology(settings) ? MARKS_LABELS : GRADES_LABELS;
}

export function defaultOfficeFeatureFlags(): Required<NonNullable<OfficeSettings['features']>> {
  return {
    familyProfiles: true,
    studentPhotos: true,
    busInfo: true,
    medicalNotes: true,
    aiHelp: true,
    auditLog: true,
  };
}

export function resolveOfficeFeatureFlags(
  settings: Pick<OfficeSettings, 'features'> | null | undefined,
): Required<NonNullable<OfficeSettings['features']>> {
  return { ...defaultOfficeFeatureFlags(), ...(settings?.features ?? {}) };
}

export function isOfficeFeatureEnabled(
  settings: Pick<OfficeSettings, 'features'> | null | undefined,
  key: keyof NonNullable<OfficeSettings['features']>,
): boolean {
  return resolveOfficeFeatureFlags(settings)[key];
}
