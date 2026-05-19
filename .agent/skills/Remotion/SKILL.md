---
name: Remotion
description: Guidelines and best practices for writing, configuring, and rendering programmatic videos in the workspace.
---

# Remotion Skill

This skill governs the standards and workflows for creating high-quality, programmatic promotional videos and walkthroughs using Remotion within this workspace.

## Best Practices

1. **Composition Architecture**:
   - Keep compositions modular. Separate main slides, overlays, and animations into separate component files if they exceed 100 lines.
   - Use standard configurations: `fps: 30`, standard resolutions like `1280x720` (720p) or `1920x1080` (1080p).
   - Use a clear programmatic timeline by utilizing Remotion's `<Sequence>` component for layout transitions.

2. **Animations**:
   - Prefer spring-based physical animations (`spring`) over linear interpolations for smooth, premium-feeling transitions (e.g., scale-ups, text entries).
   - Coordinate entry and exit offsets utilizing the `useCurrentFrame()` and `useVideoConfig()` hooks.

3. **Asset Management**:
   - Place all external static files (like raw recordings, `.mp4`, `.png`, `.mp3`) inside the standard `public/` directory of the Remotion project.
   - Access assets using the `staticFile("filename.ext")` helper to guarantee correct path resolution during both rendering and previewing.

4. **Rendering Rules**:
   - To render a composition, run:
     ```bash
     npx remotion render src/index.ts <CompositionId> <OutputFile.mp4>
     ```
   - Avoid committing compiled media assets (`.mp4`) inside the Remotion project subfolder itself. Direct outputs to target public/root assets folders.
