import type { FeatureCalloutConfig } from "./shared";
import { BRAND } from "./theme";

export type PortraitVariantTiming = {
  fps: number;
  introEnd: number;
  demoEnd: number;
  total: number;
};

const SHORT_FEATURES: FeatureCalloutConfig[] = [
  {
    start: 90,
    end: 165,
    emoji: "⚡",
    title: "Award points instantly",
    body: "Teachers reward behavior and homework in one tap.",
    color: BRAND.pink,
  },
  {
    start: 165,
    end: 255,
    emoji: "🎮",
    title: "Students stay motivated",
    body: "Arcade kiosk, coupons, and prizes students actually want.",
    color: BRAND.cyan,
  },
  {
    start: 255,
    end: 345,
    emoji: "📊",
    title: "Everything in sync",
    body: "Live balances and class rosters across every device.",
    color: BRAND.purple,
  },
];

const EXTENDED_FEATURES: FeatureCalloutConfig[] = [
  {
    start: 105,
    end: 220,
    emoji: "🎯",
    title: "One portal, every role",
    body: "Student kiosk, teacher tools, and admin — pick where to go.",
    color: BRAND.pink,
  },
  {
    start: 225,
    end: 340,
    emoji: "🎮",
    title: "Student kiosk & prizes",
    body: "Scan in, redeem coupons, and browse the rewards shop.",
    color: BRAND.cyan,
  },
  {
    start: 345,
    end: 470,
    emoji: "📋",
    title: "Teacher dashboard",
    body: "Roster, classes, and points built for daily classroom flow.",
    color: BRAND.blue,
  },
  {
    start: 475,
    end: 600,
    emoji: "⚡",
    title: "Reward in seconds",
    body: "Print coupons or award points without leaving the portal.",
    color: BRAND.green,
  },
  {
    start: 605,
    end: 720,
    emoji: "📊",
    title: "Live sync everywhere",
    body: "Balances and activity stay aligned on every device.",
    color: BRAND.purple,
  },
];

export type PromoVariantConfig = {
  id: string;
  width: number;
  height: number;
  timing: PortraitVariantTiming;
  walkthroughSrc: string;
  playbackRate: number;
  features: FeatureCalloutConfig[];
  demoLabel: string;
  layout: "portrait" | "square";
};

export const TEASER_VARIANT: PromoVariantConfig = {
  id: "TeaserPromo",
  width: 1080,
  height: 1920,
  timing: { fps: 30, introEnd: 45, demoEnd: 135, total: 180 },
  walkthroughSrc: "walkthrough-fast.mp4",
  playbackRate: 2.8,
  features: [] as FeatureCalloutConfig[],
  demoLabel: "LevelUp",
  layout: "portrait" as const,
};

export const SQUARE_VARIANT: PromoVariantConfig = {
  id: "SquarePromo",
  width: 1080,
  height: 1080,
  timing: { fps: 30, introEnd: 75, demoEnd: 375, total: 450 },
  walkthroughSrc: "walkthrough-fast.mp4",
  playbackRate: 2.15,
  features: SHORT_FEATURES,
  demoLabel: "See it in action",
  layout: "square" as const,
};

export const EXTENDED_VARIANT: PromoVariantConfig = {
  id: "ExtendedPromo30",
  width: 1080,
  height: 1920,
  timing: { fps: 30, introEnd: 90, demoEnd: 750, total: 900 },
  walkthroughSrc: "walkthrough-fast.mp4",
  playbackRate: 1.85,
  features: EXTENDED_FEATURES,
  demoLabel: "Full product tour",
  layout: "portrait" as const,
};
