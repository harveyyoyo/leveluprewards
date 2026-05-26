import React, { useCallback, useEffect, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { WidescreenPromo } from "../WidescreenPromo";
import { defaultWidescreenPromoProps } from "../promo/widescreenPromoDefaults";
import type { WidescreenPromoProps } from "../promo/widescreenPromoSchema";
import { WidescreenAssetStatus } from "./WidescreenAssetStatus";
import { WidescreenTimelineEditor } from "./WidescreenTimelineEditor";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const WidescreenEditorApp: React.FC = () => {
  const [props, setProps] = useState<WidescreenPromoProps>(() => {
    try {
      const saved = localStorage.getItem("widescreen-promo-props");
      if (saved) return JSON.parse(saved) as WidescreenPromoProps;
    } catch {
      /* ignore */
    }
    return defaultWidescreenPromoProps;
  });
  const [status, setStatus] = useState("");
  const [currentFrame, setCurrentFrame] = useState(0);
  const [renderBusy, setRenderBusy] = useState(false);
  const playerRef = useRef<PlayerRef>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let detach: (() => void) | undefined;
    let mounted = true;

    const attach = () => {
      const player = playerRef.current;
      if (!player) return false;

      const onTime = (e: { detail: { frame: number } }) => {
        setCurrentFrame(e.detail.frame);
      };
      const onSeeked = (e: { detail: { frame: number } }) => {
        setCurrentFrame(e.detail.frame);
      };

      player.addEventListener("timeupdate", onTime);
      player.addEventListener("seeked", onSeeked);
      detach = () => {
        player.removeEventListener("timeupdate", onTime);
        player.removeEventListener("seeked", onSeeked);
      };
      return true;
    };

    if (!attach()) {
      const poll = window.setInterval(() => {
        if (!mounted) return;
        if (attach()) window.clearInterval(poll);
      }, 50);
      return () => {
        mounted = false;
        window.clearInterval(poll);
        detach?.();
      };
    }

    return () => {
      mounted = false;
      detach?.();
    };
  }, [props.timing.total]);

  const seekTo = useCallback((frame: number) => {
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  }, []);

  const saveLocal = useCallback(() => {
    localStorage.setItem("widescreen-promo-props", JSON.stringify(props));
    setStatus("Saved to browser storage");
  }, [props]);

  const downloadJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(props, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "widescreen-promo-props.json";
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Downloaded widescreen-promo-props.json");
  }, [props]);

  const copyJson = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(props, null, 2));
    setStatus("Copied JSON to clipboard");
  }, [props]);

  const saveToProject = useCallback(async () => {
    setStatus("Saving props to project…");
    try {
      const res = await fetch("/api/promo/save-props", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus(data.error ?? "Save failed");
        return;
      }
      setStatus("Saved promo-video/widescreen-promo-props.json");
    } catch {
      setStatus("Save failed — is npm run editor running?");
    }
  }, [props]);

  const renderFromEditor = useCallback(async () => {
    setRenderBusy(true);
    setStatus("Starting render (1–3 min) — keep this terminal open…");
    try {
      const res = await fetch("/api/promo/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        output?: string;
      };
      if (!res.ok || !data.ok) {
        setStatus(data.error ?? "Render failed — see terminal");
        return;
      }
      setStatus(
        data.output
          ? `Render done → ${data.output}`
          : "Render finished",
      );
    } catch {
      setStatus("Render request failed — run: npm run render:widescreen:props");
    } finally {
      setRenderBusy(false);
    }
  }, [props]);

  const onFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        setProps(JSON.parse(String(reader.result)) as WidescreenPromoProps);
        setStatus(`Loaded ${file.name}`);
      } catch {
        setStatus("Invalid JSON file");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const timeSec = (currentFrame / FPS).toFixed(2);

  return (
    <div className="editor-app">
      <header className="editor-header">
        <div>
          <h1>Widescreen promo editor</h1>
          <p className="editor-sub">
            Red playhead follows preview · click timeline to scrub · drag voice
            clips and purple cut handles
          </p>
        </div>
        <div className="editor-actions">
          <button type="button" onClick={saveLocal}>
            Save locally
          </button>
          <button type="button" onClick={saveToProject}>
            Save to project
          </button>
          <button type="button" onClick={downloadJson}>
            Download JSON
          </button>
          <button type="button" onClick={copyJson}>
            Copy JSON
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}>
            Load JSON
          </button>
          <button
            type="button"
            className="editor-btn-primary"
            disabled={renderBusy}
            onClick={() => void renderFromEditor()}
          >
            {renderBusy ? "Rendering…" : "Render MP4"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={onFileLoad}
          />
        </div>
      </header>

      {status && <p className="editor-status">{status}</p>}

      <div className="editor-legend">
        <span>
          <strong>Draggable:</strong> voice clips (move + right edge), purple
          section cuts
        </span>
        <span>
          <strong>Locked:</strong> section blocks, B-roll, music — they follow
          cuts &amp; files (moving them would desync the video)
        </span>
        <span className="editor-time">
          Playhead: <strong>{currentFrame}</strong>f ({timeSec}s)
        </span>
      </div>

      <section className="editor-preview">
        <Player
          ref={playerRef}
          component={WidescreenPromo}
          inputProps={props}
          durationInFrames={props.timing.total}
          fps={FPS}
          compositionWidth={WIDTH}
          compositionHeight={HEIGHT}
          style={{ width: "100%", maxWidth: 960 }}
          controls
          acknowledgeRemotionLicense
        />
      </section>

      <WidescreenAssetStatus props={props} />

      <section className="editor-timeline-wrap">
        <WidescreenTimelineEditor
          value={props}
          onChange={setProps}
          currentFrame={currentFrame}
          onSeek={seekTo}
        />
      </section>

      <footer className="editor-footer">
        <strong>Render MP4</strong> saves props and runs Remotion on your machine
        (needs Node). Output:{" "}
        <code>assets/levelup-promo-widescreen.mp4</code>. Or manually:{" "}
        <code>npm run render:widescreen:props</code>
      </footer>
    </div>
  );
};
