import type { CSSProperties } from 'react';
import type { ClassroomDesign } from '@/lib/classroomSeatingChart';

export const CLASSROOM_TOKEN_ACCENTS = [
  { id: 'blue', border: 'oklch(0.52 0.16 250)', shadow: 'oklch(0.52 0.16 250 / 0.42)', ring: 'oklch(0.62 0.15 250)', fill: 'oklch(0.72 0.14 250)' },
  { id: 'red', border: 'oklch(0.55 0.2 25)', shadow: 'oklch(0.55 0.2 25 / 0.4)', ring: 'oklch(0.62 0.19 25)', fill: 'oklch(0.7 0.16 25)' },
  { id: 'yellow', border: 'oklch(0.72 0.16 95)', shadow: 'oklch(0.62 0.14 85 / 0.45)', ring: 'oklch(0.8 0.15 95)', fill: 'oklch(0.86 0.14 95)' },
  { id: 'green', border: 'oklch(0.55 0.15 145)', shadow: 'oklch(0.55 0.15 145 / 0.4)', ring: 'oklch(0.64 0.14 145)', fill: 'oklch(0.72 0.13 145)' },
  { id: 'orange', border: 'oklch(0.64 0.17 55)', shadow: 'oklch(0.64 0.17 55 / 0.42)', ring: 'oklch(0.72 0.16 55)', fill: 'oklch(0.78 0.14 55)' },
  { id: 'teal', border: 'oklch(0.55 0.12 190)', shadow: 'oklch(0.55 0.12 190 / 0.4)', ring: 'oklch(0.64 0.11 190)', fill: 'oklch(0.74 0.1 190)' },
  { id: 'violet', border: 'oklch(0.52 0.18 300)', shadow: 'oklch(0.52 0.18 300 / 0.42)', ring: 'oklch(0.62 0.16 300)', fill: 'oklch(0.7 0.14 300)' },
] as const;

export function isClassroomTokenDesign(design: ClassroomDesign): boolean {
  return design === 'aurora';
}

export function classroomTokenAccent(index: number) {
  return CLASSROOM_TOKEN_ACCENTS[Math.abs(index) % CLASSROOM_TOKEN_ACCENTS.length];
}

export function classroomTokenDeskStyle(index: number): CSSProperties {
  const token = classroomTokenAccent(index);
  return {
    borderColor: token.border,
    boxShadow: `4px 6px 0 0 ${token.shadow}`,
  };
}

export const CLASSROOM_TOKEN_CANVAS_CLASS =
  'bg-[#f4f0e8] bg-[radial-gradient(circle,#c8c2b6_1.15px,transparent_1.2px)] bg-[length:18px_18px]';

export const CLASSROOM_TOKEN_TEACHER_NAVY = '#102033';
export const CLASSROOM_TOKEN_TEACHER_GOLD = '#f5c518';

export type ClassroomSidebarToolTone =
  | 'arrange'
  | 'random'
  | 'attendance'
  | 'sound'
  | 'timer'
  | 'gold'
  | 'raffle'
  | 'behavior'
  | 'groups'
  | 'instant'
  | 'menu';

export type ClassroomSidebarInk = 'light' | 'dark';

/** One desk-outline token per tool — same crayon box as the seating chart. */
export const CLASSROOM_TOOL_DESK_INDEX: Record<ClassroomSidebarToolTone, number> = {
  arrange: 2,
  gold: 3,
  random: 0,
  raffle: 6,
  behavior: 1,
  attendance: 5,
  sound: 4,
  timer: 6,
  groups: 5,
  instant: 0,
  menu: 0,
};

function deskInk(tokenId: (typeof CLASSROOM_TOKEN_ACCENTS)[number]['id']): ClassroomSidebarInk {
  return tokenId === 'yellow' || tokenId === 'orange' ? 'dark' : 'light';
}

export function classroomSidebarRailClass(design: ClassroomDesign): string {
  if (design === 'midnight') {
    return 'bg-indigo-950 border-indigo-900';
  }
  return 'bg-[#F8FAFC] border-slate-200';
}

export function classroomSidebarToolAppearance(
  design: ClassroomDesign,
  tone: ClassroomSidebarToolTone,
): { className: string; style: CSSProperties; ink: ClassroomSidebarInk } {
  const token = classroomTokenAccent(CLASSROOM_TOOL_DESK_INDEX[tone]);
  const clean = design === 'minimal';
  const night = design === 'midnight';
  const fill = clean ? token.fill : token.border;
  const ink = clean ? 'dark' : night && token.id === 'yellow' ? 'dark' : deskInk(token.id);
  return {
    className: cnTool(ink),
    style: { backgroundColor: fill },
    ink,
  };
}

export function classroomSidebarToolTint(
  design: ClassroomDesign,
  tone: ClassroomSidebarToolTone,
): string {
  const token = classroomTokenAccent(CLASSROOM_TOOL_DESK_INDEX[tone]);
  if (design === 'midnight') return token.ring;
  return token.fill;
}

function cnTool(ink: ClassroomSidebarInk): string {
  return ink === 'dark'
    ? 'text-slate-900 font-semibold shadow-sm hover:brightness-105'
    : 'text-white font-semibold shadow-sm hover:brightness-110';
}
