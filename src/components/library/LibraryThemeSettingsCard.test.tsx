import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryThemeSettingsCard } from './LibraryThemeSettingsCard';

const mockUpdateSettings = vi.fn();
const mockToast = vi.fn();

vi.mock('@/components/providers/SettingsProvider', () => ({
  useSettings: () => ({
    settings: {
      libraryTheme: 'classic_oak',
      libraryThemeMatchKiosk: true,
    },
    updateSettings: mockUpdateSettings,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

describe('LibraryThemeSettingsCard', () => {
  it('renders themes and current selection', () => {
    render(<LibraryThemeSettingsCard />);

    expect(screen.getByText('Ambiance & Reading Themes')).toBeInTheDocument();
    expect(screen.getAllByText('Classic Oak').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Modern Sapphire')).toBeInTheDocument();
    expect(screen.getByText('Midnight Archive')).toBeInTheDocument();
  });

  it('updates setting when a theme is clicked', () => {
    render(<LibraryThemeSettingsCard />);

    const sapphireBtn = screen.getByRole('button', { name: /Modern Sapphire/i });
    fireEvent.click(sapphireBtn);

    expect(mockUpdateSettings).toHaveBeenCalledWith({ libraryTheme: 'modern_sapphire' });
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: expect.stringContaining('Modern Sapphire'),
      }),
    );
  });

  it('toggles kiosk sync switch', () => {
    render(<LibraryThemeSettingsCard />);

    const switchBtn = screen.getByRole('switch');
    fireEvent.click(switchBtn);

    expect(mockUpdateSettings).toHaveBeenCalledWith({ libraryThemeMatchKiosk: false });
  });
});
