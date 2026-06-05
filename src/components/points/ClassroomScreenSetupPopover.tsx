'use client';

import { Monitor, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CLASSROOM_SCREEN_MODULE_LABELS,
  loadClassroomScreenPrefs,
  openClassroomScreenTab,
  saveClassroomScreenPrefs,
  type ClassroomScreenModule,
  type ClassroomScreenPrefs,
} from '@/lib/classroomScreen';
import { CLASSROOM_DESIGNS } from '@/components/points/classroomVisualTheme';
import { normalizeClassroomDesign } from '@/lib/classroomSeatingChart';

type Props = {
  schoolId: string;
  scope: string;
  classId: string;
  className?: string;
  disabled?: boolean;
};

export function ClassroomScreenSetupPopover({
  schoolId,
  scope,
  classId,
  className,
  disabled,
}: Props) {
  const prefs = loadClassroomScreenPrefs(schoolId, scope, classId);

  const update = (patch: Partial<ClassroomScreenPrefs>) => {
    const next = { ...loadClassroomScreenPrefs(schoolId, scope, classId), ...patch };
    saveClassroomScreenPrefs(schoolId, scope, classId, next);
  };

  const toggleModule = (key: ClassroomScreenModule, on: boolean) => {
    const current = loadClassroomScreenPrefs(schoolId, scope, classId);
    update({ modules: { ...current.modules, [key]: on } });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
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
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="end">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold">
            <Settings2 className="h-4 w-4" aria-hidden />
            Classroom room display
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Project on your classroom monitor — session leaderboard, message, and clock. Not the hallway
            Smart Screen.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="classroom-screen-title" className="text-xs font-bold uppercase text-muted-foreground">
            Headline
          </Label>
          <Input
            id="classroom-screen-title"
            defaultValue={prefs.title}
            onBlur={(e) => update({ title: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="classroom-screen-message" className="text-xs font-bold uppercase text-muted-foreground">
            Daily message
          </Label>
          <Input
            id="classroom-screen-message"
            defaultValue={prefs.message}
            onBlur={(e) => update({ message: e.target.value })}
            className="rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase text-muted-foreground">Seating chart style</Label>
          <p className="text-[11px] leading-snug text-muted-foreground">
            Matches desk styling on the room display. Light and dark mode follow app settings.
          </p>
          <Select
            defaultValue={normalizeClassroomDesign(prefs.design)}
            onValueChange={(v) => update({ design: v as ClassroomScreenPrefs['design'] })}
          >
            <SelectTrigger className="rounded-xl">
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
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-muted-foreground">Show on display</p>
          {(Object.keys(CLASSROOM_SCREEN_MODULE_LABELS) as ClassroomScreenModule[]).map((key) => (
            <label key={key} className="flex items-start gap-2 rounded-lg border p-2 cursor-pointer">
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
        <Button
          type="button"
          className="w-full rounded-xl"
          onClick={() => openClassroomScreenTab({ schoolId, classId, scope })}
        >
          Open room display
        </Button>
      </PopoverContent>
    </Popover>
  );
}
