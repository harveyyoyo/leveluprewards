'use client';

import {
  ArrowRightLeft,
  ChevronDown,
  ChevronUp,
  Minus,
  Pencil,
  Plus as PlusIcon,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { HouseBadge } from '@/components/houses/HouseBadge';
import { HouseStandingsInlineCell } from '@/components/houses/HouseStandingsInlineCell';
import type { HouseStandingsRow } from '@/lib/houses/houseStandings';
import type { House, Student, Teacher } from '@/lib/types';
import { cn } from '@/lib/utils';

type Props = {
  row: HouseStandingsRow;
  house: House;
  houseStudents: Student[];
  availableStudents: Student[];
  allHouses: House[];
  teachers: Teacher[];
  manualPoints: boolean;
  busy: string | null;
  isExpanded: boolean;
  selectedStudentId: string;
  memberSearch: string;
  onToggleExpand: () => void;
  onSelectStudent: (studentId: string) => void;
  onMemberSearch: (value: string) => void;
  onAddStudent: (student: Student) => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPoints: () => void;
  onNudgePoints: (deltaCurrent: number, deltaLifetime: number) => void;
  onTransfer: (student: Student) => void;
  onRemoveStudent: (student: Student) => void;
  onToggleHouseParent: (teacher: Teacher, isParent: boolean) => void;
};

export function AdminHouseRosterCard({
  row,
  house,
  houseStudents,
  availableStudents,
  allHouses,
  teachers,
  manualPoints,
  busy,
  isExpanded,
  selectedStudentId,
  memberSearch,
  onToggleExpand,
  onSelectStudent,
  onMemberSearch,
  onAddStudent,
  onEdit,
  onDelete,
  onOpenPoints,
  onNudgePoints,
  onTransfer,
  onRemoveStudent,
  onToggleHouseParent,
}: Props) {
  const parents = teachers.filter((t) => (t.houseParentHouseIds || []).includes(house.id));
  const searchTerm = memberSearch.trim().toLowerCase();
  const filteredMembers = searchTerm
    ? houseStudents.filter((s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchTerm),
      )
    : houseStudents;

  return (
    <article
      className={cn(
        'overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors',
        isExpanded ? 'border-primary/35 ring-1 ring-primary/10' : 'border-border/70 hover:border-primary/25',
      )}
    >
      <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black tabular-nums',
              row.rank === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
          >
            {row.rank}
          </span>
          <div className="min-w-0 flex-1 space-y-2">
            <HouseBadge house={house} size="md" className="max-w-full" />
            {house.value ? (
              <p className="text-xs font-semibold text-muted-foreground">{house.value}</p>
            ) : null}
            <div className="max-w-md">
              <HouseStandingsInlineCell row={row} />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:justify-end">
          <div className="grid grid-cols-2 gap-3 sm:gap-6 text-center sm:text-left">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current</p>
              {manualPoints ? (
                <div className="mt-1 flex items-center justify-center gap-1 sm:justify-start">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={busy !== null}
                    onClick={() => onNudgePoints(-5, 0)}
                    aria-label={`Remove 5 points from ${house.name}`}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <button
                    type="button"
                    className="min-w-[3rem] text-lg font-black tabular-nums hover:underline"
                    onClick={onOpenPoints}
                  >
                    {house.points ?? 0}
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    disabled={busy !== null}
                    onClick={() => onNudgePoints(5, 5)}
                    aria-label={`Add 5 points to ${house.name}`}
                  >
                    <PlusIcon className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <p className="mt-1 text-lg font-black tabular-nums">{house.points ?? 0}</p>
              )}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Lifetime</p>
              {manualPoints ? (
                <button
                  type="button"
                  className="mt-1 text-lg font-black tabular-nums text-muted-foreground hover:underline"
                  onClick={onOpenPoints}
                >
                  {house.lifetimePoints ?? 0}
                </button>
              ) : (
                <p className="mt-1 text-lg font-black tabular-nums text-muted-foreground">
                  {house.lifetimePoints ?? 0}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant={isExpanded ? 'secondary' : 'outline'}
              size="sm"
              className="rounded-xl gap-1.5 font-semibold min-w-[5.5rem]"
              onClick={onToggleExpand}
            >
              {houseStudents.length} members
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onEdit} aria-label={`Edit ${house.name}`}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive"
              onClick={onDelete}
              aria-label={`Delete ${house.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="space-y-4 border-t bg-muted/15 px-4 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
              House parents
            </p>
            <div className="flex flex-wrap gap-2">
              {teachers.map((t) => {
                const isParent = (t.houseParentHouseIds || []).includes(house.id);
                return (
                  <Badge
                    key={t.id}
                    variant={isParent ? 'default' : 'outline'}
                    className={cn('cursor-pointer rounded-full', isParent && 'bg-primary')}
                    onClick={() => onToggleHouseParent(t, isParent)}
                  >
                    {t.name}
                  </Badge>
                );
              })}
            </div>
            {parents.length === 0 ? (
              <p className="text-xs text-muted-foreground mt-2">Tap teacher names to assign house parents.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Add student to {house.name}
              </Label>
              <Select value={selectedStudentId} onValueChange={onSelectStudent}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue placeholder="Choose student…" />
                </SelectTrigger>
                <SelectContent>
                  {availableStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.lastName}, {s.firstName}
                      {s.houseId
                        ? ` (from ${allHouses.find((h) => h.id === s.houseId)?.name ?? 'other'})`
                        : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="rounded-xl shrink-0"
              disabled={!selectedStudentId}
              onClick={() => {
                const s = availableStudents.find((x) => x.id === selectedStudentId);
                if (s) onAddStudent(s);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>

          {houseStudents.length > 5 ? (
            <div className="relative group max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => onMemberSearch(e.target.value)}
                className="h-8 rounded-lg pl-8 text-xs"
              />
            </div>
          ) : null}

          <ul className="space-y-1 max-h-52 overflow-y-auto rounded-xl border bg-background/80 p-2">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                >
                  <span>
                    {s.lastName}, {s.firstName}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary"
                      onClick={() => onTransfer(s)}
                    >
                      <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => onRemoveStudent(s)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-xs text-muted-foreground py-3 text-center">
                {searchTerm ? 'No matching students.' : 'No students in this house yet.'}
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </article>
  );
}
