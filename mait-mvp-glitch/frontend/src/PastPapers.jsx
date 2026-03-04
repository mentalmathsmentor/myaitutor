import { useState, useEffect, useRef } from 'react'
import { ExternalLink, ChevronDown, ChevronRight, AlertTriangle, Play, Pause, Square, BookOpen, Shield } from 'lucide-react'

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
        const hrs = parseFloat(customH) || 0
        const mins = parseFloat(customM) || 0
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
                            className={`px-1.5 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border transition-all ${
                                mode === m
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
                                className={`px-2 py-0.5 rounded text-[10px] font-display uppercase tracking-wider border transition-all ${
                                    preset === p.seconds && !showCustom
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
                                        type="number" placeholder="0" min="0" value={customH}
                                        onChange={e => setCustomH(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleCustomSubmit()}
                                        className="w-7 bg-transparent text-xs text-center font-mono text-foreground focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
                                        autoFocus
                                    />
                                    <span className="text-[9px] text-muted-foreground/60 font-display">h</span>
                                    <span className="text-muted-foreground/30">:</span>
                                    <input
                                        type="number" placeholder="0" min="0" step="any" value={customM}
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
export default function PastPapers() {
    const [activeUrl, setActiveUrl] = useState(null)
    const [activeLabel, setActiveLabel] = useState('')
    const [iframeLoaded, setIframeLoaded] = useState(false)
    const [expandedSubjects, setExpandedSubjects] = useState({ 'y12-advanced': true })
    const [expandedNesa, setExpandedNesa] = useState({})
    const [suggestedDuration, setSuggestedDuration] = useState(120)

    const handleSelect = (url, label, duration) => {
        setActiveUrl(url)
        setActiveLabel(label)
        setIframeLoaded(false)
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
                                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-display tracking-wide transition-all hover:bg-surface-2/50 ${
                                            colorClass(subject.color, 'text')
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
                                                className={`w-full flex items-center justify-between pl-6 pr-3 py-1.5 text-[11px] transition-all ${
                                                    isActive
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

                    {/* Source credit */}
                    <div className="mt-auto px-3 py-3 border-t border-surface-2">
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
                <main className="flex-1 flex flex-col overflow-hidden">
                    {!activeUrl ? (
                        /* Empty state */
                        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
                            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center">
                                <BookOpen size={28} className="text-primary/60" />
                            </div>
                            <div>
                                <p className="text-sm font-display text-foreground mb-1">Select a paper collection</p>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    Browse past HSC papers, trial papers, and internal assessments. Official NESA papers include marking guidelines and sample answers.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center mt-2">
                                {/* Quick-start buttons — NESA links open new tab, THSC open in iframe */}
                                {[
                                    { label: '2025 Advanced HSC', url: nesaUrl('mathematics-advanced', 2025), color: 'primary', external: true },
                                    { label: '2025 Ext 1 HSC', url: nesaUrl('mathematics-extension-1', 2025), color: 'accent', external: true },
                                    { label: 'Advanced Trials', url: 'https://thsconline.github.io/s/yr12/Maths/trialpapers_advanced.html', color: 'primary', duration: 180 },
                                    { label: 'Ext 1 Trials', url: 'https://thsconline.github.io/s/yr12/Maths/trialpapers_extension1.html', color: 'accent', duration: 120 },
                                ].map(q =>
                                    q.external ? (
                                        <a
                                            key={q.url}
                                            href={q.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display border transition-all ${colorClass(q.color, 'badge')}`}
                                        >
                                            {q.label}
                                            <ExternalLink size={10} />
                                        </a>
                                    ) : (
                                        <button
                                            key={q.url}
                                            onClick={() => handleSelect(q.url, q.label, q.duration)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-display border transition-all ${colorClass(q.color, 'badge')}`}
                                        >
                                            {q.label}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Viewer toolbar */}
                            <div className="flex-none flex items-center justify-between px-4 py-2 border-b border-surface-2 bg-surface-1/20 backdrop-blur-sm gap-3">
                                <span className="text-xs font-display text-foreground truncate">{activeLabel}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {!iframeLoaded && (
                                        <span className="text-[10px] text-muted-foreground font-mono animate-pulse">Loading…</span>
                                    )}
                                    <a
                                        href={activeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                                    >
                                        <ExternalLink size={11} />
                                        Open in new tab
                                    </a>
                                </div>
                            </div>

                            {/* Iframe */}
                            <div className="flex-1 relative">
                                {!iframeLoaded && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 z-10">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                            <p className="text-xs text-muted-foreground font-display">Loading papers…</p>
                                        </div>
                                    </div>
                                )}
                                <iframe
                                    key={activeUrl}
                                    src={activeUrl}
                                    title={activeLabel}
                                    onLoad={() => setIframeLoaded(true)}
                                    className="w-full h-full border-0"
                                    allow="fullscreen"
                                />
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    )
}
