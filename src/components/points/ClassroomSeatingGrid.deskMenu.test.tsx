import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  ClassroomSeatingGrid,
  type ClassroomGridHandlers,
} from './ClassroomSeatingGrid';

function handlers(overrides: Partial<ClassroomGridHandlers> = {}): ClassroomGridHandlers {
  return {
    onDeskTap: vi.fn(),
    onBehaviorNote: vi.fn(),
    onDragStart: vi.fn(),
    onDrop: vi.fn(),
    ...overrides,
  };
}

function renderDesk(handlersRef: { current: ClassroomGridHandlers }, deskMenuEnabled: boolean) {
  const catalog = new Map([
    ['s1', { id: 's1', name: 'Luke', initials: 'LM', points: 10 }],
  ]);
  return render(
    <div style={{ width: 320, height: 240 }}>
      <ClassroomSeatingGrid
        layoutRows={1}
        layoutCols={1}
        cellStudentIds={['s1']}
        visualCells={[{ visualRow: 0, cellIndex: 0 }]}
        deskCatalog={catalog}
        design="aurora"
        accentColor="#22c55e"
        sessionTotals={{}}
        sessionLastAwards={{}}
        showBalance
        showSessionTotals
        showSessionLastAward
        density="normal"
        gridGap={8}
        editMode={false}
        pendingCellIndex={null}
        pendingStartedAt={null}
        autoAwardMs={0}
        flyUpCell={null}
        flyUpSize="medium"
        flashCell={null}
        burstSelected={[]}
        randomHighlightId={null}
        awardingStudentIds={new Set()}
        attendanceEnabled={false}
        attendanceByStudent={new Map()}
        bathroomEnabled={false}
        bathroomByStudent={new Map()}
        bathroomMaxMinutes={5}
        bathroomTick={0}
        activeCelebration={null}
        handlersRef={handlersRef}
        deskMenuEnabled={deskMenuEnabled}
      />
    </div>,
  );
}

describe('ClassroomSeatingGrid Instant Award right-click', () => {
  it('opens the awards menu on right-click', () => {
    const onDeskMenu = vi.fn();
    const handlersRef = { current: handlers({ onDeskMenu }) };
    renderDesk(handlersRef, true);

    fireEvent.contextMenu(screen.getByRole('button'));
    expect(onDeskMenu).toHaveBeenCalledWith('s1', 0);
  });

  it('opens the awards menu on long press (hold)', () => {
    vi.useFakeTimers();
    const onDeskMenu = vi.fn();
    const handlersRef = { current: handlers({ onDeskMenu }) };
    renderDesk(handlersRef, true);

    fireEvent.pointerDown(screen.getByRole('button'), { button: 0, clientX: 10, clientY: 10 });
    expect(onDeskMenu).not.toHaveBeenCalled();

    vi.advanceTimersByTime(510);
    expect(onDeskMenu).toHaveBeenCalledWith('s1', 0);
    vi.useRealTimers();
  });

  it('cancels the long press if pointer moves significantly', () => {
    vi.useFakeTimers();
    const onDeskMenu = vi.fn();
    const handlersRef = { current: handlers({ onDeskMenu }) };
    renderDesk(handlersRef, true);

    fireEvent.pointerDown(screen.getByRole('button'), { button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(screen.getByRole('button'), { clientX: 50, clientY: 50 });

    vi.advanceTimersByTime(510);
    expect(onDeskMenu).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
