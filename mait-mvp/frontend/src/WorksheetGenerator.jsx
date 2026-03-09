import { useState, useEffect, useMemo, useRef } from 'react'
import { Sparkles, Copy, ExternalLink, ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, ListFilter, X, Search, ClipboardList, ArrowRight } from 'lucide-react'
// KaTeX is loaded via CDN in index.html — use window.katex
import syllabusData from './syllabus_data.json'
import canvasHint from './assets/gemini-canvas-final.png'

const YEAR_LEVELS = Object.keys(syllabusData);
import stageSubjects from './stage_subjects.json'
const STAGES = Object.keys(stageSubjects);

const SPACING_OPTIONS = ['Working Blank Space (Math)', 'Two-column Compact', 'Ruled lines (Writing)', 'Compact (No space)', 'Dynamic Space']

// ─── Syllabus Hierarchy (Legacy Maths retained for compatibility) ───
const HIERARCHY_MAP = {
    'Year 11 Extension 1': ['Year 11 Advanced'],
    'Year 12 Extension 1': ['Year 12 Advanced'],
    'Year 12 Extension 2': ['Year 12 Advanced', 'Year 12 Extension 1'],
}

function buildMergedSyllabus(yearLevel) {
    const base = syllabusData[yearLevel] || {}
    const parents = HIERARCHY_MAP[yearLevel]
    if (!parents) return base

    // Deep-clone the base so we don't mutate the original
    const merged = JSON.parse(JSON.stringify(base))

    for (const parentLevel of parents) {
        const parentData = syllabusData[parentLevel]
        if (!parentData) continue

        // The prerequisite syllabus has structure: {Module: {Subtopic: [points]}}
        // Our UI tree expects: {TopLevelModule: {Subtopic: [points]}}
        // Flatten prerequisite into: {"[ParentLevel] (Prerequisite)": {"Module → Subtopic": [points]}}
        const label = `${parentLevel} (Prerequisite)`
        const flatSubtopics = {}
        for (const [mod, subtopics] of Object.entries(parentData)) {
            for (const [subt, points] of Object.entries(subtopics)) {
                flatSubtopics[`${mod} → ${subt}`] = points
            }
        }
        merged[label] = flatSubtopics
    }

    return merged
}

// ─── LaTeX inline renderer with memoization cache ───
const latexCache = new Map()
function renderLatex(text) {
    if (latexCache.has(text)) return latexCache.get(text)
    const parts = text.split(/(\$[^$]+\$)/g)
    const k = window.katex
    const html = parts.map(part => {
        if (k && part.startsWith('$') && part.endsWith('$')) {
            const tex = part.slice(1, -1)
            try {
                return k.renderToString(tex, { throwOnError: false, displayMode: false })
            } catch {
                return part
            }
        }
        return part.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    }).join('')
    latexCache.set(text, html)
    return html
}

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
    const [syllabusProvided, setSyllabusProvided] = useState(false)
    const [textbooksProvided, setTextbooksProvided] = useState(false)
    const [searchSyllabus, setSearchSyllabus] = useState(false)
    const [spotTheError, setSpotTheError] = useState(() => localStorage.getItem('mait_ws_spotError') === 'true')
    const [numInput, setNumInput] = useState('') // Local state for raw input string

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
    const [workingSpace, setWorkingSpace] = useState(() => localStorage.getItem('mait_ws_workingSpace') || SPACING_OPTIONS[0])
    const [includeMarks, setIncludeMarks] = useState(() => localStorage.getItem('mait_ws_marks') === 'true')
    const [generateAnswerKey, setGenerateAnswerKey] = useState(() => localStorage.getItem('mait_ws_answerKey') === 'true')
    const [searchQuery, setSearchQuery] = useState('')
    const [showReference, setShowReference] = useState(false)
    const [difficulty, setDifficulty] = useState(() => localStorage.getItem('mait_ws_difficulty') || DIFFICULTY_OPTIONS[0])
    const [includeCanvasSetup, setIncludeCanvasSetup] = useState(() => localStorage.getItem('mait_ws_canvasSetup') === 'true')

    const [isCopied, setIsCopied] = useState(false)
    const [showWarning, setShowWarning] = useState(false)
    const [showCloseButton, setShowCloseButton] = useState(false)
    const [showErrorToast, setShowErrorToast] = useState(false)
    const [isShaking, setIsShaking] = useState(false)
    const [expandedModules, setExpandedModules] = useState({})
    const [expandedSubtopics, setExpandedSubtopics] = useState({})

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
        localStorage.setItem('mait_ws_spotError', spotTheError.toString());
    }, [selectedStage, selectedSubject, numQuestions, workingSpace, difficulty, includeMarks, generateAnswerKey, includeName, includeDate, includeCanvasSetup, spotTheError]);

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

    // Load saved points on Stage/Subject change
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`mait_ws_pts_${selectedStage}_${selectedSubject}`);
            setSelectedPoints(saved ? JSON.parse(saved) : []);
        } catch { setSelectedPoints([]); }
    }, [selectedStage, selectedSubject]);

    // Auto-switch to Question/Topic Specification (Mode B) if Subject is 'Other'
    useEffect(() => {
        if (selectedSubject === 'Other') {
            setMode('B');
        }
    }, [selectedSubject]);

    // Determine current legacy syllabus year equivalent for matching data in syllabus_data.json
    // Only applies to mathematics for Stage 4+ in the old structure
    const legacySyllabusYear = useMemo(() => {
        if (selectedStage === 'Stage 4 (Yr 7-8)') return 'Year 7'; // fallback approximation
        if (selectedStage === 'Stage 5 (Yr 9-10)') return 'Year 9';
        if (selectedStage === 'Year 11') {
            if (selectedSubject === 'Mathematics Advanced') return 'Year 11 Advanced';
            if (selectedSubject === 'Mathematics Extension 1') return 'Year 11 Extension 1';
            return 'Year 11 Standard';
        }
        if (selectedStage === 'Year 12') {
            if (selectedSubject === 'Mathematics Advanced') return 'Year 12 Advanced';
            if (selectedSubject === 'Mathematics Extension 1') return 'Year 12 Extension 1';
            if (selectedSubject === 'Mathematics Extension 2') return 'Year 12 Extension 2';
            if (selectedSubject === 'Physics') return 'Year 12 Physics';
            if (selectedSubject === 'Engineering Studies') return 'Year 12 Engineering Studies';
        }
        return null;
    }, [selectedStage, selectedSubject]);

    // Hierarchy Helpers (Only used if legacy match found)
    const currentSyllabus = useMemo(() => legacySyllabusYear ? buildMergedSyllabus(legacySyllabusYear) : {}, [legacySyllabusYear]);

    // Topic list for Non-legacy subjects
    const currentTopicsList = useMemo(() => {
        if (legacySyllabusYear) return null; // Use currentSyllabus instead
        if (selectedSubject === 'Other') return [];
        return stageSubjects[selectedStage]?.[selectedSubject] || [];
    }, [selectedStage, selectedSubject, legacySyllabusYear]);


    // ─── Search filtering ───
    const filteredModules = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return Object.keys(currentSyllabus)

        return Object.keys(currentSyllabus).filter(mod => {
            if (mod.toLowerCase().includes(q)) return true
            const subtopics = currentSyllabus[mod] || {}
            return Object.keys(subtopics).some(subt => {
                if (subt.toLowerCase().includes(q)) return true
                return subtopics[subt].some(pt => pt.toLowerCase().includes(q))
            })
        })
    }, [currentSyllabus, searchQuery])

    // Auto-expand modules/subtopics when searching
    useEffect(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return
        const mods = {}
        const subs = {}
        for (const mod of filteredModules) {
            mods[mod] = true
            const subtopics = currentSyllabus[mod] || {}
            for (const subt of Object.keys(subtopics)) {
                if (subt.toLowerCase().includes(q) || subtopics[subt].some(pt => pt.toLowerCase().includes(q))) {
                    subs[subt] = true
                }
            }
        }
        setExpandedModules(prev => ({ ...prev, ...mods }))
        setExpandedSubtopics(prev => ({ ...prev, ...subs }))
    }, [searchQuery, filteredModules, currentSyllabus])

    const modules = filteredModules;

    const toggleModule = (mod) => {
        setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
    };

    const toggleSubtopic = (subt) => {
        setExpandedSubtopics(prev => ({ ...prev, [subt]: !prev[subt] }));
    };

    const isSubtopicSelected = (mod, subt) => {
        const points = currentSyllabus[mod]?.[subt];
        return points && points.length > 0 && points.every(p => selectedPoints.includes(p));
    };

    const toggleSubtopicSelection = (mod, subt) => {
        const points = currentSyllabus[mod]?.[subt] || [];
        const currentlyAllSelected = points.length > 0 && points.every(p => selectedPoints.includes(p));

        if (currentlyAllSelected) {
            setSelectedPoints(prev => prev.filter(p => !points.includes(p)));
        } else {
            setSelectedPoints(prev => Array.from(new Set([...prev, ...points])));
        }
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
                ? 'LAYOUT DIRECTIVE: Use dynamic spacing. Where worded or written explanations are required, insert ruled lines (\\hrulefill). For pure mathematical calculations, leave blank working space.'
                : `Use \\vspace{${dynamicSpacing}} between questions.`;

        let answerKeyLogic = generateAnswerKey
            ? 'Insert \\newpage at the end and provide a Teacher Answer Key. The Answer Key MUST be formatted in a two-column layout using `\\begin{multicols}{2}` and `\\end{multicols}`, separated by the vertical rule.'
            : 'Do not generate an answer key';

        // Context Logic
        let contextPrefix = '';
        if (syllabusProvided || textbooksProvided) {
            contextPrefix += 'Using the context files attached to this prompt:\n';
            if (syllabusProvided) contextPrefix += '- Strictly adhere to the scope and constraints of the attached Syllabus.\n';
            if (textbooksProvided) contextPrefix += '- Strongly model the questions on the style, structure, and difficulty found in the attached Textbook/Resources.\n';
            contextPrefix += '\n';
        }

        if (searchSyllabus) {
            contextPrefix += 'CRITICAL: You are authorized and encouraged to Search/Reference the official NESA NSW Syllabus requirements for the selected Stage and Subject to ensure 100% curriculum alignment.\n\n';
        }

        if (spotTheError) {
            contextPrefix += 'PEDAGOGY DIRECTIVE: You must include at least one "Spot the Error" question. For this question, provide a deliberately flawed, step-by-step mathematical working. Ask the student to identify the specific line where the logical or arithmetic error occurred and explain why it is incorrect.\n\n';
        }

        let contentString = '';
        if (mode === 'A') {
            const explicitTopics = (currentTopicsList && currentTopicsList.length > 0 && selectedPoints.length > 0)
                ? `strictly targeting these specific topics: \n${selectedPoints.map(p => `- ${p}`).join('\n')}`
                : selectedPoints.length > 0
                    ? `strictly targeting these specific syllabus dot-points and topics: \n${selectedPoints.map(p => `- ${p}`).join('\n')}`
                    : `targeting the general curriculum for ${displaySubject}`;

            const difficultyText = difficulty === 'Mixed' ? 'Use a balanced mix of easy, medium, and hard questions.' :
                difficulty === 'Easy → Hard Progression' ? 'Start with easy questions and progressively increase difficulty to hard.' :
                    difficulty === 'Mostly Easy' ? 'Keep most questions easy/accessible, with 1-2 challenging ones at the end.' :
                        difficulty === 'Mostly Hard' ? 'Focus on challenging, exam-level questions with minimal easy questions.' :
                            'Match the difficulty and style of real exam questions.';
            contentString = `${contextPrefix}Please generate ${numQuestions} professional-level exam questions ${explicitTopics} for ${selectedStage} ${displaySubject}.\n\n**DIFFICULTY:** ${difficultyText}`;
        } else {
            const syllabusContext = selectedPoints.length > 0
                ? `\n\nReference Syllabus Points selected by user:\n${selectedPoints.map(p => `- ${p}`).join('\n')}`
                : '';
            contentString = `${contextPrefix}Please format these exact questions/topics into a professional worksheet for ${selectedStage} ${displaySubject}: ${rawQuestions}${syllabusContext}`;
        }

        // Generate dynamic title
        let promptTitle = `${selectedStage} ${displaySubject} Worksheet`;
        if (mode === 'A' && selectedPoints.length > 0 && legacySyllabusYear) {
            const modCounts = {};
            selectedPoints.forEach(p => {
                for (const mod in currentSyllabus) {
                    for (const subt in currentSyllabus[mod]) {
                        if (currentSyllabus[mod][subt].includes(p)) {
                            // Strip '(Prerequisite)' from module names for clean titles
                            const cleanMod = mod.replace(/\s*\(Prerequisite\)$/i, '');
                            modCounts[cleanMod] = (modCounts[cleanMod] || 0) + 1;
                        }
                    }
                }
            });
            const topMod = Object.keys(modCounts).reduce((a, b) => modCounts[a] > modCounts[b] ? a : b, '');
            if (topMod) promptTitle = `${topMod} ${displaySubject} Worksheet`;
        }

        let reminderText = "Reminder: Click the dotted box arrow button in the bottom right to highlight and edit sections. Feel free to ask me to make changes!";
        if (includeCanvasSetup) {
            reminderText += "\n\n No Code/Preview window? Press **Tools** then **Canvas** and send the message again! :D";
        }

        return `**${promptTitle}**\n\nAct as the Universal Artifact Architect, an expert LaTeX Document Engine and Curriculum Designer. 

Your job is to create a professional, compile-ready PDF worksheet. 

**CRITICAL DIRECTIVE:** 
You must structure your output exactly like this. First, output this exact message: '${reminderText}' Second, output the complete, compile-ready LaTeX code inside ONE SINGLE code block starting with \`\`\`latex and ending with \`\`\`. Do not output any other conversational text.

${includeMarks ? '**LATEX DIRECTIVE FOR MARKS:** Always place the marks (e.g., [2 Marks]) at the very end of the question text line, separated by `\\hfill\\quad`. Ensure they are strictly right-aligned to the margin to maintain a professional exam layout.\n' : ''}
${workingSpace === 'Dynamic Space' ? '**LATEX DIRECTIVE FOR SPACING:** For your Dynamic Space implementation, ensure `\\hrulefill` is used whenever a written response is expected, and leave at least 3-4cm of vertical space for calculation-intensive questions.\n' : ''}

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

**1. THE PREAMBLE:**
\\documentclass[12pt, a4paper]{article}
\\usepackage[top=2cm, bottom=2cm, left=2cm, right=2cm]{geometry}
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
\\rfoot{\\textcolor{gray!50}{\\tiny \\textit{myaitutor.au/worksheets}}}
\\renewcommand{\\headrulewidth}{0.4pt}
\\setlength{\\headheight}{30pt}
\\begin{document}
\\sloppy
${headerString ? `\n${headerString}\n\\vspace{0.8cm}\n` : ''}
\\begin{center}
    {\\Large \\textbf{ ${mode === 'A' ? 'Syllabus Focus: Mixed Topics' : 'Custom Worksheet'} }}
\\end{center}
\\vspace{0.5cm}

**2. LAYOUT & FORMATTING RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment. Let LaTeX handle numbering. Do NOT use custom labels like \\item[\\textbf{Question 1:}].
* LINE BREAKS: Do NOT use \\\\ for line breaks within questions. Use a blank line (double return) to ensure text aligns to the left margin perfectly.
* Spacing: ${spacingLogic}
* **MARKS ALIGNMENT (CRITICAL):** ${marksLogic === 'Do not assign marks' ? marksLogic : `If assigning marks, you MUST use \`${marksLogic}\` at the very end of the question text. The \\mbox{} is critical to prevent the number and the word 'Marks' from being split across two lines. Do NOT let the marks wrap to a new line awkwardly. Ensure they are pushed completely flush-right.`}
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
                                <p className="text-[13px] font-bold text-foreground">🚀 Pro-Tip for Gemini:</p>
                                <img src={canvasHint} alt="Gemini Canvas Feature" className="w-full rounded-xl border border-surface-3/50 shadow-md object-cover" />
                                <p className="text-xs">
                                    Use <span className="text-primary font-bold">'Thinking'</span> for fast and <span className="text-accent font-bold">'Pro'</span> for quality. Canvas feature also allows editing with highlight to ask
                                </p>
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
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '60px 60px'
                }}
            />

            {/* Header Content */}
            <div className="relative z-10 text-center px-6 pt-12 pb-12 w-full max-w-4xl">
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
                                Stage / Year Level
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedStage}
                                    onChange={(e) => setSelectedStage(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full py-3 truncate"
                                    aria-label="Select stage or year level"
                                >
                                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-[0.2em] text-muted-foreground">
                                Subject
                            </label>
                            {selectedSubject === 'Other' ? (
                                <div className="relative flex items-center">
                                    <input
                                        type="text"
                                        placeholder="Type custom subject..."
                                        value={customSubject}
                                        onChange={(e) => setCustomSubject(e.target.value)}
                                        className="input-base w-full text-sm font-display py-3 pr-10"
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const options = Object.keys(stageSubjects[selectedStage] || {});
                                            if (options.length > 0) setSelectedSubject(options[0]);
                                        }}
                                        className="absolute right-3 p-1 hover:bg-surface-3 rounded-md text-muted-foreground"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <select
                                        value={selectedSubject}
                                        onChange={(e) => setSelectedSubject(e.target.value)}
                                        className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full py-3 truncate"
                                        aria-label="Select subject"
                                    >
                                        {(stageSubjects[selectedStage] ? Object.keys(stageSubjects[selectedStage]) : []).map(sub => (
                                            <option key={sub} value={sub}>{sub}</option>
                                        ))}
                                        <option value="Other">Other (Custom)</option>
                                    </select>
                                    <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                </div>
                            )}
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
                            Question/Topic Specification
                        </button>
                    </div>

                    {/* Hierarchical Tree Checklist or Manual Area */}
                    <div className={`bg-surface-1/30 rounded-2xl border border-surface-3/50 min-h-[400px] overflow-hidden flex flex-col ${isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both] shadow-[0_0_15px_rgba(239,68,68,0.2)] border-destructive/40' : ''}`}>
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
                                        {legacySyllabusYear ? (
                                            modules.map(mod => (
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
                                                                            className="p-1 hover:bg-surface-3 rounded transition-colors flex-shrink-0"
                                                                        >
                                                                            {expandedSubtopics[subt] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                                        </button>
                                                                        <label className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden">
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSubtopicSelected(mod, subt)}
                                                                                onChange={() => toggleSubtopicSelection(mod, subt)}
                                                                                className="w-3.5 h-3.5 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer flex-shrink-0"
                                                                            />
                                                                            <span className="text-[11px] font-display text-muted-foreground font-semibold group-hover:text-foreground tracking-wide truncate">{subt}</span>
                                                                        </label>
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
                                                                                    <span className="text-[11px] font-display leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatex(point) }} />
                                                                                </label>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            /* Simple list for newer stages (K-10 non-legacy) */
                                            currentTopicsList && currentTopicsList.length > 0 ? (
                                                <div className="grid gap-3">
                                                    {currentTopicsList.map((topic, idx) => (
                                                        <label
                                                            key={idx}
                                                            className={`flex items-start gap-3 p-3 rounded-xl border border-surface-3 transition-all cursor-pointer select-none ${selectedPoints.includes(topic) ? 'bg-primary/5 border-primary/20 text-foreground' : 'bg-surface-2/20 text-muted-foreground hover:border-primary/10'}`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedPoints.includes(topic)}
                                                                onChange={() => handlePointToggle(topic)}
                                                                className="mt-0.5 w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer"
                                                            />
                                                            <span className="text-sm font-display leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatex(topic) }} />
                                                        </label>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center p-8 text-muted-foreground text-sm">
                                                    No predefined topics for {selectedSubject === 'Other' ? (customSubject || 'this subject') : selectedSubject}. <br />Switch to "Question/Topic Specification" to manually prescribe topics.
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 space-y-3 animate-reveal">
                                <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground mb-2">
                                    Paste Your Raw Questions
                                </label>
                                <div className={isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}>
                                    <textarea
                                        required={mode === 'B'}
                                        rows={10}
                                        placeholder="Type in the topics and any specific dot-points or general aim of the worksheet."
                                        value={rawQuestions}
                                        onChange={(e) => setRawQuestions(e.target.value)}
                                        className={`input-base w-full text-sm font-display resize-y py-3 min-h-[300px] ${isShaking ? 'border-destructive/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : ''}`}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Row 1: Number of Questions (Full Width) */}
                    <div className="space-y-4 p-4 bg-surface-1/30 rounded-2xl border border-surface-3/50 shadow-sm transition-all duration-300 hover:border-primary/30">
                        <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                            <span>Number of Questions</span>
                            {numQuestions > 15 && (
                                <span className="text-secondary/80 font-bold lowercase italic tracking-normal">(Note: Large worksheets use compact spacing)</span>
                            )}
                        </label>
                        <div className="flex items-center gap-6">
                            <input
                                type="range"
                                min={1}
                                max={50}
                                value={numQuestions > 50 ? 50 : numQuestions}
                                onChange={(e) => setNumQuestions(parseInt(e.target.value, 10))}
                                className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{
                                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${((Math.min(numQuestions, 50) - 1) / 49) * 100}%, hsl(var(--surface-3)) ${((Math.min(numQuestions, 50) - 1) / 49) * 100}%, hsl(var(--surface-3)) 100%)`,
                                }}
                            />
                            <input
                                type="number"
                                value={numInput}
                                onChange={(e) => setNumInput(e.target.value)}
                                onBlur={() => {
                                    const val = parseInt(numInput, 10);
                                    if (isNaN(val) || val < 1) {
                                        setNumQuestions(1);
                                        setNumInput('1');
                                    } else {
                                        setNumQuestions(val);
                                        setNumInput(val.toString());
                                    }
                                }}
                                className="input-base w-20 text-center text-base font-mono py-2 bg-surface-2 border-surface-4 shadow-inner"
                            />
                        </div>
                    </div>

                    {/* Row 2: Split 50/50 */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                                Working Space / Page Layout
                            </label>
                            <div className="relative">
                                <select
                                    value={workingSpace}
                                    onChange={(e) => setWorkingSpace(e.target.value)}
                                    className="input-base appearance-none pr-10 cursor-pointer font-display text-sm w-full py-3 bg-surface-1/50"
                                >
                                    {SPACING_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                </select>
                                <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                                Question Difficulty
                            </label>
                            <select
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                                className="input-base w-full text-sm py-3 cursor-pointer bg-surface-1/50"
                                aria-label="Select difficulty level"
                            >
                                {DIFFICULTY_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Attached Context (Full Width, 4-col Grid) */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                            Attached Context / Syllabus
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-surface-1/50 rounded-xl border border-surface-3">
                            <label className="flex items-center gap-3 cursor-pointer group" title="Inform Gemini that a Syllabus document has been uploaded to chat">
                                <input
                                    type="checkbox"
                                    checked={syllabusProvided}
                                    onChange={(e) => {
                                        setSyllabusProvided(e.target.checked);
                                        if (e.target.checked) setSearchSyllabus(false);
                                    }}
                                    className="w-5 h-5 rounded-lg border-surface-4 text-accent focus:ring-accent/20 bg-surface-2 cursor-pointer transition-all duration-300"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wider">Syllabus Provided</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group" title="Inform Gemini that a Textbook or resources have been uploaded to chat">
                                <input
                                    type="checkbox"
                                    checked={textbooksProvided}
                                    onChange={(e) => setTextbooksProvided(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-surface-4 text-accent focus:ring-accent/20 bg-surface-2 cursor-pointer transition-all duration-300"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wider">Textbooks Provided</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group" title="Inform Gemini to search/verify against NESA syllabus standards">
                                <input
                                    type="checkbox"
                                    checked={searchSyllabus}
                                    onChange={(e) => {
                                        setSearchSyllabus(e.target.checked);
                                        if (e.target.checked) setSyllabusProvided(false);
                                    }}
                                    className="w-5 h-5 rounded-lg border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer transition-all duration-300"
                                />
                                <span className="text-[11px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-wider">Search NESA</span>
                            </label>
                            <label className="flex items-center gap-3 cursor-pointer group" title="Directive to include flawed step-by-step working for error identification">
                                <input
                                    type="checkbox"
                                    checked={spotTheError}
                                    onChange={(e) => setSpotTheError(e.target.checked)}
                                    className="w-5 h-5 rounded-lg border-surface-4 text-secondary focus:ring-secondary/20 bg-surface-2 cursor-pointer transition-all duration-300"
                                />
                                <span className="text-[11px] font-bold text-secondary group-hover:text-secondary/80 transition-colors font-display uppercase tracking-wider">Spot Error Task</span>
                            </label>
                        </div>
                    </div>

                    {/* Row 4: Configuration / Output Settings (Full Width, 5-col Grid) */}
                    <div className="space-y-2">
                        <label className="block text-[10px] font-display uppercase tracking-wider text-muted-foreground">
                            Configuration / Output Settings
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-surface-2/30 rounded-xl border border-dashed border-surface-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeName}
                                    onChange={(e) => setIncludeName(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-tight">Include Name</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeDate}
                                    onChange={(e) => setIncludeDate(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-tight">Include Date</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeMarks}
                                    onChange={(e) => setIncludeMarks(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-tight">Include Marks?</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={generateAnswerKey}
                                    onChange={(e) => setGenerateAnswerKey(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-tight">Answer Key</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeCanvasSetup}
                                    onChange={(e) => setIncludeCanvasSetup(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors font-display uppercase tracking-tight" title="Include first-time setup instructions for Gemini Canvas">First Time?</span>
                            </label>
                        </div>
                    </div>

                    {/* Final Action */}
                    <div className="pt-6 relative group">
                        <button
                            type="submit"
                            disabled={isCopied || showWarning}
                            className="w-full py-5 rounded-2xl font-display text-[15px] font-bold tracking-wider uppercase flex items-center justify-center gap-3 transition-all duration-300 overflow-hidden relative shadow-lg bg-primary btn-distinct text-white hover:shadow-[0_0_50px_rgba(var(--primary-rgb),0.5)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                            <Sparkles size={18} className="animate-pulse relative z-10" />
                            <span className="relative z-10">Generate Prompt & Launch Gemini</span>
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform relative z-10" />
                        </button>
                    </div>

                </form>
            </div>

            {/* Quick Reference Section */}
            <div className="relative z-10 w-full max-w-4xl px-6 pb-24 border-t border-surface-3/30 pt-12">
                <div className="w-full flex flex-col items-center gap-6">
                    <div className="glass-card card-shine rounded-3xl p-8 md:p-10 flex flex-col md:flex-row items-center gap-8 border border-surface-3/50 hover:border-secondary/40 transition-all duration-500 w-full">
                        <div className="flex-shrink-0 w-20 h-20 rounded-2xl bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-inner">
                            <ClipboardList className="text-secondary" size={40} />
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mb-3">
                                <h3 className="font-display text-2xl font-bold">First Education</h3>
                                <span className="inline-block px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary text-[10px] font-display font-bold uppercase tracking-wider w-fit mx-auto md:mx-0">
                                    External Resource
                                </span>
                            </div>
                            <p className="text-secondary/80 text-sm font-medium mb-3 uppercase tracking-widest">HSC Question Topic Test Maker</p>
                            <p className="text-muted-foreground text-base leading-relaxed mb-6 max-w-2xl">
                                Build custom topic tests from real HSC questions. Select topics to include or exclude, then generate a printable PDF. Perfect for targeted practice alongside MAIT's AI worksheets.
                            </p>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                {["Topic Selection", "Custom PDFs", "Include/Exclude", "Answer Keys"].map(tag => (
                                    <span key={tag} className="text-[11px] font-medium bg-surface-2/80 text-muted-foreground px-3 py-1 rounded-lg border border-surface-3/50">{tag}</span>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 w-full md:w-auto shrink-0">
                            <a
                                href="https://hscmathsbytopic.firsteducation.com.au/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary flex items-center justify-center gap-3 py-4 px-8 rounded-2xl group font-bold tracking-wide text-base shadow-lg shadow-secondary/10"
                            >
                                Create Topic Test
                                <ExternalLink size={18} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </a>
                            <p className="text-xs text-center text-muted-foreground/50 italic">
                                Provided by <a href="https://firsteducation.com.au" target="_blank" rel="noopener noreferrer" className="hover:text-secondary underline transition-colors">First Education</a>
                            </p>
                        </div>
                    </div>
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
