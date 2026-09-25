import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClassroomMissionTimerModal } from './ClassroomMissionTimerModal';
import { ClassroomSoundboardModal } from './ClassroomSoundboardModal';
import { ClassroomNoiseRadarModal } from './ClassroomNoiseRadarModal';
import { ClassroomQuickVoteModal } from './ClassroomQuickVoteModal';

describe('ClassroomFuturistTools', () => {
  beforeAll(() => {
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });
  it('renders ClassroomMissionTimerModal with countdown presets', () => {
    render(
      <ClassroomMissionTimerModal
        open={true}
        onOpenChange={vi.fn()}
        title="Math Sprint Timer"
        defaultMinutes={5}
      />
    );

    expect(screen.getByText('Math Sprint Timer')).toBeInTheDocument();
    expect(screen.getByText('05:00')).toBeInTheDocument();
    expect(screen.getByText('1m Sprint')).toBeInTheDocument();
    expect(screen.getByText('2m Pair Talk')).toBeInTheDocument();
    expect(screen.getByText('Start Timer')).toBeInTheDocument();
  });

  it('renders ClassroomSoundboardModal with cues and focus audio', () => {
    render(
      <ClassroomSoundboardModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Classroom Soundboard/)).toBeInTheDocument();
    expect(screen.getByText('Attention Gong')).toBeInTheDocument();
    expect(screen.getByText('Victory Fanfare')).toBeInTheDocument();
    expect(screen.getByText('Cosmic Library')).toBeInTheDocument();
  });

  it('renders ClassroomNoiseRadarModal with target noise goals', () => {
    render(
      <ClassroomNoiseRadarModal
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText('Classroom Noise Radar')).toBeInTheDocument();
    expect(screen.getByText('Silent Orbit')).toBeInTheDocument();
    expect(screen.getByText('Whisper Nebula')).toBeInTheDocument();
    expect(screen.getByText('Group Station')).toBeInTheDocument();
    expect(screen.getByText('Start Noise Radar')).toBeInTheDocument();
  });

  it('renders ClassroomQuickVoteModal and allows registering votes', () => {
    render(
      <ClassroomQuickVoteModal
        open={true}
        onOpenChange={vi.fn()}
        classNameLabel="Grade 5 Science"
      />
    );

    expect(screen.getByText('Live Quick Check & Poll')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();

    const voteButtons = screen.getAllByText('+ Vote');
    expect(voteButtons.length).toBeGreaterThan(0);
    fireEvent.click(voteButtons[0]);

    expect(screen.getByText(/1 Vote/)).toBeInTheDocument();
  });
});
