import React from 'react';
import { motion } from 'framer-motion';
import { Eye, FileText, LayoutTemplate, Sparkles, ArrowRight } from 'lucide-react';

export default function LivePreviewPanel({
    currentStep,
    selectedYear,
    selectedSubject,
    customSubject,
    mode,
    selectedPoints,
    rawQuestions,
    numQuestions,
    difficulty,
    workingSpace,
    isCopied,
    showWarning,
    handleGenerate,
    isShaking
}) {

    // Helper logic to show relevant data based on current context
    const getTopicCount = () => {
        if (mode === 'B') {
            return rawQuestions.trim() ? "Manual Questions Active" : "No Manual Questions";
        }
        return selectedPoints.length > 0 ? `${selectedPoints.length} Point(s) Selected` : "No Points Selected";
    };

    const getSubjectTitle = () => {
        if (selectedSubject === 'Other') return customSubject || 'Custom Subject';
        return selectedSubject;
    };

    return (
        <div className="sticky top-24 space-y-4">
            {/* Header */}
            <h3 className="text-sm font-display font-medium text-foreground flex items-center gap-2 mb-2 px-2">
                <Eye size={16} className="text-muted-foreground" />
                Live Preview
            </h3>

            {/* Preview Card */}
            <div className={`glass-card rounded-2xl p-6 border border-surface-3/50 space-y-6 ${isShaking ? 'animate-[shake_0.5s_cubic-bezier(.36,.07,.19,.97)_both] border-destructive/50' : ''}`}>
                
                {/* Simulated Document Header */}
                <div className="text-center space-y-1 pb-4 border-b border-surface-3/30 relative">
                    <div className="absolute top-0 right-0 opacity-20"><FileText size={40} /></div>
                    <div className="text-lg font-display font-bold text-foreground truncate px-4">
                        {getSubjectTitle()} Worksheet
                    </div>
                    <div className="text-xs text-secondary font-medium font-display uppercase tracking-widest">
                        {selectedYear.split('(')[0].trim()}
                    </div>
                </div>

                {/* Configuration Stats */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-surface-1/50 rounded-lg p-3 border border-surface-3/30">
                        <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Volume</span>
                        <span className="text-xs font-bold text-foreground">{numQuestions} Questions</span>
                    </div>

                    <div className="flex justify-between items-center bg-surface-1/50 rounded-lg p-3 border border-surface-3/30">
                        <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Difficulty</span>
                        <span className="text-xs font-bold text-foreground">{difficulty}</span>
                    </div>

                    <div className="flex justify-between items-center bg-surface-1/50 rounded-lg p-3 border border-surface-3/30">
                        <span className="text-[11px] font-display uppercase tracking-wider text-muted-foreground">Layout</span>
                        <span className="text-xs font-bold text-foreground flex items-center gap-2">
                            <LayoutTemplate size={12} className="text-secondary" />
                            {workingSpace}
                        </span>
                    </div>
                    
                    <div className="flex justify-between items-center bg-primary/5 rounded-lg p-3 border border-primary/20">
                        <span className="text-[11px] font-display uppercase tracking-wider text-primary/80">Syllabus Mapping</span>
                        <span className="text-xs font-bold text-primary">{getTopicCount()}</span>
                    </div>
                </div>

                {/* Generate Button Wrapper */}
                <div className="pt-4 relative group">
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isCopied || showWarning}
                        className="w-full py-4 rounded-xl font-display text-[13px] font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition-all duration-300 overflow-hidden relative shadow-lg bg-primary text-white hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.4)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                        <Sparkles size={16} className="animate-pulse relative z-10" />
                        <span className="relative z-10">Generate & Launch</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform relative z-10" />
                    </button>
                    {currentStep < 3 && (
                        <p className="text-[10px] text-center text-muted-foreground mt-3 font-display">
                            Tip: You can generate early, but settings and tools are on Step 3.
                        </p>
                    )}
                </div>

            </div>
        </div>
    );
}
