'use client';

import React, { useMemo, useState } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSettings } from '@/components/providers/SettingsProvider';

export type AttendanceWizardVariant = 'admin' | 'teacher';

type WalkStep = {
  title: string;
  checklist: string[];
  /** Concrete sample values users can mirror */
  example?: { heading: string; rows: string[] };
};

const ADMIN_WALKTHROUGH: WalkStep[] = [
  {
    title: 'Switch attendance on',
    checklist: [
      'Open Settings (gear icon).',
      'Turn on Attendance so the kiosk and teacher tab can record sign-ins.',
    ],
    example: {
      heading: 'You are done with this step when',
      rows: ['Attendance toggle = ON in Settings.'],
    },
  },
  {
    title: 'Add two example periods',
    checklist: [
      'In this tab, under Universal Periods, add two rows (you can rename later).',
      'Use 24-hour times so the kiosk clock matches the schedule.',
    ],
    example: {
      heading: 'Example to type in',
      rows: [
        'Period 1 — 08:00 to 08:45',
        'Period 2 — 08:50 to 09:35',
      ],
    },
  },
  {
    title: 'Hook a class to a teacher',
    checklist: [
      'Open Classes (or your class editor) and set Primary teacher on at least one class.',
      'That teacher will create reward rules for their classes.',
    ],
    example: {
      heading: 'Minimal test setup',
      rows: ['One class, e.g. "Room 101", with you or a teacher as primary.'],
    },
  },
  {
    title: 'Smoke-test the kiosk',
    checklist: [
      'Open the Student page on this device.',
      'Pick a student in that class and sign in during Period 1 or 2.',
      'You should see points or a short message if something is still missing.',
    ],
    example: {
      heading: 'If no points yet',
      rows: [
        'Teacher: add one Attendance reward rule for that class + period.',
        'Or configure legacy attendance under that teacher in Admin.',
      ],
    },
  },
];

const TEACHER_WALKTHROUGH: WalkStep[] = [
  {
    title: 'Confirm periods exist',
    checklist: [
      'Bell times come from the school (Admin - Attendance - Universal Periods).',
      'If the list is empty, ask an admin to add at least one period before rules work.',
    ],
    example: {
      heading: 'What you need from admin',
      rows: ['At least one period, e.g. Period 1: 08:00 - 08:45.'],
    },
  },
  {
    title: 'Add one example rule',
    checklist: [
      'In Attendance Rewards below, add a rule for one of your classes.',
      'Pick the period that matches when students arrive (or use Custom times).',
    ],
    example: {
      heading: 'Example rule you can copy',
      rows: [
        'Class: your morning class',
        'Period: Period 1 (or custom 08:00 - 08:45)',
        'Sign-in: 5 pts — On-time extra: 2 pts — On-time window: 10 minutes',
      ],
    },
  },
  {
    title: 'Try the kiosk once',
    checklist: [
      'Go to the Student page.',
      'Sign in as a student from that class while the period clock is inside the window.',
      'Points should appear once per class per period per day.',
    ],
    example: {
      heading: 'Tip',
      rows: ['Test inside the period window first; outside the window the rule will not match.'],
    },
  },
];

export function AttendanceSetupWizard({ variant }: { variant: AttendanceWizardVariant }) {
  const { settings } = useSettings();
  const steps = useMemo(() => (variant === 'admin' ? ADMIN_WALKTHROUGH : TEACHER_WALKTHROUGH), [variant]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const step = steps[idx];
  const last = idx >= steps.length - 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) setIdx(0);
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2 shrink-0">
          <BookOpen className="w-4 h-4" />
          Example walkthrough
        </Button>
      </DialogTrigger>
      <DialogContent size="sm" data-settings-open="true">
        <DialogHeader>
          <DialogTitle className="text-lg">Attendance: quick example setup</DialogTitle>
          <DialogDescription className="text-xs">
            Step {idx + 1} of {steps.length}
            {typeof settings.enableAttendance === 'boolean' ? (
              <span className="text-foreground font-medium">
                {' '}
                - Attendance is {settings.enableAttendance ? 'on' : 'off'} in Settings
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-semibold text-sm">{step.title}</p>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            {step.checklist.map((line, i) => (
              <li key={i} className="pl-1 marker:font-medium marker:text-foreground">
                {line}
              </li>
            ))}
          </ol>
          {step.example ? (
            <div className="rounded-lg border bg-muted/40 px-3 py-2 text-xs space-y-1.5">
              <p className="font-medium text-foreground">{step.example.heading}</p>
              <ul className="space-y-1 font-mono text-[11px] leading-snug text-foreground/90">
                {step.example.rows.map((row, i) => (
                  <li key={i}>{row}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="flex justify-between gap-2 pt-2">
          <Button type="button" variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx((i) => Math.max(0, i - 1))} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
          {last ? (
            <Button type="button" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
          ) : (
            <Button type="button" size="sm" onClick={() => setIdx((i) => Math.min(steps.length - 1, i + 1))} className="gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
