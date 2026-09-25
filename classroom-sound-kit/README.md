# Classroom Sound Kit

A tiny, dependency-free Web Audio sound engine for the classroom theme builder.
No audio files — every sound is synthesized in the browser, so there is nothing
to download or load.

## What's in the kit

| File | Use when |
|---|---|
| `classroom-sounds.ts` | Your project uses TypeScript / a bundler (React, Vite, etc.) |
| `classroom-sounds.js` | Plain JavaScript project or a static HTML page |
| `demo.html` | Open in a browser to hear every sound and style |

## The 4 sound styles

- **Soft** – gentle sine blips (the default)
- **Arcade** – retro square-wave beeps
- **Wood** – low, knocky triangle clicks
- **Bubbly** – high, bouncy pops

## The 6 sound kinds

`pop` (pick a theme) · `tick` (slider/adjust — auto-throttled) ·
`toggle` (on/off chime) · `reset` (descending) · `success` (rising arpeggio) ·
`error` (low buzz)

## How to wire it up (TypeScript / React)

```ts
import { configureSound, playSound, attachClickSounds } from "./classroom-sounds";

// On app start — restore the user's saved settings:
configureSound({ enabled: true, volume: 70, style: "Soft" });
attachClickSounds(true); // optional: every button click in the app blips

// Wherever a user action happens:
playSound("pop");     // picking a theme
playSound("tick");    // adjusting a slider
playSound("toggle");  // flipping a switch
playSound("reset");   // reset button
playSound("success"); // saved
playSound("error");   // validation failed
```

## Saving the user's preferences

Store three values (e.g. in `localStorage`) and restore them on load:

```ts
// save
localStorage.setItem("sound-prefs", JSON.stringify({
  sound: true, volume: 70, soundStyle: "Arcade",
}));
// restore
const p = JSON.parse(localStorage.getItem("sound-prefs") || "{}");
configureSound({
  enabled: p.sound ?? true,
  volume: p.volume ?? 70,
  style: p.soundStyle ?? "Soft",
});
```

## Settings panel (what the theme builder shows)

- On/off switch → `configureSound({ enabled })`
- Volume slider (0–100) → `configureSound({ volume })`
- Style picker (Soft / Arcade / Wood / Bubbly) → `configureSound({ style })`
- Optional toggle: "Clicks inside previews also make sound" → `attachClickSounds(bool)`

## Notes

- Browsers only allow audio after the user interacts with the page — every
  sound here is triggered by clicks/changes, so this is handled automatically.
- The engine fails silently if audio isn't available (e.g. some webviews).
- To add a custom style, add an entry to `SOUND_STYLES`:
  `{ wave: "sine" | "square" | "triangle" | "sawtooth", pitch, dur, vol }`.
