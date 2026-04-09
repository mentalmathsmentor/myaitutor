import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/',
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        },
    },
    plugins: [react()],
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
            '/canvas': 'http://localhost:8000',
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
            'lucide-react',
            'clsx',
            'tailwind-merge',
            'framer-motion',
        ],
        esbuildOptions: {
            target: 'esnext'
        }
    }
})
