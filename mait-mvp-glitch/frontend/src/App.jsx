import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Send, Battery, BatteryWarning, BrainCircuit, Download, Cpu, XCircle, Activity } from 'lucide-react'
import { scanForPII } from './utils/privacy'
import { modelService } from './features/slm/services/ModelService'
import LandingPage from './LandingPage'
import ChatInterface from './features/slm/components/ChatInterface'
import Avatar from './components/Avatar'
import { useKeystrokeTracker } from './hooks/useKeystrokeTracker'
import KeystrokeAnalytics from './components/KeystrokeAnalytics'


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Digital Passport Helper
const getStudentId = () => {
    let id = localStorage.getItem('mait_student_id');
    if (!id) {
        id = `student_${crypto.randomUUID()}`;
        localStorage.setItem('mait_student_id', id);
    }
    return id;
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    console.log("App Mounting... Auth State:", isAuthenticated);
    const [showLocalChat, setShowLocalChat] = useState(false)

    const [studentId] = useState(getStudentId);

    const [context, setContext] = useState(null)
    const [messages, setMessages] = useState([
        { role: 'bot', text: "G'day! I'm ready to crunch some NSW Maths Extension 1. What's on your mind?" }
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

    // Keystroke Psychometric Tracking - DISABLED FOR DEBUGGING
    const keystrokeMetrics = { realtimeWPM: 0 };
    const historicalMetrics = {};
    const behaviorAnalysis = {};
    const keystrokeHandlers = { onKeyDown: () => { }, onKeyUp: () => { }, onFocus: () => { }, onBlur: () => { } };
    const recordMessage = () => { };
    const getFullReport = () => { };

    const fetchContext = async () => {
        try {
            const res = await fetch(`${API_URL}/context/${studentId}`);
            if (!res.ok) {
                throw new Error("Backend unreachable");
            }
            const data = await res.json();
            setContext(data);
        } catch (e) {
            console.error("Sync error", e);
            setContext({
                fatigue_metric: { current_score: 0, status: 'FRESH' }
            });
        }
    }

    const startLocalBrain = () => {
        if (isModelReady || downloadProgress) return;

        setModelLoading("Mate is waking up...");
        setDownloadProgress({ text: "Starting download...", progress: 0 });
        setShowOverlay(true);

        modelService.initialize((progress) => {
            console.log(`[Local Brain] ${progress}`);
            const percentMatch = progress.match(/(\d+(?:\.\d+)?)\s*%/);
            let progressNum = null;
            if (percentMatch) {
                progressNum = parseFloat(percentMatch[1]);
            }
            setDownloadProgress({ text: progress, progress: progressNum });
            setModelLoading(progress);
        }).then(() => {
            setModelLoading(null);
            setDownloadProgress({ text: "Local Brain Ready", progress: 100 });
            setTimeout(() => {
                setDownloadProgress(null);
                setShowOverlay(false);
            }, 2000);
            setIsModelReady(true);
        }).catch(err => {
            console.error("Local Brain Init Error", err);
            setModelLoading("Local connection failed.");
            setDownloadProgress({ text: "Download failed", progress: null });
        });
    };

    useEffect(() => { fetchContext(); }, [studentId])

    // Smart auto-scroll: only scroll if user is near the bottom
    const isNearBottom = useRef(true);
    const chatContainerRef = useRef(null);

    const handleScroll = () => {
        if (chatContainerRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
            // Consider "near bottom" if within 150px of the bottom
            isNearBottom.current = scrollHeight - scrollTop - clientHeight < 150;
        }
    };

    useEffect(() => {
        // Only auto-scroll if user was already near the bottom
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

    const processUserMessage = async (userText) => {
        if (!isModelReady && downloadProgress) {
            setMessages(prev => [...prev, {
                role: 'user',
                text: userText,
                source: 'queued'
            }]);
            setMessageQueue(prev => [...prev, userText]);
            return;
        }

        if (!isModelReady) {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "Local Brain is not active. Click 'LOCAL CORE' to start.",
                source: 'local'
            }]);
            return;
        }

        setLoading(true);
        const needsAPI = shouldQueryAPI(userText);

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

                if (isInsideLatex(chunk)) {
                    currentBuilder = chunk;
                    return;
                }

                if (chunk.includes('$$')) {
                    finalChunks.push(chunk.trim());
                    return;
                }

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
                if (currentSubChunk.trim()) {
                    finalChunks.push(currentSubChunk.trim());
                }
            });

            if (currentBuilder) {
                finalChunks.push(currentBuilder);
            }

            return finalChunks.filter(c => c.trim());
        };

        try {
            setMessages(prev => [...prev, {
                role: 'bot',
                text: 'typing',
                source: 'typing'
            }]);

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
                            newHistory[lastIdx] = {
                                ...newHistory[lastIdx],
                                text: 'typing',
                                source: 'typing'
                            };
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
                        setMessages(prev => [...prev, {
                            role: 'bot',
                            text: chunk,
                            source: 'local'
                        }]);
                    }, i * 100);
                });
            }

            if (needsAPI) {
                try {
                    setMessages(prev => [...prev, {
                        role: 'bot',
                        text: "Fetching detailed info from the cloud...",
                        source: 'loading'
                    }]);

                    const apiResponse = await fetch(`${API_URL}/query`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            student_id: studentId,
                            query: userText,
                            complexity: 5
                        })
                    });

                    if (apiResponse.ok) {
                        const data = await apiResponse.json();

                        setMessages(prev => prev.filter(m => m.source !== 'loading'));

                        if (data.sections && data.sections.length > 0) {
                            data.sections.forEach((section, i) => {
                                setMessages(prev => [...prev, {
                                    role: 'bot',
                                    text: section,
                                    source: 'api',
                                    sectionIndex: i
                                }]);
                            });
                        }

                        if (data.context) {
                            setContext(data.context);
                        }
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
            setMessages(prev => [...prev, {
                role: 'bot',
                text: "Something went wrong. Try again?",
                source: 'error'
            }]);
            setLoading(false);
        }
    };

    const handleStudy = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        const userText = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
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

    if (!isAuthenticated) {
        return <LandingPage onLogin={() => setIsAuthenticated(true)} />
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
                    <div className="relative">
                        <BrainCircuit className="text-primary" size={22} />
                        {isModelReady && (
                            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                        )}
                    </div>
                    <h1 className="font-display font-bold tracking-tight text-sm">
                        MAIT <span className="text-muted-foreground font-normal">MVP</span>
                    </h1>
                </div>

                {/* MIDDLE: Clock & User Profile */}
                <div className="hidden md:flex items-center gap-4">
                    <div className="text-muted-foreground font-mono text-xs">
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>

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
                        <span className="hidden sm:inline">
                            {keystrokeMetrics?.realtimeWPM > 0 ? `${keystrokeMetrics?.realtimeWPM} WPM` : 'METRICS'}
                        </span>
                    </button>

                    {/* Local SLM Toggle */}
                    <button
                        onClick={() => {
                            setShowLocalChat(true);
                            startLocalBrain();
                        }}
                        className="flex items-center gap-2 px-3 py-2 bg-surface-1 border border-surface-3 hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-xs font-display tracking-wide"
                    >
                        <Cpu size={14} />
                        <span className="hidden sm:inline">LOCAL CORE</span>
                    </button>

                    {/* Download Progress */}
                    {downloadProgress && (
                        <div className="flex flex-col gap-1.5 glass-card px-4 py-2.5 rounded-xl border-primary/20 min-w-[180px]">
                            <div className="flex items-center gap-2">
                                <Download size={14} className="text-primary animate-bounce" />
                                <span className="text-[10px] text-primary font-display uppercase tracking-wider">
                                    {downloadProgress.progress !== null ? 'Downloading' : 'Initializing'}
                                </span>
                            </div>
                            {downloadProgress.progress !== null && (
                                <div className="w-full bg-surface-1 rounded-full h-1.5 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300 ease-out"
                                        style={{ width: `${Math.min(downloadProgress.progress, 100)}%` }}
                                    />
                                </div>
                            )}
                            <span className="text-[9px] text-muted-foreground font-mono truncate">
                                {downloadProgress.progress !== null
                                    ? `${downloadProgress.progress.toFixed(1)}%`
                                    : downloadProgress.text}
                            </span>
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

            {/* CHAT AREA */}
            <div
                ref={chatContainerRef}
                onScroll={handleScroll}
                className="pt-24 pb-32 max-w-2xl mx-auto px-4 min-h-screen"
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
                        placeholder={context?.fatigue_metric?.status === 'LOCKOUT' ? "Rest period active..." : "Ask about calculus, trigonometry, statistics..."}
                        className="input-base flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading || context?.fatigue_metric?.status === 'LOCKOUT'}
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
