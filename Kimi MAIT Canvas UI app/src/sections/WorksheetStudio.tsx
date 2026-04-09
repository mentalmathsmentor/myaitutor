import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Check,
  GraduationCap,
  BookOpen,
  Calculator,
  Settings,
  Sparkles,
  ExternalLink,
  Brain,
  ChevronDown,
  ChevronUp,
  Layout,
  User,
  Calendar,
  Lightbulb,
  Droplets,
  HelpCircle,
  CheckCircle2,
  MessageSquare,
  Send,
  FileQuestion,
  Link2,
  LayoutTemplate,
  Code2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { InlineCanvas } from '@/components/canvas/InlineCanvas';
import type { Section } from '../App';

interface WorksheetStudioProps {
  setCurrentSection: (section: Section) => void;
}

export default function WorksheetStudio({ setCurrentSection }: WorksheetStudioProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeminiHint, setShowGeminiHint] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);

  // Form State
  const [yearLevel, setYearLevel] = useState('12');
  const [subject, setSubject] = useState('math-advanced');
  const [customSubject, setCustomSubject] = useState('');
  const [showCustomSubject, setShowCustomSubject] = useState(false);
  const [topics, setTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [difficulty, setDifficulty] = useState(3);
  const [layout, setLayout] = useState('dynamic');
  const [pedagogicalDrills, setPedagogicalDrills] = useState<string[]>([]);
  const [contextSource, setContextSource] = useState('builtin');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Output Toggles
  const [outputToggles, setOutputToggles] = useState({
    nameSpace: true,
    dateSpace: true,
    setupGuide: false,
    firstTime: false,
    removeWatermark: false,
    showHints: false,
    answerKey: true,
    allocateMarks: true,
  });

  const steps = [
    { id: 'curriculum', title: 'Curriculum', icon: GraduationCap },
    { id: 'topics', title: 'Topics', icon: BookOpen },
    { id: 'pedagogy', title: 'Pedagogy', icon: Brain },
    { id: 'output', title: 'Output', icon: Settings },
  ];

  const yearLevels = [
    { value: 'k', label: 'Kindergarten' },
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

  const layouts = [
    { value: 'dynamic', label: 'Dynamic Space', desc: 'Adaptive spacing based on question type' },
    { value: 'working', label: 'Working Blank Space', desc: 'Generous space for calculations' },
    { value: 'compact', label: 'Two-column Compact', desc: 'Maximize questions per page' },
    { value: 'ruled', label: 'Ruled Lines (Writing)', desc: 'Guided handwriting practice' },
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

  const toggleTopic = (topic: string) => {
    setTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  const toggleDrill = (drill: string) => {
    setPedagogicalDrills(prev => 
      prev.includes(drill)
        ? prev.filter(d => d !== drill)
        : [...prev, drill]
    );
  };

  const toggleOutput = (key: keyof typeof outputToggles) => {
    setOutputToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubjectSelect = (subjValue: string) => {
    if (subjValue === 'other') {
      setShowCustomSubject(true);
      setSubject('other');
    } else {
      setShowCustomSubject(false);
      setSubject(subjValue);
    }
  };

  const generatePrompt = () => {
    const subjectName = subject === 'other' ? customSubject : subjects.find(s => s.value === subject)?.label;
    const yearName = yearLevels.find(y => y.value === yearLevel)?.label;
    const difficultyLabel = ['Mixed', 'Easy→Hard Progression', 'Mostly Easy', 'Mostly Hard', 'Exam-Style'][difficulty - 1];
    const layoutLabel = layouts.find(l => l.value === layout)?.label;
    
    return `Generate a ${yearName} ${subjectName} worksheet with the following specifications:

**CURRICULUM ALIGNMENT:**
- Year Level: ${yearName}
- Subject: ${subjectName}
- Syllabus Outcomes: ${topics.join(', ') || 'General curriculum'}

**WORKSHEET PARAMETERS:**
- Number of Questions: ${questionCount}
- Difficulty Level: ${difficultyLabel}
- Page Layout: ${layoutLabel}

**PEDAGOGICAL REQUIREMENTS:**
${pedagogicalDrills.includes('spot-error') ? '- Include "Spot the Error" questions with deliberately flawed working\n' : ''}${pedagogicalDrills.includes('parameter-shift') ? '- Include "Parameter Shift" questions testing variable manipulation\n' : ''}${pedagogicalDrills.includes('limit-case') ? '- Include "Limit Case Analysis" questions at extreme bounds\n' : ''}${pedagogicalDrills.includes('proof-style') ? '- Include rigorous proof-style questions\n' : ''}${pedagogicalDrills.includes('word-problems') ? '- Include contextual word problems with real-world applications\n' : ''}${pedagogicalDrills.includes('multi-step') ? '- Include multi-step synthesis problems\n' : ''}
**CONTEXT SOURCE:** ${contextSource === 'builtin' ? 'AI general knowledge' : contextSource === 'custom' ? 'Custom syllabus (to be uploaded)' : 'Live web search (experimental)'}

**OUTPUT SETTINGS:**
${outputToggles.nameSpace ? '- Include name field\n' : ''}${outputToggles.dateSpace ? '- Include date field\n' : ''}${outputToggles.setupGuide ? '- Include setup guide\n' : ''}${outputToggles.firstTime ? '- Add beginner-friendly hints\n' : ''}${outputToggles.removeWatermark ? '- Remove watermark\n' : ''}${outputToggles.showHints ? '- Show hints for each question\n' : ''}${outputToggles.answerKey ? '- Include complete answer key\n' : ''}${outputToggles.allocateMarks ? '- Include mark allocations\n' : ''}
**OUTPUT FORMAT:**
Generate valid LaTeX code using this preamble:
\\documentclass[11pt, a4paper]{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\usepackage{fontspec}
\\usepackage[english]{babel}
\\babelfont{rm}{Noto Sans}
\\usepackage{amsmath, amssymb, tikz}
\\usetikzlibrary{arrows.meta, calc, angles, quotes}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

**REQUIREMENTS:**
- Use TikZ for ALL diagrams (no external images)
- Include clear question numbering
- Format for easy printing (A4)
- Follow NESA exam styling conventions

Generate the complete LaTeX document:`;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    
    // Copy to clipboard
    await navigator.clipboard.writeText(generatePrompt());
    
    // Open Gemini
    window.open('https://gemini.google.com', '_blank');
    
    setIsGenerating(false);
    setShowGeminiHint(true);
  };

  const handleSendFeedback = () => {
    if (feedback.trim()) {
      // Simulate API call
      setTimeout(() => {
        setFeedbackSent(true);
        setFeedback('');
        setTimeout(() => setFeedbackSent(false), 3000);
      }, 500);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      if (subject === 'other') return customSubject.trim().length > 0;
      return yearLevel && subject;
    }
    if (currentStep === 1) return topics.length > 0;
    return true;
  };

  const getSubjectDisplay = () => {
    if (subject === 'other') return customSubject || 'Custom Subject';
    return subjects.find(s => s.value === subject)?.label;
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
              onClick={() => setCurrentSection('landing')}
              className="flex items-center gap-2 text-white/60 hover:text-white transition-colors mb-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Home
            </button>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <FileText className="w-8 h-8 text-mait-cyan" />
              Worksheet Studio
            </h1>
            <p className="text-white/60">A.G.E. Pipeline — Artifact Generation Engine</p>
          </div>
          
          <div className="glass-card px-4 py-2 rounded-lg flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-white/80">A.G.E. Online</span>
          </div>
        </motion.div>

        {/* Progress Steps - Desktop */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="hidden lg:block glass-card-strong rounded-xl p-4 mb-8"
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
                  <span className="font-medium">{step.title}</span>
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

        {/* Progress Steps - Mobile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:hidden glass-card-strong rounded-xl p-4 mb-8"
        >
          <div className="flex flex-col gap-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  index === currentStep 
                    ? 'bg-mait-cosmic text-white' 
                    : index < currentStep 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-white/10 text-white/40'
                }`}>
                  {index < currentStep ? <Check className="w-3 h-3" /> : <span className="text-xs">{index + 1}</span>}
                </div>
                <span className={`text-sm ${index === currentStep ? 'text-white' : 'text-white/50'}`}>
                  {step.title}
                </span>
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
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-mait-cyan" />
                    Curriculum Selection
                  </h2>
                  
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm text-white/60 mb-3">Year Level</label>
                      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                        {yearLevels.map((year) => (
                          <button
                            key={year.value}
                            onClick={() => setYearLevel(year.value)}
                            className={`px-2 py-2 rounded-lg text-sm font-medium transition-all ${
                              yearLevel === year.value
                                ? 'bg-mait-cosmic text-white shadow-neon-purple'
                                : 'glass-card text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {year.label.replace('Year ', 'Y').replace('Kindergarten', 'K')}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-white/60 mb-3">Subject</label>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {subjects.map((subj) => (
                          <button
                            key={subj.value}
                            onClick={() => handleSubjectSelect(subj.value)}
                            className={`px-4 py-3 rounded-lg text-left transition-all ${
                              subject === subj.value && !showCustomSubject
                                ? 'bg-mait-cosmic/20 border border-mait-cosmic/50 text-white'
                                : 'glass-card text-white/70 hover:text-white'
                            }`}
                          >
                            {subj.label}
                          </button>
                        ))}
                        <button
                          onClick={() => handleSubjectSelect('other')}
                          className={`px-4 py-3 rounded-lg text-left transition-all ${
                            showCustomSubject
                              ? 'bg-mait-cosmic/20 border border-mait-cosmic/50 text-white'
                              : 'glass-card text-white/70 hover:text-white border border-dashed border-white/30'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4" />
                            Other (Custom)
                          </span>
                        </button>
                      </div>
                      
                      {/* Custom Subject Input */}
                      <AnimatePresence>
                        {showCustomSubject && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-4"
                          >
                            <input
                              type="text"
                              value={customSubject}
                              onChange={(e) => setCustomSubject(e.target.value)}
                              placeholder="Enter custom subject name..."
                              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:border-mait-cyan focus:outline-none transition-colors"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
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
                  <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-mait-cyan" />
                    Topic Selection
                  </h2>
                  <p className="text-white/60 text-sm mb-6">
                    Select specific syllabus dot-points from the NESA curriculum
                  </p>
                  
                  <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {topicOptions.map((category) => (
                      <div key={category.category} className="glass-card p-4 rounded-xl">
                        <h3 className="text-white font-medium mb-3">{category.category}</h3>
                        <div className="space-y-2">
                          {category.items.map((item) => (
                            <label
                              key={item}
                              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-colors min-h-[44px]"
                            >
                              <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                topics.includes(item)
                                  ? 'bg-mait-cosmic border-mait-cosmic'
                                  : 'border-white/30'
                              }`}>
                                {topics.includes(item) && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                checked={topics.includes(item)}
                                onChange={() => toggleTopic(item)}
                                className="hidden"
                              />
                              <span className="text-sm text-white/70">{item}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4 p-3 rounded-lg bg-mait-cyan/10 border border-mait-cyan/30 flex items-center gap-2">
                    <Check className="w-4 h-4 text-mait-cyan" />
                    <span className="text-sm text-mait-cyan">{topics.length} topics selected</span>
                  </div>
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
                        { id: 'builtin', label: 'AI general knowledge', desc: 'General mathematical knowledge' },
                        { id: 'custom', label: 'Custom syllabus', desc: 'Upload your own curriculum document' },
                        { id: 'web', label: 'Search NESA Website ⚠️', desc: 'Experimental - prone to hallucination' },
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
                        <label className="text-white/80 font-medium">Number of Questions</label>
                        <span className="text-mait-cyan font-mono font-bold text-lg">{questionCount}</span>
                      </div>
                      <Slider
                        value={[questionCount]}
                        onValueChange={(value) => setQuestionCount(value[0])}
                        min={5}
                        max={30}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-white/40 mt-1">
                        <span>5</span>
                        <span>30</span>
                      </div>
                    </div>
                    
                    {/* Difficulty */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-white/80 font-medium">Question Difficulty</label>
                        <span className={`font-mono font-bold ${
                          difficulty <= 2 ? 'text-green-400' : difficulty <= 3 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {['Mixed', 'Easy→Hard', 'Mostly Easy', 'Mostly Hard', 'Exam-Style'][difficulty - 1]}
                        </span>
                      </div>
                      <Slider
                        value={[difficulty]}
                        onValueChange={(value) => setDifficulty(value[0])}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Advanced Formatting Accordion */}
                    <div className="border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full px-4 py-3 flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <span className="text-white/80 font-medium flex items-center gap-2">
                          <Layout className="w-4 h-4" />
                          Advanced Formatting
                        </span>
                        {showAdvanced ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
                      </button>

                      <AnimatePresence>
                        {showAdvanced && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="p-4 space-y-6">
                              {/* Layout Dropdown */}
                              <div>
                                <label className="text-white/60 text-sm mb-2 block">Working Space / Page Layout</label>
                                <div className="grid sm:grid-cols-2 gap-2">
                                  {layouts.map((l) => (
                                    <button
                                      key={l.value}
                                      onClick={() => setLayout(l.value)}
                                      className={`p-3 rounded-lg text-left transition-all ${
                                        layout === l.value
                                          ? 'bg-mait-cosmic/30 border border-mait-cosmic/50'
                                          : 'bg-white/5 hover:bg-white/10 border border-transparent'
                                      }`}
                                    >
                                      <span className="text-white text-sm block">{l.label}</span>
                                      <span className="text-white/40 text-xs">{l.desc}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Output Toggles Grid */}
                              <div>
                                <label className="text-white/60 text-sm mb-3 block">Configuration / Output Settings</label>
                                <div className="grid sm:grid-cols-2 gap-3">
                                  {[
                                    { key: 'nameSpace', label: 'Name space', icon: User },
                                    { key: 'dateSpace', label: 'Date space', icon: Calendar },
                                    { key: 'setupGuide', label: 'Setup guide', icon: BookOpen },
                                    { key: 'firstTime', label: 'First Time?', icon: Lightbulb, desc: 'Adds beginner hints' },
                                    { key: 'removeWatermark', label: 'Remove small watermark', icon: Droplets },
                                    { key: 'showHints', label: 'Show Hints?', icon: HelpCircle },
                                    { key: 'answerKey', label: 'Answer Key', icon: CheckCircle2 },
                                    { key: 'allocateMarks', label: 'Allocate Marks', icon: CheckCircle2, desc: 'Experimental' },
                                  ].map(({ key, label, icon: Icon, desc }) => (
                                    <label
                                      key={key}
                                      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors min-h-[44px]"
                                    >
                                      <Switch
                                        checked={outputToggles[key as keyof typeof outputToggles]}
                                        onCheckedChange={() => toggleOutput(key as keyof typeof outputToggles)}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <Icon className="w-4 h-4 text-white/50" />
                                          <span className="text-white/80 text-sm">{label}</span>
                                        </div>
                                        {desc && <span className="text-white/40 text-xs block ml-6">{desc}</span>}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              <Button
                onClick={() => setCurrentStep(prev => prev - 1)}
                disabled={currentStep === 0}
                variant="outline"
                className="btn-glass disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  disabled={!canProceed()}
                  className="btn-cosmic disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <div className="flex items-center gap-3">
                  {/* Open in Canvas Button */}
                  <Button
                    onClick={() => setShowCanvas(true)}
                    variant="outline"
                    className="btn-glass hidden sm:flex"
                  >
                    <Code2 className="w-4 h-4 mr-2" />
                    Edit in Canvas
                  </Button>
                  
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn-cosmic bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    {isGenerating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                        Copying...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Prompt
                        <ExternalLink className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Inline Instructions after Generate */}
            <AnimatePresence>
              {showGeminiHint && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-4 p-4 rounded-xl bg-mait-cyan/10 border border-mait-cyan/30"
                >
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-mait-cyan flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-mait-cyan font-medium mb-1">Prompt copied to clipboard!</p>
                      <p className="text-white/70 text-sm">
                        Paste into Gemini → Click <strong>Canvas</strong> → Select <strong>'Pro'</strong> or <strong>'Thinking'</strong> model
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Preview Panel - Desktop */}
          <div className="hidden lg:block lg:col-span-1">
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
                  <span className="text-white">{yearLevels.find(y => y.value === yearLevel)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Subject</span>
                  <span className="text-white">{getSubjectDisplay()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Topics</span>
                  <span className="text-mait-cyan">{topics.length} selected</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Questions</span>
                  <span className="text-white">{questionCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Difficulty</span>
                  <span className={difficulty <= 2 ? 'text-green-400' : difficulty <= 3 ? 'text-yellow-400' : 'text-red-400'}>
                    {difficulty}/5
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Layout</span>
                  <span className="text-white">{layouts.find(l => l.value === layout)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Drills</span>
                  <span className="text-mait-cyan">{pedagogicalDrills.length}</span>
                </div>
                
                <div className="border-t border-white/10 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Answer Key</span>
                    <div className={`w-2 h-2 rounded-full ${outputToggles.answerKey ? 'bg-green-500' : 'bg-white/20'}`} />
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-white/60">Marking Guide</span>
                    <div className={`w-2 h-2 rounded-full ${outputToggles.allocateMarks ? 'bg-green-500' : 'bg-white/20'}`} />
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

        {/* Mobile Summary Panel */}
        <div className="lg:hidden mt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card-strong rounded-2xl p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white/60 text-sm">Configuration</span>
              <span className="text-mait-cyan text-sm">{topics.length} topics • {questionCount} Qs</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-white/60">{getSubjectDisplay()}</span>
              <span className="text-white">{yearLevels.find(y => y.value === yearLevel)?.label}</span>
            </div>
          </motion.div>
        </div>

        {/* Inline Canvas - Full Width Side-by-Side Layout */}
        <AnimatePresence>
          {showCanvas && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <LayoutTemplate className="w-5 h-5 text-mait-cyan" />
                  MAIT Native Canvas
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-white/50 text-sm">Dual-pane LaTeX Editor</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCanvas(false)}
                    className="text-white/50 hover:text-white"
                  >
                    Hide
                  </Button>
                </div>
              </div>
              
              <InlineCanvas 
                config={{
                  yearLevel: yearLevels.find(y => y.value === yearLevel)?.label || yearLevel,
                  subject: getSubjectDisplay() || 'Custom Subject',
                  topics,
                  questionCount,
                  difficulty
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Exemplar Worksheet Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 grid lg:grid-cols-2 gap-8"
        >
          {/* Exemplar Preview */}
          <div className="glass-card-strong rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-mait-cyan" />
              Exemplar Worksheet
            </h3>
            <p className="text-white/60 text-sm mb-4">
              A preview of a Masterclass Diagnostic Exam generated by the A.G.E. Pipeline
            </p>
            
            {/* PDF Preview Mock */}
            <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-500">
              <div className="bg-gray-100 px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <span className="ml-4 text-xs text-gray-500 font-mono">UNIVERSAL_WORKSHEET_DRAFT.pdf</span>
              </div>
              
              <div className="p-6 bg-white">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-bold text-gray-800">Mathematics Advanced</h4>
                  <p className="text-sm text-gray-500">Diagnostic Exam — Integration by Parts</p>
                </div>
                
                <div className="space-y-3">
                  {[1, 2, 3].map((num) => (
                    <div key={num} className="border-b border-gray-100 pb-3">
                      <p className="text-sm text-gray-700 mb-1">
                        <span className="font-bold">{num}.</span> Evaluate:
                      </p>
                      <div className="bg-gray-50 p-2 rounded text-center">
                        <span className="font-mono text-gray-800 text-sm">
                          {num === 1 && '∫ x² · ln(x) dx'}
                          {num === 2 && '∫ eˣ · cos(x) dx'}
                          {num === 3 && '∫ x · sin(2x) dx'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-200 text-center">
                  <span className="text-xs text-gray-400">End of Preview — 15 Questions Total</span>
                </div>
                
                {/* Rickroll Easter Egg hint */}
                <div className="mt-3 text-center">
                  <span className="text-[10px] text-gray-300">🎵 Never gonna give you up... 🎵</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ & Feedback */}
          <div className="space-y-6">
            {/* FAQ Accordion */}
            <div className="glass-card-strong rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">FAQ & Tips</h3>
              
              <div className="space-y-3">
                {[
                  {
                    q: "How does 'Search NESA Website' work? ⚠️",
                    a: "When selected, the AI will attempt an autonomous search of the published NESA website to infer topics. Warning: It is highly experimental and prone to hallucination. Double-check output."
                  },
                  {
                    q: "Why is 'Thinking' recommended for the Model?",
                    a: "Models with Chain-of-Thought (like Gemini Pro Thinking) dedicate compute time to deeply reason through mathematical logic before outputting the final LaTeX snippet. This drastically reduces algebraic and geometrical errors."
                  },
                  {
                    q: "What are the Pedagogical Requirements?",
                    a: "Checking these boxes injects specific instructions to generate non-standard questions. Spot the error asks students to find a mistake. Parameter shift tests what happens when constants change. Limit cases probe boundary conditions."
                  },
                ].map((faq, idx) => (
                  <details key={idx} className="group">
                    <summary className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 cursor-pointer transition-colors">
                      <span className="text-white/80 text-sm">{faq.q}</span>
                      <ChevronDown className="w-4 h-4 text-white/50 group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="p-3 text-white/60 text-sm">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>

            {/* Feedback Section */}
            <div className="glass-card-strong rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-mait-cyan" />
                Feedback & Support
              </h3>
              <p className="text-white/60 text-sm mb-4">
                Found a bug or have a suggestion? Let us know!
              </p>
              
              <div className="space-y-3">
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Describe your issue or suggestion..."
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/40 focus:border-mait-cyan focus:outline-none transition-colors resize-none"
                  rows={3}
                />
                <Button
                  onClick={handleSendFeedback}
                  disabled={!feedback.trim() || feedbackSent}
                  className="w-full btn-glass disabled:opacity-50"
                >
                  {feedbackSent ? (
                    <>
                      <Check className="w-4 h-4 mr-2 text-green-400" />
                      Feedback Sent!
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Feedback
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* External Resources */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-12"
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-mait-cyan" />
            External Resources
          </h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* First Education */}
            <a
              href="https://hscmathsbytopic.firsteducation.com.au/"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card-strong rounded-2xl p-6 hover:border-mait-cyan/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-mait-cyan transition-colors" />
              </div>
              <h4 className="text-white font-bold mb-1">First Education</h4>
              <p className="text-mait-cyan text-sm mb-2">HSC Question Topic Test Maker</p>
              <p className="text-white/60 text-sm">
                Build custom topic tests from real HSC questions. Select topics to include or exclude, 
                then generate a printable PDF.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Topic Selection', 'Custom PDFs', 'Answer Keys'].map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs rounded bg-white/10 text-white/60">
                    {tag}
                  </span>
                ))}
              </div>
            </a>

            {/* THSC Online */}
            <a
              href="https://thsconline.github.io/s/"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card-strong rounded-2xl p-6 hover:border-mait-cyan/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <ExternalLink className="w-5 h-5 text-white/40 group-hover:text-mait-cyan transition-colors" />
              </div>
              <h4 className="text-white font-bold mb-1">THSC Online</h4>
              <p className="text-mait-cyan text-sm mb-2">Past Papers & Trial Exams</p>
              <p className="text-white/60 text-sm">
                The most comprehensive archive of HSC trial papers from schools across NSW. 
                Includes official NESA papers and sample answers.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['655+ Trial Papers', 'Official HSC', 'Solutions'].map(tag => (
                  <span key={tag} className="px-2 py-1 text-xs rounded bg-white/10 text-white/60">
                    {tag}
                  </span>
                ))}
              </div>
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
