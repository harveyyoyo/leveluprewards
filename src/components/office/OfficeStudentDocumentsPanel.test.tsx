import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { OfficeStudentDocumentsPanel } from './OfficeStudentDocumentsPanel';
import type { OfficeStudentDocument } from '@/lib/office/types';

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const authFetch = vi.fn();
vi.mock('@/lib/authFetch', () => ({
  useAuthFetch: () => authFetch,
}));

let documents: OfficeStudentDocument[] = [];
vi.mock('@/lib/office/useOfficeStudentDocuments', () => ({
  useOfficeStudentDocuments: () => ({ documents, isLoading: false }),
}));

describe('OfficeStudentDocumentsPanel', () => {
  it('shows an empty state with no documents', () => {
    documents = [];
    render(<OfficeStudentDocumentsPanel schoolId="yeshiva" studentId="s1" enabled />);
    expect(screen.getByText(/no documents uploaded yet/i)).toBeInTheDocument();
  });

  it('lists uploaded documents and opens a signed URL on click', async () => {
    documents = [
      { id: 'd1', studentId: 's1', name: 'report-card.pdf', storagePath: 'x', contentType: 'application/pdf', sizeBytes: 2048, uploadedAt: 0 },
    ];
    authFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ url: 'https://signed.example/x' }) });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<OfficeStudentDocumentsPanel schoolId="yeshiva" studentId="s1" enabled />);
    expect(screen.getByText('report-card.pdf')).toBeInTheDocument();

    fireEvent.click(screen.getByText('report-card.pdf'));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('/api/office/student-document/d1?schoolId=yeshiva');
      expect(openSpy).toHaveBeenCalledWith('https://signed.example/x', '_blank', 'noopener,noreferrer');
    });

    openSpy.mockRestore();
  });

  it('asks first, then calls the remove endpoint when confirmed', async () => {
    documents = [
      { id: 'd1', studentId: 's1', name: 'report-card.pdf', storagePath: 'x', contentType: 'application/pdf', sizeBytes: 2048, uploadedAt: 0 },
    ];
    authFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    render(<OfficeStudentDocumentsPanel schoolId="yeshiva" studentId="s1" enabled />);
    fireEvent.click(screen.getByLabelText('Delete report-card.pdf'));

    expect(authFetch).not.toHaveBeenCalledWith('/api/office/student-document/d1?schoolId=yeshiva', { method: 'DELETE' });
    fireEvent.click(await screen.findByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(authFetch).toHaveBeenCalledWith('/api/office/student-document/d1?schoolId=yeshiva', { method: 'DELETE' });
    });
  });
});
