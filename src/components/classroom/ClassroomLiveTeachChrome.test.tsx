import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ClassroomLiveTeachChrome } from './ClassroomLiveTeachChrome';
import { DEFAULT_CLASSROOM_PREFS } from '@/lib/classroomSeatingChart';

describe('ClassroomLiveTeachChrome', () => {
  it('puts Appearance, projector, reset, and shortcuts in the top bar', () => {
    render(
      <ClassroomLiveTeachChrome
        schoolId="schooltest"
        classId="g5"
        classNameLabel="Grade 5"
        classes={[{ id: 'g5', name: 'Grade 5' }]}
        scope="admin"
        sessionPoints={4}
        passes={[]}
        bathroomMaxMinutes={5}
        onReturn={vi.fn()}
        onClassChange={vi.fn()}
        headerControls={{
          classScreenUrl: 'http://127.0.0.1:3000/schooltest/classroom?audience=student',
          onResetSessionDisplay: vi.fn(),
          appearance: {
            prefs: DEFAULT_CLASSROOM_PREFS,
            rewardsPillarOn: true,
            onChange: vi.fn(),
          },
          shortcutHint: {
            prefs: DEFAULT_CLASSROOM_PREFS,
            editMode: false,
            attendanceEnabled: true,
            bathroomEnabled: true,
          },
          attendance: {
            present: 21,
            total: 24,
            enabled: true,
            source: 'card-scan',
            onOpen: vi.fn(),
            onManualRollCall: vi.fn(),
          },
        }}
      />,
    );

    expect(screen.getByRole('link', { name: /home/i })).toBeDefined();
    expect(screen.getByRole('link', { name: /home/i }).getAttribute('href')).toBe(
      '/schooltest/portal',
    );
    expect(screen.queryByText(/^live$/i)).toBeNull();
    const hereChip = screen.getByRole('button', { name: /21 of 24 here\. Card scan/i });
    expect(hereChip).toBeDefined();
    expect(hereChip.className).toContain('classroom-header-chip');
    expect(hereChip.className).toContain('whitespace-nowrap');
    expect(hereChip.className).toContain('px-3');
    expect(hereChip.className).toContain('tracking-normal');
    expect((hereChip.textContent || '').replace(/\s+/g, ' ').trim()).toBe('21/24 Here · Cards');
    expect(screen.queryByRole('button', { name: /manual roll call/i })).toBeNull();
    expect(screen.getByRole('button', { name: /hall: all clear/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /hall: all clear/i }).className).toContain('classroom-header-chip');
    expect(screen.getByRole('button', { name: /hall: all clear/i }).className).toContain('min-w-0');
    expect(screen.getByRole('button', { name: /hall: all clear/i }).className).not.toContain('shrink-0');
    expect(screen.getByText(/\+4 pts/i)).toBeDefined();
    expect(screen.getByText(/\+4 pts/i).className).toContain('classroom-header-chip');
    expect(screen.getByText(/\+4 pts/i).className).toContain('px-3');
    expect(screen.getByText(/\+4 pts/i).className).toContain('py-1.5');
    expect(screen.getByRole('button', { name: /appearance/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /awards & effects/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /turn sounds off/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /turn sounds on/i })).toBeNull();
    expect(screen.getByRole('link', { name: /projector view/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /reset screen/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /^shortcuts$/i })).toBeDefined();
    expect(screen.queryByText(/keyboard shortcuts & legend/i)).toBeNull();
    expect(screen.queryByText(/everyone is in class/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /appearance/i }));
    expect(screen.getByText('Vibrant / Playful')).toBeDefined();
    expect(screen.queryByRole('button', { name: /chart style/i })).toBeNull();
    expect(screen.queryByText(/^default points$/i)).toBeNull();
  });

  it('keeps a full class on one Here line', () => {
    render(
      <ClassroomLiveTeachChrome
        schoolId="schooltest"
        classId="g5"
        classNameLabel="Grade 5"
        classes={[{ id: 'g5', name: 'Grade 5' }]}
        scope="admin"
        sessionPoints={0}
        passes={[]}
        bathroomMaxMinutes={5}
        onReturn={vi.fn()}
        headerControls={{
          classScreenUrl: null,
          onResetSessionDisplay: vi.fn(),
          appearance: {
            prefs: DEFAULT_CLASSROOM_PREFS,
            rewardsPillarOn: true,
            onChange: vi.fn(),
          },
          shortcutHint: {
            prefs: DEFAULT_CLASSROOM_PREFS,
            editMode: false,
            attendanceEnabled: true,
            bathroomEnabled: true,
          },
          attendance: {
            present: 17,
            total: 17,
            enabled: true,
            source: 'manual',
            onOpen: vi.fn(),
          },
        }}
      />,
    );

    const hereChip = screen.getByRole('button', { name: /17 of 17 here\. Manual/i });
    expect((hereChip.textContent || '').replace(/\s+/g, ' ').trim()).toBe('17 Here · Manual');
    expect(hereChip.className).toContain('whitespace-nowrap');
    expect(hereChip.className).toContain('bg-emerald-100');
  });
});
