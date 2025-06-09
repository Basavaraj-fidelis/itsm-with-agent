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
      hmr: {
        port: 5174,
        host: "0.0.0.0",
      },
      // ADD THIS SECTION:
      allowedHosts: [
        // This is the specific host Replit is using.
        // You might need to adjust this if the host changes frequently.
        "https://ae93378f-52bc-4ac2-8812-296dee9c7a0b-00-360pjqqna7hqg.sisko.replit.dev/",
        ".replit.dev", // A more generic wildcard for Replit domains
      ],
    },
  };
});
