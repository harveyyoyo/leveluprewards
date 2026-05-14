import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";

interface WelcomeGreetingProps {
  name?: string;
}

type StyleId =
  | "confetti"
  | "typewriter"
  | "cinematic"
  | "terminal"
  | "card"
  | "magazine"
  | "constellation"
  | "polaroid"
  | "neon"
  | "origami"
  | "arcade"
  | "zen"
  | "subway"
  | "hologram"
  | "chalkboard"
  | "vaporwave"
  | "comic"
  | "stained"
  | "pixelgarden"
  | "kaleidoscope"
  | "receipt"
  | "tarot"
  | "vinyl"
  | "weather"
  | "postcard"
  | "lavalamp"
  | "storybook"
  | "gemara"
  | "beismedrash"
  | "shtender"
  | "mazeltov";

interface StyleMeta {
  id: StyleId;
  label: string;
  emoji: string;
  blurb: string;
}

const STYLES: StyleMeta[] = [
  { id: "confetti", label: "Confetti Party", emoji: "🎉", blurb: "Big, loud, joyful" },
  { id: "typewriter", label: "Typewriter", emoji: "⌨️", blurb: "Letter by letter" },
  { id: "cinematic", label: "Cinematic", emoji: "🎬", blurb: "Dramatic hero" },
  { id: "terminal", label: "Terminal", emoji: "💻", blurb: "Hacker boot" },
  { id: "card", label: "Boarding Pass", emoji: "🎫", blurb: "Personal ticket" },
  { id: "magazine", label: "Magazine", emoji: "📰", blurb: "Editorial splash" },
  { id: "constellation", label: "Constellation", emoji: "✨", blurb: "Stars connect your name" },
  { id: "polaroid", label: "Polaroid", emoji: "📸", blurb: "Developing instant photo" },
  { id: "neon", label: "Neon Sign", emoji: "🪩", blurb: "Buzzing neon lights" },
  { id: "origami", label: "Origami", emoji: "🪷", blurb: "Folded paper layers" },
  { id: "arcade", label: "Arcade", emoji: "🕹️", blurb: "8-bit press start" },
  { id: "zen", label: "Zen Garden", emoji: "🪨", blurb: "Calm rake patterns" },
  { id: "subway", label: "Subway", emoji: "🚇", blurb: "NYC station sign" },
  { id: "hologram", label: "Hologram", emoji: "👾", blurb: "Glitchy projection" },
  { id: "chalkboard", label: "Chalkboard", emoji: "🍰", blurb: "Bakery sidewalk sign" },
  { id: "vaporwave", label: "Vaporwave", emoji: "🌴", blurb: "80s sunset grid" },
  { id: "comic", label: "Comic Book", emoji: "💥", blurb: "POW! halftone panels" },
  { id: "stained", label: "Stained Glass", emoji: "⛪", blurb: "Cathedral mosaic" },
  { id: "pixelgarden", label: "Pixel Garden", emoji: "🌱", blurb: "Sprouting pixel flora" },
  { id: "kaleidoscope", label: "Kaleidoscope", emoji: "🔮", blurb: "Mirrored geometry" },
  { id: "receipt", label: "Receipt", emoji: "🧾", blurb: "Itemized welcome" },
  { id: "tarot", label: "Tarot Card", emoji: "🔮", blurb: "Mystical fortune drawn" },
  { id: "vinyl", label: "Vinyl Record", emoji: "💿", blurb: "Spinning album sleeve" },
  { id: "weather", label: "Weather Card", emoji: "⛅", blurb: "Forecast for your day" },
  { id: "postcard", label: "Postcard", emoji: "📮", blurb: "Greetings from afar" },
  { id: "lavalamp", label: "Lava Lamp", emoji: "🫧", blurb: "Drifting blobs of color" },
  { id: "storybook", label: "Storybook", emoji: "📖", blurb: "Once upon a time…" },
  { id: "gemara", label: "Daf Gemara", emoji: "📜", blurb: "Talmud page in your name" },
  { id: "beismedrash", label: "Beis Medrash", emoji: "🕯️", blurb: "Chavrusa learning glow" },
  { id: "shtender", label: "Shtender", emoji: "📚", blurb: "Sefer open on the lectern" },
  { id: "mazeltov", label: "Mazel Tov", emoji: "🍷", blurb: "L'chaim simcha banner" },
];

/* ============== PALETTES ==============
 * Each palette is an array of { id, label, swatches, vars }.
 * vars are CSS custom properties consumed by the style components.
 */
interface Palette {
  id: string;
  label: string;
  swatches: string[];
  vars: Record<string, string>;
}

const PALETTES: Record<StyleId, Palette[]> = {
  confetti: [
    {
      id: "candy",
      label: "Candy",
      swatches: ["#ff6b9d", "#ffb347", "#ffe66d", "#7ee8c0"],
      vars: {
        "--bg-from": "#ffe4ec",
        "--bg-via": "#fff7e0",
        "--bg-to": "#e0f2fe",
        "--blob-1": "#ff9bbf",
        "--blob-2": "#7ec8ff",
        "--accent": "#ec4899",
        "--text": "#0f172a",
        "--c1": "#ff6b9d",
        "--c2": "#ffb347",
        "--c3": "#ffe66d",
        "--c4": "#7ee8c0",
        "--c5": "#7ec8ff",
        "--c6": "#c79bff",
      },
    },
    {
      id: "tropical",
      label: "Tropical",
      swatches: ["#06b6d4", "#10b981", "#facc15", "#f97316"],
      vars: {
        "--bg-from": "#ecfeff",
        "--bg-via": "#fef9c3",
        "--bg-to": "#ffedd5",
        "--blob-1": "#5eead4",
        "--blob-2": "#fde047",
        "--accent": "#0891b2",
        "--text": "#083344",
        "--c1": "#06b6d4",
        "--c2": "#10b981",
        "--c3": "#facc15",
        "--c4": "#f97316",
        "--c5": "#ef4444",
        "--c6": "#8b5cf6",
      },
    },
    {
      id: "berry",
      label: "Berry",
      swatches: ["#a855f7", "#ec4899", "#f43f5e", "#8b5cf6"],
      vars: {
        "--bg-from": "#faf5ff",
        "--bg-via": "#fdf2f8",
        "--bg-to": "#fff1f2",
        "--blob-1": "#d8b4fe",
        "--blob-2": "#fda4af",
        "--accent": "#a21caf",
        "--text": "#3b0764",
        "--c1": "#a855f7",
        "--c2": "#ec4899",
        "--c3": "#f43f5e",
        "--c4": "#8b5cf6",
        "--c5": "#c084fc",
        "--c6": "#f9a8d4",
      },
    },
    {
      id: "monoblack",
      label: "Mono",
      swatches: ["#111", "#444", "#888", "#ccc"],
      vars: {
        "--bg-from": "#fafafa",
        "--bg-via": "#f4f4f5",
        "--bg-to": "#e4e4e7",
        "--blob-1": "#d4d4d8",
        "--blob-2": "#a1a1aa",
        "--accent": "#111111",
        "--text": "#0a0a0a",
        "--c1": "#111111",
        "--c2": "#404040",
        "--c3": "#737373",
        "--c4": "#a3a3a3",
        "--c5": "#525252",
        "--c6": "#262626",
      },
    },
  ],
  typewriter: [
    {
      id: "paper",
      label: "Paper",
      swatches: ["#fafaf9", "#1c1917"],
      vars: { "--bg": "#fafaf9", "--text": "#1c1917", "--accent": "#0a0a0a" },
    },
    {
      id: "amber",
      label: "Amber CRT",
      swatches: ["#1a0f00", "#fb923c"],
      vars: { "--bg": "#1a0f00", "--text": "#fdba74", "--accent": "#fb923c" },
    },
    {
      id: "phosphor",
      label: "Phosphor",
      swatches: ["#001a0a", "#4ade80"],
      vars: { "--bg": "#001a0a", "--text": "#86efac", "--accent": "#22c55e" },
    },
    {
      id: "blueprint",
      label: "Blueprint",
      swatches: ["#0c2a4d", "#bfdbfe"],
      vars: { "--bg": "#0c2a4d", "--text": "#dbeafe", "--accent": "#60a5fa" },
    },
  ],
  cinematic: [
    {
      id: "noir",
      label: "Noir",
      swatches: ["#000", "#fde68a"],
      vars: {
        "--bg": "#000000",
        "--bars": "#000000",
        "--spotlight": "rgba(255,220,180,0.35)",
        "--text": "#ffffff",
        "--accent": "#fde68a",
        "--sub": "rgba(253,230,138,0.8)",
      },
    },
    {
      id: "blade",
      label: "Blade",
      swatches: ["#0a0014", "#ff3b8a"],
      vars: {
        "--bg": "#0a0014",
        "--bars": "#000000",
        "--spotlight": "rgba(255,59,138,0.35)",
        "--text": "#ffffff",
        "--accent": "#ff3b8a",
        "--sub": "rgba(255,59,138,0.85)",
      },
    },
    {
      id: "vintage",
      label: "Vintage",
      swatches: ["#1a0d05", "#d4a574"],
      vars: {
        "--bg": "#1a0d05",
        "--bars": "#000000",
        "--spotlight": "rgba(212,165,116,0.40)",
        "--text": "#fef3c7",
        "--accent": "#d4a574",
        "--sub": "rgba(212,165,116,0.85)",
      },
    },
    {
      id: "deepsea",
      label: "Deep Sea",
      swatches: ["#011627", "#7dd3fc"],
      vars: {
        "--bg": "#011627",
        "--bars": "#000000",
        "--spotlight": "rgba(125,211,252,0.30)",
        "--text": "#ffffff",
        "--accent": "#7dd3fc",
        "--sub": "rgba(125,211,252,0.8)",
      },
    },
  ],
  terminal: [
    {
      id: "matrix",
      label: "Matrix",
      swatches: ["#000", "#4ade80"],
      vars: { "--bg": "#000000", "--text": "#4ade80", "--accent": "#86efac", "--dim": "rgba(74,222,128,0.6)" },
    },
    {
      id: "amber",
      label: "Amber",
      swatches: ["#0a0500", "#fb923c"],
      vars: { "--bg": "#0a0500", "--text": "#fb923c", "--accent": "#fed7aa", "--dim": "rgba(251,146,60,0.6)" },
    },
    {
      id: "ice",
      label: "Ice",
      swatches: ["#020617", "#7dd3fc"],
      vars: { "--bg": "#020617", "--text": "#7dd3fc", "--accent": "#bae6fd", "--dim": "rgba(125,211,252,0.6)" },
    },
    {
      id: "magenta",
      label: "Magenta",
      swatches: ["#1a0014", "#f472b6"],
      vars: { "--bg": "#1a0014", "--text": "#f472b6", "--accent": "#fbcfe8", "--dim": "rgba(244,114,182,0.6)" },
    },
  ],
  card: [
    {
      id: "sky",
      label: "Sky",
      swatches: ["#6366f1", "#10b981"],
      vars: {
        "--bg-from": "#e0e7ff",
        "--bg-via": "#e0f2fe",
        "--bg-to": "#d1fae5",
        "--card": "#ffffff",
        "--text": "#0f172a",
        "--muted": "#64748b",
        "--accent": "#0f172a",
        "--avatar-from": "#6366f1",
        "--avatar-to": "#10b981",
      },
    },
    {
      id: "sunset",
      label: "Sunset",
      swatches: ["#f97316", "#ec4899"],
      vars: {
        "--bg-from": "#ffedd5",
        "--bg-via": "#fff7ed",
        "--bg-to": "#fce7f3",
        "--card": "#fffbeb",
        "--text": "#431407",
        "--muted": "#9a3412",
        "--accent": "#9a3412",
        "--avatar-from": "#f97316",
        "--avatar-to": "#ec4899",
      },
    },
    {
      id: "midnight",
      label: "Midnight",
      swatches: ["#0f172a", "#a78bfa"],
      vars: {
        "--bg-from": "#1e293b",
        "--bg-via": "#0f172a",
        "--bg-to": "#020617",
        "--card": "#1e293b",
        "--text": "#f1f5f9",
        "--muted": "#94a3b8",
        "--accent": "#1e293b",
        "--avatar-from": "#a78bfa",
        "--avatar-to": "#22d3ee",
      },
    },
    {
      id: "kraft",
      label: "Kraft",
      swatches: ["#92400e", "#facc15"],
      vars: {
        "--bg-from": "#fef3c7",
        "--bg-via": "#fde68a",
        "--bg-to": "#fef3c7",
        "--card": "#fffbeb",
        "--text": "#451a03",
        "--muted": "#78350f",
        "--accent": "#78350f",
        "--avatar-from": "#92400e",
        "--avatar-to": "#facc15",
      },
    },
  ],
  magazine: [
    {
      id: "rose",
      label: "Rose",
      swatches: ["#e11d48", "#fde68a"],
      vars: { "--bg": "#fef3c7", "--cover": "#e11d48", "--text": "#ffffff", "--accent": "#fde68a", "--btn-text": "#e11d48" },
    },
    {
      id: "vogue",
      label: "Vogue",
      swatches: ["#000", "#fff"],
      vars: { "--bg": "#fafafa", "--cover": "#000000", "--text": "#ffffff", "--accent": "#fde68a", "--btn-text": "#000000" },
    },
    {
      id: "indigo",
      label: "Indigo",
      swatches: ["#3730a3", "#fbbf24"],
      vars: { "--bg": "#eef2ff", "--cover": "#3730a3", "--text": "#ffffff", "--accent": "#fbbf24", "--btn-text": "#3730a3" },
    },
    {
      id: "sage",
      label: "Sage",
      swatches: ["#166534", "#fef3c7"],
      vars: { "--bg": "#f7fee7", "--cover": "#166534", "--text": "#ffffff", "--accent": "#fef08a", "--btn-text": "#166534" },
    },
  ],
  constellation: [
    {
      id: "midnight",
      label: "Midnight",
      swatches: ["#020617", "#a5b4fc"],
      vars: { "--bg-from": "#020617", "--bg-to": "#1e1b4b", "--star": "#ffffff", "--line": "rgba(165,180,252,0.6)", "--text": "#ffffff", "--accent": "#a5b4fc" },
    },
    {
      id: "aurora",
      label: "Aurora",
      swatches: ["#022c22", "#5eead4"],
      vars: { "--bg-from": "#022c22", "--bg-to": "#0c4a6e", "--star": "#d1fae5", "--line": "rgba(94,234,212,0.6)", "--text": "#ecfeff", "--accent": "#5eead4" },
    },
    {
      id: "mars",
      label: "Mars",
      swatches: ["#450a0a", "#fb923c"],
      vars: { "--bg-from": "#450a0a", "--bg-to": "#1c0a05", "--star": "#fed7aa", "--line": "rgba(251,146,60,0.6)", "--text": "#fff7ed", "--accent": "#fb923c" },
    },
    {
      id: "rose",
      label: "Rose",
      swatches: ["#1a0a14", "#f472b6"],
      vars: { "--bg-from": "#1a0a14", "--bg-to": "#4a044e", "--star": "#fce7f3", "--line": "rgba(244,114,182,0.6)", "--text": "#fdf2f8", "--accent": "#f472b6" },
    },
  ],
  polaroid: [
    {
      id: "sunny",
      label: "Sunny",
      swatches: ["#facc15", "#fef3c7"],
      vars: { "--bg": "#fef3c7", "--frame": "#ffffff", "--photo-from": "#fde68a", "--photo-to": "#fb923c", "--text": "#1c1917", "--accent": "#92400e" },
    },
    {
      id: "ocean",
      label: "Ocean",
      swatches: ["#0ea5e9", "#dbeafe"],
      vars: { "--bg": "#dbeafe", "--frame": "#ffffff", "--photo-from": "#7dd3fc", "--photo-to": "#3b82f6", "--text": "#0c4a6e", "--accent": "#0369a1" },
    },
    {
      id: "forest",
      label: "Forest",
      swatches: ["#16a34a", "#dcfce7"],
      vars: { "--bg": "#dcfce7", "--frame": "#fafaf9", "--photo-from": "#86efac", "--photo-to": "#16a34a", "--text": "#14532d", "--accent": "#15803d" },
    },
    {
      id: "vintage",
      label: "Vintage",
      swatches: ["#a16207", "#fef3c7"],
      vars: { "--bg": "#fef3c7", "--frame": "#fefce8", "--photo-from": "#fde047", "--photo-to": "#a16207", "--text": "#451a03", "--accent": "#78350f" },
    },
  ],
  neon: [
    {
      id: "miami",
      label: "Miami",
      swatches: ["#ec4899", "#06b6d4"],
      vars: { "--bg": "#0a0014", "--neon-1": "#ec4899", "--neon-2": "#06b6d4", "--text": "#ffffff" },
    },
    {
      id: "lime",
      label: "Lime",
      swatches: ["#a3e635", "#22d3ee"],
      vars: { "--bg": "#0a0a0a", "--neon-1": "#a3e635", "--neon-2": "#22d3ee", "--text": "#ffffff" },
    },
    {
      id: "vegas",
      label: "Vegas",
      swatches: ["#facc15", "#ef4444"],
      vars: { "--bg": "#1a0500", "--neon-1": "#facc15", "--neon-2": "#ef4444", "--text": "#fef3c7" },
    },
    {
      id: "violet",
      label: "Violet",
      swatches: ["#a855f7", "#f0abfc"],
      vars: { "--bg": "#1a0a2e", "--neon-1": "#a855f7", "--neon-2": "#f0abfc", "--text": "#ffffff" },
    },
  ],
  origami: [
    {
      id: "lotus",
      label: "Lotus",
      swatches: ["#fb7185", "#fda4af", "#fff"],
      vars: { "--bg": "#fff1f2", "--p1": "#fb7185", "--p2": "#fda4af", "--p3": "#fecdd3", "--p4": "#fff", "--text": "#881337", "--accent": "#e11d48" },
    },
    {
      id: "crane",
      label: "Crane",
      swatches: ["#0ea5e9", "#bae6fd", "#fff"],
      vars: { "--bg": "#f0f9ff", "--p1": "#0ea5e9", "--p2": "#7dd3fc", "--p3": "#bae6fd", "--p4": "#fff", "--text": "#0c4a6e", "--accent": "#0369a1" },
    },
    {
      id: "leaf",
      label: "Leaf",
      swatches: ["#16a34a", "#86efac", "#fff"],
      vars: { "--bg": "#f0fdf4", "--p1": "#16a34a", "--p2": "#4ade80", "--p3": "#86efac", "--p4": "#fff", "--text": "#14532d", "--accent": "#15803d" },
    },
    {
      id: "kraft",
      label: "Kraft",
      swatches: ["#92400e", "#fde68a", "#fff"],
      vars: { "--bg": "#fefce8", "--p1": "#92400e", "--p2": "#d97706", "--p3": "#fbbf24", "--p4": "#fef3c7", "--text": "#451a03", "--accent": "#78350f" },
    },
  ],
  arcade: [
    {
      id: "gameboy",
      label: "Game Boy",
      swatches: ["#0f380f", "#9bbc0f"],
      vars: { "--bg": "#9bbc0f", "--text": "#0f380f", "--accent": "#306230", "--shadow": "#306230" },
    },
    {
      id: "neon",
      label: "Neon",
      swatches: ["#0a0014", "#ec4899"],
      vars: { "--bg": "#0a0014", "--text": "#ec4899", "--accent": "#06b6d4", "--shadow": "#831843" },
    },
    {
      id: "atari",
      label: "Atari",
      swatches: ["#000", "#fbbf24"],
      vars: { "--bg": "#000000", "--text": "#fbbf24", "--accent": "#ef4444", "--shadow": "#78350f" },
    },
    {
      id: "vapor",
      label: "Vapor",
      swatches: ["#a855f7", "#22d3ee"],
      vars: { "--bg": "#1a0a2e", "--text": "#f0abfc", "--accent": "#22d3ee", "--shadow": "#581c87" },
    },
  ],
  zen: [
    {
      id: "sand",
      label: "Sand",
      swatches: ["#f5e6c8", "#8b7355"],
      vars: { "--bg": "#f5e6c8", "--lines": "#d4c4a0", "--rock": "#5d4e37", "--text": "#3d2f1f", "--accent": "#8b7355" },
    },
    {
      id: "moss",
      label: "Moss",
      swatches: ["#dcf2dc", "#3a5a3a"],
      vars: { "--bg": "#dcf2dc", "--lines": "#a8d8a8", "--rock": "#2d4a2d", "--text": "#1f2f1f", "--accent": "#3a5a3a" },
    },
    {
      id: "ash",
      label: "Ash",
      swatches: ["#e5e5e5", "#404040"],
      vars: { "--bg": "#e5e5e5", "--lines": "#bdbdbd", "--rock": "#262626", "--text": "#171717", "--accent": "#525252" },
    },
    {
      id: "dusk",
      label: "Dusk",
      swatches: ["#fef0e6", "#9a3412"],
      vars: { "--bg": "#fef0e6", "--lines": "#fcd9b8", "--rock": "#7c2d12", "--text": "#431407", "--accent": "#9a3412" },
    },
  ],
  subway: [
    {
      id: "nyc",
      label: "NYC",
      swatches: ["#000", "#fff"],
      vars: { "--bg": "#000000", "--sign": "#000000", "--text": "#ffffff", "--accent-1": "#ef4444", "--accent-2": "#22c55e", "--accent-3": "#3b82f6", "--accent-4": "#fbbf24" },
    },
    {
      id: "tokyo",
      label: "Tokyo",
      swatches: ["#1e3a8a", "#fff"],
      vars: { "--bg": "#1e3a8a", "--sign": "#1e3a8a", "--text": "#ffffff", "--accent-1": "#fbbf24", "--accent-2": "#ef4444", "--accent-3": "#22c55e", "--accent-4": "#a78bfa" },
    },
    {
      id: "london",
      label: "London",
      swatches: ["#1e1b4b", "#ef4444"],
      vars: { "--bg": "#1e1b4b", "--sign": "#1e1b4b", "--text": "#ffffff", "--accent-1": "#ef4444", "--accent-2": "#fbbf24", "--accent-3": "#3b82f6", "--accent-4": "#22c55e" },
    },
  ],
  hologram: [
    {
      id: "cyan",
      label: "Cyan",
      swatches: ["#020617", "#67e8f9"],
      vars: { "--bg": "#020617", "--text": "#67e8f9", "--accent": "#22d3ee", "--glow": "#06b6d4" },
    },
    {
      id: "violet",
      label: "Violet",
      swatches: ["#0a0014", "#c084fc"],
      vars: { "--bg": "#0a0014", "--text": "#c084fc", "--accent": "#a855f7", "--glow": "#7c3aed" },
    },
    {
      id: "lime",
      label: "Lime",
      swatches: ["#0a0a0a", "#a3e635"],
      vars: { "--bg": "#0a0a0a", "--text": "#a3e635", "--accent": "#84cc16", "--glow": "#65a30d" },
    },
    {
      id: "rose",
      label: "Rose",
      swatches: ["#1a0014", "#f9a8d4"],
      vars: { "--bg": "#1a0014", "--text": "#f9a8d4", "--accent": "#ec4899", "--glow": "#be185d" },
    },
  ],
  chalkboard: [
    {
      id: "classic",
      label: "Classic",
      swatches: ["#1a3a2e", "#fff"],
      vars: { "--bg": "#1a3a2e", "--text": "#fefce8", "--accent": "#fbbf24", "--accent-2": "#fda4af" },
    },
    {
      id: "slate",
      label: "Slate",
      swatches: ["#1e293b", "#fff"],
      vars: { "--bg": "#1e293b", "--text": "#f1f5f9", "--accent": "#7dd3fc", "--accent-2": "#fda4af" },
    },
    {
      id: "espresso",
      label: "Espresso",
      swatches: ["#3b2317", "#fde68a"],
      vars: { "--bg": "#3b2317", "--text": "#fef3c7", "--accent": "#fbbf24", "--accent-2": "#fda4af" },
    },
    {
      id: "rouge",
      label: "Rouge",
      swatches: ["#4c1d24", "#fff"],
      vars: { "--bg": "#4c1d24", "--text": "#fef3c7", "--accent": "#fda4af", "--accent-2": "#fde68a" },
    },
  ],
  vaporwave: [
    {
      id: "miami",
      label: "Miami",
      swatches: ["#ff6ec7", "#00f0ff", "#ffcb6b"],
      vars: { "--bg-1": "#1a0033", "--bg-2": "#3d0066", "--sun-1": "#ffcb6b", "--sun-2": "#ff6ec7", "--grid": "#00f0ff", "--text": "#ffffff", "--accent": "#ff6ec7" },
    },
    {
      id: "sunset",
      label: "Sunset",
      swatches: ["#ff4d8d", "#ff9a3c", "#7b2ff7"],
      vars: { "--bg-1": "#2a0845", "--bg-2": "#6441a5", "--sun-1": "#ff9a3c", "--sun-2": "#ff4d8d", "--grid": "#ff4d8d", "--text": "#fff7ed", "--accent": "#ff9a3c" },
    },
    {
      id: "aqua",
      label: "Aqua",
      swatches: ["#06ffa5", "#00d4ff", "#9d4edd"],
      vars: { "--bg-1": "#03045e", "--bg-2": "#023e8a", "--sun-1": "#06ffa5", "--sun-2": "#00d4ff", "--grid": "#06ffa5", "--text": "#caf0f8", "--accent": "#00d4ff" },
    },
  ],
  comic: [
    {
      id: "classic",
      label: "Classic",
      swatches: ["#ffd23f", "#ee4266", "#0ead69"],
      vars: { "--bg": "#ffd23f", "--panel": "#fff8e7", "--ink": "#0a0a0a", "--burst": "#ee4266", "--accent": "#0ead69", "--text": "#0a0a0a" },
    },
    {
      id: "pop",
      label: "Pop",
      swatches: ["#ff006e", "#3a86ff", "#ffbe0b"],
      vars: { "--bg": "#3a86ff", "--panel": "#ffffff", "--ink": "#0a0a0a", "--burst": "#ff006e", "--accent": "#ffbe0b", "--text": "#0a0a0a" },
    },
    {
      id: "noir",
      label: "Noir",
      swatches: ["#1a1a1a", "#ffd60a", "#fff"],
      vars: { "--bg": "#1a1a1a", "--panel": "#f5f5f5", "--ink": "#0a0a0a", "--burst": "#ffd60a", "--accent": "#e63946", "--text": "#0a0a0a" },
    },
  ],
  stained: [
    {
      id: "cathedral",
      label: "Cathedral",
      swatches: ["#1e3a8a", "#b91c1c", "#ca8a04"],
      vars: { "--bg": "#0a0a0f", "--lead": "#1a1a1a", "--c1": "#1e3a8a", "--c2": "#b91c1c", "--c3": "#ca8a04", "--c4": "#15803d", "--c5": "#7c2d12", "--text": "#fef3c7", "--accent": "#fbbf24" },
    },
    {
      id: "rose",
      label: "Rose Window",
      swatches: ["#be185d", "#7c3aed", "#0891b2"],
      vars: { "--bg": "#1a0a1f", "--lead": "#2a2a2a", "--c1": "#be185d", "--c2": "#7c3aed", "--c3": "#0891b2", "--c4": "#db2777", "--c5": "#a21caf", "--text": "#fdf4ff", "--accent": "#f472b6" },
    },
    {
      id: "forest",
      label: "Forest",
      swatches: ["#15803d", "#0e7490", "#65a30d"],
      vars: { "--bg": "#0a1410", "--lead": "#1a1a1a", "--c1": "#15803d", "--c2": "#0e7490", "--c3": "#65a30d", "--c4": "#047857", "--c5": "#84cc16", "--text": "#ecfccb", "--accent": "#a3e635" },
    },
  ],
  pixelgarden: [
    {
      id: "spring",
      label: "Spring",
      swatches: ["#7ec850", "#ff85a1", "#ffd166"],
      vars: { "--sky": "#bde0fe", "--ground": "#7ec850", "--soil": "#8b5a2b", "--bloom-1": "#ff85a1", "--bloom-2": "#ffd166", "--bloom-3": "#c084fc", "--text": "#1f2937", "--accent": "#16a34a" },
    },
    {
      id: "twilight",
      label: "Twilight",
      swatches: ["#5b21b6", "#f472b6", "#fbbf24"],
      vars: { "--sky": "#1e1b4b", "--ground": "#312e81", "--soil": "#1f1147", "--bloom-1": "#f472b6", "--bloom-2": "#fbbf24", "--bloom-3": "#22d3ee", "--text": "#ede9fe", "--accent": "#a78bfa" },
    },
    {
      id: "autumn",
      label: "Autumn",
      swatches: ["#dc2626", "#ea580c", "#ca8a04"],
      vars: { "--sky": "#fef3c7", "--ground": "#a16207", "--soil": "#451a03", "--bloom-1": "#dc2626", "--bloom-2": "#ea580c", "--bloom-3": "#ca8a04", "--text": "#451a03", "--accent": "#b91c1c" },
    },
  ],
  kaleidoscope: [
    {
      id: "jewel",
      label: "Jewel",
      swatches: ["#7c3aed", "#06b6d4", "#f59e0b"],
      vars: { "--bg": "#0a0a1a", "--c1": "#7c3aed", "--c2": "#06b6d4", "--c3": "#f59e0b", "--c4": "#ec4899", "--text": "#fafafa", "--accent": "#22d3ee" },
    },
    {
      id: "candy",
      label: "Candy",
      swatches: ["#f472b6", "#a78bfa", "#34d399"],
      vars: { "--bg": "#fdf2f8", "--c1": "#f472b6", "--c2": "#a78bfa", "--c3": "#34d399", "--c4": "#fbbf24", "--text": "#581c87", "--accent": "#db2777" },
    },
    {
      id: "monochrome",
      label: "Monochrome",
      swatches: ["#0a0a0a", "#737373", "#fafafa"],
      vars: { "--bg": "#fafafa", "--c1": "#0a0a0a", "--c2": "#404040", "--c3": "#737373", "--c4": "#a3a3a3", "--text": "#0a0a0a", "--accent": "#171717" },
    },
  ],
  receipt: [
    {
      id: "thermal",
      label: "Thermal",
      swatches: ["#fafaf7", "#1a1a1a"],
      vars: { "--bg": "#e7e5e0", "--paper": "#fafaf7", "--ink": "#1a1a1a", "--muted": "#737373", "--accent": "#1a1a1a", "--text": "#1a1a1a" },
    },
    {
      id: "carbon",
      label: "Carbon",
      swatches: ["#1a1a1a", "#fef3c7"],
      vars: { "--bg": "#0a0a0a", "--paper": "#1a1a1a", "--ink": "#fef3c7", "--muted": "#a3a3a3", "--accent": "#fbbf24", "--text": "#fef3c7" },
    },
    {
      id: "kraft",
      label: "Kraft",
      swatches: ["#c19a6b", "#3b2317"],
      vars: { "--bg": "#8b6f47", "--paper": "#d4b896", "--ink": "#3b2317", "--muted": "#6b4423", "--accent": "#7c2d12", "--text": "#3b2317" },
    },
  ],
  tarot: [
    {
      id: "midnight",
      label: "Midnight",
      swatches: ["#1a1033", "#d4af37", "#7c3aed"],
      vars: { "--bg": "#0a0820", "--card": "#1a1033", "--gold": "#d4af37", "--accent": "#a78bfa", "--text": "#f5e6d3", "--muted": "#7c6f9c" },
    },
    {
      id: "blood",
      label: "Blood Moon",
      swatches: ["#2d0a0a", "#dc2626", "#fbbf24"],
      vars: { "--bg": "#1a0505", "--card": "#2d0a0a", "--gold": "#fbbf24", "--accent": "#dc2626", "--text": "#fef3c7", "--muted": "#9c6b6b" },
    },
    {
      id: "forest",
      label: "Forest Witch",
      swatches: ["#0f2417", "#84cc16", "#d4af37"],
      vars: { "--bg": "#081410", "--card": "#0f2417", "--gold": "#d4af37", "--accent": "#84cc16", "--text": "#ecfccb", "--muted": "#5c7c6b" },
    },
  ],
  vinyl: [
    {
      id: "soul",
      label: "Soul",
      swatches: ["#0a0a0a", "#dc2626", "#fbbf24"],
      vars: { "--bg": "#1a0a0a", "--sleeve": "#dc2626", "--label": "#fbbf24", "--vinyl": "#0a0a0a", "--text": "#fef3c7", "--accent": "#fbbf24" },
    },
    {
      id: "jazz",
      label: "Jazz",
      swatches: ["#1e3a5f", "#f59e0b", "#fef3c7"],
      vars: { "--bg": "#0a1929", "--sleeve": "#1e3a5f", "--label": "#f59e0b", "--vinyl": "#0a0a0a", "--text": "#fef3c7", "--accent": "#fef3c7" },
    },
    {
      id: "punk",
      label: "Punk",
      swatches: ["#000000", "#ec4899", "#22d3ee"],
      vars: { "--bg": "#0a0a0a", "--sleeve": "#000000", "--label": "#ec4899", "--vinyl": "#1a1a1a", "--text": "#22d3ee", "--accent": "#ec4899" },
    },
  ],
  weather: [
    {
      id: "sunny",
      label: "Sunny",
      swatches: ["#fde047", "#0ea5e9", "#ffffff"],
      vars: { "--bg-from": "#0ea5e9", "--bg-to": "#7dd3fc", "--card": "rgba(255,255,255,0.25)", "--text": "#0c4a6e", "--accent": "#fde047", "--muted": "#075985" },
    },
    {
      id: "rainy",
      label: "Rainy",
      swatches: ["#475569", "#94a3b8", "#cbd5e1"],
      vars: { "--bg-from": "#334155", "--bg-to": "#64748b", "--card": "rgba(255,255,255,0.18)", "--text": "#f1f5f9", "--accent": "#7dd3fc", "--muted": "#cbd5e1" },
    },
    {
      id: "snowy",
      label: "Snowy",
      swatches: ["#dbeafe", "#1e40af", "#ffffff"],
      vars: { "--bg-from": "#bfdbfe", "--bg-to": "#dbeafe", "--card": "rgba(255,255,255,0.55)", "--text": "#1e3a8a", "--accent": "#ffffff", "--muted": "#3b82f6" },
    },
  ],
  postcard: [
    {
      id: "tropical",
      label: "Tropical",
      swatches: ["#fef3c7", "#0d9488", "#f97316"],
      vars: { "--bg": "#fde68a", "--card": "#fffbeb", "--ink": "#0c4a6e", "--accent": "#f97316", "--stamp": "#0d9488", "--muted": "#a16207" },
    },
    {
      id: "alpine",
      label: "Alpine",
      swatches: ["#dbeafe", "#1e3a8a", "#dc2626"],
      vars: { "--bg": "#e0e7ff", "--card": "#ffffff", "--ink": "#1e3a8a", "--accent": "#dc2626", "--stamp": "#1e3a8a", "--muted": "#475569" },
    },
    {
      id: "desert",
      label: "Desert",
      swatches: ["#fed7aa", "#9a3412", "#0d9488"],
      vars: { "--bg": "#fed7aa", "--card": "#fff7ed", "--ink": "#7c2d12", "--accent": "#0d9488", "--stamp": "#9a3412", "--muted": "#9a3412" },
    },
  ],
  lavalamp: [
    {
      id: "magma",
      label: "Magma",
      swatches: ["#1a0505", "#f97316", "#fbbf24"],
      vars: { "--bg": "#1a0505", "--blob-1": "#f97316", "--blob-2": "#dc2626", "--blob-3": "#fbbf24", "--text": "#fef3c7", "--accent": "#fbbf24" },
    },
    {
      id: "ocean",
      label: "Ocean",
      swatches: ["#0c1e3a", "#06b6d4", "#a78bfa"],
      vars: { "--bg": "#0c1e3a", "--blob-1": "#06b6d4", "--blob-2": "#3b82f6", "--blob-3": "#a78bfa", "--text": "#e0f2fe", "--accent": "#22d3ee" },
    },
    {
      id: "neon",
      label: "Neon",
      swatches: ["#0a0a0a", "#ec4899", "#84cc16"],
      vars: { "--bg": "#0a0a0a", "--blob-1": "#ec4899", "--blob-2": "#a855f7", "--blob-3": "#84cc16", "--text": "#f5f5f5", "--accent": "#ec4899" },
    },
  ],
  storybook: [
    {
      id: "cottage",
      label: "Cottage",
      swatches: ["#fef3c7", "#7c2d12", "#84cc16"],
      vars: { "--bg": "#fef3c7", "--page": "#fffbeb", "--ink": "#451a03", "--accent": "#7c2d12", "--leaf": "#84cc16", "--muted": "#92400e" },
    },
    {
      id: "midnight",
      label: "Midnight Tale",
      swatches: ["#1e1b4b", "#fbbf24", "#a78bfa"],
      vars: { "--bg": "#1e1b4b", "--page": "#312e81", "--ink": "#fef3c7", "--accent": "#fbbf24", "--leaf": "#a78bfa", "--muted": "#a5b4fc" },
    },
    {
      id: "rose",
      label: "Rose Garden",
      swatches: ["#fce7f3", "#9f1239", "#84cc16"],
      vars: { "--bg": "#fce7f3", "--page": "#fff1f2", "--ink": "#500724", "--accent": "#9f1239", "--leaf": "#84cc16", "--muted": "#9f1239" },
    },
  ],
  gemara: [
    {
      id: "parchment",
      label: "Parchment",
      swatches: ["#f5e9c8", "#3b2412", "#8b1e1e"],
      vars: { "--bg": "#efe1bd", "--page": "#f7ecd0", "--ink": "#2b1a0a", "--accent": "#8b1e1e", "--rule": "#8a6a3a", "--muted": "#6b4a23" },
    },
    {
      id: "vellum",
      label: "Vellum",
      swatches: ["#fff8e7", "#1a1a1a", "#1e3a8a"],
      vars: { "--bg": "#f3ecd2", "--page": "#fffaf0", "--ink": "#111111", "--accent": "#1e3a8a", "--rule": "#7a6a3a", "--muted": "#5a4a2a" },
    },
    {
      id: "midnight-seder",
      label: "Midnight Seder",
      swatches: ["#0f172a", "#fcd34d", "#fca5a5"],
      vars: { "--bg": "#0b1220", "--page": "#13203a", "--ink": "#fde68a", "--accent": "#fca5a5", "--rule": "#475569", "--muted": "#94a3b8" },
    },
  ],
  beismedrash: [
    {
      id: "candlelit",
      label: "Candlelit",
      swatches: ["#1a1208", "#f5c97a", "#7c2d12"],
      vars: { "--bg": "#1a1208", "--wood": "#3b2615", "--glow": "#f5c97a", "--ink": "#fdf6e3", "--accent": "#fcd34d", "--muted": "#d4a04a" },
    },
    {
      id: "morning-shul",
      label: "Morning Shul",
      swatches: ["#fef3c7", "#1e3a8a", "#7c2d12"],
      vars: { "--bg": "#fef3c7", "--wood": "#7c4a1e", "--glow": "#fbbf24", "--ink": "#1c1917", "--accent": "#1e3a8a", "--muted": "#7c4a1e" },
    },
    {
      id: "velvet",
      label: "Velvet",
      swatches: ["#3a1a4a", "#fcd34d", "#e5e7eb"],
      vars: { "--bg": "#2a0e3a", "--wood": "#4a1e5a", "--glow": "#fcd34d", "--ink": "#f5f3ff", "--accent": "#fcd34d", "--muted": "#c4b5fd" },
    },
  ],
  shtender: [
    {
      id: "oak",
      label: "Oak",
      swatches: ["#7c4a1e", "#fdf6e3", "#1e3a8a"],
      vars: { "--bg": "#2b1a0a", "--wood": "#7c4a1e", "--page": "#fdf6e3", "--ink": "#1c1917", "--accent": "#1e3a8a", "--muted": "#7c4a1e" },
    },
    {
      id: "mahogany",
      label: "Mahogany",
      swatches: ["#3b1a0a", "#f5e9c8", "#7f1d1d"],
      vars: { "--bg": "#1a0a05", "--wood": "#5b2a14", "--page": "#f5e9c8", "--ink": "#1c1917", "--accent": "#7f1d1d", "--muted": "#92400e" },
    },
    {
      id: "yerushalayim",
      label: "Yerushalayim Stone",
      swatches: ["#e7d9b8", "#3a2a14", "#0e7c5a"],
      vars: { "--bg": "#d9c89a", "--wood": "#a07a48", "--page": "#fffaf0", "--ink": "#1c1917", "--accent": "#0e7c5a", "--muted": "#6b5a3a" },
    },
  ],
  mazeltov: [
    {
      id: "gold-wine",
      label: "Gold & Wine",
      swatches: ["#7f1d1d", "#fcd34d", "#fffaf0"],
      vars: { "--bg": "#1a0a0a", "--banner": "#7f1d1d", "--gold": "#fcd34d", "--ink": "#fffaf0", "--accent": "#fcd34d", "--muted": "#f5d08a" },
    },
    {
      id: "blue-white",
      label: "Blue & White",
      swatches: ["#1e3a8a", "#ffffff", "#fcd34d"],
      vars: { "--bg": "#eaf2ff", "--banner": "#1e3a8a", "--gold": "#fcd34d", "--ink": "#0b1d4a", "--accent": "#1e3a8a", "--muted": "#475a9a" },
    },
    {
      id: "rose-simcha",
      label: "Rose Simcha",
      swatches: ["#fce7f3", "#9f1239", "#fcd34d"],
      vars: { "--bg": "#fff1f5", "--banner": "#9f1239", "--gold": "#fcd34d", "--ink": "#500724", "--accent": "#9f1239", "--muted": "#9f1239" },
    },
  ],
};

function timeOfDay(h: number) {
  if (h < 5) return "night owl";
  if (h < 12) return "morning";
  if (h < 18) return "afternoon";
  return "evening";
}

interface StyleProps {
  name: string;
  hour: number;
  palette: Palette;
}

const cssVars = (vars: Record<string, string>) => vars as React.CSSProperties;

/* ============== STYLE 1 — CONFETTI PARTY ============== */
function ConfettiGreeting({ name, hour, palette }: StyleProps) {
  const fired = useRef(false);
  const colors = useMemo(
    () =>
      ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6"]
        .map((k) => palette.vars[k])
        .filter(Boolean),
    [palette],
  );

  const fire = () => {
    confetti({ particleCount: 140, spread: 100, origin: { y: 0.6 }, colors });
    setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors });
      confetti({ particleCount: 60, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors });
    }, 250);
  };

  useEffect(() => {
    if (fired.current) {
      fire();
      return;
    }
    fired.current = true;
    const t = setTimeout(fire, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [palette]);

  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10 text-center"
      style={{
        ...cssVars(palette.vars),
        background: `linear-gradient(135deg, var(--bg-from), var(--bg-via), var(--bg-to))`,
        color: "var(--text)",
      }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div
          className="animate-float-blob absolute -top-20 -left-16 h-72 w-72 rounded-full blur-3xl opacity-60"
          style={{ background: "var(--blob-1)" }}
        />
        <div
          className="animate-float-blob absolute -bottom-24 -right-16 h-80 w-80 rounded-full blur-3xl opacity-60"
          style={{ background: "var(--blob-2)", animationDelay: "-4s" }}
        />
        <span className="animate-float-blob absolute left-[10%] top-[20%] text-4xl">🎈</span>
        <span
          className="animate-float-blob absolute right-[12%] top-[18%] text-4xl"
          style={{ animationDelay: "-3s" }}
        >
          ⭐
        </span>
        <span
          className="animate-float-blob absolute left-[18%] bottom-[18%] text-4xl"
          style={{ animationDelay: "-6s" }}
        >
          🎊
        </span>
      </div>
      <div className="relative">
        <div
          className="animate-pop-in mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold backdrop-blur"
          style={{ color: "var(--text)" }}
        >
          <span className="animate-wiggle inline-block">👋</span> Good {timeOfDay(hour)}!
        </div>
        <h1 className="animate-pop-in text-7xl font-black leading-[0.95] tracking-tighter drop-shadow-sm sm:text-9xl">
          <span className="block opacity-90">Hey,</span>
          <span
            className="animate-shimmer mt-2 block bg-clip-text text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]}, ${colors[3]})`,
              backgroundSize: "200% 200%",
            }}
          >
            {name}
            <span className="ml-1 inline-block animate-wiggle">✨</span>
          </span>
        </h1>
        <p className="animate-rise mt-6 text-xl opacity-80" style={{ animationDelay: "0.4s" }}>
          The party's just for you. 🎉
        </p>
        <Button
          onClick={fire}
          size="lg"
          className="animate-rise mt-8 h-12 rounded-full border-0 px-8 text-base font-bold text-white shadow-xl"
          style={{
            animationDelay: "0.6s",
            background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`,
          }}
        >
          More confetti 🎉
        </Button>
      </div>
    </div>
  );
}

/* ============== STYLE 2 — TYPEWRITER ============== */
function TypewriterGreeting({ name, hour, palette }: StyleProps) {
  const lines = useMemo(
    () => [
      `> initializing welcome.sh ...`,
      `> identifying user: ${name}`,
      `> good ${timeOfDay(hour)} detected`,
      ``,
      `Hello, ${name}.`,
      `It's good to see you again.`,
    ],
    [name, hour],
  );
  const fullText = lines.join("\n");
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setShown("");
    setDone(false);
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(fullText.slice(0, i));
      if (i >= fullText.length) {
        clearInterval(id);
        setDone(true);
      }
    }, 28);
    return () => clearInterval(id);
  }, [fullText, palette]);

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center rounded-3xl p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="w-full max-w-2xl">
        <pre className="font-mono whitespace-pre-wrap text-lg leading-relaxed sm:text-2xl">
          {shown}
          <span
            className="ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[2px] animate-pulse align-middle"
            style={{ background: "var(--text)" }}
          />
        </pre>
        {done && (
          <div className="animate-rise mt-8">
            <Button
              size="lg"
              className="rounded-none px-8 text-white"
              style={{ background: "var(--accent)" }}
            >
              Continue →
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============== STYLE 3 — CINEMATIC ============== */
function CinematicGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl"
      style={{ ...cssVars(palette.vars), background: "var(--bg)" }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-12"
        style={{ background: "var(--bars)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-12"
        style={{ background: "var(--bars)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-80"
        style={{
          background: `radial-gradient(circle at 50% 40%, var(--spotlight), rgba(0,0,0,0) 55%)`,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
        }}
      />

      <div className="relative z-10 px-6 text-center" style={{ color: "var(--text)" }}>
        <p
          className="animate-rise text-sm uppercase tracking-[0.5em]"
          style={{ animationDelay: "0.2s", color: "var(--sub)" }}
        >
          A {timeOfDay(hour)} feature
        </p>
        <h1
          className="animate-rise mt-6 font-serif text-6xl font-light italic tracking-tight sm:text-8xl"
          style={{ animationDelay: "0.7s" }}
        >
          Starring
        </h1>
        <h2
          className="animate-rise mt-4 text-7xl font-black uppercase tracking-tight sm:text-9xl"
          style={{ animationDelay: "1.4s", color: "var(--accent)" }}
        >
          {name}
        </h2>
        <p
          className="animate-rise mt-8 text-base uppercase tracking-[0.4em] opacity-70"
          style={{ animationDelay: "2.1s" }}
        >
          — Now playing —
        </p>
      </div>
    </div>
  );
}

/* ============== STYLE 4 — TERMINAL BOOT ============== */
function TerminalGreeting({ name, hour, palette }: StyleProps) {
  const steps = useMemo(
    () => [
      "[ OK ] Mounting filesystem...",
      "[ OK ] Starting session daemon...",
      "[ OK ] Loading user profile: " + name.toLowerCase().replace(/\s+/g, "_"),
      "[ OK ] Verifying biometric signature...",
      "[ OK ] Decrypting workspace...",
      `[ OK ] Time-of-day: ${timeOfDay(hour)}`,
      "",
      `Welcome back, ${name}. All systems nominal.`,
    ],
    [name, hour],
  );
  const [count, setCount] = useState(0);
  useEffect(() => {
    setCount(0);
    const id = setInterval(() => {
      setCount((c) => {
        if (c >= steps.length) {
          clearInterval(id);
          return c;
        }
        return c + 1;
      });
    }, 350);
    return () => clearInterval(id);
  }, [steps, palette]);

  return (
    <div
      className="flex min-h-[70vh] items-stretch justify-center rounded-3xl p-6 font-mono sm:p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="w-full max-w-3xl">
        <div className="mb-4 flex items-center gap-2 text-xs" style={{ color: "var(--dim)" }}>
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <span className="ml-3">~/welcome — bash</span>
        </div>
        <div className="text-sm leading-relaxed sm:text-base">
          <p style={{ color: "var(--dim)" }}>$ ./login --user "{name}"</p>
          {steps.slice(0, count).map((line, i) => (
            <p
              key={i}
              className={
                line === ""
                  ? "h-4"
                  : line.startsWith("[ OK ]")
                    ? ""
                    : "mt-2 text-2xl font-bold sm:text-3xl"
              }
              style={
                line.startsWith("[ OK ]") || line === ""
                  ? undefined
                  : { color: "var(--accent)" }
              }
            >
              {line}
            </p>
          ))}
          {count >= steps.length && (
            <p className="mt-4" style={{ color: "var(--dim)" }}>
              ${" "}
              <span
                className="ml-0.5 inline-block h-[1em] w-[0.6ch] translate-y-[2px] animate-pulse align-middle"
                style={{ background: "var(--text)" }}
              />
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE 5 — BOARDING PASS CARD ============== */
function CardGreeting({ name, palette, hour }: StyleProps) {
  const date = new Date();
  const dateStr = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const seat = `${String.fromCharCode(65 + (name.length % 6))}${(name.length * 7) % 30 + 1}`;

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center rounded-3xl p-6"
      style={{
        ...cssVars(palette.vars),
        background: `linear-gradient(135deg, var(--bg-from), var(--bg-via), var(--bg-to))`,
      }}
    >
      <div
        className="animate-pop-in flex w-full max-w-3xl overflow-hidden rounded-2xl shadow-2xl"
        style={{ background: "var(--card)", color: "var(--text)" }}
      >
        <div className="flex-1 p-8">
          <div
            className="flex items-center justify-between text-xs uppercase tracking-widest"
            style={{ color: "var(--muted)" }}
          >
            <span>Boarding Pass</span>
            <span>№ {String(date.getTime()).slice(-6)}</span>
          </div>
          <div className="mt-8 flex items-end justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Passenger
              </p>
              <p className="mt-1 text-3xl font-black uppercase tracking-tight sm:text-4xl">
                {name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                Seat
              </p>
              <p className="text-3xl font-bold">{seat}</p>
            </div>
          </div>

          <div
            className="my-6 border-t border-dashed"
            style={{ borderColor: "var(--muted)", opacity: 0.4 }}
          />

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                From
              </p>
              <p className="mt-1 text-2xl font-bold">HOME</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {timeOfDay(hour)}
              </p>
            </div>
            <div className="flex items-center justify-center text-2xl" style={{ color: "var(--muted)" }}>
              →
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                To
              </p>
              <p className="mt-1 text-2xl font-bold">YOUR DAY</p>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {dateStr}
              </p>
            </div>
          </div>

          <Button
            className="mt-8 w-full rounded-xl py-6 text-base font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            Board now ✈️
          </Button>
        </div>

        <div
          className="hidden w-44 flex-col items-center justify-center border-l-2 border-dashed p-6 text-center sm:flex"
          style={{ borderColor: "var(--muted)", background: "rgba(0,0,0,0.04)" }}
        >
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Welcome
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight">{name.split(" ")[0]}</p>
          <div
            className="my-4 h-16 w-16 rounded-full text-2xl leading-[4rem] text-white"
            style={{
              background: `linear-gradient(135deg, var(--avatar-from), var(--avatar-to))`,
            }}
          >
            {name[0]}
          </div>
          <p className="text-[10px] uppercase tracking-widest" style={{ color: "var(--muted)" }}>
            Seat {seat}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE 6 — MAGAZINE COVER ============== */
function MagazineGreeting({ name, hour, palette }: StyleProps) {
  const issue = String(new Date().getFullYear()) + " · No. " + (new Date().getMonth() + 1);
  return (
    <div
      className="flex min-h-[70vh] items-center justify-center rounded-3xl p-6"
      style={{ ...cssVars(palette.vars), background: "var(--bg)" }}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl p-10 shadow-2xl"
        style={{ background: "var(--cover)", color: "var(--text)" }}
      >
        <div className="flex items-end justify-between border-b-2 border-white/40 pb-4">
          <h2 className="font-serif text-5xl font-black italic tracking-tight">VIBE</h2>
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">Issue {issue}</p>
        </div>

        <div className="mt-8">
          <p
            className="text-xs uppercase tracking-[0.4em]"
            style={{ color: "var(--accent)" }}
          >
            The {timeOfDay(hour)} edition
          </p>
          <h1 className="animate-pop-in mt-4 font-serif text-7xl font-black leading-[0.9] tracking-tight sm:text-9xl">
            {name},
          </h1>
          <h1
            className="animate-pop-in font-serif text-7xl font-black italic leading-[0.9] tracking-tight sm:text-9xl"
            style={{ animationDelay: "0.15s", color: "var(--accent)" }}
          >
            you're back.
          </h1>
        </div>

        <div className="mt-10 grid gap-3 text-sm sm:grid-cols-3">
          {[
            ["Featured", "5 reasons today is going to be great"],
            ["Inside", "A warm welcome, just for you"],
            ["Exclusive", `Cover star: ${name.split(" ")[0]}`],
          ].map(([h, b]) => (
            <div key={h} className="rounded-lg bg-white/10 p-3 backdrop-blur">
              <p
                className="font-bold uppercase tracking-wider"
                style={{ color: "var(--accent)" }}
              >
                {h}
              </p>
              <p className="mt-1">{b}</p>
            </div>
          ))}
        </div>

        <Button
          className="mt-8 rounded-full bg-white px-8 py-6 text-base font-bold hover:bg-white/90"
          style={{ color: "var(--btn-text)" }}
        >
          Read the issue →
        </Button>
      </div>
    </div>
  );
}

/* ============== STYLE 7 — CONSTELLATION ============== */
function ConstellationGreeting({ name, hour, palette }: StyleProps) {
  // Generate stable star positions from name
  const stars = useMemo(() => {
    const letters = name.toUpperCase().split("").filter((c) => /[A-Z]/.test(c));
    return letters.map((c, i) => {
      const angle = (i / Math.max(letters.length, 1)) * Math.PI * 2 + 0.4;
      const radius = 28 + (c.charCodeAt(0) % 12);
      return {
        c,
        x: 50 + Math.cos(angle) * radius,
        y: 50 + Math.sin(angle) * radius * 0.55,
        delay: i * 0.25,
      };
    });
  }, [name]);

  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10"
      style={{
        ...cssVars(palette.vars),
        background: `radial-gradient(ellipse at top, var(--bg-to), var(--bg-from))`,
        color: "var(--text)",
      }}
    >
      {/* Twinkling background stars */}
      <div className="pointer-events-none absolute inset-0">
        {Array.from({ length: 60 }).map((_, i) => {
          const x = (i * 37) % 100;
          const y = (i * 53) % 100;
          const size = (i % 3) + 1;
          return (
            <span
              key={i}
              className="absolute animate-pulse rounded-full"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: size,
                height: size,
                background: "var(--star)",
                opacity: 0.4 + (i % 5) * 0.1,
                animationDelay: `${(i % 10) * 0.3}s`,
                animationDuration: `${2 + (i % 4)}s`,
              }}
            />
          );
        })}
      </div>

      {/* Constellation SVG */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {stars.map((s, i) => {
          if (i === 0) return null;
          const prev = stars[i - 1];
          return (
            <line
              key={i}
              x1={prev.x}
              y1={prev.y}
              x2={s.x}
              y2={s.y}
              stroke="var(--line)"
              strokeWidth="0.15"
              strokeDasharray="100"
              strokeDashoffset="100"
              style={{
                animation: `dash 0.6s ease-out ${s.delay}s forwards`,
              }}
            />
          );
        })}
      </svg>

      {/* Star letters */}
      <div className="pointer-events-none absolute inset-0">
        {stars.map((s, i) => (
          <span
            key={i}
            className="animate-pop-in absolute -translate-x-1/2 -translate-y-1/2 text-xs font-bold opacity-70"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              animationDelay: `${s.delay}s`,
              color: "var(--accent)",
            }}
          >
            ✦ {s.c}
          </span>
        ))}
      </div>

      <div className="relative z-10 text-center">
        <p
          className="animate-rise text-xs uppercase tracking-[0.5em] opacity-70"
          style={{ animationDelay: "0.2s" }}
        >
          A {timeOfDay(hour)} sky for
        </p>
        <h1
          className="animate-pop-in mt-4 text-6xl font-black tracking-tight sm:text-8xl"
          style={{ animationDelay: "0.4s", color: "var(--accent)" }}
        >
          {name}
        </h1>
        <p
          className="animate-rise mt-6 text-base opacity-70"
          style={{ animationDelay: "1.5s" }}
        >
          Your name, written in the stars. ✨
        </p>
      </div>

      <style>{`
        @keyframes dash { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}

/* ============== STYLE 8 — POLAROID ============== */
function PolaroidGreeting({ name, hour, palette }: StyleProps) {
  const [developed, setDeveloped] = useState(0);
  useEffect(() => {
    setDeveloped(0);
    const id = setInterval(() => {
      setDeveloped((d) => {
        if (d >= 100) {
          clearInterval(id);
          return 100;
        }
        return d + 2;
      });
    }, 50);
    return () => clearInterval(id);
  }, [palette]);

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center rounded-3xl p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      <div className="flex flex-col items-center">
        <div
          className="animate-pop-in p-4 pb-16 shadow-2xl"
          style={{
            background: "var(--frame)",
            transform: "rotate(-3deg)",
          }}
        >
          <div
            className="relative h-72 w-72 overflow-hidden sm:h-80 sm:w-80"
            style={{
              background: `linear-gradient(135deg, var(--photo-from), var(--photo-to))`,
            }}
          >
            {/* Develop overlay */}
            <div
              className="absolute inset-0 transition-opacity"
              style={{
                background: "rgba(20,20,20,0.95)",
                opacity: 1 - developed / 100,
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-8xl font-black sm:text-9xl"
                style={{
                  color: "var(--frame)",
                  opacity: developed / 100,
                  textShadow: "0 4px 20px rgba(0,0,0,0.3)",
                }}
              >
                {name[0]?.toUpperCase()}
              </span>
            </div>
            {/* Sparkle */}
            <div
              className="absolute right-4 top-4 text-2xl"
              style={{ opacity: developed / 100 }}
            >
              ✨
            </div>
          </div>
          <p
            className="mt-6 px-2 text-center font-handwritten text-xl"
            style={{
              fontFamily: '"Bradley Hand", "Comic Sans MS", cursive',
              color: "var(--accent)",
              opacity: developed / 100,
            }}
          >
            {name} — {timeOfDay(hour)} ♡
          </p>
        </div>
        <p className="mt-10 text-center text-lg opacity-70">
          {developed < 100 ? "Developing..." : "A snapshot of today, just for you."}
        </p>
      </div>
    </div>
  );
}

/* ============== STYLE 9 — NEON SIGN ============== */
function NeonGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Brick wall pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 30px), repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 1px, transparent 1px, transparent 60px)",
        }}
      />
      {/* Glow halos */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/3 h-80 w-80 rounded-full blur-3xl opacity-40"
        style={{ background: "var(--neon-1)" }}
      />
      <div
        className="pointer-events-none absolute right-1/4 bottom-1/3 h-80 w-80 rounded-full blur-3xl opacity-40"
        style={{ background: "var(--neon-2)" }}
      />

      <div className="relative z-10 text-center">
        <p
          className="text-sm uppercase tracking-[0.5em]"
          style={{
            color: "var(--neon-2)",
            textShadow:
              "0 0 4px var(--neon-2), 0 0 12px var(--neon-2), 0 0 24px var(--neon-2)",
            animation: "neon-flicker 4s infinite",
          }}
        >
          OPEN · {timeOfDay(hour).toUpperCase()}
        </p>
        <h1
          className="mt-6 font-serif text-7xl italic tracking-tight sm:text-9xl"
          style={{
            color: "var(--neon-1)",
            textShadow:
              "0 0 6px var(--neon-1), 0 0 16px var(--neon-1), 0 0 32px var(--neon-1), 0 0 64px var(--neon-1)",
            animation: "neon-flicker 3s infinite",
          }}
        >
          Hello,
        </h1>
        <h2
          className="mt-2 text-7xl font-black uppercase tracking-tight sm:text-9xl"
          style={{
            color: "var(--neon-2)",
            textShadow:
              "0 0 6px var(--neon-2), 0 0 16px var(--neon-2), 0 0 32px var(--neon-2), 0 0 64px var(--neon-2)",
            animation: "neon-flicker 5s infinite",
          }}
        >
          {name}
        </h2>
        <div
          className="mx-auto mt-10 h-px w-48"
          style={{
            background: "var(--neon-1)",
            boxShadow: "0 0 8px var(--neon-1), 0 0 16px var(--neon-1)",
          }}
        />
        <p className="mt-6 text-sm uppercase tracking-[0.3em] opacity-60">
          The lights are on. We've been waiting.
        </p>
      </div>

      <style>{`
        @keyframes neon-flicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            opacity: 1;
          }
          20%, 24%, 55% { opacity: 0.65; }
        }
      `}</style>
    </div>
  );
}

/* ============== STYLE 10 — ORIGAMI ============== */
function OrigamiGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Folded paper triangles */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="0,0 50,0 0,40" fill="var(--p2)" opacity="0.85" />
        <polygon points="50,0 100,0 100,30" fill="var(--p3)" opacity="0.85" />
        <polygon points="0,40 50,0 60,50 0,70" fill="var(--p1)" opacity="0.7" />
        <polygon points="100,30 50,0 60,50 100,70" fill="var(--p4)" opacity="0.6" />
        <polygon points="0,70 60,50 100,70 100,100 0,100" fill="var(--p2)" opacity="0.6" />
      </svg>

      <div className="relative z-10 max-w-xl text-center">
        <p
          className="animate-rise inline-block rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest backdrop-blur"
          style={{ color: "var(--accent)" }}
        >
          Folded with care · {timeOfDay(hour)}
        </p>
        <h1 className="animate-pop-in mt-6 text-6xl font-black leading-[1.05] tracking-tight sm:text-8xl">
          Welcome,
        </h1>
        <h2
          className="animate-pop-in mt-2 font-serif text-5xl font-light italic sm:text-7xl"
          style={{ animationDelay: "0.2s", color: "var(--accent)" }}
        >
          {name}
        </h2>
        <p className="animate-rise mt-6 text-base opacity-80" style={{ animationDelay: "0.5s" }}>
          A little paper crane, just for you. 🪷
        </p>
      </div>
    </div>
  );
}

/* ============== STYLE 11 — ARCADE ============== */
function ArcadeGreeting({ name, hour, palette }: StyleProps) {
  const [blink, setBlink] = useState(true);
  const [score, setScore] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    setScore(0);
    let v = 0;
    const id = setInterval(() => {
      v += Math.floor(Math.random() * 137) + 23;
      setScore(v);
      if (v > 99999) clearInterval(id);
    }, 60);
    return () => clearInterval(id);
  }, [palette]);

  return (
    <div
      className="flex min-h-[70vh] items-center justify-center rounded-3xl p-6"
      style={{
        ...cssVars(palette.vars),
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: '"Courier New", monospace',
        imageRendering: "pixelated",
      }}
    >
      <div className="text-center">
        <p
          className="text-xs tracking-[0.4em] sm:text-sm"
          style={{ color: "var(--accent)" }}
        >
          ★ HIGH SCORE ★
        </p>
        <p className="mt-1 text-2xl font-black tabular-nums sm:text-3xl">
          {String(Math.min(score, 99999)).padStart(5, "0")}
        </p>

        <div className="my-8 flex items-center justify-center gap-3 text-3xl">
          <span className="animate-bounce">👾</span>
          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
            🍄
          </span>
          <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>
            ⭐
          </span>
        </div>

        <h1
          className="text-5xl font-black uppercase tracking-tighter sm:text-7xl"
          style={{
            textShadow: `4px 4px 0 var(--shadow)`,
            letterSpacing: "0.05em",
          }}
        >
          PLAYER 1
        </h1>
        <h2
          className="mt-4 text-4xl font-black uppercase tracking-tighter sm:text-6xl"
          style={{
            color: "var(--accent)",
            textShadow: `4px 4px 0 var(--shadow)`,
          }}
        >
          {name.toUpperCase()}
        </h2>

        <p
          className="mt-12 text-xl uppercase sm:text-2xl"
          style={{ opacity: blink ? 1 : 0.1, transition: "opacity 0.1s" }}
        >
          ▶ PRESS START ◀
        </p>
        <p className="mt-2 text-xs opacity-60">{timeOfDay(hour).toUpperCase()} · 1986</p>
      </div>
    </div>
  );
}

/* ============== STYLE 12 — ZEN GARDEN ============== */
function ZenGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Raked sand lines */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 200 200"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 14 }).map((_, i) => (
          <path
            key={i}
            d={`M 0 ${15 + i * 13} Q 50 ${15 + i * 13 - 4}, 100 ${15 + i * 13} T 200 ${15 + i * 13}`}
            fill="none"
            stroke="var(--lines)"
            strokeWidth="0.6"
            strokeDasharray="400"
            strokeDashoffset="400"
            style={{ animation: `zen-rake 2s ease-out ${i * 0.08}s forwards` }}
          />
        ))}
        {/* Rocks ripples */}
        <ellipse cx="40" cy="160" rx="14" ry="6" fill="none" stroke="var(--lines)" strokeWidth="0.6" />
        <ellipse cx="40" cy="160" rx="20" ry="9" fill="none" stroke="var(--lines)" strokeWidth="0.4" opacity="0.6" />
        <ellipse cx="160" cy="50" rx="10" ry="4" fill="none" stroke="var(--lines)" strokeWidth="0.6" />
        <ellipse cx="160" cy="50" rx="15" ry="6" fill="none" stroke="var(--lines)" strokeWidth="0.4" opacity="0.6" />
      </svg>

      {/* Rocks */}
      <span
        className="absolute left-[18%] bottom-[18%] h-7 w-12 rounded-[50%]"
        style={{ background: "var(--rock)" }}
      />
      <span
        className="absolute right-[18%] top-[22%] h-5 w-9 rounded-[50%]"
        style={{ background: "var(--rock)" }}
      />

      <div className="relative z-10 max-w-md text-center">
        <p
          className="animate-rise text-xs uppercase tracking-[0.5em] opacity-60"
          style={{ animationDelay: "1.5s" }}
        >
          {timeOfDay(hour)}
        </p>
        <h1
          className="animate-rise mt-6 font-serif text-5xl font-light tracking-tight sm:text-7xl"
          style={{ animationDelay: "1.8s" }}
        >
          Breathe in.
        </h1>
        <h2
          className="animate-rise mt-2 font-serif text-5xl font-light italic tracking-tight sm:text-7xl"
          style={{ animationDelay: "2.2s", color: "var(--accent)" }}
        >
          {name}.
        </h2>
        <p
          className="animate-rise mt-8 text-base opacity-70"
          style={{ animationDelay: "2.6s" }}
        >
          You are exactly where you need to be.
        </p>
      </div>

      <style>{`
        @keyframes zen-rake { to { stroke-dashoffset: 0; } }
      `}</style>
    </div>
  );
}

/* ============== STYLE 13 — SUBWAY SIGN ============== */
function SubwayGreeting({ name, hour, palette }: StyleProps) {
  const lines = ["1", "A", "L", "7"];
  const accents = ["--accent-1", "--accent-2", "--accent-3", "--accent-4"];
  return (
    <div
      className="flex min-h-[70vh] items-center justify-center rounded-3xl p-6"
      style={{ ...cssVars(palette.vars), background: "var(--bg)" }}
    >
      <div
        className="w-full max-w-3xl rounded-lg p-8 shadow-2xl"
        style={{
          background: "var(--sign)",
          color: "var(--text)",
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          border: "4px solid rgba(255,255,255,0.15)",
        }}
      >
        <div className="flex items-center gap-3 border-b border-white/20 pb-4">
          {lines.map((l, i) => (
            <span
              key={l}
              className="flex h-10 w-10 items-center justify-center rounded-full text-base font-black text-white sm:h-12 sm:w-12 sm:text-lg"
              style={{ background: `var(${accents[i]})` }}
            >
              {l}
            </span>
          ))}
          <span className="ml-auto text-xs uppercase tracking-widest opacity-60">
            Track 1 · {timeOfDay(hour)}
          </span>
        </div>

        <div className="mt-10">
          <p className="text-sm uppercase tracking-[0.3em] opacity-60">Now arriving</p>
          <h1 className="mt-3 text-5xl font-black uppercase leading-none tracking-tight sm:text-8xl">
            {name}
          </h1>
          <p className="mt-4 text-2xl uppercase tracking-widest sm:text-4xl">
            <span style={{ color: "var(--accent-2)" }}>•</span> Welcome Station{" "}
            <span style={{ color: "var(--accent-1)" }}>•</span>
          </p>
        </div>

        <div className="mt-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-6 text-sm">
          <div>
            <p className="text-xs uppercase opacity-60">Next stop</p>
            <p className="mt-1 font-bold">Your Day</p>
          </div>
          <div>
            <p className="text-xs uppercase opacity-60">Status</p>
            <p className="mt-1 font-bold" style={{ color: "var(--accent-2)" }}>
              ● On time
            </p>
          </div>
          <div>
            <p className="text-xs uppercase opacity-60">Mood</p>
            <p className="mt-1 font-bold" style={{ color: "var(--accent-1)" }}>
              Excellent
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE 14 — HOLOGRAM ============== */
function HologramGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10"
      style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--text)" }}
    >
      {/* Scanlines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)",
        }}
      />
      {/* Glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl opacity-40"
        style={{ background: "var(--glow)" }}
      />
      {/* Crosshair grid */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="var(--text)" strokeWidth="0.1" />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="var(--text)" strokeWidth="0.1" />
        ))}
      </svg>

      <div className="relative z-10 text-center">
        <p
          className="text-xs uppercase tracking-[0.5em]"
          style={{
            color: "var(--accent)",
            textShadow: "0 0 8px var(--glow)",
            animation: "holo-glitch 3s infinite",
          }}
        >
          ◢ Incoming transmission ◣
        </p>
        <h1
          className="mt-6 text-7xl font-black uppercase tracking-tight sm:text-9xl"
          style={{
            textShadow:
              "0 0 12px var(--glow), 2px 0 0 var(--accent), -2px 0 0 var(--glow)",
            animation: "holo-glitch 4s infinite",
          }}
        >
          {name}
        </h1>
        <p
          className="mt-4 font-mono text-sm tracking-widest opacity-70"
          style={{ animation: "holo-glitch 5s infinite" }}
        >
          ID://USER · {timeOfDay(hour).toUpperCase()} · ONLINE
        </p>
        <div
          className="mx-auto mt-8 h-px w-64"
          style={{ background: "var(--accent)", boxShadow: "0 0 10px var(--glow)" }}
        />
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] opacity-50">
          Authentication confirmed. Welcome back.
        </p>
      </div>

      <style>{`
        @keyframes holo-glitch {
          0%, 100% { transform: translate(0,0); opacity: 1; }
          92% { transform: translate(0,0); opacity: 1; }
          93% { transform: translate(-2px, 1px); opacity: 0.8; }
          94% { transform: translate(2px, -1px); opacity: 1; }
          95% { transform: translate(0, 2px); opacity: 0.6; }
          96% { transform: translate(0, 0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

/* ============== STYLE 15 — CHALKBOARD ============== */
function ChalkboardGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[70vh] items-center justify-center overflow-hidden rounded-3xl p-10"
      style={{
        ...cssVars(palette.vars),
        background: "var(--bg)",
        color: "var(--text)",
        boxShadow: "inset 0 0 80px rgba(0,0,0,0.4)",
      }}
    >
      {/* Chalk dust texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence baseFrequency='0.85' /></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")",
        }}
      />
      {/* Dashed border */}
      <div
        className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-dashed opacity-40"
        style={{ borderColor: "var(--text)" }}
      />

      <div
        className="relative z-10 max-w-xl text-center"
        style={{ fontFamily: '"Bradley Hand", "Comic Sans MS", "Caveat", cursive' }}
      >
        <p className="text-2xl" style={{ color: "var(--accent)" }}>
          ✿ Today's Special ✿
        </p>

        <h1
          className="animate-pop-in mt-6 text-7xl font-bold leading-none sm:text-8xl"
          style={{ textShadow: "1px 1px 0 rgba(255,255,255,0.1)" }}
        >
          Hello,
        </h1>
        <h2
          className="animate-pop-in mt-2 text-7xl font-bold italic sm:text-9xl"
          style={{ animationDelay: "0.2s", color: "var(--accent)" }}
        >
          {name}!
        </h2>

        <div
          className="my-6 mx-auto h-px w-40"
          style={{ background: "var(--text)", opacity: 0.4 }}
        />

        <ul className="space-y-2 text-xl sm:text-2xl">
          <li>
            ★ Fresh {timeOfDay(hour)} vibes
          </li>
          <li>
            ★ A warm hug{" "}
            <span style={{ color: "var(--accent-2)" }}>♡</span>
          </li>
          <li>★ Made with love today</li>
        </ul>

        <p
          className="mt-8 text-3xl italic"
          style={{ color: "var(--accent-2)" }}
        >
          — Come on in! —
        </p>
      </div>
    </div>
  );
}

/* ============== STYLE 16 — VAPORWAVE ============== */
function VaporwaveGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative flex min-h-[80vh] items-center justify-center overflow-hidden rounded-3xl"
      style={cssVars({ ...palette.vars, background: `linear-gradient(180deg, var(--bg-1) 0%, var(--bg-2) 50%, var(--sun-2) 100%)` })}
    >
      {/* Sun */}
      <div
        className="absolute left-1/2 top-1/4 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{ background: `linear-gradient(180deg, var(--sun-1), var(--sun-2))`, boxShadow: `0 0 120px var(--sun-2)` }}
      >
        <div className="absolute inset-0 overflow-hidden rounded-full">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="absolute left-0 right-0 bg-[var(--bg-1)]" style={{ top: `${50 + i * 8}%`, height: `${i * 1.5}px` }} />
          ))}
        </div>
      </div>
      {/* Grid floor */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          background: `linear-gradient(var(--grid) 1px, transparent 1px), linear-gradient(90deg, var(--grid) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          transform: "perspective(400px) rotateX(60deg)",
          transformOrigin: "bottom",
          opacity: 0.6,
        }}
      />
      <div className="relative z-10 text-center" style={{ color: "var(--text)" }}>
        <p className="mb-2 text-sm font-mono uppercase tracking-[0.5em]" style={{ color: "var(--sun-1)" }}>A E S T H E T I C</p>
        <h1 className="text-6xl font-black uppercase tracking-tight md:text-8xl" style={{ textShadow: `4px 4px 0 var(--accent), 8px 8px 0 var(--grid)` }}>
          {name}
        </h1>
        <p className="mt-4 text-lg italic" style={{ color: "var(--sun-1)" }}>welcome to the {timeOfDay(hour)} ✦</p>
      </div>
    </div>
  );
}

/* ============== STYLE 17 — COMIC BOOK ============== */
function ComicGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div
      className="relative min-h-[80vh] rounded-3xl p-6"
      style={cssVars({ ...palette.vars, background: "var(--bg)", backgroundImage: `radial-gradient(var(--ink) 1.5px, transparent 1.5px)`, backgroundSize: "12px 12px" })}
    >
      <div className="grid h-full min-h-[70vh] grid-cols-3 grid-rows-3 gap-3">
        {/* Big hero panel */}
        <div className="col-span-2 row-span-2 flex flex-col items-center justify-center rounded-xl border-4 p-6 text-center" style={{ background: "var(--panel)", borderColor: "var(--ink)", color: "var(--text)", boxShadow: "8px 8px 0 var(--ink)" }}>
          <div className="relative">
            <div className="absolute -inset-8 -z-0" style={{ background: "var(--burst)", clipPath: "polygon(50% 0%, 60% 18%, 80% 12%, 75% 32%, 95% 38%, 78% 50%, 95% 62%, 75% 68%, 80% 88%, 60% 82%, 50% 100%, 40% 82%, 20% 88%, 25% 68%, 5% 62%, 22% 50%, 5% 38%, 25% 32%, 20% 12%, 40% 18%)" }} />
            <h1 className="relative z-10 font-black uppercase tracking-tight text-5xl md:text-7xl">HEY, {name}!</h1>
          </div>
          <p className="mt-6 inline-block rotate-[-2deg] border-2 px-3 py-1 text-sm font-bold uppercase" style={{ background: "var(--accent)", borderColor: "var(--ink)", color: "var(--ink)" }}>Good {timeOfDay(hour)}!</p>
        </div>
        {/* POW */}
        <div className="flex items-center justify-center rounded-xl border-4 p-2" style={{ background: "var(--burst)", borderColor: "var(--ink)", boxShadow: "6px 6px 0 var(--ink)" }}>
          <span className="rotate-[-8deg] text-4xl font-black" style={{ color: "var(--panel)", WebkitTextStroke: "2px var(--ink)" }}>POW!</span>
        </div>
        {/* BOOM */}
        <div className="flex items-center justify-center rounded-xl border-4 p-2" style={{ background: "var(--accent)", borderColor: "var(--ink)", boxShadow: "6px 6px 0 var(--ink)" }}>
          <span className="rotate-[5deg] text-3xl font-black" style={{ color: "var(--ink)" }}>BOOM!</span>
        </div>
        <div className="col-span-2 flex items-center justify-center rounded-xl border-4 p-4" style={{ background: "var(--panel)", borderColor: "var(--ink)", boxShadow: "6px 6px 0 var(--ink)" }}>
          <p className="text-center font-bold uppercase tracking-wide" style={{ color: "var(--text)" }}>"Our hero returns... and the {timeOfDay(hour)} will never be the same!"</p>
        </div>
        <div className="flex items-center justify-center rounded-xl border-4" style={{ background: "var(--burst)", borderColor: "var(--ink)", boxShadow: "6px 6px 0 var(--ink)" }}>
          <span className="text-3xl font-black" style={{ color: "var(--panel)", WebkitTextStroke: "2px var(--ink)" }}>ZAP!</span>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE 18 — STAINED GLASS ============== */
function StainedGlassGreeting({ name, hour, palette }: StyleProps) {
  const colors = ["--c1", "--c2", "--c3", "--c4", "--c5"].map((k) => palette.vars[k]);
  const shards = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 24; i++) {
      const points = [
        `${Math.random() * 100},${Math.random() * 100}`,
        `${Math.random() * 100},${Math.random() * 100}`,
        `${Math.random() * 100},${Math.random() * 100}`,
        `${Math.random() * 100},${Math.random() * 100}`,
      ].join(" ");
      arr.push({ points, color: colors[i % colors.length] });
    }
    return arr;
  }, [palette.id]);

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden rounded-3xl" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 100">
        {shards.map((s, i) => (
          <polygon key={i} points={s.points} fill={s.color} stroke={palette.vars["--lead"]} strokeWidth="0.4" opacity="0.85" />
        ))}
      </svg>
      <div className="absolute inset-0" style={{ background: "radial-gradient(circle at center, transparent 30%, var(--bg) 100%)" }} />
      <div className="relative z-10 px-6 text-center">
        <p className="mb-3 text-xs uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>✦ Illuminated ✦</p>
        <h1 className="font-serif text-6xl font-bold tracking-tight md:text-8xl" style={{ color: "var(--text)", textShadow: "0 0 30px rgba(0,0,0,0.6)" }}>
          {name}
        </h1>
        <p className="mt-4 font-serif text-lg italic" style={{ color: "var(--text)" }}>Light enters, the {timeOfDay(hour)} begins</p>
      </div>
    </div>
  );
}

/* ============== STYLE 19 — PIXEL GARDEN ============== */
function PixelGardenGreeting({ name, hour, palette }: StyleProps) {
  const [grown, setGrown] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setGrown((g) => (g >= 5 ? g : g + 1)), 280);
    return () => clearInterval(id);
  }, []);
  const flowers = useMemo(
    () => Array.from({ length: 9 }, (_, i) => ({ x: 8 + i * 10 + Math.random() * 4, color: ["--bloom-1", "--bloom-2", "--bloom-3"][i % 3] })),
    [palette.id],
  );
  const px = (n: number) => `${n}px`;
  return (
    <div className="relative flex min-h-[80vh] flex-col rounded-3xl p-8" style={{ ...cssVars({ ...palette.vars, background: "var(--sky)", color: "var(--text)" }), imageRendering: "pixelated" }}>
      <div className="flex-1 text-center">
        <p className="text-xs font-mono uppercase tracking-widest" style={{ color: "var(--accent)" }}>★ A NEW DAY SPROUTS ★</p>
        <h1 className="mt-2 font-mono text-5xl font-black uppercase md:text-7xl" style={{ color: "var(--text)", textShadow: `4px 4px 0 var(--accent)` }}>
          Hi, {name}!
        </h1>
        <p className="mt-3 font-mono text-sm" style={{ color: "var(--text)" }}>+10 XP · {timeOfDay(hour)} bonus active</p>
      </div>
      <div className="relative h-48">
        {/* ground */}
        <div className="absolute inset-x-0 bottom-0 h-20" style={{ background: "var(--ground)", boxShadow: `inset 0 ${px(8)} 0 rgba(255,255,255,0.15), inset 0 ${px(-12)} 0 var(--soil)` }} />
        {/* flowers */}
        {flowers.map((f, i) => {
          const stage = Math.min(grown, Math.floor(i / 2) + 1);
          const stemH = stage * 14;
          return (
            <div key={i} className="absolute bottom-16 transition-all duration-500" style={{ left: `${f.x}%` }}>
              <div className="mx-auto" style={{ width: 4, height: stemH, background: "#16a34a" }} />
              {stage >= 2 && (
                <div className="mx-auto -mt-1 grid grid-cols-3" style={{ width: 18, height: 18 }}>
                  <div /> <div style={{ background: palette.vars[f.color] }} /> <div />
                  <div style={{ background: palette.vars[f.color] }} /> <div style={{ background: "var(--accent)" }} /> <div style={{ background: palette.vars[f.color] }} />
                  <div /> <div style={{ background: palette.vars[f.color] }} /> <div />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============== STYLE 20 — KALEIDOSCOPE ============== */
function KaleidoscopeGreeting({ name, hour, palette }: StyleProps) {
  const wedges = 12;
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden rounded-3xl" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[140vmin] w-[140vmin] animate-[spin_30s_linear_infinite]">
          {Array.from({ length: wedges }).map((_, i) => {
            const color = [palette.vars["--c1"], palette.vars["--c2"], palette.vars["--c3"], palette.vars["--c4"]][i % 4];
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 origin-bottom-left"
                style={{
                  width: "50%",
                  height: "50%",
                  transform: `rotate(${(360 / wedges) * i}deg)`,
                  background: `linear-gradient(135deg, ${color} 0%, transparent 70%)`,
                  clipPath: "polygon(0 100%, 100% 100%, 0 0)",
                  opacity: 0.7,
                }}
              />
            );
          })}
        </div>
      </div>
      <div className="relative z-10 rounded-full border-2 px-12 py-10 text-center backdrop-blur-md" style={{ background: "rgba(0,0,0,0.35)", borderColor: "var(--accent)", color: "var(--text)" }}>
        <p className="mb-2 text-xs uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>∞ infinite reflections ∞</p>
        <h1 className="font-serif text-6xl font-bold md:text-7xl">{name}</h1>
        <p className="mt-3 text-sm italic">{timeOfDay(hour)} kaleidoscope</p>
      </div>
    </div>
  );
}

/* ============== STYLE 21 — RECEIPT ============== */
function ReceiptGreeting({ name, hour, palette }: StyleProps) {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const items = [
    { label: `1x Warm Greeting`, price: 0.0 },
    { label: `1x ${timeOfDay(hour)} Bonus`, price: 0.0 },
    { label: `1x Personal Touch (${name})`, price: 0.0 },
    { label: `∞x Good Vibes`, price: 0.0 },
  ];
  return (
    <div className="flex min-h-[80vh] items-center justify-center rounded-3xl p-6" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div
        className="w-full max-w-sm font-mono text-sm"
        style={{
          background: "var(--paper)",
          color: "var(--text)",
          padding: "32px 24px",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)",
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(0,0,0,0.04) 22px, rgba(0,0,0,0.04) 23px)`,
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), 95% 100%, 90% calc(100% - 8px), 85% 100%, 80% calc(100% - 8px), 75% 100%, 70% calc(100% - 8px), 65% 100%, 60% calc(100% - 8px), 55% 100%, 50% calc(100% - 8px), 45% 100%, 40% calc(100% - 8px), 35% 100%, 30% calc(100% - 8px), 25% 100%, 20% calc(100% - 8px), 15% 100%, 10% calc(100% - 8px), 5% 100%, 0 calc(100% - 12px))",
        }}
      >
        <div className="text-center">
          <p className="text-lg font-black tracking-widest">★ WELCOME CO. ★</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>123 Greeting Lane</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Open 24/7 · Always for you</p>
        </div>
        <div className="my-3 border-t border-dashed" style={{ borderColor: "var(--muted)" }} />
        <div className="flex justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>{date}</span>
          <span>{time}</span>
        </div>
        <div className="flex justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>CASHIER: Lovable</span>
          <span>#0001</span>
        </div>
        <div className="my-3 border-t border-dashed" style={{ borderColor: "var(--muted)" }} />
        <div className="space-y-1">
          {items.map((it, i) => (
            <div key={i} className="flex justify-between">
              <span>{it.label}</span>
              <span>FREE</span>
            </div>
          ))}
        </div>
        <div className="my-3 border-t border-dashed" style={{ borderColor: "var(--muted)" }} />
        <div className="flex justify-between font-bold">
          <span>TOTAL</span>
          <span>$0.00</span>
        </div>
        <div className="flex justify-between text-xs" style={{ color: "var(--muted)" }}>
          <span>PAID WITH</span>
          <span>SMILE</span>
        </div>
        <div className="my-3 border-t border-dashed" style={{ borderColor: "var(--muted)" }} />
        <p className="text-center text-xs uppercase tracking-widest" style={{ color: "var(--accent)" }}>** Thank you, {name}! **</p>
        <p className="mt-1 text-center text-xs" style={{ color: "var(--muted)" }}>Have a wonderful {timeOfDay(hour)}.</p>
        <div className="mt-4 flex h-10 items-end justify-center gap-px">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{ width: Math.random() > 0.5 ? 2 : 1, height: `${60 + Math.random() * 40}%`, background: "var(--ink)" }} />
          ))}
        </div>
        <p className="mt-1 text-center text-[10px] tracking-widest" style={{ color: "var(--muted)" }}>WELCOME-{name.toUpperCase()}-001</p>
      </div>
    </div>
  );
}

/* ============== STYLE 22 — TAROT ============== */
function TarotGreeting({ name, hour, palette }: StyleProps) {
  const cards = [
    { name: "The Star", meaning: "Hope is alighting on your shoulders." },
    { name: "The Sun", meaning: "Joy radiates wherever you go today." },
    { name: "The World", meaning: "Completion. You've arrived right on time." },
    { name: "The Magician", meaning: "All the tools you need are within reach." },
    { name: "The Moon", meaning: "Trust your intuition, dreamer." },
  ];
  const [card] = useState(() => cards[Math.floor(Math.random() * cards.length)]);
  return (
    <div className="flex min-h-[80vh] items-center justify-center rounded-3xl p-6" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div className="relative" style={{ perspective: "1200px" }}>
        <div
          className="relative flex h-[480px] w-72 flex-col items-center justify-between rounded-2xl p-6 text-center"
          style={{
            background: "var(--card)",
            border: "3px double var(--gold)",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.6), inset 0 0 60px rgba(0,0,0,0.4)",
            color: "var(--text)",
            animation: "tarot-float 4s ease-in-out infinite",
          }}
        >
          <div className="text-xs uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>✦ {timeOfDay(hour)} ✦</div>
          <div className="flex flex-col items-center">
            <div
              className="flex h-32 w-32 items-center justify-center rounded-full text-5xl"
              style={{ border: "2px solid var(--gold)", background: "radial-gradient(circle, var(--accent) 0%, transparent 70%)" }}
            >
              ☽
            </div>
            <p className="mt-4 font-serif text-2xl italic" style={{ color: "var(--gold)" }}>{card.name}</p>
            <p className="mt-2 px-2 text-sm" style={{ color: "var(--muted)" }}>{card.meaning}</p>
          </div>
          <div>
            <p className="font-serif text-lg" style={{ color: "var(--text)" }}>For {name}</p>
            <div className="mt-2 text-xs uppercase tracking-[0.3em]" style={{ color: "var(--gold)" }}>✦ ✦ ✦</div>
          </div>
        </div>
        <style>{`@keyframes tarot-float { 0%,100% { transform: rotateY(-4deg) translateY(0); } 50% { transform: rotateY(4deg) translateY(-8px); } }`}</style>
      </div>
    </div>
  );
}

/* ============== STYLE 23 — VINYL RECORD ============== */
function VinylGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center rounded-3xl p-6" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div className="relative h-80 w-[36rem] max-w-full">
        {/* sleeve */}
        <div
          className="absolute inset-0 flex flex-col justify-between rounded-sm p-6"
          style={{ background: "var(--sleeve)", boxShadow: "0 20px 60px -20px rgba(0,0,0,0.6)", color: "var(--text)" }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>Side A · 33⅓ RPM</p>
            <h2 className="mt-2 font-serif text-4xl font-black leading-none">Hello,<br />{name}.</h2>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--accent)" }}>Track 01 · {timeOfDay(hour)} groove</p>
            <p className="text-[10px]" style={{ opacity: 0.7 }}>℗ {new Date().getFullYear()} · A Lovable Recording</p>
          </div>
        </div>
        {/* vinyl peeking out */}
        <div
          className="absolute right-[-110px] top-1/2 h-72 w-72 -translate-y-1/2 rounded-full"
          style={{
            background: `repeating-radial-gradient(circle, var(--vinyl) 0 2px, #2a2a2a 2px 4px)`,
            animation: "vinyl-spin 6s linear infinite",
            boxShadow: "0 20px 50px -10px rgba(0,0,0,0.7)",
          }}
        >
          <div className="absolute inset-0 m-auto flex h-24 w-24 items-center justify-center rounded-full text-center" style={{ background: "var(--label)", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "var(--vinyl)" }}>{name}</p>
              <p className="text-[8px]" style={{ color: "var(--vinyl)" }}>welcome mix</p>
            </div>
          </div>
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "var(--bg)" }} />
        </div>
        <style>{`@keyframes vinyl-spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

/* ============== STYLE 24 — WEATHER ============== */
function WeatherGreeting({ name, hour, palette }: StyleProps) {
  const temp = 65 + Math.floor(Math.random() * 20);
  return (
    <div
      className="flex min-h-[80vh] items-center justify-center rounded-3xl p-6"
      style={cssVars({ ...palette.vars, background: "linear-gradient(180deg, var(--bg-from), var(--bg-to))" })}
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 backdrop-blur-xl"
        style={{
          background: "var(--card)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "var(--text)",
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.3)",
        }}
      >
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--muted)" }}>Forecast for {name}</span>
          <span style={{ color: "var(--muted)" }}>{new Date().toLocaleDateString([], { weekday: "long" })}</span>
        </div>
        <div className="mt-6 flex items-center justify-between">
          <div>
            <p className="text-7xl font-thin">{temp}°</p>
            <p className="text-lg" style={{ color: "var(--muted)" }}>Mostly wonderful</p>
          </div>
          <div className="text-7xl" style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,0.2))" }}>☀️</div>
        </div>
        <div className="mt-6 grid grid-cols-4 gap-2 text-center text-xs">
          {["Now", "+1h", "+2h", "+3h"].map((t, i) => (
            <div key={i} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.15)" }}>
              <p style={{ color: "var(--muted)" }}>{t}</p>
              <p className="my-1 text-xl">{["☀️", "⛅", "☀️", "🌤️"][i]}</p>
              <p>{temp + i}°</p>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-2xl p-4" style={{ background: "var(--accent)", color: "var(--text)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Today's outlook</p>
          <p className="mt-1 text-base">A perfect {timeOfDay(hour)} ahead — wear something you love.</p>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE 25 — POSTCARD ============== */
function PostcardGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center rounded-3xl p-6" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div
        className="grid w-full max-w-2xl grid-cols-2 gap-0 overflow-hidden rounded-md"
        style={{
          background: "var(--card)",
          color: "var(--ink)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.06)",
          transform: "rotate(-1.5deg)",
          minHeight: 360,
        }}
      >
        {/* Left — message */}
        <div className="border-r-2 border-dashed p-6" style={{ borderColor: "var(--muted)" }}>
          <p className="font-serif text-2xl italic">Dear {name},</p>
          <p className="mt-3 text-sm leading-relaxed">
            Wishing you a glorious {timeOfDay(hour)}! The view from here is wide and full of possibility. Go do
            something small and wonderful today.
          </p>
          <p className="mt-4 font-serif italic">— with love</p>
        </div>
        {/* Right — address + stamp */}
        <div className="relative p-6">
          <div
            className="absolute right-4 top-4 flex h-20 w-16 items-center justify-center text-center text-[10px] font-black uppercase"
            style={{ background: "var(--stamp)", color: "var(--card)", border: "3px dashed var(--card)", outline: "1px solid var(--stamp)" }}
          >
            HELLO<br />2026
          </div>
          <div className="absolute right-2 top-28 rotate-12 rounded-full border-2 px-2 py-1 text-[10px] uppercase tracking-wider" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
            Par Avion
          </div>
          <div className="mt-28 space-y-1 font-mono text-sm">
            <p className="border-b" style={{ borderColor: "var(--muted)" }}>{name}</p>
            <p className="border-b" style={{ borderColor: "var(--muted)" }}>The Right Place</p>
            <p className="border-b" style={{ borderColor: "var(--muted)" }}>Right Now, 00000</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE 26 — LAVA LAMP ============== */
function LavaLampGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden rounded-3xl p-6" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div className="pointer-events-none absolute inset-0">
        {[
          { c: "var(--blob-1)", size: 380, x: "20%", y: "30%", d: 8 },
          { c: "var(--blob-2)", size: 300, x: "70%", y: "60%", d: 11 },
          { c: "var(--blob-3)", size: 240, x: "50%", y: "20%", d: 14 },
          { c: "var(--blob-1)", size: 200, x: "80%", y: "20%", d: 9 },
          { c: "var(--blob-2)", size: 260, x: "15%", y: "75%", d: 13 },
        ].map((b, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: b.size,
              height: b.size,
              left: b.x,
              top: b.y,
              background: b.c,
              filter: "blur(60px)",
              opacity: 0.7,
              animation: `lava-float-${i} ${b.d}s ease-in-out infinite`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes lava-float-0 { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-30%,-70%) scale(1.2); } }
        @keyframes lava-float-1 { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-70%,-30%) scale(0.9); } }
        @keyframes lava-float-2 { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-40%,-60%) scale(1.1); } }
        @keyframes lava-float-3 { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-60%,-40%) scale(1.15); } }
        @keyframes lava-float-4 { 0%,100% { transform: translate(-50%,-50%); } 50% { transform: translate(-35%,-65%) scale(0.95); } }
      `}</style>
      <div className="relative z-10 text-center" style={{ color: "var(--text)" }}>
        <p className="text-sm uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>Good {timeOfDay(hour)}</p>
        <h1 className="mt-4 text-7xl font-black md:text-8xl" style={{ textShadow: "0 4px 30px rgba(0,0,0,0.4)" }}>{name}</h1>
        <p className="mt-4 text-lg" style={{ opacity: 0.85 }}>Float in. Stay a while.</p>
      </div>
    </div>
  );
}

/* ============== STYLE 27 — STORYBOOK ============== */
function StorybookGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div className="flex min-h-[80vh] items-center justify-center rounded-3xl p-6" style={cssVars({ ...palette.vars, background: "var(--bg)" })}>
      <div
        className="relative grid w-full max-w-3xl grid-cols-2 gap-0 overflow-hidden rounded-r-lg rounded-l-sm"
        style={{
          background: "var(--page)",
          color: "var(--ink)",
          boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4), inset 0 0 80px rgba(0,0,0,0.05)",
          minHeight: 420,
        }}
      >
        {/* spine */}
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2" style={{ background: "var(--muted)", opacity: 0.3 }} />
        {/* Left page — illustration */}
        <div className="relative flex items-center justify-center p-8">
          <svg viewBox="0 0 200 200" className="h-56 w-56">
            <circle cx="100" cy="120" r="70" fill="var(--leaf)" opacity="0.4" />
            <rect x="80" y="120" width="40" height="60" fill="var(--accent)" />
            <polygon points="60,130 100,70 140,130" fill="var(--accent)" />
            <polygon points="70,110 100,60 130,110" fill="var(--leaf)" />
            <circle cx="92" cy="150" r="4" fill="var(--page)" />
            <circle cx="108" cy="150" r="4" fill="var(--page)" />
            <rect x="95" y="160" width="10" height="14" fill="var(--page)" />
            {[...Array(6)].map((_, i) => (
              <circle key={i} cx={20 + i * 30} cy={180 + (i % 2) * 6} r="3" fill="var(--accent)" opacity="0.6" />
            ))}
          </svg>
          <div className="absolute bottom-3 right-4 font-serif text-xs italic" style={{ color: "var(--muted)" }}>— illustration —</div>
        </div>
        {/* Right page — story */}
        <div className="flex flex-col justify-center p-10">
          <p className="font-serif text-sm uppercase tracking-widest" style={{ color: "var(--muted)" }}>Chapter One</p>
          <h2 className="mt-2 font-serif text-3xl font-bold leading-tight" style={{ color: "var(--accent)" }}>
            Once upon a {timeOfDay(hour)}…
          </h2>
          <p className="mt-4 font-serif text-base leading-relaxed">
            …there was a kind soul named <span className="font-bold italic">{name}</span>, who opened a small
            door and stepped into a brand-new day. The day, in turn, smiled back.
          </p>
          <p className="mt-4 font-serif text-sm italic" style={{ color: "var(--muted)" }}>
            — and they were very glad to see you.
          </p>
          <div className="mt-auto pt-6 text-right font-serif text-xs" style={{ color: "var(--muted)" }}>page 1</div>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE — DAF GEMARA ============== */
function GemaraGreeting({ name, hour, palette }: StyleProps) {
  const filler =
    "אמר רבי יוחנן משום רבי שמעון בן יוחאי כל המקבל פני חבירו כאילו מקבל פני שכינה ועוד אמרו חכמינו ז\"ל גדולה הכנסת אורחים יותר מהקבלת פני שכינה ולכן בכל בוקר ובוקר ראוי לאדם לקבל את חבירו בסבר פנים יפות";
  return (
    <div className="rounded-3xl p-2 shadow-2xl" style={{ ...cssVars(palette.vars), background: "var(--bg)" }}>
      <div className="rounded-2xl p-6 sm:p-10" style={{ background: "var(--page)", color: "var(--ink)" }}>
        <div className="mb-4 flex items-center justify-between font-serif text-xs uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          <span>מסכת ברכות · דף {(hour % 30) + 2}.</span>
          <span>פרק קבלת פנים</span>
          <span>{timeOfDay(hour)}</span>
        </div>
        <div className="grid grid-cols-12 gap-3 font-serif leading-relaxed" dir="rtl">
          {/* Rashi - right narrow */}
          <div className="col-span-3 text-[11px] sm:text-xs" style={{ color: "var(--muted)" }}>
            <p className="mb-1 font-bold" style={{ color: "var(--accent)" }}>רש"י</p>
            <p>{filler} {filler.slice(0, 80)}</p>
            <p className="mt-2">{filler.slice(0, 140)}</p>
          </div>
          {/* Main mishna/gemara */}
          <div className="col-span-6 rounded-md border-2 p-3 text-center" style={{ borderColor: "var(--rule)" }}>
            <p className="text-sm sm:text-base font-bold">משנה.</p>
            <p className="mt-2 text-base sm:text-lg leading-loose">
              הנכנס לבית חבירו אומר לו{" "}
              <span className="inline-block rounded px-2 py-0.5 text-xl sm:text-2xl font-extrabold" style={{ background: "var(--accent)", color: "var(--page)" }}>
                שלום עליך {name}
              </span>{" "}
              ומקבלו בסבר פנים יפות שנאמר טוב עין הוא יבורך
            </p>
            <p className="mt-3 text-sm sm:text-base font-bold">גמרא.</p>
            <p className="mt-1 text-sm sm:text-base leading-loose">
              תנו רבנן מקבלין את הבא בכל עת ובכל שעה ואפילו ב{timeOfDay(hour)} ואין מחזירין פניו ריקם וכל המקבל פני חבירו בסבר פנים יפות מעלה עליו הכתוב כאילו האיר את העולם כולו
            </p>
          </div>
          {/* Tosafos - left narrow */}
          <div className="col-span-3 text-[11px] sm:text-xs" style={{ color: "var(--muted)" }}>
            <p className="mb-1 font-bold" style={{ color: "var(--accent)" }}>תוספות</p>
            <p>{filler.slice(0, 160)}</p>
            <p className="mt-2">{filler.slice(0, 100)} ועיין היטב.</p>
          </div>
        </div>
        <div className="mt-6 text-center font-serif text-xs italic" style={{ color: "var(--muted)" }}>
          — וברוך הבא {name}, יהי רצון שתצליח בלימוד היום —
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE — BEIS MEDRASH ============== */
function BeisMedrashGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-10 shadow-2xl" style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--ink)", minHeight: 480 }}>
      {/* Bookshelf back wall */}
      <div className="absolute inset-x-0 top-0 h-1/2 opacity-60" style={{
        backgroundImage: `repeating-linear-gradient(90deg, var(--wood) 0 22px, color-mix(in oklab, var(--wood) 70%, black) 22px 26px), repeating-linear-gradient(0deg, transparent 0 70px, color-mix(in oklab, var(--wood) 50%, black) 70px 74px)`,
      }} />
      {/* Candle glow */}
      <div className="absolute left-1/2 top-1/3 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: "var(--glow)", opacity: 0.35 }} />
      {/* Floating sparks */}
      {[...Array(12)].map((_, i) => (
        <div key={i} className="absolute h-1 w-1 rounded-full animate-float-blob" style={{
          background: "var(--glow)", left: `${(i * 73) % 100}%`, top: `${20 + ((i * 37) % 60)}%`, animationDelay: `${i * 0.4}s`, opacity: 0.7,
        }} />
      ))}
      <div className="relative z-10 text-center">
        <p className="font-serif text-sm uppercase tracking-[0.4em]" style={{ color: "var(--muted)" }}>
          ✡ Beis Medrash · {timeOfDay(hour)} seder ✡
        </p>
        <h1 className="mt-4 font-serif text-5xl sm:text-6xl font-extrabold animate-pop-in" style={{ color: "var(--accent)", textShadow: "0 0 30px var(--glow)" }}>
          ברוך הבא, {name}
        </h1>
        <p className="mt-3 font-serif text-lg italic">Your shtender is waiting. Your chavrusa is here.</p>

        <div className="mt-8 flex items-end justify-center gap-6">
          {/* Candle */}
          <div className="flex flex-col items-center">
            <div className="h-6 w-2 rounded-full animate-wiggle" style={{ background: "var(--glow)", boxShadow: "0 0 20px var(--glow), 0 0 40px var(--glow)" }} />
            <div className="h-16 w-3 rounded-sm" style={{ background: "var(--ink)" }} />
            <div className="h-2 w-6 rounded-sm" style={{ background: "var(--wood)" }} />
          </div>
          {/* Open sefer */}
          <div className="relative h-28 w-44 rounded-sm shadow-2xl" style={{ background: "var(--ink)", color: "var(--bg)" }}>
            <div className="absolute inset-1 grid grid-cols-2 gap-0.5">
              <div className="rounded-sm p-1 text-[6px] leading-[7px]" style={{ background: "var(--bg)", color: "var(--ink)" }}>
                {"אאאא ".repeat(20)}
              </div>
              <div className="rounded-sm p-1 text-[6px] leading-[7px]" style={{ background: "var(--bg)", color: "var(--ink)" }}>
                {"בבבב ".repeat(20)}
              </div>
            </div>
            <div className="absolute left-1/2 top-0 h-full w-px" style={{ background: "var(--wood)" }} />
          </div>
          {/* Candle */}
          <div className="flex flex-col items-center">
            <div className="h-6 w-2 rounded-full animate-wiggle" style={{ background: "var(--glow)", boxShadow: "0 0 20px var(--glow), 0 0 40px var(--glow)", animationDelay: "0.3s" }} />
            <div className="h-16 w-3 rounded-sm" style={{ background: "var(--ink)" }} />
            <div className="h-2 w-6 rounded-sm" style={{ background: "var(--wood)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============== STYLE — SHTENDER ============== */
function ShtenderGreeting({ name, hour, palette }: StyleProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl p-8 shadow-2xl" style={{ ...cssVars(palette.vars), background: `radial-gradient(ellipse at top, color-mix(in oklab, var(--bg) 70%, white) 0%, var(--bg) 80%)`, color: "var(--ink)", minHeight: 520 }}>
      <p className="text-center font-serif text-xs uppercase tracking-[0.4em]" style={{ color: "var(--accent)" }}>
        ✦ Shtender · {timeOfDay(hour)} learning ✦
      </p>
      <div className="mx-auto mt-6 flex max-w-md flex-col items-center">
        {/* Open sefer on top */}
        <div className="relative w-full" style={{ transform: "perspective(800px) rotateX(28deg)", transformOrigin: "bottom" }}>
          <div className="relative grid grid-cols-2 rounded-sm shadow-2xl" style={{ background: "var(--page)" }}>
            <div className="p-4 text-right font-serif" dir="rtl">
              <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>פרק א'</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink)" }}>
                ברוך הבא {name} ללימוד של היום. פתח את הספר, לבך ועיניך, ויאיר ה' פניו אליך.
              </p>
              <p className="mt-2 text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
                {"ועוד אמרו חכמים בכל יום ויום יהיו בעיניך כחדשים ".repeat(3)}
              </p>
            </div>
            <div className="border-l p-4 text-right font-serif" dir="rtl" style={{ borderColor: "var(--muted)" }}>
              <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>המשך</p>
              <p className="mt-1 text-[10px] leading-relaxed" style={{ color: "var(--muted)" }}>
                {"וכל הקובע עת לתורה הרי הוא מבני עליה ".repeat(4)}
              </p>
              <p className="mt-2 text-xs italic" style={{ color: "var(--ink)" }}>— הצלחה רבה!</p>
            </div>
            {/* Spine shadow */}
            <div className="pointer-events-none absolute left-1/2 top-0 h-full w-2 -translate-x-1/2" style={{ background: "linear-gradient(90deg, transparent, color-mix(in oklab, var(--ink) 30%, transparent), transparent)" }} />
          </div>
        </div>
        {/* Shtender body */}
        <div className="relative -mt-2 h-6 w-[110%] rounded-t-md shadow-xl" style={{ background: "var(--wood)", boxShadow: "inset 0 -4px 0 color-mix(in oklab, var(--wood) 60%, black)" }} />
        <div className="h-32 w-32" style={{ background: "var(--wood)", clipPath: "polygon(20% 0, 80% 0, 95% 100%, 5% 100%)", boxShadow: "inset -8px 0 12px color-mix(in oklab, var(--wood) 60%, black)" }} />
        <div className="-mt-1 h-3 w-44 rounded-full" style={{ background: "color-mix(in oklab, var(--wood) 50%, black)" }} />
      </div>
      <div className="mt-6 text-center">
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold animate-rise" style={{ color: "var(--accent)" }}>
          Welcome back, {name}
        </h1>
        <p className="mt-2 font-serif text-sm italic" style={{ color: "var(--muted)" }}>
          "תורה צוה לנו משה" — pick up where you left off.
        </p>
      </div>
    </div>
  );
}

/* ============== STYLE — MAZEL TOV ============== */
function MazelTovGreeting({ name, hour, palette }: StyleProps) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const c = (palette.vars["--gold"] as string) || "#fcd34d";
    const c2 = (palette.vars["--banner"] as string) || "#7f1d1d";
    setTimeout(() => {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.4 }, colors: [c, c2, "#ffffff"] });
    }, 200);
  }, [palette]);

  return (
    <div className="relative overflow-hidden rounded-3xl p-10 shadow-2xl" style={{ ...cssVars(palette.vars), background: "var(--bg)", color: "var(--ink)", minHeight: 480 }}>
      {/* Gold frame */}
      <div className="absolute inset-3 rounded-2xl border-4" style={{ borderColor: "var(--gold)", borderStyle: "double" }} />
      {/* Stars */}
      {[...Array(10)].map((_, i) => (
        <div key={i} className="absolute font-bold animate-pop-in" style={{
          color: "var(--gold)", left: `${(i * 53) % 95}%`, top: `${(i * 31) % 90}%`, fontSize: `${10 + (i % 4) * 4}px`, animationDelay: `${i * 0.08}s`,
        }}>✦</div>
      ))}
      <div className="relative z-10 text-center">
        <p className="font-serif text-xs uppercase tracking-[0.5em]" style={{ color: "var(--accent)" }}>
          ✦ B'siman tov u'mazal tov ✦
        </p>
        <div className="mt-4 inline-block -rotate-2 rounded-md px-8 py-3 shadow-2xl" style={{ background: "var(--banner)", color: "var(--gold)" }}>
          <p className="font-serif text-2xl sm:text-3xl font-extrabold uppercase tracking-widest">Mazel Tov</p>
        </div>
        <h1 className="mt-6 font-serif text-5xl sm:text-7xl font-extrabold animate-pop-in" style={{ color: "var(--accent)", textShadow: "0 2px 0 var(--gold)" }}>
          {name}!
        </h1>
        <p className="mt-2 text-3xl font-serif" style={{ color: "var(--accent)" }} dir="rtl">
          מזל טוב!
        </p>
        <p className="mt-4 font-serif text-base italic">
          A {timeOfDay(hour)} of brachos, simcha, and only good news.
        </p>

        {/* L'chaim cups */}
        <div className="mt-8 flex items-end justify-center gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center animate-rise" style={{ animationDelay: `${0.2 + i * 0.15}s` }}>
              <div className="relative h-14 w-10 rounded-b-full overflow-hidden border-2" style={{ borderColor: "var(--gold)", background: "color-mix(in oklab, var(--banner) 40%, transparent)" }}>
                <div className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: "var(--banner)" }} />
              </div>
              <div className="h-3 w-1" style={{ background: "var(--gold)" }} />
              <div className="h-1 w-8 rounded-full" style={{ background: "var(--gold)" }} />
            </div>
          ))}
        </div>
        <p className="mt-4 font-serif text-sm font-bold uppercase tracking-widest" style={{ color: "var(--accent)" }}>L'chaim! 🍷</p>
      </div>
    </div>
  );
}

/* ============== MAIN ============== */
const STYLE_COMPONENTS: Record<StyleId, React.FC<StyleProps>> = {
  confetti: ConfettiGreeting,
  typewriter: TypewriterGreeting,
  cinematic: CinematicGreeting,
  terminal: TerminalGreeting,
  card: CardGreeting,
  magazine: MagazineGreeting,
  constellation: ConstellationGreeting,
  polaroid: PolaroidGreeting,
  neon: NeonGreeting,
  origami: OrigamiGreeting,
  arcade: ArcadeGreeting,
  zen: ZenGreeting,
  subway: SubwayGreeting,
  hologram: HologramGreeting,
  chalkboard: ChalkboardGreeting,
  vaporwave: VaporwaveGreeting,
  comic: ComicGreeting,
  stained: StainedGlassGreeting,
  pixelgarden: PixelGardenGreeting,
  kaleidoscope: KaleidoscopeGreeting,
  receipt: ReceiptGreeting,
  tarot: TarotGreeting,
  vinyl: VinylGreeting,
  weather: WeatherGreeting,
  postcard: PostcardGreeting,
  lavalamp: LavaLampGreeting,
  storybook: StorybookGreeting,
  gemara: GemaraGreeting,
  beismedrash: BeisMedrashGreeting,
  shtender: ShtenderGreeting,
  mazeltov: MazelTovGreeting,
};

export function WelcomeGreeting({ name = "Friend" }: WelcomeGreetingProps) {
  const [styleId, setStyleId] = useState<StyleId>("confetti");
  const [paletteIds, setPaletteIds] = useState<Record<StyleId, string>>(() =>
    Object.fromEntries(
      (Object.keys(PALETTES) as StyleId[]).map((k) => [k, PALETTES[k][0].id]),
    ) as Record<StyleId, string>,
  );
  const [hour, setHour] = useState<number>(12);

  useEffect(() => {
    setHour(new Date().getHours());
  }, []);

  const palettes = PALETTES[styleId];
  const palette =
    palettes.find((p) => p.id === paletteIds[styleId]) ?? palettes[0];
  const Greeting = STYLE_COMPONENTS[styleId];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto mb-4 max-w-5xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
          Choose a greeting style
        </p>
        <div className="flex flex-wrap gap-2">
          {STYLES.map((s) => {
            const active = s.id === styleId;
            return (
              <button
                key={s.id}
                onClick={() => setStyleId(s.id)}
                className={`group flex items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm transition-all ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white shadow-lg"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
                aria-pressed={active}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="flex flex-col leading-tight">
                  <span className="font-bold">{s.label}</span>
                  <span
                    className={`text-[11px] ${active ? "text-white/70" : "text-slate-500"}`}
                  >
                    {s.blurb}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Palette picker for current style */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
            Color
          </p>
          {palettes.map((p) => {
            const active = p.id === palette.id;
            return (
              <button
                key={p.id}
                onClick={() =>
                  setPaletteIds((prev) => ({ ...prev, [styleId]: p.id }))
                }
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                }`}
                aria-pressed={active}
              >
                <span className="flex">
                  {p.swatches.map((sw, i) => (
                    <span
                      key={i}
                      className="-ml-1 h-4 w-4 rounded-full border border-white first:ml-0"
                      style={{ background: sw }}
                    />
                  ))}
                </span>
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render selected greeting — keyed so it remounts and re-runs animations */}
      <div key={`${styleId}-${palette.id}`} className="mx-auto max-w-5xl">
        <Greeting name={name} hour={hour} palette={palette} />
      </div>
    </div>
  );
}
