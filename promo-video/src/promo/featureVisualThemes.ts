export type FeatureVisualThemeId =
  | "neon"
  | "aurora"
  | "chalkboard"
  | "arcade";

export type FeatureVisualTheme = {
  id: FeatureVisualThemeId;
  bg: string;
  backgroundGradient: string;
  glowA: string;
  glowB: string;
  gridColor: string;
  gridOpacity: number;
  introFlash: string;
  primary: string;
  secondary: string;
  tertiary: string;
  textMuted: string;
  browserBg: string;
  browserTop: string;
  browserBorder: string;
  browserGlow: string;
  addressBg: string;
  addressText: string;
  sparkle: string;
  railTrack: string;
};

export const FEATURE_VISUAL_THEMES: Record<
  FeatureVisualThemeId,
  FeatureVisualTheme
> = {
  neon: {
    id: "neon",
    bg: "#04030a",
    backgroundGradient:
      "linear-gradient(125deg, #03020a 0%, #0a0618 40%, #04030a 100%)",
    glowA: "rgba(255, 0, 127, 0.22)",
    glowB: "rgba(127, 0, 255, 0.2)",
    gridColor: "rgba(255,255,255,0.5)",
    gridOpacity: 0.04,
    introFlash: "255, 0, 127",
    primary: "#ff007f",
    secondary: "#7f00ff",
    tertiary: "#4cc9f0",
    textMuted: "#cbd5e0",
    browserBg: "#0c0a1a",
    browserTop: "linear-gradient(180deg, #1a1830, #121124)",
    browserBorder: "rgba(255, 255, 255, 0.14)",
    browserGlow: "rgba(127, 0, 255, 0.35)",
    addressBg: "rgba(0,0,0,0.4)",
    addressText: "#94a3b8",
    sparkle: "#4cc9f0",
    railTrack: "rgba(255,255,255,0.08)",
  },
  aurora: {
    id: "aurora",
    bg: "#031411",
    backgroundGradient:
      "linear-gradient(130deg, #031411 0%, #082d34 38%, #1b1436 100%)",
    glowA: "rgba(45, 212, 191, 0.26)",
    glowB: "rgba(244, 114, 182, 0.2)",
    gridColor: "rgba(187,247,208,0.58)",
    gridOpacity: 0.045,
    introFlash: "45, 212, 191",
    primary: "#2dd4bf",
    secondary: "#f472b6",
    tertiary: "#fde68a",
    textMuted: "#d7fbe8",
    browserBg: "#061c20",
    browserTop: "linear-gradient(180deg, #12343a, #092126)",
    browserBorder: "rgba(153, 246, 228, 0.22)",
    browserGlow: "rgba(45, 212, 191, 0.36)",
    addressBg: "rgba(2,44,34,0.68)",
    addressText: "#bbf7d0",
    sparkle: "#fde68a",
    railTrack: "rgba(187,247,208,0.12)",
  },
  chalkboard: {
    id: "chalkboard",
    bg: "#081f1a",
    backgroundGradient:
      "linear-gradient(125deg, #061b16 0%, #12372f 45%, #1d2430 100%)",
    glowA: "rgba(250, 204, 21, 0.18)",
    glowB: "rgba(96, 165, 250, 0.2)",
    gridColor: "rgba(254,249,195,0.62)",
    gridOpacity: 0.055,
    introFlash: "250, 204, 21",
    primary: "#facc15",
    secondary: "#60a5fa",
    tertiary: "#fef3c7",
    textMuted: "#e7ead7",
    browserBg: "#102820",
    browserTop: "linear-gradient(180deg, #253c34, #152820)",
    browserBorder: "rgba(254, 243, 199, 0.22)",
    browserGlow: "rgba(250, 204, 21, 0.22)",
    addressBg: "rgba(4,25,19,0.72)",
    addressText: "#fef3c7",
    sparkle: "#facc15",
    railTrack: "rgba(254,243,199,0.13)",
  },
  arcade: {
    id: "arcade",
    bg: "#090616",
    backgroundGradient:
      "linear-gradient(120deg, #090616 0%, #191033 36%, #111827 100%)",
    glowA: "rgba(34, 211, 238, 0.22)",
    glowB: "rgba(251, 191, 36, 0.2)",
    gridColor: "rgba(125,211,252,0.64)",
    gridOpacity: 0.06,
    introFlash: "34, 211, 238",
    primary: "#22d3ee",
    secondary: "#fbbf24",
    tertiary: "#fb7185",
    textMuted: "#dbeafe",
    browserBg: "#10122a",
    browserTop: "linear-gradient(180deg, #25214d, #141631)",
    browserBorder: "rgba(125, 211, 252, 0.22)",
    browserGlow: "rgba(251, 191, 36, 0.24)",
    addressBg: "rgba(2,6,23,0.7)",
    addressText: "#bae6fd",
    sparkle: "#fbbf24",
    railTrack: "rgba(186,230,253,0.12)",
  },
};

export function getFeatureVisualTheme(
  id: FeatureVisualThemeId | undefined,
): FeatureVisualTheme {
  return FEATURE_VISUAL_THEMES[id ?? "neon"];
}
