'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  OrphanSelectItem,
  isOrphanSelectValue,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OfficeTeacher } from '@/lib/office/types';
import Link from 'next/link';
import { officePublicHref } from '@/lib/officePublicUrl';

type OfficeTeacherSelectProps = {
  schoolId: string;
  teachers: OfficeTeacher[];
  value?: string;
  values?: string[];
  onChange?: (teacherId: string) => void;
  onValuesChange?: (teacherIds: string[]) => void;
  label?: string;
  showManageLink?: boolean;
  multiple?: boolean;
};

export function OfficeTeacherSelect({
  schoolId,
  teachers,
  value = '',
  values = [],
  onChange,
  onValuesChange,
  label = 'Homeroom teacher',
  showManageLink = true,
  multiple = false,
}: OfficeTeacherSelectProps) {
  const sorted = [...teachers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  const currentValues = multiple ? values : (value ? [value] : []);
  const isOrphanedValue = !multiple && isOrphanSelectValue(value, teachers, {
    excludeValues: ['__none__'],
    requireNonEmptyOptions: true,
  });

  const handleSelect = (v: string) => {
    if (multiple) {
      if (v !== '__none__' && !currentValues.includes(v)) {
        onValuesChange?.([...currentValues, v]);
      }
    } else {
      onChange?.(v === '__none__' ? '' : v);
    }
  };

  const removeValue = (idToRemove: string) => {
    if (multiple) {
      onValuesChange?.(currentValues.filter(id => id !== idToRemove));
    }
  };

  const makePrimary = (idToMakePrimary: string) => {
    // No-op - primary feature removed to simplify for schools
  };

  const currentTeacherId = multiple ? (currentValues[0] ?? '') : (value || '');

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        {showManageLink && teachers.length === 0 ? (
          <Link
            href={officePublicHref(schoolId, 'teachers')}
            className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            Add teachers
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        <Select 
          value={multiple ? '__none__' : (value || '__none__')} 
          onValueChange={handleSelect}
        >
          <SelectTrigger className="rounded-xl">
            <SelectValue placeholder={teachers.length ? (multiple && currentValues.length > 0 ? 'Add another teacher' : 'Select teacher') : 'No teachers yet'} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              {multiple ? 'Select a teacher...' : 'No teacher assigned'}
            </SelectItem>
            {!multiple && <OrphanSelectItem value={value} entityName="teacher" show={isOrphanedValue} />}
            {sorted
              .filter(t => !multiple || !currentValues.includes(t.id))
              .map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {multiple && currentValues.length > 0 && (
          <div className="flex flex-col gap-2 mt-2">
            {currentValues.map((id, index) => (
              <div key={id} className="flex items-center justify-between gap-1 bg-slate-50 border px-3 py-2 rounded-xl text-sm dark:bg-slate-900/50">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{teachers.find(t => t.id === id)?.name || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    type="button" 
                    onClick={() => removeValue(id)}
                    className="text-muted-foreground hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label="Remove teacher"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {teachers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add classroom teachers under Teachers so students can be assigned before recording grades.
        </p>
      ) : null}
      {!multiple && currentTeacherId && (
        <p className="text-xs text-muted-foreground italic">
          This teacher is assigned to this student only. To assign a whole class, use the Classes tab.
        </p>
      )}
    </div>
  );
}
