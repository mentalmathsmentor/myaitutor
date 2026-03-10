// vite.config.js
import { defineConfig } from "file:///Users/darayeet/Documents/personal%20don't%20open/ALL/MAIT/mait-mvp/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/darayeet/Documents/personal%20don't%20open/ALL/MAIT/mait-mvp/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    watch: {
      usePolling: true
    },
    proxy: {
      "/visit": "http://localhost:8000",
      "/subscribe": "http://localhost:8000",
      "/query": "http://localhost:8000",
      "/context": "http://localhost:8000",
      "/history": "http://localhost:8000",
      "/reset": "http://localhost:8000",
      "/keystroke-metrics": "http://localhost:8000",
      "/keystroke-profile": "http://localhost:8000",
      "/auth": "http://localhost:8000"
    }
  },
  optimizeDeps: {
    // Don't block page loads waiting for dep scan to finish
    holdUntilCrawlEnd: false,
    // Exclude huge WASM packages that esbuild can't handle if necessary
    exclude: [],
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
      "framer-motion",
      "@mlc-ai/web-llm"
    ],
    esbuildOptions: {
      target: "esnext"
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGFyYXllZXQvRG9jdW1lbnRzL3BlcnNvbmFsIGRvbid0IG9wZW4vQUxML01BSVQvbWFpdC1tdnAvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kYXJheWVldC9Eb2N1bWVudHMvcGVyc29uYWwgZG9uJ3Qgb3Blbi9BTEwvTUFJVC9tYWl0LW12cC9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGFyYXllZXQvRG9jdW1lbnRzL3BlcnNvbmFsJTIwZG9uJ3QlMjBvcGVuL0FMTC9NQUlUL21haXQtbXZwL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgYmFzZTogJy8nLFxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgd2F0Y2g6IHtcbiAgICAgICAgICAgIHVzZVBvbGxpbmc6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICAgIHByb3h5OiB7XG4gICAgICAgICAgICAnL3Zpc2l0JzogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgICAgICAnL3N1YnNjcmliZSc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgJy9xdWVyeSc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgJy9jb250ZXh0JzogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgICAgICAnL2hpc3RvcnknOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICcvcmVzZXQnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICcva2V5c3Ryb2tlLW1ldHJpY3MnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICcva2V5c3Ryb2tlLXByb2ZpbGUnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICcvYXV0aCc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICB9XG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgICAgLy8gRG9uJ3QgYmxvY2sgcGFnZSBsb2FkcyB3YWl0aW5nIGZvciBkZXAgc2NhbiB0byBmaW5pc2hcbiAgICAgICAgaG9sZFVudGlsQ3Jhd2xFbmQ6IGZhbHNlLFxuICAgICAgICAvLyBFeGNsdWRlIGh1Z2UgV0FTTSBwYWNrYWdlcyB0aGF0IGVzYnVpbGQgY2FuJ3QgaGFuZGxlIGlmIG5lY2Vzc2FyeVxuICAgICAgICBleGNsdWRlOiBbXSxcbiAgICAgICAgLy8gUHJlLWluY2x1ZGUga25vd24gZGVwcyBzbyBlc2J1aWxkIGRvZXNuJ3QgbmVlZCB0byBkaXNjb3ZlciB0aGVtXG4gICAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgICAgICdyZWFjdC1tYXJrZG93bicsXG4gICAgICAgICAgICAncmVtYXJrLW1hdGgnLFxuICAgICAgICAgICAgJ3JlaHlwZS1rYXRleCcsXG4gICAgICAgICAgICAna2F0ZXgnLFxuICAgICAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXG4gICAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgICAndGFpbHdpbmQtbWVyZ2UnLFxuICAgICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgICAgICAgJ0BtbGMtYWkvd2ViLWxsbScsXG4gICAgICAgIF0sXG4gICAgICAgIGVzYnVpbGRPcHRpb25zOiB7XG4gICAgICAgICAgICB0YXJnZXQ6ICdlc25leHQnXG4gICAgICAgIH1cbiAgICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE4WSxTQUFTLG9CQUFvQjtBQUMzYSxPQUFPLFdBQVc7QUFHbEIsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDeEIsTUFBTTtBQUFBLEVBQ04sU0FBUyxDQUFDLE1BQU0sQ0FBQztBQUFBLEVBQ2pCLFFBQVE7QUFBQSxJQUNKLE9BQU87QUFBQSxNQUNILFlBQVk7QUFBQSxJQUNoQjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0gsVUFBVTtBQUFBLE1BQ1YsY0FBYztBQUFBLE1BQ2QsVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osVUFBVTtBQUFBLE1BQ1Ysc0JBQXNCO0FBQUEsTUFDdEIsc0JBQXNCO0FBQUEsTUFDdEIsU0FBUztBQUFBLElBQ2I7QUFBQSxFQUNKO0FBQUEsRUFDQSxjQUFjO0FBQUE7QUFBQSxJQUVWLG1CQUFtQjtBQUFBO0FBQUEsSUFFbkIsU0FBUyxDQUFDO0FBQUE7QUFBQSxJQUVWLFNBQVM7QUFBQSxNQUNMO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLElBQ0o7QUFBQSxJQUNBLGdCQUFnQjtBQUFBLE1BQ1osUUFBUTtBQUFBLElBQ1o7QUFBQSxFQUNKO0FBQ0osQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
