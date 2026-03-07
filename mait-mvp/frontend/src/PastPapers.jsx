import { useState, useEffect, useRef } from 'react'
import { ExternalLink, ChevronDown, ChevronRight, AlertTriangle, Play, Pause, Square, BookOpen, Shield, MessageCircle, FileText, ClipboardList, Timer } from 'lucide-react'

// ─── NESA URL builder ─────────────────────────────────────────────────────────
const NESA_BASE = 'https://www.nsw.gov.au/education-and-training/nesa/curriculum/hsc-exam-papers'
const nesaUrl = (slug, year) => `${NESA_BASE}/${slug}/${year}`

const NESA_YEARS = [2025, 2024, 2023, 2022, 2021, 2020]

// ─── Paper catalogue ──────────────────────────────────────────────────────────
const CATALOGUE = [
    {
        year: 'Year 12',
        subjects: [
            {
                id: 'y12-standard', label: 'Standard', color: 'secondary', examDuration: 150,
                sections: [
                    { label: 'Internal Assessments', url: 'https://thsconline.github.io/s/yr12/Maths/assessment-tasks_general.html', count: '35' },
                    { label: 'Official HSC (NESA)', nesa: true, slug: 'mathematics-standard' },
                    { label: 'Past HSC Papers (<2019)', url: 'https://thsconline.github.io/s/yr12/Maths/hscpapers_general.html', count: '~40' },
                    { label: 'Trial Papers', url: 'https://thsconline.github.io/s/yr12/Maths/trialpapers_general.html', count: '173' },
                ],
            },
            {
                id: 'y12-advanced', label: 'Advanced (2U)', color: 'primary', examDuration: 180,
                sections: [
                    { label: 'Internal Assessments', url: 'https://thsconline.github.io/s/yr12/Maths/assessment-tasks_advanced.html', count: '382' },
                    { label: 'Official HSC (NESA)', nesa: true, slug: 'mathematics-advanced' },
                    { label: 'Past HSC Papers (<2019)', url: 'https://thsconline.github.io/s/yr12/Maths/hscpapers_advanced.html', count: '~40' },
                    { label: 'Trial Papers', url: 'https://thsconline.github.io/s/yr12/Maths/trialpapers_advanced.html', count: '655' },
                ],
            },
            {
                id: 'y12-ext1', label: 'Extension 1', color: 'accent', examDuration: 120,
                sections: [
                    { label: 'Internal Assessments', url: 'https://thsconline.github.io/s/yr12/Maths/assessment-tasks_extension1.html', count: '428' },
                    { label: 'Official HSC (NESA)', nesa: true, slug: 'mathematics-extension-1' },
                    { label: 'Past HSC Papers (<2019)', url: 'https://thsconline.github.io/s/yr12/Maths/hscpapers_extension1.html', count: '~40' },
                    { label: 'Trial Papers', url: 'https://thsconline.github.io/s/yr12/Maths/trialpapers_extension1.html', count: '772' },
                ],
            },
            {
                id: 'y12-ext2', label: 'Extension 2', color: 'accent', examDuration: 180,
                sections: [
                    { label: 'Internal Assessments', url: 'https://thsconline.github.io/s/yr12/Maths/assessment-tasks_extension2.html', count: '447' },
                    { label: 'Official HSC (NESA)', nesa: true, slug: 'mathematics-extension-2' },
                    { label: 'Past HSC Papers (<2019)', url: 'https://thsconline.github.io/s/yr12/Maths/hscpapers_extension2.html', count: '~35' },
                    { label: 'Trial Papers', url: 'https://thsconline.github.io/s/yr12/Maths/trialpapers_extension2.html', count: '695' },
                ],
            },
        ],
    },
    {
        year: 'Year 11',
        subjects: [
            {
                id: 'y11-standard', label: 'Standard', color: 'secondary', examDuration: 90,
                sections: [
                    { label: 'Yearly Exams', url: 'https://thsconline.github.io/s/yr11/Maths/prelimpapers_general.html', count: '10' },
                ],
            },
            {
                id: 'y11-advanced', label: 'Advanced (2U)', color: 'primary', examDuration: 90,
                sections: [
                    { label: 'Internal Assessments', url: 'https://thsconline.github.io/s/yr11/Maths/assessment-tasks_advanced.html', count: '188' },
                    { label: 'Yearly Exams', url: 'https://thsconline.github.io/s/yr11/Maths/prelimpapers_advanced.html', count: '268' },
                ],
            },
            {
                id: 'y11-ext1', label: 'Extension 1', color: 'accent', examDuration: 60,
                sections: [
                    { label: 'Internal Assessments', url: 'https://thsconline.github.io/s/yr11/Maths/assessment-tasks_extension1.html', count: '173' },
                    { label: 'Yearly Exams', url: 'https://thsconline.github.io/s/yr11/Maths/prelimpapers_extension1.html', count: '225' },
                ],
            },
        ],
    },
]

// ─── Timer presets (minutes) ──────────────────────────────────────────────────
const PRESETS = [
    { label: '30m', seconds: 30 * 60 },
    { label: '1h', seconds: 60 * 60 },
    { label: '2h', seconds: 120 * 60 },
    { label: '3h', seconds: 180 * 60 },
]

function colorClass(color, style = 'text') {
    const map = {
        primary: { text: 'text-primary', border: 'border-primary/40', bg: 'bg-primary/10', badge: 'bg-primary/15 border-primary/30 text-primary' },
        secondary: { text: 'text-secondary', border: 'border-secondary/40', bg: 'bg-secondary/10', badge: 'bg-secondary/15 border-secondary/30 text-secondary' },
        accent: { text: 'text-accent', border: 'border-accent/40', bg: 'bg-accent/10', badge: 'bg-accent/15 border-accent/30 text-accent' },
    }
    return map[color]?.[style] ?? ''
}

function pad(n) { return String(n).padStart(2, '0') }
function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600)
    const m = Math.floor((totalSeconds % 3600) / 60)
    const s = totalSeconds % 60
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
    return `${pad(m)}:${pad(s)}`
}

// ─── Exam Timer component ─────────────────────────────────────────────────────
function ExamTimer({ suggestedDuration }) {
    const [mode, setMode] = useState('countdown')
    const [preset, setPreset] = useState(120 * 60)
    const [customH, setCustomH] = useState('')
    const [customM, setCustomM] = useState('')
    const [showCustom, setShowCustom] = useState(false)
    const [elapsed, setElapsed] = useState(0)
    const [remaining, setRemaining] = useState(120 * 60)
    const [running, setRunning] = useState(false)
    const intervalRef = useRef(null)

    useEffect(() => {
        if (!running) setRemaining(preset)
    }, [preset])

    useEffect(() => {
        if (!running && suggestedDuration) {
            const secs = suggestedDuration * 60
            setPreset(secs)
            setRemaining(secs)
        }
    }, [suggestedDuration])

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                if (mode === 'countup') {
                    setElapsed(e => e + 1)
                } else {
                    setRemaining(r => {
                        if (r <= 1) {
                            clearInterval(intervalRef.current)
                            setRunning(false)
                            return 0
                        }
                        return r - 1
                    })
                }
            }, 1000)
        } else {
            clearInterval(intervalRef.current)
        }
        return () => clearInterval(intervalRef.current)
    }, [running, mode])

    const handleReset = () => {
        setRunning(false)
        setElapsed(0)
        setRemaining(preset)
    }

    const handlePreset = (secs) => {
        setPreset(secs)
        setRemaining(secs)
        setElapsed(0)
        setRunning(false)
        setShowCustom(false)
    }

    const handleCustomSubmit = () => {
        const hrs = Math.min(parseFloat(customH) || 0, 24)
        const mins = Math.min(parseFloat(customM) || 0, 60)
        const wholeMinutes = Math.floor(mins)
        const extraSeconds = Math.round((mins - wholeMinutes) * 60)
        const totalSeconds = Math.round(hrs * 3600) + wholeMinutes * 60 + extraSeconds
        if (totalSeconds > 0) {
            handlePreset(totalSeconds)
            setCustomH('')
            setCustomM('')
        }
        setShowCustom(false)
    }

    const display = mode === 'countup' ? elapsed : remaining
    const total = mode === 'countdown' ? preset : null
    const pct = total ? Math.max(0, Math.min(1, remaining / total)) : null
    const isLow = mode === 'countdown' && remaining <= 300 && remaining > 0
    const isDanger = mode === 'countdown' && remaining <= 60 && remaining > 0
    const isDone = mode === 'countdown' && remaining === 0

    const SIZE = 200
    const SW = 5
    const RAD = (SIZE - SW * 2) / 2
    const CIRC = 2 * Math.PI * RAD
    const ringOffset = mode === 'countdown' && total ? CIRC * (1 - pct) : 0

    const ringStroke = isDone
        ? 'hsl(var(--destructive))'
        : isDanger
            ? 'hsl(var(--accent))'
            : isLow
                ? 'hsl(var(--accent))'
                : 'hsl(var(--primary))'

    const timeColor = isDone
        ? 'text-destructive'
        : isDanger
            ? 'text-accent animate-pulse'
            : isLow
                ? 'text-accent'
                : 'text-foreground'

    return (
        <div className="px-3 py-3 border-b border-surface-2">
            <div className="flex flex-col items-center gap-2.5">

                {/* ── Ring + time ─────────────────────────── */}
                <div className="relative" style={{ width: SIZE, height: SIZE }}>
                    <svg
                        width={SIZE} height={SIZE}
                        className="-rotate-90"
                        overflow="visible"
                        style={mode === 'countdown' && !isDone ? { filter: `drop-shadow(0 0 8px ${ringStroke})` } : undefined}
                    >
                        <circle cx={SIZE / 2} cy={SIZE / 2} r={RAD} fill="none" stroke="hsla(var(--surface-3), 0.6)" strokeWidth={SW} />
                        {mode === 'countdown' && (
                            <circle
                                cx={SIZE / 2} cy={SIZE / 2} r={RAD}
                                fill="none" stroke={ringStroke} strokeWidth={SW}
                                strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={ringOffset}
                                className="transition-all duration-1000 ease-linear"
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`font-display font-bold tabular-nums leading-none ${isDone ? 'text-xl' : 'text-[28px]'} ${timeColor}`}>
                            {isDone ? 'DONE' : formatTime(display)}
                        </span>
                    </div>
                </div>

                {/* ── Play / Stop / Mode ──────────────────── */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setRunning(r => !r)}
                        disabled={isDone}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-40 shadow-md shadow-primary/20"
                    >
                        {running
                            ? <Pause size={13} fill="currentColor" strokeWidth={0} />
                            : <Play size={13} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                        }
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-8 h-8 rounded-full flex items-center justify-center border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
                    >
                        <Square size={11} />
                    </button>
                    <div className="h-5 w-px bg-surface-3 mx-0.5" />
                    {['countdown', 'countup'].map(m => (
                        <button
                            key={m}
                            onClick={() => { setMode(m); handleReset() }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border transition-all ${mode === m
                                    ? 'bg-secondary/15 border-secondary/40 text-secondary'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                        >
                            {m === 'countdown' ? '↓' : '↑'}
                        </button>
                    ))}
                </div>

                {/* ── Presets ─────────────────────────────── */}
                {mode === 'countdown' && (
                    <div className="flex items-center justify-center gap-1 flex-wrap">
                        {PRESETS.map(p => (
                            <button
                                key={p.label}
                                onClick={() => handlePreset(p.seconds)}
                                className={`px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border transition-all ${preset === p.seconds && !showCustom
                                        ? 'bg-primary/15 border-primary/40 text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                        {showCustom ? (
                            <div className="flex items-center gap-1.5 w-full justify-center mt-1">
                                <div className="flex items-center rounded-lg bg-surface-1/80 border border-surface-3 px-2 py-1 gap-1.5">
                                    <input
                                        type="number" placeholder="0" min="0" max="24" value={customH}
                                        onChange={e => setCustomH(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                                        className="w-7 bg-transparent text-xs text-center font-mono text-foreground focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        autoFocus
                                    />
                                    <span className="text-[9px] text-muted-foreground/60 font-display">h</span>
                                    <span className="text-muted-foreground/30">:</span>
                                    <input
                                        type="number" placeholder="0" min="0" max="60" value={customM}
                                        onChange={e => setCustomM(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                                        className="w-7 bg-transparent text-xs text-center font-mono text-foreground focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                    />
                                    <span className="text-[9px] text-muted-foreground/60 font-display">m</span>
                                </div>
                                <button onClick={handleCustomSubmit}
                                    className="px-2 py-1 rounded text-[10px] font-display border border-primary/40 text-primary hover:bg-primary/15 transition-all"
                                >
                                    Set
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowCustom(true)}
                                className="px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border border-transparent text-muted-foreground hover:text-foreground transition-all"
                            >
                                Custom
                            </button>
                        )}
                    </div>
                )}

                {/* ── Low time warning ────────────────────── */}
                {isLow && !isDone && (
                    <div className={`flex items-center gap-1.5 text-[10px] font-display uppercase tracking-wider ${isDanger ? 'text-destructive animate-pulse' : 'text-accent'}`}>
                        <AlertTriangle size={11} />
                        <span>{isDanger ? 'Under 1 min!' : 'Under 5 min'}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Main PastPapers page ─────────────────────────────────────────────────────
export default function PastPapers({ navigate }) {
    const [activeUrl, setActiveUrl] = useState(null)
    const [activeLabel, setActiveLabel] = useState('')
    const [expandedSubjects, setExpandedSubjects] = useState({ 'y12-advanced': true })
    const [expandedNesa, setExpandedNesa] = useState({})
    const [suggestedDuration, setSuggestedDuration] = useState(120)

    const handleSelect = (url, label, duration) => {
        if (url) window.open(url, '_blank', 'noopener,noreferrer')
        if (duration) setSuggestedDuration(duration)
    }

    const toggleSubject = (id) => {
        setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const toggleNesa = (subjectId) => {
        setExpandedNesa(prev => ({ ...prev, [subjectId]: !prev[subjectId] }))
    }

    return (
        <div className="h-screen pt-14 flex flex-col overflow-hidden bg-cosmic noise-overlay">

            {/* Body: sidebar + viewer */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── Sidebar ─────────────────────────────────────────────── */}
                <aside className="w-64 shrink-0 flex flex-col overflow-y-auto border-r border-surface-2 bg-surface-1/30 backdrop-blur-sm">

                    {/* Exam Timer */}
                    <ExamTimer suggestedDuration={suggestedDuration} />

                    <div className="px-3 pt-2 pb-1">
                        <p className="text-[9px] font-display uppercase tracking-widest text-muted-foreground">NSW Maths Papers</p>
                    </div>

                    {CATALOGUE.map(group => (
                        <div key={group.year} className="mt-1">
                            {/* Year header */}
                            <div className="px-3 py-1.5">
                                <span className="text-[9px] font-display uppercase tracking-widest text-muted-foreground/60">{group.year}</span>
                            </div>

                            {group.subjects.map(subject => (
                                <div key={subject.id}>
                                    {/* Subject toggle */}
                                    <button
                                        onClick={() => toggleSubject(subject.id)}
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-display tracking-wide transition-all hover:bg-surface-2/50 ${colorClass(subject.color, 'text')
                                            }`}
                                    >
                                        <span>{subject.label}</span>
                                        {expandedSubjects[subject.id]
                                            ? <ChevronDown size={12} />
                                            : <ChevronRight size={12} />
                                        }
                                    </button>

                                    {/* Section links */}
                                    {expandedSubjects[subject.id] && subject.sections.map(section => {
                                        // ── NESA expandable section ──
                                        if (section.nesa) {
                                            const nesaKey = `${subject.id}-nesa`
                                            const isOpen = expandedNesa[nesaKey]
                                            return (
                                                <div key={nesaKey}>
                                                    <button
                                                        onClick={() => toggleNesa(nesaKey)}
                                                        className={`w-full flex items-center justify-between pl-6 pr-3 py-1.5 text-[11px] transition-all text-muted-foreground hover:text-foreground hover:bg-surface-2/40 border-l-2 border-transparent`}
                                                    >
                                                        <span className="flex items-center gap-1.5">
                                                            <Shield size={10} className="text-primary/60" />
                                                            {section.label}
                                                        </span>
                                                        {isOpen ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                                                    </button>
                                                    {isOpen && NESA_YEARS.map(yr => {
                                                        const url = nesaUrl(section.slug, yr)
                                                        return (
                                                            <a
                                                                key={yr}
                                                                href={url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="w-full flex items-center justify-between pl-10 pr-3 py-1 text-[10px] transition-all text-muted-foreground hover:text-foreground hover:bg-surface-2/40 border-l-2 border-transparent"
                                                            >
                                                                <span>{yr} HSC</span>
                                                                <ExternalLink size={8} className="opacity-40" />
                                                            </a>
                                                        )
                                                    })}
                                                </div>
                                            )
                                        }

                                        // ── Regular section link ──
                                        const isActive = activeUrl === section.url
                                        return (
                                            <button
                                                key={section.url}
                                                onClick={() => handleSelect(section.url, `${subject.label} — ${section.label}`, subject.examDuration)}
                                                className={`w-full flex items-center justify-between pl-6 pr-3 py-1.5 text-[11px] transition-all ${isActive
                                                        ? `${colorClass(subject.color, 'bg')} ${colorClass(subject.color, 'text')} border-l-2 ${colorClass(subject.color, 'border')}`
                                                        : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/40 border-l-2 border-transparent'
                                                    }`}
                                            >
                                                <span>{section.label}</span>
                                                <span className="text-[9px] font-mono opacity-50">{section.count}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    ))}

                    {/* Source credit + Feedback */}
                    <div className="mt-auto px-3 py-3 border-t border-surface-2 flex flex-col gap-2">
                        <a
                            href="mailto:mentor@mentalmaths.au?subject=MAIT%20Feedback"
                            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all text-[10px] font-display"
                        >
                            <MessageCircle size={10} />
                            Feedback / Questions
                        </a>
                        <p className="text-[9px] text-muted-foreground/50 leading-relaxed">
                            Papers from{' '}
                            <a href="https://thsconline.github.io/s/" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary underline">
                                THSC Online
                            </a>
                            {' '}&{' '}
                            <a href="https://educationstandards.nsw.edu.au/wps/portal/nesa/11-12/resources/hsc-exam-papers" target="_blank" rel="noopener noreferrer" className="text-primary/70 hover:text-primary underline">
                                NESA
                            </a>
                        </p>
                    </div>
                </aside>

                {/* ── Viewer ──────────────────────────────────────────────── */}
                {/* ── Resource Dashboard ────────────────────────────────────────── */}
                <main className="flex-1 overflow-y-auto custom-scrollbar bg-background/20">
                    <div className="max-w-5xl mx-auto px-6 py-12">
                        {/* Intro Section */}
                        <div className="mb-12">
                            <h2 className="font-display text-3xl font-bold mb-4 gradient-text-primary">Past Papers & Practice</h2>
                            <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
                                The best way to prepare for HSC Maths is past papers. We've curated the two most useful resources for NSW students — use them alongside MAIT's AI tools for a complete study workflow.
                            </p>
                        </div>

                        {/* Primary Resource Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
                            {/* THSC Card */}
                            <div className="glass-card card-shine rounded-2xl p-8 flex flex-col group border border-surface-3/50 hover:border-primary/40 transition-all duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <FileText className="text-primary" size={24} />
                                    </div>
                                    <span className="text-[10px] font-display uppercase tracking-widest text-primary/60 bg-primary/5 px-2 py-1 rounded-md border border-primary/10">Archive</span>
                                </div>
                                <h3 className="font-display text-xl font-bold mb-1">THSC Online</h3>
                                <p className="text-primary/80 text-xs font-medium mb-4 uppercase tracking-wider">Past Papers & Trial Exams</p>
                                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                    The most comprehensive archive of HSC trial papers from schools across NSW. Includes official NESA papers and sample answers.
                                </p>
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {["Official HSC Papers", "Trial Papers (655+)", "Solutions", "All Years"].map(tag => (
                                        <span key={tag} className="text-[10px] bg-surface-2 text-muted-foreground px-2 py-1 rounded-md border border-surface-3">{tag}</span>
                                    ))}
                                </div>
                                <div className="mt-auto pt-6 flex flex-col gap-4">
                                    <a
                                        href="https://thsconline.github.io/s/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-primary flex items-center justify-center gap-2 py-3 rounded-xl group"
                                    >
                                        Browse Past Papers
                                        <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </a>
                                    <p className="text-[10px] text-center text-muted-foreground/50 italic">
                                        Provided by THSC Online — an independent community resource
                                    </p>
                                </div>
                            </div>

                            {/* First Education Card */}
                            <div className="glass-card card-shine rounded-2xl p-8 flex flex-col group border border-surface-3/50 hover:border-secondary/40 transition-all duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center border border-secondary/20">
                                        <ClipboardList className="text-secondary" size={24} />
                                    </div>
                                    <span className="text-[10px] font-display uppercase tracking-widest text-secondary/60 bg-secondary/5 px-2 py-1 rounded-md border border-secondary/10">Generator</span>
                                </div>
                                <h3 className="font-display text-xl font-bold mb-1">First Education</h3>
                                <p className="text-secondary/80 text-xs font-medium mb-4 uppercase tracking-wider">HSC Question Topic Test Maker</p>
                                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                    Build custom topic tests from real HSC questions. Select topics to include or exclude, then generate a printable PDF.
                                </p>
                                <div className="flex flex-wrap gap-2 mb-8">
                                    {["Topic Selection", "Custom PDFs", "Answer Keys", "Live Filtering"].map(tag => (
                                        <span key={tag} className="text-[10px] bg-surface-2 text-muted-foreground px-2 py-1 rounded-md border border-surface-3">{tag}</span>
                                    ))}
                                </div>
                                <div className="mt-auto pt-6 flex flex-col gap-4">
                                    <a
                                        href="https://hscmathsbytopic.firsteducation.com.au/"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn-secondary flex items-center justify-center gap-2 py-3 rounded-xl group font-bold tracking-wide"
                                    >
                                        Create Topic Test
                                        <ExternalLink size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                    </a>
                                    <p className="text-[10px] text-center text-muted-foreground/50 italic">
                                        Provided by <a href="https://firsteducation.com.au" target="_blank" rel="noopener noreferrer" className="hover:text-secondary underline transition-colors">First Education</a>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* MAIT Tools Section */}
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="h-px flex-1 bg-surface-3" />
                                <h3 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/60 whitespace-nowrap">MAIT Study Tools</h3>
                                <div className="h-px flex-1 bg-surface-3" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="glass-card p-6 rounded-xl border border-surface-3/30 hover:bg-surface-2/20 transition-all group">
                                    <h4 className="font-display text-base font-bold mb-2 flex items-center gap-2">
                                        <Sparkles size={16} className="text-primary" />
                                        AI Worksheet Generator
                                    </h4>
                                    <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                                        Generate custom NESA-styled worksheets with AI. Choose your topic, difficulty, and number of questions.
                                    </p>
                                    <button
                                        onClick={() => navigate('worksheets')}
                                        className="text-xs font-display font-bold text-primary flex items-center gap-1.5 group-hover:gap-2 transition-all"
                                    >
                                        Open Worksheet Generator <ArrowRight size={14} />
                                    </button>
                                </div>

                                <div className="glass-card p-6 rounded-xl border border-surface-3/30 hover:bg-surface-2/20 transition-all group">
                                    <h4 className="font-display text-base font-bold mb-2 flex items-center gap-2">
                                        <Timer size={16} className="text-accent" />
                                        Exam Timer
                                    </h4>
                                    <p className="text-muted-foreground text-xs leading-relaxed mb-4">
                                        Practice under exam conditions. Set your time, start the countdown, and build exam stamina using the sidebar tool.
                                    </p>
                                    <div className="text-[10px] font-display uppercase tracking-widest text-accent/60 flex items-center gap-1.5">
                                        Active on sidebar <ChevronLeft size={10} className="animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}
