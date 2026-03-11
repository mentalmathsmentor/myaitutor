/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
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
                // Kimi MAIT color namespace
                mait: {
                    cosmic: "hsl(265 85% 60%)",
                    cyan: "hsl(180 85% 55%)",
                    violet: "hsl(270 100% 65%)",
                    space: "hsl(230 25% 5%)",
                    starlight: "hsl(0 0% 98%)",
                    nebula: "hsl(280 60% 25%)",
                    aurora: "hsl(170 80% 45%)",
                    solar: "hsl(45 100% 55%)",
                    mars: "hsl(15 85% 55%)",
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
                'shake': 'shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both',
                'cosmic-shift': 'cosmic-shift 20s ease-in-out infinite',
                'gradient-shift': 'gradient-shift 3s linear infinite',
                'float-orb': 'float-orb 15s ease-in-out infinite',
                'slide-up': 'slide-up 0.6s ease-out forwards',
                'scale-in': 'scale-in 0.5s ease-out forwards',
                'typing-cursor': 'typing-cursor 1s step-end infinite',
                'processing-pulse': 'processing-pulse 1.5s ease-in-out infinite',
            },
            keyframes: {
                glitch: {
                    '0%, 90%, 100%': { transform: 'translate(0)', textShadow: 'none' },
                    '92%': { transform: 'translate(-2px, 1px)', textShadow: '2px 0 hsl(var(--accent)), -2px 0 hsl(var(--primary))' },
                    '94%': { transform: 'translate(2px, -1px)', textShadow: '-2px 0 hsl(var(--accent)), 2px 0 hsl(var(--primary))' },
                    '96%': { transform: 'translate(-1px, 2px)', textShadow: '1px 0 hsl(var(--accent)), -1px 0 hsl(var(--primary))' },
                },
                'reveal-up': {
                    '0%': { opacity: '0', transform: 'translateY(20px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { boxShadow: '0 0 20px -5px hsla(var(--glow-primary), 0.4)' },
                    '50%': { boxShadow: '0 0 30px -5px hsla(var(--glow-primary), 0.6)' },
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
                shake: {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' },
                },
                'cosmic-shift': {
                    '0%, 100%': { backgroundPosition: '0% 50%' },
                    '50%': { backgroundPosition: '100% 50%' },
                },
                'gradient-shift': {
                    '0%': { backgroundPosition: '0% center' },
                    '100%': { backgroundPosition: '200% center' },
                },
                'float-orb': {
                    '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
                    '25%': { transform: 'translate(30px, -30px) scale(1.1)' },
                    '50%': { transform: 'translate(-20px, 20px) scale(0.9)' },
                    '75%': { transform: 'translate(20px, 10px) scale(1.05)' },
                },
                'slide-up': {
                    from: { opacity: '0', transform: 'translateY(30px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
                'scale-in': {
                    from: { opacity: '0', transform: 'scale(0.9)' },
                    to: { opacity: '1', transform: 'scale(1)' },
                },
                'typing-cursor': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0' },
                },
                'processing-pulse': {
                    '0%, 100%': { opacity: '0.4' },
                    '50%': { opacity: '1' },
                },
            },
            boxShadow: {
                'glow-sm': '0 0 10px -3px hsla(var(--primary), 0.3)',
                'glow': '0 0 20px -5px hsla(var(--primary), 0.4)',
                'glow-lg': '0 0 40px -10px hsla(var(--primary), 0.5)',
                'glow-accent': '0 0 20px -5px hsla(var(--accent), 0.4)',
                'neon-purple': '0 0 20px hsl(265 85% 60% / 0.4), 0 0 40px hsl(265 85% 60% / 0.2)',
                'neon-cyan': '0 0 20px hsl(180 85% 55% / 0.4), 0 0 40px hsl(180 85% 55% / 0.2)',
                'cosmic': '0 8px 32px -4px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
                'cosmic-lg': '0 20px 60px -10px rgba(0, 0, 0, 0.6), 0 0 40px hsl(265 85% 60% / 0.15)',
            },
            backgroundImage: {
                'cosmic-gradient': 'radial-gradient(ellipse at 20% 20%, hsl(265 85% 60% / 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, hsl(180 85% 55% / 0.1) 0%, transparent 50%), hsl(230 25% 5%)',
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
}
