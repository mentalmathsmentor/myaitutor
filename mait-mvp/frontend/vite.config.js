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
    build: {
        chunkSizeWarningLimit: 6500, // Account for massive ML models
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom'],
                    'math-vendor': ['mathjs', 'katex', 'react-markdown', 'rehype-katex', 'remark-math'],
                    'ui-vendor': ['framer-motion', 'lucide-react', 'cmdk', 'sonner'],
                    'radix-vendor': [
                        '@radix-ui/react-dialog', 
                        '@radix-ui/react-popover', 
                        '@radix-ui/react-select', 
                        '@radix-ui/react-accordion',
                        '@radix-ui/react-tabs'
                    ],
                    'ai-vendor': ['@mlc-ai/web-llm']
                }
            }
        }
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
