import React from "react";
import { createRoot } from "react-dom/client";
import { WidescreenEditorApp } from "../src/editor/WidescreenEditorApp";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <React.StrictMode>
    <WidescreenEditorApp />
  </React.StrictMode>,
);
