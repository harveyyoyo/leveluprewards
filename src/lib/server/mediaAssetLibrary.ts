import fs from "fs";
import path from "path";
import { isValidMediaFilename } from "@/lib/marketing/mediaFilename";
import {
  normalizeMediaLabelsFile,
  type MediaAssetItem,
  type MediaAssetLabelsFile,
} from "@/lib/marketing/mediaAssetTypes";
import { updateMediaAssetReferences } from "@/lib/server/mediaAssetRename";

const REPO_ROOT = process.env.LEVELUP_REPO_ROOT ?? process.cwd();
const LABELS_FILE = path.join(REPO_ROOT, "public", "marketing", "media-labels.json");
const LEGACY_LABELS_FILE = path.join(
  REPO_ROOT,
  "promo-video",
  "public",
  "capture-library",
  "labels.json",
);
const CAPTURE_ROOT = path.join(REPO_ROOT, "promo-video", "public", "capture-library");
const MARKETING_SHOTS_DIR = path.join(REPO_ROOT, "public", "marketing", "screenshots");

export function getMediaLabelsPath(): string {
  return LABELS_FILE;
}

export function readMediaLabelsFile(): MediaAssetLabelsFile {
  if (fs.existsSync(LABELS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(LABELS_FILE, "utf8")) as Partial<MediaAssetLabelsFile>;
      return normalizeMediaLabelsFile(raw);
    } catch {
      return normalizeMediaLabelsFile(null);
    }
  }

  if (fs.existsSync(LEGACY_LABELS_FILE)) {
    try {
      const raw = JSON.parse(fs.readFileSync(LEGACY_LABELS_FILE, "utf8")) as Partial<MediaAssetLabelsFile>;
      const normalized = normalizeMediaLabelsFile(raw);
      writeMediaLabelsFile(normalized);
      return normalized;
    } catch {
      return normalizeMediaLabelsFile(null);
    }
  }

  return normalizeMediaLabelsFile(null);
}

export function writeMediaLabelsFile(payload: MediaAssetLabelsFile): void {
  fs.mkdirSync(path.dirname(LABELS_FILE), { recursive: true });
  fs.writeFileSync(LABELS_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function listCaptureMp4s(): MediaAssetItem[] {
  const out: MediaAssetItem[] = [];
  if (!fs.existsSync(CAPTURE_ROOT)) return out;

  const walk = (dir: string, category: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "_rejected") continue;
        walk(full, entry.name);
        continue;
      }
      if (!entry.name.endsWith(".mp4")) continue;
      const rel = `capture-library/${category}/${entry.name}`.replace(/\\/g, "/");
      out.push({
        id: rel,
        path: rel,
        category,
        filename: entry.name,
        kind: "video",
        publicUrl: `/api/media-assets/file?path=${encodeURIComponent(rel)}`,
      });
    }
  };

  for (const entry of fs.readdirSync(CAPTURE_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) continue;
    walk(path.join(CAPTURE_ROOT, entry.name), entry.name);
  }

  return out.sort((a, b) =>
    a.category === b.category
      ? a.filename.localeCompare(b.filename)
      : a.category.localeCompare(b.category),
  );
}

function listMarketingScreenshots(): MediaAssetItem[] {
  if (!fs.existsSync(MARKETING_SHOTS_DIR)) return [];
  return fs
    .readdirSync(MARKETING_SHOTS_DIR)
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((filename) => {
      const rel = `marketing/screenshots/${filename}`;
      return {
        id: rel,
        path: rel,
        category: "marketing",
        filename,
        kind: "image" as const,
        publicUrl: `/marketing/screenshots/${filename}`,
      };
    });
}

export function listMediaAssets(): {
  clips: MediaAssetItem[];
  screenshots: MediaAssetItem[];
  all: MediaAssetItem[];
} {
  const clips = listCaptureMp4s();
  const screenshots = listMarketingScreenshots();
  return { clips, screenshots, all: [...clips, ...screenshots] };
}

export function resolveMediaAssetFile(relPath: string): string | null {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized || normalized.includes("..")) return null;

  if (normalized.startsWith("capture-library/")) {
    const sub = normalized.slice("capture-library/".length);
    const full = path.resolve(CAPTURE_ROOT, sub);
    if (!full.startsWith(CAPTURE_ROOT)) return null;
    return full;
  }

  if (normalized.startsWith("marketing/screenshots/")) {
    const name = normalized.slice("marketing/screenshots/".length);
    if (!name || name.includes("/") || name.includes("\\")) return null;
    const full = path.resolve(MARKETING_SHOTS_DIR, name);
    if (!full.startsWith(MARKETING_SHOTS_DIR)) return null;
    return full;
  }

  return null;
}

export function deleteMediaAsset(relPath: string): void {
  const filePath = resolveMediaAssetFile(relPath);
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  const labels = readMediaLabelsFile();
  if (labels.items[relPath]) {
    delete labels.items[relPath];
    labels.updatedAt = new Date().toISOString();
    writeMediaLabelsFile(labels);
  }
}

export function contentTypeForPath(relPath: string): string {
  if (relPath.endsWith(".png")) return "image/png";
  if (relPath.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

export function renameMediaAsset(
  relPath: string,
  newFilename: string,
): { newPath: string; referencesUpdated: number; filesTouched: string[] } {
  const normalized = relPath.replace(/\\/g, "/");
  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid path");
  }

  const safeName = newFilename.trim().replace(/\\/g, "/");
  if (!safeName || safeName.includes("/") || !isValidMediaFilename(safeName)) {
    throw new Error("Invalid filename (use letters, numbers, hyphens; .png or .mp4)");
  }

  const oldFilePath = resolveMediaAssetFile(normalized);
  if (!oldFilePath || !fs.existsSync(oldFilePath)) {
    throw new Error("File not found");
  }

  const oldFilename = path.basename(oldFilePath);
  if (oldFilename === safeName) {
    return { newPath: normalized, referencesUpdated: 0, filesTouched: [] };
  }

  const parentRel = normalized.slice(0, normalized.length - oldFilename.length);
  const newRelPath = `${parentRel}${safeName}`;
  const newFilePath = resolveMediaAssetFile(newRelPath);
  if (!newFilePath) {
    throw new Error("Invalid target path");
  }
  if (fs.existsSync(newFilePath)) {
    throw new Error(`"${safeName}" already exists`);
  }

  fs.renameSync(oldFilePath, newFilePath);

  const labels = readMediaLabelsFile();
  if (labels.items[normalized]) {
    labels.items[newRelPath] = labels.items[normalized];
    delete labels.items[normalized];
    labels.updatedAt = new Date().toISOString();
    writeMediaLabelsFile(labels);
  }

  const { referencesUpdated, filesTouched } = updateMediaAssetReferences(
    normalized,
    newRelPath,
    oldFilename,
    safeName,
  );

  return { newPath: newRelPath, referencesUpdated, filesTouched };
}
