import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const EDITOR_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMO_ROOT = path.resolve(EDITOR_DIR, "..");
const STUDIO_ROOT = path.resolve(PROMO_ROOT, "..");
const PROPS_FILE = path.join(PROMO_ROOT, "widescreen-promo-props.json");
const CAPTURE_ROOT = path.join(PROMO_ROOT, "public", "capture-library");
const LABELS_FILE = path.join(STUDIO_ROOT, "public", "marketing", "media-labels.json");
const LEGACY_LABELS_FILE = path.join(CAPTURE_ROOT, "labels.json");
const MARKETING_SHOTS_DIR = path.join(
  STUDIO_ROOT,
  "public",
  "marketing",
  "screenshots",
);
const VOICE_SCRIPT = path.join(STUDIO_ROOT, "scripts", "generate-widescreen-voiceover.mjs");
const OUTPUT_MP4 = path.resolve(PROMO_ROOT, "../assets/levelup-promo-widescreen.mp4");

type PromoPayload = {
  props?: Record<string, unknown>;
  voice?: string;
  regenerateVoice?: boolean;
};

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(
  res: import("node:http").ServerResponse,
  status: number,
  body: object,
) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function runNode(args: string[], cwd: string): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const child = spawn(isWin ? "node.exe" : "node", args, {
      cwd,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (d: Buffer) => {
      stderr += d.toString();
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
    child.on("error", reject);
  });
}

function readPropsFile(): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(PROPS_FILE, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function listCaptureMp4s(): {
  id: string;
  path: string;
  category: string;
  filename: string;
  kind: "video";
}[] {
  const out: ReturnType<typeof listCaptureMp4s> = [];
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

function listMarketingScreenshots(): {
  id: string;
  path: string;
  category: string;
  filename: string;
  kind: "image";
}[] {
  if (!fs.existsSync(MARKETING_SHOTS_DIR)) return [];
  return fs
    .readdirSync(MARKETING_SHOTS_DIR)
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((filename) => ({
      id: `marketing/${filename}`,
      path: `marketing/screenshots/${filename}`,
      category: "marketing",
      filename,
      kind: "image" as const,
    }));
}

function readLabelsFile(): Record<string, unknown> {
  try {
    if (fs.existsSync(LABELS_FILE)) {
      return JSON.parse(fs.readFileSync(LABELS_FILE, "utf8")) as Record<
        string,
        unknown
      >;
    }
    if (fs.existsSync(LEGACY_LABELS_FILE)) {
      const legacy = JSON.parse(fs.readFileSync(LEGACY_LABELS_FILE, "utf8")) as Record<
        string,
        unknown
      >;
      fs.mkdirSync(path.dirname(LABELS_FILE), { recursive: true });
      fs.writeFileSync(LABELS_FILE, `${JSON.stringify(legacy, null, 2)}\n`);
      return legacy;
    }
  } catch {
    /* fall through */
  }
  return { updatedAt: new Date(0).toISOString(), items: {} };
}

function sendFile(
  res: import("node:http").ServerResponse,
  filePath: string,
  contentType: string,
) {
  if (!fs.existsSync(filePath)) {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  fs.createReadStream(filePath).pipe(res);
}

function resolveLibraryFile(relPath: string): string | null {
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

function removeLabelEntry(relPath: string) {
  const labels = readLabelsFile() as {
    updatedAt?: string;
    items?: Record<string, unknown>;
  };
  if (!labels.items?.[relPath]) return;
  delete labels.items[relPath];
  labels.updatedAt = new Date().toISOString();
  fs.writeFileSync(LABELS_FILE, `${JSON.stringify(labels, null, 2)}\n`);
}

async function regenerateVoice(voice: string): Promise<{ ok: boolean; error?: string }> {
  const { code, stderr } = await runNode(
    [VOICE_SCRIPT, "--engine=openai", `--voice=${voice}`],
    STUDIO_ROOT,
  );
  if (code !== 0) {
    return { ok: false, error: `Voice generation failed. ${stderr.slice(-600)}` };
  }
  return { ok: true };
}

/** Dev-only: save props, regenerate voice, render MP4 from the editor page */
export function promoEditorApiPlugin(): Plugin {
  return {
    name: "promo-editor-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.method === "GET" && req.url?.startsWith("/marketing-screenshots/")) {
          const name = decodeURIComponent(
            req.url.slice("/marketing-screenshots/".length).split("?")[0] ?? "",
          );
          if (!name || name.includes("..")) {
            sendJson(res, 400, { ok: false, error: "Bad path" });
            return;
          }
          sendFile(
            res,
            path.join(MARKETING_SHOTS_DIR, name),
            "image/png",
          );
          return;
        }

        if (req.method === "GET" && req.url === "/api/capture-library/list") {
          sendJson(res, 200, {
            clips: listCaptureMp4s(),
            screenshots: listMarketingScreenshots(),
          });
          return;
        }

        if (req.method === "GET" && req.url === "/api/capture-library/labels") {
          sendJson(res, 200, readLabelsFile());
          return;
        }

        if (!req.url?.startsWith("/api/promo/") && !req.url?.startsWith("/api/capture-library/")) {
          next();
          return;
        }

        if (req.method === "POST" && req.url === "/api/capture-library/labels") {
          try {
            const raw = await readBody(req);
            const body = JSON.parse(raw) as Record<string, unknown>;
            fs.mkdirSync(path.dirname(LABELS_FILE), { recursive: true });
            fs.writeFileSync(LABELS_FILE, `${JSON.stringify(body, null, 2)}\n`);
            sendJson(res, 200, { ok: true, path: LABELS_FILE });
          } catch (e) {
            sendJson(res, 500, {
              ok: false,
              error: e instanceof Error ? e.message : "Save failed",
            });
          }
          return;
        }

        if (req.method === "POST" && req.url === "/api/capture-library/delete") {
          try {
            const raw = await readBody(req);
            const body = JSON.parse(raw) as { path?: string };
            const relPath = String(body.path ?? "").replace(/\\/g, "/");
            const filePath = resolveLibraryFile(relPath);
            if (!filePath) {
              sendJson(res, 400, { ok: false, error: "Invalid path" });
              return;
            }
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
            }
            removeLabelEntry(relPath);
            sendJson(res, 200, { ok: true, path: relPath, deleted: filePath });
          } catch (e) {
            sendJson(res, 500, {
              ok: false,
              error: e instanceof Error ? e.message : "Delete failed",
            });
          }
          return;
        }

        if (req.method === "POST" && req.url === "/api/capture-library/recapture") {
          try {
            const raw = await readBody(req);
            const body = JSON.parse(raw) as { path?: string };
            const relPath = String(body.path ?? "").replace(/\\/g, "/");
            if (!relPath || relPath.includes("..")) {
              sendJson(res, 400, { ok: false, error: "Invalid path" });
              return;
            }
            const script = path.join(STUDIO_ROOT, "scripts", "recapture-media-asset.mjs");
            const { code, stderr } = await runNode(
              [script, `--path=${relPath}`],
              STUDIO_ROOT,
            );
            if (code !== 0) {
              sendJson(res, 500, {
                ok: false,
                error: `Recapture failed (exit ${code}). ${stderr.slice(-800)}`,
              });
              return;
            }
            sendJson(res, 200, { ok: true, path: relPath });
          } catch (e) {
            sendJson(res, 500, {
              ok: false,
              error: e instanceof Error ? e.message : "Recapture failed",
            });
          }
          return;
        }

        if (!req.url?.startsWith("/api/promo/")) {
          next();
          return;
        }

        if (req.method !== "POST") {
          sendJson(res, 405, { ok: false, error: "POST only" });
          return;
        }

        try {
          const raw = await readBody(req);
          const body = JSON.parse(raw) as PromoPayload;
          const props = body.props ?? body;

          if (req.url === "/api/promo/save-props") {
            fs.writeFileSync(PROPS_FILE, `${JSON.stringify(props, null, 2)}\n`);
            sendJson(res, 200, { ok: true, path: PROPS_FILE });
            return;
          }

          if (req.url === "/api/promo/regenerate-voice") {
            const voice = String(body.voice ?? "nova").trim();
            if (props && typeof props === "object") {
              fs.writeFileSync(PROPS_FILE, `${JSON.stringify(props, null, 2)}\n`);
            }
            const result = await regenerateVoice(voice);
            if (!result.ok) {
              sendJson(res, 500, { ok: false, error: result.error });
              return;
            }
            const updated = readPropsFile();
            sendJson(res, 200, { ok: true, voice, props: updated });
            return;
          }

          if (req.url === "/api/promo/render") {
            const voice = String(body.voice ?? "nova").trim();
            const regenerateVoiceFirst = body.regenerateVoice !== false;

            const propsWithVoice = {
              ...(typeof props === "object" ? props : {}),
              ttsVoice: voice,
            };
            fs.writeFileSync(
              PROPS_FILE,
              `${JSON.stringify(propsWithVoice, null, 2)}\n`,
            );

            if (regenerateVoiceFirst) {
              const voiceResult = await regenerateVoice(voice);
              if (!voiceResult.ok) {
                sendJson(res, 500, { ok: false, error: voiceResult.error });
                return;
              }
            }

            const isWin = process.platform === "win32";
            const child = spawn(
              isWin ? "npm.cmd" : "npm",
              ["run", "render:widescreen:props"],
              {
                cwd: PROMO_ROOT,
                shell: isWin,
                stdio: ["ignore", "pipe", "pipe"],
              },
            );

            let stderr = "";
            child.stderr?.on("data", (d: Buffer) => {
              stderr += d.toString();
            });

            child.on("close", (code) => {
              if (code === 0) {
                sendJson(res, 200, {
                  ok: true,
                  output: OUTPUT_MP4,
                  voice,
                  regeneratedVoice: regenerateVoiceFirst,
                });
              } else {
                sendJson(res, 500, {
                  ok: false,
                  error: `Render exited ${code}. ${stderr.slice(-800)}`,
                });
              }
            });

            child.on("error", (err) => {
              sendJson(res, 500, { ok: false, error: err.message });
            });
            return;
          }

          sendJson(res, 404, { ok: false, error: "Unknown route" });
        } catch (e) {
          sendJson(res, 500, {
            ok: false,
            error: e instanceof Error ? e.message : "Server error",
          });
        }
      });
    },
  };
}
