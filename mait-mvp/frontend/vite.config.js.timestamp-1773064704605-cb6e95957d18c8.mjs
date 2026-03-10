// vite.config.js
import { defineConfig } from "file:///Users/darayeet/Documents/personal%20don't%20open/ALL/MAIT/mait-mvp/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///Users/darayeet/Documents/personal%20don't%20open/ALL/MAIT/mait-mvp/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
var vite_config_default = defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    // usePolling removed — macOS uses FSEvents natively.
    // Polling causes continuous re-scans that stall dep pre-bundling.
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
      "framer-motion",
      "@react-oauth/google",
      "jwt-decode",
      "function-plot"
    ],
    esbuildOptions: {
      // Increase esbuild timeout if possible (not a direct option, but we can set target)
      target: "esnext"
    }
  },
  build: {
    chunkSizeWarningLimit: 1e3,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          icons: ["lucide-react"],
          math: ["katex", "remark-math", "rehype-katex"]
        }
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvZGFyYXllZXQvRG9jdW1lbnRzL3BlcnNvbmFsIGRvbid0IG9wZW4vQUxML01BSVQvbWFpdC1tdnAvZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9kYXJheWVldC9Eb2N1bWVudHMvcGVyc29uYWwgZG9uJ3Qgb3Blbi9BTEwvTUFJVC9tYWl0LW12cC9mcm9udGVuZC92aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvZGFyYXllZXQvRG9jdW1lbnRzL3BlcnNvbmFsJTIwZG9uJ3QlMjBvcGVuL0FMTC9NQUlUL21haXQtbXZwL2Zyb250ZW5kL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCdcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gICAgYmFzZTogJy8nLFxuICAgIHBsdWdpbnM6IFtyZWFjdCgpXSxcbiAgICBzZXJ2ZXI6IHtcbiAgICAgICAgLy8gdXNlUG9sbGluZyByZW1vdmVkIFx1MjAxNCBtYWNPUyB1c2VzIEZTRXZlbnRzIG5hdGl2ZWx5LlxuICAgICAgICAvLyBQb2xsaW5nIGNhdXNlcyBjb250aW51b3VzIHJlLXNjYW5zIHRoYXQgc3RhbGwgZGVwIHByZS1idW5kbGluZy5cbiAgICAgICAgcHJveHk6IHtcbiAgICAgICAgICAgICcvdmlzaXQnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICcvc3Vic2NyaWJlJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgICAgICAnL3F1ZXJ5JzogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgICAgICAnL2NvbnRleHQnOiAnaHR0cDovL2xvY2FsaG9zdDo4MDAwJyxcbiAgICAgICAgICAgICcvaGlzdG9yeSc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgJy9yZXNldCc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgJy9rZXlzdHJva2UtbWV0cmljcyc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgJy9rZXlzdHJva2UtcHJvZmlsZSc6ICdodHRwOi8vbG9jYWxob3N0OjgwMDAnLFxuICAgICAgICAgICAgJy9hdXRoJzogJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMCcsXG4gICAgICAgIH1cbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgICAvLyBEb24ndCBibG9jayBwYWdlIGxvYWRzIHdhaXRpbmcgZm9yIGRlcCBzY2FuIHRvIGZpbmlzaFxuICAgICAgICBob2xkVW50aWxDcmF3bEVuZDogZmFsc2UsXG4gICAgICAgIC8vIEV4Y2x1ZGUgd2ViLWxsbSBmcm9tIGVzYnVpbGQgc2Nhbm5pbmcgKGh1Z2UgV0FTTSBwYWNrYWdlIGZyZWV6ZXMgc2Nhbm5lcilcbiAgICAgICAgZXhjbHVkZTogWydAbWxjLWFpL3dlYi1sbG0nXSxcbiAgICAgICAgLy8gUHJlLWluY2x1ZGUga25vd24gZGVwcyBzbyBlc2J1aWxkIGRvZXNuJ3QgbmVlZCB0byBkaXNjb3ZlciB0aGVtXG4gICAgICAgIGluY2x1ZGU6IFtcbiAgICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgICAncmVhY3QtZG9tJyxcbiAgICAgICAgICAgICdyZWFjdC1tYXJrZG93bicsXG4gICAgICAgICAgICAncmVtYXJrLW1hdGgnLFxuICAgICAgICAgICAgJ3JlaHlwZS1rYXRleCcsXG4gICAgICAgICAgICAna2F0ZXgnLFxuICAgICAgICAgICAgJ2x1Y2lkZS1yZWFjdCcsXG4gICAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgICAndGFpbHdpbmQtbWVyZ2UnLFxuICAgICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgICAgICAgJ0ByZWFjdC1vYXV0aC9nb29nbGUnLFxuICAgICAgICAgICAgJ2p3dC1kZWNvZGUnLFxuICAgICAgICAgICAgJ2Z1bmN0aW9uLXBsb3QnLFxuICAgICAgICBdLFxuICAgICAgICBlc2J1aWxkT3B0aW9uczoge1xuICAgICAgICAgICAgLy8gSW5jcmVhc2UgZXNidWlsZCB0aW1lb3V0IGlmIHBvc3NpYmxlIChub3QgYSBkaXJlY3Qgb3B0aW9uLCBidXQgd2UgY2FuIHNldCB0YXJnZXQpXG4gICAgICAgICAgICB0YXJnZXQ6ICdlc25leHQnXG4gICAgICAgIH1cbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcbiAgICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAgICAgICAgIHZlbmRvcjogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAgICAgICAgICAgaWNvbnM6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgICAgICAgICAgICAgIG1hdGg6IFsna2F0ZXgnLCAncmVtYXJrLW1hdGgnLCAncmVoeXBlLWthdGV4J10sXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFksU0FBUyxvQkFBb0I7QUFDM2EsT0FBTyxXQUFXO0FBR2xCLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQ3hCLE1BQU07QUFBQSxFQUNOLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxFQUNqQixRQUFRO0FBQUE7QUFBQTtBQUFBLElBR0osT0FBTztBQUFBLE1BQ0gsVUFBVTtBQUFBLE1BQ1YsY0FBYztBQUFBLE1BQ2QsVUFBVTtBQUFBLE1BQ1YsWUFBWTtBQUFBLE1BQ1osWUFBWTtBQUFBLE1BQ1osVUFBVTtBQUFBLE1BQ1Ysc0JBQXNCO0FBQUEsTUFDdEIsc0JBQXNCO0FBQUEsTUFDdEIsU0FBUztBQUFBLElBQ2I7QUFBQSxFQUNKO0FBQUEsRUFDQSxjQUFjO0FBQUE7QUFBQSxJQUVWLG1CQUFtQjtBQUFBO0FBQUEsSUFFbkIsU0FBUyxDQUFDLGlCQUFpQjtBQUFBO0FBQUEsSUFFM0IsU0FBUztBQUFBLE1BQ0w7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNKO0FBQUEsSUFDQSxnQkFBZ0I7QUFBQTtBQUFBLE1BRVosUUFBUTtBQUFBLElBQ1o7QUFBQSxFQUNKO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDSCx1QkFBdUI7QUFBQSxJQUN2QixlQUFlO0FBQUEsTUFDWCxRQUFRO0FBQUEsUUFDSixjQUFjO0FBQUEsVUFDVixRQUFRLENBQUMsU0FBUyxXQUFXO0FBQUEsVUFDN0IsT0FBTyxDQUFDLGNBQWM7QUFBQSxVQUN0QixNQUFNLENBQUMsU0FBUyxlQUFlLGNBQWM7QUFBQSxRQUNqRDtBQUFBLE1BQ0o7QUFBQSxJQUNKO0FBQUEsRUFDSjtBQUNKLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
