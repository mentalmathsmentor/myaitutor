import { useState } from 'react'
import { ArrowLeft, ExternalLink, FileText, Sparkles, Download, AlertCircle, ChevronDown, Loader2 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const TOPICS = [
    'Differentiation - Chain Rule',
    'Integration by Parts',
    'Trigonometric Identities',
    'Probability',
    'Sequences and Series',
    'Vectors',
    'Complex Numbers',
]

const YEAR_LEVELS = [
    { label: 'Year 11', value: 11 },
    { label: 'Year 12 Advanced', value: 12 },
    { label: 'Extension 1', value: 12 },
    { label: 'Extension 2', value: 12 },
]

const DIFFICULTIES = [
    { label: 'Mixed', value: 'mixed' },
    { label: 'Easy → Hard', value: 'easy' },
    { label: 'Exam-level', value: 'hard' },
]

export default function WorksheetGenerator({ onBack }) {
    const [topic, setTopic] = useState(TOPICS[0])
    const [yearLevel, setYearLevel] = useState(YEAR_LEVELS[1].label)
    const [numQuestions, setNumQuestions] = useState(10)
    const [difficulty, setDifficulty] = useState(DIFFICULTIES[0].label)

    const [loading, setLoading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [pdfBlob, setPdfBlob] = useState(null)
    const [error, setError] = useState(null)

    const handleGenerate = async (e) => {
        e.preventDefault()
        setLoading(true)
        setProgress(0)
        setPdfBlob(null)
        setError(null)

        // Simulate progress while waiting for the API
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(progressInterval)
                    return 90
                }
                return prev + Math.random() * 15
            })
        }, 500)

        try {
            const res = await fetch(`${API_URL}/generate-worksheet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    year_level: YEAR_LEVELS.find(y => y.label === yearLevel)?.value ?? 12,
                    num_questions: numQuestions,
                    difficulty: DIFFICULTIES.find(d => d.label === difficulty)?.value ?? 'mixed',
                }),
            })

            clearInterval(progressInterval)

            if (!res.ok) {
                const errorData = await res.json().catch(() => null)
                throw new Error(errorData?.detail || `Server error (${res.status}). Please try again.`)
            }

            const blob = await res.blob()
            setPdfBlob(blob)
            setProgress(100)
        } catch (err) {
            clearInterval(progressInterval)
            setProgress(0)
            setError(
                err.message === 'Failed to fetch'
                    ? 'Could not connect to the server. Please check your connection and try again.'
                    : err.message
            )
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = () => {
        if (!pdfBlob) return
        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        const safeTopicName = topic.replace(/[^a-zA-Z0-9]/g, '_')
        a.download = `${safeTopicName}_${yearLevel.replace(/\s+/g, '_')}_worksheet.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen bg-cosmic noise-overlay selection:bg-primary/30">
            {/* Decorative grid overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Header */}
            <header className="relative z-10 p-6 flex justify-between items-center animate-reveal animate-reveal-1">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-display text-sm"
                >
                    <ArrowLeft size={18} />
                    Back
                </button>
                <a
                    href="https://mentalmaths.au"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-display text-sm font-medium text-primary hover:text-accent transition-colors duration-300 hover:text-glow-primary"
                >
                    mentalmaths.au
                </a>
            </header>

            {/* Title */}
            <div className="relative z-10 text-center px-6 pt-4 pb-8">
                <div className="tag animate-reveal animate-reveal-2 animate-float mb-6 inline-flex">
                    <Sparkles size={12} />
                    A.G.E. ENGINE
                </div>
                <h2 className="animate-reveal animate-reveal-3 text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
                    <span className="gradient-text-primary">Worksheet Generator</span>
                </h2>
                <p className="animate-reveal animate-reveal-4 text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                    Generate tailored HSC Maths worksheets as print-ready PDFs. Powered by the Artifact Generation Engine.
                </p>
            </div>

            {/* Form */}
            <div className="relative z-10 max-w-2xl mx-auto px-6 pb-16">
                <form onSubmit={handleGenerate} className="glass-card rounded-2xl p-6 md:p-8 space-y-6 animate-reveal animate-reveal-5">

                    {/* Topic */}
                    <div className="space-y-2">
                        <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                            Topic
                        </label>
                        <div className="relative">
                            <select
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                disabled={loading}
                                className="input-base appearance-none pr-10 cursor-pointer font-display text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {TOPICS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    {/* Year Level */}
                    <div className="space-y-2">
                        <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                            Year Level
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {YEAR_LEVELS.map(level => (
                                <button
                                    key={level.label}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setYearLevel(level.label)}
                                    className={`px-3 py-2.5 rounded-xl font-display text-xs transition-all duration-300 border text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                                        yearLevel === level.label
                                            ? 'bg-primary/15 border-primary/40 text-primary'
                                            : 'bg-surface-1 border-surface-3 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                                    }`}
                                >
                                    {level.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Number of Questions */}
                    <div className="space-y-2">
                        <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                            Number of Questions
                            <span className="text-primary ml-2 text-sm font-bold normal-case">{numQuestions}</span>
                        </label>
                        <div className="relative px-1">
                            <input
                                type="range"
                                min={5}
                                max={20}
                                step={1}
                                value={numQuestions}
                                onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                                disabled={loading}
                                className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((numQuestions - 5) / 15) * 100}%, hsl(var(--surface-2)) ${((numQuestions - 5) / 15) * 100}%, hsl(var(--surface-2)) 100%)`,
                                }}
                            />
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[10px] text-muted-foreground font-mono">5</span>
                                <span className="text-[10px] text-muted-foreground font-mono">20</span>
                            </div>
                        </div>
                    </div>

                    {/* Difficulty */}
                    <div className="space-y-2">
                        <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                            Difficulty
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {DIFFICULTIES.map(d => (
                                <button
                                    key={d.label}
                                    type="button"
                                    disabled={loading}
                                    onClick={() => setDifficulty(d.label)}
                                    className={`px-3 py-2.5 rounded-xl font-display text-xs transition-all duration-300 border text-center disabled:opacity-50 disabled:cursor-not-allowed ${
                                        difficulty === d.label
                                            ? 'bg-primary/15 border-primary/40 text-primary'
                                            : 'bg-surface-1 border-surface-3 text-muted-foreground hover:border-primary/20 hover:text-foreground'
                                    }`}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="divider-glow" />

                    {/* Generate Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary py-4 rounded-xl font-display text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                    >
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Generating Worksheet...
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Generate Worksheet
                            </>
                        )}
                    </button>

                    {/* Progress Bar */}
                    {loading && (
                        <div className="space-y-2 animate-reveal">
                            <div className="w-full bg-surface-1 rounded-full h-2 overflow-hidden border border-surface-3">
                                <div
                                    className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 ease-out rounded-full"
                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-display text-muted-foreground uppercase tracking-wider">
                                    {progress < 30 ? 'Crafting questions...' : progress < 60 ? 'Formatting LaTeX...' : progress < 90 ? 'Compiling PDF...' : 'Almost there...'}
                                </span>
                                <span className="text-[10px] font-mono text-primary">
                                    {Math.round(progress)}%
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30 animate-reveal">
                            <AlertCircle size={18} className="text-destructive shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm text-destructive font-display font-bold">Generation Failed</p>
                                <p className="text-xs text-destructive/80 mt-1 leading-relaxed">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Download Success */}
                    {pdfBlob && !loading && (
                        <div className="space-y-4 animate-reveal">
                            <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/10 border border-primary/30">
                                <Sparkles size={18} className="text-primary shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-primary font-display font-bold">Worksheet Ready</p>
                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                        Your {numQuestions}-question {topic} worksheet for {yearLevel} has been generated.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleDownload}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-display text-sm tracking-wide border border-primary/40 text-primary hover:bg-primary/10 transition-all duration-300 group"
                            >
                                <Download size={18} className="transition-transform group-hover:translate-y-0.5" />
                                Download PDF
                            </button>
                        </div>
                    )}
                </form>

                {/* Info Section */}
                <div className="mt-8 grid sm:grid-cols-3 gap-4 animate-reveal animate-reveal-6">
                    <div className="glass-card rounded-xl p-5 text-center">
                        <div className="text-2xl font-display font-bold text-primary mb-1">7+</div>
                        <p className="text-muted-foreground text-xs font-display">Topics Available</p>
                    </div>
                    <div className="glass-card rounded-xl p-5 text-center">
                        <div className="text-2xl font-display font-bold text-accent mb-1">LaTeX</div>
                        <p className="text-muted-foreground text-xs font-display">Typeset Quality</p>
                    </div>
                    <div className="glass-card rounded-xl p-5 text-center">
                        <div className="text-2xl font-display font-bold text-secondary mb-1">PDF</div>
                        <p className="text-muted-foreground text-xs font-display">Print-Ready Output</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center border-t border-surface-2">
                <p className="text-muted-foreground text-sm font-display">
                    Built by <a href="https://mentalmaths.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent transition-colors">Mental Maths Mentor</a> · A.G.E. Worksheet Engine
                </p>
            </footer>
        </div>
    )
}
