import React from "react";
import { createRoot } from "react-dom/client";
import { PromoEditorShell } from "../src/editor/PromoEditorShell";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <React.StrictMode>
    <PromoEditorShell />
  </React.StrictMode>,
);
