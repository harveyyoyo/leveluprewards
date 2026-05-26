# Long feature showcase promos

Five **widescreen (1920×1080)** variants of the same 14-beat tour, with different narration styles so you can pick a voice and tone.

| Composition ID | Style | Voice | ~Length | Output |
|----------------|-------|-------|---------|--------|
| `FeaturePromoEpic` | Cinematic / grand | onyx | ~82s | `assets/levelup-promo-feature-epic.mp4` |
| `FeaturePromoWarm` | Friendly / school | nova | ~75s | `assets/levelup-promo-feature-warm.mp4` |
| `FeaturePromoPro` | Professional / clear | ash | ~69s | `assets/levelup-promo-feature-pro.mp4` |
| `FeaturePromoHype` | High energy | echo | ~64s | `assets/levelup-promo-feature-hype.mp4` |
| `FeaturePromoStory` | Day-in-the-life | fable | ~73s | `assets/levelup-promo-feature-story.mp4` |

## Beats (in order)

Portal → Kiosk → Prizes → Coupons → **Raffle** → **Houses** → **Hall of Fame** → **Notifications** → **Themes** → **Bulletin** → **Library** → **Badges** → **Analytics** → **Attendance**

## Audio quality

Voice uses **OpenAI `gpt-4o-mini-tts`** (clearer than `tts-1-hd`) with per-variant `ttsInstructions`. Override model: `OPENAI_TTS_MODEL=gpt-4o-mini-tts` in `.env.local`.

Best voices on that model: **cedar**, **marin**, **coral** (see variant table above).

## Sync & music

- **Visual cuts** align to when each narration line *starts* (not fixed 75/170 frame boundaries).
- **Music**: longer fade-in/out and gradual ducking under voice (`musicStyle`: calm / upbeat / cinematic).
- Optional separate beds: drop MP3s in `promo-video/public/music/` (see README there).

## CPU priority (Windows)

Renders run at **BelowNormal** process priority via `scripts/run-below-normal.ps1` so Remotion does not peg the machine at 100% CPU. Each render also uses `--concurrency=1` to limit parallel encoding.

If the machine is still too busy, run manually with `-PriorityClass Idle`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/run-below-normal.ps1 -WorkingDirectory promo-video -PriorityClass Idle -Command "npm run render:feature:epic"
```

On macOS/Linux, run `npx remotion render` directly (no wrapper).

## Commands

```bash
# Regenerate all narration (OpenAI, needs OPENAI_API_KEY)
npm run generate:voiceover:feature
npm run generate:voiceover:widescreen

# Capture addon screens (raffle, HoF, admin tabs) on production
npm run capture:feature-promo

# Preview in Remotion Studio
cd promo-video && npm run dev
# Open compositions FeaturePromoEpic … FeaturePromoStory

# Render one variant
cd promo-video && npm run render:feature:epic

# Render all five
npm run render:feature-promos
```

## Edit scripts

- Narration copy: `promo-video/src/promo/featurePromoScripts.ts`
- Clip mapping: `promo-video/src/promo/featurePromoCatalog.ts`
- Timing + MP3 paths after TTS: `promo-video/feature-promo-props/<variant>.json`

After editing copy, run `npm run generate:voiceover:feature` then re-render.
