import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, ChevronRight, ChevronDown, ListPlus, Edit3 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MathInput from '../MathInput';

export default function Step2Topics({
    mode,
    setMode,
    selectedYear,
    selectedSubject,
    customSubject,
    setCustomSubject,
    SYLLABUS_DATA, // Passed down from parent
    selectedPoints,
    setSelectedPoints,
    rawQuestions,
    setRawQuestions
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedModules, setExpandedModules] = useState({});
    const [expandedSubtopics, setExpandedSubtopics] = useState({});

    // 1) Logic to map selected year/subject to the specific keys in syllabus_data.json
    const getSyllabusContent = () => {
        if (!SYLLABUS_DATA) return null;

        // Senior Years (11-12) Breakdown
        if (selectedYear === 'Year 11' || selectedYear === 'Year 12') {
            // Helper to get raw data for a specific subject string
            const getRawData = (year, subject) => {
                // Formatting: "Year 12 Advanced", "Year 11 Extension 1", etc.
                const suffix = subject.replace('Mathematics ', '');
                const key = `${year} ${suffix}`;
                return SYLLABUS_DATA[key] || null;
            };

            const baseData = getRawData(selectedYear, selectedSubject) || {};

            // Mathematics Extension Dependencies Rules
            // Extension 1 includes Advanced prerequisites
            if (selectedSubject === 'Mathematics Extension 1') {
                const advData = getRawData(selectedYear, 'Mathematics Advanced') || {};
                // Prepend Advanced modules to names so they are distinct or group naturally
                const merged = {};
                Object.keys(advData).forEach(mod => { merged[`[Adv] ${mod}`] = advData[mod]; });
                Object.keys(baseData).forEach(mod => { merged[mod] = baseData[mod]; });
                return merged;
            }

            // Extension 2 includes Advanced and Extension 1 prerequisites
            if (selectedSubject === 'Mathematics Extension 2') {
                const advData = getRawData(selectedYear, 'Mathematics Advanced') || {};
                const ext1Data = getRawData(selectedYear, 'Mathematics Extension 1') || {};
                const merged = {};
                Object.keys(advData).forEach(mod => { merged[`[Adv] ${mod}`] = advData[mod]; });
                Object.keys(ext1Data).forEach(mod => { merged[`[Ext 1] ${mod}`] = ext1Data[mod]; });
                Object.keys(baseData).forEach(mod => { merged[mod] = baseData[mod]; });
                return merged;
            }

            return baseData;
        }

        // For Year 7-10, the data is keyed by simple "Year X"
        const yearMatch = selectedYear.match(/Year (\d+)/);
        const yearKey = yearMatch ? `Year ${yearMatch[1]}` : selectedYear;
        
        const yearData = SYLLABUS_DATA[yearKey];
        if (!yearData) return null;

        // Match subject (Mathematics, English, etc.)
        return yearData[selectedSubject] || yearData;
    };

    const currentSyllabus = getSyllabusContent();

    // 2) If the subject is 'Other', hard-force Mode B (Manual Entry)
    if (selectedSubject === 'Other' || mode === 'B') {
        const hasModeToggle = selectedSubject !== 'Other';
        return (
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 animate-reveal flex flex-col h-full"
            >
                <div className="flex items-start justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-full bg-mait-cyan/20 text-mait-cyan flex items-center justify-center font-bold text-sm">
                                2
                            </div>
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <Edit3 className="text-mait-cyan" size={20} />
                                Manual Topic Specification
                            </h3>
                        </div>
                        <p className="text-sm text-white/50 pr-4">
                            {selectedSubject === 'Other' 
                                ? `You've selected a custom subject (${customSubject || 'Other'}). Please type or paste your specific topics.`
                                : `Type or paste your specific topics, question types, or syllabus dot-points below.`}
                        </p>
                    </div>

                    {hasModeToggle && (
                        <div className="flex glass-card rounded-lg p-1 mt-1 shrink-0">
                            <button 
                                onClick={() => setMode('A')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'A' ? 'bg-mait-cosmic text-white shadow-neon-purple' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            >
                                Official Syllabus
                            </button>
                            <button 
                                onClick={() => setMode('B')}
                                className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'B' ? 'bg-mait-cosmic text-white shadow-neon-purple' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                            >
                                Manual Entry
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-[400px]">
                    <MathInput
                        value={rawQuestions}
                        onChange={setRawQuestions}
                        placeholder="e.g. Generate 5 limits questions, 3 differentiation chain rule questions, and 2 word problems involving rates of change..."
                        rows={12}
                        className="h-full"
                        inputClassName="w-full h-full min-h-[400px] bg-white/5 border border-white/10 rounded-2xl p-4 pr-24 text-sm text-white focus:border-mait-cyan/50 outline-none resize-none transition-all placeholder:text-white/30"
                    />
                </div>
            </motion.div>
        );
    }

    // 3) If the subject doesn't exist in our hardcoded SYLLABUS_DATA yet (e.g. Stage 1 English)
    if (!currentSyllabus) {
        return (
            <motion.div className="space-y-6 animate-reveal">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-mait-cyan/20 text-mait-cyan flex items-center justify-center font-bold text-sm">2</div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ListPlus className="text-mait-cyan" size={20} />
                        Select Syllabus Topics
                    </h3>
                </div>
                <div className="glass-card border-yellow-500/20 p-6 rounded-2xl text-center">
                    <p className="text-yellow-400 font-medium">
                        We don't have the official syllabus mapped for <strong>{selectedSubject}</strong> ({selectedYear}) yet.
                    </p>
                    <button 
                        onClick={() => setMode('B')}
                        className="mt-4 px-4 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg text-sm font-medium transition-colors"
                    >
                        Switch to Manual Entry
                    </button>
                </div>
            </motion.div>
        );
    }

    // --- Core Syllabus Tree Logic ---
    const modules = Object.keys(currentSyllabus);

    const toggleModule = (mod) => setExpandedModules(prev => ({ ...prev, [mod]: !prev[mod] }));
    const toggleSubtopic = (subt) => setExpandedSubtopics(prev => ({ ...prev, [subt]: !prev[subt] }));

    const getPointsForModule = (mod) => {
        let points = [];
        Object.values(currentSyllabus[mod] || {}).forEach(arr => points.push(...arr));
        return points;
    };

    const isModuleSelected = (mod) => {
        const modPoints = getPointsForModule(mod);
        return modPoints.length > 0 && modPoints.every(p => selectedPoints.includes(p));
    };

    const toggleModuleSelection = (mod) => {
        const modPoints = getPointsForModule(mod);
        if (isModuleSelected(mod)) {
            setSelectedPoints(prev => prev.filter(p => !modPoints.includes(p)));
        } else {
            setSelectedPoints(prev => [...new Set([...prev, ...modPoints])]);
        }
    };

    const getPointsForSubtopic = (mod, subt) => currentSyllabus[mod]?.[subt] || [];

    const isSubtopicSelected = (mod, subt) => {
        const subPoints = getPointsForSubtopic(mod, subt);
        return subPoints.length > 0 && subPoints.every(p => selectedPoints.includes(p));
    };

    const toggleSubtopicSelection = (mod, subt) => {
        const subPoints = getPointsForSubtopic(mod, subt);
        if (isSubtopicSelected(mod, subt)) {
            setSelectedPoints(prev => prev.filter(p => !subPoints.includes(p)));
        } else {
            setSelectedPoints(prev => [...new Set([...prev, ...subPoints])]);
        }
    };

    const handlePointToggle = (point) => {
        setSelectedPoints(prev => 
            prev.includes(point) 
                ? prev.filter(p => p !== point)
                : [...prev, point]
        );
    };

    // Filter Logic for Search Query
    const SyllabusPoint = ({ text, isSelected }) => {
        return (
            <div className={`text-[11px] leading-relaxed markdown-math ${isSelected ? 'text-white' : 'text-white/60'}`}>
                <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        p: ({ node, ...props }) => <span {...props} />, // Use span to avoid line breaks in the label
                    }}
                >
                    {text}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 animate-reveal flex flex-col h-full"
        >
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-mait-cyan/20 text-mait-cyan flex items-center justify-center font-bold text-sm">
                            2
                        </div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <ListPlus className="text-mait-cyan" size={20} />
                            Select Syllabus Topics
                        </h3>
                    </div>
                    <p className="text-sm text-white/50 pr-4">
                        Select specific dot-points from the {selectedSubject} syllabus to perfectly align the generated questions.
                    </p>
                </div>
                
                {selectedSubject !== 'Other' && (
                    <div className="flex glass-card rounded-lg p-1 mt-1 shrink-0">
                        <button 
                            onClick={() => setMode('A')}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'A' ? 'bg-mait-cosmic text-white shadow-neon-purple' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        >
                            Official Syllabus
                        </button>
                        <button 
                            onClick={() => setMode('B')}
                            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${mode === 'B' ? 'bg-mait-cosmic text-white shadow-neon-purple' : 'text-white/50 hover:text-white hover:bg-white/10'}`}
                        >
                            Manual Entry
                        </button>
                    </div>
                )}
            </div>

            <div className={`glass-card rounded-2xl min-h-[400px] overflow-hidden flex flex-col flex-1`}>
                {/* Search & Selected Header */}
                <div className="p-4 border-b border-white/10 flex flex-wrap items-center gap-4 bg-white/5">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            placeholder="Find a topic or point..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:border-mait-cyan/50 outline-none transition-all"
                        />
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-mait-cyan font-bold flex items-center gap-2">
                        <CheckCircle2 size={12} />
                        {selectedPoints.length} Points Selected
                    </div>
                    {selectedPoints.length > 0 && (
                        <button
                            type="button"
                            onClick={() => setSelectedPoints([])}
                            className="text-[10px] uppercase tracking-widest hover:text-white transition-colors text-white/50"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Scrollable Tree View */}
                <div className="flex-1 overflow-y-auto max-h-[500px] p-4 custom-scrollbar">
                    <div className="space-y-4">
                        {modules.map(mod => {
                            // Apply basic search string filter. If a child matches, we force-show the parent.
                            const hasSubtopicMatch = Object.keys(currentSyllabus[mod] || {}).some(sub => 
                                sub.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                currentSyllabus[mod][sub].some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
                            );

                            if (searchQuery && !mod.toLowerCase().includes(searchQuery.toLowerCase()) && !hasSubtopicMatch) {
                                return null;
                            }

                            return (
                                <div key={mod} className="space-y-1">
                                    {/* Module row */}
                                    <div className="flex items-center gap-2 group p-1">
                                        <button
                                            type="button"
                                            onClick={() => toggleModule(mod)}
                                            className="p-1 hover:bg-white/10 rounded transition-colors text-white"
                                        >
                                            {expandedModules[mod] || searchQuery ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        </button>
                                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                                            <input
                                                type="checkbox"
                                                checked={isModuleSelected(mod)}
                                                onChange={() => toggleModuleSelection(mod)}
                                                className="w-3.5 h-3.5 rounded border-white/20 accent-mait-cyan cursor-pointer"
                                            />
                                            <span className="text-xs font-bold text-white group-hover:text-mait-cyan transition-colors">{mod}</span>
                                        </label>
                                    </div>

                                    {/* Subtopics */}
                                    {(expandedModules[mod] || searchQuery) && (
                                        <div className="ml-6 space-y-3 border-l border-white/10 pl-4 py-2">
                                            {Object.keys(currentSyllabus[mod] || {}).map(subt => {
                                                const points = currentSyllabus[mod][subt];
                                                const hasPointMatch = points.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()));
                                                
                                                if (searchQuery && !subt.toLowerCase().includes(searchQuery.toLowerCase()) && !hasPointMatch) {
                                                    return null;
                                                }

                                                return (
                                                    <div key={subt} className="space-y-1">
                                                        <div className="flex items-center gap-2 group p-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleSubtopic(subt)}
                                                                className="p-1 hover:bg-white/10 text-white/80 rounded transition-colors flex-shrink-0"
                                                            >
                                                                {expandedSubtopics[subt] || searchQuery ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                            </button>
                                                            <label className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSubtopicSelected(mod, subt)}
                                                                    onChange={() => toggleSubtopicSelection(mod, subt)}
                                                                    className="w-3.5 h-3.5 rounded border-white/20 accent-mait-cyan cursor-pointer flex-shrink-0"
                                                                />
                                                                <span className="text-[11px] text-white/70 font-semibold group-hover:text-white tracking-wide truncate">
                                                                    {subt}
                                                                </span>
                                                            </label>
                                                        </div>

                                                        {/* Dot Points */}
                                                        {(expandedSubtopics[subt] || searchQuery) && (
                                                            <div className="ml-6 grid gap-2 py-1">
                                                                {points.map((point, idx) => {
                                                                    if (searchQuery && !point.toLowerCase().includes(searchQuery.toLowerCase())) {
                                                                        return null;
                                                                    }
                                                                    
                                                                    return (
                                                                        <label
                                                                            key={idx}
                                                                            className={`flex items-start gap-3 p-3 rounded-xl border border-white/5 transition-all cursor-pointer select-none ${
                                                                                selectedPoints.includes(point) 
                                                                                ? 'bg-mait-cyan/10 border-mait-cyan/30 text-white shadow-neon-blue' 
                                                                                : 'bg-black/20 text-white/60 hover:border-mait-cyan/20'
                                                                            }`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedPoints.includes(point)}
                                                                                onChange={() => handlePointToggle(point)}
                                                                                className="mt-0.5 w-3.5 h-3.5 rounded border-white/20 accent-mait-cyan cursor-pointer flex-shrink-0"
                                                                            />
                                                                            <SyllabusPoint 
                                                                                text={point} 
                                                                                isSelected={selectedPoints.includes(point)} 
                                                                            />
                                                                        </label>
                                                                    );
                                                                })}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
