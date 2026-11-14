import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) {
            return "vendor-three";
          }
          if (id.includes("node_modules/globe.gl")) {
            return "vendor-globe";
          }
          if (id.includes("node_modules/leaflet")) {
            return "vendor-leaflet";
          }
          if (id.includes("node_modules/world-atlas") || id.includes("node_modules/topojson-client")) {
            return "vendor-atlas";
          }
        },
      },
    },
  },
});
