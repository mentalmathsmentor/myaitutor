/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'system-ui', 'sans-serif'],
                display: ['JetBrains Mono', 'monospace'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                surface: {
                    1: "hsl(var(--surface-1))",
                    2: "hsl(var(--surface-2))",
                    3: "hsl(var(--surface-3))",
                },
            },
            borderRadius: {
                xl: "calc(var(--radius) + 4px)",
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                xs: "calc(var(--radius) - 6px)",
            },
            animation: {
                'glitch': 'glitch 3s ease-in-out infinite',
                'reveal': 'reveal-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
                'float': 'float 4s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
                'shimmer': 'shimmer 2s linear infinite',
                'accordion-down': "accordion-down 0.2s ease-out",
                'accordion-up': "accordion-up 0.2s ease-out",
            },
            keyframes: {
                glitch: {
                    '0%, 90%, 100%': {
                        transform: 'translate(0)',
                        textShadow: 'none',
                    },
                    '92%': {
                        transform: 'translate(-2px, 1px)',
                        textShadow: '2px 0 hsl(var(--accent)), -2px 0 hsl(var(--primary))',
                    },
                    '94%': {
                        transform: 'translate(2px, -1px)',
                        textShadow: '-2px 0 hsl(var(--accent)), 2px 0 hsl(var(--primary))',
                    },
                    '96%': {
                        transform: 'translate(-1px, 2px)',
                        textShadow: '1px 0 hsl(var(--accent)), -1px 0 hsl(var(--primary))',
                    },
                },
                'reveal-up': {
                    '0%': {
                        opacity: '0',
                        transform: 'translateY(20px)',
                    },
                    '100%': {
                        opacity: '1',
                        transform: 'translateY(0)',
                    },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                'pulse-glow': {
                    '0%, 100%': {
                        boxShadow: '0 0 20px -5px hsla(var(--glow-primary), 0.4)',
                    },
                    '50%': {
                        boxShadow: '0 0 30px -5px hsla(var(--glow-primary), 0.6)',
                    },
                },
                shimmer: {
                    '0%': { backgroundPosition: '-200% 0' },
                    '100%': { backgroundPosition: '200% 0' },
                },
                "accordion-down": {
                    from: { height: "0" },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: "0" },
                },
            },
            boxShadow: {
                'glow-sm': '0 0 10px -3px hsla(var(--primary), 0.3)',
                'glow': '0 0 20px -5px hsla(var(--primary), 0.4)',
                'glow-lg': '0 0 40px -10px hsla(var(--primary), 0.5)',
                'glow-accent': '0 0 20px -5px hsla(var(--accent), 0.4)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
