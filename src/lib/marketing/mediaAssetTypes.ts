/** Shared labels for promo clips, marketing screenshots, and app media. */

export type MediaUsageSlot =
  | ""
  | "intro-scan-in"
  | "intro-earn-points"
  | "intro-pick-prizes"
  | "id-card"
  | "kiosk-sign-in"
  | "prize-shop"
  | "portal-hub"
  | "marketing-showcase"
  | "marketing-flyer"
  | "marketing-social"
  | "feature-broll"
  | "not-for-use";

export type MediaAssetKind = "video" | "image";

export type MediaAssetItem = {
  id: string;
  path: string;
  category: string;
  filename: string;
  kind: MediaAssetKind;
  /** Browser URL for previews in the main app */
  publicUrl: string;
};

export type MediaAssetLabel = {
  displayName: string;
  description: string;
  usage: MediaUsageSlot;
  notes: string;
  reviewed: boolean;
};

export type MediaAssetLabelsFile = {
  updatedAt: string;
  items: Record<string, MediaAssetLabel>;
};

export const MEDIA_USAGE_OPTIONS: {
  value: MediaUsageSlot;
  label: string;
  hint?: string;
  group: "promo" | "marketing" | "other";
}[] = [
  { value: "", label: "— Not labeled yet —", group: "other" },
  {
    value: "intro-scan-in",
    label: "Promo · intro scan in",
    hint: "Widescreen voice: “Students scan in…”",
    group: "promo",
  },
  {
    value: "intro-earn-points",
    label: "Promo · intro earn points",
    hint: "Widescreen voice: “…earn points…”",
    group: "promo",
  },
  {
    value: "intro-pick-prizes",
    label: "Promo · intro pick prizes",
    hint: "Widescreen voice: “…pick their prizes.”",
    group: "promo",
  },
  {
    value: "id-card",
    label: "Promo · ID cards",
    hint: "Montage after intro",
    group: "promo",
  },
  {
    value: "kiosk-sign-in",
    label: "Promo · kiosk sign-in",
    group: "promo",
  },
  {
    value: "prize-shop",
    label: "Promo · prize shop",
    group: "promo",
  },
  {
    value: "portal-hub",
    label: "Promo · school portal",
    group: "promo",
  },
  {
    value: "marketing-showcase",
    label: "Marketing · home / showcase page",
    hint: "ShowcaseLanding sections",
    group: "marketing",
  },
  {
    value: "marketing-flyer",
    label: "Marketing · printable flyer",
    hint: "Flyer HTML img slots",
    group: "marketing",
  },
  {
    value: "marketing-social",
    label: "Marketing · social / ads",
    group: "marketing",
  },
  {
    value: "feature-broll",
    label: "Feature promo b-roll",
    group: "other",
  },
  {
    value: "not-for-use",
    label: "Do not use",
    hint: "Wrong take or archived",
    group: "other",
  },
];

/** Files currently wired in Remotion widescreen promo (reference for labeler). */
export const WIDESCREEN_CLIP_USAGE: Record<string, MediaUsageSlot> = {
  "capture-library/student-kiosk/kiosk-type-entry.mp4": "intro-scan-in",
  "capture-library/student-kiosk/kiosk-new-points-on-entry.mp4":
    "intro-earn-points",
  "capture-library/student-kiosk/student-kiosk.mp4": "intro-pick-prizes",
  "capture-library/admin/admin-id-card-preview.mp4": "id-card",
  "capture-library/student-kiosk/kiosk-signin-welcome-points.mp4":
    "kiosk-sign-in",
};

export function emptyMediaLabel(): MediaAssetLabel {
  return {
    displayName: "",
    description: "",
    usage: "",
    notes: "",
    reviewed: false,
  };
}

export function normalizeMediaLabelsFile(
  raw: Partial<MediaAssetLabelsFile> & {
    items?: Record<string, Partial<MediaAssetLabel> & { promoBeat?: string }>;
  } | null,
): MediaAssetLabelsFile {
  const items: Record<string, MediaAssetLabel> = {};
  for (const [pathKey, entry] of Object.entries(raw?.items ?? {})) {
    const usage = (entry.usage ??
      entry.promoBeat ??
      "") as MediaUsageSlot;
    items[pathKey] = {
      ...emptyMediaLabel(),
      ...entry,
      usage,
    };
  }
  return {
    updatedAt: raw?.updatedAt ?? new Date(0).toISOString(),
    items,
  };
}

const PROMO_BROLL_CLIP_NAMES = new Set([
  "kiosk-prize-shop",
  "kiosk-scan-tab",
  "portal-hub-overview",
  "teacher-award-points-flow",
  "teacher-jackpot-pull",
  "teacher-wheel-spin",
]);

/** Whether Playwright can re-record this asset path. */
export function canRecaptureMediaAsset(relPath: string): boolean {
  return getRecaptureSummary(relPath) !== null;
}

export function getRecaptureSummary(relPath: string): string | null {
  const normalized = relPath.replace(/\\/g, "/");

  if (normalized.startsWith("marketing/screenshots/")) {
    const name = normalized.split("/").pop()?.replace(/\.png$/i, "") ?? "";
    return name ? `Screenshot · ${name}` : null;
  }

  if (!normalized.startsWith("capture-library/")) return null;

  const inner = normalized
    .slice("capture-library/".length)
    .replace(/\.mp4$/i, "");
  if (!inner.includes("/")) return null;

  if (/^student-kiosk\/kiosk-coupon-redeem-\d+$/.test(inner)) {
    return `Coupon redeem · ${inner.split("-").pop()}`;
  }

  const clipName = inner.split("/").pop() ?? "";
  if (PROMO_BROLL_CLIP_NAMES.has(clipName) || inner.startsWith("raffle/")) {
    return `Promo b-roll · ${clipName}`;
  }

  return `Library clip · ${inner}`;
}

/** @deprecated use MediaAssetLabel */
export type CaptureLibraryLabel = MediaAssetLabel;
/** @deprecated use MediaAssetLabelsFile */
export type CaptureLibraryLabelsFile = MediaAssetLabelsFile;
/** @deprecated use MediaAssetItem */
export type CaptureLibraryItem = MediaAssetItem;
/** @deprecated use MediaUsageSlot */
export type PromoBeatSlot = MediaUsageSlot;
export const PROMO_BEAT_OPTIONS = MEDIA_USAGE_OPTIONS.filter(
  (o) => o.group === "promo" || o.value === "" || o.value === "not-for-use" || o.value === "feature-broll",
);
export const emptyLabel = emptyMediaLabel;
export const normalizeLabelsFile = normalizeMediaLabelsFile;
