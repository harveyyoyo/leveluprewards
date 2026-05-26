# Timeline (open-source drag wrapper)

MIT-style React timeline for frame-based editing. No paid Remotion Timeline license — uses pointer events only.

## Features

- **Free track**: drag clips to move; drag the right edge to resize.
- **Boundary track**: drag white handles between fixed segments (e.g. video montage cuts).

## Usage

```tsx
import { Timeline } from "./timeline";
import type { TimelineTrack, TimelineBoundary } from "./timeline";

const [tracks, setTracks] = useState<TimelineTrack[]>([...]);
const [boundaries, setBoundaries] = useState<TimelineBoundary[]>([...]);

<Timeline
  durationFrames={900}
  fps={30}
  tracks={tracks}
  boundaries={boundaries}
  onTracksChange={setTracks}
  onBoundariesChange={setBoundaries}
/>
```

Import `editor/timeline.css` (or copy rules from `promo-video/editor/timeline.css`).

## Widescreen promo editor

```bash
cd promo-video && npm run editor
# or from repo root: npm run promo:editor
```

Opens http://localhost:3340 — preview + drag timeline, export JSON for `npm run render:widescreen:props`.
