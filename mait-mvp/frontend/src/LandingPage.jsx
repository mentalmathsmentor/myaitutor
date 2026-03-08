import { useState, useEffect, useRef } from 'react'
import { BrainCircuit, Battery, Moon, ArrowRight, Lock, Sparkles, Play, GraduationCap, BookOpen, Lightbulb, MessageCircle, FileText, Check, ClipboardList } from 'lucide-react'

const SYLLABI = [
    { label: 'Standard', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-standard-11-12-2024/overview', color: 'text-cyan-400', className: 'course-card-standard' },
    { label: 'Advanced', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-advanced-11-12-2024/overview', color: 'text-primary', className: 'course-card-advanced' },
    { label: 'Extension 1', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-extension-1-11-12-2024/overview', color: 'text-orange-400', className: 'course-card-extension-1' },
    { label: 'Extension 2', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-extension-2-12/overview', color: 'text-purple-400', className: 'course-card-extension-2' },
]

// Math symbols for floating particles
const MATH_SYMBOLS = [
    // Core Symbols
    'π', '∑', '√', '∫', '∞', '≈', '≠', '≤', '≥', '÷', '×', '±', '∆', 'θ', 'λ', '∇', '∂', '∴', 'α', 'β', 'γ', 'φ', 'ω', 'ε', 'μ', 'σ',
    // Standard & Advanced — Algebra & Functions
    'ax²+bx+c=0', 'x=(-b±√∆)/2a', 'y-y₁=m(x-x₁)', 'a²+b²=c²', 'logₐx', '|x|',
    'f(g(x))', 'f⁻¹(x)', 'Σxᵢ/n', 'A=½bh', 'V=⅓πr²h',
    // Standard — Financial & Statistics
    'FV=PV(1+r)ⁿ', 'z=(x-μ)/σ', 'A=P(1+r/n)ⁿᵗ', 'σ²', 'x̄',
    // Advanced — Calculus
    'd/dx', 'dy/dx', 'f\'(x)', 'f\'\'(x)', '∫eˣdx=eˣ', '∫xⁿdx', 'lim x→∞',
    'd/dx(sin x)=cos x', 'd/dx(eˣ)=eˣ', 'd/dx(ln x)=1/x', '∫₀¹ f(x)dx',
    'A=∫ₐᵇ f(x)dx', 'dy/dx=dy/du·du/dx',
    // Advanced — Trigonometry
    'sin²θ+cos²θ=1', 'tan θ=sin θ/cos θ', 'sin(A±B)', 'cos 2θ=2cos²θ−1',
    'a/sin A=b/sin B', 'c²=a²+b²−2ab cos C',
    // Advanced — Probability
    'ⁿCᵣ', 'ⁿPᵣ', 'P(A∪B)', 'P(A|B)', 'E(X)=Σxᵢpᵢ', 'Var(X)',
    // Extension 1 — Inverse Trig & Induction
    'sin⁻¹x', 'cos⁻¹x', 'tan⁻¹x', '∫dx/√(1−x²)', 'n! ', 'P(n)→P(n+1)',
    'x=a cos θ', 'v²=u²+2as', 'ẍ=−n²x',
    // Extension 1 — Vectors
    'a·b=|a||b|cosθ', '|a×b|', 'r=a+tb',
    // Extension 2 — Complex Numbers
    'z=a+bi', '|z|=√(a²+b²)', 'z=r·cis θ', 'zⁿ=rⁿcis(nθ)', 'z̄', 'Re(z)', 'Im(z)',
    'e^(iθ)=cosθ+isinθ',
    // Extension 2 — Mechanics & Integration
    '∫sec²x dx', '∫dx/(a²+x²)', '∮', 'ẍ=F/m', 'T=2π/ω',
    // Physics
    'F=ma', 'E=mc²', 'v=fλ', 'W=Fd', 'p=mv', 'KE=½mv²',
    'V=IR', 'P=IV', 'F=kQq/r²', 'Φ=BA',
    // Engineering Studies
    'σ=F/A', 'τ=Tr/J', 'ε=∆L/L', 'η=Pout/Pin'
]

function MathParticles() {
    const [particles, setParticles] = useState([])

    useEffect(() => {
        const newParticles = Array.from({ length: 15 }, (_, i) => ({
            id: i,
            symbol: MATH_SYMBOLS[Math.floor(Math.random() * MATH_SYMBOLS.length)],
            left: `${Math.random() * 100}%`,
            delay: `-${Math.random() * 20}s`,
            duration: `${12 + Math.random() * 8}s`,
            size: `${0.8 + Math.random() * 0.6}rem`,
        }))
        setParticles(newParticles)
    }, [])

    return (
        <div className="math-particles">
            {particles.map((p) => (
                <span
                    key={p.id}
                    className="math-particle"
                    style={{
                        left: p.left,
                        animationDelay: p.delay,
                        animationDuration: p.duration,
                        fontSize: p.size,
                    }}
                >
                    {p.symbol}
                </span>
            ))}
        </div>
    )
}

function ScrollReveal({ children, delay = 0, className = '' }) {
    const [isVisible, setIsVisible] = useState(false)
    const ref = useRef(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setTimeout(() => setIsVisible(true), delay)
                    observer.disconnect()
                }
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        )

        if (ref.current) {
            observer.observe(ref.current)
        }

        return () => observer.disconnect()
    }, [delay])

    return (
        <div
            ref={ref}
            className={`${className} transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
            style={{ transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)' }}
        >
            {children}
        </div>
    )
}

export default function LandingPage({ navigate, onLoginClick }) {
    const [visitCount, setVisitCount] = useState(null)

    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL ||
            (window.location.hostname === 'myaitutor.au' || window.location.hostname === 'www.myaitutor.au'
                ? 'https://api.myaitutor.au'
                : 'http://localhost:8000')
        fetch(`${API_URL}/visit`, { method: 'POST' })
            .then(r => r.json())
            .then(d => setVisitCount(d.count))
            .catch(() => { })
    }, [])

    return (
        <div className="min-h-screen pt-14 bg-cosmic noise-overlay flex flex-col selection:bg-primary/30">
            {/* Floating Orbs Background */}
            <div className="orb-container">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
            </div>

            {/* Math Particles */}
            <MathParticles />

            {/* Decorative grid overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Hero */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-8 pb-16 min-h-[70vh]">
                {/* Hero Text Backdrop Blur for Readability */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-[140%] bg-cosmic/80 blur-[120px] rounded-[100%] pointer-events-none z-0" />

                <div className="tag animate-reveal animate-reveal-2 animate-float mb-8 relative">
                    <Sparkles size={12} className="animate-sparkle" />
                    COMING 2026
                </div>

                <h2 className="animate-reveal animate-reveal-3 text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6 max-w-3xl leading-[1.1] relative">
                    <span className="gradient-text-primary">Your AI Study Mate</span>
                    <br />
                    <span className="text-foreground inline-block">for HSC Maths</span>
                </h2>

                <p className="animate-reveal animate-reveal-4 text-muted-foreground text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
                    Learns when you're tired. Knows when to push.
                    <span className="text-secondary"> The only tutor that optimises your cognitive load.</span>
                </p>

                {/* Two-path CTA */}
                <div className="animate-reveal animate-reveal-5 flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={() => navigate('demo')}
                        className="btn-primary btn-glow px-8 py-4 rounded-xl flex items-center gap-3 group"
                    >
                        <Play size={18} className="group-hover:scale-110 transition-transform" />
                        Try Free Demo
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                        onClick={onLoginClick}
                        className="btn-secondary"
                    >
                        <Lock size={16} />
                        Full Access
                    </button>
                </div>
                <p className="animate-reveal animate-reveal-6 text-muted-foreground text-xs mt-4">
                    Demo runs locally in your browser. No sign-up, no API keys needed.
                </p>
            </main>

            {/* Features */}
            <section className="relative z-10 grid md:grid-cols-3 gap-6 px-6 pb-20 max-w-5xl mx-auto w-full">
                <ScrollReveal delay={0}>
                    <FeatureCard
                        icon={<BrainCircuit className="text-primary" size={24} />}
                        title="NSW Syllabus Aligned"
                        desc="Built for Advanced, Extension 1 and Extension 2 outcomes."
                    />
                </ScrollReveal>
                <ScrollReveal delay={100}>
                    <FeatureCard
                        icon={<Battery className="text-accent" size={24} />}
                        title="Fatigue-Aware"
                        desc="Detects burnout and adjusts interaction complexity in real-time."
                    />
                </ScrollReveal>
                <ScrollReveal delay={200}>
                    <FeatureCard
                        icon={<Moon className="text-secondary" size={24} />}
                        title="Available 24/7"
                        desc="Late night study panic? Mate is always awake and ready."
                    />
                </ScrollReveal>
            </section>

            {/* NSW Syllabus Links */}
            <section className="relative z-10 w-full max-w-3xl mx-auto px-6 pb-20">
                <ScrollReveal>
                    <div className="divider-glow mb-8" />
                </ScrollReveal>
                <div className="text-center mb-6">
                    <ScrollReveal delay={100}>
                        <h3 className="font-display text-2xl font-bold mb-3">
                            <span className="gradient-text-primary">NSW HSC Syllabi</span>
                        </h3>
                    </ScrollReveal>
                    <ScrollReveal delay={200}>
                        <p className="text-muted-foreground">
                            Official NESA curriculum documents for each course.
                        </p>
                    </ScrollReveal>
                </div>
                <ScrollReveal delay={300}>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                        {SYLLABI.map(s => (
                            <a
                                key={s.label}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`course-card ${s.className} inline-flex items-center gap-2 ${s.color}`}
                            >
                                <FileText size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                                {s.label}
                            </a>
                        ))}
                    </div>
                </ScrollReveal>
            </section>

            {/* AI Resources Preview */}
            <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-20">
                <ScrollReveal>
                    <div className="divider-glow mb-8" />
                </ScrollReveal>
                <div className="text-center mb-8">
                    <ScrollReveal delay={100}>
                        <h3 className="font-display text-2xl font-bold mb-3">
                            <span className="gradient-text-primary">Free AI Resources</span>
                        </h3>
                    </ScrollReveal>
                    <ScrollReveal delay={200}>
                        <p className="text-muted-foreground">
                            Prompts, guides, and system prompts for students, teachers, and anyone curious about AI.
                        </p>
                    </ScrollReveal>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <ScrollReveal delay={300}>
                        <ResourcePreviewCard
                            icon={<GraduationCap className="text-primary" size={20} />}
                            title="For Students"
                            items={["Homework helper prompts", "Exam study summariser", "Practice question generator"]}
                        />
                    </ScrollReveal>
                    <ScrollReveal delay={400}>
                        <ResourcePreviewCard
                            icon={<BookOpen className="text-accent" size={20} />}
                            title="For Teachers"
                            items={["LaTeX worksheet generator", "Lesson plan builder", "Marking rubric creator"]}
                        />
                    </ScrollReveal>
                    <ScrollReveal delay={500}>
                        <ResourcePreviewCard
                            icon={<Lightbulb className="text-secondary" size={20} />}
                            title="For Everyone"
                            items={["Personal AI tutor setup", "Study planner prompts", "What can AI actually do?"]}
                        />
                    </ScrollReveal>
                </div>
                <ScrollReveal delay={600}>
                    <div className="text-center">
                        <button
                            onClick={() => navigate('resources')}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-display text-sm border border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 group"
                        >
                            View All Resources
                            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                        </button>
                    </div>
                </ScrollReveal>
            </section>

            {/* Worksheet Generator CTA */}
            <section className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-20">
                <ScrollReveal>
                    <div className="divider-glow mb-8" />
                </ScrollReveal>
                <ScrollReveal delay={100}>
                    <div className="glass-card card-shine rounded-2xl overflow-hidden">
                        <div className="flex flex-col md:flex-row items-center gap-6 p-8">
                            <div className="flex-shrink-0 w-16 h-16 bg-primary/15 rounded-2xl flex items-center justify-center border border-primary/20">
                                <ClipboardList size={32} className="text-primary" />
                            </div>
                            <div className="text-center md:text-left flex-1">
                                <span className="text-xs font-display uppercase tracking-widest text-primary font-bold mb-2 block">✦ Try it now — free</span>
                                <h3 className="font-display text-2xl font-bold mb-2">HSC Worksheet Generator</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed">
                                    Generate professional, NESA-aligned LaTeX worksheets in seconds. Select specific syllabus dot-points, set your spacing, and get a production-ready prompt for Gemini Canvas.
                                </p>
                            </div>
                            <button
                                onClick={() => navigate('worksheets')}
                                className="btn-primary btn-glow px-6 py-3 rounded-xl flex items-center gap-2 group whitespace-nowrap flex-shrink-0"
                            >
                                Open Generator
                                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    </div>
                </ScrollReveal>
            </section>

            {/* Waitlist Section */}
            <section className="relative z-10 w-full max-w-xl mx-auto px-6 pb-20 text-center">
                <ScrollReveal>
                    <div className="divider-glow mb-8" />
                </ScrollReveal>
                <ScrollReveal delay={100}>
                    <h3 className="font-display text-2xl font-bold mb-3">Get Early Access</h3>
                </ScrollReveal>
                <ScrollReveal delay={200}>
                    <p className="text-muted-foreground mb-6">Join the waitlist. Be first when we launch.</p>
                </ScrollReveal>
                <ScrollReveal delay={300}>
                    <div className="gradient-border-card p-6 rounded-2xl">
                        <WaitlistForm />
                    </div>
                </ScrollReveal>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-12 px-6 border-t border-surface-2 bg-surface-1/30 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex flex-col items-center md:items-start gap-2">
                        <div className="flex items-center gap-2">
                            <img src="/MAIT Logo 2.png" alt="MAIT" className="h-6 w-auto" />
                            <span className="font-display font-bold text-sm tracking-tight text-foreground">MAIT</span>
                        </div>
                        <p className="text-muted-foreground text-[10px] tracking-wide uppercase">Your AI Study Mate</p>
                    </div>

                    <div className="flex items-center gap-8">
                        <button
                            onClick={() => navigate('privacy')}
                            className="text-muted-foreground hover:text-primary transition-colors text-sm font-display font-medium"
                        >
                            Privacy Policy
                        </button>
                        <a
                            href="https://mentalmaths.au"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-primary transition-colors text-sm font-display font-medium"
                        >
                            Mental Maths Mentor
                        </a>
                        <a
                            href="mailto:mentor@mentalmaths.au?subject=MAIT%20Feedback"
                            className="text-muted-foreground hover:text-primary transition-colors text-sm font-display font-medium"
                        >
                            Feedback
                        </a>
                    </div>

                    <div className="text-right flex flex-col items-center md:items-end gap-1">
                        <p className="text-muted-foreground text-xs font-display">
                            © 2026 MAIT. All rights reserved.
                        </p>
                        {visitCount !== null && (
                            <p className="text-muted-foreground/30 text-[10px] font-mono tabular-nums">
                                {visitCount.toLocaleString()} visits
                            </p>
                        )}
                    </div>
                </div>
            </footer>

        </div>
    )
}

function FeatureCard({ icon, title, desc }) {
    return (
        <div className="glass-card card-shine p-6 rounded-2xl text-center group">
            <div className="bg-surface-1 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 icon-hover-lift border border-surface-3">
                {icon}
            </div>
            <h3 className="font-display font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
        </div>
    )
}

function ResourcePreviewCard({ icon, title, items }) {
    return (
        <div className="glass-card card-shine p-6 rounded-2xl group flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-2 mb-4">
                <div className="icon-hover-lift bg-surface-1 w-12 h-12 rounded-full flex items-center justify-center border border-surface-3 mb-1">
                    {icon}
                </div>
                <h4 className="font-display text-sm font-bold text-foreground">{title}</h4>
            </div>
            <ul className="space-y-2 w-full">
                {items.map(item => (
                    <li key={item} className="text-muted-foreground text-xs flex items-center justify-center gap-2">
                        <span className="text-primary/60">•</span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    )
}

function WaitlistForm() {
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('idle')

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!email.trim() || !email.includes('@')) return

        setStatus('loading')
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/subscribe`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            if (res.ok) {
                setStatus('success')
                setEmail('')
            } else {
                setStatus('error')
            }
        } catch {
            setStatus('error')
        }
    }

    if (status === 'success') {
        return (
            <div className="glass-card border-primary/30 text-primary p-5 rounded-xl flex items-center justify-center gap-3 animate-success">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Check size={16} className="text-primary" />
                </div>
                <span className="font-display">You're on the list! We'll be in touch.</span>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="flex gap-3">
            <input
                type="email"
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-base flex-1"
            />
            <button
                type="submit"
                disabled={status === 'loading'}
                className="btn-primary px-6 py-3 rounded-xl whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {status === 'loading' ? (
                    <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Saving
                    </span>
                ) : (
                    <span className="flex items-center gap-2">
                        Notify Me <ArrowRight size={16} />
                    </span>
                )}
            </button>
        </form>
    )
}
