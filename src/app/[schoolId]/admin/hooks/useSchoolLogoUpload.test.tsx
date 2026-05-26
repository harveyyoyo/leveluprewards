import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

// --- Mock Firestore + Functions ------------------------------------
// The hook imports `updateDoc` from `firebase/firestore` and
// `httpsCallable` from `firebase/functions`. We replace both with spies so
// we can assert on what the hook sends the backend without booting the SDK.
const updateDocMock = vi.fn().mockResolvedValue(undefined);
const setDocMock = vi.fn().mockResolvedValue(undefined);
const callableMock = vi.fn();
const httpsCallableMock = vi.fn().mockReturnValue(callableMock);

vi.mock('firebase/firestore', () => ({
  updateDoc: (...args: unknown[]) => updateDocMock(...args),
  setDoc: (...args: unknown[]) => setDocMock(...args),
  doc: vi.fn((_db: unknown, col: string, id: string) => ({ path: `${col}/${id}` })),
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => httpsCallableMock(...args),
}));

// Import AFTER the mocks are registered.
import { useSchoolLogoUpload } from './useSchoolLogoUpload';

function makeDeps(overrides: Partial<Parameters<typeof useSchoolLogoUpload>[0]> = {}) {
  return {
    schoolId: 'school-1',
    schoolDocRef: { id: 'school-1' } as unknown as NonNullable<
      Parameters<typeof useSchoolLogoUpload>[0]['schoolDocRef']
    >,
    firestore: {} as NonNullable<Parameters<typeof useSchoolLogoUpload>[0]['firestore']>,
    schoolData: { logoUrl: 'https://cdn/logo.png', logoHistory: [{ url: 'https://cdn/a.png' }, { url: 'https://cdn/b.png' }] },
    functions: {} as NonNullable<Parameters<typeof useSchoolLogoUpload>[0]['functions']>,
    toast: vi.fn(),
    playSound: vi.fn(),
    ...overrides,
  };
}

describe('useSchoolLogoUpload', () => {
  beforeEach(() => {
    updateDocMock.mockClear();
    setDocMock.mockClear();
    callableMock.mockReset();
    httpsCallableMock.mockClear();
  });

  describe('previousSchoolLogos', () => {
    it('places the current url first, then dedupes history', () => {
      const { result } = renderHook(() => useSchoolLogoUpload(makeDeps()));
      expect(result.current.previousSchoolLogos).toEqual([
        'https://cdn/logo.png',
        'https://cdn/a.png',
        'https://cdn/b.png',
      ]);
    });

    it('drops a duplicate when current also appears in history', () => {
      const deps = makeDeps({
        schoolData: { logoUrl: 'https://cdn/a.png', logoHistory: [{ url: 'https://cdn/a.png' }, { url: 'https://cdn/b.png' }] },
      });
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      expect(result.current.previousSchoolLogos).toEqual(['https://cdn/a.png', 'https://cdn/b.png']);
    });

    it('uses the preview URL as "current" once one is set', () => {
      const { result } = renderHook(() => useSchoolLogoUpload(makeDeps()));
      act(() => result.current.setLogoPreviewUrl('https://cdn/new.png'));
      expect(result.current.previousSchoolLogos[0]).toBe('https://cdn/new.png');
    });

    it('returns an empty list when there is no logo and no history', () => {
      const deps = makeDeps({ schoolData: { logoUrl: null, logoHistory: null } });
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      expect(result.current.previousSchoolLogos).toEqual([]);
    });

    it('skips history entries with missing/blank urls', () => {
      const deps = makeDeps({
        schoolData: {
          logoUrl: null,
          logoHistory: [{ url: '   ' }, { url: 'https://cdn/a.png' }, {}, { url: 'https://cdn/b.png' }],
        },
      });
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      expect(result.current.previousSchoolLogos).toEqual(['https://cdn/a.png', 'https://cdn/b.png']);
    });
  });

  describe('handleLogoUpload validation', () => {
    function fakeChangeEvent(file: File | null) {
      const target = { files: file ? [file] : [], value: 'prev' } as unknown as HTMLInputElement;
      return { target } as unknown as React.ChangeEvent<HTMLInputElement>;
    }

    it('ignores empty file selection silently', async () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      await act(async () => {
        await result.current.handleLogoUpload(fakeChangeEvent(null));
      });
      expect(deps.toast).not.toHaveBeenCalled();
      expect(deps.playSound).not.toHaveBeenCalled();
    });

    it('rejects disallowed MIME types with an error toast + sound', async () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      const file = new File(['x'], 'bad.gif', { type: 'image/gif' });
      await act(async () => {
        await result.current.handleLogoUpload(fakeChangeEvent(file));
      });
      expect(deps.playSound).toHaveBeenCalledWith('error');
      expect(deps.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', title: 'Unsupported file type' }),
      );
    });

    it('rejects files larger than 10MB', async () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      // Fake a too-large file by overriding the File size without allocating
      // a huge buffer.
      const file = new File(['x'], 'big.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });
      await act(async () => {
        await result.current.handleLogoUpload(fakeChangeEvent(file));
      });
      expect(deps.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', title: 'File too large' }),
      );
    });

    it('refuses when schoolId is missing', async () => {
      const deps = makeDeps({ schoolId: null });
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      const file = new File(['x'], 'ok.png', { type: 'image/png' });
      await act(async () => {
        await result.current.handleLogoUpload(fakeChangeEvent(file));
      });
      expect(deps.toast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: 'destructive', title: 'Cannot upload logo' }),
      );
    });

    it('uploads SVG directly without opening the cropper', async () => {
      callableMock.mockResolvedValue({ data: { logoUrl: 'https://cdn/logo.svg' } });
      const deps = makeDeps();
      const { result } = renderHook(() => useSchoolLogoUpload(deps));

      const file = new File(['<svg></svg>'], 'logo.svg', { type: 'image/svg+xml' });
      await act(async () => {
        await result.current.handleLogoUpload(fakeChangeEvent(file));
      });

      expect(result.current.cropLogoSrc).toBeNull();
      expect(callableMock).toHaveBeenCalled();
      await waitFor(() => expect(result.current.logoPreviewUrl).toBe('https://cdn/logo.svg'));
    });
  });

  describe('handleRemoveLogo', () => {
    it('clears the server logoUrl and the local preview', async () => {
      const deps = makeDeps();
      const { result } = renderHook(() => useSchoolLogoUpload(deps));

      // Pre-seed a preview so we can confirm it gets cleared.
      act(() => result.current.setLogoPreviewUrl('https://cdn/new.png'));

      await act(async () => {
        await result.current.handleRemoveLogo();
      });

      expect(updateDocMock).toHaveBeenCalledWith(deps.schoolDocRef, { logoUrl: null });
      expect(setDocMock).toHaveBeenCalled();
      expect(deps.playSound).toHaveBeenCalledWith('success');
      expect(deps.toast).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Logo removed' }),
      );

      // `isLogoUploading` is flipped on and off synchronously around the await
      await waitFor(() => expect(result.current.isLogoUploading).toBe(false));
      expect(result.current.logoPreviewUrl).toBeNull();
    });

    it('short-circuits (and toasts nothing) when schoolId is missing', async () => {
      const deps = makeDeps({ schoolId: null });
      const { result } = renderHook(() => useSchoolLogoUpload(deps));
      await act(async () => {
        await result.current.handleRemoveLogo();
      });
      expect(updateDocMock).not.toHaveBeenCalled();
      expect(setDocMock).not.toHaveBeenCalled();
      expect(deps.toast).not.toHaveBeenCalled();
    });

    it('surfaces a destructive toast on failure', async () => {
      // The hook intentionally logs with console.error on this path. Silence
      // it for this test so the suite output stays readable.
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        updateDocMock.mockRejectedValueOnce(new Error('permission denied'));
        const deps = makeDeps();
        const { result } = renderHook(() => useSchoolLogoUpload(deps));
        await act(async () => {
          await result.current.handleRemoveLogo();
        });
        expect(deps.playSound).toHaveBeenCalledWith('error');
        expect(deps.toast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: 'destructive', title: 'Error' }),
        );
        expect(errSpy).toHaveBeenCalled();
      } finally {
        errSpy.mockRestore();
      }
    });
  });
});
