import { useState, useEffect, useMemo } from 'react'
import { Sparkles, Copy, ExternalLink, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, ListFilter, X, Search } from 'lucide-react'
import syllabusData from './syllabus_data.json'

const YEAR_LEVELS = Object.keys(syllabusData);
const SPACING_OPTIONS = ['Working Blank Space (Math)', 'Ruled lines (Writing)', 'Compact (No space)']

export default function WorksheetGenerator() {
    // State
    const [schoolName, setSchoolName] = useState('')
    const [classYear, setClassYear] = useState(YEAR_LEVELS[2]) // Year 12 Advanced
    const [selectedPoints, setSelectedPoints] = useState([])
    const [includeName, setIncludeName] = useState(true)
    const [includeDate, setIncludeDate] = useState(true)
    const [mode, setMode] = useState('A')
    const [numQuestions, setNumQuestions] = useState(10)
    const [rawQuestions, setRawQuestions] = useState('')
    const [workingSpace, setWorkingSpace] = useState(SPACING_OPTIONS[0])
    const [includeMarks, setIncludeMarks] = useState(false)
    const [generateAnswerKey, setGenerateAnswerKey] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    const [isCopied, setIsCopied] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const [expandedModules, setExpandedModules] = useState({})
    const [expandedSubtopics, setExpandedSubtopics] = useState({})

    // Reset points on class change
    useEffect(() => {
        setSelectedPoints([]);
    }, [classYear]);

    // Hierarchy Helpers
    const currentSyllabus = syllabusData[classYear] || {};
    const modules = Object.keys(currentSyllabus);

    const toggleModule = (mod) => {
        setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
    };

    const toggleSubtopic = (subt) => {
        setExpandedSubtopics(prev => ({ ...prev, [subt]: !prev[subt] }));
    };

    const handlePointToggle = (point) => {
        setSelectedPoints(prev =>
            prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point]
        );
    };

    const isModuleSelected = (mod) => {
        const subtopics = currentSyllabus[mod];
        if (!subtopics) return false;
        const allPoints = Object.values(subtopics).flat();
        return allPoints.length > 0 && allPoints.every(p => selectedPoints.includes(p));
    };

    const toggleModuleSelection = (mod) => {
        const subtopics = currentSyllabus[mod];
        const allPoints = Object.values(subtopics).flat();
        const currentlyAllSelected = allPoints.every(p => selectedPoints.includes(p));

        if (currentlyAllSelected) {
            setSelectedPoints(prev => prev.filter(p => !allPoints.includes(p)));
        } else {
            setSelectedPoints(prev => Array.from(new Set([...prev, ...allPoints])));
        }
    };

    const generatePrompt = () => {
        // Header Logic
        let lheadContent = `\\textbf{ ${classYear} }`;
        if (schoolName.trim()) {
            lheadContent = `\\textbf{ ${schoolName} - ${classYear} }`;
        }

        let headerString = '';
        if (includeName && includeDate) headerString = 'Name: \\makebox[4cm]{\\hrulefill} \\quad Date: \\makebox[2.5cm]{\\hrulefill}';
        else if (includeName) headerString = 'Name: \\makebox[4cm]{\\hrulefill}';
        else if (includeDate) headerString = 'Date: \\makebox[2.5cm]{\\hrulefill}';

        let marksLogic = includeMarks ? '\\unskip\\hfill\\textbf{[X Marks]}' : 'Do not assign marks';
        let answerKeyLogic = generateAnswerKey ? 'Insert \\newpage at the end and provide a Teacher Answer Key' : 'Do not generate an answer key';

        let contentString = '';
        if (mode === 'A') {
            const pointsText = selectedPoints.length > 0
                ? `strictly targeting these specific syllabus dot-points and topics: \n${selectedPoints.map(p => `- ${p}`).join('\n')}`
                : `targeting the general curriculum for ${classYear}`;
            contentString = `Please generate ${numQuestions} professional-level exam questions ${pointsText}.`;
        } else {
            contentString = `Please format these exact questions into a professional worksheet: ${rawQuestions}`;
        }

        return `Act as the Universal Artifact Architect, an expert LaTeX Document Engine and Curriculum Designer. 

Your job is to create a professional, compile-ready PDF worksheet. 

**CRITICAL UI DIRECTIVE (THE GAG ORDER):** 
1. Output the entire LaTeX script inside ONE SINGLE code block starting with \`\`\`latex and ending with \`\`\`.
2. Do NOT output any conversational text before or after the code block. 
3. Output ONLY the raw code block to trigger the UI Canvas preview.

**1. THE PREAMBLE:**
\\documentclass[12pt, a4paper]{article}
\\usepackage[top=2cm, bottom=2cm, left=2cm, right=2cm]{geometry}
\\usepackage{amsmath, amssymb, fancyhdr, graphicx, tikz, enumitem, tcolorbox, needspace}
\\usepackage[hidelinks]{hyperref} 

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{ ${lheadContent} }
\\rhead{ ${headerString} }
\\cfoot{Page \\thepage}
\\rfoot{\\textcolor{gray!50}{\\tiny \\textit{myaitutor.au/worksheets}}}
\\renewcommand{\\headrulewidth}{0.4pt}
\\setlength{\\headheight}{30pt}
\\begin{document}

\\begin{center}
    {\\Large \\textbf{ ${mode === 'A' ? 'Syllabus Focus: Mixed Topics' : 'Custom Worksheet'} }}
\\end{center}
\\vspace{0.5cm}

**2. LAYOUT & FORMATTING RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment. Let LaTeX handle numbering. Do NOT use custom labels like \\item[\\textbf{Question 1:}].
* LINE BREAKS: Do NOT use \\\\ for line breaks within questions. Use a blank line (double return) to ensure text aligns to the left margin perfectly.
* Spacing: Apply ${workingSpace}.
* **MARKS ALIGNMENT (CRITICAL):** ${marksLogic === 'Do not assign marks' ? marksLogic : `If assigning marks, you MUST use \`${marksLogic}\` at the very end of the question text. Do NOT let the marks wrap to a new line awkwardly. Ensure they are pushed completely flush-right.`}
* **MANDATORY DIAGRAMS & SHAPES:** If a question mentions a shape, graph, diagram, angle relationship (e.g., "vertically opposite", "transversal"), or geometric property, you MUST generate the corresponding TikZ code to draw a clean, professional diagram below the question text.

**3. PAGINATION & FOOTER:**
* Before every new \\item, insert \\needspace{6cm}.
* Insert this footer: \\vfill \\hrule \\vspace{0.2cm} \\footnotesize \\textbf{AI SELF-CHECK:} \\textit{Ask AI for a hint, not the answer.}

**4. SCALING FOR 30+ QUESTIONS:**
If the request is for more than 20 questions, ensure you maintain high quality and varied task difficulty. For 30+ questions, you may use smaller spacing segments to fit the content while maintaining readability.

**5. ANSWER KEY:**
${answerKeyLogic}.

***
**USER CONTENT TO PROCESS:**
${contentString}
`;
    }

    const handleGenerate = async (e) => {
        e.preventDefault()
        const promptText = generatePrompt();

        try {
            await navigator.clipboard.writeText(promptText);
            setIsCopied(true);
            setShowWarning(true);

            // Warning is centered and blocks UI
            setTimeout(() => {
                setShowWarning(false);
                setIsCopied(false);
                window.open('https://gemini.google.com/app', '_blank');
            }, 3000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setShowWarning(true);
            setTimeout(() => {
                setShowWarning(false);
                window.open('https://gemini.google.com/app', '_blank');
            }, 3000);
        }
    }

    return (
        <div className="min-h-screen bg-cosmic noise-overlay selection:bg-primary/30 flex flex-col items-center">
            {/* Centered Warning Modal */}
            {showWarning && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-cosmic/80 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass-card rounded-3xl p-8 md:p-12 max-w-lg w-full text-center space-y-6 border-primary/30 shadow-[0_0_50px_rgba(var(--primary-rgb),0.2)] animate-in zoom-in-95 duration-300">
                        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <Sparkles className="text-primary w-10 h-10" />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-display font-bold tracking-tight">
                            Ready to Generate?
                        </h3>
                        <div className="space-y-4 text-muted-foreground">
                            <p className="text-lg leading-relaxed">
                                We've copied your highly specific prompt to your clipboard.
                            </p>
                            <div className="p-4 bg-surface-1/50 rounded-2xl border border-surface-3 space-y-2">
                                <p className="text-sm font-bold text-foreground">🚀 Pro-Tip for Gemini:</p>
                                <p className="text-xs">
                                    When Gemini opens, paste the prompt and make sure to enable the <span className="text-primary font-bold">"Canvas"</span> feature in the top right for the best visual experience.
                                </p>
                            </div>
                        </div>
                        <div className="pt-4">
                            <div className="h-1.5 w-full bg-surface-3 rounded-full overflow-hidden">
                                <div className="h-full bg-primary animate-progress-shrink origin-left" />
                            </div>
                            <p className="text-[10px] uppercase font-display tracking-widest text-muted-foreground mt-4">Launching in 3 seconds...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Decorative background components */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Header Content */}
            <div className="relative z-10 text-center px-6 pt-12 pb-12 w-full max-w-4xl">
                <div className="tag animate-reveal animate-reveal-1 mb-6 inline-flex">
                    <Sparkles size={12} />
                    A.G.E. PROMPT ENGINE V2.5
                </div>
                <h2 className="animate-reveal animate-reveal-2 text-4xl md:text-6xl font-display font-bold tracking-tight mb-4">
                    <span className="gradient-text-primary">Universal Worksheet Generator</span>
                </h2>
                <p className="animate-reveal animate-reveal-3 text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    Personalized HSC exam-prep. Select your syllabus points and let Gemini handle the LaTeX.
                </p>
            </div>

            {/* Main Form Container */}
            <div className="relative z-10 w-full max-w-4xl px-6 pb-24">
                <form onSubmit={handleGenerate} className="glass-card rounded-3xl p-6 md:p-10 space-y-8 animate-reveal animate-reveal-4 overflow-visible">

                    {/* Top Section: Meta Info */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground">
                                School / Institution Name
                            </label>
                            <input
                                type="text"
                                placeholder="Leave blank to omit"
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                className="input-base w-full text-sm font-display py-3"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground">
                                Class / Year Level
                            </label>
                            <div className="relative">
                                <select
                                    value={classYear}
                                    onChange={(e) => setClassYear(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full py-3"
                                >
                                    {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Mode Selection */}
                    <div className="flex bg-surface-1/50 p-1.5 rounded-2xl border border-surface-3">
                        <button
                            type="button"
                            onClick={() => setMode('A')}
                            className={`flex-1 py-3 rounded-xl font-display text-xs transition-all ${mode === 'A' ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Syllabus Mode (Generative)
                        </button>
                        <button
                            type="button"
                            onClick={() => setMode('B')}
                            className={`flex-1 py-3 rounded-xl font-display text-xs transition-all ${mode === 'B' ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Manual Mode (Formatting)
                        </button>
                    </div>

                    {/* Hierarchical Tree Checklist or Manual Area */}
                    <div className="bg-surface-1/30 rounded-2xl border border-surface-3/50 min-h-[400px] overflow-hidden flex flex-col">
                        {mode === 'A' ? (
                            <div className="flex flex-col h-full animate-reveal">
                                {/* Search & Selected Header */}
                                <div className="p-4 border-b border-surface-3/50 flex flex-wrap items-center gap-4 bg-surface-2/20">
                                    <div className="relative flex-1 min-w-[200px]">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Find a topic or point..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-surface-1 border border-surface-3 rounded-xl pl-9 pr-4 py-2 text-xs font-display focus:border-primary/50 outline-none transition-all"
                                        />
                                    </div>
                                    <div className="text-[10px] font-display uppercase tracking-widest text-primary font-bold flex items-center gap-2">
                                        <CheckCircle2 size={12} />
                                        {selectedPoints.length} Points Selected
                                    </div>
                                    {selectedPoints.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => setSelectedPoints([])}
                                            className="text-[10px] font-display uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                {/* Scrollable Tree View */}
                                <div className="flex-1 overflow-y-auto max-h-[500px] p-4 custom-scrollbar">
                                    <div className="space-y-4">
                                        {modules.map(mod => (
                                            <div key={mod} className="space-y-1">
                                                {/* Module row */}
                                                <div className="flex items-center gap-2 group p-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleModule(mod)}
                                                        className="p-1 hover:bg-surface-3 rounded transition-colors"
                                                    >
                                                        {expandedModules[mod] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </button>
                                                    <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                        <input
                                                            type="checkbox"
                                                            checked={isModuleSelected(mod)}
                                                            onChange={() => toggleModuleSelection(mod)}
                                                            className="w-3.5 h-3.5 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                                        />
                                                        <span className="text-xs font-display font-bold text-foreground group-hover:text-primary transition-colors">{mod}</span>
                                                    </label>
                                                </div>

                                                {/* Module Children (Subtopics) */}
                                                {expandedModules[mod] && (
                                                    <div className="ml-6 space-y-3 border-l border-surface-3 pl-4 py-2">
                                                        {Object.keys(currentSyllabus[mod] || {}).map(subt => (
                                                            <div key={subt} className="space-y-1">
                                                                <div className="flex items-center gap-2 group p-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => toggleSubtopic(subt)}
                                                                        className="p-1 hover:bg-surface-3 rounded transition-colors"
                                                                    >
                                                                        {expandedSubtopics[subt] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                    </button>
                                                                    <span className="text-[11px] font-display text-muted-foreground font-semibold group-hover:text-foreground tracking-wide">{subt}</span>
                                                                </div>

                                                                {/* Subtopic Children (Dot Points) */}
                                                                {expandedSubtopics[subt] && (
                                                                    <div className="ml-6 grid gap-2 py-1">
                                                                        {currentSyllabus[mod][subt].map((point, idx) => (
                                                                            <label
                                                                                key={idx}
                                                                                className={`flex items-start gap-3 p-3 rounded-xl border border-surface-3 transition-all cursor-pointer select-none ${selectedPoints.includes(point) ? 'bg-primary/5 border-primary/20 text-foreground' : 'bg-surface-2/20 text-muted-foreground hover:border-primary/10'}`}
                                                                            >
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={selectedPoints.includes(point)}
                                                                                    onChange={() => handlePointToggle(point)}
                                                                                    className="mt-0.5 w-3.5 h-3.5 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                                                                />
                                                                                <span className="text-[11px] font-display leading-relaxed">{point}</span>
                                                                            </label>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-3 animate-reveal">
                                <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">
                                    Paste Your Raw Questions
                                </label>
                                <textarea
                                    required={mode === 'B'}
                                    rows={10}
                                    placeholder="Paste questions here for automatic LaTeX formatting & layout adjustments..."
                                    value={rawQuestions}
                                    onChange={(e) => setRawQuestions(e.target.value)}
                                    className="input-base w-full text-sm font-display resize-y py-3 min-h-[300px]"
                                />
                            </div>
                        )}
                    </div>

                    {/* Question Count and Toggles */}
                    <div className="grid md:grid-cols-2 gap-8 items-end">
                        <div className="space-y-4">
                            <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                                Number of Questions
                            </label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="range"
                                    min={1}
                                    max={30}
                                    value={numQuestions > 30 ? 30 : numQuestions}
                                    onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                                    className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                                    style={{
                                        background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((Math.min(numQuestions, 30) - 1) / 29) * 100}%, hsl(var(--surface-3)) ${((Math.min(numQuestions, 30) - 1) / 29) * 100}%, hsl(var(--surface-3)) 100%)`,
                                    }}
                                />
                                <input
                                    type="number"
                                    min={1}
                                    value={numQuestions}
                                    onChange={(e) => setNumQuestions(parseInt(e.target.value, 10) || 1)}
                                    className="input-base w-16 text-center text-sm font-mono py-1 cursor-default focus:ring-0"
                                />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeName}
                                    onChange={(e) => setIncludeName(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wide">Include Name</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeDate}
                                    onChange={(e) => setIncludeDate(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wide">Include Date</span>
                            </label>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                                Working Space / Pagination
                            </label>
                            <div className="relative">
                                <select
                                    value={workingSpace}
                                    onChange={(e) => setWorkingSpace(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full py-3"
                                >
                                    {SPACING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pb-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeMarks}
                                    onChange={(e) => setIncludeMarks(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wide">Include Marks?</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={generateAnswerKey}
                                    onChange={(e) => setGenerateAnswerKey(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wide">Answer Key</span>
                            </label>
                        </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-6 relative">
                        <button
                            type="submit"
                            disabled={isCopied}
                            className={`w-full py-5 rounded-2xl font-display text-[15px] font-bold tracking-wider uppercase flex items-center justify-center gap-3 transition-all duration-500 overflow-hidden relative shadow-lg ${isCopied
                                ? 'bg-green-500/10 text-green-500 border border-green-500/40'
                                : 'bg-primary text-white hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)] hover:scale-[1.01] active:scale-100'
                                }`}
                        >
                            <div className={`absolute inset-0 bg-white/10 transition-transform duration-[3s] ${isCopied ? 'translate-x-0' : '-translate-x-full'}`} />
                            {isCopied ? (
                                <>
                                    <CheckCircle2 size={18} className="relative z-10" />
                                    <span className="relative z-10">Copied! Launching Gemini...</span>
                                </>
                            ) : (
                                <>
                                    <Copy size={18} />
                                    <span>Generate Prompt & Open Gemini</span>
                                    <ExternalLink size={14} className="opacity-50" />
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>

            {/* Global Styled Scrollbar */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: hsl(var(--surface-4) / 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: hsl(var(--primary) / 0.5);
                }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
                }
                @keyframes progress-shrink {
                    from { transform: scaleX(1); }
                    to { transform: scaleX(0); }
                }
                .animate-progress-shrink {
                    animation: progress-shrink 3s linear forwards;
                }
            `}} />

            {/* Footer */}
            <footer className="relative z-10 py-10 text-center w-full bg-cosmic/50 backdrop-blur-sm mt-auto border-t border-surface-3/30">
                <p className="text-muted-foreground/60 text-[10px] font-display uppercase tracking-[0.3em]">
                    Powered by <a href="https://myaitutor.au" className="text-primary hover:text-accent font-bold">MAIT</a> · Universal Artifact Architect
                </p>
            </footer>
        </div>
    )
}
