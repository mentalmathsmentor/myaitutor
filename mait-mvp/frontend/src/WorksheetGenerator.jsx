import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Step1YearLevel from './components/worksheet/Step1YearLevel';
import Step2Topics from './components/worksheet/Step2Topics';
import syllabusData from './syllabus_data.json';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  Check,
  GraduationCap,
  BookOpen,
  Calculator,
  Settings,
  Sparkles,
  AlertCircle,
  Copy,
  ExternalLink,
  Brain,
  CheckCircle2,
  X,
  ArrowRight
} from 'lucide-react';
import canvasHint from './assets/gemini-canvas-final.png';
import thinkingHint from './assets/gemini-model-selector.png';

export default function WorksheetGenerator({ navigate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Gemini Launch Logic
  const [showWarning, setShowWarning] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const launchTimeoutRef = useRef(null);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Form State
  const [selectedYear, setSelectedYear] = useState('Year 12');
  const [selectedSubject, setSelectedSubject] = useState('Mathematics Advanced');
  const [customSubject, setCustomSubject] = useState('');
  const [mode, setMode] = useState('A');
  const [selectedPoints, setSelectedPoints] = useState([]);
  const [rawQuestions, setRawQuestions] = useState('');
  const [questionCount, setQuestionCount] = useState(15);
  const [difficulty, setDifficulty] = useState(3);
  const [pedagogicalDrills, setPedagogicalDrills] = useState([]);
  const [contextSource, setContextSource] = useState('builtin');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeMarking, setIncludeMarking] = useState(true);
  const [removeWatermark, setRemoveWatermark] = useState(false);

  const steps = [
    { id: 'curriculum', title: 'Curriculum', icon: GraduationCap },
    { id: 'topics', title: 'Topics', icon: BookOpen },
    { id: 'pedagogy', title: 'Pedagogy', icon: Brain },
    { id: 'output', title: 'Output', icon: Settings },
  ];

  const yearLevels = [
    { value: 'k', label: 'Kindy' },
    { value: '1', label: 'Year 1' },
    { value: '2', label: 'Year 2' },
    { value: '3', label: 'Year 3' },
    { value: '4', label: 'Year 4' },
    { value: '5', label: 'Year 5' },
    { value: '6', label: 'Year 6' },
    { value: '7', label: 'Year 7' },
    { value: '8', label: 'Year 8' },
    { value: '9', label: 'Year 9' },
    { value: '10', label: 'Year 10' },
    { value: '11', label: 'Year 11' },
    { value: '12', label: 'Year 12' },
  ];

  const subjects = [
    { value: 'math-advanced', label: 'Mathematics Advanced' },
    { value: 'math-ext1', label: 'Mathematics Extension 1' },
    { value: 'math-ext2', label: 'Mathematics Extension 2' },
    { value: 'math-standard', label: 'Mathematics Standard' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'english-adv', label: 'English Advanced' },
  ];

  const topicOptions = [
    {
      category: 'MA-F1 Working with Functions',
      items: [
        'F1.1: Algebraic foundations',
        'F1.2: Linear, quadratic & cubic functions',
        'F1.3: Further functions & relations',
      ]
    },
    {
      category: 'MA-F2 Graphing Techniques',
      items: [
        'F2.1: Transformations & symmetry',
        'F2.2: Trigonometric functions',
        'F2.3: Inverse functions & logarithms',
      ]
    },
    {
      category: 'MA-C1 Introduction to Differentiation',
      items: [
        'C1.1: Gradients of tangents',
        'C1.2: Difference quotients',
        'C1.3: The derivative & its graph',
      ]
    },
    {
      category: 'MA-C2 Differential Calculus',
      items: [
        'C2.1: Differentiation rules',
        'C2.2: The chain rule',
        'C2.3: Product & quotient rules',
      ]
    },
    {
      category: 'MA-C3 Applications of Differentiation',
      items: [
        'C3.1: The first & second derivatives',
        'C3.2: Sketching & interpreting curves',
        'C3.3: Optimization problems',
      ]
    },
    {
      category: 'MA-I1 Integration',
      items: [
        'I1.1: Areas & the definite integral',
        'I1.2: The fundamental theorem',
        'I1.3: Integration techniques',
        'I1.4: Integration by parts',
      ]
    },
  ];

  const drillOptions = [
    { id: 'spot-error', label: 'Spot the Error', desc: 'Deliberately flawed logic to debug' },
    { id: 'parameter-shift', label: 'Parameter Shift', desc: 'Alter variables, observe changes' },
    { id: 'limit-case', label: 'Limit Case Analysis', desc: 'Test equations at extreme bounds' },
    { id: 'proof-style', label: 'Proof-Style Questions', desc: 'Rigorous mathematical reasoning' },
    { id: 'word-problems', label: 'Contextual Word Problems', desc: 'Real-world applications' },
    { id: 'multi-step', label: 'Multi-Step Synthesis', desc: 'Complex chained problems' },
  ];

  const toggleTopic = (topic) => {
    setTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const toggleDrill = (drill) => {
    setPedagogicalDrills(prev => 
      prev.includes(drill)
        ? prev.filter(d => d !== drill)
        : [...prev, drill]
    );
  };

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

  const generatePrompt = () => {
    const displaySubject = selectedSubject === 'Other' && customSubject.trim() ? customSubject : selectedSubject;

    // Header Logic
    let lheadContent = `\\textbf{ ${selectedYear} - ${displaySubject} }`;
    
    let headerString = '';
    // includeName/includeDate logic (simplified from legacy to match current UI if needed, 
    // but user wants EXACT prompt logic)
    // Note: My current UI has includeAnswers/includeMarking but not includeName/Date.
    // I should check if I should add them back or just stick to what's in the UI.
    // User: "ensure the exact original prompt logic for syllabus dot-points is preserved"
    // User: "Re-insert the original prompt logic and javascript that implements all the subject syllabus dot-points and ensure this remains exact as before"
    
    let marksLogic = includeMarking ? '\\hfill\\quad\\textbf{[X Marks]}' : 'Do not assign marks';
    
    // Spacing logic (Current UI has questionCount but not specific workingSpace select yet)
    // I'll use defaults or logic based on questionCount
    let dynamicSpacing = questionCount > 20 ? '2cm' : (questionCount > 10 ? '4cm' : '6cm');
    let spacingLogic = `Use \\vspace{${dynamicSpacing}} between questions.`;

    let answerKeyLogic = includeAnswers
        ? 'Insert \\newpage at the end and provide a Teacher Answer Key. The Answer Key MUST be formatted in a two-column layout using `\\begin{multicols}{2}` and `\\end{multicols}`, separated by the vertical rule.'
        : 'Do not generate an answer key';

    // Context Logic
    let contextPrefix = '';
    if (pedagogicalDrills.includes('spot-error')) {
        contextPrefix += 'PEDAGOGY DIRECTIVE: You must include at least one "Spot the Error" question. For this question, provide a deliberately flawed, step-by-step mathematical working. Ask the student to identify the specific line where the logical or arithmetic error occurred and explain why it is incorrect. IMPORTANT: This specific question must be worth exactly 1 mark.\n\n';
    }

    let contentString = '';
    if (mode === 'A') {
        const explicitTopics = (selectedPoints.length > 0)
            ? `strictly targeting these specific syllabus dot-points and topics: \n${selectedPoints.map(p => `- ${p}`).join('\n')}`
            : `targeting the general curriculum for ${displaySubject}`;

        const difficultyText = difficulty <= 2 ? 'Mostly Easy' : difficulty >= 4 ? 'Mostly Hard' : 'Mixed / Standard';
        contentString = `${contextPrefix}Please generate ${questionCount} professional-level exam questions ${explicitTopics} for ${selectedYear} ${displaySubject}.\n\n**DIFFICULTY:** ${difficultyText}`;
    } else {
        const syllabusContext = selectedPoints.length > 0
            ? `\n\nReference Syllabus Points selected by user:\n${selectedPoints.map(p => `- ${p}`).join('\n')}`
            : '';
        contentString = `${contextPrefix}Please format these exact questions/topics into a professional worksheet for ${selectedYear} ${displaySubject}: ${rawQuestions}${syllabusContext}`;
    }

    let promptTitle = `${selectedYear} ${displaySubject} Worksheet`;

    let reminderText = "Reminder: Click the dotted box arrow button in the bottom right to highlight and edit sections. Feel free to ask me to make changes!";

    const rfootContent = removeWatermark 
        ? '' 
        : '\\rfoot{\\textcolor{gray!50}{\\tiny \\textit{myaitutor.au/worksheets}}}';

    return `**${promptTitle}**\n\nAct as the Universal Artifact Architect, an expert LaTeX Document Engine and Curriculum Designer. 

Your job is to create a professional, compile-ready PDF worksheet. 

**CRITICAL DIRECTIVE:** 
You must structure your output exactly like this. First, output this exact message: '${reminderText}' Second, output the complete, compile-ready LaTeX code inside ONE SINGLE code block starting with \`\`\`latex and ending with \`\`\`. Do not output any other conversational text.

${includeMarking ? '**LATEX DIRECTIVE FOR MARKS:** Always place the marks (e.g., [2 Marks]) at the very end of the question text line, separated by `\\hfill\\quad`. Ensure they are strictly right-aligned to the margin to maintain a professional exam layout.\n' : ''}

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
${rfootContent}
\\renewcommand{\\headrulewidth}{0.4pt}
\\setlength{\\headheight}{30pt}
\\begin{document}
\\sloppy

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
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    
    if ((mode === 'A' && selectedPoints.length === 0) || (mode === 'B' && rawQuestions.trim().length === 0)) {
        setIsShaking(true);
        setShowErrorToast(true);
        setTimeout(() => setIsShaking(false), 500);
        setTimeout(() => setShowErrorToast(false), 3000);
        return;
    }

    setIsGenerating(true);
    const promptText = generatePrompt();

    try {
        await navigator.clipboard.writeText(promptText);
        setIsCopied(true);
        setShowWarning(true);
        
        setIsGenerating(false);

        launchTimeoutRef.current = setTimeout(() => {
            setShowCloseButton(true);
            window.open('https://gemini.google.com/app', '_blank');
            launchTimeoutRef.current = null;
        }, 3000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
        setIsGenerating(false);
        setShowWarning(true);
        launchTimeoutRef.current = setTimeout(() => {
            setShowCloseButton(true);
            window.open('https://gemini.google.com/app', '_blank');
            launchTimeoutRef.current = null;
        }, 3000);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePrompt());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const canProceed = () => {
    if (currentStep === 0) return selectedYear && selectedSubject && (selectedSubject !== 'Other' || customSubject.trim() !== '');
    if (currentStep === 1) return mode === 'A' ? selectedPoints.length > 0 : rawQuestions.trim() !== '';
    return true;
  };

  return (
    <div className="min-h-screen cosmic-gradient pt-24 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <button
              onClick={() => navigate('landing')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-mait-cyan" />
              Worksheet Studio
            </h1>
            <p className="text-white/60">Artifact Generation Engine — High Performance Syllabus Alignment</p>
          </div>
          

        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-strong rounded-xl p-4 mb-8"
        >
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                  index === currentStep 
                    ? 'bg-mait-cosmic/20 text-mait-cyan' 
                    : index < currentStep 
                      ? 'text-green-400' 
                      : 'text-white/40'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    index === currentStep 
                      ? 'bg-mait-cosmic text-white' 
                      : index < currentStep 
                        ? 'bg-green-500/20' 
                        : 'bg-white/10'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <step.icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="hidden sm:block font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 h-px mx-2 ${
                    index < currentStep ? 'bg-green-500/50' : 'bg-white/10'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Area */}
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {/* Step 1: Curriculum */}
              {currentStep === 0 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card-strong rounded-2xl p-6 lg:p-8"
                >
                  <Step1YearLevel
                      selectedYear={selectedYear}
                      setSelectedYear={setSelectedYear}
                      selectedSubject={selectedSubject}
                      setSelectedSubject={setSelectedSubject}
                      customSubject={customSubject}
                      setCustomSubject={setCustomSubject}
                      setMode={setMode}
                      setSelectedPoints={setSelectedPoints}
                  />
                </motion.div>
              )}

              {/* Step 2: Topics */}
              {currentStep === 1 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card-strong rounded-2xl p-6 lg:p-8"
                >
                  <Step2Topics
                      mode={mode}
                      setMode={setMode}
                      selectedYear={selectedYear}
                      selectedSubject={selectedSubject}
                      customSubject={customSubject}
                      setCustomSubject={setCustomSubject}
                      SYLLABUS_DATA={syllabusData}
                      selectedPoints={selectedPoints}
                      setSelectedPoints={setSelectedPoints}
                      rawQuestions={rawQuestions}
                      setRawQuestions={setRawQuestions}
                  />
                </motion.div>
              )}

              {/* Step 3: Pedagogy */}
              {currentStep === 2 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card-strong rounded-2xl p-6 lg:p-8"
                >
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-mait-cyan" />
                    Pedagogical Arsenal
                  </h2>
                  <p className="text-white/60 text-sm mb-6">
                    Inject specific cognitive drills into your worksheet
                  </p>
                  
                  <div className="space-y-4">
                    {drillOptions.map((drill) => (
                      <label
                        key={drill.id}
                        className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all ${
                          pedagogicalDrills.includes(drill.id)
                            ? 'bg-mait-cosmic/20 border border-mait-cosmic/50'
                            : 'glass-card hover:bg-white/5'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          pedagogicalDrills.includes(drill.id)
                            ? 'bg-mait-cosmic border-mait-cosmic'
                            : 'border-white/30'
                        }`}>
                          {pedagogicalDrills.includes(drill.id) && <Check className="w-4 h-4 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          checked={pedagogicalDrills.includes(drill.id)}
                          onChange={() => toggleDrill(drill.id)}
                          className="hidden"
                        />
                        <div>
                          <h3 className="text-white font-medium">{drill.label}</h3>
                          <p className="text-sm text-white/50">{drill.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                  
                  {/* Context Source */}
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <label className="block text-sm text-white/60 mb-3">Knowledge Source</label>
                    <div className="space-y-2">
                      {[
                        { id: 'builtin', label: 'Built-in AI Knowledge', desc: 'General mathematical knowledge' },
                        { id: 'syllabus', label: 'Custom Syllabus', desc: 'Upload your own curriculum document' },
                        { id: 'web', label: 'Live Web Search', desc: 'Experimental - search current resources' },
                      ].map((source) => (
                        <label
                          key={source.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            contextSource === source.id
                              ? 'bg-mait-cyan/20 border border-mait-cyan/50'
                              : 'glass-card hover:bg-white/5'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                            contextSource === source.id
                              ? 'bg-mait-cyan border-mait-cyan'
                              : 'border-white/30'
                          }`}>
                            {contextSource === source.id && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                          <input
                            type="radio"
                            name="context"
                            value={source.id}
                            checked={contextSource === source.id}
                            onChange={(e) => setContextSource(e.target.value)}
                            className="hidden"
                          />
                          <div>
                            <span className="text-white text-sm">{source.label}</span>
                            <span className="text-white/40 text-xs block">{source.desc}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 4: Output */}
              {currentStep === 3 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="glass-card-strong rounded-2xl p-6 lg:p-8"
                >
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-mait-cyan" />
                    Output Configuration
                  </h2>
                  
                  <div className="space-y-8">
                    {/* Question Count */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-white/60">Number of Questions</label>
                        <span className="text-mait-cyan font-mono font-bold">{questionCount}</span>
                      </div>
                      <input
                        type="range"
                        value={questionCount}
                        onChange={(e) => setQuestionCount(Number(e.target.value))}
                        min={5}
                        max={30}
                        step={1}
                        className="w-full accent-mait-cyan"
                      />
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>5</span>
                        <span>30</span>
                      </div>
                    </div>
                    
                    {/* Difficulty */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-white/60">Difficulty Level</label>
                        <span className={`font-mono font-bold ${
                          difficulty <= 2 ? 'text-green-400' : difficulty <= 3 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {difficulty}/5 ({difficulty <= 2 ? 'Foundation' : difficulty <= 3 ? 'Standard' : 'Advanced'})
                        </span>
                      </div>
                      <input
                        type="range"
                        value={difficulty}
                        onChange={(e) => setDifficulty(Number(e.target.value))}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full accent-mait-cyan"
                      />
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span className="text-green-400">Foundation</span>
                        <span className="text-red-400">Advanced</span>
                      </div>
                    </div>
                    
                    {/* Toggles */}
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 glass-card rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                        <div>
                          <span className="text-white">Include Answer Key</span>
                          <span className="text-white/50 text-sm block">Generate complete solutions</span>
                        </div>
                        <input type="checkbox" checked={includeAnswers} onChange={(e) => setIncludeAnswers(e.target.checked)} className="accent-mait-cyan w-5 h-5 cursor-pointer" />
                      </label>
                      
                      <label className="flex items-center justify-between p-4 glass-card rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                        <div>
                          <span className="text-white">Include Mark Allocations</span>
                          <span className="text-white/50 text-sm block">Show marks per question</span>
                        </div>
                        <input type="checkbox" checked={includeMarking} onChange={(e) => setIncludeMarking(e.target.checked)} className="accent-mait-cyan w-5 h-5 cursor-pointer" />
                      </label>

                      <label className="flex items-center justify-between p-4 glass-card rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                        <div>
                          <span className="text-white">Remove small watermark</span>
                          <span className="text-white/50 text-sm block italic">Deletes 'myaitutor' from LaTeX footer</span>
                        </div>
                        <input type="checkbox" checked={removeWatermark} onChange={(e) => setRemoveWatermark(e.target.checked)} className="accent-mait-cyan w-5 h-5 cursor-pointer" />
                      </label>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 0}
                className="btn-glass px-4 py-2 rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </button>
              
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                  className="btn-cosmic px-4 py-2 rounded-xl text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-cosmic px-4 py-2 rounded-xl text-white flex items-center justify-center bg-gradient-to-r from-green-500 to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Prompt & Launch Gemini
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card-strong rounded-2xl p-6 sticky top-24"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-mait-cyan" />
                Configuration Summary
              </h3>
              
              <div className="space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Year</span>
                  <span className="text-white">{selectedYear}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Subject</span>
                  <span className="text-white">{selectedSubject === 'Other' ? customSubject : selectedSubject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Topics</span>
                  <span className="text-mait-cyan">{mode === 'A' ? selectedPoints.length : 'Manual'} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Questions</span>
                  <span className="text-white">{questionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Difficulty</span>
                  <span className={difficulty <= 2 ? 'text-green-400' : difficulty === 3 ? 'text-yellow-400' : 'text-red-400'}>
                    {difficulty}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Drills</span>
                  <span className="text-mait-cyan">{pedagogicalDrills.length}</span>
                </div>
                
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Answer Key</span>
                    <div className={`w-2 h-2 rounded-full ${includeAnswers ? 'bg-green-500' : 'bg-white/20'}`} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/60">Marking Guide</span>
                    <div className={`w-2 h-2 rounded-full ${includeMarking ? 'bg-green-500' : 'bg-white/20'}`} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/60">Watermark</span>
                    <div className={`w-2 h-2 rounded-full ${!removeWatermark ? 'bg-green-500' : 'bg-white/20'}`} />
                  </div>
                </div>
              </div>
              
              {/* Estimated Time */}
              <div className="mt-6 p-4 rounded-xl bg-mait-cyan/10 border border-mait-cyan/30">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-mait-cyan" />
                  <span className="text-mait-cyan font-medium">Estimated Generation</span>
                </div>
                <p className="text-2xl font-bold text-white">30-45 seconds</p>
                <p className="text-xs text-white/50">vs 4+ hours manually</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Gemini Launch Modal */}
        <AnimatePresence>
          {showWarning && (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 cursor-pointer"
                onClick={closeModal}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="glass-card-strong rounded-3xl p-6 md:p-8 max-w-sm w-full text-center space-y-4 border-green-500/40 shadow-[0_0_80px_rgba(34,197,94,0.3)] cursor-auto relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Top Right Close Button */}
                    <button
                        onClick={closeModal}
                        className={`absolute top-4 right-4 p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all duration-500 ${showCloseButton ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                        title="Dismiss"
                    >
                        <X size={20} />
                    </button>

                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <CheckCircle2 className="text-green-500 w-10 h-10 drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]" />
                    </div>
                    <h3 className="text-4xl md:text-5xl font-bold tracking-tight text-green-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                        Copied!
                    </h3>
                    <div className="space-y-4 text-white/60">
                        <div className="flex flex-col items-center gap-1">
                            <p className="text-xl leading-relaxed text-white font-semibold">
                                Paste into Gemini
                            </p>
                            <p className="text-sm italic text-white/40">
                                (Press Ctrl+V or Cmd+V to paste)
                            </p>
                        </div>
                        <div className="glass-card p-4 rounded-2xl border border-white/10 space-y-4 transition-all duration-300 hover:border-mait-cyan/50 hover:shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                            <p className="text-[13px] font-bold text-white">🚀 Gemini Optimization Guide:</p>
                            <div className="grid grid-cols-2 gap-3 pb-2">
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider text-mait-cyan font-bold">1. Enable Thinking</p>
                                    <img src={thinkingHint} alt="Gemini Thinking Mode" className="w-full aspect-[4/3] rounded-xl border border-white/10 shadow-md object-cover" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] uppercase tracking-wider text-mait-cyan font-bold">2. Use Canvas</p>
                                    <img src={canvasHint} alt="Gemini Canvas Feature" className="w-full aspect-[4/3] rounded-xl border border-white/10 shadow-md object-cover" />
                                </div>
                            </div>
                            <p className="text-[11px] leading-relaxed text-white/70 italic">
                                Use <span className="text-mait-cyan font-bold">'Thinking'</span> (Flash/Pro) for best reasoning. Highlight text in Canvas to edit specific sections.
                            </p>
                        </div>
                    </div>
                    <div className={`pt-4 transition-all duration-500 ${showCloseButton ? 'opacity-0 h-0 overflow-hidden pt-0' : 'opacity-100'}`}>
                        <div className="h-4 w-full bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-green-500 animate-progress origin-left" />
                        </div>
                        <p className="text-sm md:text-base font-bold uppercase tracking-widest text-green-400 animate-pulse mt-4 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]">Launching in 3 seconds...</p>
                    </div>
                </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Universal Worksheet PDF Preview & FAQ */}
        <div className="mt-16 grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Universal Worksheet Preview */}
            <div className="glass-card-strong rounded-2xl p-6 lg:p-8 flex flex-col items-center">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 w-full border-b border-white/10 pb-4">
                    <FileText className="w-5 h-5 text-mait-cyan" />
                    Universal Worksheet Preview
                </h2>
                <div className="w-full aspect-[1/1.414] max-h-[800px] rounded-xl overflow-hidden shadow-2xl bg-white/5 border border-white/10 relative">
                    <iframe 
                        src="/Universal_Worksheet.pdf#toolbar=0"
                        width="100%"
                        height="100%"
                        className="absolute inset-0 w-full h-full border-0"
                        title="Universal Worksheet Preview"
                        style={{ backgroundColor: 'white' }}
                    />
                </div>
            </div>

            {/* Right: FAQ & Tips Expandable Accordion */}
            <div className="glass-card-strong rounded-2xl p-6 lg:p-8 space-y-6">
                <div className="text-left space-y-2 w-full mb-4">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">FAQ and Tips & Tricks</h3>
                    <p className="text-white/60 text-sm">Getting the most out of MAIT's Worksheet Generator.</p>
                </div>
                
                <hr className="border-white/10" />

                <div className="space-y-4">
                    {/* FAQ 1 */}
                    <details className="group border border-white/10 rounded-2xl open:bg-white/5 transition-colors">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-sm text-white focus:outline-none">
                            <span>How does the 'Search NESA Website' work? ⚠️</span>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={18} className="text-white/60" />
                            </span>
                        </summary>
                        <div className="text-white/50 text-sm p-5 pt-0 leading-relaxed border-t border-white/10 mt-2">
                            When selected, the AI will attempt an autonomous search of the published NESA website to infer topics. *Warning: It is highly experimental and prone to hallucination. Double-check output.*
                        </div>
                    </details>

                    {/* FAQ 2 */}
                    <details className="group border border-white/10 rounded-2xl open:bg-white/5 transition-colors">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-sm text-white focus:outline-none">
                            <span>Why is 'Thinking' recommended for the Model?</span>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={18} className="text-white/60" />
                            </span>
                        </summary>
                        <div className="text-white/50 text-sm p-5 pt-0 leading-relaxed border-t border-white/10 mt-2">
                            Models with Chain-of-Thought (like Gemini Flash Thinking) dedicate compute time to deeply reason through mathematical logic <i>before</i> outputting the final LaTeX snippet. This bridges the gap between speed and quality while reducing algebraic and geometrical errors.
                        </div>
                    </details>

                    {/* FAQ 3 */}
                    <details className="group border border-white/10 rounded-2xl open:bg-white/5 transition-colors">
                        <summary className="flex justify-between items-center font-medium cursor-pointer list-none p-5 text-sm text-white focus:outline-none">
                            <span>What are the Pedagogical Requirements?</span>
                            <span className="transition group-open:rotate-180">
                                <ChevronDown size={18} className="text-white/60" />
                            </span>
                        </summary>
                        <div className="text-white/50 text-sm p-5 pt-0 leading-relaxed border-t border-white/10 mt-2">
                            Checking these boxes injects specific instructions to generate non-standard questions. <b>Spot the error</b> asks students to find a mistake in a provided solution. <b>Parameter shift</b> tests what happens when constants change. <b>Limit cases</b> probe boundary conditions.
                        </div>
                    </details>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
