'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClassroomSectionFrame } from '@/components/classroom/ClassroomSectionFrame';
import { ClassroomRoomDisplayView } from '@/components/points/ClassroomRoomDisplayView';
import { CLASSROOM_DESIGNS } from '@/components/points/classroomVisualTheme';
import { normalizeClassroomDesign } from '@/lib/classroomSeatingChart';
import {
  CLASSROOM_SCREEN_MODULE_LABELS,
  loadClassroomScreenPrefs,
  openClassroomScreenTab,
  saveClassroomScreenPrefs,
  type ClassroomScreenModule,
  type ClassroomScreenPrefs,
} from '@/lib/classroomScreen';
import type { Class, Student } from '@/lib/types';

type ClassroomRoomDisplaySectionProps = {
  schoolId: string;
  scope: string;
  classes: Class[];
  students: Student[];
};

export function ClassroomRoomDisplaySection({
  schoolId,
  scope,
  classes,
  students,
}: ClassroomRoomDisplaySectionProps) {
  const [classId, setClassId] = useState(() => classes[0]?.id ?? '');
  const [prefsVersion, setPrefsVersion] = useState(0);

  const effectiveClassId = classes.some((c) => c.id === classId) ? classId : (classes[0]?.id ?? '');
  const classLabel = classes.find((c) => c.id === effectiveClassId)?.name;
  const classStudents = useMemo(
    () => (effectiveClassId ? students.filter((s) => s.classId === effectiveClassId) : []),
    [students, effectiveClassId],
  );

  const prefs = loadClassroomScreenPrefs(schoolId, scope, effectiveClassId);

  const update = (patch: Partial<ClassroomScreenPrefs>) => {
    if (!effectiveClassId) return;
    const next = { ...loadClassroomScreenPrefs(schoolId, scope, effectiveClassId), ...patch };
    saveClassroomScreenPrefs(schoolId, scope, effectiveClassId, next);
    setPrefsVersion((v) => v + 1);
  };

  const toggleModule = (key: ClassroomScreenModule, on: boolean) => {
    if (!effectiveClassId) return;
    const current = loadClassroomScreenPrefs(schoolId, scope, effectiveClassId);
    update({ modules: { ...current.modules, [key]: on } });
  };

  if (!classes.length) {
    return (
      <ClassroomSectionFrame
        title="Room display"
        icon={Monitor}
        description="Mirror the live class session on a projector, interactive board, or classroom monitor."
      >
        <p className="rounded-xl border border-dashed bg-muted/20 px-4 py-5 text-sm text-muted-foreground">
          Add a class and students before setting up the room display.
        </p>
      </ClassroomSectionFrame>
    );
  }

  return (
    <ClassroomSectionFrame
      title="Room display"
      icon={Monitor}
      description="Read-only view for your projector or classroom monitor. Session points update as you award on the seating chart."
      headerExtra={
        <Button
          type="button"
          size="sm"
          className="shrink-0 rounded-xl"
          disabled={!effectiveClassId}
          onClick={() =>
            openClassroomScreenTab({ schoolId, classId: effectiveClassId, scope })
          }
        >
          <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
          Open on monitor
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-[12rem] flex-1 space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Class
            </Label>
            <Select value={effectiveClassId} onValueChange={setClassId}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Choose class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground sm:max-w-md sm:pb-2">
            Display URL:{' '}
            <span className="font-mono text-foreground">
              /{schoolId}/classroom-screen?classId={effectiveClassId || '…'}
            </span>
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">
              What the room sees
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="room-tab-title" className="text-xs font-semibold">
                  Headline
                </Label>
                <Input
                  id="room-tab-title"
                  key={`title-${effectiveClassId}-${prefs.title}`}
                  defaultValue={prefs.title}
                  onBlur={(e) => update({ title: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="room-tab-message" className="text-xs font-semibold">
                  Daily message
                </Label>
                <Input
                  id="room-tab-message"
                  key={`message-${effectiveClassId}-${prefs.message}`}
                  defaultValue={prefs.message}
                  onBlur={(e) => update({ message: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">Style</Label>
                <Select
                  key={`design-${effectiveClassId}-${prefs.design}`}
                  defaultValue={normalizeClassroomDesign(prefs.design)}
                  onValueChange={(v) => update({ design: v as ClassroomScreenPrefs['design'] })}
                >
                  <SelectTrigger className="h-9 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASSROOM_DESIGNS.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(CLASSROOM_SCREEN_MODULE_LABELS) as ClassroomScreenModule[]).map((key) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border bg-background p-2"
                >
                  <Checkbox
                    defaultChecked={prefs.modules[key]}
                    onCheckedChange={(v) => toggleModule(key, v === true)}
                    className="mt-0.5"
                  />
                  <span className="text-xs">
                    <span className="font-semibold">{CLASSROOM_SCREEN_MODULE_LABELS[key].label}</span>
                    <span className="block text-muted-foreground">
                      {CLASSROOM_SCREEN_MODULE_LABELS[key].description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border shadow-inner">
            <ClassroomRoomDisplayView
              key={`${effectiveClassId}-${prefsVersion}`}
              schoolId={schoolId}
              scope={scope}
              classId={effectiveClassId}
              classLabel={classLabel}
              students={classStudents}
              embedded
              className="min-h-[min(52vh,480px)]"
            />
          </div>
        </div>
      </div>
    </ClassroomSectionFrame>
  );
}
