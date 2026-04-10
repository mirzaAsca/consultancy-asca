import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        howWeWork: resolve(__dirname, "how-it-works/index.html"),
        roi: resolve(__dirname, "roi/index.html"),
        portfolioRealityScan: resolve(
          __dirname,
          "portfolio-reality-scan/index.html",
        ),
        operationalDiagnostic: resolve(
          __dirname,
          "operational-diagnostic/index.html",
        ),
        readinessDiagnostic: resolve(
          __dirname,
          "readiness-diagnostic/index.html",
        ),
      },
    },
  },
});
