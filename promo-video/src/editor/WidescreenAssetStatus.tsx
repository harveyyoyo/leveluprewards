import React, { useEffect, useState } from "react";
import type { WidescreenPromoProps } from "../promo/widescreenPromoSchema";
import { getWidescreenAssetManifest } from "./widescreenTimelineModel";

type AssetState = {
  path: string;
  kind: string;
  ok: boolean | "checking";
};

export const WidescreenAssetStatus: React.FC<{
  props: WidescreenPromoProps;
}> = ({ props }) => {
  const [assets, setAssets] = useState<AssetState[]>([]);

  useEffect(() => {
    const manifest = getWidescreenAssetManifest(props);
    setAssets(
      manifest.map((a) => ({ path: a.path, kind: a.kind, ok: "checking" })),
    );

    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        manifest.map(async (a) => {
          try {
            const res = await fetch(`/${a.path}`, { method: "HEAD" });
            return { ...a, ok: res.ok };
          } catch {
            return { ...a, ok: false };
          }
        }),
      );
      if (!cancelled) setAssets(results);
    })();

    return () => {
      cancelled = true;
    };
  }, [props]);

  const missing = assets.filter((a) => a.ok === false);
  const checking = assets.some((a) => a.ok === "checking");

  return (
    <section className="editor-assets">
      <h2 className="editor-assets-title">Assets in this promo</h2>
      <p className="editor-assets-hint">
        Music, walkthrough MP4s, and voice files from{" "}
        <code>promo-video/public/</code>. If any show missing, restart the editor
        after <code>npm run editor</code> (serves public folder).
      </p>
      <ul className="editor-assets-list">
        {assets.map((a) => (
          <li key={a.path} className={a.ok === false ? "asset-missing" : ""}>
            <span className="asset-dot" data-ok={String(a.ok)} />
            <span className="asset-kind">{a.kind}</span>
            <code>{a.path}</code>
          </li>
        ))}
      </ul>
      {!checking && missing.length > 0 && (
        <p className="editor-assets-warn">
          {missing.length} file(s) missing — preview may be silent or show black
          video for those segments. Run{" "}
          <code>npm run generate:voiceover</code> from repo root for voice MP3s.
        </p>
      )}
    </section>
  );
};
