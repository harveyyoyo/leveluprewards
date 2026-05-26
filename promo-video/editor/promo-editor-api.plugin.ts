import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const EDITOR_DIR = path.dirname(fileURLToPath(import.meta.url));
const PROMO_ROOT = path.resolve(EDITOR_DIR, "..");
const STUDIO_ROOT = path.resolve(PROMO_ROOT, "..");
const PROPS_FILE = path.join(PROMO_ROOT, "widescreen-promo-props.json");
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
