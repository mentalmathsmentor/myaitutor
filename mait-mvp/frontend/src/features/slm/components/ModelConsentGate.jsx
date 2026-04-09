import React, { useState } from 'react';
import { Download, BrainCircuit, XCircle, Zap, FlaskConical, AlertCircle, AlertTriangle } from 'lucide-react';
import { useIsMobileOrReduced } from '../../../hooks/useIsMobileOrReduced';
import { modelService } from '../services/ModelService';

const ModelConsentGate = ({
    models,
    cachedModels = {},
    onStart,
    onCancel,
    downloadProgress
}) => {
    const isMobile = useIsMobileOrReduced();
    // Checkbox state
    const [keepCached, setKeepCached] = useState(() => {
        return localStorage.getItem('mait_webllm_cache_preference') === 'true';
    });
    const [localCachedModels, setLocalCachedModels] = useState(cachedModels);

    const handleModelSelect = (modelKey) => {
        // Save preference
        localStorage.setItem('mait_webllm_cache_preference', keepCached ? 'true' : 'false');
        localStorage.setItem('mait_webllm_preferred_model', modelKey);
        onStart(modelKey, keepCached);
    };

    // If downloading, show progress view
    if (downloadProgress) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="glass-card border border-primary/20 p-8 rounded-2xl max-w-md w-full shadow-glow animate-reveal">
                    <h2 className="text-xl font-display font-bold text-center mb-6">Downloading Model</h2>
                    <div className="flex flex-col gap-3 mb-8">
                        <div className="flex justify-between text-sm uppercase font-display tracking-wider">
                            <span className="text-primary">{downloadProgress.text || 'Connecting...'}</span>
                            <span className="text-muted-foreground">{Math.round(downloadProgress.progress || 0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-surface-1 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 ease-out"
                                style={{ width: `${downloadProgress.progress || 0}%` }}
                            />
                        </div>
                        {downloadProgress.estimatedMB && downloadProgress.fetchedMB && (
                            <div className="text-xs text-muted-foreground text-center font-mono">
                                {Math.round(downloadProgress.fetchedMB)}MB / {downloadProgress.estimatedMB}MB
                            </div>
                        )}
                        {downloadProgress.speedMBps && (
                            <div className="text-[10px] text-muted-foreground text-center font-mono mt-1">
                                {downloadProgress.speedMBps.toFixed(1)} MB/s
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-surface-3 text-muted-foreground hover:bg-surface-1 hover:text-foreground transition-all font-display uppercase tracking-wide text-sm"
                    >
                        <XCircle size={16} />
                        Cancel Download
                    </button>
                </div>
            </div>
        );
    }

    const availableKeys = ['tiny', 'balanced', 'quality'];

    if (isMobile) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full space-y-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-8 text-center animate-reveal">
                    <AlertTriangle className="mx-auto h-10 w-10 text-amber-400" />
                    <h3 className="text-lg font-semibold text-white">Not available on mobile</h3>
                    <p className="text-sm text-white/60">
                        Local AI requires a desktop browser with at least 4GB of free RAM.
                        The models are 1.2–2.2 GB and need significant processing power.
                    </p>
                    <button
                        onClick={onCancel}
                        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-white transition hover:bg-primary/80"
                    >
                        Use Cloud Mode instead
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-4 py-12 lg:py-20 overflow-y-auto w-full">
            <div className="max-w-4xl w-full space-y-8 animate-reveal mx-auto relative z-10 pt-10">
                {/* Header */}
                <div className="text-center space-y-3">
                    <div className="inline-flex py-1.5 px-3 rounded-full border border-primary/30 bg-primary/10 text-primary mb-2">
                        <BrainCircuit size={16} className="mr-2" />
                        <span className="text-xs font-display font-bold uppercase tracking-wider">Free Demo Edition</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">
                        AI runs locally in your browser
                    </h1>
                    <p className="text-muted-foreground flex items-center justify-center gap-2 max-w-lg mx-auto">
                        <AlertCircle size={16} className="text-accent flex-shrink-0" />
                        <span className="text-sm">Choose a model to download. It runs entirely on your device — no data leaves your browser. Needs Chrome 113+ or Edge 113+.</span>
                    </p>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {availableKeys.map(key => {
                        const model = models[key];
                        if (!model) return null;
                        const isCached = localCachedModels[key];
                        
                        let Icon = BrainCircuit;
                        let glowClass = 'hover:border-primary/50 hover:shadow-primary/10 border-surface-2';
                        let btnClass = 'bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary-foreground';
                        let tagClass = 'border-primary/20 text-primary';
                        
                        if (key === 'tiny') {
                            Icon = Zap;
                        } else if (key === 'balanced') {
                            glowClass = 'hover:border-accent/50 hover:shadow-accent/10 border-surface-2';
                            btnClass = 'bg-accent/10 text-accent hover:bg-accent hover:text-accent-foreground';
                            tagClass = 'border-accent/20 text-accent';
                        } else if (key === 'quality') {
                            Icon = FlaskConical;
                            glowClass = 'hover:border-secondary/50 hover:shadow-secondary/10 border-surface-2';
                            btnClass = 'bg-secondary/10 text-secondary hover:bg-secondary hover:text-secondary-foreground';
                            tagClass = 'border-secondary/20 text-secondary';
                        }

                        return (
                            <div key={key} className={`glass-card p-6 rounded-2xl flex flex-col h-full border transition-all duration-300 ${glowClass} hover:-translate-y-1 relative overflow-hidden group/card`}>
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover/card:opacity-10 transition-opacity">
                                    <Icon size={80} />
                                </div>
                                <div className="mb-4 relative z-10">
                                    <div className={`p-2.5 rounded-lg inline-flex text-foreground mb-3 shadow-sm border ${tagClass} bg-background/50 backdrop-blur-sm`}>
                                        <Icon size={20} />
                                    </div>
                                    <h3 className="text-lg font-display font-bold text-foreground mb-1">{model.displayName || model.name}</h3>
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <span className={`text-[10px] uppercase tracking-wider font-display font-medium px-2 py-0.5 rounded-full border ${tagClass}`}>
                                            {model.id.includes('SmolLM') ? 'Fastest' : model.id.includes('Llama') ? 'Balanced' : 'Deep Logic'}
                                        </span>
                                        <span className="text-[10px] uppercase tracking-wider font-display opacity-60">
                                            {isCached ? "✨ Cached" : `~${(model.estimatedSizeMB/1000).toFixed(1)}GB`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex-grow relative z-10 mb-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">{model.description}</p>
                                </div>
                                <button
                                    onClick={() => handleModelSelect(key)}
                                    className={`w-full py-3.5 rounded-xl border border-transparent transition-all font-display font-bold uppercase tracking-wide text-xs flex items-center justify-center gap-2 relative z-10 ${btnClass}`}
                                >
                                    {isCached ? (
                                        <>
                                            <BrainCircuit size={16} /> Start
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} /> Download & Start
                                        </>
                                    )}
                                </button>
                                {isCached && (
                                    <button
                                        onClick={async () => {
                                            await modelService.unloadModel(false);
                                            setLocalCachedModels(prev => ({ ...prev, [key]: false }));
                                        }}
                                        className="mt-2 text-xs text-white/40 underline transition hover:text-white/70 relative z-10 w-full text-center"
                                    >
                                        Clear cached model ({model.estimatedSizeMB ? (model.estimatedSizeMB / 1000).toFixed(1) : '?'} GB)
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Controls */}
                <div className="flex flex-col items-center gap-4 mt-8 bg-surface-1/50 backdrop-blur-sm border border-surface-2 p-6 rounded-2xl max-w-md mx-auto relative z-10">
                    <label className="flex items-center gap-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors group">
                        <div className="relative flex items-center justify-center shrink-0">
                            <input 
                                type="checkbox"
                                className="sr-only"
                                checked={keepCached}
                                onChange={(e) => setKeepCached(e.target.checked)}
                            />
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${keepCached ? 'bg-primary border-primary' : 'border-surface-3 group-hover:border-primary/50 bg-background'}`}>
                                {keepCached && <Zap size={12} className="text-primary-foreground" />}
                            </div>
                        </div>
                        <span className="text-sm leading-tight text-left">Keep model cached for next visit (saves re-downloading)</span>
                    </label>

                    <div className="h-px w-full bg-surface-3/50 my-2" />

                    <p className="text-xs text-muted-foreground text-center">
                        On mobile or limited data? Try our full mode instead which processes in the cloud.<br />
                        <a href="/worksheets" className="text-accent hover:underline inline-flex items-center mt-2 group">
                            Try Full Mode <Zap size={10} className="ml-1 group-hover:translate-x-0.5 transition-transform" />
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ModelConsentGate;
