import { defineConfig } from "vite";
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [
    {
      name: "pdf-resources",
      apply: "build",
      closeBundle() {
        for (const folder of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
          mkdirSync(fileURLToPath(new URL("./dist/pdf/", import.meta.url)), {
            recursive: true,
          });
          cpSync(
            fileURLToPath(
              new URL("./node_modules/pdfjs-dist/" + folder, import.meta.url),
            ),
            fileURLToPath(new URL("./dist/pdf/" + folder, import.meta.url)),
            { recursive: true },
          );
        }
      },
    },
  ],
  server: {
    proxy: {
      "/api": { target: "http://127.0.0.1:8787", ws: true, changeOrigin: true },
    },
  },
  build: { chunkSizeWarningLimit: 1000 },
});
