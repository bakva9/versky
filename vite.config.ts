import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-dict-raw",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && /^\/dict\/.+\.gz$/.test(req.url)) {
            const filePath = path.join(process.cwd(), "public", req.url);
            if (fs.existsSync(filePath)) {
              const buffer = fs.readFileSync(filePath);
              res.setHeader("Content-Type", "application/octet-stream");
              res.setHeader("Content-Length", buffer.length.toString());
              res.setHeader("Cache-Control", "public, max-age=3600");
              res.end(buffer);
              return;
            }
          }
          next();
        });
      },
    },
  ],
  resolve: {
    alias: {
      path: "path-browserify",
    },
  },
  server: {
    port: 1420,
    strictPort: true,
  },
});
