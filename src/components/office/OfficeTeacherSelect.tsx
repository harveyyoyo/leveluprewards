'use client';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { OfficeTeacher } from '@/lib/office/types';
import Link from 'next/link';
import { officePublicHref } from '@/lib/officePublicUrl';

type OfficeTeacherSelectProps = {
  schoolId: string;
  teachers: OfficeTeacher[];
  value: string;
  onChange: (teacherId: string) => void;
  label?: string;
  showManageLink?: boolean;
};

export function OfficeTeacherSelect({
  schoolId,
  teachers,
  value,
  onChange,
  label = 'Homeroom teacher',
  showManageLink = true,
}: OfficeTeacherSelectProps) {
  const sorted = [...teachers].sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  // Orphaned teacherId (teacher deleted). Only flag once the teacher list has loaded
  // so the fallback doesn't flash while data is still streaming in.
  const isOrphanedValue =
    Boolean(value) && value !== '__none__' && teachers.length > 0 && !teachers.some((t) => t.id === value);

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
      <Select value={value || '__none__'} onValueChange={(v) => onChange(v === '__none__' ? '' : v)}>
        <SelectTrigger className="rounded-xl">
          <SelectValue placeholder={teachers.length ? 'Select teacher' : 'No teachers yet'} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">No teacher assigned</SelectItem>
          {isOrphanedValue ? <SelectItem value={value}>Unknown teacher (deleted)</SelectItem> : null}
          {sorted.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {teachers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add classroom teachers under Teachers so students can be assigned before recording grades.
        </p>
      ) : null}
    </div>
  );
}
