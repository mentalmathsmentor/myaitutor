import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        watch: {
            usePolling: true,
        }
    },
    optimizeDeps: {
        // Don't block page loads waiting for dep scan to finish
        holdUntilCrawlEnd: false,
        // Exclude web-llm from esbuild scanning (huge WASM package freezes scanner)
        exclude: ['@mlc-ai/web-llm'],
        // Pre-include known deps so esbuild doesn't need to discover them
        include: [
            'react',
            'react-dom',
            'react-markdown',
            'remark-math',
            'rehype-katex',
            'katex',
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'framer-motion',
        ]
    }
})
