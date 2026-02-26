import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Send, Battery, BatteryWarning, BrainCircuit, Download, Cpu, XCircle, Activity, ExternalLink, ArrowLeft, Play, RefreshCw, AlertTriangle, Zap, FlaskConical } from 'lucide-react'
import { modelService } from './features/slm/services/ModelService'
import LandingPage from './LandingPage'
import AIResources from './AIResources'
import WorksheetGenerator from './WorksheetGenerator'
import ChatInterface from './features/slm/components/ChatInterface'
import KeystrokeAnalytics from './components/KeystrokeAnalytics'
import { useKeystrokeTracker } from './hooks/useKeystrokeTracker'


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getStudentId = () => {
    let id = localStorage.getItem('mait_student_id');
    if (!id) {
        id = `student_${crypto.randomUUID()}`;
        localStorage.setItem('mait_student_id', id);
    }
    return id;
};

// page: 'landing' | 'resources' | 'worksheets' | 'app' | 'demo'
function App() {
    const [page, setPage] = useState('landing')
    const [showLocalChat, setShowLocalChat] = useState(false)

    const [studentId] = useState(getStudentId);

    const [context, setContext] = useState(null)
    const [messages, setMessages] = useState([
        { role: 'bot', text: "G'day! I'm ready to crunch some NSW Maths. What's on your mind?" }
    ])

    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [modelLoading, setModelLoading] = useState("Initializing...")
    const [isModelReady, setIsModelReady] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(null)
    const [showOverlay, setShowOverlay] = useState(false)
    const [messageQueue, setMessageQueue] = useState([])
    const [userProfile, setUserProfile] = useState({ nickname: 'Mate', subject: 'Mathematics Advanced' })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [showKeystrokePanel, setShowKeystrokePanel] = useState(false)
    const endOfMsgRef = useRef(null)

    // New state for polished demo experience
    const [demoModelSize, setDemoModelSize] = useState('small') // 'small' | 'large'
    const [downloadError, setDownloadError] = useState(null) // error message string or null
    const [webGPUError, setWebGPUError] = useState(null) // WebGPU not available error
    const [showModelSwitchConfirm, setShowModelSwitchConfirm] = useState(null) // 'small' | 'large' | null
    const [loadedModelName, setLoadedModelName] = useState(null) // actual model name once loaded

    const isDemoMode = page === 'demo'

    // Keystroke psychometric tracking (wired to backend in full mode, local-only in demo)
    const {
        metrics: keystrokeMetrics,
        historicalMetrics,
        behaviorAnalysis,
        attachToInput: keystrokeAttachToInput,
        recordMessage: keystrokeRecordMessage,
    } = useKeystrokeTracker({
        studentId,
        isDemoMode,
    });

    const fetchContext = async () => {
        if (isDemoMode) {
            setContext({ fatigue_metric: { current_score: 0, status: 'FRESH' } });
            return;
        }
        try {
            const res = await fetch(`${API_URL}/context/${studentId}`);
            if (!res.ok) throw new Error("Backend unreachable");
            const data = await res.json();
            setContext(data);
        } catch (e) {
            console.error("Sync error", e);
            setContext({ fatigue_metric: { current_score: 0, status: 'FRESH' } });
        }
    }

    const startLocalBrain = (modelSize = null) => {
        // Determine which model size to use
        const effectiveModelSize = modelSize || (isDemoMode ? demoModelSize : 'large');

        // If already ready with same model, skip
        if (isModelReady && modelService.getModelInfo().size === effectiveModelSize) return;
        // If currently downloading (no error), skip
        if (downloadProgress && !downloadError) return;

        // Check WebGPU availability first
        const gpuCheck = modelService.constructor.checkWebGPU();
        if (!gpuCheck.available) {
            setWebGPUError(gpuCheck.reason);
            setShowOverlay(true);
            return;
        }

        // Clear any previous errors
        setDownloadError(null);
        setWebGPUError(null);
        setIsModelReady(false);

        const modelInfo = modelService.constructor.getAvailableModels()[effectiveModelSize];
        const estimatedMB = modelInfo?.estimatedSizeMB || 200;

        setModelLoading("Mate is waking up...");
        setDownloadProgress({
            text: `Starting download (~${estimatedMB} MB)...`,
            progress: 0,
            estimatedMB,
            speedMBps: null,
            fetchedMB: null,
        });
        setShowOverlay(true);

        modelService.initialize((report) => {
            setDownloadProgress({
                text: report.text,
                progress: report.progress || null,
                estimatedMB: report.estimatedMB || estimatedMB,
                speedMBps: report.speedMBps || null,
                fetchedMB: report.fetchedMB || null,
            });
            setModelLoading(report.text);
        }, effectiveModelSize).then((modelName) => {
            setModelLoading(null);
            setLoadedModelName(modelName);
            setDownloadProgress({ text: "Ready!", progress: 100, estimatedMB, speedMBps: null, fetchedMB: estimatedMB });
            setTimeout(() => {
                setDownloadProgress(null);
                setShowOverlay(false);
            }, 2000);
            setIsModelReady(true);
            setDownloadError(null);
        }).catch(err => {
            console.error("Local Brain Init Error", err);
            setModelLoading("Local connection failed.");
            const errMsg = err.message || "Download failed. Please check your connection and try again.";
            setDownloadError(errMsg);
            setDownloadProgress({ text: errMsg, progress: null, estimatedMB, speedMBps: null, fetchedMB: null });
        });
    };

    const retryDownload = () => {
        setDownloadError(null);
        setDownloadProgress(null);
        setShowOverlay(false);
        // Small delay to let state reset before retrying
        setTimeout(() => {
            startLocalBrain(isDemoMode ? demoModelSize : 'large');
        }, 100);
    };

    const handleModelSizeSwitch = (newSize) => {
        if (newSize === demoModelSize) return;
        // If model is already loaded or downloading, warn user
        if (isModelReady || (downloadProgress && !downloadError)) {
            setShowModelSwitchConfirm(newSize);
        } else {
            setDemoModelSize(newSize);
            // If there was a previous error, clear it and start fresh with new size
            if (downloadError) {
                setDownloadError(null);
                setDownloadProgress(null);
                setTimeout(() => startLocalBrain(newSize), 100);
            }
        }
    };

    const confirmModelSwitch = async () => {
        const newSize = showModelSwitchConfirm;
        setShowModelSwitchConfirm(null);
        setDemoModelSize(newSize);
        setIsModelReady(false);
        setDownloadProgress(null);
        setDownloadError(null);
        setLoadedModelName(null);
        await modelService.reset();
        // Start download with the new model
        setTimeout(() => startLocalBrain(newSize), 100);
    };

    useEffect(() => {
        if (page === 'app' || page === 'demo') fetchContext();
    }, [page, studentId])

    // Auto-scroll logic
    const isNearBottom = useRef(true);
    const chatContainerRef = useRef(null);

    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            isNearBottom.current = scrollHeight - scrollTop - clientHeight < 150;
        }
    };

    useEffect(() => {
        if (isNearBottom.current) {
            endOfMsgRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (isModelReady && messageQueue.length > 0 && !loading) {
            const nextMsg = messageQueue[0];
            setMessageQueue(prev => prev.slice(1));
            processUserMessage(nextMsg);
        }
    }, [isModelReady, messageQueue, loading]);

    // Auto-start local brain when entering demo mode
    useEffect(() => {
        if (isDemoMode && !isModelReady && !downloadProgress) {
            startLocalBrain(demoModelSize);
        }
    }, [isDemoMode]);

    const processUserMessage = async (userText) => {
        if (!isModelReady && downloadProgress) {
            setMessages(prev => [...prev, { role: 'user', text: userText, source: 'queued' }]);
            setMessageQueue(prev => [...prev, userText]);
            return;
        }

        if (!isModelReady) {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: isDemoMode
                    ? "Local model is loading... hang tight! It'll be ready in a moment."
                    : "Local Brain is not active. Click 'LOCAL CORE' to start.",
                source: 'local'
            }]);
            return;
        }

        setLoading(true);
        const needsAPI = !isDemoMode && shouldQueryAPI(userText);

        const splitIntoChunks = (text) => {
            const isInsideLatex = (str) => {
                const dollarCount = (str.match(/(?<!\\)\$/g) || []).length;
                return dollarCount % 2 !== 0;
            };

            let rawChunks = text.split(/\n\n+/).filter(c => c.trim());
            const finalChunks = [];
            let currentBuilder = "";

            rawChunks.forEach(chunk => {
                if (currentBuilder) {
                    currentBuilder += "\n\n" + chunk;
                    if (!isInsideLatex(currentBuilder)) {
                        finalChunks.push(currentBuilder);
                        currentBuilder = "";
                    }
                    return;
                }
                if (isInsideLatex(chunk)) { currentBuilder = chunk; return; }
                if (chunk.includes('$$')) { finalChunks.push(chunk.trim()); return; }

                const sentences = chunk.split(/(?<=[.!?])\s+(?=[A-Z])/);
                let currentSubChunk = '';

                sentences.forEach((sentence) => {
                    if (isInsideLatex(sentence) || isInsideLatex(currentSubChunk + (currentSubChunk ? ' ' : '') + sentence)) {
                        currentSubChunk += (currentSubChunk ? ' ' : '') + sentence;
                        return;
                    }
                    if (currentSubChunk && (currentSubChunk.split(/[.!?]/).length > 2 || currentSubChunk.length > 150)) {
                        finalChunks.push(currentSubChunk.trim());
                        currentSubChunk = sentence;
                    } else {
                        currentSubChunk += (currentSubChunk ? ' ' : '') + sentence;
                    }
                });
                if (currentSubChunk.trim()) finalChunks.push(currentSubChunk.trim());
            });

            if (currentBuilder) finalChunks.push(currentBuilder);
            return finalChunks.filter(c => c.trim());
        };

        try {
            setMessages(prev => [...prev, { role: 'bot', text: 'typing', source: 'typing' }]);

            let fullResponse = "";

            const dynamicPrompt = `You are "Mate" - a friendly Australian AI tutor for NSW HSC Mathematics.

USER DETAILS:
- Name: ${userProfile.nickname}
- Subject: ${userProfile.subject}

PERSONALITY:
- Warm, encouraging, approachable. Use Australian expressions: "No worries", "G'day", "Legend!", "Too easy".
- Be patient and supportive, never condescending.
- Address the user by name occasionally.

**OUTPUT FORMAT (CRITICAL):**
- Keep each response to **1-2 sentences MAX**
- Use **bold** for key terms and emphasis
- Put ALL formulas on their own line, wrapped in $$ like: $$f(x) = x^2$$
- Separate distinct thoughts with double newlines
- Never output long paragraphs - break everything into bite-sized chunks

CONVERSATION RULES:
1. GREETINGS: Respond naturally and briefly
2. MATH PROBLEMS: Use GUESS FIRST - ask student to try before helping
3. CONCEPTS: Explain in short chunks, one idea at a time

**ANTI-HALLUCINATION:**
- Never confidently state answers unless certain
- Say "double-check that yourself" for calculations
- Guide students to work it out rather than giving answers

**MATH FORMATTING:**
- Use $$ for block formulas (standalone lines)
- ALWAYS use \\frac{a}{b} for fractions, never a/b. This gives the big vinculum.
- Example: First Principles uses: $$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}$$

Use LaTeX: $$block formulas$$ and $inline math$`;

            await modelService.streamChat(
                messages.concat({ role: 'user', text: userText }).map(m => ({
                    role: m.role === 'bot' ? 'assistant' : 'user',
                    content: m.text
                })),
                (chunk) => {
                    fullResponse = chunk;
                    setMessages(prev => {
                        const newHistory = [...prev];
                        const lastIdx = newHistory.length - 1;
                        if (lastIdx >= 0 && newHistory[lastIdx].source === 'typing') {
                            newHistory[lastIdx] = { ...newHistory[lastIdx], text: 'typing', source: 'typing' };
                        }
                        return newHistory;
                    });
                },
                dynamicPrompt
            );

            setMessages(prev => prev.filter(m => m.source !== 'typing'));

            if (fullResponse) {
                const chunks = splitIntoChunks(fullResponse);
                chunks.forEach((chunk, i) => {
                    setTimeout(() => {
                        setMessages(prev => [...prev, { role: 'bot', text: chunk, source: 'local' }]);
                    }, i * 100);
                });
            }

            // Only query cloud API in full mode, never in demo
            if (needsAPI) {
                try {
                    setMessages(prev => [...prev, { role: 'bot', text: "Fetching detailed info from the cloud...", source: 'loading' }]);

                    const apiResponse = await fetch(`${API_URL}/query`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ student_id: studentId, query: userText, complexity: 5 })
                    });

                    if (apiResponse.ok) {
                        const data = await apiResponse.json();
                        setMessages(prev => prev.filter(m => m.source !== 'loading'));
                        if (data.sections && data.sections.length > 0) {
                            data.sections.forEach((section, i) => {
                                setMessages(prev => [...prev, { role: 'bot', text: section, source: 'api', sectionIndex: i }]);
                            });
                        }
                        if (data.context) setContext(data.context);
                    } else {
                        setMessages(prev => prev.filter(m => m.source !== 'loading'));
                    }
                } catch (apiErr) {
                    console.warn("API query failed:", apiErr);
                    setMessages(prev => prev.filter(m => m.source !== 'loading'));
                }
            }

            setLoading(false);
        } catch (err) {
            console.warn("Chat error", err);
            setMessages(prev => [...prev, { role: 'bot', text: "Something went wrong. Try again?", source: 'error' }]);
            setLoading(false);
        }
    };

    const handleStudy = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        // Record keystroke metrics for this message and submit to backend
        keystrokeRecordMessage();
        processUserMessage(userText);
    };

    const shouldQueryAPI = (text) => {
        const complexKeywords = ['explain', 'prove', 'derive', 'why', 'how does', 'step by step'];
        return complexKeywords.some(kw => text.toLowerCase().includes(kw));
    };

    const getFatigueColor = () => {
        const score = context?.fatigue_metric?.current_score || 0;
        if (score > 80) return "text-destructive border-destructive/50";
        if (score > 50) return "text-accent border-accent/50";
        return "text-primary border-primary/30";
    }

    const getFatigueLevel = () => {
        const score = context?.fatigue_metric?.current_score || 0;
        if (score > 80) return "HIGH";
        if (score > 50) return "MED";
        return "LOW";
    }

    // Page routing
    if (page === 'landing') {
        return (
            <LandingPage
                onLogin={() => setPage('app')}
                onDemo={() => setPage('demo')}
                onResources={() => setPage('resources')}
                onWorksheets={() => setPage('worksheets')}
            />
        )
    }

    if (page === 'resources') {
        return <AIResources onBack={() => setPage('landing')} />
    }

    if (page === 'worksheets') {
        return <WorksheetGenerator onBack={() => setPage('landing')} />
    }

    if (showLocalChat) {
        return (
            <div className="relative z-50 min-h-screen bg-cosmic noise-overlay">
                <button
                    onClick={() => setShowLocalChat(false)}
                    className="fixed top-4 right-4 z-[60] p-2.5 glass-card text-muted-foreground hover:text-foreground rounded-xl transition-all hover:border-primary/30"
                >
                    <XCircle size={22} />
                </button>
                <ChatInterface />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-cosmic noise-overlay selection:bg-primary/30">
            {/* Decorative grid overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.015]"
                style={{
                    backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                    backgroundSize: '80px 80px'
                }}
            />

            {/* HUD HEADER */}
            <header className="fixed top-0 left-0 right-0 glass-card backdrop-blur-xl border-b border-surface-2 p-4 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                    {/* Back button */}
                    <button
                        onClick={() => setPage('landing')}
                        className="text-muted-foreground hover:text-foreground transition-colors mr-1"
                        title="Back to home"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div className="relative">
                        <BrainCircuit className="text-primary" size={22} />
                        {isModelReady && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                    </div>
                    <h1 className="font-display font-bold tracking-tight text-sm">
                        MAIT
                        {isDemoMode && <span className="text-accent font-normal ml-1.5">DEMO</span>}
                        {!isDemoMode && <span className="text-muted-foreground font-normal ml-1.5">MVP</span>}
                    </h1>
                </div>

                {/* MIDDLE: Clock, Profile, mentalmaths.au link */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="text-muted-foreground font-mono text-xs">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

                    <a
                        href="https://mentalmaths.au"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-display text-primary hover:text-accent transition-colors flex items-center gap-1"
                    >
                        mentalmaths.au
                        <ExternalLink size={10} />
                    </a>

                    <div className="flex items-center gap-2 bg-surface-1 rounded-lg p-1.5 border border-surface-3">
                        <input
                            className="bg-transparent border-none text-xs font-display font-medium text-foreground w-20 text-center focus:outline-none placeholder:text-muted-foreground"
                            value={userProfile.nickname}
                            onChange={(e) => setUserProfile({ ...userProfile, nickname: e.target.value })}
                            placeholder="Name"
                        />
                        <div className="w-px h-4 bg-surface-3"></div>
                        <select
                            className="bg-transparent border-none text-[10px] text-muted-foreground focus:outline-none focus:text-foreground cursor-pointer uppercase font-display tracking-wide"
                            value={userProfile.subject}
                            onChange={(e) => setUserProfile({ ...userProfile, subject: e.target.value })}
                        >
                            <option value="Mathematics Advanced">Maths Adv</option>
                            <option value="Extension 1">Ext 1</option>
                            <option value="Extension 2">Ext 2</option>
                            <option value="Standard 2">Standard 2</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Keystroke Analytics Toggle */}
                    <button
                        onClick={() => setShowKeystrokePanel(!showKeystrokePanel)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs font-display tracking-wide border ${showKeystrokePanel
                            ? 'bg-secondary/20 border-secondary/50 text-secondary'
                            : 'bg-surface-1 border-surface-3 hover:border-secondary/30 text-muted-foreground hover:text-secondary'
                            }`}
                    >
                        <Activity size={14} />
                        <span className="hidden sm:inline">METRICS</span>
                    </button>

                    {/* Local SLM Toggle - only in full mode (demo auto-starts it) */}
                    {!isDemoMode && (
                        <button
                            onClick={() => { setShowLocalChat(true); startLocalBrain('large'); }}
                            className="flex items-center gap-2 px-3 py-2 bg-surface-1 border border-surface-3 hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-xs font-display tracking-wide"
                        >
                            <Cpu size={14} />
                            <span className="hidden sm:inline">LOCAL CORE</span>
                        </button>
                    )}

                    {/* Download Progress - Enhanced */}
                    {downloadProgress && !webGPUError && (
                        <div className="flex flex-col gap-1.5 glass-card px-4 py-2.5 rounded-xl border-primary/20 min-w-[220px]">
                            <div className="flex items-center gap-2">
                                {downloadError ? (
                                    <AlertTriangle size={14} className="text-destructive" />
                                ) : downloadProgress.progress === 100 ? (
                                    <BrainCircuit size={14} className="text-primary" />
                                ) : (
                                    <Download size={14} className="text-primary animate-bounce" />
                                )}
                                <span className="text-[10px] font-display uppercase tracking-wider"
                                    style={{ color: downloadError ? 'hsl(var(--destructive))' : 'hsl(var(--primary))' }}>
                                    {downloadError
                                        ? 'Failed'
                                        : downloadProgress.progress === 100
                                            ? 'Ready!'
                                            : downloadProgress.progress !== null
                                                ? 'Downloading'
                                                : 'Initializing'}
                                </span>
                                {/* Download size estimate */}
                                {!downloadError && downloadProgress.progress !== 100 && downloadProgress.estimatedMB && (
                                    <span className="text-[9px] text-muted-foreground font-mono ml-auto">
                                        ~{downloadProgress.estimatedMB >= 1000
                                            ? `${(downloadProgress.estimatedMB / 1000).toFixed(1)} GB`
                                            : `${downloadProgress.estimatedMB} MB`}
                                    </span>
                                )}
                            </div>
                            {/* Progress bar */}
                            {downloadProgress.progress !== null && !downloadError && (
                                <div className="w-full bg-surface-1 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-300 ease-out ${
                                            downloadProgress.progress === 100
                                                ? 'bg-gradient-to-r from-primary to-accent'
                                                : 'bg-gradient-to-r from-primary to-secondary'
                                        }`}
                                        style={{ width: `${Math.min(downloadProgress.progress, 100)}%` }}
                                    />
                                </div>
                            )}
                            {/* Status text */}
                            <div className="flex items-center justify-between">
                                <span className="text-[9px] text-muted-foreground font-mono truncate max-w-[160px]">
                                    {downloadError
                                        ? (downloadError.length > 50 ? downloadError.substring(0, 50) + '...' : downloadError)
                                        : downloadProgress.text}
                                </span>
                                {/* Download speed */}
                                {!downloadError && downloadProgress.speedMBps && downloadProgress.progress !== null && downloadProgress.progress !== 100 && (
                                    <span className="text-[9px] text-primary/70 font-mono ml-2 whitespace-nowrap">
                                        {downloadProgress.speedMBps >= 1
                                            ? `${downloadProgress.speedMBps.toFixed(1)} MB/s`
                                            : `${(downloadProgress.speedMBps * 1024).toFixed(0)} KB/s`}
                                    </span>
                                )}
                            </div>
                            {/* Retry button on error */}
                            {downloadError && (
                                <button
                                    onClick={retryDownload}
                                    className="flex items-center justify-center gap-1.5 mt-1 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-display uppercase tracking-wider hover:bg-primary/20 transition-all"
                                >
                                    <RefreshCw size={10} />
                                    Retry Download
                                </button>
                            )}
                        </div>
                    )}

                    {/* WELLNESS GAUGE */}
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border glass-card ${getFatigueColor()}`}>
                        {context?.fatigue_metric?.status === 'LOCKOUT' ? <BatteryWarning size={16} /> : <Battery size={16} />}
                        <span className="text-xs font-mono font-bold">
                            {getFatigueLevel()}
                        </span>
                    </div>
                </div>
            </header>

            {/* WebGPU Error Overlay */}
            {webGPUError && showOverlay && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-card border border-destructive/30 rounded-2xl p-8 max-w-md w-full text-center space-y-4">
                        <AlertTriangle className="mx-auto text-destructive" size={48} />
                        <h2 className="text-lg font-display font-bold text-foreground">WebGPU Not Available</h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            {webGPUError}
                        </p>
                        <div className="bg-surface-1 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
                            <p className="font-semibold text-foreground">Supported browsers:</p>
                            <p>Google Chrome 113+ (recommended)</p>
                            <p>Microsoft Edge 113+</p>
                            <p>Chrome on Android 113+</p>
                        </div>
                        <button
                            onClick={() => { setWebGPUError(null); setShowOverlay(false); setPage('landing'); }}
                            className="btn-primary px-6 py-2.5 rounded-xl text-sm font-display"
                        >
                            Back to Home
                        </button>
                    </div>
                </div>
            )}

            {/* Model Switch Confirmation Dialog */}
            {showModelSwitchConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="glass-card border border-accent/30 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
                        <AlertTriangle className="mx-auto text-accent" size={36} />
                        <h3 className="text-sm font-display font-bold text-foreground">Switch Model?</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            Switching to{' '}
                            <span className="text-foreground font-medium">
                                {showModelSwitchConfirm === 'small' ? 'Fast (SmolLM 360M)' : 'Quality (Llama 3.2 3B)'}
                            </span>
                            {' '}requires downloading a new model
                            (~{showModelSwitchConfirm === 'small' ? '200' : '1,500'} MB).
                            The current model will be unloaded.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => setShowModelSwitchConfirm(null)}
                                className="px-4 py-2 rounded-lg text-xs font-display bg-surface-1 border border-surface-3 text-muted-foreground hover:text-foreground transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmModelSwitch}
                                className="btn-primary px-4 py-2 rounded-lg text-xs font-display"
                            >
                                Switch Model
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Demo mode banner with model quality toggle */}
            {isDemoMode && (
                <div className="fixed top-[73px] left-0 right-0 z-40 bg-accent/10 border-b border-accent/20 px-4 py-2">
                    <div className="max-w-2xl mx-auto flex items-center justify-between">
                        <p className="text-xs font-display text-accent flex items-center flex-wrap gap-x-1">
                            <Play size={12} className="inline mr-0.5" />
                            <span>Free Demo — Running locally in your browser. No data sent to any server.</span>
                            {loadedModelName && isModelReady && (
                                <span className="text-muted-foreground">
                                    Model: {loadedModelName}
                                </span>
                            )}
                        </p>
                        {/* Model quality toggle */}
                        <div className="flex items-center gap-1 ml-3 shrink-0">
                            <button
                                onClick={() => handleModelSizeSwitch('small')}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-display uppercase tracking-wider transition-all border ${
                                    demoModelSize === 'small'
                                        ? 'bg-primary/15 border-primary/40 text-primary'
                                        : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:border-surface-3'
                                }`}
                                title="SmolLM 360M - Faster download (~200 MB), quicker responses"
                            >
                                <Zap size={10} />
                                <span className="hidden sm:inline">Fast</span>
                            </button>
                            <button
                                onClick={() => handleModelSizeSwitch('large')}
                                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-display uppercase tracking-wider transition-all border ${
                                    demoModelSize === 'large'
                                        ? 'bg-secondary/15 border-secondary/40 text-secondary'
                                        : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:border-surface-3'
                                }`}
                                title="Llama 3.2 3B - Higher quality (~1.5 GB download)"
                            >
                                <FlaskConical size={10} />
                                <span className="hidden sm:inline">Quality</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CHAT AREA */}
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className={`${isDemoMode ? 'pt-[120px]' : 'pt-24'} pb-32 max-w-2xl mx-auto px-4 min-h-screen`}
            >
                <div className="space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div
                                className={`max-w-[85%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                    ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md shadow-glow-sm'
                                    : 'glass-card text-foreground rounded-bl-md'
                                    }`}
                            >
                                {msg.source === 'typing' ? (
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                ) : (
                                    <ReactMarkdown
                                        remarkPlugins={[remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {msg.text}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}
                    <div ref={endOfMsgRef} />
                </div>
            </div>

            {/* INPUT FOOTER */}
            <footer className="fixed bottom-0 w-full glass-card backdrop-blur-xl border-t border-surface-2 p-4">
                <form onSubmit={handleStudy} className="max-w-2xl mx-auto relative flex gap-3">
                    <input
                        autoFocus
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={context?.fatigue_metric?.status === 'LOCKOUT'}
                        placeholder={
                            !isModelReady && isDemoMode
                                ? "Model is downloading... please wait"
                                : context?.fatigue_metric?.status === 'LOCKOUT'
                                    ? "Rest period active..."
                                    : "Ask about calculus, trigonometry, statistics..."
                        }
                        className="input-base flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                        {...keystrokeAttachToInput()}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || context?.fatigue_metric?.status === 'LOCKOUT' || (!isModelReady && isDemoMode)}
                        className="btn-primary p-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </footer>

            {/* Keystroke Analytics Panel */}
            {showKeystrokePanel && (
                <KeystrokeAnalytics
                    metrics={keystrokeMetrics}
                    historicalMetrics={historicalMetrics}
                    behaviorAnalysis={behaviorAnalysis}
                    onClose={() => setShowKeystrokePanel(false)}
                />
            )}
        </div>
    )
}

export default App
