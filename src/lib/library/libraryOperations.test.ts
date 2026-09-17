import { describe, expect, it, vi } from 'vitest';
import { findLibraryItemByUpc } from './libraryOperations';
import * as firestoreModule from 'firebase/firestore';

vi.mock('firebase/firestore', () => {
  return {
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    limit: vi.fn(),
    getDocs: vi.fn(),
  };
});

describe('findLibraryItemByUpc barcode modes', () => {
  it('allows both UPC and ISBN when mode is both', async () => {
    const mockFirestore = {} as any;
    const upcDoc = {
      id: 'doc-upc-1',
      data: () => ({ name: 'Book With UPC', upc: 'LIB12345678', isbn: '9780141321288', archived: false }),
    };

    // First lookup for UPC returns empty, second lookup for ISBN returns doc
    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: true,
      docs: [],
    } as any).mockResolvedValueOnce({
      empty: false,
      docs: [upcDoc],
    } as any);

    const result = await findLibraryItemByUpc(mockFirestore, 'school1', '9780141321288', {
      checkoutBarcodeMode: 'both',
    });

    expect(result).not.toBeNull();
    expect(result?.item.name).toBe('Book With UPC');
  });

  it('skips ISBN lookup when mode is barcode_only', async () => {
    const mockFirestore = {} as any;
    vi.mocked(firestoreModule.getDocs).mockReset();
    vi.mocked(firestoreModule.getDocs).mockResolvedValue({
      empty: true,
      docs: [],
    } as any);

    const result = await findLibraryItemByUpc(mockFirestore, 'school1', '9780141321288', {
      checkoutBarcodeMode: 'barcode_only',
    });

    // Should only query for UPC, not ISBN
    expect(result).toBeNull();
    // Verify where('isbn', ...) was never called
    expect(vi.mocked(firestoreModule.where)).not.toHaveBeenCalledWith('isbn', '==', expect.anything());
  });

  it('skips copy barcode lookup when mode is isbn_only', async () => {
    const mockFirestore = {} as any;
    vi.mocked(firestoreModule.where).mockClear();
    vi.mocked(firestoreModule.getDocs).mockReset();

    const isbnDoc = {
      id: 'doc-isbn-1',
      data: () => ({ name: 'Harry Potter', upc: 'LIB99999999', isbn: '9780747532743', archived: false }),
    };

    vi.mocked(firestoreModule.getDocs).mockResolvedValueOnce({
      empty: false,
      docs: [isbnDoc],
    } as any);

    const result = await findLibraryItemByUpc(mockFirestore, 'school1', '9780747532743', {
      checkoutBarcodeMode: 'isbn_only',
    });

    expect(result).not.toBeNull();
    expect(result?.item.name).toBe('Harry Potter');
    // Verify where('upc', ...) was never called because canUseBarcode was false
    expect(vi.mocked(firestoreModule.where)).not.toHaveBeenCalledWith('upc', '==', expect.anything());
  });
});
