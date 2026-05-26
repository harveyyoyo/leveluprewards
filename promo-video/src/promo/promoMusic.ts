import { Easing, interpolate, useCurrentFrame } from "remotion";

import type { FeatureNarrationCue } from "./featurePromoSchema";

import type { WidescreenNarrationCue } from "./widescreenPromoSchema";



export type PromoMusicStyle = "default" | "calm" | "upbeat" | "cinematic";



export type PromoMusicConfig = {

  totalFrames: number;

  musicVolume: number;

  musicDuckRatio: number;

  musicStyle?: PromoMusicStyle;

  /** Path under public/ — falls back to background-music.mp3 */

  musicSrc?: string;

  narration: Array<{ startFrame: number; durationFrames: number }>;

};



const STYLE_PRESETS: Record<

  PromoMusicStyle,

  { volumeMul: number; duckMul: number; fadeIn: number; fadeOut: number }

> = {

  default: { volumeMul: 0.92, duckMul: 1, fadeIn: 55, fadeOut: 75 },

  calm: { volumeMul: 0.68, duckMul: 0.88, fadeIn: 70, fadeOut: 95 },

  upbeat: { volumeMul: 0.98, duckMul: 0.92, fadeIn: 40, fadeOut: 55 },

  cinematic: { volumeMul: 0.8, duckMul: 0.78, fadeIn: 85, fadeOut: 100 },

};

/** Frames to fade music down when voice starts (~2s @ 30fps). */
const DUCK_ATTACK_FRAMES = 60;
/** Frames to fade music back up after voice (~3s @ 30fps). */
const DUCK_RELEASE_FRAMES = 90;
/** If two lines are this close, keep music ducked between them (no pump). */
const DUCK_BRIDGE_GAP_FRAMES = 54;
const DUCK_PAD_BEFORE_VOICE = 10;
const DUCK_PAD_AFTER_VOICE = 18;

type DuckZone = { start: number; end: number };

function buildDuckZones(
  narration: { startFrame: number; durationFrames: number }[],
  totalFrames: number,
): DuckZone[] {
  if (!narration.length) return [];

  const zones: DuckZone[] = [];

  for (let i = 0; i < narration.length; i++) {
    const cue = narration[i];
    const start = Math.max(0, cue.startFrame - DUCK_PAD_BEFORE_VOICE);
    const end = Math.min(
      totalFrames,
      cueDuckEnd(cue, i, narration, totalFrames) + DUCK_PAD_AFTER_VOICE,
    );

    const prev = zones[zones.length - 1];
    if (prev && start - prev.end <= DUCK_BRIDGE_GAP_FRAMES) {
      prev.end = Math.max(prev.end, end);
    } else {
      zones.push({ start, end });
    }
  }

  return zones;
}



function cueVoiceEnd(

  cue: { startFrame: number; durationFrames: number },

  index: number,

  narration: { startFrame: number; durationFrames: number }[],

  totalFrames: number,

): number {

  const next = narration[index + 1];

  const untilNext = next

    ? next.startFrame - cue.startFrame

    : totalFrames - cue.startFrame;

  return cue.startFrame + Math.max(1, Math.min(cue.durationFrames, untilNext));

}



/** Duck through full gap until the next line — avoids music snapping between cues. */

function cueDuckEnd(

  cue: { startFrame: number; durationFrames: number },

  index: number,

  narration: { startFrame: number; durationFrames: number }[],

  totalFrames: number,

): number {

  const next = narration[index + 1];

  if (next) return next.startFrame;

  return cueVoiceEnd(cue, index, narration, totalFrames);

}



/** Smooth music level: slow duck zones under narration (no fast pump between lines). */

export function usePromoMusicVolume(config: PromoMusicConfig): number {

  const frame = useCurrentFrame();

  const style = STYLE_PRESETS[config.musicStyle ?? "default"];

  const fadeIn = style.fadeIn;

  const fadeOut = style.fadeOut;

  const ease = Easing.inOut(Easing.cubic);

  const baseVol =

    config.musicVolume *

    style.volumeMul *

    interpolate(

      frame,

      [0, fadeIn, config.totalFrames - fadeOut, config.totalFrames],

      [0, 1, 1, 0],

      {

        extrapolateLeft: "clamp",

        extrapolateRight: "clamp",

        easing: ease,

      },

    );



  const duckTarget = Math.max(

    0.22,

    Math.min(1, config.musicDuckRatio * style.duckMul),

  );

  const zones = buildDuckZones(config.narration, config.totalFrames);

  let duck = 1;



  for (const zone of zones) {

    if (frame < zone.start || frame >= zone.end) continue;

    const attackEnd = Math.min(zone.end, zone.start + DUCK_ATTACK_FRAMES);

    const releaseStart = Math.max(zone.start, zone.end - DUCK_RELEASE_FRAMES);

    let level = duckTarget;

    if (frame < attackEnd) {

      level = interpolate(frame, [zone.start, attackEnd], [1, duckTarget], {

        extrapolateLeft: "clamp",

        extrapolateRight: "clamp",

        easing: ease,

      });

    } else if (frame >= releaseStart) {

      level = interpolate(frame, [releaseStart, zone.end], [duckTarget, 1], {

        extrapolateLeft: "clamp",

        extrapolateRight: "clamp",

        easing: ease,

      });

    }

    duck = Math.min(duck, level);

  }



  return baseVol * duck;

}



export function resolveMusicSrc(musicSrc?: string): string {

  return musicSrc?.trim() || "background-music.mp3";

}



export type WidescreenCueId =

  | "intro"

  | "selector"

  | "kiosk"

  | "home"

  | "dashboard"

  | "outro";



/** Align montage boundaries to when each narration line starts. */

export function timingFromWidescreenNarration(

  narration: WidescreenNarrationCue[],

  padAfterIntro = 12,

): {

  introEnd: number;

  selectorEnd: number;

  studentKioskEnd: number;

  studentHomeEnd: number;

  dashboardEnd: number;

  actionEnd: number;

  total: number;

} {

  const byId = Object.fromEntries(narration.map((c) => [c.id, c]));

  const intro = byId.intro;

  const home = byId.home;

  const selector = byId.selector;

  const dashboard = byId.dashboard;

  const outro = byId.outro;



  const introEnd =

    (intro?.startFrame ?? 14) + (intro?.durationFrames ?? 60) + padAfterIntro;

  /** Montage: kiosk sign-in → ID cards → prizes → scan (no portal/teacher beat). */
  const selectorEnd = selector?.startFrame ?? introEnd + 90;

  const studentKioskEnd = dashboard?.startFrame ?? selectorEnd + 90;

  const studentHomeEnd = outro?.startFrame ?? studentKioskEnd + 90;

  const dashboardEnd =

    (outro?.startFrame ?? studentHomeEnd) + (outro?.durationFrames ?? 90);

  const actionEnd = dashboardEnd;

  const last = narration[narration.length - 1];

  const total = Math.max(

    actionEnd + 60,

    (last?.startFrame ?? 0) + (last?.durationFrames ?? 90) + 60,

  );



  return {

    introEnd,

    selectorEnd,

    studentKioskEnd,

    studentHomeEnd,

    dashboardEnd,

    actionEnd,

    total,

  };

}



const FEATURE_SEGMENT_IDS = [

  "kiosk",

  "idCards",

  "themes",

  "prizes",

  "coupons",

  "raffle",

  "houses",

  "hallOfFame",

  "notifications",

  "bulletin",

  "library",

  "badges",

  "analytics",

  "attendance",

] as const;



export function timingFromFeatureNarration(

  narration: FeatureNarrationCue[],

  padAfterIntro = 10,

): { introEnd: number; segmentEnds: number[]; total: number } {

  const byId = Object.fromEntries(narration.map((c) => [c.id, c]));

  const intro = byId.intro;

  const outro = byId.outro;



  const introEnd =

    (intro?.startFrame ?? 14) + (intro?.durationFrames ?? 60) + padAfterIntro;



  const segmentEnds: number[] = [];

  for (let i = 0; i < FEATURE_SEGMENT_IDS.length; i++) {

    const id = FEATURE_SEGMENT_IDS[i];

    const nextId =

      i + 1 < FEATURE_SEGMENT_IDS.length

        ? FEATURE_SEGMENT_IDS[i + 1]

        : "outro";

    const nextCue = byId[nextId];

    segmentEnds.push(

      nextCue?.startFrame ??

        (byId[id]?.startFrame ?? introEnd) +

          (byId[id]?.durationFrames ?? 90) +

          12,

    );

  }



  const lastEnd = segmentEnds[segmentEnds.length - 1] ?? introEnd;

  const total = Math.max(

    lastEnd + 90,

    (outro?.startFrame ?? 0) + (outro?.durationFrames ?? 90) + 60,

  );



  return { introEnd, segmentEnds, total };

}


