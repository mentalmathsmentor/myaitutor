import { useState, useEffect, useMemo, useRef } from 'react'
import { Sparkles, CheckCircle2, AlertTriangle, X, ArrowRight, ChevronDown, ExternalLink } from 'lucide-react'

// Wizard Sub-components
import Step1YearLevel from './components/worksheet/Step1YearLevel'
import Step2Topics from './components/worksheet/Step2Topics'
import Step3Configuration from './components/worksheet/Step3Configuration'
import LivePreviewPanel from './components/worksheet/LivePreviewPanel'

import syllabusData from './syllabus_data.json'
import stageSubjects from './stage_subjects.json'
import canvasHint from './assets/gemini-canvas-final.png'
import modelSelectorHint from './assets/gemini-model-selector.png'

const STAGES = Object.keys(stageSubjects);
const DIFFICULTY_OPTIONS = ['Mixed', 'Easy → Hard Progression', 'Mostly Easy', 'Mostly Hard', 'Exam-Style']

export default function WorksheetGenerator() {
    // Refs for mount tracking
    const isInitialMount = useRef(true);

    // State
    const [schoolName, setSchoolName] = useState('')

    // New Stage/Subject State
    const [selectedStage, setSelectedStage] = useState(() => localStorage.getItem('mait_ws_stage') || STAGES[4])
    const [selectedSubject, setSelectedSubject] = useState(() => {
        const savedStage = localStorage.getItem('mait_ws_stage') || STAGES[4];
        const savedSubject = localStorage.getItem('mait_ws_subject');
        if (savedSubject && (savedSubject === 'Other' || (stageSubjects[savedStage] && stageSubjects[savedStage][savedSubject]))) {
            return savedSubject;
        }
        return stageSubjects[savedStage] ? Object.keys(stageSubjects[savedStage])[0] : 'Mathematics';
    })
    const [customSubject, setCustomSubject] = useState('')
    // Wizard State
    const [currentStep, setCurrentStep] = useState(1)
    // Advanced injection toggles
    const [syllabusSource, setSyllabusSource] = useState('ai') // 'ai' | 'upload' | 'nesa'
    const [textbookResources, setTextbookResources] = useState('')
    const [pedagogicalSpotError, setPedagogicalSpotError] = useState(() => localStorage.getItem('mait_ws_pedagogicalSpotError') === 'true')
    const [pedagogicalParameterShift, setPedagogicalParameterShift] = useState(() => localStorage.getItem('mait_ws_pedagogicalParameterShift') === 'true')
    const [pedagogicalLimitCase, setPedagogicalLimitCase] = useState(() => localStorage.getItem('mait_ws_pedagogicalLimitCase') === 'true')
    const [removeWatermark, setRemoveWatermark] = useState(() => localStorage.getItem('mait_ws_removeWatermark') === 'true')
    const [numInput, setNumInput] = useState('') // Local state for raw input string
    const [firstTimeMode, setFirstTimeMode] = useState(false)

    const [selectedPoints, setSelectedPoints] = useState(() => {
        try {
            const savedStage = localStorage.getItem('mait_ws_stage') || STAGES[4];
            const savedSubject = localStorage.getItem('mait_ws_subject') || (stageSubjects[savedStage] ? Object.keys(stageSubjects[savedStage])[0] : 'Mathematics');
            const saved = localStorage.getItem(`mait_ws_pts_${savedStage}_${savedSubject}`);
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    })
    const [includeName, setIncludeName] = useState(() => {
        const saved = localStorage.getItem('mait_ws_name');
        return saved !== null ? saved === 'true' : true;
    })
    const [includeDate, setIncludeDate] = useState(() => {
        const saved = localStorage.getItem('mait_ws_date');
        return saved !== null ? saved === 'true' : true;
    })
    const [mode, setMode] = useState('A')
    const [numQuestions, setNumQuestions] = useState(() => parseInt(localStorage.getItem('mait_ws_numQuestions') || '10'))
    const [rawQuestions, setRawQuestions] = useState('')
    const [workingSpace, setWorkingSpace] = useState(() => localStorage.getItem('mait_ws_workingSpace') || 'Dynamic Space')
    const [includeMarks, setIncludeMarks] = useState(() => localStorage.getItem('mait_ws_marks') === 'true')
    const [generateAnswerKey, setGenerateAnswerKey] = useState(() => localStorage.getItem('mait_ws_answerKey') === 'true')
    const [difficulty, setDifficulty] = useState(() => localStorage.getItem('mait_ws_difficulty') || DIFFICULTY_OPTIONS[0])
    const [includeCanvasSetup, setIncludeCanvasSetup] = useState(() => localStorage.getItem('mait_ws_canvasSetup') === 'true')

    const [isCopied, setIsCopied] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const [showCloseButton, setShowCloseButton] = useState(false)
    const [showErrorToast, setShowErrorToast] = useState(false)
    const [isShaking, setIsShaking] = useState(false)

    const launchTimeoutRef = useRef(null);

    // Save state to localStorage
    useEffect(() => {
        localStorage.setItem('mait_ws_stage', selectedStage);
        localStorage.setItem('mait_ws_subject', selectedSubject);
        localStorage.setItem('mait_ws_numQuestions', numQuestions.toString());
        localStorage.setItem('mait_ws_workingSpace', workingSpace);
        localStorage.setItem('mait_ws_difficulty', difficulty);
        localStorage.setItem('mait_ws_marks', includeMarks.toString());
        localStorage.setItem('mait_ws_answerKey', generateAnswerKey.toString());
        localStorage.setItem('mait_ws_name', includeName.toString());
        localStorage.setItem('mait_ws_date', includeDate.toString());
        localStorage.setItem('mait_ws_canvasSetup', includeCanvasSetup.toString());
        localStorage.setItem('mait_ws_pedagogicalSpotError', pedagogicalSpotError.toString());
        localStorage.setItem('mait_ws_pedagogicalParameterShift', pedagogicalParameterShift.toString());
        localStorage.setItem('mait_ws_pedagogicalLimitCase', pedagogicalLimitCase.toString());
        localStorage.setItem('mait_ws_removeWatermark', removeWatermark.toString());
    }, [selectedStage, selectedSubject, numQuestions, workingSpace, difficulty, includeMarks, generateAnswerKey, includeName, includeDate, includeCanvasSetup, pedagogicalSpotError, pedagogicalParameterShift, pedagogicalLimitCase, removeWatermark]);

    // Sync numInput when numQuestions changes (except when numInput is actively being edited)
    useEffect(() => {
        if (numInput === '' || parseInt(numInput, 10) !== numQuestions) {
            setNumInput(numQuestions.toString());
        }
    }, [numQuestions]);

    // Update subject list when stage changes
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        const subjectsForStage = stageSubjects[selectedStage];
        if (subjectsForStage) {
            const firstSubject = Object.keys(subjectsForStage)[0];
            setSelectedSubject(firstSubject);
            setCustomSubject('');
        } else {
            setSelectedSubject('Other');
        }
    }, [selectedStage]);

    // Persist selected points to localStorage based on Stage and Subject
    useEffect(() => {
        localStorage.setItem(`mait_ws_pts_${selectedStage}_${selectedSubject}`, JSON.stringify(selectedPoints));
    }, [selectedPoints, selectedStage, selectedSubject]);

    const isFirstPointsLoad = useRef(true);
    // Load saved points initially, then clear on Stage/Subject change
    useEffect(() => {
        if (isFirstPointsLoad.current) {
            isFirstPointsLoad.current = false;
            try {
                const saved = localStorage.getItem(`mait_ws_pts_${selectedStage}_${selectedSubject}`);
                setSelectedPoints(saved ? JSON.parse(saved) : []);
            } catch { setSelectedPoints([]); }
            return;
        }
        setSelectedPoints([]);
    }, [selectedStage, selectedSubject]);

    // Auto-switch to Question/Topic Specification (Mode B) if Subject is 'Other'
    useEffect(() => {
        if (selectedSubject === 'Other') {
            setMode('B');
        }
    }, [selectedSubject]);

    // NOTE: All syllabus tree logic, search, expand/collapse, and point toggling
    // is now encapsulated inside Step2Topics sub-component.
    // syllabusData is passed directly to Step2Topics as SYLLABUS_DATA prop.


    const generatePrompt = () => {
        const displaySubject = selectedSubject === 'Other' && customSubject.trim() ? customSubject : selectedSubject;

        // Header Logic
        let lheadContent = `\\textbf{ ${selectedStage} - ${displaySubject} }`;
        if (schoolName.trim()) {
            lheadContent = `\\textbf{ ${schoolName} - ${selectedStage} - ${displaySubject} }`;
        }

        let headerString = '';
        if (includeName && includeDate) headerString = '\\noindent\\textbf{Name:} \\makebox[6cm]{\\hrulefill} \\hfill \\textbf{Date:} \\makebox[3cm]{\\hrulefill}';
        else if (includeName) headerString = '\\noindent\\textbf{Name:} \\makebox[6cm]{\\hrulefill}';
        else if (includeDate) headerString = '\\noindent\\textbf{Date:} \\makebox[3cm]{\\hrulefill}';

        let marksLogic = includeMarks ? '\\hfill\\quad\\textbf{[X Marks]}' : 'Do not assign marks';
        let dynamicSpacing = numQuestions > 20 ? '2cm' : (numQuestions > 10 ? '4cm' : '6cm');
        let spacingLogic = workingSpace === 'Two-column Compact'
            ? 'For the main worksheet, you MUST use the `multicols` environment with 2 columns (`\\begin{multicols}{2} ... \\end{multicols}`). Use the enumerate environment inside the multicols. Do not add large blank spaces between questions, keep it compact.'
            : workingSpace === 'Dynamic Space'
                ? 'LAYOUT DIRECTIVE: Use dynamic spacing. If math graphing, add axes. If trig graph, shift axes appropriately and enforce strict domain bounds (e.g. 0 to 2pi). If worded question, add ruled lines of appropriate density using `\\vspace{0.8cm}\\noindent\\rule{\\linewidth}{0.4pt}` repeated for each line needed. For pure mathematical calculations, leave blank working space using \\vspace{4cm}.'
                : `Use \\vspace{${dynamicSpacing}} between questions.`;

        let answerKeyLogic = generateAnswerKey
            ? 'Insert \\newpage at the end and provide a Teacher Answer Key. The Answer Key MUST be formatted in a two-column layout using `\\begin{multicols}{2}` and `\\end{multicols}`, separated by the vertical rule.'
            : '';

        // Syllabus context based on new syllabusSource state
        let contextPrefix = '';
        if (syllabusSource === 'upload' || textbookResources.trim()) {
            contextPrefix += 'Using the context files/information attached to this prompt:\n';
            if (syllabusSource === 'upload') contextPrefix += '- Strictly adhere to the scope and constraints of the attached Syllabus.\n';
            if (textbookResources.trim()) contextPrefix += `- Strongly model questions on the style, structure, and difficulty found in: ${textbookResources}.\n`;
            contextPrefix += '\n';
        }
        if (syllabusSource === 'nesa') {
            contextPrefix += 'CRITICAL: You are authorized and encouraged to Search/Reference the official NESA NSW Syllabus requirements for the selected Stage and Subject to ensure 100% curriculum alignment.\n\n';
        }

        let pedagogyPrefix = '';
        if (pedagogicalSpotError || pedagogicalParameterShift || pedagogicalLimitCase) {
            pedagogyPrefix += 'PEDAGOGY DIRECTIVE: You must include the following special question types in your worksheet:\n';
            if (pedagogicalSpotError) pedagogyPrefix += '- **Spot the Error:** Provide a deliberately flawed, step-by-step mathematical working. Ask the student to identify the specific line where the error occurred and explain why. Wrap this specific question in a `\\begin{tcolorbox} ... \\end{tcolorbox}` environment. This must be worth exactly 1 mark.\n';
            if (pedagogicalParameterShift) pedagogyPrefix += '- **Parameter Shift:** Ask the student to explain how changing a specific constant or parameter in the system/equation alters the overall behavior or graph, without requiring a full algebraic re-solve.\n';
            if (pedagogicalLimitCase) pedagogyPrefix += '- **Limit Case Analysis:** Ask the student to evaluate the system/equation at an extreme boundary condition (e.g., as x approaches infinity, or as a physical mass approaches zero) and interpret the qualitative meaning of that result.\n';
            pedagogyPrefix += '\n';
        }

        let contentString = '';
        if (mode === 'A') {
            const explicitTopics = selectedPoints.length > 0
                ? `strictly targeting these specific syllabus dot-points and topics: \n${selectedPoints.map(p => `- ${p}`).join('\n')}`
                : `targeting the general curriculum for ${displaySubject}`;

            const difficultyText = difficulty === 'Mixed' ? 'Use a balanced mix of easy, medium, and hard questions.' :
                difficulty === 'Easy → Hard Progression' ? 'Start with easy questions and progressively increase difficulty to hard.' :
                    difficulty === 'Mostly Easy' ? 'Keep most questions easy/accessible, with 1-2 challenging ones at the end.' :
                        difficulty === 'Mostly Hard' ? 'Focus on challenging, exam-level questions with minimal easy questions.' :
                            'Match the difficulty and style of real exam questions.';
            contentString = `${contextPrefix}${pedagogyPrefix}Please generate ${numQuestions} professional-level exam questions ${explicitTopics} for ${selectedStage} ${displaySubject}.\n\n**DIFFICULTY:** ${difficultyText}`;
        } else {
            const syllabusContext = selectedPoints.length > 0
                ? `\n\nReference Syllabus Points selected by user:\n${selectedPoints.map(p => `- ${p}`).join('\n')}`
                : '';
            contentString = `${contextPrefix}${pedagogyPrefix}Please format these exact questions/topics into a professional worksheet for ${selectedStage} ${displaySubject}: ${rawQuestions}${syllabusContext}`;
        }

        // Title based on selected stage/subject (simplified, no longer depends on legacy tree)
        const promptTitle = `${selectedStage} ${displaySubject} Worksheet`;

        let reminderText = "";

        if (firstTimeMode) {
            reminderText += "**Welcome!** I am the Universal Artifact Architect. I can generate complete worksheets for you. Simply ask me to tweak the difficulty, change the topic focus, or add more visual diagrams. Once rendered, you can click the canvas window to highlight and edit specific questions on the fly!\n\n";
        }

        reminderText += "Reminder: Feel free to ask me to make changes! You can highlight sections in the Canvas window by clicking the dotted box with the arrow to ask for specific edits.";

        if (includeCanvasSetup) {
            reminderText += "\n\n**Debug Guide / Canvas Setup:**\nNo Code/Preview window? Click **Tools**, select **Canvas**, and ask me to output in Canvas! :D";
        }

        if (syllabusSource === 'upload') {
            reminderText += "\n\n*(Please paste/upload your syllabus document now.)*";
        }

        if (textbookResources) {
            reminderText += "\n\n*(Reminder: You indicated you'd use a specific textbook. Please type the textbook name into the chat now.)*";
        }

        reminderText += "\n\n**Disclaimer:** I'm just a robot, so I can get things wrong - check the questions! You can also copy-paste the code into another chat and ask it to check.";

        return `**${promptTitle}**\n\nAct as the Universal Artifact Architect, an expert LaTeX Document Engine and Curriculum Designer. 

Your job is to create a professional, compile-ready PDF worksheet. 

**CRITICAL DIRECTIVE:** 
You must structure your output exactly like this. First, output this exact message: '${reminderText}' Second, output the complete, compile-ready LaTeX code inside ONE SINGLE code block starting with \`\`\`latex and ending with \`\`\`. Do not output any other conversational text.

${includeMarks ? '**LATEX DIRECTIVE FOR MARKS:** Always place the marks (e.g., [2 Marks]) at the very end of the question text line, separated by `\\hfill\\quad`. Ensure they are strictly right-aligned to the margin to maintain a professional exam layout.\n' : ''}

**CRITICAL REASONING DIRECTIVE (INTERNAL VERIFICATION):**
Before generating the final LaTeX code block, you MUST use your internal thinking/scratchpad phase to rigorously construct and verify every single question and answer. 
You are a senior mathematics and science mentor. Do not accept your first thought as correct.
For every question you generate:
1. Solve the question step-by-step internally.
2. VERIFY the solution using a secondary, distinct mathematical or logical method (e.g., if you integrated, differentiate the result. If physics, check unit dimensional analysis. If probability, check edge cases).
3. If the secondary method reveals a hallucination or error, discard the question and generate a new one.
4. ONLY proceed to LaTeX formatting once the math/logic is 100% verified.
5. Keep all verification strictly internal. Do NOT leak these thinking steps into the final output.

**CRITICAL LATEX QUALITY CONTROLS:**
1. Never use Unicode characters for math (like √ or α). Always use standard LaTeX syntax (like \\sqrt{} or \\alpha).
2. Ensure every \\begin{enumerate} has a strictly matching \\end{enumerate} tag to prevent compilation failures.
3. If a question involves Pythagoras, Trigonometry, Circular Measure, or Geometry, you MUST generate a corresponding TikZ diagram.

**1. THE PREAMBLE:**
\\documentclass[12pt, a4paper]{article}
\\usepackage[top=1.5cm, bottom=2.5cm, left=1.5cm, right=1.5cm, headheight=30pt, footskip=30pt]{geometry}
\\usepackage{amsmath, amssymb, fancyhdr, graphicx, tikz, enumitem, tcolorbox, needspace, multicol}
\\usepackage[none]{hyphenat}
\\usepackage[hidelinks]{hyperref} 
\\setlength{\\columnsep}{1cm}
\\setlength{\\columnseprule}{0.4pt}

\\pagestyle{fancy}
\\fancyhf{}
\\lhead{ ${lheadContent} }
\\rhead{}
\\cfoot{Page \\thepage}
${removeWatermark ? '\\rfoot{}' : '\\rfoot{\\textcolor{gray!50}{\\tiny \\textit{myaitutor.au/worksheets}}}'}
\\renewcommand{\\headrulewidth}{0.4pt}
\\setlength{\\headheight}{30pt}
\\begin{document}
\\sloppy
${headerString ? `\n${headerString}\n\\vspace{0.8cm}\n` : ''}
\\begin{center}
    {\\Large \\textbf{ ${mode === 'A' ? 'Syllabus Focus: Mixed Topics' : 'Custom Worksheet'} }}
\\end{center}
\\vspace{0.5cm}

${contentString}

${spacingLogic}

${marksLogic}

${answerKeyLogic}

**2. LAYOUT & FORMATTING RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment. Let LaTeX handle numbering. Do NOT use custom labels like \\item[\\textbf{Question 1:}].
* LINE BREAKS: Do NOT use \\\\ for line breaks within questions. Use a blank line (double return) to ensure text aligns to the left margin perfectly.
* Spacing: ${spacingLogic}
* **MARKS ALIGNMENT (CRITICAL):** ${marksLogic === 'Do not assign marks' ? marksLogic : `If assigning marks, you MUST use \`${marksLogic}\` at the very end of the question text. The \\mbox{} is critical to prevent the number and the word 'Marks' from being split across two lines. Do NOT let the marks wrap to a new line awkwardly. Ensure they are pushed completely flush-right.`}
* **MANDATORY DIAGRAMS & SHAPES:** If a question mentions a shape, graph, diagram, angle relationship (e.g., "vertically opposite", "transversal"), or geometric property, you MUST generate the corresponding TikZ code to draw a clean, professional diagram below the question text.
* **PREAMBLE & GEOMETRY RULE:** When setting up the document geometry, you MUST explicitly define bottom=2.5cm, footskip=30pt, and headheight=30pt. Do not use a bottom margin smaller than 2.5cm. This is strictly required to prevent multicols content and vertical rules from crashing into the custom multi-line footer. Use exact geometry: \\usepackage[top=1.5cm, bottom=2.5cm, left=1.5cm, right=1.5cm, headheight=30pt, footskip=30pt]{geometry}
* **FOOTER RESTRAINT RULE:** Do not include multi-line footers or the "AI SELF-CHECK" text. Keep the center footer strictly to the page number using \\cfoot{Page \\thepage}. This is crucial to prevent the footer from colliding with the multicols vertical divider at the bottom of the page.

**3. PAGINATION & FOOTER:**
* Before every new \\item, insert \\needspace{6cm}.

**4. SCALING FOR 30+ QUESTIONS:**
If the request is for more than 20 questions, ensure you maintain high quality and varied task difficulty. For 30+ questions, you may use smaller spacing segments to fit the content while maintaining readability.

**5. ANSWER KEY:**
${answerKeyLogic}.

***
**USER CONTENT TO PROCESS:**
${contentString}
`;
    }

    const closeModal = () => {
        if (launchTimeoutRef.current) {
            clearTimeout(launchTimeoutRef.current);
            launchTimeoutRef.current = null;
        }
        setShowWarning(false);
        setShowCloseButton(false);
        setIsCopied(false);
    }

    // Modal Pro Tools Keydown Listener
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showWarning) return;

            if (e.key === 'Escape') {
                closeModal();
            } else if (e.key === 'Enter') {
                if (launchTimeoutRef.current) {
                    clearTimeout(launchTimeoutRef.current);
                    launchTimeoutRef.current = null;
                }
                setShowCloseButton(true);
                window.open('https://gemini.google.com/app', '_blank');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showWarning]);

    const handleGenerate = async (e) => {
        e.preventDefault()

        // Validation: Ensure topics are selected or questions exist
        if ((mode === 'A' && selectedPoints.length === 0) || (mode === 'B' && rawQuestions.trim().length === 0)) {
            setIsShaking(true);
            setShowErrorToast(true);
            setTimeout(() => setIsShaking(false), 500); // Shake duration
            setTimeout(() => setShowErrorToast(false), 3000); // Toast duration
            return;
        }

        const promptText = generatePrompt();

        try {
            await navigator.clipboard.writeText(promptText);
            setIsCopied(true);
            setShowWarning(true);

            // Warning is centered, timer only shows close button but does not hide modal
            launchTimeoutRef.current = setTimeout(() => {
                setShowCloseButton(true);
                window.open('https://gemini.google.com/app', '_blank');
                launchTimeoutRef.current = null;
            }, 3000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
            setShowWarning(true);
            launchTimeoutRef.current = setTimeout(() => {
                setShowCloseButton(true);
                window.open('https://gemini.google.com/app', '_blank');
                launchTimeoutRef.current = null;
            }, 3000);
        }
    }

    return (
        <div className="min-h-screen bg-cosmic noise-overlay selection:bg-primary/30 flex flex-col items-center">
            {/* Error Toast */}
            {showErrorToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[110] animate-in slide-in-from-top-4 fade-in duration-300">
                    <div className="bg-destructive/10 border border-destructive/30 backdrop-blur-md rounded-xl px-6 py-4 shadow-[0_0_30px_rgba(239,68,68,0.2)] flex items-center gap-3">
                        <AlertTriangle className="text-destructive w-5 h-5" />
                        <span className="text-destructive font-medium tracking-wide">Please select at least one topic to guide the AI.</span>
                    </div>
                </div>
            )}

            {/* Centered Warning Modal */}
            {showWarning && (
                <div
                    className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-cosmic/80 backdrop-blur-xl animate-in fade-in duration-300 cursor-pointer"
                    onClick={closeModal}
                >
                    <div
                        className="glass-card rounded-3xl p-6 md:p-8 max-w-sm w-full text-center space-y-4 border-green-500/40 shadow-[0_0_80px_rgba(34,197,94,0.3)] animate-success cursor-auto relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top Right Close Button */}
                        <button
                            onClick={closeModal}
                            className={`absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-surface-3 rounded-full transition-all duration-500 ${showCloseButton ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                            title="Dismiss"
                        >
                            <X size={20} />
                        </button>

                        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <CheckCircle2 className="text-green-500 w-10 h-10 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                        </div>
                        <h3 className="text-4xl md:text-5xl font-display font-bold tracking-tight text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                            Copied!
                        </h3>
                        <div className="space-y-4 text-muted-foreground">
                            <div className="flex flex-col items-center gap-1">
                                <p className="text-xl leading-relaxed text-foreground font-semibold">
                                    Paste into Gemini
                                </p>
                                <p className="text-sm italic text-muted-foreground">
                                    (Press Ctrl+V or Cmd+V to paste)
                                </p>
                            </div>
                            <div className="p-4 bg-surface-1/50 rounded-2xl border border-surface-3 space-y-4 transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
                                <p className="text-[13px] font-bold text-foreground">🚀 Pro-Tip: Select 'Thinking' for best mathematical reasoning!</p>
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <img src={canvasHint} alt="Gemini Canvas Feature" className="w-full md:w-1/2 rounded-xl border border-surface-3/50 shadow-md object-cover" />
                                    <img src={modelSelectorHint} alt="Gemini Model Selector" className="w-full md:w-1/2 rounded-xl border border-surface-3/50 shadow-md object-cover" />
                                </div>
                            </div>
                        </div>
                        <div className={`pt-4 transition-all duration-500 ${showCloseButton ? 'opacity-0 h-0 overflow-hidden pt-0' : 'opacity-100'}`}>
                            <div className="h-4 w-full bg-surface-3 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 animate-progress-shrink origin-left" />
                            </div>
                            <p className="text-sm md:text-base font-bold uppercase font-display tracking-widest text-green-400 animate-pulse mt-4 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">Launching in 3 seconds...</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Decorative background components */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.02]"
                style={{
                    backgroundImage: `linear - gradient(hsl(var(--primary)) 1px, transparent 1px),
    linear - gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Header Content */}
            <div className="relative z-10 text-center px-6 pt-12 pb-8 w-full max-w-6xl">
                <h2 className="animate-reveal animate-reveal-2 text-4xl md:text-6xl font-display font-bold tracking-tight mb-4">
                    <span className="gradient-text-primary">Worksheet Studio</span>
                </h2>
                <p className="animate-reveal animate-reveal-3 text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    Personalized HSC exam-prep. Build your worksheet step-by-step.
                </p>
            </div>

            {/* Main Wizard Container */}
            <div className="relative z-10 w-full max-w-6xl px-6 pb-24">
                <div className="grid lg:grid-cols-12 gap-8 items-start animate-reveal animate-reveal-4">

                    {/* Main Panel (8 cols) */}
                    <div className="lg:col-span-8 glass-card rounded-3xl p-6 md:p-8 space-y-6">

                        {/* Step Progress Indicator */}
                        <div className="flex items-center justify-between relative mb-6">
                            <div className="absolute top-[20px] left-5 right-5 h-0.5 bg-surface-3 z-0 -translate-y-[1px] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary transition-all duration-500 ease-out"
                                    style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                                />
                            </div>
                            {[
                                { n: 1, label: 'Year & Subject' },
                                { n: 2, label: 'Topics' },
                                { n: 3, label: 'Configure' }
                            ].map(({ n, label }) => (
                                <button
                                    key={n}
                                    type="button"
                                    onClick={() => setCurrentStep(n)}
                                    className={`relative z-10 flex flex-col items-center gap-1 group`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-bold text-sm transition-all duration-300 ${
                                        currentStep === n
                                            ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] scale-110'
                                            : currentStep > n
                                                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                                : 'bg-surface-2 text-muted-foreground hover:bg-surface-3'
                                    }`}>
                                        {currentStep > n ? <CheckCircle2 size={16} /> : n}
                                    </div>
                                    <span className={`text-[10px] font-display tracking-wider uppercase hidden sm:block transition-colors ${currentStep === n ? 'text-primary' : 'text-muted-foreground'}`}>
                                        {label}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* Step Content */}
                        <div className="min-h-[500px]">
                            {currentStep === 1 && (
                                <Step1YearLevel
                                    selectedYear={selectedStage}
                                    setSelectedYear={setSelectedStage}
                                    selectedSubject={selectedSubject}
                                    setSelectedSubject={setSelectedSubject}
                                    customSubject={customSubject}
                                    setCustomSubject={setCustomSubject}
                                    setMode={setMode}
                                    setSelectedPoints={setSelectedPoints}
                                />
                            )}

                            {currentStep === 2 && (
                                <Step2Topics
                                    mode={mode}
                                    setMode={setMode}
                                    selectedYear={selectedStage}
                                    selectedSubject={selectedSubject}
                                    customSubject={customSubject}
                                    setCustomSubject={setCustomSubject}
                                    SYLLABUS_DATA={syllabusData}
                                    selectedPoints={selectedPoints}
                                    setSelectedPoints={setSelectedPoints}
                                    rawQuestions={rawQuestions}
                                    setRawQuestions={setRawQuestions}
                                />
                            )}

                            {currentStep === 3 && (
                                <Step3Configuration
                                    numQuestions={numQuestions}
                                    setNumQuestions={setNumQuestions}
                                    numInput={numInput}
                                    setNumInput={setNumInput}
                                    difficulty={difficulty}
                                    setDifficulty={setDifficulty}
                                    workingSpace={workingSpace}
                                    setWorkingSpace={setWorkingSpace}
                                    includeName={includeName}
                                    setIncludeName={setIncludeName}
                                    includeDate={includeDate}
                                    setIncludeDate={setIncludeDate}
                                    includeMarks={includeMarks}
                                    setIncludeMarks={setIncludeMarks}
                                    generateAnswerKey={generateAnswerKey}
                                    setGenerateAnswerKey={setGenerateAnswerKey}
                                    includeCanvasSetup={includeCanvasSetup}
                                    setIncludeCanvasSetup={setIncludeCanvasSetup}
                                    firstTimeMode={firstTimeMode}
                                    setFirstTimeMode={setFirstTimeMode}
                                    removeWatermark={removeWatermark}
                                    setRemoveWatermark={setRemoveWatermark}
                                    pedagogicalSpotError={pedagogicalSpotError}
                                    setPedagogicalSpotError={setPedagogicalSpotError}
                                    pedagogicalParameterShift={pedagogicalParameterShift}
                                    setPedagogicalParameterShift={setPedagogicalParameterShift}
                                    pedagogicalLimitCase={pedagogicalLimitCase}
                                    setPedagogicalLimitCase={setPedagogicalLimitCase}
                                    syllabusSource={syllabusSource}
                                    setSyllabusSource={setSyllabusSource}
                                    textbookResources={textbookResources}
                                    setTextbookResources={setTextbookResources}
                                />
                            )}
                        </div>

                        {/* Step Navigation */}
                        <div className="flex justify-between items-center pt-6 border-t border-surface-3/30">
                            <button
                                type="button"
                                onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                                className={`px-6 py-2.5 rounded-xl font-display text-sm font-medium transition-colors ${
                                    currentStep === 1 ? 'opacity-0 pointer-events-none' : 'bg-surface-2 text-foreground hover:bg-surface-3'
                                }`}
                            >
                                ← Back
                            </button>

                            {currentStep < 3 ? (
                                <button
                                    type="button"
                                    onClick={() => setCurrentStep(prev => Math.min(3, prev + 1))}
                                    className="px-6 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl font-display text-sm font-bold flex items-center gap-2 transition-colors"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <span className="text-xs text-muted-foreground flex items-center gap-2">
                                    <CheckCircle2 size={12} className="text-primary" /> Use the Generate button →
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Live Preview Sidebar (4 cols) */}
                    <div className="lg:col-span-4">
                        <LivePreviewPanel
                            currentStep={currentStep}
                            selectedYear={selectedStage}
                            selectedSubject={selectedSubject}
                            customSubject={customSubject}
                            mode={mode}
                            selectedPoints={selectedPoints}
                            rawQuestions={rawQuestions}
                            numQuestions={numQuestions}
                            difficulty={difficulty}
                            workingSpace={workingSpace}
                            isCopied={isCopied}
                            showWarning={showWarning}
                            handleGenerate={handleGenerate}
                            isShaking={isShaking}
                        />
                    </div>
                </div>
            </div>


            {/* Showcase Backdrop & FAQ Section */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pb-24 top-[-2rem]">
                <div className="grid lg:grid-cols-2 gap-12 items-start">

                    {/* Left: Universal Worksheet Draft Preview */}
                    <div className="glass-card rounded-3xl p-6 md:p-8 space-y-6 flex flex-col items-center">
                        <div className="text-center space-y-2 w-full">
                            <h3 className="font-display text-2xl font-bold">Universal Worksheet Draft</h3>
                            <p className="text-muted-foreground text-sm">A preview of a professional NESA-aligned output.</p>
                        </div>
                        <div className="w-full aspect-[1/1.4] bg-surface-2 rounded-xl border border-surface-3/50 shadow-inner flex items-center justify-center p-2 overflow-hidden">
                            {/* Static PDF Preview Image */}
                            <img src="/universal_worksheet_exemplar.png" alt="Exemplar Preview" className="w-full h-full object-cover rounded-lg shadow-2xl" />
                        </div>
                    </div>

                    {/* Right: FAQ & Tips Expandable Accordion */}
                    <div className="glass-card rounded-3xl p-6 md:p-8 space-y-6">
                        <div className="text-left space-y-2 w-full mb-6">
                            <h3 className="font-display text-2xl font-bold">FAQ AND Tips & Tricks</h3>
                            <p className="text-muted-foreground text-sm">Getting the most out of MAIT's Worksheet Generator.</p>
                        </div>

                        <div className="space-y-4">
                            {/* FAQ 1 */}
                            <details className="group border border-surface-3/50 rounded-2xl open:bg-surface-2/30 transition-colors">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 font-display text-sm focus:outline-none">
                                    <span>How does the 'Search NESA Website' work? ⚠️</span>
                                    <span className="transition group-open:rotate-180">
                                        <ChevronDown size={18} className="text-muted-foreground" />
                                    </span>
                                </summary>
                                <div className="text-muted-foreground text-sm p-5 pt-0 leading-relaxed border-t border-surface-3/30 mt-2">
                                    When selected, the AI will attempt an autonomous search of the published NESA website to infer topics. *Warning: It is highly experimental and prone to hallucination. Double-check output.*
                                </div>
                            </details>

                            {/* FAQ 2 */}
                            <details className="group border border-surface-3/50 rounded-2xl open:bg-surface-2/30 transition-colors">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 font-display text-sm focus:outline-none">
                                    <span>Why is 'Thinking' recommended for the Model?</span>
                                    <span className="transition group-open:rotate-180">
                                        <ChevronDown size={18} className="text-muted-foreground" />
                                    </span>
                                </summary>
                                <div className="text-muted-foreground text-sm p-5 pt-0 leading-relaxed border-t border-surface-3/30 mt-2">
                                    Models with Chain-of-Thought (like Gemini Pro Thinking) dedicate compute time to deeply reason through mathematical logic <i>before</i> outputting the final LaTeX snippet. This drastically reduces algebraic and geometrical errors.
                                </div>
                            </details>

                            {/* FAQ 3 */}
                            <details className="group border border-surface-3/50 rounded-2xl open:bg-surface-2/30 transition-colors">
                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 font-display text-sm focus:outline-none">
                                    <span>What are the Pedagogical Requirements?</span>
                                    <span className="transition group-open:rotate-180">
                                        <ChevronDown size={18} className="text-muted-foreground" />
                                    </span>
                                </summary>
                                <div className="text-muted-foreground text-sm p-5 pt-0 leading-relaxed border-t border-surface-3/30 mt-2">
                                    Checking these boxes injects specific instructions to generate non-standard questions. <b>Spot the error</b> asks students to find a mistake in a provided solution. <b>Parameter shift</b> tests what happens when constants change. <b>Limit cases</b> probe boundary conditions.
                                </div>
                            </details>
                        </div>
                    </div>
                </div>
            </div>

            {/* Feedback & Support Section */}
            <div className="relative z-10 w-full max-w-4xl mx-auto px-6 pb-12">
                <div className="glass-card rounded-3xl p-6 md:p-8 border border-surface-3/50 hover:border-primary/20 transition-all duration-300">
                    <div className="text-center space-y-2 mb-6">
                        <h3 className="font-display text-xl font-bold">Feedback & Support</h3>
                        <p className="text-muted-foreground text-sm">Found a bug or have a suggestion? Let us know!</p>
                    </div>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const formData = new FormData(e.target);
                            // Honeypot check
                            if (formData.get('website')) return;

                            const btn = e.target.querySelector('button[type="submit"]');
                            const originalText = btn.innerHTML;
                            btn.innerHTML = 'Sending...';
                            btn.disabled = true;

                            try {
                                const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
                                const response = await fetch(`${API_BASE_URL} /api/feedback`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        message: formData.get('message'),
                                        email: formData.get('email') || 'anonymous',
                                        context: 'Worksheet Generator'
                                    })
                                });

                                if (response.ok) {
                                    btn.innerHTML = 'Sent Successfully! ✓';
                                    btn.classList.add('bg-green-500/20', 'text-green-500', 'border-green-500/50');
                                    e.target.reset();
                                    setTimeout(() => {
                                        btn.innerHTML = originalText;
                                        btn.classList.remove('bg-green-500/20', 'text-green-500', 'border-green-500/50');
                                        btn.disabled = false;
                                    }, 3000);
                                } else {
                                    throw new Error('Failed to send');
                                }
                            } catch (err) {
                                btn.innerHTML = 'Error Sending';
                                btn.classList.add('bg-destructive/20', 'text-destructive', 'border-destructive/50');
                                setTimeout(() => {
                                    btn.innerHTML = originalText;
                                    btn.classList.remove('bg-destructive/20', 'text-destructive', 'border-destructive/50');
                                    btn.disabled = false;
                                }, 3000);
                            }
                        }}
                        className="space-y-4 max-w-lg mx-auto"
                    >
                        {/* Honeypot field (hidden from real users) */}
                        <div className="opacity-0 absolute -left-[9999px]" aria-hidden="true">
                            <label htmlFor="website">Website</label>
                            <input type="text" name="website" id="website" tabIndex="-1" autoComplete="off" />
                        </div>

                        <div>
                            <input
                                type="email"
                                name="email"
                                placeholder="Email (optional)"
                                className="w-full input-base py-3 bg-surface-1/50"
                            />
                        </div>
                        <div>
                            <textarea
                                name="message"
                                required
                                rows={3}
                                placeholder="What's on your mind? Found a bug in the LaTeX generation?"
                                className="w-full input-base py-3 bg-surface-1/50 resize-y"
                            />
                        </div>
                        <button type="submit" className="w-full py-3 rounded-xl font-display text-sm font-bold tracking-wider uppercase transition-all duration-300 border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white">
                            Send Feedback
                        </button>
                    </form>
                </div>
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
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
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
