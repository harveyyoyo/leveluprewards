/** Open-source timeline model — framework-agnostic shapes */

export type TimelineItem = {
  id: string;
  label: string;
  /** Asset filename or note (shown under label) */
  subtitle?: string;
  start: number;
  duration: number;
  color: string;
  /** Minimum length in frames when resizing */
  minDuration?: number;
};

export type TimelineTrack = {
  id: string;
  label: string;
  items: TimelineItem[];
  /** Boundary handles between fixed segments (video track) */
  mode?: "free" | "boundaries";
  /** Show clips but disable drag (B-roll / music mirrors) */
  readOnly?: boolean;
};

export type TimelineBoundary = {
  id: string;
  frame: number;
  label?: string;
};

export type TimelineProps = {
  durationFrames: number;
  fps?: number;
  tracks: TimelineTrack[];
  boundaries?: TimelineBoundary[];
  onTracksChange: (tracks: TimelineTrack[]) => void;
  onBoundariesChange?: (boundaries: TimelineBoundary[]) => void;
  /** Playhead from Remotion Player (synced while playing) */
  currentFrame?: number;
  /** Click empty timeline area to scrub */
  onSeek?: (frame: number) => void;
  pixelsPerFrame?: number;
  className?: string;
};
