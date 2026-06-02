import React, { useState } from "react";
import { CaptureLibraryLabeler } from "./CaptureLibraryLabeler";
import { WidescreenEditorApp } from "./WidescreenEditorApp";

type Tab = "timeline" | "labeler";

export const PromoEditorShell: React.FC = () => {
  const [tab, setTab] = useState<Tab>("labeler");

  return (
    <div className="editor-shell">
      <nav className="editor-shell-tabs">
        <button
          type="button"
          className={tab === "timeline" ? "editor-shell-tab-active" : undefined}
          onClick={() => setTab("timeline")}
        >
          Timeline editor
        </button>
        <button
          type="button"
          className={tab === "labeler" ? "editor-shell-tab-active" : undefined}
          onClick={() => setTab("labeler")}
        >
          Label clips & screenshots
        </button>
      </nav>
      {tab === "timeline" ? <WidescreenEditorApp /> : <CaptureLibraryLabeler />}
    </div>
  );
};
