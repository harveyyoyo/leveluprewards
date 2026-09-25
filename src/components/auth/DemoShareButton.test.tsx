import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DemoShareButton } from './DemoShareButton';

const state: { user: unknown; pathname: string } = { user: null, pathname: '/schoolabc/library' };
const authFetch = vi.fn();
const writeText = vi.fn();

vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/firebase', () => ({ useFirebase: () => ({ auth: {}, user: state.user }) }));
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/lib/authFetch', () => ({ authFetch: (...args: unknown[]) => authFetch(...args) }));

function googleUser(email: string) {
  return { uid: `uid-${email}`, email, isAnonymous: false, providerData: [{ providerId: 'google.com' }] };
}

describe('DemoShareButton', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_DEVELOPER_GOOGLE_EMAIL_ALLOWLIST', 'owner@example.com');
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    writeText.mockResolvedValue(undefined);
    authFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ keys: { schoolabc: 'K1', yeshiva: 'K2' } }),
    });
    state.pathname = '/schoolabc/library';
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("copies a no-passcode link to the owner's current demo page", async () => {
    state.user = googleUser('owner@example.com');
    render(<DemoShareButton schoolId="schoolabc" />);

    const button = screen.getByRole('button', { name: /share/i });
    await waitFor(() => {
      fireEvent.click(button);
      expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/demo/library?key=K1`);
    });
    expect(authFetch).toHaveBeenCalledWith({}, '/api/developer/demo-share-keys');
  });

  it('stays hidden for anyone else', () => {
    state.user = googleUser('someone@example.com');
    const { container } = render(<DemoShareButton schoolId="schoolabc" />);
    expect(container.firstChild).toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });

  it('stays hidden on real schools, even for the owner', () => {
    state.user = googleUser('owner@example.com');
    state.pathname = '/realschool/library';
    const { container } = render(<DemoShareButton schoolId="realschool" />);
    expect(container.firstChild).toBeNull();
    expect(authFetch).not.toHaveBeenCalled();
  });
});
