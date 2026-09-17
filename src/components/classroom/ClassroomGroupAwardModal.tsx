'use client';

import { useMemo, useState } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  extractLayoutGroups,
  type ClassroomSeatingGroup,
  type ClassroomSeatingLayout,
} from '@/lib/classroomSeatingChart';
import type { Student } from '@/lib/types';
import { getStudentNickname } from '@/lib/utils';


type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  layout: ClassroomSeatingLayout | null;
  students: Student[];
  frontAtBottom?: boolean;
  defaultPoints: number;
  icon?: string;
  onAwardGroup: (studentIds: string[], groupName: string, points: number) => Promise<void> | void;
};

export function ClassroomGroupAwardModal({
  open,
  onOpenChange,
  layout,
  students,
  frontAtBottom = false,
  defaultPoints,
  icon = 'pts',
  onAwardGroup,
}: Props) {
  const [awardAmount, setAwardAmount] = useState<number>(defaultPoints);
  const [activeTab, setActiveTab] = useState<'table' | 'row'>('table');
  const [awardingGroupId, setAwardingGroupId] = useState<string | null>(null);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const allGroups = useMemo(() => {
    if (!layout) return [];
    return extractLayoutGroups(layout, frontAtBottom);
  }, [layout, frontAtBottom]);

  const tableGroups = useMemo(() => allGroups.filter((g) => g.type === 'table'), [allGroups]);
  const rowGroups = useMemo(() => allGroups.filter((g) => g.type === 'row'), [allGroups]);

  // If no table groups found, default to rows
  const effectiveTab = activeTab === 'table' && tableGroups.length === 0 ? 'row' : activeTab;
  const currentGroups = effectiveTab === 'table' ? tableGroups : rowGroups;

  const handleAward = async (group: ClassroomSeatingGroup) => {
    setAwardingGroupId(group.id);
    try {
      await onAwardGroup(group.studentIds, group.name, awardAmount || defaultPoints);
      onOpenChange(false);
    } finally {
      setAwardingGroupId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" aria-hidden />
            Table & Group Points
          </DialogTitle>
          <DialogDescription>
            Reward an entire table or row at once with one tap.
          </DialogDescription>
        </DialogHeader>

        {/* Quick point amount selector */}
        <div className="flex items-center justify-between border-y py-2.5">
          <span className="text-xs font-semibold text-muted-foreground">Points to give:</span>
          <div className="flex items-center gap-1.5">
            {[1, 5, 10, 15, 20].map((pts) => (
              <Button
                key={pts}
                type="button"
                size="sm"
                variant={awardAmount === pts ? 'default' : 'outline'}
                className="h-7 w-9 p-0 text-xs font-bold"
                onClick={() => setAwardAmount(pts)}
              >
                +{pts}
              </Button>
            ))}
          </div>
        </div>

        {/* Group type tabs if tables exist */}
        {tableGroups.length > 0 && rowGroups.length > 0 && (
          <div className="flex rounded-lg bg-muted p-1 text-xs">
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 font-bold transition ${
                effectiveTab === 'table'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('table')}
            >
              Tables & Pods ({tableGroups.length})
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 font-bold transition ${
                effectiveTab === 'row'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setActiveTab('row')}
            >
              Rows ({rowGroups.length})
            </button>
          </div>
        )}

        {/* Groups list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 py-1">
          {currentGroups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No students are placed on desks yet. Arrange desks to award groups.
            </p>
          ) : (
            currentGroups.map((group) => {
              const groupStudents = group.studentIds
                .map((id) => studentMap.get(id))
                .filter((s): s is Student => !!s);
              const namesPreview = groupStudents
                .map((s) => getStudentNickname(s))
                .join(', ');

              return (
                <div
                  key={group.id}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm hover:border-primary/40 transition"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{group.name}</span>
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {group.studentIds.length} students
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {namesPreview || `${group.studentIds.length} seated`}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="shrink-0 rounded-xl font-bold text-xs"
                    disabled={awardingGroupId !== null}
                    onClick={() => void handleAward(group)}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5 text-amber-300" aria-hidden />
                    +{awardAmount} {icon}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
