import type { ClassroomDesign } from '@/lib/classroomSeatingChart';

export type ClassroomAppearanceTheme = {
  id: ClassroomDesign;
  title: string;
  hint: string;
  swatches: [string, string, string, string];
};

/** Four live looks — maps owner-friendly names to existing design IDs. */
export const CLASSROOM_APPEARANCE_THEMES: ClassroomAppearanceTheme[] = [
  {
    id: 'aurora',
    title: 'Vibrant / Playful',
    hint: 'Colorful token desks',
    swatches: ['#3b82f6', '#ef4444', '#f5c518', '#102033'],
  },
  {
    id: 'minimal',
    title: 'Focus / Clean',
    hint: 'High contrast',
    swatches: ['#ffffff', '#e5e7eb', '#111827', '#9ca3af'],
  },
  {
    id: 'midnight',
    title: 'Night / Dark',
    hint: 'Easier on a bright projector',
    swatches: ['#0b0b1a', '#1e1b4b', '#312e81', '#94a3b8'],
  },
  {
    id: 'brutalist',
    title: 'Retro / Bold',
    hint: 'Strong borders',
    swatches: ['#fef08a', '#111827', '#ffffff', '#f97316'],
  },
];

export function classroomAppearanceThemeById(id: ClassroomDesign): ClassroomAppearanceTheme {
  return (
    CLASSROOM_APPEARANCE_THEMES.find((theme) => theme.id === id) ??
    CLASSROOM_APPEARANCE_THEMES[0] ?? {
      id: 'aurora',
      title: 'Vibrant / Playful',
      hint: 'Colorful token desks',
      swatches: ['#3b82f6', '#ef4444', '#f5c518', '#102033'],
    }
  );
}
