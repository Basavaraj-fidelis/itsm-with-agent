import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

export default defineConfig(async () => {
  const plugins = [react(), runtimeErrorOverlay()];

  if (
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
  ) {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    plugins.push(cartographer());
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
        "@assets": path.resolve(import.meta.dirname, "attached_assets"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: true,
      hmr: false, // Disable HMR completely
      ws: false, // Disable WebSocket server
      allowedHosts: [
        /\.replit\.dev$/,
        /\.sisko\.replit\.dev$/,
        "d328ae5e-de46-4524-add8-24afc22f3ea5-00-1z1k6y5zt0tjc.pike.replit.dev",
      ],
      proxy: {
        "/api": {
          target: "http://0.0.0.0:5000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
