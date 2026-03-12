import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  FileText,
  GraduationCap,
  Search,
  Settings,
  Sparkles,
  X,
} from 'lucide-react';
import MathInput from './components/MathInput';
import syllabusData from './syllabus_data.json';
import stageSubjects from './stage_subjects.json';
import canvasHint from './assets/gemini-canvas-final.png';
import modelSelectorHint from './assets/gemini-model-selector.png';

const API_URL = import.meta.env.VITE_API_URL || 'https://myaitutor-54iv.onrender.com';

const STAGES = Object.keys(stageSubjects);
const SPACING_OPTIONS = ['Working Blank Space (Math)', 'Two-column Compact', 'Ruled lines (Writing)', 'Compact (No space)', 'Dynamic Space'];
const DIFFICULTY_OPTIONS = ['Mixed', 'Easy -> Hard Progression', 'Mostly Easy', 'Mostly Hard', 'Exam-Style'];
const MANUAL_ONLY_SUBJECTS = new Set(['English', 'Chemistry', 'Biology']);

const HIERARCHY_MAP = {
  'Year 11 Extension 1': ['Year 11 Advanced'],
  'Year 12 Extension 1': ['Year 12 Advanced'],
  'Year 12 Extension 2': ['Year 12 Advanced', 'Year 12 Extension 1'],
};

function buildMergedSyllabus(yearLevel) {
  const base = syllabusData[yearLevel] || {};
  const parents = HIERARCHY_MAP[yearLevel];
  if (!parents) {
    return base;
  }

  const merged = JSON.parse(JSON.stringify(base));

  for (const parentLevel of parents) {
    const parentData = syllabusData[parentLevel];
    if (!parentData) {
      continue;
    }

    const label = `${parentLevel} (Prerequisite)`;
    const flatSubtopics = {};
    for (const [moduleName, subtopics] of Object.entries(parentData)) {
      for (const [subtopicName, points] of Object.entries(subtopics)) {
        flatSubtopics[`${moduleName} -> ${subtopicName}`] = points;
      }
    }
    merged[label] = flatSubtopics;
  }

  return merged;
}

const latexCache = new Map();

function renderLatex(text) {
  if (latexCache.has(text)) {
    return latexCache.get(text);
  }

  const katex = window.katex;
  const parts = text.split(/(\$[^$]+\$)/g);
  const html = parts
    .map((part) => {
      if (katex && part.startsWith('$') && part.endsWith('$')) {
        try {
          return katex.renderToString(part.slice(1, -1), {
            throwOnError: false,
            displayMode: false,
          });
        } catch {
          return part;
        }
      }
      return part
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    })
    .join('');

  latexCache.set(text, html);
  return html;
}

function getStageYearLevel(stage) {
  if (stage === 'Stage 4 (Yr 7-8)') {
    return 7;
  }
  if (stage === 'Stage 5 (Yr 9-10)') {
    return 9;
  }
  if (stage === 'Year 11') {
    return 11;
  }
  if (stage === 'Year 12') {
    return 12;
  }
  return null;
}

function isMathsSubject(subject) {
  return subject.toLowerCase().includes('mathematics');
}

export default function WorksheetGenerator({ navigate }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [generationSuccess, setGenerationSuccess] = useState('');

  const [showWarning, setShowWarning] = useState(false);
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const [schoolName, setSchoolName] = useState('');
  const [selectedStage, setSelectedStage] = useState(() => localStorage.getItem('mait_ws_stage') || 'Year 12');
  const [selectedSubject, setSelectedSubject] = useState(() => {
    const savedStage = localStorage.getItem('mait_ws_stage') || 'Year 12';
    const savedSubject = localStorage.getItem('mait_ws_subject');
    if (
      savedSubject &&
      (savedSubject === 'Other' || (stageSubjects[savedStage] && stageSubjects[savedStage][savedSubject]))
    ) {
      return savedSubject;
    }
    return stageSubjects[savedStage] ? Object.keys(stageSubjects[savedStage])[0] : 'Mathematics';
  });
  const [customSubject, setCustomSubject] = useState('');
  const [syllabusContextMode, setSyllabusContextMode] = useState('Off');
  const [textbooksProvided, setTextbooksProvided] = useState(false);
  const [pedagogicalSpotError, setPedagogicalSpotError] = useState(() => localStorage.getItem('mait_ws_pedagogicalSpotError') === 'true');
  const [pedagogicalParameterShift, setPedagogicalParameterShift] = useState(
    () => localStorage.getItem('mait_ws_pedagogicalParameterShift') === 'true'
  );
  const [pedagogicalLimitCase, setPedagogicalLimitCase] = useState(() => localStorage.getItem('mait_ws_pedagogicalLimitCase') === 'true');
  const [pedagogicalProofStyle, setPedagogicalProofStyle] = useState(() => localStorage.getItem('mait_ws_pedagogicalProofStyle') === 'true');
  const [pedagogicalWordProblems, setPedagogicalWordProblems] = useState(() => localStorage.getItem('mait_ws_pedagogicalWordProblems') === 'true');
  const [pedagogicalMultiStep, setPedagogicalMultiStep] = useState(() => localStorage.getItem('mait_ws_pedagogicalMultiStep') === 'true');
  const [removeWatermark, setRemoveWatermark] = useState(() => localStorage.getItem('mait_ws_removeWatermark') === 'true');
  const [showHints, setShowHints] = useState(() => {
    const saved = localStorage.getItem('mait_ws_showHints');
    return saved !== null ? saved === 'true' : true;
  });
  const [numInput, setNumInput] = useState(() => {
    const saved = parseInt(localStorage.getItem('mait_ws_numQuestions') || '10', 10);
    return String(Math.min(99, Math.max(1, Number.isNaN(saved) ? 10 : saved)));
  });
  const [firstTimeMode, setFirstTimeMode] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState(() => {
    try {
      const savedStage = localStorage.getItem('mait_ws_stage') || 'Year 12';
      const savedSubject = localStorage.getItem('mait_ws_subject') || (stageSubjects[savedStage] ? Object.keys(stageSubjects[savedStage])[0] : 'Mathematics');
      const saved = localStorage.getItem(`mait_ws_pts_${savedStage}_${savedSubject}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [includeName, setIncludeName] = useState(() => {
    const saved = localStorage.getItem('mait_ws_name');
    return saved !== null ? saved === 'true' : true;
  });
  const [includeDate, setIncludeDate] = useState(() => {
    const saved = localStorage.getItem('mait_ws_date');
    return saved !== null ? saved === 'true' : true;
  });
  const [mode, setMode] = useState('A');
  const [numQuestions, setNumQuestions] = useState(() => {
    const saved = parseInt(localStorage.getItem('mait_ws_numQuestions') || '10', 10);
    return Math.min(99, Math.max(1, Number.isNaN(saved) ? 10 : saved));
  });
  const [rawQuestions, setRawQuestions] = useState('');
  const [workingSpace, setWorkingSpace] = useState(() => localStorage.getItem('mait_ws_workingSpace') || 'Dynamic Space');
  const [includeMarks, setIncludeMarks] = useState(() => localStorage.getItem('mait_ws_marks') === 'true');
  const [generateAnswerKey, setGenerateAnswerKey] = useState(() => localStorage.getItem('mait_ws_answerKey') === 'true');
  const [difficulty, setDifficulty] = useState(() => localStorage.getItem('mait_ws_difficulty') || DIFFICULTY_OPTIONS[0]);
  const [includeCanvasSetup, setIncludeCanvasSetup] = useState(() => localStorage.getItem('mait_ws_canvasSetup') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedSubtopics, setExpandedSubtopics] = useState({});

  const launchTimeoutRef = useRef(null);
  const isInitialMount = useRef(true);
  const isFirstPointsLoad = useRef(true);

  const steps = [
    { id: 'curriculum', title: 'Curriculum', icon: GraduationCap },
    { id: 'topics', title: 'Topics', icon: BookOpen },
    { id: 'pedagogy', title: 'Pedagogy', icon: Brain },
    { id: 'output', title: 'Output', icon: Settings },
  ];

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
    localStorage.setItem('mait_ws_pedagogicalProofStyle', pedagogicalProofStyle.toString());
    localStorage.setItem('mait_ws_pedagogicalWordProblems', pedagogicalWordProblems.toString());
    localStorage.setItem('mait_ws_pedagogicalMultiStep', pedagogicalMultiStep.toString());
    localStorage.setItem('mait_ws_removeWatermark', removeWatermark.toString());
    localStorage.setItem('mait_ws_showHints', showHints.toString());
  }, [
    selectedStage,
    selectedSubject,
    numQuestions,
    workingSpace,
    difficulty,
    includeMarks,
    generateAnswerKey,
    includeName,
    includeDate,
    includeCanvasSetup,
    pedagogicalSpotError,
    pedagogicalParameterShift,
    pedagogicalLimitCase,
    pedagogicalProofStyle,
    pedagogicalWordProblems,
    pedagogicalMultiStep,
    removeWatermark,
    showHints,
  ]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const subjectsForStage = stageSubjects[selectedStage];
    if (subjectsForStage) {
      const nextSubject = Object.keys(subjectsForStage)[0];
      setSelectedSubject(nextSubject);
      setMode(MANUAL_ONLY_SUBJECTS.has(nextSubject) ? 'B' : 'A');
      setCustomSubject('');
    } else {
      setSelectedSubject('Other');
      setMode('B');
    }
  }, [selectedStage]);

  useEffect(() => {
    localStorage.setItem(`mait_ws_pts_${selectedStage}_${selectedSubject}`, JSON.stringify(selectedPoints));
  }, [selectedPoints, selectedStage, selectedSubject]);

  useEffect(() => {
    if (isFirstPointsLoad.current) {
      isFirstPointsLoad.current = false;
      try {
        const saved = localStorage.getItem(`mait_ws_pts_${selectedStage}_${selectedSubject}`);
        setSelectedPoints(saved ? JSON.parse(saved) : []);
      } catch {
        setSelectedPoints([]);
      }
      return;
    }
    setSelectedPoints([]);
  }, [selectedStage, selectedSubject]);

  useEffect(() => {
    if (selectedSubject === 'Other' || MANUAL_ONLY_SUBJECTS.has(selectedSubject)) {
      setMode('B');
    }
  }, [selectedSubject]);

  const legacySyllabusYear = useMemo(() => {
    if (selectedStage === 'Stage 4 (Yr 7-8)') {
      return 'Year 7';
    }
    if (selectedStage === 'Stage 5 (Yr 9-10)') {
      return 'Year 9';
    }
    if (selectedStage === 'Year 11') {
      if (selectedSubject === 'Mathematics Advanced') {
        return 'Year 11 Advanced';
      }
      if (selectedSubject === 'Mathematics Extension 1') {
        return 'Year 11 Extension 1';
      }
      return 'Year 11 Standard';
    }
    if (selectedStage === 'Year 12') {
      if (selectedSubject === 'Mathematics Advanced') {
        return 'Year 12 Advanced';
      }
      if (selectedSubject === 'Mathematics Extension 1') {
        return 'Year 12 Extension 1';
      }
      if (selectedSubject === 'Mathematics Extension 2') {
        return 'Year 12 Extension 2';
      }
      if (selectedSubject === 'Physics') {
        return 'Year 12 Physics';
      }
      if (selectedSubject === 'Engineering Studies') {
        return 'Year 12 Engineering Studies';
      }
    }
    return null;
  }, [selectedStage, selectedSubject]);

  const currentSyllabus = useMemo(() => {
    if (!legacySyllabusYear) {
      return {};
    }
    return buildMergedSyllabus(legacySyllabusYear);
  }, [legacySyllabusYear]);

  const currentTopicsList = useMemo(() => {
    if (legacySyllabusYear) {
      return null;
    }
    if (selectedSubject === 'Other') {
      return [];
    }
    return stageSubjects[selectedStage]?.[selectedSubject] || [];
  }, [legacySyllabusYear, selectedStage, selectedSubject]);

  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return Object.keys(currentSyllabus);
    }
    return Object.keys(currentSyllabus).filter((moduleName) => {
      if (moduleName.toLowerCase().includes(query)) {
        return true;
      }
      return Object.entries(currentSyllabus[moduleName] || {}).some(([subtopic, points]) => {
        if (subtopic.toLowerCase().includes(query)) {
          return true;
        }
        return points.some((point) => point.toLowerCase().includes(query));
      });
    });
  }, [currentSyllabus, searchQuery]);

  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      return;
    }

    const nextModules = {};
    const nextSubtopics = {};
    for (const moduleName of filteredModules) {
      nextModules[moduleName] = true;
      for (const [subtopic, points] of Object.entries(currentSyllabus[moduleName] || {})) {
        if (subtopic.toLowerCase().includes(query) || points.some((point) => point.toLowerCase().includes(query))) {
          nextSubtopics[subtopic] = true;
        }
      }
    }

    setExpandedModules((prev) => ({ ...prev, ...nextModules }));
    setExpandedSubtopics((prev) => ({ ...prev, ...nextSubtopics }));
  }, [currentSyllabus, filteredModules, searchQuery]);

  const displaySubject = selectedSubject === 'Other' && customSubject.trim() ? customSubject.trim() : selectedSubject;
  const yearLevel = getStageYearLevel(selectedStage);
  const canGeneratePdf = Boolean(yearLevel) && isMathsSubject(displaySubject);

  const toggleModule = (moduleName) => {
    setExpandedModules((prev) => ({ ...prev, [moduleName]: !prev[moduleName] }));
  };

  const toggleSubtopic = (subtopic) => {
    setExpandedSubtopics((prev) => ({ ...prev, [subtopic]: !prev[subtopic] }));
  };

  const handlePointToggle = (point) => {
    setSelectedPoints((prev) => (prev.includes(point) ? prev.filter((entry) => entry !== point) : [...prev, point]));
  };

  const isModuleSelected = (moduleName) => {
    const points = Object.values(currentSyllabus[moduleName] || {}).flat();
    return points.length > 0 && points.every((point) => selectedPoints.includes(point));
  };

  const toggleModuleSelection = (moduleName) => {
    const points = Object.values(currentSyllabus[moduleName] || {}).flat();
    if (points.every((point) => selectedPoints.includes(point))) {
      setSelectedPoints((prev) => prev.filter((point) => !points.includes(point)));
      return;
    }
    setSelectedPoints((prev) => Array.from(new Set([...prev, ...points])));
  };

  const isSubtopicSelected = (moduleName, subtopic) => {
    const points = currentSyllabus[moduleName]?.[subtopic] || [];
    return points.length > 0 && points.every((point) => selectedPoints.includes(point));
  };

  const toggleSubtopicSelection = (moduleName, subtopic) => {
    const points = currentSyllabus[moduleName]?.[subtopic] || [];
    if (points.every((point) => selectedPoints.includes(point))) {
      setSelectedPoints((prev) => prev.filter((point) => !points.includes(point)));
      return;
    }
    setSelectedPoints((prev) => Array.from(new Set([...prev, ...points])));
  };

  const validateSelection = () => {
    if ((mode === 'A' && selectedPoints.length === 0) || (mode === 'B' && rawQuestions.trim().length === 0)) {
      setIsShaking(true);
      setShowErrorToast(true);
      setTimeout(() => setIsShaking(false), 500);
      setTimeout(() => setShowErrorToast(false), 3000);
      return false;
    }
    return true;
  };

  const mapDifficulty = () => {
    if (difficulty === 'Mostly Easy') {
      return 'easy';
    }
    if (difficulty === 'Mostly Hard' || difficulty === 'Exam-Style') {
      return 'hard';
    }
    if (difficulty === 'Easy -> Hard Progression') {
      return 'medium';
    }
    return 'mixed';
  };

  const buildWorksheetPayload = () => {
    const pedagogicalDrills = [];
    if (pedagogicalSpotError) {
      pedagogicalDrills.push('spot-error');
    }
    if (pedagogicalParameterShift) {
      pedagogicalDrills.push('parameter-shift');
    }
    if (pedagogicalLimitCase) {
      pedagogicalDrills.push('limit-case');
    }
    if (pedagogicalProofStyle) {
      pedagogicalDrills.push('proof-style');
    }
    if (pedagogicalWordProblems) {
      pedagogicalDrills.push('word-problems');
    }
    if (pedagogicalMultiStep) {
      pedagogicalDrills.push('multi-step');
    }

    return {
      topic: selectedPoints[0] || rawQuestions.split('\n')[0] || displaySubject,
      subject: displaySubject,
      year_level: yearLevel || 11,
      num_questions: Math.min(numQuestions, 30),
      difficulty: mapDifficulty(),
      include_answers: generateAnswerKey,
      student_name: includeName && schoolName.trim() ? schoolName.trim() : undefined,
      syllabus_points: selectedPoints,
      manual_prompt: mode === 'B' ? rawQuestions.trim() : '',
      pedagogical_drills: pedagogicalDrills,
      context_source:
        syllabusContextMode === 'Search'
          ? 'web'
          : syllabusContextMode === 'Provide' || textbooksProvided
            ? 'syllabus'
            : 'builtin',
      include_marking: includeMarks,
      remove_watermark: removeWatermark,
    };
  };

  const generatePrompt = () => {
    let lheadContent = `\\textbf{ ${selectedStage} - ${displaySubject} }`;
    if (schoolName.trim()) {
      lheadContent = `\\textbf{ ${schoolName} - ${selectedStage} - ${displaySubject} }`;
    }

    let headerString = '';
    if (includeName && includeDate) {
      headerString = '\\noindent\\textbf{Name:} \\makebox[6cm]{\\hrulefill} \\hfill \\textbf{Date:} \\makebox[3cm]{\\hrulefill}';
    } else if (includeName) {
      headerString = '\\noindent\\textbf{Name:} \\makebox[6cm]{\\hrulefill}';
    } else if (includeDate) {
      headerString = '\\noindent\\textbf{Date:} \\makebox[3cm]{\\hrulefill}';
    }

    const marksLogic = includeMarks ? '\\hfill\\quad\\textbf{[X Marks]}' : 'Do not assign marks';
    const dynamicSpacing = numQuestions > 20 ? '2cm' : numQuestions > 10 ? '4cm' : '6cm';
    const spacingLogic =
      workingSpace === 'Two-column Compact'
        ? 'For the main worksheet, you MUST use the `multicols` environment with 2 columns (`\\\\begin{multicols}{2} ... \\\\end{multicols}`). Use the enumerate environment inside the multicols. Do not add large blank spaces between questions, keep it compact.'
        : workingSpace === 'Dynamic Space'
          ? 'LAYOUT DIRECTIVE: Use dynamic spacing. If math graphing, add axes. If trig graph, shift axes appropriately and enforce strict domain bounds (e.g. 0 to 2pi). If worded question, add ruled lines of appropriate density using `\\\\vspace{0.8cm}\\\\noindent\\\\rule{\\\\linewidth}{0.4pt}` repeated for each line needed. For pure mathematical calculations, leave blank working space using \\\\vspace{4cm}.'
          : `Use \\\\vspace{${dynamicSpacing}} between questions.`;

    const answerKeyLogic = generateAnswerKey
      ? 'Insert \\newpage at the end and provide a Teacher Answer Key. The Answer Key MUST be formatted in a two-column layout using `\\\\begin{multicols}{2}` and `\\\\end{multicols}`, separated by the vertical rule.'
      : '';

    let contextPrefix = '';
    if (syllabusContextMode === 'Provide' || textbooksProvided) {
      contextPrefix += 'Using the context files attached to this prompt:\\n';
      if (syllabusContextMode === 'Provide') {
        contextPrefix += '- Strictly adhere to the scope and constraints of the attached Syllabus.\\n';
      }
      if (textbooksProvided) {
        contextPrefix += '- Strongly model the questions on the style, structure, and difficulty found in the attached Textbook/Resources.\\n';
      }
      contextPrefix += '\\n';
    }

    if (syllabusContextMode === 'Search') {
      contextPrefix += 'CRITICAL: You are authorized and encouraged to Search/Reference the official NESA NSW Syllabus requirements for the selected Stage and Subject to ensure 100% curriculum alignment.\\n\\n';
    }

    let pedagogyPrefix = '';
    if (
      pedagogicalSpotError ||
      pedagogicalParameterShift ||
      pedagogicalLimitCase ||
      pedagogicalProofStyle ||
      pedagogicalWordProblems ||
      pedagogicalMultiStep
    ) {
      pedagogyPrefix += 'PEDAGOGY DIRECTIVE: You must include the following special question types in your worksheet:\\n';
      if (pedagogicalSpotError) {
        pedagogyPrefix += '- **Spot the Error:** Provide a deliberately flawed, step-by-step mathematical working. Ask the student to identify the specific line where the error occurred and explain why. Wrap this specific question in a `\\\\begin{tcolorbox} ... \\\\end{tcolorbox}` environment. This must be worth exactly 1 mark.\\n';
      }
      if (pedagogicalParameterShift) {
        pedagogyPrefix += '- **Parameter Shift:** Ask the student to explain how changing a specific constant or parameter in the system/equation alters the overall behavior or graph, without requiring a full algebraic re-solve.\\n';
      }
      if (pedagogicalLimitCase) {
        pedagogyPrefix += '- **Limit Case Analysis:** Ask the student to evaluate the system/equation at an extreme boundary condition (e.g., as x approaches infinity, or as a physical mass approaches zero) and interpret the qualitative meaning of that result.\\n';
      }
      if (pedagogicalProofStyle) {
        pedagogyPrefix += '- **Proof-Style Question:** Include at least one question that requires a formal justification, structured proof, or rigorous mathematical reasoning rather than direct computation only.\\n';
      }
      if (pedagogicalWordProblems) {
        pedagogyPrefix += '- **Contextual Word Problem:** Include at least one authentic real-world worded problem that matches the selected subject and stage.\\n';
      }
      if (pedagogicalMultiStep) {
        pedagogyPrefix += '- **Multi-Step Synthesis:** Include at least one problem that combines multiple concepts or syllabus ideas into a single chained task.\\n';
      }
      pedagogyPrefix += '\\n';
    }

    let contentString = '';
    if (mode === 'A') {
      const explicitTopics =
        currentTopicsList && currentTopicsList.length > 0 && selectedPoints.length > 0
          ? `strictly targeting these specific topics: \\n${selectedPoints.map((point) => `- ${point}`).join('\\n')}`
          : selectedPoints.length > 0
            ? `strictly targeting these specific syllabus dot-points and topics: \\n${selectedPoints.map((point) => `- ${point}`).join('\\n')}`
            : `targeting the general curriculum for ${displaySubject}`;

      const difficultyText =
        difficulty === 'Mixed'
          ? 'Use a balanced mix of easy, medium, and hard questions.'
          : difficulty === 'Easy -> Hard Progression'
            ? 'Start with easy questions and progressively increase difficulty to hard.'
            : difficulty === 'Mostly Easy'
              ? 'Keep most questions easy/accessible, with 1-2 challenging ones at the end.'
              : difficulty === 'Mostly Hard'
                ? 'Focus on challenging, exam-level questions with minimal easy questions.'
                : 'Match the difficulty and style of real exam questions.';

      contentString = `${contextPrefix}${pedagogyPrefix}Please generate ${numQuestions} professional-level exam questions ${explicitTopics} for ${selectedStage} ${displaySubject}.\\n\\n**DIFFICULTY:** ${difficultyText}`;
    } else {
      const syllabusContext =
        selectedPoints.length > 0
          ? `\\n\\nReference Syllabus Points selected by user:\\n${selectedPoints.map((point) => `- ${point}`).join('\\n')}`
          : '';
      contentString = `${contextPrefix}${pedagogyPrefix}Please format these exact questions/topics into a professional worksheet for ${selectedStage} ${displaySubject}: ${rawQuestions}${syllabusContext}`;
    }

    let promptTitle = `${selectedStage} ${displaySubject} Worksheet`;
    if (mode === 'A' && selectedPoints.length > 0 && legacySyllabusYear) {
      const moduleCounts = {};
      selectedPoints.forEach((point) => {
        Object.entries(currentSyllabus).forEach(([moduleName, subtopics]) => {
          Object.entries(subtopics).forEach(([subtopic, points]) => {
            if (points.includes(point)) {
              const cleanModule = moduleName.replace(/\s*\(Prerequisite\)$/i, '');
              moduleCounts[cleanModule] = (moduleCounts[cleanModule] || 0) + 1;
            }
          });
        });
      });
      const topModule = Object.keys(moduleCounts).reduce((best, candidate) => {
        if (!best) {
          return candidate;
        }
        return moduleCounts[best] > moduleCounts[candidate] ? best : candidate;
      }, '');
      if (topModule) {
        promptTitle = `${topModule} ${displaySubject} Worksheet`;
      }
    }

    let reminderText = '';
    if (firstTimeMode) {
      reminderText += '**Welcome!** I am the Universal Artifact Architect. I can generate complete worksheets for you. Simply ask me to tweak the difficulty, change the topic focus, or add more visual diagrams. Once rendered, you can click the canvas window to highlight and edit specific questions on the fly!\\n\\n';
    }

    reminderText += 'Reminder: Feel free to ask me to make changes! You can highlight sections in the Canvas window by clicking the dotted box with the arrow to ask for specific edits.';

    if (includeCanvasSetup) {
      reminderText += '\\n\\n**Debug Guide / Canvas Setup:**\\nNo Code/Preview window? Click **Tools**, select **Canvas**, and ask me to output in Canvas! :D';
    }

    if (syllabusContextMode === 'Provide') {
      reminderText += '\\n\\n*(Please paste/upload your syllabus document now.)*';
    }

    if (textbooksProvided) {
      reminderText += '\\n\\n*(Please paste/upload your textbooks or reference resources now.)*';
    }

    reminderText += "\\n\\n**Disclaimer:** I'm just a robot, so I can get things wrong - check the questions! You can also copy-paste the code into another chat and ask it to check.";

    return `**${promptTitle}**\\n\\nAct as the Universal Artifact Architect, an expert LaTeX Document Engine and Curriculum Designer.

Your job is to create a professional, compile-ready PDF worksheet. 

**CRITICAL DIRECTIVE:** 
You must structure your output exactly like this. First, output this exact message: '${reminderText}' Second, output the complete, compile-ready LaTeX code inside ONE SINGLE code block starting with \`\`\`latex and ending with \`\`\`. Do not output any other conversational text.

${includeMarks ? '**LATEX DIRECTIVE FOR MARKS:** Always place the marks (e.g., [2 Marks]) at the very end of the question text line, separated by `\\\\hfill\\\\quad`. Ensure they are strictly right-aligned to the margin to maintain a professional exam layout.\\n' : ''}

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
1. Never use Unicode characters for math (like √ or α). Always use standard LaTeX syntax (like \\\\sqrt{} or \\\\alpha).
2. Ensure every \\\\begin{enumerate} has a strictly matching \\\\end{enumerate} tag to prevent compilation failures.
3. If a question involves Pythagoras, Trigonometry, Circular Measure, or Geometry, you MUST generate a corresponding TikZ diagram.

**1. THE PREAMBLE:**
\\\\documentclass[12pt, a4paper]{article}
\\\\usepackage[top=1.5cm, bottom=2.5cm, left=1.5cm, right=1.5cm, headheight=30pt, footskip=30pt]{geometry}
\\\\usepackage{amsmath, amssymb, fancyhdr, graphicx, tikz, enumitem, tcolorbox, needspace, multicol}
\\\\usepackage[none]{hyphenat}
\\\\usepackage[hidelinks]{hyperref}
\\\\setlength{\\\\columnsep}{1cm}
\\\\setlength{\\\\columnseprule}{0.4pt}

\\\\pagestyle{fancy}
\\\\fancyhf{}
\\\\lhead{ ${lheadContent} }
\\\\rhead{}
\\\\cfoot{Page \\\\thepage}
${removeWatermark ? '\\\\rfoot{}' : '\\\\rfoot{\\\\textcolor{gray!50}{\\\\tiny \\\\textit{myaitutor.au/worksheets}}}'}
\\\\renewcommand{\\\\headrulewidth}{0.4pt}
\\\\setlength{\\\\headheight}{30pt}
\\\\begin{document}
\\\\sloppy
${headerString ? `\\n${headerString}\\n\\\\vspace{0.8cm}\\n` : ''}
\\\\begin{center}
    {\\\\Large \\\\textbf{ ${mode === 'A' ? 'Syllabus Focus: Mixed Topics' : 'Custom Worksheet'} }}
\\\\end{center}
\\\\vspace{0.5cm}

${contentString}

${spacingLogic}

${marksLogic}

${answerKeyLogic}

**2. LAYOUT & FORMATTING RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment. Let LaTeX handle numbering. Do NOT use custom labels like \\\\item[\\\\textbf{Question 1:}].
* LINE BREAKS: Do NOT use \\\\\\\\ for line breaks within questions. Use a blank line (double return) to ensure text aligns to the left margin perfectly.
* Spacing: ${spacingLogic}
* **MARKS ALIGNMENT (CRITICAL):** ${marksLogic === 'Do not assign marks' ? marksLogic : `If assigning marks, you MUST use \`${marksLogic}\` at the very end of the question text. The \\\\mbox{} is critical to prevent the number and the word 'Marks' from being split across two lines. Do NOT let the marks wrap to a new line awkwardly. Ensure they are pushed completely flush-right.`}
* **MANDATORY DIAGRAMS & SHAPES:** If a question mentions a shape, graph, diagram, angle relationship (e.g., "vertically opposite", "transversal"), or geometric property, you MUST generate the corresponding TikZ code to draw a clean, professional diagram below the question text.
* **PREAMBLE & GEOMETRY RULE:** When setting up the document geometry, you MUST explicitly define bottom=2.5cm, footskip=30pt, and headheight=30pt. Do not use a bottom margin smaller than 2.5cm. This is strictly required to prevent multicols content and vertical rules from crashing into the custom multi-line footer. Use exact geometry: \\\\usepackage[top=1.5cm, bottom=2.5cm, left=1.5cm, right=1.5cm, headheight=30pt, footskip=30pt]{geometry}
* **FOOTER RESTRAINT RULE:** Do not include multi-line footers or the "AI SELF-CHECK" text. Keep the center footer strictly to the page number using \\\\cfoot{Page \\\\thepage}. This is crucial to prevent the footer from colliding with the multicols vertical divider at the bottom of the page.

**3. PAGINATION & FOOTER:**
* Before every new \\\\item, insert \\\\needspace{6cm}.

**4. SCALING FOR 30+ QUESTIONS:**
If the request is for more than 20 questions, ensure you maintain high quality and varied task difficulty. For 30+ questions, you may use smaller spacing segments to fit the content while maintaining readability.

**5. ANSWER KEY:**
${answerKeyLogic}.

***
**USER CONTENT TO PROCESS:**
${contentString}
`;
  };

  const closeModal = () => {
    if (launchTimeoutRef.current) {
      clearTimeout(launchTimeoutRef.current);
      launchTimeoutRef.current = null;
    }
    setShowWarning(false);
    setShowCloseButton(false);
    setIsCopied(false);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!showWarning) {
        return;
      }
      if (event.key === 'Escape') {
        closeModal();
      } else if (event.key === 'Enter') {
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

  const copyToClipboard = async () => {
    if (!validateSelection()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatePrompt());
      setIsCopied(true);
      setGenerationError('');
      setGenerationSuccess('Instructions generated, copied, and ready for Gemini Canvas.');
      setShowWarning(true);
      setShowCloseButton(false);
      if (launchTimeoutRef.current) {
        clearTimeout(launchTimeoutRef.current);
      }
      launchTimeoutRef.current = setTimeout(() => {
        setShowCloseButton(true);
        window.open('https://gemini.google.com/app', '_blank');
        launchTimeoutRef.current = null;
      }, 3000);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy worksheet prompt:', error);
      setGenerationError('Could not copy the worksheet prompt.');
    }
  };

  const handleGeneratePdf = async (event) => {
    event?.preventDefault();

    if (!validateSelection()) {
      return;
    }

    if (!canGeneratePdf) {
      setGenerationError('In-app PDF generation currently supports Stage 4-12 mathematics. Use the exact prompt fallback for other subjects.');
      return;
    }

    setIsGenerating(true);
    setGenerationError('');
    setGenerationSuccess('');

    try {
      const response = await fetch(`${API_URL}/generate-worksheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildWorksheetPayload()),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData?.detail;
        const message = typeof detail === 'string' ? detail : detail?.message || 'Worksheet generation failed.';
        throw new Error(message);
      }

      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = `mait-worksheet-${Date.now()}.pdf`;
      anchor.click();
      URL.revokeObjectURL(downloadUrl);
      setGenerationSuccess('Worksheet PDF generated and downloaded.');
    } catch (error) {
      console.error('Worksheet generation failed:', error);
      setGenerationError(error.message || 'Worksheet generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNumSliderChange = (event) => {
    const nextValue = Math.min(99, Math.max(1, parseInt(event.target.value, 10)));
    setNumQuestions(nextValue);
    setNumInput(String(nextValue));
  };

  const handleNumInputChange = (event) => {
    const nextValue = event.target.value;
    if (nextValue === '' || /^\d{0,2}$/.test(nextValue)) {
      setNumInput(nextValue);
    }
  };

  const commitNumInput = () => {
    if (numInput.trim() === '') {
      setNumQuestions(1);
      setNumInput('1');
      return;
    }
    const parsed = parseInt(numInput, 10);
    const clamped = Math.min(99, Math.max(1, Number.isNaN(parsed) ? numQuestions : parsed));
    setNumQuestions(clamped);
    setNumInput(String(clamped));
  };

  const handleStepClick = (targetStep) => {
    if (targetStep <= currentStep) {
      setCurrentStep(targetStep);
      return;
    }
    if (targetStep === currentStep + 1 && canProceed()) {
      setCurrentStep(targetStep);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) {
      return selectedStage && selectedSubject && (selectedSubject !== 'Other' || customSubject.trim() !== '');
    }
    if (currentStep === 1) {
      return mode === 'A' ? selectedPoints.length > 0 : rawQuestions.trim() !== '';
    }
    return true;
  };

  return (
    <div className="min-h-screen pt-24 pb-12">
      {showErrorToast && (
        <div className="fixed top-20 left-1/2 z-[110] -translate-x-1/2">
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-sm text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.18)] backdrop-blur-xl">
            <AlertCircle className="h-4 w-4" />
            Select at least one syllabus point or enter manual topics before generating.
          </div>
        </div>
      )}

      {showWarning && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xl" onClick={closeModal}>
          <div
            className="glass-card-strong relative w-full max-w-md rounded-3xl border border-green-400/30 p-6 text-center shadow-[0_0_80px_rgba(34,197,94,0.2)]"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className={`absolute right-4 top-4 rounded-full border border-white/10 p-2 text-white/60 transition ${showCloseButton ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            >
              <X size={16} />
            </button>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/15 text-green-400">
              <CheckCircle2 size={30} />
            </div>
            <h3 className="text-3xl font-bold text-white">Instructions ready</h3>
            <p className="mt-3 text-sm text-white/65">
              Your worksheet instructions are ready to paste into Gemini Canvas with the original logic intact.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <img src={canvasHint} alt="Gemini canvas hint" className="rounded-2xl border border-white/10" />
              <img src={modelSelectorHint} alt="Gemini model selector hint" className="rounded-2xl border border-white/10" />
            </div>
            {!showCloseButton && (
              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full origin-left animate-progress bg-green-400" />
                </div>
                <p className="mt-3 text-xs uppercase tracking-[0.25em] text-green-300">Launching Gemini</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate?.('landing')}
              className="mb-2 flex items-center gap-2 text-sm text-white/60 transition hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              Back to home
            </button>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-white">
              <FileText className="h-8 w-8 text-mait-cyan" />
              Worksheet Studio
            </h1>
            <p className="text-white/60">Worksheet instructions, syllabus controls, and landing polish tuned for easier teacher use.</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-card-strong mb-8 rounded-2xl p-4"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  className={`flex flex-1 items-center gap-3 rounded-xl px-4 py-2 text-left transition ${
                    index <= currentStep ? 'cursor-pointer' : 'cursor-default'
                  } ${
                    index === currentStep
                      ? 'bg-mait-cosmic/20 text-mait-cyan'
                      : index < currentStep
                        ? 'text-green-400 hover:bg-green-500/8'
                        : 'text-white/40'
                  }`}
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${
                      index === currentStep
                        ? 'bg-mait-cosmic text-white'
                        : index < currentStep
                          ? 'bg-green-500/20'
                          : 'bg-white/10'
                    }`}
                  >
                    {index < currentStep ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                  </div>
                  <span className="font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div className={`hidden h-px flex-1 lg:block ${index < currentStep ? 'bg-green-500/45' : 'bg-white/10'}`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_360px]">
          <div className="glass-card-strong rounded-3xl p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div key="curriculum" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mait-cyan/15 text-sm font-bold text-mait-cyan">1</div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Stage and subject</h2>
                      <p className="text-sm text-white/50">Keep the original stage-subject mapping and subject-specific syllabus logic.</p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {STAGES.map((stage) => (
                      <button
                        key={stage}
                        type="button"
                        onClick={() => setSelectedStage(stage)}
                        className={`rounded-2xl border px-4 py-4 text-left transition ${
                          selectedStage === stage
                            ? 'border-mait-cyan/50 bg-mait-cosmic/20 text-white shadow-neon-purple'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        <div className="text-sm font-semibold">{stage.split('(')[0].trim()}</div>
                        {stage.includes('(') && <div className="mt-1 text-xs text-white/45">{stage.match(/\(([^)]+)\)/)?.[1]}</div>}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs uppercase tracking-[0.25em] text-white/45">Subject</label>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {Object.keys(stageSubjects[selectedStage] || {}).map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => {
                            setSelectedSubject(subject);
                            setMode(MANUAL_ONLY_SUBJECTS.has(subject) ? 'B' : 'A');
                          }}
                          className={`rounded-2xl border px-4 py-3 text-left transition ${
                            selectedSubject === subject
                              ? 'border-mait-cyan/50 bg-mait-cyan/10 text-white'
                              : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          <div className="font-medium">{subject}</div>
                          {MANUAL_ONLY_SUBJECTS.has(subject) && (
                            <div className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/35">Manual entry</div>
                          )}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubject('Other');
                          setMode('B');
                        }}
                        className={`rounded-2xl border px-4 py-3 text-left transition ${
                          selectedSubject === 'Other'
                            ? 'border-mait-cyan/50 bg-mait-cyan/10 text-white'
                            : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20 hover:text-white'
                        }`}
                      >
                        Other
                      </button>
                    </div>
                  </div>

                  {selectedSubject === 'Other' && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                      <label className="text-xs uppercase tracking-[0.25em] text-white/45">Custom subject</label>
                      <input
                        type="text"
                        value={customSubject}
                        onChange={(event) => setCustomSubject(event.target.value)}
                        placeholder="e.g. Commerce"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-mait-cyan/40"
                      />
                    </div>
                  )}

                  <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <label className="text-xs uppercase tracking-[0.25em] text-white/45">Optional header label</label>
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(event) => setSchoolName(event.target.value)}
                      placeholder="School name or class label"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-mait-cyan/40"
                    />
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div key="topics" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mait-cyan/15 text-sm font-bold text-mait-cyan">2</div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Topics and dot-points</h2>
                        <p className="text-sm text-white/50">The original syllabus hierarchy and prerequisite merge are restored here.</p>
                      </div>
                    </div>
                    <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
                      <button
                        type="button"
                        onClick={() => setMode('A')}
                        className={`rounded-xl px-4 py-2 text-sm transition ${mode === 'A' ? 'bg-mait-cosmic/20 text-white' : 'text-white/55 hover:text-white'}`}
                      >
                        Official syllabus
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('B')}
                        className={`rounded-xl px-4 py-2 text-sm transition ${mode === 'B' ? 'bg-mait-cosmic/20 text-white' : 'text-white/55 hover:text-white'}`}
                      >
                        Manual entry
                      </button>
                    </div>
                  </div>

                  {mode === 'B' || selectedSubject === 'Other' ? (
                    <div className="space-y-4">
                      {(selectedSubject === 'Other' || MANUAL_ONLY_SUBJECTS.has(selectedSubject)) && (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/65">
                          {selectedSubject === 'Other'
                            ? 'This subject uses manual entry only. Add your own topic brief or question instructions below.'
                            : `${selectedSubject} is currently manual-entry only. The selected subject will still be injected into the final worksheet instructions.`}
                        </div>
                      )}
                      <MathInput
                        value={rawQuestions}
                        onChange={setRawQuestions}
                        placeholder={`Paste the exact ${displaySubject} brief, topic list, or teacher instructions here...`}
                        rows={14}
                        className={`${isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}
                        inputClassName="min-h-[360px] w-full rounded-3xl border border-white/10 bg-black/25 p-4 pr-24 text-sm text-white outline-none transition focus:border-mait-cyan/40"
                      />
                    </div>
                  ) : (
                    <div className={`overflow-hidden rounded-3xl border border-white/10 bg-black/20 ${isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both]' : ''}`}>
                      <div className="flex flex-wrap items-center gap-4 border-b border-white/10 bg-white/5 p-4">
                        <div className="relative min-w-[220px] flex-1">
                          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder="Find a topic or syllabus point..."
                            className="w-full rounded-2xl border border-white/10 bg-black/20 py-2 pl-10 pr-4 text-sm text-white outline-none transition focus:border-mait-cyan/40"
                          />
                        </div>
                        <div className="text-xs uppercase tracking-[0.25em] text-mait-cyan">{selectedPoints.length} selected</div>
                        {selectedPoints.length > 0 && (
                          <button type="button" onClick={() => setSelectedPoints([])} className="text-xs uppercase tracking-[0.2em] text-white/50 transition hover:text-white">
                            Clear all
                          </button>
                        )}
                      </div>

                      <div className="max-h-[540px] overflow-y-auto p-4">
                        {legacySyllabusYear ? (
                          <div className="space-y-4">
                            {filteredModules.map((moduleName) => (
                              <div key={moduleName} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <button type="button" onClick={() => toggleModule(moduleName)} className="rounded-lg p-1 text-white/70 transition hover:bg-white/10 hover:text-white">
                                    {expandedModules[moduleName] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                  </button>
                                  <label className="flex flex-1 cursor-pointer items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={isModuleSelected(moduleName)}
                                      onChange={() => toggleModuleSelection(moduleName)}
                                      className="h-4 w-4 rounded border-white/20 accent-mait-cyan"
                                    />
                                    <span className="text-sm font-semibold text-white">{moduleName}</span>
                                  </label>
                                </div>

                                {(expandedModules[moduleName] || searchQuery) && (
                                  <div className="ml-6 space-y-3 border-l border-white/10 pl-4">
                                    {Object.keys(currentSyllabus[moduleName] || {}).map((subtopic) => {
                                      const points = currentSyllabus[moduleName][subtopic] || [];
                                      const query = searchQuery.toLowerCase().trim();
                                      if (
                                        query &&
                                        !subtopic.toLowerCase().includes(query) &&
                                        !points.some((point) => point.toLowerCase().includes(query))
                                      ) {
                                        return null;
                                      }

                                      return (
                                        <div key={subtopic} className="space-y-2">
                                          <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => toggleSubtopic(subtopic)} className="rounded-lg p-1 text-white/60 transition hover:bg-white/10 hover:text-white">
                                              {expandedSubtopics[subtopic] || searchQuery ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                            </button>
                                            <label className="flex flex-1 cursor-pointer items-center gap-3">
                                              <input
                                                type="checkbox"
                                                checked={isSubtopicSelected(moduleName, subtopic)}
                                                onChange={() => toggleSubtopicSelection(moduleName, subtopic)}
                                                className="h-4 w-4 rounded border-white/20 accent-mait-cyan"
                                              />
                                              <span className="truncate text-xs font-medium uppercase tracking-[0.18em] text-white/55">{subtopic}</span>
                                            </label>
                                          </div>

                                          {(expandedSubtopics[subtopic] || searchQuery) && (
                                            <div className="ml-6 grid gap-2">
                                              {points.map((point) => (
                                                <label
                                                  key={point}
                                                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                                                    selectedPoints.includes(point)
                                                      ? 'border-mait-cyan/30 bg-mait-cyan/10 text-white'
                                                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                                                  }`}
                                                >
                                                  <input
                                                    type="checkbox"
                                                    checked={selectedPoints.includes(point)}
                                                    onChange={() => handlePointToggle(point)}
                                                    className="mt-0.5 h-4 w-4 rounded border-white/20 accent-mait-cyan"
                                                  />
                                                  <span className="text-xs leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatex(point) }} />
                                                </label>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : currentTopicsList && currentTopicsList.length > 0 ? (
                          <div className="grid gap-3">
                            {currentTopicsList
                              .filter((topic) => topic.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((topic) => (
                                <label
                                  key={topic}
                                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                                    selectedPoints.includes(topic)
                                      ? 'border-mait-cyan/30 bg-mait-cyan/10 text-white'
                                      : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedPoints.includes(topic)}
                                    onChange={() => handlePointToggle(topic)}
                                    className="mt-0.5 h-4 w-4 rounded border-white/20 accent-mait-cyan"
                                  />
                                  <span className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: renderLatex(topic) }} />
                                </label>
                              ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/55">
                            No predefined topic list exists for this subject yet. Switch to manual entry if you want to specify it yourself.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div key="pedagogy" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mait-cyan/15 text-sm font-bold text-mait-cyan">3</div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Context and pedagogy</h2>
                      <p className="text-sm text-white/50">These are the original prompt directives for syllabus injection and special question types.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-[0.25em] text-white/45">Syllabus injection context</label>
                    <div className="flex flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-2 md:flex-row">
                      {['Off', 'Provide', 'Search'].map((contextMode) => (
                        <button
                          key={contextMode}
                          type="button"
                          onClick={() => setSyllabusContextMode(contextMode)}
                          className={`flex-1 rounded-2xl px-4 py-3 text-sm transition ${
                            syllabusContextMode === contextMode
                              ? contextMode === 'Search'
                                ? 'border border-orange-500/30 bg-orange-500/15 text-orange-300'
                                : 'border border-mait-cyan/30 bg-mait-cyan/10 text-white'
                              : 'text-white/55 hover:bg-white/5 hover:text-white'
                          }`}
                        >
                          {contextMode === 'Off' ? 'AI general knowledge' : contextMode === 'Provide' ? "I'll upload the syllabus" : 'Search NESA website'}
                        </button>
                      ))}
                    </div>

                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                      <input
                        type="checkbox"
                        checked={textbooksProvided}
                        onChange={(event) => setTextbooksProvided(event.target.checked)}
                        className="h-5 w-5 rounded border-white/20 accent-mait-cyan"
                      />
                      I'll add textbooks or reference resources to the prompt context.
                    </label>
                  </div>

                  <div className="space-y-4">
                    <label className="text-xs uppercase tracking-[0.25em] text-white/45">Pedagogical additions</label>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {[
                        {
                          id: 'spot-error',
                          checked: pedagogicalSpotError,
                          onChange: setPedagogicalSpotError,
                          title: 'Spot the error',
                          description: 'Deliberately flawed working, locked to exactly 1 mark.',
                        },
                        {
                          id: 'parameter-shift',
                          checked: pedagogicalParameterShift,
                          onChange: setPedagogicalParameterShift,
                          title: 'Parameter shift',
                          description: 'Ask how changing a constant alters the system without a full re-solve.',
                        },
                        {
                          id: 'limit-case',
                          checked: pedagogicalLimitCase,
                          onChange: setPedagogicalLimitCase,
                          title: 'Limit case analysis',
                          description: 'Test edge behavior and interpret the qualitative result.',
                        },
                        {
                          id: 'proof-style',
                          checked: pedagogicalProofStyle,
                          onChange: setPedagogicalProofStyle,
                          title: 'Proof-style question',
                          description: 'Require formal justification or rigorous mathematical reasoning.',
                        },
                        {
                          id: 'word-problems',
                          checked: pedagogicalWordProblems,
                          onChange: setPedagogicalWordProblems,
                          title: 'Contextual word problem',
                          description: 'Inject at least one applied real-world scenario question.',
                        },
                        {
                          id: 'multi-step',
                          checked: pedagogicalMultiStep,
                          onChange: setPedagogicalMultiStep,
                          title: 'Multi-step synthesis',
                          description: 'Combine multiple ideas into one chained problem.',
                        },
                      ].map((item) => (
                        <label
                          key={item.id}
                          className={`rounded-2xl border p-4 transition ${item.checked ? 'border-mait-cyan/30 bg-mait-cyan/10 text-white' : 'border-white/10 bg-white/5 text-white/70 hover:border-white/20'}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={item.checked}
                              onChange={(event) => item.onChange(event.target.checked)}
                              className="mt-0.5 h-5 w-5 rounded border-white/20 accent-mait-cyan"
                            />
                            <div>
                              <div className="text-sm font-semibold">{item.title}</div>
                              <div className="mt-1 text-xs leading-relaxed text-white/55">{item.description}</div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div key="output" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }} className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-mait-cyan/15 text-sm font-bold text-mait-cyan">4</div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Output controls</h2>
                      <p className="text-sm text-white/50">These match the original worksheet generator settings that shape the final format.</p>
                    </div>
                  </div>

                  <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-[0.25em] text-white/45">Number of questions</label>
                      <span className="font-mono text-lg text-mait-cyan">{numQuestions}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={1}
                        max={99}
                        value={Math.min(numQuestions, 99)}
                        onChange={handleNumSliderChange}
                        className="w-full accent-mait-cyan"
                      />
                      <input
                        type="number"
                        value={numInput}
                        min={1}
                        max={99}
                        onChange={handleNumInputChange}
                        onBlur={commitNumInput}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitNumInput();
                          }
                        }}
                        className="w-20 rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-center text-white outline-none transition focus:border-mait-cyan/40"
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                      <label className="text-xs uppercase tracking-[0.25em] text-white/45">Working space / page layout</label>
                      <div className="relative">
                        <select
                          value={workingSpace}
                          onChange={(event) => setWorkingSpace(event.target.value)}
                          className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-mait-cyan/40"
                        >
                          {SPACING_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      </div>
                    </div>

                    <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 p-5">
                      <label className="text-xs uppercase tracking-[0.25em] text-white/45">Question difficulty</label>
                      <div className="relative">
                        <select
                          value={difficulty}
                          onChange={(event) => setDifficulty(event.target.value)}
                          className="w-full appearance-none rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none transition focus:border-mait-cyan/40"
                        >
                          {DIFFICULTY_OPTIONS.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {[
                      { label: 'Name space', checked: includeName, onChange: setIncludeName },
                      { label: 'Date space', checked: includeDate, onChange: setIncludeDate },
                      { label: 'Allocate marks', checked: includeMarks, onChange: setIncludeMarks },
                      { label: 'Answer key', checked: generateAnswerKey, onChange: setGenerateAnswerKey },
                      { label: 'Canvas setup guide', checked: includeCanvasSetup, onChange: setIncludeCanvasSetup },
                      { label: 'First time mode', checked: firstTimeMode, onChange: setFirstTimeMode },
                      { label: 'Remove watermark', note: '(Link to this generator)', checked: removeWatermark, onChange: setRemoveWatermark },
                      { label: 'Show hints', checked: showHints, onChange: setShowHints },
                    ].map((item) => (
                      <label key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/75">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(event) => item.onChange(event.target.checked)}
                          className="h-5 w-5 rounded border-white/20 accent-mait-cyan"
                        />
                        <span>
                          {item.label}
                          {item.note && <span className="ml-2 text-xs text-white/35">{item.note}</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between border-t border-white/10 pt-6">
              <button
                type="button"
                onClick={() => setCurrentStep((step) => Math.max(step - 1, 0))}
                disabled={currentStep === 0}
                className="rounded-2xl border border-white/10 px-5 py-3 text-sm text-white/65 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              {currentStep < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => canProceed() && setCurrentStep((step) => Math.min(step + 1, steps.length - 1))}
                  className="rounded-2xl bg-mait-cosmic px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01]"
                >
                  Continue
                </button>
              ) : (
                <div className="text-sm text-white/45">Review the summary panel before generating.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card-strong rounded-3xl p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Summary</h3>
              </div>

              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between text-white/60">
                  <span>Stage</span>
                  <span className="text-white">{selectedStage}</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span>Subject</span>
                  <span className="text-white">{displaySubject}</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span>Selected points</span>
                  <span className="text-white">{selectedPoints.length}</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span>Questions</span>
                  <span className="text-white">{numQuestions}</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span>Difficulty</span>
                  <span className="text-white">{difficulty}</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span>Context</span>
                  <span className="text-white">{syllabusContextMode}</span>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-mait-cosmic px-5 py-4 text-sm font-semibold text-white transition hover:scale-[1.01]"
                >
                  <Copy className="h-4 w-4" />
                  Generate Instructions and Launch Gemini
                </button>
              </div>

              {(generationError || generationSuccess) && (
                <div
                  className={`mt-5 rounded-2xl border p-4 text-sm ${
                    generationError ? 'border-red-500/25 bg-red-500/10 text-red-200' : 'border-green-500/25 bg-green-500/10 text-green-200'
                  }`}
                >
                  {generationError || generationSuccess}
                </div>
              )}
            </div>

            {showHints && (
              <div className="glass-card rounded-3xl p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-mait-cyan/15 text-mait-cyan">
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">Prompt handoff tips</h3>
                    <p className="text-xs text-white/50">Helpful for the original Gemini-based worksheet flow.</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <img src={canvasHint} alt="Gemini canvas hint" className="rounded-2xl border border-white/10" />
                  <img src={modelSelectorHint} alt="Gemini model selector hint" className="rounded-2xl border border-white/10" />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="glass-card-strong overflow-hidden rounded-3xl">
            <div className="border-b border-white/10 px-6 py-5">
              <h3 className="text-xl font-semibold text-white">Universal Worksheet.pdf</h3>
              <p className="mt-1 text-sm text-white/50">A live preview of the worksheet style teachers will be generating instructions for.</p>
            </div>
            <div className="aspect-[1/1.36] bg-white p-3">
              <object
                data="/Universal_Worksheet.pdf#toolbar=0&navpanes=0&scrollbar=0"
                type="application/pdf"
                className="h-full w-full rounded-2xl border border-slate-200 bg-white"
                aria-label="Universal Worksheet preview"
              >
                <div className="flex h-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center text-slate-700">
                  PDF preview unavailable. Open <a className="ml-1 underline" href="/Universal_Worksheet.pdf" target="_blank" rel="noreferrer">Universal Worksheet.pdf</a>.
                </div>
              </object>
            </div>
          </div>

          <div className="glass-card-strong rounded-3xl p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-white">FAQ and Tips &amp; Tricks</h3>
              <p className="mt-1 text-sm text-white/50">A few reminders for teachers using the Gemini Canvas workflow.</p>
            </div>

            <div className="space-y-4">
              <details className="group rounded-2xl border border-white/10 bg-white/5 open:bg-white/[0.06]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-white">
                  <span>How does "Search NESA Website" work?</span>
                  <ChevronDown className="h-4 w-4 text-white/40 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/60">
                  It asks Gemini to proactively consult the published NESA site for alignment context. Treat it as experimental and always verify the resulting worksheet.
                </div>
              </details>

              <details className="group rounded-2xl border border-white/10 bg-white/5 open:bg-white/[0.06]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-white">
                  <span>Why launch through Gemini instead of generating the PDF here?</span>
                  <ChevronDown className="h-4 w-4 text-white/40 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/60">
                  Gemini Canvas makes it much easier to edit, regenerate, and selectively tweak worksheet sections after the initial instructions are produced.
                </div>
              </details>

              <details className="group rounded-2xl border border-white/10 bg-white/5 open:bg-white/[0.06]">
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-sm font-medium text-white">
                  <span>What do the pedagogical additions actually change?</span>
                  <ChevronDown className="h-4 w-4 text-white/40 transition group-open:rotate-180" />
                </summary>
                <div className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/60">
                  They inject explicit prompt directives for special question types like proof-style reasoning, multi-step synthesis, contextual word problems, and structured error analysis.
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
