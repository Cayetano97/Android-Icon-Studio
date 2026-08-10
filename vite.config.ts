import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig((_config) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "ic_launcher.svg"],
      manifest: {
        name: "Android Icon Studio",
        short_name: "Icon Studio",
        description:
          "Create adaptive Android icons with real-time preview and export",
        theme_color: "#3DDC84",
        background_color: "#0f1014",
        display: "standalone",
        icons: [
          {
            src: "ic_launcher.svg",
            sizes: "any",
            type: "image/svg+xml",
          },
          {
            src: "favicon-32x32.png",
            sizes: "32x32",
            type: "image/png",
          },
          {
            src: "apple-touch-icon.png",
            sizes: "180x180",
            type: "image/png",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2022",
    sourcemap: false,
    cssCodeSplit: true,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor",
              test: /node_modules[\\/](react|react-dom)[\\/]/,
            },
            {
              name: "jszip",
              test: /node_modules[\\/]jszip[\\/]/,
            },
          ],
        },
      },
    },
  },
}));
