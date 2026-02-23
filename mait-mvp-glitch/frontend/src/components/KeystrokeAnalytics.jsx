import { X, Zap, Clock, AlertTriangle, TrendingUp, Activity, Brain, Timer, Keyboard, MessageSquare } from 'lucide-react';

/**
 * KeystrokeAnalytics - Visual dashboard for keystroke psychometric data
 */
function KeystrokeAnalytics({ metrics, historicalMetrics, behaviorAnalysis, onClose }) {
    const formatTime = (ms) => {
        if (ms < 1000) return `${Math.round(ms)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    };

    const getWPMColor = (wpm) => {
        if (wpm > 60) return 'text-primary';
        if (wpm > 40) return 'text-accent';
        if (wpm > 20) return 'text-secondary';
        return 'text-destructive';
    };

    const getBadgeStyle = (category) => {
        const styles = {
            fast: 'bg-primary/15 text-primary border-primary/30',
            moderate: 'bg-accent/15 text-accent border-accent/30',
            slow: 'bg-secondary/15 text-secondary border-secondary/30',
            very_slow: 'bg-destructive/15 text-destructive border-destructive/30',
            very_consistent: 'bg-primary/15 text-primary border-primary/30',
            consistent: 'bg-primary/15 text-primary border-primary/30',
            variable: 'bg-accent/15 text-accent border-accent/30',
            deliberate: 'bg-secondary/15 text-secondary border-secondary/30',
            thoughtful: 'bg-secondary/15 text-secondary border-secondary/30',
            quick: 'bg-primary/15 text-primary border-primary/30',
            accurate: 'bg-primary/15 text-primary border-primary/30',
            normal: 'bg-muted/30 text-muted-foreground border-muted/30',
            error_prone: 'bg-accent/15 text-accent border-accent/30',
            high_error: 'bg-destructive/15 text-destructive border-destructive/30',
            unknown: 'bg-surface-2 text-muted-foreground border-surface-3'
        };
        return styles[category] || styles.unknown;
    };

    return (
        <div className="fixed right-4 top-20 w-80 glass-card rounded-2xl shadow-2xl z-40 overflow-hidden border-secondary/20 animate-reveal">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-surface-2">
                <div className="flex items-center gap-2">
                    <Activity className="text-secondary" size={18} />
                    <h3 className="font-display font-bold text-foreground text-sm">Keystroke Psychometrics</h3>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors"
                >
                    <X size={16} className="text-muted-foreground" />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {/* WPM Display */}
                <div className="text-center py-5 bg-surface-1 rounded-xl border border-surface-3">
                    <div className={`text-5xl font-display font-bold ${getWPMColor(metrics.realtimeWPM || metrics.wpm)} text-glow-primary`}>
                        {metrics.realtimeWPM || metrics.wpm || '--'}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider font-display">Words Per Minute</div>
                    {historicalMetrics.averageWPM > 0 && (
                        <div className="text-xs text-muted-foreground mt-2">
                            Avg: <span className="text-secondary font-medium">{historicalMetrics.averageWPM} WPM</span>
                        </div>
                    )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                        icon={<Brain size={14} className="text-secondary" />}
                        label="Think Time"
                        value={formatTime(metrics.avgThinkingTime || 0)}
                        color="text-secondary"
                    />
                    <MetricCard
                        icon={<Timer size={14} className="text-primary" />}
                        label="Dwell Time"
                        value={`${metrics.avgDwellTime || 0}ms`}
                        color="text-primary"
                    />
                    <MetricCard
                        icon={<Zap size={14} className="text-accent" />}
                        label="Flight Time"
                        value={`${metrics.avgFlightTime || 0}ms`}
                        color="text-accent"
                    />
                    <MetricCard
                        icon={<AlertTriangle size={14} className="text-destructive" />}
                        label="Error Rate"
                        value={`${metrics.errorRate || 0}%`}
                        color="text-destructive"
                    />
                </div>

                {/* Session Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground px-1 font-mono">
                    <div className="flex items-center gap-1.5">
                        <Keyboard size={12} />
                        <span>{metrics.charactersTyped || 0} chars</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{formatTime(metrics.sessionDuration || 0)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <MessageSquare size={12} />
                        <span>{historicalMetrics.messageFrequencyPerMinute || 0}/min</span>
                    </div>
                </div>

                {/* Behavior Analysis */}
                {behaviorAnalysis && Object.keys(behaviorAnalysis).length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs text-muted-foreground uppercase tracking-wider font-display">Behavior Profile</div>
                        <div className="flex flex-wrap gap-2">
                            {behaviorAnalysis.typingSpeed && (
                                <span className={`px-2.5 py-1 rounded-full text-xs border font-display ${getBadgeStyle(behaviorAnalysis.typingSpeed)}`}>
                                    {behaviorAnalysis.typingSpeed?.replace('_', ' ')}
                                </span>
                            )}
                            {behaviorAnalysis.consistency && (
                                <span className={`px-2.5 py-1 rounded-full text-xs border font-display ${getBadgeStyle(behaviorAnalysis.consistency)}`}>
                                    {behaviorAnalysis.consistency?.replace('_', ' ')}
                                </span>
                            )}
                            {behaviorAnalysis.thinkingPattern && (
                                <span className={`px-2.5 py-1 rounded-full text-xs border font-display ${getBadgeStyle(behaviorAnalysis.thinkingPattern)}`}>
                                    {behaviorAnalysis.thinkingPattern}
                                </span>
                            )}
                            {behaviorAnalysis.errorTendency && (
                                <span className={`px-2.5 py-1 rounded-full text-xs border font-display ${getBadgeStyle(behaviorAnalysis.errorTendency)}`}>
                                    {behaviorAnalysis.errorTendency?.replace('_', ' ')}
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Historical Stats */}
                {historicalMetrics.totalSessions > 0 && (
                    <div className="pt-3 border-t border-surface-2">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp size={14} className="text-secondary" />
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-display">All-Time Stats</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center">
                            <div className="bg-surface-1 rounded-lg p-2 border border-surface-3">
                                <div className="text-lg font-display font-bold text-secondary">{historicalMetrics.totalSessions}</div>
                                <div className="text-[10px] text-muted-foreground uppercase">Sessions</div>
                            </div>
                            <div className="bg-surface-1 rounded-lg p-2 border border-surface-3">
                                <div className="text-lg font-display font-bold text-primary">
                                    {(historicalMetrics.totalCharactersTyped / 1000).toFixed(1)}k
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">Characters</div>
                            </div>
                            <div className="bg-surface-1 rounded-lg p-2 border border-surface-3">
                                <div className="text-lg font-display font-bold text-accent">
                                    {historicalMetrics.totalErrorCorrections}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase">Corrections</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ icon, label, value, color }) {
    return (
        <div className="bg-surface-1 rounded-lg p-3 border border-surface-3">
            <div className="flex items-center gap-2 mb-1.5">
                {icon}
                <span className="text-xs text-muted-foreground">{label}</span>
            </div>
            <div className={`text-lg font-display font-semibold ${color}`}>
                {value}
            </div>
        </div>
    );
}

export default KeystrokeAnalytics;
