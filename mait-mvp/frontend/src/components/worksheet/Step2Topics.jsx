import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, ChevronRight, ChevronDown, ListPlus, Edit3 } from 'lucide-react';

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

        // Base mapping for subjects that have distinct syllabus files in Y11/Y12
        if (selectedYear === 'Year 11' || selectedYear === 'Year 12') {
            const subjectKeyMap = {
                'Mathematics Standard': 'Standard',
                'Mathematics Advanced': 'Advanced',
                'Mathematics Extension 1': 'Extension 1',
                'Mathematics Extension 2': 'Extension 2',
                'Physics': 'Physics',
                'Chemistry': 'Chemistry',
                'Biology': 'Biology',
                'Engineering Studies': 'Engineering Studies'
            };

            const keySuffix = subjectKeyMap[selectedSubject];
            if (!keySuffix) return SYLLABUS_DATA[selectedYear]?.[selectedSubject];

            const primaryKey = `${selectedYear} ${keySuffix}`;
            let baseData = SYLLABUS_DATA[primaryKey] || {};

            // Mathematics Extension Dependencies Rules
            if (selectedSubject === 'Mathematics Extension 2') {
                const advKey = `${selectedYear} Advanced`;
                const ext1Key = `${selectedYear} Extension 1`;
                const advData = SYLLABUS_DATA[advKey] || {};
                const ext1Data = SYLLABUS_DATA[ext1Key] || {};
                return { ...advData, ...ext1Data, ...baseData };
            }

            if (selectedSubject === 'Mathematics Extension 1') {
                const advKey = `${selectedYear} Advanced`;
                const advData = SYLLABUS_DATA[advKey] || {};
                return { ...advData, ...baseData };
            }

            return baseData;
        }

        // For Year 7-10, the data is usually keyed just by the Year string
        const yearKey = selectedYear.split(' (')[0]; // Handle 'Stage 4 (Year 7-8)' -> 'Stage 4'
        // Wait, looking at syllabus_data.json, keys are "Year 7", "Year 8" etc.
        // Let's resolve the actual year from the label
        const stageToYearMap = {
            'Early Stage 1 (Kindy)': 'Year 1', // Placeholder or as per data
            'Stage 1 (Year 1-2)': 'Year 1',
            'Stage 2 (Year 3-4)': 'Year 3',
            'Stage 3 (Year 5-6)': 'Year 5',
            'Stage 4 (Year 7-8)': 'Year 7',
            'Stage 5 (Year 9-10)': 'Year 9',
            'Year 11': 'Year 11',
            'Year 12': 'Year 12'
        };

        const resolvedYear = stageToYearMap[selectedYear] || selectedYear;
        return SYLLABUS_DATA[resolvedYear]?.[selectedSubject] || SYLLABUS_DATA[resolvedYear];
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
                            <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                                2
                            </div>
                            <h3 className="text-xl font-display font-bold flex items-center gap-2">
                                <Edit3 className="text-primary" size={20} />
                                Manual Topic Specification
                            </h3>
                        </div>
                        <p className="text-sm text-muted-foreground pr-4">
                            {selectedSubject === 'Other' 
                                ? `You've selected a custom subject (${customSubject || 'Other'}). Please type or paste your specific topics.`
                                : `Type or paste your specific topics, question types, or syllabus dot-points below.`}
                        </p>
                    </div>

                    {hasModeToggle && (
                        <div className="flex bg-surface-2/50 rounded-lg p-1 border border-surface-3 mt-1 shrink-0">
                            <button 
                                onClick={() => setMode('A')}
                                className={`px-4 py-1.5 rounded-md text-xs font-display font-medium transition-all ${mode === 'A' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3/50'}`}
                            >
                                Official Syllabus
                            </button>
                            <button 
                                onClick={() => setMode('B')}
                                className={`px-4 py-1.5 rounded-md text-xs font-display font-medium transition-all ${mode === 'B' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3/50'}`}
                            >
                                Manual Entry
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex-1 min-h-[400px]">
                    <textarea
                        value={rawQuestions}
                        onChange={(e) => setRawQuestions(e.target.value)}
                        placeholder="e.g. Generate 5 limits questions, 3 differentiation chain rule questions, and 2 word problems involving rates of change..."
                        className="w-full h-full min-h-[400px] bg-surface-1/30 border border-surface-3/50 rounded-2xl p-4 text-sm font-display focus:border-primary/50 outline-none resize-none transition-all placeholder:text-surface-4"
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
                    <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">2</div>
                    <h3 className="text-xl font-display font-bold flex items-center gap-2">
                        <ListPlus className="text-primary" size={20} />
                        Select Syllabus Topics
                    </h3>
                </div>
                <div className="bg-surface-2/20 border border-amber-500/20 p-6 rounded-2xl text-center">
                    <p className="text-amber-500/80 font-display">
                        We don't have the official syllabus mapped for <strong>{selectedSubject}</strong> ({selectedYear}) yet.
                    </p>
                    <button 
                        onClick={() => setMode('B')}
                        className="mt-4 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-lg text-sm font-medium transition-colors"
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
    const renderLatex = (text) => {
        let parsed = text.replace(/\\\\/g, '\\');
        // Simple faux-render for inline preview so users don't see raw \text{} blobs
        parsed = parsed.replace(/\\text\{([^}]+)\}/g, '$1');
        return parsed;
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
                        <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                            2
                        </div>
                        <h3 className="text-xl font-display font-bold flex items-center gap-2">
                            <ListPlus className="text-primary" size={20} />
                            Select Syllabus Topics
                        </h3>
                    </div>
                    <p className="text-sm text-muted-foreground pr-4">
                        Select specific dot-points from the {selectedSubject} syllabus to perfectly align the generated questions.
                    </p>
                </div>
                
                {selectedSubject !== 'Other' && (
                    <div className="flex bg-surface-2/50 rounded-lg p-1 border border-surface-3 mt-1 shrink-0">
                        <button 
                            onClick={() => setMode('A')}
                            className={`px-4 py-1.5 rounded-md text-xs font-display font-medium transition-all ${mode === 'A' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3/50'}`}
                        >
                            Official Syllabus
                        </button>
                        <button 
                            onClick={() => setMode('B')}
                            className={`px-4 py-1.5 rounded-md text-xs font-display font-medium transition-all ${mode === 'B' ? 'bg-primary text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-surface-3/50'}`}
                        >
                            Manual Entry
                        </button>
                    </div>
                )}
            </div>

            <div className={`bg-surface-1/30 rounded-2xl border border-surface-3/50 min-h-[400px] overflow-hidden flex flex-col flex-1`}>
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
                            className="text-[10px] font-display uppercase tracking-widest hover:text-foreground transition-colors text-muted-foreground"
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
                                            className="p-1 hover:bg-surface-3 rounded transition-colors"
                                        >
                                            {expandedModules[mod] || searchQuery ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
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

                                    {/* Subtopics */}
                                    {(expandedModules[mod] || searchQuery) && (
                                        <div className="ml-6 space-y-3 border-l border-surface-3 pl-4 py-2">
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
                                                                className="p-1 hover:bg-surface-3 rounded transition-colors flex-shrink-0"
                                                            >
                                                                {expandedSubtopics[subt] || searchQuery ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                                            </button>
                                                            <label className="flex items-center gap-2 cursor-pointer flex-1 overflow-hidden">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSubtopicSelected(mod, subt)}
                                                                    onChange={() => toggleSubtopicSelection(mod, subt)}
                                                                    className="w-3.5 h-3.5 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer flex-shrink-0"
                                                                />
                                                                <span className="text-[11px] font-display text-muted-foreground font-semibold group-hover:text-foreground tracking-wide truncate">
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
                                                                            className={`flex items-start gap-3 p-3 rounded-xl border border-surface-3 transition-all cursor-pointer select-none ${
                                                                                selectedPoints.includes(point) 
                                                                                ? 'bg-primary/5 border-primary/20 text-foreground' 
                                                                                : 'bg-surface-2/20 text-muted-foreground hover:border-primary/10'
                                                                            }`}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={selectedPoints.includes(point)}
                                                                                onChange={() => handlePointToggle(point)}
                                                                                className="mt-0.5 w-3.5 h-3.5 rounded border-surface-4 text-primary focus:ring-primary/20 bg-surface-1 cursor-pointer flex-shrink-0"
                                                                            />
                                                                            <span 
                                                                                className="text-[11px] font-display leading-relaxed" 
                                                                                dangerouslySetInnerHTML={{ __html: renderLatex(point) }} 
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
