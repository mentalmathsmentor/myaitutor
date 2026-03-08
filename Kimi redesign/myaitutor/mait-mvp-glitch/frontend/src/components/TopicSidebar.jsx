import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, BookOpen, GraduationCap, Send } from 'lucide-react';
import syllabusData from '../features/slm/syllabusData';

function TopicSidebar({ subject, onTopicClick }) {
    const [expandedTopics, setExpandedTopics] = useState({});
    const [expandedYears, setExpandedYears] = useState({});

    const data = syllabusData[subject];

    // Reset expanded state when subject changes, auto-expand first year
    useEffect(() => {
        setExpandedTopics({});
        if (data) {
            const yearKeys = Object.keys(data.years);
            const initial = {};
            yearKeys.forEach(y => { initial[y] = true; });
            setExpandedYears(initial);
        }
    }, [subject]);

    if (!data) {
        return (
            <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-surface-3 bg-surface-1/50">
                <div className="p-4 text-sm text-muted-foreground text-center mt-8">
                    No syllabus data for this subject.
                </div>
            </aside>
        );
    }

    const toggleTopic = (code) => {
        setExpandedTopics(prev => ({ ...prev, [code]: !prev[code] }));
    };

    const toggleYear = (year) => {
        setExpandedYears(prev => ({ ...prev, [year]: !prev[year] }));
    };

    // Group topics by parent category within each year
    const groupByParent = (topics) => {
        const groups = [];
        const seen = {};
        topics.forEach(topic => {
            const p = topic.parent;
            if (!seen[p]) {
                seen[p] = { parent: p, topics: [] };
                groups.push(seen[p]);
            }
            seen[p].topics.push(topic);
        });
        return groups;
    };

    return (
        <aside className="hidden lg:flex w-[300px] shrink-0 flex-col border-l border-surface-3 overflow-hidden">
            {/* Header */}
            <div className="flex-none px-4 py-3 border-b border-surface-3 bg-surface-1/60 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-primary" />
                    <h2 className="text-[11px] font-display uppercase tracking-wider text-foreground">
                        Syllabus
                    </h2>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 font-display tracking-wide">
                    {subject} ({data.code})
                </p>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
                {Object.entries(data.years).map(([yearLabel, topics]) => {
                    const yearExpanded = expandedYears[yearLabel] !== false;
                    const groups = groupByParent(topics);

                    return (
                        <div key={yearLabel}>
                            {/* Year header */}
                            <button
                                onClick={() => toggleYear(yearLabel)}
                                className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-[10px] font-display uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-surface-2/60 transition-colors"
                            >
                                <GraduationCap size={12} className="shrink-0" />
                                <span className="flex-1 text-left">{yearLabel}</span>
                                {yearExpanded
                                    ? <ChevronDown size={12} className="shrink-0 opacity-50" />
                                    : <ChevronRight size={12} className="shrink-0 opacity-50" />
                                }
                            </button>

                            {yearExpanded && (
                                <div className="ml-1 space-y-0.5">
                                    {groups.map(group => (
                                        <div key={group.parent}>
                                            {/* Parent category label */}
                                            <div className="px-3 pt-2 pb-1">
                                                <span className="text-[9px] font-display uppercase tracking-widest text-muted-foreground/60">
                                                    {group.parent}
                                                </span>
                                            </div>

                                            {group.topics.map(topic => {
                                                const isExpanded = expandedTopics[topic.code];

                                                return (
                                                    <div key={topic.code}>
                                                        {/* Topic row */}
                                                        <button
                                                            onClick={() => toggleTopic(topic.code)}
                                                            className={`w-full flex items-center gap-1.5 px-3 py-1.5 rounded-md text-left transition-all group ${
                                                                isExpanded
                                                                    ? 'bg-primary/8 text-foreground'
                                                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-2/40'
                                                            }`}
                                                        >
                                                            {isExpanded
                                                                ? <ChevronDown size={10} className="shrink-0 text-primary" />
                                                                : <ChevronRight size={10} className="shrink-0 opacity-40 group-hover:opacity-70" />
                                                            }
                                                            <span className="text-[10px] font-mono text-primary/70 shrink-0">
                                                                {topic.code}
                                                            </span>
                                                            <span className="text-[11px] leading-tight truncate">
                                                                {topic.name}
                                                            </span>
                                                        </button>

                                                        {/* Subtopics */}
                                                        {isExpanded && topic.subtopics && (
                                                            <div className="ml-5 border-l border-surface-3 pl-2 my-0.5 space-y-0.5">
                                                                {topic.subtopics.map(sub => (
                                                                    <button
                                                                        key={sub.code}
                                                                        onClick={() => onTopicClick?.(sub.name, topic.name, topic.code)}
                                                                        className="w-full flex items-center gap-1.5 px-2 py-1 rounded text-left text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors group/sub"
                                                                    >
                                                                        <span className="text-[9px] font-mono text-primary/40 shrink-0">
                                                                            {sub.code}
                                                                        </span>
                                                                        <span className="text-[10px] leading-snug flex-1">
                                                                            {sub.name}
                                                                        </span>
                                                                        <Send size={8} className="shrink-0 opacity-0 group-hover/sub:opacity-40 transition-opacity" />
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer hint */}
            <div className="flex-none px-4 py-2 border-t border-surface-3 bg-surface-1/40">
                <p className="text-[9px] text-muted-foreground/60 font-display tracking-wide text-center">
                    Click a sub-topic to ask about it
                </p>
            </div>
        </aside>
    );
}

export default TopicSidebar;
