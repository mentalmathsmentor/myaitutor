import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

const YEAR_LEVELS = [
    {
        label: 'Kindy',
        value: 'es1',
        subjects: ['Mathematics', 'English', 'Science', 'HSIE', 'Other']
    },
    {
        label: 'Stage 1 (Yr 1-2)',
        value: 's1',
        subjects: ['Mathematics', 'English', 'Science', 'HSIE', 'Other']
    },
    {
        label: 'Stage 2 (Yr 3-4)',
        value: 's2',
        subjects: ['Mathematics', 'English', 'Science', 'HSIE', 'Other']
    },
    {
        label: 'Stage 3 (Yr 5-6)',
        value: 's3',
        subjects: ['Mathematics', 'English', 'Science', 'HSIE', 'Other']
    },
    {
        label: 'Stage 4 (Yr 7-8)',
        value: 's4',
        subjects: ['Mathematics', 'English', 'Science', 'HSIE', 'Other']
    },
    {
        label: 'Stage 5 (Yr 9-10)',
        value: 's5',
        subjects: ['Mathematics', 'English', 'Science', 'HSIE', 'Other']
    },
    {
        label: 'Year 11',
        value: 'y11',
        subjects: ['Mathematics Standard', 'Mathematics Advanced', 'Mathematics Extension 1', 'English', 'Physics', 'Chemistry', 'Biology', 'Other']
    },
    {
        label: 'Year 12',
        value: 'y12',
        subjects: ['Mathematics Standard', 'Mathematics Advanced', 'Mathematics Extension 1', 'Mathematics Extension 2', 'English', 'Physics', 'Chemistry', 'Biology', 'Other']
    }
];

export default function Step1YearLevel({ 
    selectedYear, 
    setSelectedYear, 
    selectedSubject, 
    setSelectedSubject, 
    customSubject, 
    setCustomSubject,
    setMode,
    setSelectedPoints
}) {

    const handleYearChange = (newYear) => {
        setSelectedYear(newYear);
        const newYearData = YEAR_LEVELS.find(y => y.label === newYear);
        
        // Reset subject if not available in new year to the first available subject
        if (newYearData && !newYearData.subjects.includes(selectedSubject)) {
            setSelectedSubject(newYearData.subjects[0]);
            setMode('A'); // Reset to Generative mode whenever a standard subject is auto-selected
        }
        
        // Clear topics since syllabus inherently changes
        setSelectedPoints([]);
    };

    const handleSubjectChange = (newSubject) => {
        setSelectedSubject(newSubject);
        if (newSubject === 'Other') {
            setMode('B'); // Force manual Question/Topic Specification if "Other" is chosen
        } else {
            setMode('A'); // Standard Syllabus Mode (Generative)
        }
        setSelectedPoints([]);
    };

    const currentYearData = YEAR_LEVELS.find(y => y.label === selectedYear) || YEAR_LEVELS[0];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="space-y-8 animate-reveal"
        >
            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-full bg-mait-cyan/20 text-mait-cyan flex items-center justify-center font-bold text-sm">
                        1
                    </div>
                    <h3 className="text-xl font-bold text-white">Select Year & Subject</h3>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {YEAR_LEVELS.map((level) => (
                        <button
                            key={level.label}
                            type="button"
                            onClick={() => handleYearChange(level.label)}
                            className={`p-4 rounded-xl transition-all text-center flex flex-col items-center justify-center gap-1 min-h-[80px] ${
                                selectedYear === level.label
                                    ? 'bg-mait-cosmic text-white shadow-neon-purple border border-mait-cosmic/50'
                                    : 'glass-card text-white/70 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <span className={`font-medium ${selectedYear === level.label ? 'text-white' : 'text-white/80'}`}>
                                {level.label.split('(')[0].trim()}
                            </span>
                            {level.label.includes('(') && (
                                <span className={`text-xs font-medium ${selectedYear === level.label ? 'text-white/80' : 'text-white/50'}`}>
                                    {level.label.match(/\(([^)]+)\)/)?.[1]}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
                <label className="text-sm font-medium text-white/80 flex items-center gap-2">
                    <BookOpen size={16} className="text-mait-cyan" />
                    Focus Subject
                </label>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {currentYearData.subjects.map(subj => (
                        <button
                            key={subj}
                            type="button"
                            onClick={() => handleSubjectChange(subj)}
                            className={`p-3 rounded-xl transition-all ${
                                selectedSubject === subj
                                    ? 'bg-mait-cosmic/20 border border-mait-cosmic/50 text-white shadow-neon-purple font-semibold'
                                    : 'glass-card text-white/70 hover:text-white'
                            }`}
                        >
                            {subj}
                        </button>
                    ))}
                </div>

                {selectedSubject === 'Other' && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 animate-reveal"
                    >
                        <div className="glass-card p-4 rounded-xl border border-white/10 space-y-3">
                            <label className="block text-xs uppercase tracking-wider text-white/60">
                                Custom Subject Name
                            </label>
                            <input
                                type="text"
                                value={customSubject}
                                onChange={(e) => setCustomSubject(e.target.value)}
                                placeholder="e.g. Software Engineering..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-mait-cyan/50 outline-none transition-all placeholder:text-white/30"
                                autoFocus
                            />
                            <p className="text-[11px] text-white/50 italic flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-mait-cyan inline-block"></span>
                                Entering a custom subject automatically switches the generator to "Topic Specification" mode (Manual Entry).
                            </p>
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}
