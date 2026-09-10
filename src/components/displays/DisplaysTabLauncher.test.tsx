import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DisplaysTabLauncher } from './DisplaysTabLauncher';

vi.mock('@/components/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: { displaysEnabled: true },
    updateSettings: vi.fn(),
  }),
}));

describe('DisplaysTabLauncher', () => {
  it('is only an Open Displays launcher to the standalone studio', () => {
    render(<DisplaysTabLauncher schoolId="schoolabc" />);

    const link = screen.getByRole('link', { name: /open displays/i });
    expect(link.getAttribute('href')).toContain('/schoolabc/displays-realm');
    expect(screen.queryByText(/studio popout/i)).toBeNull();
    expect(screen.queryByText(/launch fullscreen/i)).toBeNull();
  });
});
