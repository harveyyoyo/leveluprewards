import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomTabLauncher } from './ClassroomTabLauncher';

vi.mock('@/components/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: { payClassroom: true },
    updateSettings: vi.fn(),
  }),
}));

describe('ClassroomTabLauncher', () => {
  it('is only an Open Classroom launcher to the standalone page', () => {
    render(<ClassroomTabLauncher schoolId="schoolabc" />);

    const link = screen.getByRole('link', { name: /open classroom/i });
    expect(link.getAttribute('href')).toContain('/schoolabc/classroom-realm');
    expect(screen.queryByText(/command center/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /open classroom/i })).toBeNull();
  });
});
