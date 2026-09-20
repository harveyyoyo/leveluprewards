import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryInteractiveGuide } from './LibraryInteractiveGuide';
import { resolveLibraryTheme } from '@/lib/library/libraryThemes';

const defaultTheme = resolveLibraryTheme('classic_oak', 0.95);

describe('LibraryInteractiveGuide', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnNavigateTab = vi.fn();

  beforeEach(() => {
    mockOnOpenChange.mockReset();
    mockOnNavigateTab.mockReset();
  });

  it('renders the guide title, topics, and does NOT render an On-Screen Tour button', () => {
    render(
      <LibraryInteractiveGuide
        open={true}
        onOpenChange={mockOnOpenChange}
        theme={defaultTheme}
        onNavigateTab={mockOnNavigateTab}
      />
    );

    expect(screen.getByText('Library Guide & Feature Hub')).toBeDefined();
    expect(screen.getByText('Librarian Desk')).toBeDefined();
    expect(screen.getByText('Book Catalog')).toBeDefined();
    expect(screen.getByText('Student Self-Checkout Station')).toBeDefined();
    
    // Ensure "On-Screen Tour" button is removed
    expect(screen.queryByText(/on-screen tour/i)).toBeNull();
  });

  it('filters topics by search query', () => {
    render(
      <LibraryInteractiveGuide
        open={true}
        onOpenChange={mockOnOpenChange}
        theme={defaultTheme}
        onNavigateTab={mockOnNavigateTab}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    fireEvent.change(searchInput, { target: { value: 'labels' } });

    expect(screen.getByText('Printable Spine Labels & Barcodes')).toBeDefined();
    expect(screen.queryByText('Student Self-Checkout Station')).toBeNull();
  });

  it('clears search when clear filters button is clicked', () => {
    render(
      <LibraryInteractiveGuide
        open={true}
        onOpenChange={mockOnOpenChange}
        theme={defaultTheme}
        onNavigateTab={mockOnNavigateTab}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Search topics/i);
    fireEvent.change(searchInput, { target: { value: 'nonexistentterm123' } });

    expect(screen.getByText('No matching topics found')).toBeDefined();

    const clearButton = screen.getByRole('button', { name: /Clear search filters/i });
    fireEvent.click(clearButton);

    expect(screen.getByText('Librarian Desk')).toBeDefined();
  });

  it('navigates to tab and closes guide when an action button is clicked', () => {
    render(
      <LibraryInteractiveGuide
        open={true}
        onOpenChange={mockOnOpenChange}
        theme={defaultTheme}
        onNavigateTab={mockOnNavigateTab}
      />
    );

    const deskButton = screen.getByRole('button', { name: /Open Librarian Desk/i });
    fireEvent.click(deskButton);

    expect(mockOnNavigateTab).toHaveBeenCalledWith('desk');
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
});
