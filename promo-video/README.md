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
