import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        watch: {
            usePolling: true,
        },
        proxy: {
            '/visit': 'http://localhost:8000',
            '/subscribe': 'http://localhost:8000',
            '/query': 'http://localhost:8000',
            '/context': 'http://localhost:8000',
            '/history': 'http://localhost:8000',
            '/reset': 'http://localhost:8000',
            '/keystroke-metrics': 'http://localhost:8000',
            '/keystroke-profile': 'http://localhost:8000',
            '/auth': 'http://localhost:8000',
        }
    },
    optimizeDeps: {
        // Don't block page loads waiting for dep scan to finish
        holdUntilCrawlEnd: false,
        // Exclude huge WASM packages that esbuild can't handle if necessary
        exclude: [],
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
            '@mlc-ai/web-llm',
        ],
        esbuildOptions: {
            target: 'esnext'
        }
    }
})
