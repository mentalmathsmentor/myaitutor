// vite.config.js
import { defineConfig } from "file:///Users/darayeet/Documents/personal%20don't%20open/ALL/MAIT/mait-mvp/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/darayeet/Documents/personal%20don't%20open/ALL/MAIT/mait-mvp/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    watch: {
      usePolling: true
    }
  },
  optimizeDeps: {
    // Don't block page loads waiting for dep scan to finish
    holdUntilCrawlEnd: false,
    // Exclude web-llm from esbuild scanning (huge WASM package freezes scanner)
    exclude: ["@mlc-ai/web-llm"],
    // Pre-include known deps so esbuild doesn't need to discover them
    include: [
      "react",
      "react-dom",
      "react-markdown",
      "remark-math",
      "rehype-katex",
      "katex",
      "lucide-react",
      "clsx",
      "tailwind-merge",
      "framer-motion"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGFyYXllZXQvRG9jdW1lbnRzL3BlcnNvbmFsIGRvbid0IG9wZW4vQUxML01BSVQvbWFpdC1tdnAvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kYXJheWVldC9Eb2N1bWVudHMvcGVyc29uYWwgZG9uJ3Qgb3Blbi9BTEwvTUFJVC9tYWl0LW12cC9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGFyYXllZXQvRG9jdW1lbnRzL3BlcnNvbmFsJTIwZG9uJ3QlMjBvcGVuL0FMTC9NQUlUL21haXQtbXZwL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgYmFzZTogJy8nLFxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgd2F0Y2g6IHtcbiAgICAgICAgICAgIHVzZVBvbGxpbmc6IHRydWUsXG4gICAgICAgIH1cbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICAvLyBEb24ndCBibG9jayBwYWdlIGxvYWRzIHdhaXRpbmcgZm9yIGRlcCBzY2FuIHRvIGZpbmlzaFxuICAgICAgICBob2xkVW50aWxDcmF3bEVuZDogZmFsc2UsXG4gICAgICAgIC8vIEV4Y2x1ZGUgd2ViLWxsbSBmcm9tIGVzYnVpbGQgc2Nhbm5pbmcgKGh1Z2UgV0FTTSBwYWNrYWdlIGZyZWV6ZXMgc2Nhbm5lcilcbiAgICAgICAgZXhjbHVkZTogWydAbWxjLWFpL3dlYi1sbG0nXSxcbiAgICAgICAgLy8gUHJlLWluY2x1ZGUga25vd24gZGVwcyBzbyBlc2J1aWxkIGRvZXNuJ3QgbmVlZCB0byBkaXNjb3ZlciB0aGVtXG4gICAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgICAgICdyZWFjdC1tYXJrZG93bicsXG4gICAgICAgICAgICAncmVtYXJrLW1hdGgnLFxuICAgICAgICAgICAgJ3JlaHlwZS1rYXRleCcsXG4gICAgICAgICAgICAna2F0ZXgnLFxuICAgICAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXG4gICAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgICAndGFpbHdpbmQtbWVyZ2UnLFxuICAgICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgICBdXG4gICAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFksU0FBUyxvQkFBb0I7QUFDM2EsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLE1BQU07QUFBQSxFQUNOLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUEsSUFDSixPQUFPO0FBQUEsTUFDSCxZQUFZO0FBQUEsSUFDaEI7QUFBQSxFQUNKO0FBQUEsRUFDQSxjQUFjO0FBQUE7QUFBQSxJQUVWLG1CQUFtQjtBQUFBO0FBQUEsSUFFbkIsU0FBUyxDQUFDLGlCQUFpQjtBQUFBO0FBQUEsSUFFM0IsU0FBUztBQUFBLE1BQ0w7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
