// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

// Windows path normalization wrapper for mcpPlugin to resolve OS backslash mismatch
function safeMcpPlugin(): Plugin {
  const plugin = mcpPlugin();
  return {
    ...plugin,
    configResolved(this: unknown, config: ResolvedConfig) {
      const normalizedConfig = {
        ...config,
        root: path.resolve(config.root),
      };
      if (typeof plugin.configResolved === "function") {
        return (
          plugin.configResolved as (this: unknown, config: ResolvedConfig) => void | Promise<void>
        ).call(this, normalizedConfig);
      }
      if (plugin.configResolved && "handler" in plugin.configResolved) {
        return (
          plugin.configResolved as {
            handler: (this: unknown, config: ResolvedConfig) => void | Promise<void>;
          }
        ).handler.call(this, normalizedConfig);
      }
    },
  };
}

export default defineConfig({
  vite: {
    server: {
      port: 5656,
    },
  },
  plugins: [
    safeMcpPlugin(),
    VitePWA({
      // Registrácia prebieha výhradne cez src/lib/pwa.ts (nikdy v náhľade a vývoji).
      injectRegister: null,
      registerType: "autoUpdate",
      devOptions: { enabled: false },
      filename: "sw.js",
      outDir: "dist/client",
      manifest: {
        id: "/",
        name: "Forendo — analýza finančných tokov",
        short_name: "Forendo",
        description:
          "Premeňte transakcie na prehľad finančných tokov, vysvetliteľné nálezy a správu so zdrojmi.",
        lang: "sk",
        scope: "/",
        start_url: "/prehlad",
        display: "standalone",
        background_color: "#f5f5f7",
        theme_color: "#f5f5f7",
        icons: [
          { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // Cachujú sa výhradne verejné statické súbory zostavenia.
        globPatterns: ["**/*.{js,css,woff2}", "offline.html", "pwa-*.png", "favicon.png"],
        globIgnores: ["**/node_modules/**", "**/_server/**"],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        runtimeCaching: [
          {
            // Prihlásené HTML, API, podpísané URL ani AI komunikácia sa necachujú.
            urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
            handler: "NetworkOnly",
            options: { precacheFallback: { fallbackURL: "/offline.html" } },
          },
        ],
      },
    }),
  ],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
