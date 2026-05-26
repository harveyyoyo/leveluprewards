import { WIDESCREEN_CLIPS } from "../promo/widescreenPromoTiming";
import type { WidescreenPromoProps } from "../promo/widescreenPromoSchema";
import type { TimelineBoundary, TimelineItem, TimelineTrack } from "./timeline";

const VIDEO_COLORS = {
  intro: "#7f00ff",
  selector: "#4cc9f0",
  kiosk: "#4895ef",
  home: "#f59e0b",
  dashboard: "#a855f7",
  action: "#27c93f",
  outro: "#ff007f",
};

const VOICE_COLORS = {
  intro: "#c084fc",
  selector: "#67e8f9",
  kiosk: "#93c5fd",
  home: "#fcd34d",
  dashboard: "#d8b4fe",
  action: "#86efac",
  outro: "#f9a8d4",
};

const CLIP_COLORS = {
  selector: "#0e7490",
  studentKiosk: "#1d4ed8",
  studentHome: "#b45309",
  dashboard: "#6d28d9",
  action: "#15803d",
};

const BASE_ASSETS: { path: string; kind: "music" | "voice" | "video" }[] = [
  { path: "background-music.mp3", kind: "music" },
  { path: WIDESCREEN_CLIPS.selector.src, kind: "video" },
  { path: WIDESCREEN_CLIPS.studentKiosk.src, kind: "video" },
  { path: WIDESCREEN_CLIPS.studentHome.src, kind: "video" },
  { path: WIDESCREEN_CLIPS.dashboard.src, kind: "video" },
  { path: WIDESCREEN_CLIPS.action.src, kind: "video" },
];

/** All media the composition loads — for asset checklist in the editor */
export function getWidescreenAssetManifest(
  props: WidescreenPromoProps,
): { path: string; kind: "music" | "voice" | "video" }[] {
  return [
    ...BASE_ASSETS,
    ...props.narration.map((c) => ({
      path: c.file,
      kind: "voice" as const,
    })),
  ];
}

export function propsToTimeline(props: WidescreenPromoProps): {
  tracks: TimelineTrack[];
  boundaries: TimelineBoundary[];
} {
  const { timing, narration } = props;

  const boundaries: TimelineBoundary[] = [
    { id: "introEnd", frame: timing.introEnd, label: "Intro end" },
    { id: "selectorEnd", frame: timing.selectorEnd, label: "ID card end" },
    { id: "studentKioskEnd", frame: timing.studentKioskEnd, label: "Print coupons end" },
    { id: "studentHomeEnd", frame: timing.studentHomeEnd, label: "Kiosk sign-in end" },
    { id: "dashboardEnd", frame: timing.dashboardEnd, label: "Prize shop end" },
    { id: "actionEnd", frame: timing.actionEnd, label: "Montage end" },
  ];

  const videoItems: TimelineItem[] = [
    {
      id: "intro",
      label: "Intro",
      subtitle: "motion graphics",
      start: 0,
      duration: timing.introEnd,
      color: VIDEO_COLORS.intro,
    },
    {
      id: "selector",
      label: "ID card",
      subtitle: WIDESCREEN_CLIPS.selector.src,
      start: timing.introEnd,
      duration: timing.selectorEnd - timing.introEnd,
      color: VIDEO_COLORS.selector,
    },
    {
      id: "kiosk",
      label: "Print coupons",
      subtitle: WIDESCREEN_CLIPS.studentKiosk.src,
      start: timing.selectorEnd,
      duration: timing.studentKioskEnd - timing.selectorEnd,
      color: VIDEO_COLORS.kiosk,
    },
    {
      id: "home",
      label: "Kiosk sign-in",
      subtitle: WIDESCREEN_CLIPS.studentHome.src,
      start: timing.studentKioskEnd,
      duration: timing.studentHomeEnd - timing.studentKioskEnd,
      color: VIDEO_COLORS.home,
    },
    {
      id: "dashboard",
      label: "Prize shop",
      subtitle: WIDESCREEN_CLIPS.dashboard.src,
      start: timing.studentHomeEnd,
      duration: timing.dashboardEnd - timing.studentHomeEnd,
      color: VIDEO_COLORS.dashboard,
    },
    {
      id: "action",
      label: "Scan entry",
      subtitle: WIDESCREEN_CLIPS.action.src,
      start: timing.dashboardEnd,
      duration: timing.actionEnd - timing.dashboardEnd,
      color: VIDEO_COLORS.action,
    },
    {
      id: "outro",
      label: "Outro",
      subtitle: "motion graphics",
      start: timing.actionEnd,
      duration: timing.total - timing.actionEnd,
      color: VIDEO_COLORS.outro,
    },
  ];

  const clipItems: TimelineItem[] = (
    [
      ["selector", timing.introEnd, timing.selectorEnd],
      ["studentKiosk", timing.selectorEnd, timing.studentKioskEnd],
      ["studentHome", timing.studentKioskEnd, timing.studentHomeEnd],
      ["dashboard", timing.studentHomeEnd, timing.dashboardEnd],
      ["action", timing.dashboardEnd, timing.actionEnd],
    ] as const
  ).map(([key, start, end]) => {
    const clip = WIDESCREEN_CLIPS[key];
    return {
      id: `clip-${key}`,
      label:
        key === "studentKiosk"
          ? "Teacher print"
          : key === "studentHome"
            ? "Kiosk sign-in"
            : key === "selector"
              ? "ID card tab"
              : key === "dashboard"
                ? "Prize shop"
                : "Scan entry",
      subtitle: clip.src,
      start,
      duration: end - start,
      color: CLIP_COLORS[key],
    };
  });

  const voiceItems: TimelineItem[] = narration.map((cue) => {
    const fileName = cue.file.split("/").pop() ?? cue.file;
    return {
      id: cue.id,
      label: cue.label,
      subtitle: fileName,
      start: cue.startFrame,
      duration: cue.durationFrames,
      color: VOICE_COLORS[cue.id as keyof typeof VOICE_COLORS] ?? "#94a3b8",
      minDuration: 20,
    };
  });

  const musicItem: TimelineItem = {
    id: "bg-music",
    label: "Background music",
    subtitle: `background-music.mp3 · vol ${props.musicVolume} · duck ${props.musicDuckRatio}`,
    start: 0,
    duration: timing.total,
    color: "#eab308",
  };

  return {
    boundaries,
    tracks: [
      { id: "video", label: "Sections", items: videoItems, mode: "boundaries" },
      { id: "clips", label: "B-roll", items: clipItems, mode: "free", readOnly: true },
      { id: "voice", label: "Voice", items: voiceItems, mode: "free" },
      { id: "music", label: "Music", items: [musicItem], mode: "free", readOnly: true },
    ],
  };
}

export function boundariesToTiming(
  boundaries: TimelineBoundary[],
  total: number,
): WidescreenPromoProps["timing"] {
  const byId = Object.fromEntries(boundaries.map((b) => [b.id, b.frame]));
  return {
    introEnd: byId.introEnd ?? 70,
    selectorEnd: byId.selectorEnd ?? 155,
    studentKioskEnd: byId.studentKioskEnd ?? 275,
    studentHomeEnd: byId.studentHomeEnd ?? 375,
    dashboardEnd: byId.dashboardEnd ?? 495,
    actionEnd: byId.actionEnd ?? 615,
    total,
  };
}

export function voiceTrackToNarration(
  track: TimelineTrack,
  prev: WidescreenPromoProps,
): WidescreenPromoProps["narration"] {
  const prevById = Object.fromEntries(prev.narration.map((c) => [c.id, c]));
  return track.items.map((it) => {
    const base = prevById[it.id];
    return {
      id: it.id,
      label: base?.label ?? it.label,
      text: base?.text ?? "",
      file: base?.file ?? `voiceover/widescreen/${it.id}.mp3`,
      startFrame: it.start,
      durationFrames: it.duration,
    };
  });
}

export function applyTimelineToProps(
  tracks: TimelineTrack[],
  boundaries: TimelineBoundary[],
  prev: WidescreenPromoProps,
): WidescreenPromoProps {
  const voice = tracks.find((t) => t.id === "voice");
  const timing = boundariesToTiming(boundaries, prev.timing.total);
  return {
    ...prev,
    timing,
    narration: voice ? voiceTrackToNarration(voice, prev) : prev.narration,
  };
}
