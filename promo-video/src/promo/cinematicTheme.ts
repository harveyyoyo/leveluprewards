import { defaultWidescreenPromoProps } from "./widescreenPromoDefaults";
import { CINEMATIC_VOICE_OFFSET } from "./cinematicVoice";

export const CINEMATIC = {
  navy: "#0a1628",
  navyMid: "#0f2040",
  navyLight: "#162d52",
  gold: "#f5c842",
  goldBright: "#ffd700",
  offWhite: "#f0f4ff",
  coral: "#ff6b6b",
  cyan: "#4cc9f0",
  green: "#52e875",
  textMuted: "#8fa8c8",
  textDim: "#4a6080",
} as const;

const shift = (frame: number) => frame + CINEMATIC_VOICE_OFFSET;
const wt = defaultWidescreenPromoProps.timing;

/** Scene cuts aligned to widescreen voiceover. */
export const CT = {
  fps: 30,
  coldOpenEnd: 0,
  introEnd: shift(wt.introEnd),
  feature1End: shift(wt.selectorEnd),
  feature2End: shift(wt.studentKioskEnd),
  feature3End: shift(wt.studentHomeEnd),
  outroEnd: shift(wt.dashboardEnd),
  total: shift(wt.total),
} as const;
