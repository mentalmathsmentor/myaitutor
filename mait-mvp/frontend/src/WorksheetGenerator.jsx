import { useState, useEffect } from 'react'
import { Sparkles, Copy, ExternalLink, ChevronDown, CheckCircle2, AlertTriangle, ListFilter } from 'lucide-react'

// Syllabus Data Object
const SYLLABUS_DATA = {
    "Year 11 Standard": {
        "Algebra": ["Substitution into Formulae", "Solving Linear Equations", "Linear Functions", "Simultaneous Equations"],
        "Financial Mathematics": ["Interest & Depreciation", "Earning & Managing Money", "Budgeting"],
        "Statistical Analysis": ["Data Analysis", "Relative Frequency & Probability"]
    },
    "Year 12 Standard": {
        "Algebra": ["Types of Relationships", "Simultaneous Equations (Graphical)", "Non-Linear Relationships"],
        "Measurement": ["Right-Angled Trigonometry", "Non-Right-Angled Trigonometry", "Rates & Ratios"],
        "Financial Mathematics": ["Investments & Loans", "Annuities"],
        "Statistical Analysis": ["Bivariate Data Analysis", "The Normal Distribution"],
        "Networks": ["Network Concepts", "Critical Path Analysis"]
    },
    "Year 11 Advanced": {
        "Functions": ["Working with Functions", "Linear, Quadratic and Cubic Functions", "Further Functions and Relations"],
        "Trigonometric Functions": ["Trigonometry and Measure of Angles", "Trigonometric Functions and Identities"],
        "Calculus": ["Introduction to Differentiation"],
        "Exponential and Logarithmic Functions": ["Logarithms and Exponentials"]
    },
    "Year 12 Advanced": {
        "Functions": ["Graphing Techniques"],
        "Trigonometric Functions": ["Trigonometric Functions and Graphs"],
        "Calculus": ["Differential Calculus", "Integral Calculus"],
        "Financial Mathematics": ["Modelling Financial Situations"],
        "Statistical Analysis": ["Descriptive Statistics and Bivariate Data", "Random Variables"]
    },
    "Year 12 Extension 1": {
        "Functions": ["Further Modelling with Functions", "Polynomials"],
        "Trigonometric Functions": ["Inverse Trigonometric Functions", "Further Trigonometric Identities"],
        "Calculus": ["Rates of Change", "Further Differentiation", "Further Integration"],
        "Combinatorics": ["Permutations and Combinations", "Binomial Expansion and Pascal's Triangle"],
        "Vectors": ["Introduction to Vectors"],
        "Statistical Analysis": ["The Binomial Distribution"]
    },
    "Year 12 Extension 2": {
        "Proof": ["The Nature of Proof", "Further Proof by Mathematical Induction"],
        "Vectors": ["Further Work with Vectors"],
        "Complex Numbers": ["Introduction to Complex Numbers", "Using Complex Numbers"],
        "Calculus": ["Further Integration"],
        "Mechanics": ["Applications of Calculus to Mechanics"]
    }
}

const YEAR_LEVELS = Object.keys(SYLLABUS_DATA);
const SPACING_OPTIONS = ['working blank space (Math)', 'Ruled lines (Writing)', 'Compact (No space)']

export default function WorksheetGenerator() {
    // State
    const [schoolName, setSchoolName] = useState('')
    const [classYear, setClassYear] = useState(YEAR_LEVELS[3]) // Year 12 Advanced
    const [topic, setTopic] = useState('')
    const [customTopic, setCustomTopic] = useState('')
    const [selectedPoints, setSelectedPoints] = useState([])
    const [includeName, setIncludeName] = useState(true)
    const [includeDate, setIncludeDate] = useState(true)
    const [mode, setMode] = useState('A')
    const [numQuestions, setNumQuestions] = useState(10)
    const [rawQuestions, setRawQuestions] = useState('')
    const [workingSpace, setWorkingSpace] = useState(SPACING_OPTIONS[0])
    const [includeMarks, setIncludeMarks] = useState(false)
    const [generateAnswerKey, setGenerateAnswerKey] = useState(false)

    const [isCopied, setIsCopied] = useState(false)
    const [showWarning, setShowWarning] = useState(false)

    // Derived Topics based on ClassYear
    const availableTopics = SYLLABUS_DATA[classYear] ? [...Object.keys(SYLLABUS_DATA[classYear]), "Other"] : ["Other"];

    // Derived Dot Points based on ClassYear and Topic
    const availablePoints = (SYLLABUS_DATA[classYear] && SYLLABUS_DATA[classYear][topic]) ? SYLLABUS_DATA[classYear][topic] : [];

    // Effects
    useEffect(() => {
        setTopic(availableTopics[0]);
    }, [classYear]);

    useEffect(() => {
        setSelectedPoints([]);
    }, [topic]);

    const handlePointToggle = (point) => {
        setSelectedPoints(prev =>
            prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point]
        );
    };

    const generatePrompt = () => {
        const finalTopic = topic === 'Other' && customTopic.trim() ? customTopic : topic;

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
                ? `strictly targeting these syllabus points: ${selectedPoints.join(', ')}`
                : `targeting the topic: ${finalTopic}`;
            contentString = `Please generate ${numQuestions} NESA-style questions ${pointsText}.`;
        } else {
            contentString = `Please format these exact questions: ${rawQuestions}`;
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
    {\\Large \\textbf{ ${finalTopic} }}
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

**4. ANSWER KEY:**
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
            {/* Warning Toast */}
            {showWarning && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-bounce-subtle">
                    <div className="bg-surface-1 border border-primary/40 rounded-2xl p-4 shadow-2xl flex items-center gap-4 max-w-sm">
                        <div className="bg-primary/20 p-2 rounded-xl">
                            <Sparkles className="text-primary w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-display font-bold text-foreground">🚀 Don't forget to enable Canvas!</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Choose 'Thinking' for fast generation and 'Pro' for power.</p>
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
                <div className="tag animate-reveal animate-reveal-2 mb-6 inline-flex">
                    <Sparkles size={12} />
                    A.G.E. PROMPT ENGINE V2
                </div>
                <h2 className="animate-reveal animate-reveal-3 text-4xl md:text-6xl font-display font-bold tracking-tight mb-4">
                    <span className="gradient-text-primary">Universal Worksheet Generator</span>
                </h2>
                <p className="animate-reveal animate-reveal-4 text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    Personalized HSC exam-prep. Select your syllabus points and let Gemini handle the LaTeX.
                </p>
            </div>

            {/* Main Form Container */}
            <div className="relative z-10 w-full max-w-3xl px-6 pb-24">
                <form onSubmit={handleGenerate} className="glass-card rounded-3xl p-6 md:p-10 space-y-8 animate-reveal animate-reveal-5">

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

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Topic Dynamic Selector */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground">
                                Select Topic Area
                            </label>
                            <div className="relative">
                                <select
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full py-3"
                                >
                                    {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        {topic === 'Other' && (
                            <div className="space-y-2 animate-reveal">
                                <label className="block text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground">
                                    Custom Topic Label
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g., Trigonometry"
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                    className="input-base w-full text-sm font-display py-3"
                                />
                            </div>
                        )}
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

                    {/* Checkbox Checklist or Manual Area */}
                    <div className="bg-surface-1/30 p-6 rounded-2xl border border-surface-3/50 min-h-[160px]">
                        {mode === 'A' ? (
                            <div className="space-y-4 animate-reveal">
                                {availablePoints.length > 0 ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <ListFilter size={14} className="text-primary" />
                                            <span className="text-[10px] font-display uppercase tracking-wider text-primary font-bold">Dot Points Checklist</span>
                                        </div>
                                        <div className="grid gap-3">
                                            {availablePoints.map(point => (
                                                <label key={point} className="flex items-start gap-3 p-3 rounded-xl border border-surface-3 bg-surface-2/30 cursor-pointer hover:border-primary/20 transition-all group">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPoints.includes(point)}
                                                        onChange={() => handlePointToggle(point)}
                                                        className="mt-0.5 w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                                    />
                                                    <span className={`text-xs font-display leading-tight transition-colors ${selectedPoints.includes(point) ? 'text-foreground' : 'text-muted-foreground'}`}>{point}</span>
                                                </label>
                                            ))}
                                            <p className="text-[10px] text-muted-foreground italic mt-2 opacity-70">
                                                If your topic isn't listed, please select 'Other' and you can upload your syllabus document directly to Gemini.
                                            </p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <AlertTriangle size={24} className="mx-auto text-muted-foreground mb-3 opacity-30" />
                                        <p className="text-xs text-muted-foreground font-display">Select a topic to reveal syllabus dot-points.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3 animate-reveal">
                                <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">
                                    Paste Your Raw Questions
                                </label>
                                <textarea
                                    required={mode === 'B'}
                                    rows={5}
                                    placeholder="Paste questions here for automatic LaTeX formatting & layout adjustments..."
                                    value={rawQuestions}
                                    onChange={(e) => setRawQuestions(e.target.value)}
                                    className="input-base w-full text-sm font-display resize-y py-3"
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
                .animate-bounce-subtle {
                    animation: bounce-subtle 3s infinite;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translate(-50%, 0); }
                    50% { transform: translate(-50%, -10px); }
                }
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                    -webkit-appearance: none; 
                    margin: 0; 
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
