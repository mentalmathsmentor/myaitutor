import { useState } from 'react'
import { Sparkles, Copy, ExternalLink, ChevronDown, CheckCircle2 } from 'lucide-react'

// Constants for dropdowns
const YEAR_LEVELS = ['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11 Standard', 'Year 11 Advanced', 'Year 12 Standard', 'Year 12 Advanced', 'Extension 1', 'Extension 2']
const TOPICS = ['Algebra', 'Geometry', 'Biology', 'Chemistry', 'English', 'History', 'Other']
const SPACING_OPTIONS = ['working blank space (Math)', 'Ruled lines (Writing)', 'Compact (No space)']

export default function WorksheetGenerator() {
    // State
    const [schoolName, setSchoolName] = useState('')
    const [classYear, setClassYear] = useState('Year 10')
    const [topic, setTopic] = useState('Algebra')
    const [customTopic, setCustomTopic] = useState('')
    const [includeName, setIncludeName] = useState(true)
    const [includeDate, setIncludeDate] = useState(true)
    const [mode, setMode] = useState('A')
    const [numQuestions, setNumQuestions] = useState(10)
    const [instructions, setInstructions] = useState('')
    const [rawQuestions, setRawQuestions] = useState('')
    const [workingSpace, setWorkingSpace] = useState(SPACING_OPTIONS[0])
    const [includeMarks, setIncludeMarks] = useState(false)
    const [generateAnswerKey, setGenerateAnswerKey] = useState(false)
    
    const [isCopied, setIsCopied] = useState(false)

    const generatePrompt = () => {
        const finalTopic = topic === 'Other' && customTopic.trim() ? customTopic : topic;
        
        let headerString = '';
        if (includeName && includeDate) headerString = 'Name: \\makebox[4cm]{\\hrulefill} \\quad Date: \\makebox[2.5cm]{\\hrulefill}';
        else if (includeName) headerString = 'Name: \\makebox[4cm]{\\hrulefill}';
        else if (includeDate) headerString = 'Date: \\makebox[2.5cm]{\\hrulefill}';
        
        let marksLogic = includeMarks ? 'Right-align marks using \\hfill \\textbf{[X Marks]}' : 'Do not assign marks';
        let answerKeyLogic = generateAnswerKey ? 'Insert \\newpage at the end and provide a Teacher Answer Key' : 'Do not generate an answer key';
        
        let contentString = '';
        if (mode === 'A') {
            contentString = `Please generate ${numQuestions} NESA-style questions based on this syllabus: ${instructions}`;
        } else {
            contentString = `Please format these exact questions: ${rawQuestions}`;
        }
        
        const promptString = `Act as the Universal Artifact Architect, an expert LaTeX Document Engine and Curriculum Designer. 

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
\\lhead{\\textbf{ ${schoolName || '[SCHOOL NAME]'} - ${classYear} }}
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

**2. LAYOUT RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment. Let LaTeX handle numbering.
* LINE BREAKS: Do NOT use \\\\ for line breaks within questions. Use a blank line (double return).
* Spacing: Apply ${workingSpace}.
* Marks: ${marksLogic}.

**3. PAGINATION & FOOTER:**
* Before every new \\item, insert \\needspace{6cm}.
* Insert this footer: \\vfill \\hrule \\vspace{0.2cm} \\footnotesize \\textbf{AI SELF-CHECK:} \\textit{Ask AI for a hint, not the answer.}

**4. ANSWER KEY:**
${answerKeyLogic}.

***
**USER CONTENT TO PROCESS:**
${contentString}
`;
        return promptString;
    }

    const handleGenerate = async (e) => {
        e.preventDefault()
        const promptText = generatePrompt();
        try {
            await navigator.clipboard.writeText(promptText);
            setIsCopied(true);
            setTimeout(() => {
                setIsCopied(false);
                window.open('https://gemini.google.com/app', '_blank');
            }, 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            prompt(
                "Your browser strictly blocked clipboard access. Please manually copy this master prompt, then paste in Gemini:", 
                promptText
            );
            window.open('https://gemini.google.com/app', '_blank');
        }
    }

    return (
        <div className="min-h-screen bg-cosmic noise-overlay selection:bg-primary/30 flex flex-col">
            {/* Decorative grid overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Title */}
            <div className="relative z-10 text-center px-6 pt-4 pb-8">
                <div className="tag animate-reveal animate-reveal-2 animate-float mb-6 inline-flex">
                    <Sparkles size={12} />
                    A.G.E. PROMPT ENGINE
                </div>
                <h2 className="animate-reveal animate-reveal-3 text-3xl md:text-5xl font-display font-bold tracking-tight mb-4">
                    <span className="gradient-text-primary">Universal Worksheet Generator</span>
                </h2>
                <p className="animate-reveal animate-reveal-4 text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
                    Instantly craft perfectly formatted, printable worksheets using Google Gemini's Canvas.
                </p>
            </div>

            {/* Form */}
            <div className="relative z-10 max-w-2xl mx-auto px-6 pb-16 w-full">
                <form onSubmit={handleGenerate} className="glass-card rounded-2xl p-6 md:p-8 space-y-6 animate-reveal animate-reveal-5">

                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* School Name */}
                        <div className="space-y-2">
                            <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                School / Institution Name
                            </label>
                            <input
                                type="text"
                                placeholder="(Optional)"
                                value={schoolName}
                                onChange={(e) => setSchoolName(e.target.value)}
                                className="input-base w-full text-sm font-display"
                            />
                        </div>

                        {/* Year Level */}
                        <div className="space-y-2">
                            <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                Class / Year Level
                            </label>
                            <div className="relative">
                                <select
                                    value={classYear}
                                    onChange={(e) => setClassYear(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full"
                                >
                                    {YEAR_LEVELS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Topic */}
                        <div className="space-y-2">
                            <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                Topic
                            </label>
                            <div className="relative">
                                <select
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full"
                                >
                                    {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        {/* Custom Topic (Conditional) */}
                        {topic === 'Other' && (
                            <div className="space-y-2 animate-reveal">
                                <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                    Custom Topic Name
                                </label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g., Quantum Mechanics"
                                    value={customTopic}
                                    onChange={(e) => setCustomTopic(e.target.value)}
                                    className="input-base w-full text-sm font-display"
                                />
                            </div>
                        )}
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-3">
                        <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                            Student Header Details
                        </label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeName}
                                    onChange={(e) => setIncludeName(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-3 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-display">Include Name Space</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeDate}
                                    onChange={(e) => setIncludeDate(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-3 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-display">Include Date Space</span>
                            </label>
                        </div>
                    </div>
                    
                    <div className="divider-glow" />

                    {/* Worksheet Mode */}
                    <div className="space-y-3">
                        <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                            Worksheet Mode
                        </label>
                        <div className="space-y-2">
                            <label className="flex items-start gap-3 p-3 rounded-xl border border-surface-3 bg-surface-1/50 cursor-pointer hover:border-primary/30 transition-all">
                                <input
                                    type="radio"
                                    name="worksheetMode"
                                    value="A"
                                    checked={mode === 'A'}
                                    onChange={() => setMode('A')}
                                    className="mt-0.5 w-4 h-4 text-primary bg-surface-2 border-surface-3 focus:ring-primary/20"
                                />
                                <div>
                                    <div className="font-display font-medium text-foreground text-sm">Generate Questions from Topic/Syllabus</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                        Provide instructions and let AI write the questions. 
                                        (<a href="https://educationstandards.nsw.edu.au/wps/portal/nesa/k-10/understanding-the-curriculum/syllabuses-a-z" target="_blank" rel="noreferrer" className="text-primary hover:underline">NESA Syllabus</a>)
                                    </div>
                                </div>
                            </label>
                            <label className="flex items-center gap-3 p-3 rounded-xl border border-surface-3 bg-surface-1/50 cursor-pointer hover:border-primary/30 transition-all">
                                <input
                                    type="radio"
                                    name="worksheetMode"
                                    value="B"
                                    checked={mode === 'B'}
                                    onChange={() => setMode('B')}
                                    className="w-4 h-4 text-primary bg-surface-2 border-surface-3 focus:ring-primary/20"
                                />
                                <span className="font-display font-medium text-foreground text-sm">Format My Own Questions</span>
                            </label>
                        </div>
                    </div>

                    {/* Conditional Content Area */}
                    <div className="space-y-4 pt-2">
                        {mode === 'A' ? (
                            <div className="space-y-4 animate-reveal">
                                <div className="space-y-2">
                                    <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                        Number of Questions
                                        <span className="text-primary ml-2 text-sm font-bold normal-case">{numQuestions}</span>
                                    </label>
                                    <input
                                        type="range"
                                        min={1}
                                        max={30}
                                        step={1}
                                        value={numQuestions}
                                        onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                                        className="w-full h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50"
                                        style={{
                                            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((numQuestions - 1) / 29) * 100}%, hsl(var(--surface-2)) ${((numQuestions - 1) / 29) * 100}%, hsl(var(--surface-2)) 100%)`,
                                        }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                        Syllabus / Topic Instructions
                                    </label>
                                    <textarea
                                        required={mode === 'A'}
                                        rows={4}
                                        placeholder="Paste syllabus dot points, learning objectives, or specific mathematical concepts here..."
                                        value={instructions}
                                        onChange={(e) => setInstructions(e.target.value)}
                                        className="input-base w-full text-sm font-display resize-y"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 animate-reveal">
                                <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                    Paste Your Raw Questions
                                </label>
                                <textarea
                                    required={mode === 'B'}
                                    rows={5}
                                    placeholder="Paste your unformatted questions here. The AI will perfectly typeset them and add the designated working space..."
                                    value={rawQuestions}
                                    onChange={(e) => setRawQuestions(e.target.value)}
                                    className="input-base w-full text-sm font-display resize-y"
                                />
                            </div>
                        )}
                    </div>
                    
                    <div className="divider-glow" />

                    {/* Layout & Extras */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="block text-xs font-display uppercase tracking-wider text-muted-foreground">
                                Working Space
                            </label>
                            <div className="relative">
                                <select
                                    value={workingSpace}
                                    onChange={(e) => setWorkingSpace(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full"
                                >
                                    {SPACING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-3 sm:pt-6">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeMarks}
                                    onChange={(e) => setIncludeMarks(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-3 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-display">Include Marks?</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={generateAnswerKey}
                                    onChange={(e) => setGenerateAnswerKey(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-3 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors font-display">Generate Answer Key?</span>
                            </label>
                        </div>
                    </div>

                    {/* Action Area */}
                    <div className="pt-4 drop-shadow-lg">
                        <button
                            type="submit"
                            disabled={isCopied}
                            className={`w-full py-4 rounded-xl font-display text-lg flex items-center justify-center gap-3 transition-all duration-300 ${
                                isCopied 
                                ? 'bg-green-500/20 text-green-400 border border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                                : 'btn-primary'
                            }`}
                        >
                            {isCopied ? (
                                <>
                                    <CheckCircle2 size={20} className="animate-pulse" />
                                    Copied! Opening Gemini...
                                </>
                            ) : (
                                <>
                                    <Copy size={20} />
                                    Generate Prompt & Open Gemini <ExternalLink size={16} className="opacity-70" />
                                </>
                            )}
                        </button>

                        <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/20 flex gap-3 text-left">
                            <span className="text-accent shrink-0 text-xl leading-none">⚠️</span>
                            <p className="text-xs text-muted-foreground leading-relaxed font-display">
                                <strong className="text-accent font-bold">Tip:</strong> Ensure the <strong className="text-foreground">Canvas</strong> feature is enabled in your Gemini text-box for the split-screen preview with editing! Use "Thinking" for fastest code generation.
                            </p>
                        </div>
                    </div>
                </form>
            </div>

            {/* Footer */}
            <footer className="relative z-10 py-6 text-center border-t border-surface-2 mt-auto">
                <p className="text-muted-foreground text-sm font-display">
                    Built by <a href="https://myaitutor.au" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-accent transition-colors">MAIT</a> · Universal Prompt Engine
                </p>
            </footer>
        </div>
    )
}
