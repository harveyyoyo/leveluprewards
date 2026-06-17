'use client';

import { Mail, Phone } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { SssStudent } from '@/lib/sss/types';
import { getSssStudentFullName } from '@/lib/sss/sssUtils';

export function SssStudentSheet({
  student,
  open,
  onOpenChange,
}: {
  student: SssStudent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!student) return null;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{getSssStudentFullName(student)}</SheetTitle>
          <SheetDescription>
            {student.sourceSchool || 'No school'}
            {student.dateOfBirth ? ` · DOB ${student.dateOfBirth}` : ''}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4 text-sm">
          {student.homeAddress ? <p><span className="text-muted-foreground">Address:</span> {student.homeAddress}</p> : null}
          {(student.parent1Name || student.parent2Name) ? (
            <p><span className="text-muted-foreground">Parents:</span> {[student.parent1Name, student.parent2Name].filter(Boolean).join(' · ')}</p>
          ) : null}
          {student.email1 ? <a href={`mailto:${student.email1}`} className="flex gap-1.5 items-center"><Mail className="h-3.5 w-3.5" />{student.email1}</a> : null}
          {student.email2 ? <a href={`mailto:${student.email2}`} className="flex gap-1.5 items-center"><Mail className="h-3.5 w-3.5" />{student.email2}</a> : null}
          {(student.contacts ?? []).map((c, i) =>
            c.phone ? (
              <a key={i} href={`tel:${c.phone.replace(/\s/g, '')}`} className="flex gap-1.5 items-center text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                {c.label ? `${c.label}: ` : ''}{c.phone}
              </a>
            ) : null,
          )}
          {(student.providers ?? []).map((p) => (
            <p key={p.name}>{p.name}{p.hours != null ? ` · ${p.hours}h` : ''}</p>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
