import type {
  OfficeCustomFieldDef,
  OfficeCustomFieldType,
  OfficeCustomFieldValue,
  OfficeStudent,
} from '@/lib/office/types';

export type OfficeStudentDetailKey =
  | 'studentNumber'
  | 'gender'
  | 'enrollmentDate'
  | 'previousSchool'
  | 'homeLanguage'
  | 'allergies'
  | 'healthNotes'
  | 'pickupNotes';

/** Built-in optional student details, in the order they're shown and edited. */
export const OFFICE_STUDENT_DETAIL_FIELDS: Array<{
  key: OfficeStudentDetailKey;
  label: string;
  type: 'text' | 'longText' | 'date';
  placeholder?: string;
}> = [
  { key: 'studentNumber', label: 'Student ID number', type: 'text' },
  { key: 'gender', label: 'Gender', type: 'text' },
  { key: 'enrollmentDate', label: 'Enrollment date', type: 'date' },
  { key: 'previousSchool', label: 'Previous school', type: 'text' },
  { key: 'homeLanguage', label: 'Language at home', type: 'text' },
  { key: 'allergies', label: 'Allergies', type: 'text', placeholder: 'e.g. peanuts, penicillin' },
  { key: 'healthNotes', label: 'Health notes', type: 'longText', placeholder: 'Conditions, medication, needs' },
  { key: 'pickupNotes', label: 'Pickup & dismissal', type: 'longText', placeholder: 'Who may pick up, carpool, early days' },
];

export const OFFICE_CUSTOM_FIELD_TYPES: Array<{ type: OfficeCustomFieldType; label: string }> = [
  { type: 'text', label: 'Short text' },
  { type: 'longText', label: 'Long text' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
  { type: 'yesNo', label: 'Yes / No' },
  { type: 'choice', label: 'Pick from a list' },
];

export function newOfficeCustomFieldId(): string {
  return `cf_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** How a saved value reads on the student card; null when there's nothing to show. */
export function formatOfficeFieldValue(
  type: OfficeCustomFieldType | 'text' | 'longText' | 'date',
  value: OfficeCustomFieldValue | undefined,
): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (type === 'yesNo') return value === true ? 'Yes' : value === false ? 'No' : null;
  if (type === 'date' && typeof value === 'string') {
    const d = new Date(`${value}T00:00:00`);
    return Number.isNaN(d.getTime())
      ? value
      : d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  }
  return String(value);
}

/** Turns what was typed in the form into the stored value (numbers as numbers, blanks as null). */
export function parseOfficeFieldInput(type: OfficeCustomFieldType, raw: string | boolean | null): OfficeCustomFieldValue {
  if (type === 'yesNo') return typeof raw === 'boolean' ? raw : null;
  const text = typeof raw === 'string' ? raw.trim() : '';
  if (!text) return null;
  if (type === 'number') {
    const n = Number(text);
    return Number.isFinite(n) ? n : null;
  }
  return text;
}

/** Filled-in details (built-in and custom) for display, skipping empty ones and hidden custom fields. */
export function officeStudentFilledDetails(
  student: OfficeStudent,
  customDefs: OfficeCustomFieldDef[],
): Array<{ label: string; value: string; long: boolean }> {
  const rows: Array<{ label: string; value: string; long: boolean }> = [];
  for (const f of OFFICE_STUDENT_DETAIL_FIELDS) {
    if (f.key === 'allergies') continue; // shown as its own highlighted line
    const value = formatOfficeFieldValue(f.type, student[f.key] ?? null);
    if (value) rows.push({ label: f.label, value, long: f.type === 'longText' });
  }
  for (const def of customDefs) {
    if (def.archived) continue;
    const value = formatOfficeFieldValue(def.type, student.customFields?.[def.id]);
    if (value) rows.push({ label: def.label, value, long: def.type === 'longText' });
  }
  return rows;
}
