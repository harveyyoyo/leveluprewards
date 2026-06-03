import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  PROMO_BEAT_OPTIONS,
  WIDESCREEN_CLIP_USAGE,
  canRecaptureMediaAsset,
  emptyLabel,
  getRecaptureSummary,
  normalizeLabelsFile,
  type CaptureLibraryItem,
  type CaptureLibraryLabel,
  type CaptureLibraryLabelsFile,
} from "./captureLibraryTypes";

type LibraryPayload = {
  clips: CaptureLibraryItem[];
  screenshots: CaptureLibraryItem[];
};

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    throw new Error(`${url} → ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const CaptureLibraryLabeler: React.FC = () => {
  const [items, setItems] = useState<CaptureLibraryItem[]>([]);
  const [labels, setLabels] = useState<CaptureLibraryLabelsFile>(() =>
    normalizeLabelsFile(null),
  );
  const [source, setSource] = useState<"clips" | "screenshots">("clips");
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<"all" | "unreviewed">("all");
  const [status, setStatus] = useState("Loading library…");
  const [dirty, setDirty] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [recapturing, setRecapturing] = useState(false);

  const reloadLibrary = useCallback(async () => {
    const [library, saved] = await Promise.all([
      fetchJson<LibraryPayload>("/api/capture-library/list"),
      fetchJson<CaptureLibraryLabelsFile>("/api/capture-library/labels"),
    ]);
    setItems([...library.clips, ...library.screenshots]);
    setLabels(normalizeLabelsFile(saved));
  }, []);

  const visibleItems = useMemo(() => {
    const pool =
      source === "clips"
        ? items.filter((i) => i.kind === "video")
        : items.filter((i) => i.kind === "image");
    if (filter === "unreviewed") {
      return pool.filter((i) => !labels.items[i.path]?.reviewed);
    }
    return pool;
  }, [items, source, filter, labels.items]);

  const current = visibleItems[index] ?? null;
  const currentLabel: CaptureLibraryLabel = current
    ? { ...emptyLabel(), ...labels.items[current.path] }
    : emptyLabel();

  const wiredBeat = current ? WIDESCREEN_CLIP_USAGE[current.path] : undefined;
  const recaptureSummary = current ? getRecaptureSummary(current.path) : null;
  const canRecapture = current ? canRecaptureMediaAsset(current.path) : false;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await reloadLibrary();
        if (!cancelled) {
          setStatus("Ready — label each clip so promo beats stay in sync.");
        }
      } catch (e) {
        if (!cancelled) {
          setStatus(
            e instanceof Error ? e.message : "Failed to load capture library",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadLibrary]);

  useEffect(() => {
    if (index >= visibleItems.length) {
      setIndex(Math.max(0, visibleItems.length - 1));
    }
  }, [index, visibleItems.length]);

  const patchLabel = useCallback(
    (patch: Partial<CaptureLibraryLabel>) => {
      if (!current) return;
      setLabels((prev) => ({
        ...prev,
        items: {
          ...prev.items,
          [current.path]: { ...emptyLabel(), ...prev.items[current.path], ...patch },
        },
      }));
      setDirty(true);
    },
    [current],
  );

  const saveLabels = useCallback(async () => {
    setStatus("Saving labels…");
    try {
      const payload: CaptureLibraryLabelsFile = {
        ...labels,
        updatedAt: new Date().toISOString(),
      };
      const res = await fetch("/api/capture-library/labels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus(data.error ?? "Save failed");
        return;
      }
      setLabels(payload);
      setDirty(false);
      setStatus("Saved public/marketing/media-labels.json");
    } catch {
      setStatus("Save failed — run npm run editor");
    }
  }, [labels]);

  const goPrev = useCallback(
    () => setIndex((i) => Math.max(0, i - 1)),
    [],
  );
  const goNext = useCallback(
    () => setIndex((i) => Math.min(visibleItems.length - 1, i + 1)),
    [visibleItems.length],
  );

  const markReviewedAndNext = () => {
    patchLabel({ reviewed: true });
    if (index < visibleItems.length - 1) {
      setIndex((i) => i + 1);
    }
  };

  const deleteCurrent = useCallback(async () => {
    if (!current || deleting) return;

    const wiredNote = wiredBeat
      ? "\n\nWarning: this file is wired into the widescreen promo."
      : "";
    const ok = window.confirm(
      `Delete "${current.filename}" from disk? This cannot be undone.${wiredNote}`,
    );
    if (!ok) return;

    setDeleting(true);
    setStatus(`Deleting ${current.filename}…`);
    try {
      const res = await fetch("/api/capture-library/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: current.path }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus(data.error ?? "Delete failed");
        return;
      }

      setLabels((prev) => {
        const nextItems = { ...prev.items };
        delete nextItems[current.path];
        return { ...prev, items: nextItems };
      });
      setDirty(false);
      await reloadLibrary();
      setStatus(`Deleted ${current.filename}`);
    } catch {
      setStatus("Delete failed — is npm run editor running?");
    } finally {
      setDeleting(false);
    }
  }, [current, deleting, reloadLibrary, wiredBeat]);

  const recaptureCurrent = useCallback(async () => {
    if (!current || recapturing || !canRecapture) return;

    const summary = recaptureSummary ?? current.filename;
    if (
      !window.confirm(
        `Re-capture "${current.filename}"?\n\n${summary}\n\nPlaywright will record a fresh take (about 1–3 minutes).`,
      )
    ) {
      return;
    }

    setRecapturing(true);
    setStatus(`Recapturing ${current.filename}… (1–3 min)`);
    try {
      const res = await fetch("/api/capture-library/recapture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: current.path }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus(data.error ?? "Recapture failed");
        return;
      }
      patchLabel({ reviewed: false });
      await reloadLibrary();
      setStatus(`Recaptured ${current.filename}`);
    } catch {
      setStatus("Recapture failed — is npm run editor running?");
    } finally {
      setRecapturing(false);
    }
  }, [
    canRecapture,
    current,
    patchLabel,
    recaptureSummary,
    recapturing,
    reloadLibrary,
  ]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return;
      }
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        void saveLabels();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveLabels, goPrev, goNext]);

  const reviewedCount = visibleItems.filter(
    (i) => labels.items[i.path]?.reviewed,
  ).length;

  return (
    <div className="labeler">
      <header className="labeler-header">
        <div>
          <h1>Capture library labeler</h1>
          <p className="editor-sub">
            Shared with the main app — labels save to public/marketing/media-labels.json.
            Open <strong>/developer/media-library</strong> in the app for the same tool.
          </p>
        </div>
        <div className="editor-actions">
          <button
            type="button"
            className={dirty ? "editor-btn-primary" : undefined}
            onClick={() => void saveLabels()}
          >
            {dirty ? "Save labels *" : "Save labels"}
          </button>
        </div>
      </header>

      {status && <p className="editor-status">{status}</p>}

      <div className="labeler-toolbar">
        <div className="labeler-tabs">
          <button
            type="button"
            className={source === "clips" ? "labeler-tab-active" : undefined}
            onClick={() => {
              setSource("clips");
              setIndex(0);
            }}
          >
            Promo clips (MP4)
          </button>
          <button
            type="button"
            className={source === "screenshots" ? "labeler-tab-active" : undefined}
            onClick={() => {
              setSource("screenshots");
              setIndex(0);
            }}
          >
            Marketing screenshots (PNG)
          </button>
        </div>
        <label className="labeler-filter">
          <input
            type="checkbox"
            checked={filter === "unreviewed"}
            onChange={(e) => {
              setFilter(e.target.checked ? "unreviewed" : "all");
              setIndex(0);
            }}
          />
          Unreviewed only
        </label>
        <span className="labeler-progress">
          {visibleItems.length ? index + 1 : 0} / {visibleItems.length} ·{" "}
          {reviewedCount} reviewed
        </span>
      </div>

      {!current ? (
        <p className="labeler-empty">No items in this list.</p>
      ) : (
        <div className="labeler-body">
          <div className="labeler-preview">
            {current.kind === "video" ? (
              // Native preview in dev labeler — not rendered into Remotion output.
              // eslint-disable-next-line @remotion/warn-native-media-tag
              <video
                key={current.path}
                src={`/${current.path}`}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="labeler-media"
              />
            ) : (
              // eslint-disable-next-line @remotion/warn-native-media-tag
              <img
                key={current.path}
                src={`/marketing-screenshots/${current.filename}`}
                alt={current.filename}
                className="labeler-media"
              />
            )}
            <div className="labeler-meta">
              <code>{current.path}</code>
              <span>{current.category}</span>
            </div>
          </div>

          <div className="labeler-form">
            {wiredBeat && (
              <p className="labeler-wired">
                Currently used in widescreen promo as:{" "}
                <strong>
                  {PROMO_BEAT_OPTIONS.find((o) => o.value === wiredBeat)?.label ??
                    wiredBeat}
                </strong>
              </p>
            )}

            <label className="labeler-field">
              Display name
              <input
                value={currentLabel.displayName}
                placeholder={current.filename.replace(/\.[^.]+$/, "")}
                onChange={(e) => patchLabel({ displayName: e.target.value })}
              />
            </label>

            <label className="labeler-field">
              Promo beat
              <select
                value={currentLabel.usage || "unset"}
                onChange={(e) =>
                  patchLabel({
                    usage: (e.target.value === "unset"
                      ? ""
                      : e.target.value) as CaptureLibraryLabel["usage"],
                  })
                }
              >
                {PROMO_BEAT_OPTIONS.map((o) => (
                  <option key={o.value || "empty"} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              {PROMO_BEAT_OPTIONS.find((o) => o.value === currentLabel.usage)
                ?.hint && (
                <span className="labeler-hint">
                  {
                    PROMO_BEAT_OPTIONS.find(
                      (o) => o.value === currentLabel.usage,
                    )?.hint
                  }
                </span>
              )}
            </label>

            <label className="labeler-field">
              What happens on screen?
              <textarea
                rows={3}
                value={currentLabel.description}
                placeholder="e.g. Student scans badge at kiosk, points popup appears"
                onChange={(e) => patchLabel({ description: e.target.value })}
              />
            </label>

            <label className="labeler-field">
              Notes
              <textarea
                rows={2}
                value={currentLabel.notes}
                placeholder="Wrong timing, use trim, replace capture, etc."
                onChange={(e) => patchLabel({ notes: e.target.value })}
              />
            </label>

            <label className="labeler-check">
              <input
                type="checkbox"
                checked={currentLabel.reviewed}
                onChange={(e) => patchLabel({ reviewed: e.target.checked })}
              />
              Reviewed
            </label>

            <div className="labeler-nav">
              <button type="button" onClick={goPrev} disabled={index === 0}>
                ← Previous
              </button>
              <button
                type="button"
                className="editor-btn-primary"
                onClick={markReviewedAndNext}
              >
                Mark reviewed & next →
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={index >= visibleItems.length - 1}
              >
                Next →
              </button>
            </div>

            <button
              type="button"
              className="labeler-btn-recapture"
              disabled={!canRecapture || recapturing || deleting}
              onClick={() => void recaptureCurrent()}
            >
              {recapturing ? "Recapturing…" : "↻ Redo · recapture"}
            </button>
            {recaptureSummary && (
              <p className="labeler-recapture-hint">{recaptureSummary}</p>
            )}

            <button
              type="button"
              className="labeler-btn-danger"
              disabled={deleting || recapturing}
              onClick={() => void deleteCurrent()}
            >
              {deleting ? "Deleting…" : "Delete file"}
            </button>
          </div>
        </div>
      )}

      <details className="labeler-index">
        <summary>Jump to clip ({visibleItems.length})</summary>
        <ul>
          {visibleItems.map((item, i) => {
            const label = labels.items[item.path];
            const beat = label?.usage
              ? PROMO_BEAT_OPTIONS.find((o) => o.value === label.usage)?.label
              : null;
            return (
              <li key={item.path}>
                <button
                  type="button"
                  className={i === index ? "labeler-jump-active" : undefined}
                  onClick={() => setIndex(i)}
                >
                  {label?.reviewed ? "✓ " : "○ "}
                  {item.filename}
                  {beat ? ` · ${beat}` : ""}
                </button>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
};
