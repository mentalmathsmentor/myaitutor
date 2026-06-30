import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import fs from 'fs'
import path from 'path'

function caseInsensitivePDFs() {
    return {
        name: 'case-insensitive-pdfs',
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                if (req.url) {
                    const urlLower = req.url.toLowerCase();
                    if (urlLower.endsWith('isnsw_example_secondary.pdf') && req.url !== '/ISNSW_Example_SECONDARY.pdf') {
                        req.url = '/ISNSW_Example_SECONDARY.pdf';
                    } else if (urlLower.endsWith('isnsw_example.pdf') && req.url !== '/ISNSW_Example.pdf') {
                        req.url = '/ISNSW_Example.pdf';
                    }
                }
                next();
            });
        },
        closeBundle() {
            const distDir = path.resolve(process.cwd(), 'dist');
            if (fs.existsSync(distDir)) {
                const sec = path.join(distDir, 'ISNSW_Example_SECONDARY.pdf');
                if (fs.existsSync(sec)) {
                    fs.copyFileSync(sec, path.join(distDir, 'isnsw_example_secondary.pdf'));
                    fs.copyFileSync(sec, path.join(distDir, 'ISNSW_Example_Secondary.pdf'));
                }
                const prim = path.join(distDir, 'ISNSW_Example.pdf');
                if (fs.existsSync(prim)) {
                    fs.copyFileSync(prim, path.join(distDir, 'isnsw_example.pdf'));
                }
            }
        }
    };
}

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
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
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
    plugins: [react(), caseInsensitivePDFs()],
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
            '/api': 'http://localhost:8000',
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
