'use client';

import { useState } from 'react';
import { ExternalLink, Monitor, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import type { Student } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  schoolId: string;
  scope: string;
  classId: string;
  classLabel?: string;
  students?: Student[];
  className?: string;
  disabled?: boolean;
};

export function ClassroomRoomDisplayDialog({
  schoolId,
  scope,
  classId,
  classLabel,
  students,
  className,
  disabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [prefsVersion, setPrefsVersion] = useState(0);

  const prefs = loadClassroomScreenPrefs(schoolId, scope, classId);

  const update = (patch: Partial<ClassroomScreenPrefs>) => {
    const next = { ...loadClassroomScreenPrefs(schoolId, scope, classId), ...patch };
    saveClassroomScreenPrefs(schoolId, scope, classId, next);
    setPrefsVersion((v) => v + 1);
  };

  const toggleModule = (key: ClassroomScreenModule, on: boolean) => {
    const current = loadClassroomScreenPrefs(schoolId, scope, classId);
    update({ modules: { ...current.modules, [key]: on } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={className}
          disabled={disabled || !classId || classId === 'all'}
        >
          <Monitor className="mr-2 h-4 w-4" aria-hidden />
          Room display
        </Button>
      </DialogTrigger>
      <DialogContent
        wide
        overlayClassName="z-[200]"
        className={cn(
          'z-[210] flex max-h-none flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl',
          'inset-3 sm:inset-6 md:inset-8',
        )}
      >
        <DialogHeader className="shrink-0 space-y-0 border-b px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
            <div>
              <DialogTitle className="text-left text-lg">Classroom room display</DialogTitle>
              <DialogDescription className="text-left text-xs">
                Live preview for your projector or TV. Awards update as you tap the seating chart.
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={showSettings ? 'secondary' : 'outline'}
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => setShowSettings((v) => !v)}
              >
                <Settings2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Settings
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg text-xs"
                onClick={() => openClassroomScreenTab({ schoolId, classId, scope })}
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Open on TV
              </Button>
            </div>
          </div>
        </DialogHeader>

        {showSettings ? (
          <div className="shrink-0 max-h-[40vh] space-y-3 overflow-y-auto border-b bg-muted/30 px-4 py-3 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="room-display-title" className="text-xs font-bold uppercase text-muted-foreground">
                  Headline
                </Label>
                <Input
                  id="room-display-title"
                  defaultValue={prefs.title}
                  onBlur={(e) => update({ title: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="room-display-message" className="text-xs font-bold uppercase text-muted-foreground">
                  Daily message
                </Label>
                <Input
                  id="room-display-message"
                  defaultValue={prefs.message}
                  onBlur={(e) => update({ message: e.target.value })}
                  className="h-9 rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Style</Label>
              <Select
                defaultValue={normalizeClassroomDesign(prefs.design)}
                onValueChange={(v) => update({ design: v as ClassroomScreenPrefs['design'] })}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[300]">
                  {CLASSROOM_DESIGNS.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        ) : null}

        <div className="min-h-0 flex-1 p-3 sm:p-4">
          <ClassroomRoomDisplayView
            key={prefsVersion}
            schoolId={schoolId}
            scope={scope}
            classId={classId}
            classLabel={classLabel}
            students={students}
            embedded
            className="h-full min-h-[min(50vh,420px)]"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
