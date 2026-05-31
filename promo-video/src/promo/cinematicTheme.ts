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

// All frame values are at 30fps
export const CT = {
  fps: 30,
  coldOpenEnd: 45,      // 1.5s cold open
  introEnd: 280,        // 45 + 235 (fits intro.mp3 - 227 frames)
  feature1End: 460,     // 280 + 180 (fits coupons.mp3 - 163 frames)
  feature2End: 655,     // 460 + 195 (fits kiosk.mp3 - 183 frames)
  feature3End: 805,     // 655 + 150 (fits analytics.mp3 - 132 frames)
  socialEnd: 975,       // 805 + 170 (fits portal.mp3 - 157 frames)
  total: 1205,          // 975 + 230 (fits outro.mp3 - 210 frames)
} as const;
