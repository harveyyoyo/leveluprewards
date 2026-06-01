# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Screen capture library (b-roll)

Recorded clips live under `public/capture-library/<category>/*.mp4` for use in Remotion via `staticFile("capture-library/...")`.

**Kiosk clips** (from repo root):

```bash
npm run capture:kiosk-clips
```

| File | What it shows |
|------|----------------|
| `student-kiosk/kiosk-mode-idle.mp4` | Kiosk sign-in screen (scan / type ID) |
| `student-kiosk/kiosk-type-entry.mp4` | Student ID typed on kiosk |
| `student-kiosk/kiosk-signin-welcome-points.mp4` | Sign-in → “Welcome back” balance overlay |
| `student-kiosk/kiosk-new-points-on-entry.mp4` | Sign-in → points celebration (+PTS or welcome balance) |
| `student-kiosk/kiosk-signin-rewards.mp4` | Signed-in rewards dashboard |

**Per-student coupon redeems** (10 clips, one code each — edit list in `scripts/lib/demo-marketing-settings.mjs`):

```bash
npm run capture:kiosk-coupons
# single code: node scripts/capture-walkthrough-videos.mjs --kiosk-coupons --clip=132403
```

Output: `capture-library/student-kiosk/kiosk-coupon-redeem-<code>.mp4` (student badge 100–109 paired with each code).

**Full promo b-roll batch** (re-captures coupons, raffle jackpot + wheel, kiosk, admin features, teacher flows):

```bash
npm run capture:promo-broll
```

Set `FIREBASE_SERVICE_ACCOUNT_KEY` in `.env.local` to reset coupons to unused before capture and tune welcome splash / raffle on the demo school.

Raffle clips (teacher portal — **Raffle** must be enabled on the demo school): `raffle/teacher-jackpot-pull.mp4`, `raffle/teacher-wheel-spin.mp4`.

Coupon re-capture: your listed codes are reset when Firebase admin works (`FIREBASE_SERVICE_ACCOUNT_KEY` for project `studio-1273073612-71183`). Otherwise the script prints a fresh sheet of 10 codes via the teacher portal.

If raffle tabs are missing on production, run with local dev: `npm run dev` then `CAPTURE_BASE_URL=http://localhost:3000 node scripts/capture-walkthrough-videos.mjs --promo-broll --clip=teacher-jackpot`.

## Commands

**Install Dependencies**

```console
npm i
```

**Start Preview**

```console
npm run dev
```

Open http://localhost:3333 → **WidescreenPromo** → **Props** (right sidebar) to edit the timeline:

- **timing** — video segment end frames (`introEnd`, `selectorEnd`, … `total`)
- **narration** — each voice line `startFrame` and `durationFrames`
- **musicVolume** / **musicDuckRatio**

In Studio: use **Save default props** to persist edits to the composition.

**Edit timeline as JSON** (optional):

```console
# Edit promo-video/widescreen-promo-props.json, then:
npm run render:widescreen:props
```

**Regenerate voice MP3s** after changing `text` in props:

```console
npm run generate:voiceover
```

## Drag timeline editor (free, open-source)

A lightweight React timeline with pointer drag — no paid Remotion Timeline license.

```console
cd promo-video
npm run editor
```

Opens http://localhost:3340

- **Video track** — drag the white handles between colored segments to move cuts
- **Voice track** — drag clips to move; drag the right edge to trim length
- **Download JSON** — save as `widescreen-promo-props.json`, then `npm run render:widescreen:props`

Reusable component: `src/editor/timeline` (`<Timeline />`).

**Render video**

On **Windows**, `npm run render:*` scripts use `scripts/run-below-normal.ps1` (BelowNormal CPU priority) and `--concurrency=1` so long encodes stay responsive. From repo root: `npm run render:feature-promos`. From this folder: `npm run render:widescreen:props`.

```console
npx remotion render
```

**Upgrade Remotion**

```console
npx remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
