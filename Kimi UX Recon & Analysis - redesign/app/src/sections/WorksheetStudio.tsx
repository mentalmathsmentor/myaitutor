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
  AlertCircle,
  Copy,
  ExternalLink,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Section } from '../App';

interface WorksheetStudioProps {
  setCurrentSection: (section: Section) => void;
}

export default function WorksheetStudio({ setCurrentSection }: WorksheetStudioProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGeminiHint, setShowGeminiHint] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [yearLevel, setYearLevel] = useState('12');
  const [subject, setSubject] = useState('math-advanced');
  const [topics, setTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [difficulty, setDifficulty] = useState(3);
  const [pedagogicalDrills, setPedagogicalDrills] = useState<string[]>([]);
  const [contextSource, setContextSource] = useState('builtin');
  const [includeAnswers, setIncludeAnswers] = useState(true);
  const [includeMarking, setIncludeMarking] = useState(true);

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

  const generatePrompt = () => {
    const subjectName = subjects.find(s => s.value === subject)?.label;
    const yearName = yearLevels.find(y => y.value === yearLevel)?.label;
    
    return `Generate a ${yearName} ${subjectName} worksheet with the following specifications:

**CURRICULUM ALIGNMENT:**
- Year Level: ${yearName}
- Subject: ${subjectName}
- Syllabus Outcomes: ${topics.join(', ') || 'General curriculum'}

**WORKSHEET PARAMETERS:**
- Number of Questions: ${questionCount}
- Difficulty Level: ${difficulty}/5 (${difficulty <= 2 ? 'Foundation' : difficulty <= 3 ? 'Standard' : 'Advanced'})
- Pedagogical Drills: ${pedagogicalDrills.length > 0 ? pedagogicalDrills.join(', ') : 'Standard practice'}

**PEDAGOGICAL REQUIREMENTS:**
${pedagogicalDrills.includes('spot-error') ? '- Include "Spot the Error" questions with deliberately flawed working\n' : ''}${pedagogicalDrills.includes('parameter-shift') ? '- Include "Parameter Shift" questions testing variable manipulation\n' : ''}${pedagogicalDrills.includes('limit-case') ? '- Include "Limit Case Analysis" questions at extreme bounds\n' : ''}${pedagogicalDrills.includes('proof-style') ? '- Include rigorous proof-style questions\n' : ''}${pedagogicalDrills.includes('word-problems') ? '- Include contextual word problems with real-world applications\n' : ''}${pedagogicalDrills.includes('multi-step') ? '- Include multi-step synthesis problems\n' : ''}
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
- ${includeAnswers ? 'Include a complete answer key after the questions' : 'Questions only'}
- ${includeMarking ? 'Include mark allocations for each question' : ''}
- Format for easy printing (A4)

Generate the complete LaTeX document:`;
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowGeminiHint(true);
    }, 1500);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatePrompt());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canProceed = () => {
    if (currentStep === 0) return yearLevel && subject;
    if (currentStep === 1) return topics.length > 0;
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
                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              yearLevel === year.value
                                ? 'bg-mait-cosmic text-white shadow-neon-purple'
                                : 'glass-card text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {year.label.replace('Year ', 'Y')}
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
                            onClick={() => setSubject(subj.value)}
                            className={`px-4 py-3 rounded-lg text-left transition-all ${
                              subject === subj.value
                                ? 'bg-mait-cosmic/20 border border-mait-cosmic/50 text-white'
                                : 'glass-card text-white/70 hover:text-white'
                            }`}
                          >
                            {subj.label}
                          </button>
                        ))}
                      </div>
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
                              className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
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
                        <label className="text-white/60">Difficulty Level</label>
                        <span className={`font-mono font-bold ${
                          difficulty <= 2 ? 'text-green-400' : difficulty <= 3 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {difficulty}/5 ({difficulty <= 2 ? 'Foundation' : difficulty <= 3 ? 'Standard' : 'Advanced'})
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
                        <Switch checked={includeAnswers} onCheckedChange={setIncludeAnswers} />
                      </label>
                      
                      <label className="flex items-center justify-between p-4 glass-card rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                        <div>
                          <span className="text-white">Include Mark Allocations</span>
                          <span className="text-white/50 text-sm block">Show marks per question</span>
                        </div>
                        <Switch checked={includeMarking} onCheckedChange={setIncludeMarking} />
                      </label>
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
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="btn-cosmic bg-gradient-to-r from-green-500 to-emerald-500"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Prompt
                    </>
                  )}
                </Button>
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
                  <span className="text-white">{yearLevels.find(y => y.value === yearLevel)?.label}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/60">Subject</span>
                  <span className="text-white">{subjects.find(s => s.value === subject)?.label}</span>
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

        {/* Gemini Hint Modal */}
        <AnimatePresence>
          {showGeminiHint && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="glass-card-strong rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-mait-cyan" />
                    Launch in Gemini
                  </h2>
                  <button
                    onClick={() => setShowGeminiHint(false)}
                    className="text-white/40 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Hint Box */}
                  <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-400 font-medium mb-1">Pro Tip</p>
                      <p className="text-white/70 text-sm">
                        For best results, enable <strong>Canvas</strong> mode and <strong>Thinking</strong> mode 
                        in Gemini before pasting the prompt. This ensures proper LaTeX formatting.
                      </p>
                    </div>
                  </div>
                  
                  {/* Prompt Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-white/60">Generated Prompt</label>
                      <button
                        onClick={copyToClipboard}
                        className="flex items-center gap-2 text-sm text-mait-cyan hover:text-mait-cyan/80 transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <div className="glass-card p-4 rounded-xl font-mono text-sm text-white/70 max-h-64 overflow-y-auto custom-scrollbar">
                      <pre className="whitespace-pre-wrap">{generatePrompt()}</pre>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href="https://gemini.google.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-cosmic text-white px-6 py-4 rounded-xl flex items-center justify-center gap-2"
                    >
                      <ExternalLink className="w-5 h-5" />
                      Open Gemini
                    </a>
                    <button
                      onClick={() => setShowGeminiHint(false)}
                      className="flex-1 btn-glass text-white px-6 py-4 rounded-xl"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
