import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Info, Hash, BookOpen, AlertTriangle } from 'lucide-react';

const DIFFICULTY_OPTIONS = ['Mostly Easy', 'Progressive', 'Mixed', 'Mostly Hard', 'Exam Style'];
const LAYOUT_OPTIONS = ['Dynamic Space', 'Working Blank Space', 'Compact', 'Ruled Lines', 'Minimal'];

const SYLLABUS_OPTIONS = [
    { value: 'ai', label: 'AI General Knowledge', desc: 'Use built-in curriculum knowledge' },
    { value: 'upload', label: "I'll Upload the Syllabus", desc: 'Paste your own text syllabus' },
    { value: 'nesa', label: 'Search NESA Website', desc: 'Live search (experimental)', warning: true },
];

export default function Step3Configuration({
    numQuestions,
    setNumQuestions,
    numInput,
    setNumInput,
    difficulty,
    setDifficulty,
    workingSpace,
    setWorkingSpace,
    includeName,
    setIncludeName,
    includeDate,
    setIncludeDate,
    includeMarks,
    setIncludeMarks,
    generateAnswerKey,
    setGenerateAnswerKey,
    includeCanvasSetup,
    setIncludeCanvasSetup,
    firstTimeMode,
    setFirstTimeMode,
    removeWatermark,
    setRemoveWatermark,
    pedagogicalSpotError,
    setPedagogicalSpotError,
    pedagogicalParameterShift,
    setPedagogicalParameterShift,
    pedagogicalLimitCase,
    setPedagogicalLimitCase,
    syllabusSource,
    setSyllabusSource,
    textbookResources,
    setTextbookResources
}) {
    // Sync text input with range slider natively
    const handleNumInputBlur = () => {
        let val = parseInt(numInput, 10);
        if (isNaN(val)) val = numQuestions;
        val = Math.max(1, Math.min(99, val));
        setNumQuestions(val);
        setNumInput(val.toString());
    };

    const handleNumInputChange = (e) => {
        setNumInput(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') handleNumInputBlur();
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8 animate-reveal"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                    3
                </div>
                <h3 className="text-xl font-display font-bold flex items-center gap-2">
                    <Settings className="text-primary" size={20} />
                    Worksheet Configuration
                </h3>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
                {/* Left Column: General Configuration */}
                <div className="space-y-6">
                    
                    {/* Number of Questions */}
                    <div className="bg-surface-2/30 rounded-xl p-5 border border-surface-3/50 space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-display font-medium text-foreground flex items-center gap-2">
                                <Hash size={16} className="text-muted-foreground" />
                                Number of Questions
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="99"
                                value={numInput}
                                onChange={handleNumInputChange}
                                onBlur={handleNumInputBlur}
                                onKeyDown={handleKeyDown}
                                className="w-16 bg-surface-1 border border-surface-3 rounded-lg px-2 py-1 text-center font-display focus:border-primary/50 outline-none"
                            />
                        </div>
                        <input
                            type="range"
                            min="5"
                            max="30"
                            value={numQuestions}
                            onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setNumQuestions(val);
                                setNumInput(val.toString());
                            }}
                            className="w-full accent-primary h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground font-display">
                            <span>5 (Short)</span>
                            <span>30 (Exam)</span>
                        </div>
                    </div>

                    {/* Difficulty Grid */}
                    <div className="space-y-2">
                        <label className="block text-sm font-display font-medium text-foreground">Difficulty Curve</label>
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {DIFFICULTY_OPTIONS.map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDifficulty(d)}
                                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center min-h-[70px] ${
                                        difficulty === d
                                            ? 'border-primary bg-primary/10 shadow-sm shadow-primary/5'
                                            : 'border-surface-3 bg-surface-1/50 hover:border-primary/40'
                                    }`}
                                >
                                    <span className={`text-[11px] font-display font-medium leading-tight ${difficulty === d ? 'text-primary' : 'text-foreground'}`}>{d}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Layout Dropdown */}
                    <div className="space-y-2">
                        <label className="block text-sm font-display font-medium text-foreground">Working Space / Page Layout</label>
                        <select 
                            value={workingSpace} 
                            onChange={(e) => setWorkingSpace(e.target.value)}
                            className="w-full bg-surface-1 border border-surface-3 rounded-xl p-3 text-sm font-display focus:border-primary/50 outline-none transition-all cursor-pointer"
                        >
                            {LAYOUT_OPTIONS.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Core Layout Settings */}
                    <div className="grid grid-cols-2 gap-3 p-4 bg-surface-2/30 rounded-xl border border-dashed border-surface-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={includeName}
                                onChange={(e) => setIncludeName(e.target.checked)}
                                className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer transition-colors"
                            />
                            <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Name space</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={includeDate}
                                onChange={(e) => setIncludeDate(e.target.checked)}
                                className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer transition-colors"
                            />
                            <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors">Date space</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={includeMarks}
                                onChange={(e) => setIncludeMarks(e.target.checked)}
                                className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer transition-colors"
                            />
                            <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors" title="AI Attempts Mark Allocation">Allocate Marks</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={generateAnswerKey}
                                onChange={(e) => setGenerateAnswerKey(e.target.checked)}
                                className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer transition-colors"
                            />
                            <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors text-primary/80">Include Answers</span>
                        </label>
                    </div>

                </div>

                {/* Right Column: Advanced & Pedagogical Tools */}
                <div className="space-y-6">
                    
                    {/* Pedagogical Tools */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-display font-medium text-foreground">
                            <Info size={16} className="text-secondary" />
                            Targeted Question Directives
                        </div>
                        <div className="p-4 bg-surface-2/20 rounded-xl border border-surface-3/50 space-y-3">
                            <label className="flex items-center gap-3 cursor-pointer group relative">
                                <input
                                    type="checkbox"
                                    checked={pedagogicalSpotError}
                                    onChange={(e) => setPedagogicalSpotError(e.target.checked)}
                                    className="w-4 h-4 rounded border-secondary/50 text-secondary focus:ring-secondary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-[11px] font-display font-bold text-secondary uppercase tracking-wider group-hover:text-secondary/80 transition-colors">Spot the Error</span>
                            </label>
                            
                            <label className="flex items-center gap-3 cursor-pointer group relative">
                                <input
                                    type="checkbox"
                                    checked={pedagogicalParameterShift}
                                    onChange={(e) => setPedagogicalParameterShift(e.target.checked)}
                                    className="w-4 h-4 rounded border-secondary/50 text-secondary focus:ring-secondary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-[11px] font-display font-bold text-secondary uppercase tracking-wider group-hover:text-secondary/80 transition-colors">Parameter Shift</span>
                            </label>

                            <label className="flex items-center gap-3 cursor-pointer group relative">
                                <input
                                    type="checkbox"
                                    checked={pedagogicalLimitCase}
                                    onChange={(e) => setPedagogicalLimitCase(e.target.checked)}
                                    className="w-4 h-4 rounded border-secondary/50 text-secondary focus:ring-secondary/20 bg-surface-1 cursor-pointer"
                                />
                                <span className="text-[11px] font-display font-bold text-secondary uppercase tracking-wider group-hover:text-secondary/80 transition-colors">Limit Case Analysis</span>
                            </label>
                        </div>
                    </div>

                    {/* Advanced Settings */}
                    <div className="space-y-3">
                        <div className="text-sm font-display font-medium text-foreground flex items-center gap-2">
                            Advanced Injection Context
                        </div>

                        {/* Syllabus Source Radio */}
                        <div className="space-y-2">
                            {SYLLABUS_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                        syllabusSource === opt.value
                                            ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5'
                                            : 'border-surface-3 bg-surface-1/30 hover:border-primary/30'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="syllabus"
                                        value={opt.value}
                                        checked={syllabusSource === opt.value}
                                        onChange={(e) => setSyllabusSource(e.target.value)}
                                        className="mt-0.5 w-4 h-4 text-primary bg-surface-2 border-surface-4 focus:ring-primary/20"
                                    />
                                    <div className="flex-1">
                                        <div className="text-xs font-display font-medium flex items-center gap-2 text-foreground">
                                            {opt.label}
                                            {opt.warning && (
                                                <span className="text-[9px] uppercase tracking-wider text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <AlertTriangle size={10} /> Experimental
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>

                        {/* Textbooks Input */}
                        <div className="pt-2">
                            <label className="flex items-center gap-3 cursor-pointer group p-3 rounded-xl border border-surface-3 bg-surface-1/30 hover:border-primary/30 transition-all">
                                <input
                                    type="checkbox"
                                    checked={textbookResources}
                                    onChange={(e) => setTextbookResources(e.target.checked)}
                                    className="w-4 h-4 text-primary bg-surface-2 border-surface-4 focus:ring-primary/20 rounded cursor-pointer"
                                />
                                <div className="flex flex-col">
                                    <span className="text-xs font-display font-medium text-foreground group-hover:text-primary transition-colors">Include Specific Textbook / Reference</span>
                                    <span className="text-[10px] text-muted-foreground leading-tight mt-0.5">We will prompt you to enter the textbook in the chat.</span>
                                </div>
                            </label>
                        </div>

                        {/* Output Toggles */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-surface-2/30 rounded-xl border border-dashed border-surface-4">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={includeCanvasSetup}
                                    onChange={(e) => setIncludeCanvasSetup(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground font-display uppercase tracking-tight">Setup guide</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={firstTimeMode}
                                    onChange={(e) => setFirstTimeMode(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground font-display uppercase tracking-tight">First Time?</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={removeWatermark}
                                    onChange={(e) => setRemoveWatermark(e.target.checked)}
                                    className="w-4 h-4 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-2 cursor-pointer"
                                />
                                <span className="text-[10px] text-muted-foreground group-hover:text-foreground font-display uppercase tracking-tight title='Remove MyAITutor Watermark'">No Watermark</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
