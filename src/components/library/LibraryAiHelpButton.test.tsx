import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { resolveLibraryTheme } from '@/lib/library/libraryThemes';
import { LibraryAiHelpButton } from './LibraryAiHelpButton';

const authState = {
  loginState: 'librarian' as string,
  isInitialized: true,
  isUserLoading: false,
  schoolId: 'demo-school',
  userName: 'Ms Librarian',
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/demo-school/library',
}));

vi.mock('@/components/AppProvider', () => ({
  useAppContext: () => authState,
}));

vi.mock('@/lib/authFetch', () => ({
  useAuthFetch: () => vi.fn(),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/components/support/RemoteSupportSharePanel', () => ({
  RemoteSupportSharePanel: () => <div>Remote support</div>,
}));

const theme = resolveLibraryTheme('classic_oak', 0.95);

describe('LibraryAiHelpButton', () => {
  beforeEach(() => {
    authState.loginState = 'librarian';
    authState.isInitialized = true;
    authState.isUserLoading = false;
  });

  it('shows Ask for library staff and opens the helper chat', () => {
    render(<LibraryAiHelpButton theme={theme} hideFloating />);

    fireEvent.click(screen.getByRole('button', { name: /ask the library helper/i }));

    expect(screen.getByText('Library help')).toBeDefined();
    expect(screen.getByText(/your library helper/i)).toBeDefined();
    expect(screen.getByLabelText('Message to library helper')).toBeDefined();
  });

  it('hides the helper when the visitor is not staff', () => {
    authState.loginState = 'student';
    const { container } = render(<LibraryAiHelpButton theme={theme} />);
    expect(container.firstChild).toBeNull();
  });
});
