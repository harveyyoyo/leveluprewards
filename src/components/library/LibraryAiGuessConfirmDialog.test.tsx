import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LibraryAiGuessConfirmDialog } from './LibraryAiGuessConfirmDialog';

describe('LibraryAiGuessConfirmDialog', () => {
  const guess = {
    title: 'Charlotte\'s Web',
    author: 'E. B. White',
    isbn: '9780064400558',
    publishedYear: '1952',
    readingLevel: 'Grade 3-5',
    description: 'A pig named Wilbur befriends a spider.',
    pageCount: 192,
  };

  it('asks staff to confirm the guessed book in a popup', () => {
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    render(
      <LibraryAiGuessConfirmDialog
        open
        guess={guess}
        remainingCount={2}
        onOpenChange={vi.fn()}
        onConfirm={onConfirm}
        onReject={onReject}
      />,
    );

    expect(screen.getByRole('heading', { name: /is this the right book/i })).toBeDefined();
    expect(screen.getByText('Charlotte\'s Web')).toBeDefined();
    expect(screen.getByText(/reading level/i)).toBeDefined();
    expect(screen.getByText('Grade 3-5')).toBeDefined();
    expect(screen.queryByText(/a pig named wilbur/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /more book info/i }));
    expect(screen.getByText(/a pig named wilbur/i)).toBeDefined();
    expect(screen.getByText(/192 pages/i)).toBeDefined();
    expect(screen.getByText(/1 more AI guess waiting/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /yes, that's the book/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('lets staff reject the guess', () => {
    const onReject = vi.fn();
    render(
      <LibraryAiGuessConfirmDialog
        open
        guess={guess}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        onReject={onReject}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /no, i'll type it/i }));
    expect(onReject).toHaveBeenCalledTimes(1);
  });
});
