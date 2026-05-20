'use client';

import { ChevronDown, Loader2, Printer, Trash2, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Class, Student, Teacher } from '@/lib/types';

type StudentBulkActionsMenuProps = {
  selectedStudents: Student[];
  classes: Class[] | undefined;
  teachers: Teacher[] | undefined;
  bulkBusy: boolean;
  isBulkDeleting: boolean;
  hasWelcomeBackToggle: boolean;
  hasWelcomeStyleToggle: boolean;
  onOpenIdPrintSetup: (args: { students: Student[]; classes: Class[] }) => void;
  onPurgeOpen: () => void;
  onBulkDelete: () => void;
  bulkUpdateSelected: (
    label: string,
    patch: (s: Student) => Partial<Student> | null,
  ) => Promise<void>;
};

export function StudentBulkActionsMenu({
  selectedStudents,
  classes,
  teachers,
  bulkBusy,
  isBulkDeleting,
  hasWelcomeBackToggle,
  hasWelcomeStyleToggle,
  onOpenIdPrintSetup,
  onPurgeOpen,
  onBulkDelete,
  bulkUpdateSelected,
}: StudentBulkActionsMenuProps) {
  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={bulkBusy}
            className="h-9 gap-1 rounded-xl px-3 text-xs font-semibold"
          >
            {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Actions
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem
            disabled={bulkBusy}
            onSelect={() => onOpenIdPrintSetup({ students: selectedStudents, classes: classes || [] })}
          >
            <Printer className="mr-2 h-4 w-4" />
            Print IDs
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={bulkBusy}
            className="text-amber-800 focus:text-amber-800 dark:text-amber-200"
            onSelect={onPurgeOpen}
          >
            <Zap className="mr-2 h-4 w-4" />
            Purge points & badges
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={bulkBusy || isBulkDeleting}
            className="text-destructive focus:text-destructive"
            onSelect={() => void onBulkDelete()}
          >
            {isBulkDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete students
          </DropdownMenuItem>
          {teachers && teachers.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Add teacher</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                  {teachers.map((t) => (
                    <DropdownMenuItem
                      key={`add-${t.id}`}
                      disabled={bulkBusy}
                      onSelect={() =>
                        void bulkUpdateSelected('Teachers added', (s) => {
                          const current = s.teacherIds || [];
                          if (current.includes(t.id)) return null;
                          return { ...s, teacherIds: [...current, t.id] };
                        })
                      }
                    >
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Remove teacher</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                  {teachers.map((t) => (
                    <DropdownMenuItem
                      key={`remove-${t.id}`}
                      disabled={bulkBusy}
                      onSelect={() =>
                        void bulkUpdateSelected('Teachers removed', (s) => {
                          const current = s.teacherIds || [];
                          if (!current.includes(t.id)) return null;
                          return { ...s, teacherIds: current.filter((id) => id !== t.id) };
                        })
                      }
                    >
                      {t.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : null}
          {classes && classes.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>Move to class</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                  {classes.map((c) => (
                    <DropdownMenuItem
                      key={c.id}
                      disabled={bulkBusy}
                      onSelect={() =>
                        void bulkUpdateSelected('Class updated', (s) => {
                          if (s.classId === c.id) return null;
                          return { ...s, classId: c.id };
                        })
                      }
                    >
                      {c.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </>
          ) : null}
          {hasWelcomeBackToggle || hasWelcomeStyleToggle ? <DropdownMenuSeparator /> : null}
          {hasWelcomeBackToggle ? (
            <>
              <DropdownMenuItem
                disabled={bulkBusy}
                onSelect={() =>
                  void bulkUpdateSelected('Welcome splash enabled', (s) =>
                    s.welcomeBackScreenEnabled === true ? null : { ...s, welcomeBackScreenEnabled: true },
                  )
                }
              >
                Enable welcome splash
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={bulkBusy}
                onSelect={() =>
                  void bulkUpdateSelected('Welcome splash disabled', (s) =>
                    s.welcomeBackScreenEnabled === false ? null : { ...s, welcomeBackScreenEnabled: false },
                  )
                }
              >
                Disable welcome splash
              </DropdownMenuItem>
            </>
          ) : null}
          {hasWelcomeStyleToggle ? (
            <>
              <DropdownMenuItem
                disabled={bulkBusy}
                onSelect={() =>
                  void bulkUpdateSelected('Style welcome enabled', (s) =>
                    s.welcomePageEnabled === true ? null : { ...s, welcomePageEnabled: true },
                  )
                }
              >
                Enable style welcome
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={bulkBusy}
                onSelect={() =>
                  void bulkUpdateSelected('Style welcome disabled', (s) =>
                    s.welcomePageEnabled === false ? null : { ...s, welcomePageEnabled: false },
                  )
                }
              >
                Disable style welcome
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
