import { useState, useEffect } from 'react'
import { BrainCircuit, Battery, Moon, ArrowRight, Lock, Sparkles, Play, GraduationCap, BookOpen, Lightbulb, MessageCircle, FileText } from 'lucide-react'

const SYLLABI = [
    { label: 'Standard', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-standard-11-12-2024/overview', color: 'text-secondary' },
    { label: 'Advanced', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-advanced-11-12-2024/overview', color: 'text-primary' },
    { label: 'Extension 1', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-extension-1-11-12-2024/overview', color: 'text-accent' },
    { label: 'Extension 2', url: 'https://curriculum.nsw.edu.au/learning-areas/mathematics/mathematics-extension-2-12/overview', color: 'text-accent' },
]

export default function LandingPage({ navigate, onLoginClick }) {
    const [visitCount, setVisitCount] = useState(null)

    useEffect(() => {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
        fetch(`${API_URL}/visit`, { method: 'POST' })
            .then(r => r.json())
            .then(d => setVisitCount(d.count))
            .catch(() => {})
    }, [])

    return (
        <div className="min-h-screen bg-cosmic noise-overlay flex flex-col selection:bg-primary/30">
            {/* Decorative grid overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Hero */}
            <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-4">
                <div className="tag animate-reveal animate-reveal-2 animate-float mb-8">
                    <Sparkles size={12} />
                    COMING 2026
                </div>

                <h2 className="animate-reveal animate-reveal-3 text-4xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight mb-6 max-w-3xl leading-[1.1]">
                    <span className="gradient-text-primary">Your AI Study Mate</span>
                    <br />
                    <span className="text-foreground animate-glitch inline-block">for HSC Maths</span>
                </h2>

                <p className="animate-reveal animate-reveal-4 text-muted-foreground text-lg md:text-xl mb-10 max-w-lg leading-relaxed">
                    Learns when you're tired. Knows when to push.
                    <span className="text-secondary"> The only tutor that optimises your cognitive load.</span>
                </p>

                {/* Two-path CTA */}
                <div className="animate-reveal animate-reveal-5 flex flex-col sm:flex-row items-center gap-4">
                    <button
                        onClick={() => navigate('demo')}
                        className="btn-primary px-8 py-4 rounded-xl flex items-center gap-3 group"
                    >
                        <Play size={18} />
                        Try Free Demo
                        <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                        onClick={onLoginClick}
                        className="px-8 py-4 rounded-xl flex items-center gap-3 font-display text-sm tracking-wide border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all duration-300 group"
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
            <section className="relative z-10 grid md:grid-cols-3 gap-6 px-6 pb-16 max-w-5xl mx-auto w-full">
                <FeatureCard
                    icon={<BrainCircuit className="text-primary" size={24} />}
                    title="NSW Syllabus Aligned"
                    desc="Built for Advanced, Extension 1 and Extension 2 outcomes."
                    delay="animate-reveal-1"
                />
                <FeatureCard
                    icon={<Battery className="text-accent" size={24} />}
                    title="Fatigue-Aware"
                    desc="Detects burnout and adjusts interaction complexity in real-time."
                    delay="animate-reveal-2"
                />
                <FeatureCard
                    icon={<Moon className="text-secondary" size={24} />}
                    title="Available 24/7"
                    desc="Late night study panic? Mate is always awake and ready."
                    delay="animate-reveal-3"
                />
            </section>

            {/* NSW Syllabus Links */}
            <section className="relative z-10 w-full max-w-3xl mx-auto px-6 pb-16">
                <div className="divider-glow mb-8" />
                <div className="text-center mb-6">
                    <h3 className="font-display text-2xl font-bold mb-3 animate-reveal animate-reveal-1">
                        <span className="gradient-text-primary">NSW HSC Syllabi</span>
                    </h3>
                    <p className="text-muted-foreground animate-reveal animate-reveal-2">
                        Official NESA curriculum documents for each course.
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3 animate-reveal animate-reveal-3">
                    {SYLLABI.map(s => (
                        <a
                            key={s.label}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-display text-sm border border-surface-3 hover:border-primary/40 transition-all duration-300 group ${s.color}`}
                        >
                            <FileText size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
                            {s.label}
                        </a>
                    ))}
                </div>
            </section>

            {/* AI Resources Preview */}
            <section className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-16">
                <div className="divider-glow mb-8" />
                <div className="text-center mb-8">
                    <h3 className="font-display text-2xl font-bold mb-3 animate-reveal animate-reveal-1">
                        <span className="gradient-text-primary">Free AI Resources</span>
                    </h3>
                    <p className="text-muted-foreground animate-reveal animate-reveal-2">
                        Prompts, guides, and system prompts for students, teachers, and anyone curious about AI.
                    </p>
                </div>
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <ResourcePreviewCard
                        icon={<GraduationCap className="text-primary" size={20} />}
                        title="For Students"
                        items={["Homework helper prompts", "Exam study summariser", "Practice question generator"]}
                        delay="animate-reveal-3"
                    />
                    <ResourcePreviewCard
                        icon={<BookOpen className="text-accent" size={20} />}
                        title="For Teachers"
                        items={["LaTeX worksheet generator", "Lesson plan builder", "Marking rubric creator"]}
                        delay="animate-reveal-4"
                    />
                    <ResourcePreviewCard
                        icon={<Lightbulb className="text-secondary" size={20} />}
                        title="For Everyone"
                        items={["Personal AI tutor setup", "Study planner prompts", "What can AI actually do?"]}
                        delay="animate-reveal-5"
                    />
                </div>
                <div className="text-center animate-reveal animate-reveal-6">
                    <button
                        onClick={() => navigate('resources')}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-display text-sm border border-primary/30 text-primary hover:bg-primary/10 transition-all duration-300 group"
                    >
                        View All Resources
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </section>

            {/* Waitlist Section */}
            <section className="relative z-10 w-full max-w-xl mx-auto px-6 pb-16 text-center">
                <div className="divider-glow mb-8" />
                <h3 className="font-display text-2xl font-bold mb-3 animate-reveal animate-reveal-1">Get Early Access</h3>
                <p className="text-muted-foreground mb-6 animate-reveal animate-reveal-2">Join the waitlist. Be first when we launch.</p>
                <div className="animate-reveal animate-reveal-3">
                    <WaitlistForm />
                </div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center border-t border-surface-2 flex flex-col items-center gap-3">
                <a
                    href="mailto:mentor@mentalmaths.au?subject=MAIT%20Feedback"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-sm font-display"
                >
                    <MessageCircle size={14} />
                    Feedback / Questions
                </a>
                <p className="text-muted-foreground text-sm font-display">
                    Built by <a href="https://mentalmaths.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent transition-colors">Mental Maths Mentor</a> · Coming 2026
                </p>
                {visitCount !== null && (
                    <p className="text-muted-foreground/40 text-xs font-mono tabular-nums">
                        {visitCount.toLocaleString()} visits
                    </p>
                )}
            </footer>

        </div>
    )
}

function FeatureCard({ icon, title, desc, delay }) {
    return (
        <div className={`glass-card p-6 rounded-2xl text-center hover:border-primary/30 transition-all duration-500 group animate-reveal ${delay}`}>
            <div className="bg-surface-1 w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform duration-300 border border-surface-3">
                {icon}
            </div>
            <h3 className="font-display font-bold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
        </div>
    )
}

function ResourcePreviewCard({ icon, title, items, delay }) {
    return (
        <div className={`glass-card p-5 rounded-xl hover:border-primary/30 transition-all duration-500 animate-reveal ${delay}`}>
            <div className="flex items-center gap-2 mb-3">
                {icon}
                <h4 className="font-display text-sm font-bold">{title}</h4>
            </div>
            <ul className="space-y-1.5">
                {items.map(item => (
                    <li key={item} className="text-muted-foreground text-xs flex items-start gap-2">
                        <span className="text-primary mt-0.5">&#8250;</span>
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
            <div className="glass-card border-primary/30 text-primary p-5 rounded-xl flex items-center justify-center gap-2">
                <Sparkles size={16} />
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
