import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { promoEditorApiPlugin } from "./promo-editor-api.plugin";

export default defineConfig({
  plugins: [react(), promoEditorApiPlugin()],
  root: path.join(__dirname),
  /** Same files Remotion uses via staticFile() — voice, music, walkthrough MP4s */
  publicDir: path.resolve(__dirname, "../public"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../src"),
    },
  },
  server: {
    port: 3340,
    open: true,
  },
});
