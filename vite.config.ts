import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// `base` must match the GitHub Pages sub-path (repo name) so assets resolve.
// Override with an env var if the repo is renamed: BASE_PATH=/other/ npm run build
export default defineConfig({
  base: process.env.BASE_PATH ?? "/map-style-editor/",
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { maplibre: ["maplibre-gl"] },
      },
    },
  },
});
