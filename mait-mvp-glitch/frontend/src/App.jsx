import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { Send, Battery, BatteryWarning, BrainCircuit, Download, Cpu, XCircle, Activity, ArrowLeft, Play, RefreshCw, AlertTriangle, Zap, FlaskConical, Timer, TimerOff, Trash2, LogOut, Save, X, ListPlus, Clock } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { modelService } from './features/slm/services/ModelService'
import NavBar from './components/NavBar'
import LandingPage from './LandingPage'
import AIResources from './AIResources'
import WorksheetGenerator from './WorksheetGenerator'
import ChatInterface from './features/slm/components/ChatInterface'
import KeystrokeAnalytics from './components/KeystrokeAnalytics'
import PastPapers from './PastPapers'
import TopicSidebar from './components/TopicSidebar'
import { useKeystrokeTracker } from './hooks/useKeystrokeTracker'

const VALID_PAGES = ['landing', 'resources', 'worksheets', 'pastpapers', 'app', 'demo'];

function getPageFromPath() {
    // Support both clean URLs (/pastpapers) and legacy hash URLs (/#/pastpapers)
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash && VALID_PAGES.includes(hash)) {
        // Migrate hash URL to clean URL
        window.history.replaceState(null, '', hash === 'landing' ? '/' : `/${hash}`);
        return hash;
    }
    const path = window.location.pathname.replace(/^\//, '') || 'landing';
    return VALID_PAGES.includes(path) ? path : 'landing';
}

function navigateTo(page) {
    const url = page === 'landing' ? '/' : `/${page}`;
    window.history.pushState(null, '', url);
    window.dispatchEvent(new Event('popstate'));
}


const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const getStudentId = () => {
    let id = localStorage.getItem('mait_student_id');
    if (!id) {
        id = `student_${crypto.randomUUID()}`;
        localStorage.setItem('mait_student_id', id);
    }
    return id;
};

const getSavedAuthUser = () => {
    try {
        const saved = localStorage.getItem('mait_auth_user');
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
};

// page: 'landing' | 'resources' | 'worksheets' | 'app' | 'demo'
function App() {
    const [page, setPage] = useState(getPageFromPath)
    const [showLocalChat, setShowLocalChat] = useState(false)
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Clean URL routing — browser back/forward support
    useEffect(() => {
        const onNav = () => setPage(getPageFromPath());
        window.addEventListener('popstate', onNav);
        return () => window.removeEventListener('popstate', onNav);
    }, []);

    // Auth state — persisted to localStorage
    const [authUser, setAuthUser] = useState(getSavedAuthUser);
    const [studentId, setStudentId] = useState(() => {
        const saved = getSavedAuthUser();
        return saved?.student_id || getStudentId();
    });
    const [authLoading, setAuthLoading] = useState(false);

    const [context, setContext] = useState(null)
    const [messages, setMessages] = useState([
        { role: 'bot', text: "G'day, Mate! I'm ready to crunch some Mathematics Advanced. What's on your mind?", isGreeting: true }
    ])

    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const [modelLoading, setModelLoading] = useState("Initializing...")
    const [isModelReady, setIsModelReady] = useState(false)
    const [downloadProgress, setDownloadProgress] = useState(null)
    const [showOverlay, setShowOverlay] = useState(false)
    const [messageQueue, setMessageQueue] = useState([])
    const [userProfile, setUserProfile] = useState(() => {
        const saved = getSavedAuthUser();
        return { nickname: saved?.name?.split(' ')[0] || 'Mate', subject: 'Mathematics Advanced' };
    })
    const [currentTime, setCurrentTime] = useState(new Date())
    const [showKeystrokePanel, setShowKeystrokePanel] = useState(false)
    const [studyTimerRunning, setStudyTimerRunning] = useState(false)
    const [studyTimerSeconds, setStudyTimerSeconds] = useState(0)
    const endOfMsgRef = useRef(null)

    // New state for polished demo experience
    const [demoModelSize, setDemoModelSize] = useState('small') // 'small' | 'large'
    const [downloadError, setDownloadError] = useState(null) // error message string or null
    const [webGPUError, setWebGPUError] = useState(null) // WebGPU not available error
    const [showModelSwitchConfirm, setShowModelSwitchConfirm] = useState(null) // 'small' | 'large' | null
    const [loadedModelName, setLoadedModelName] = useState(null) // actual model name once loaded
    const [showAutoSavePrompt, setShowAutoSavePrompt] = useState(false)
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => localStorage.getItem('mait_autosave') === 'true')
    const autoSavePromptShown = useRef(false)
    const [pendingQueue, setPendingQueue] = useState([])
    const [showQueueConfirm, setShowQueueConfirm] = useState(null) // string (pending text) or null

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

    // Update initial greeting when nickname or subject changes
    useEffect(() => {
        setMessages(prev => {
            if (prev.length > 0 && prev[0].isGreeting) {
                const name = userProfile.nickname || 'Mate';
                const subject = userProfile.subject || 'NSW Maths';
                return [{ ...prev[0], text: `G'day, ${name}! I'm ready to crunch some ${subject}. What's on your mind?` }, ...prev.slice(1)];
            }
            return prev;
        });
    }, [userProfile.nickname, userProfile.subject]);

    // Lock body scroll on chat pages to prevent double scrollbar
    useEffect(() => {
        if (page === 'app' || page === 'demo') {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [page]);

    const fetchHistory = async () => {
        if (isDemoMode) return;
        try {
            const res = await fetch(`${API_URL}/history/${studentId}?limit=50`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.messages && data.messages.length > 0) {
                const historyMessages = data.messages.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'bot',
                    text: msg.content,
                    source: 'history',
                    timestamp: msg.timestamp
                }));
                setMessages([
                    { role: 'bot', text: "G'day, Mate! I'm ready to crunch some Mathematics Advanced. What's on your mind?", isGreeting: true },
                    ...historyMessages
                ]);
            }
        } catch (e) {
            console.warn("Failed to load history:", e);
        }
    };

    const handleClearHistory = async () => {
        try {
            await fetch(`${API_URL}/reset/${studentId}`, { method: 'POST' });
            setMessages([
                { role: 'bot', text: "G'day, Mate! I'm ready to crunch some Mathematics Advanced. What's on your mind?", isGreeting: true }
            ]);
            fetchContext();
        } catch (e) {
            console.warn("Failed to clear history:", e);
        }
    };

    const downloadChat = () => {
        const chatMessages = messages.filter(m => !m.isGreeting);
        if (chatMessages.length === 0) return;
        const timestamp = new Date().toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        const filename = `MAIT_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
        let content = `MAIT — AI Maths Tutor Chat Export\n`;
        content += `Date: ${timestamp}\n`;
        content += `Student: ${userProfile.nickname}\n`;
        content += `Subject: ${userProfile.subject}\n`;
        content += `${'─'.repeat(50)}\n\n`;
        messages.forEach(msg => {
            const label = msg.role === 'user' ? `🧑 ${userProfile.nickname}` : '🤖 MAIT';
            content += `${label}:\n${msg.text}\n\n`;
        });
        content += `${'─'.repeat(50)}\nExported from MAIT — myaitutor.com\n`;
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleAutoSaveToggle = (enabled) => {
        setAutoSaveEnabled(enabled);
        localStorage.setItem('mait_autosave', enabled ? 'true' : 'false');
        setShowAutoSavePrompt(false);
    };

    // Auto-save prompt: show once per session after 3+ user messages
    useEffect(() => {
        if (autoSavePromptShown.current || autoSaveEnabled) return;
        const userMsgCount = messages.filter(m => m.role === 'user').length;
        if (userMsgCount >= 3 && !localStorage.getItem('mait_autosave_dismissed')) {
            setShowAutoSavePrompt(true);
            autoSavePromptShown.current = true;
        }
    }, [messages, autoSaveEnabled]);

    // Auto-save: download chat when leaving page or closing tab
    useEffect(() => {
        if (!autoSaveEnabled) return;
        const handleBeforeUnload = () => {
            const chatMessages = messages.filter(m => !m.isGreeting);
            if (chatMessages.length < 2) return;
            const timestamp = new Date().toLocaleString('en-AU', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const filename = `MAIT_Chat_${new Date().toISOString().slice(0, 10)}.txt`;
            let content = `MAIT — AI Maths Tutor Chat Export\n`;
            content += `Date: ${timestamp}\n`;
            content += `Student: ${userProfile.nickname}\n`;
            content += `Subject: ${userProfile.subject}\n`;
            content += `${'─'.repeat(50)}\n\n`;
            messages.forEach(msg => {
                const label = msg.role === 'user' ? `🧑 ${userProfile.nickname}` : '🤖 MAIT';
                content += `${label}:\n${msg.text}\n\n`;
            });
            content += `${'─'.repeat(50)}\nExported from MAIT — myaitutor.com\n`;
            // Use localStorage as a fallback since downloads don't work in beforeunload
            localStorage.setItem('mait_autosave_chat', content);
            localStorage.setItem('mait_autosave_filename', filename);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [autoSaveEnabled, messages, userProfile]);

    // On mount, check if there's an auto-saved chat from a previous session and offer download
    useEffect(() => {
        const savedChat = localStorage.getItem('mait_autosave_chat');
        const savedFilename = localStorage.getItem('mait_autosave_filename');
        if (savedChat && savedFilename) {
            const blob = new Blob([savedChat], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = savedFilename;
            a.click();
            URL.revokeObjectURL(url);
            localStorage.removeItem('mait_autosave_chat');
            localStorage.removeItem('mait_autosave_filename');
        }
    }, []);

    useEffect(() => {
        if (page === 'app' || page === 'demo') {
            fetchContext();
            fetchHistory();
        }
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

    // Study timer
    useEffect(() => {
        if (!studyTimerRunning) return;
        const id = setInterval(() => setStudyTimerSeconds(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [studyTimerRunning]);

    const formatStudyTimer = (totalSec) => {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        const pad = (n) => String(n).padStart(2, '0');
        return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
    };

    useEffect(() => {
        if (isModelReady && messageQueue.length > 0 && !loading) {
            const nextMsg = messageQueue[0];
            setMessageQueue(prev => prev.slice(1));
            processUserMessage(nextMsg);
        }
    }, [isModelReady, messageQueue, loading]);

    // Process pending queue when response finishes
    useEffect(() => {
        if (!loading && pendingQueue.length > 0) {
            const nextMsg = pendingQueue[0];
            setPendingQueue(prev => prev.slice(1));
            // Remove the queued badge from this message
            setMessages(prev => prev.map(m =>
                m.source === 'queued' && m.text === nextMsg
                    ? { ...m, source: undefined }
                    : m
            ));
            processUserMessage(nextMsg);
        }
    }, [loading, pendingQueue]);

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
        if (loading) {
            setShowQueueConfirm(userText);
            return;
        }
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userText }]);
        keystrokeRecordMessage();
        processUserMessage(userText);
    };

    const confirmQueueMessage = () => {
        if (!showQueueConfirm) return;
        const text = showQueueConfirm;
        setInput('');
        setShowQueueConfirm(null);
        setPendingQueue(prev => [...prev, text]);
        setMessages(prev => [...prev, { role: 'user', text, source: 'queued' }]);
    };

    const cancelQueueMessage = () => {
        setShowQueueConfirm(null);
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

    // Local Core full-screen view — bypasses NavBar
    if (showLocalChat) {
        return (
            <div className="relative z-50 min-h-screen bg-cosmic noise-overlay">
                <ChatInterface onBack={() => setShowLocalChat(false)} />
            </div>
        );
    }

    // Login modal handler
    const handleLoginClick = () => {
        if (page === 'app') return; // already logged in
        setShowLoginModal(true);
    };

    // Access code login (legacy fallback)
    const handleLoginSubmit = (code) => {
        if (code === 'HSCMATE2026') {
            setShowLoginModal(false);
            navigateTo('app');
            return true;
        }
        return false;
    };

    // Google login handler
    const handleGoogleSuccess = async (credentialResponse) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential }),
            });
            if (!res.ok) throw new Error('Auth failed');
            const data = await res.json();

            const user = {
                student_id: data.student_id,
                name: data.user.name,
                email: data.user.email,
                picture: data.user.picture,
            };

            // If this is a new Google user and we had anonymous data, migrate it
            const oldId = localStorage.getItem('mait_student_id');
            if (data.status === 'new' && oldId && oldId !== data.student_id) {
                try {
                    await fetch(`${API_URL}/auth/migrate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ old_student_id: oldId, new_student_id: data.student_id }),
                    });
                } catch (e) {
                    console.warn('Migration failed (non-fatal):', e);
                }
            }

            // Persist auth state
            localStorage.setItem('mait_auth_user', JSON.stringify(user));
            localStorage.setItem('mait_student_id', data.student_id);
            setAuthUser(user);
            setStudentId(data.student_id);
            setShowLoginModal(false);
            navigateTo('app');
        } catch (e) {
            console.error('Google login error:', e);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('mait_auth_user');
        // Generate a new anonymous ID
        const newId = `student_${crypto.randomUUID()}`;
        localStorage.setItem('mait_student_id', newId);
        setAuthUser(null);
        setStudentId(newId);
        setMessages([
            { role: 'bot', text: "G'day, Mate! I'm ready to crunch some Mathematics Advanced. What's on your mind?", isGreeting: true }
        ]);
        navigateTo('landing');
    };

    // Non-chat pages: NavBar + page content
    if (page === 'landing') {
        return (
            <>
                <NavBar currentPage={page} navigate={navigateTo} onLoginClick={handleLoginClick} authUser={authUser} onLogout={handleLogout} />
                <div className="pt-14">
                    <LandingPage navigate={navigateTo} onLoginClick={handleLoginClick} />
                </div>
                <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} onSubmit={handleLoginSubmit} onDemo={() => { setShowLoginModal(false); navigateTo('demo'); }} onGoogleSuccess={handleGoogleSuccess} authLoading={authLoading} />
            </>
        )
    }

    if (page === 'resources') {
        return (
            <>
                <NavBar currentPage={page} navigate={navigateTo} onLoginClick={handleLoginClick} authUser={authUser} onLogout={handleLogout} />
                <div className="pt-14">
                    <AIResources />
                </div>
                <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} onSubmit={handleLoginSubmit} onDemo={() => { setShowLoginModal(false); navigateTo('demo'); }} onGoogleSuccess={handleGoogleSuccess} authLoading={authLoading} />
            </>
        )
    }

    if (page === 'worksheets') {
        return (
            <>
                <NavBar currentPage={page} navigate={navigateTo} onLoginClick={handleLoginClick} authUser={authUser} onLogout={handleLogout} />
                <div className="pt-14">
                    <WorksheetGenerator />
                </div>
                <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} onSubmit={handleLoginSubmit} onDemo={() => { setShowLoginModal(false); navigateTo('demo'); }} onGoogleSuccess={handleGoogleSuccess} authLoading={authLoading} />
            </>
        )
    }

    if (page === 'pastpapers') {
        return (
            <>
                <NavBar currentPage={page} navigate={navigateTo} onLoginClick={handleLoginClick} authUser={authUser} onLogout={handleLogout} />
                <PastPapers />
                <LoginModal show={showLoginModal} onClose={() => setShowLoginModal(false)} onSubmit={handleLoginSubmit} onDemo={() => { setShowLoginModal(false); navigateTo('demo'); }} onGoogleSuccess={handleGoogleSuccess} authLoading={authLoading} />
            </>
        )
    }

    // Chat pages (app / demo) — NavBar + HUD toolbar + chat
    return (
        <>
            <NavBar currentPage={page} navigate={navigateTo} onLoginClick={handleLoginClick} authUser={authUser} onLogout={handleLogout} />
            <div className="h-screen pt-14 flex flex-col overflow-hidden bg-cosmic noise-overlay selection:bg-primary/30">
                {/* Decorative grid overlay */}
                <div className="fixed inset-0 pointer-events-none opacity-[0.015] z-0"
                    style={{
                        backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px),
                                     linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
                        backgroundSize: '80px 80px'
                    }}
                />

                {/* HUD TOOLBAR — below NavBar */}
                <div className="flex-none z-40 glass-card backdrop-blur-xl border-b border-surface-2 px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <BrainCircuit className="text-primary" size={18} />
                            {isModelReady && (
                                <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary rounded-full animate-pulse" />
                            )}
                        </div>
                        <span className="font-display font-bold tracking-tight text-xs">
                            {isDemoMode ? <span className="text-accent">DEMO</span> : <span className="text-muted-foreground">MVP</span>}
                        </span>
                    </div>

                    {/* MIDDLE: Clock, Study Timer, Profile */}
                    <div className="hidden md:flex items-center gap-3">
                        <div className="text-muted-foreground font-mono text-xs">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>

                        {/* Study Timer */}
                        <button
                            onClick={() => setStudyTimerRunning(r => !r)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-mono transition-all border ${studyTimerRunning
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : studyTimerSeconds > 0
                                        ? 'bg-accent/10 border-accent/30 text-accent'
                                        : 'bg-surface-1 border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/30'
                                }`}
                            title={studyTimerRunning ? 'Pause study timer' : 'Start study timer'}
                        >
                            {studyTimerRunning ? <TimerOff size={11} /> : <Timer size={11} />}
                            <span>{formatStudyTimer(studyTimerSeconds)}</span>
                        </button>
                        {studyTimerSeconds > 0 && !studyTimerRunning && (
                            <button
                                onClick={() => setStudyTimerSeconds(0)}
                                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-display uppercase tracking-wider"
                                title="Reset timer"
                            >
                                Reset
                            </button>
                        )}

                        <div className="flex items-center gap-2 bg-surface-1 rounded-lg p-1 border border-surface-3">
                            <input
                                className="bg-transparent border-none text-xs font-display font-medium text-foreground w-24 text-center focus:outline-none placeholder:text-muted-foreground truncate"
                                value={userProfile.nickname}
                                onChange={(e) => setUserProfile({ ...userProfile, nickname: e.target.value.slice(0, 16) })}
                                maxLength={16}
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

                    <div className="flex items-center gap-2">
                        {/* Logged-in user profile */}
                        {authUser && (
                            <div className="flex items-center gap-2 bg-surface-1 rounded-lg px-2 py-1 border border-surface-3">
                                {authUser.picture && (
                                    <img src={authUser.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                                )}
                                <span className="text-[10px] font-display text-foreground truncate max-w-[80px]">
                                    {authUser.name?.split(' ')[0] || authUser.email}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="text-muted-foreground hover:text-destructive transition-colors"
                                    title="Sign out"
                                >
                                    <LogOut size={11} />
                                </button>
                            </div>
                        )}

                        {/* Keystroke Analytics Toggle */}
                        <button
                            onClick={() => setShowKeystrokePanel(!showKeystrokePanel)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all text-xs font-display tracking-wide border ${showKeystrokePanel
                                ? 'bg-secondary/20 border-secondary/50 text-secondary'
                                : 'bg-surface-1 border-surface-3 hover:border-secondary/30 text-muted-foreground hover:text-secondary'
                                }`}
                        >
                            <Activity size={13} />
                            <span className="hidden sm:inline">METRICS</span>
                        </button>

                        {/* Download Chat Button */}
                        <button
                            onClick={downloadChat}
                            disabled={messages.filter(m => !m.isGreeting).length === 0}
                            className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 border border-surface-3 hover:border-accent/30 text-muted-foreground hover:text-accent rounded-lg transition-all text-xs font-display tracking-wide disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-surface-3 disabled:hover:text-muted-foreground"
                            title="Download chat as text file"
                        >
                            <Save size={13} />
                            <span className="hidden sm:inline">SAVE</span>
                        </button>

                        {/* Clear History Button - full mode only */}
                        {!isDemoMode && (
                            <button
                                onClick={handleClearHistory}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 border border-surface-3 hover:border-destructive/30 text-muted-foreground hover:text-destructive rounded-lg transition-all text-xs font-display tracking-wide"
                                title="Clear conversation history"
                            >
                                <Trash2 size={13} />
                                <span className="hidden sm:inline">CLEAR</span>
                            </button>
                        )}

                        {/* Local SLM Toggle - only in full mode (demo auto-starts it) */}
                        {!isDemoMode && (
                            <button
                                onClick={() => { setShowLocalChat(true); startLocalBrain('large'); }}
                                className="flex items-center gap-1.5 px-2 py-1.5 bg-surface-1 border border-surface-3 hover:border-primary/30 text-muted-foreground hover:text-primary rounded-lg transition-all text-xs font-display tracking-wide"
                            >
                                <Cpu size={13} />
                                <span className="hidden sm:inline">LOCAL CORE</span>
                            </button>
                        )}

                        {/* Download Progress - Enhanced */}
                        {downloadProgress && !webGPUError && (
                            <div className="flex flex-col gap-1 glass-card px-3 py-1.5 rounded-xl border-primary/20 min-w-[180px]">
                                <div className="flex items-center gap-2">
                                    {downloadError ? (
                                        <AlertTriangle size={12} className="text-destructive" />
                                    ) : downloadProgress.progress === 100 ? (
                                        <BrainCircuit size={12} className="text-primary" />
                                    ) : (
                                        <Download size={12} className="text-primary animate-bounce" />
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
                                    {!downloadError && downloadProgress.progress !== 100 && downloadProgress.estimatedMB && (
                                        <span className="text-[9px] text-muted-foreground font-mono ml-auto">
                                            ~{downloadProgress.estimatedMB >= 1000
                                                ? `${(downloadProgress.estimatedMB / 1000).toFixed(1)} GB`
                                                : `${downloadProgress.estimatedMB} MB`}
                                        </span>
                                    )}
                                </div>
                                {downloadProgress.progress !== null && !downloadError && (
                                    <div className="w-full bg-surface-1 rounded-full h-1 overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-300 ease-out ${downloadProgress.progress === 100
                                                    ? 'bg-gradient-to-r from-primary to-accent'
                                                    : 'bg-gradient-to-r from-primary to-secondary'
                                                }`}
                                            style={{ width: `${Math.min(downloadProgress.progress, 100)}%` }}
                                        />
                                    </div>
                                )}
                                {downloadError && (
                                    <button
                                        onClick={retryDownload}
                                        className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-[10px] font-display uppercase tracking-wider hover:bg-primary/20 transition-all"
                                    >
                                        <RefreshCw size={10} />
                                        Retry
                                    </button>
                                )}
                            </div>
                        )}

                        {/* WELLNESS GAUGE */}
                        <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border glass-card ${getFatigueColor()}`}>
                            {context?.fatigue_metric?.status === 'LOCKOUT' ? <BatteryWarning size={14} /> : <Battery size={14} />}
                            <span className="text-xs font-mono font-bold">
                                {getFatigueLevel()}
                            </span>
                        </div>
                    </div>
                </div>

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
                                    {showModelSwitchConfirm === 'small' ? 'Fast (Gemma 2 2B)' : 'Quality (Phi 3.5 Mini)'}
                                </span>
                                {' '}requires downloading a new model
                                (~{showModelSwitchConfirm === 'small' ? '1,400' : '2,200'} MB).
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
                    <div className="flex-none z-30 bg-accent/10 border-b border-accent/20 px-4 py-2">
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
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-display uppercase tracking-wider transition-all border ${demoModelSize === 'small'
                                            ? 'bg-primary/15 border-primary/40 text-primary'
                                            : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:border-surface-3'
                                        }`}
                                    title="Gemma 2 2B - Faster download (~1.4 GB), quicker responses"
                                >
                                    <Zap size={10} />
                                    <span className="hidden sm:inline">Fast</span>
                                </button>
                                <button
                                    onClick={() => handleModelSizeSwitch('large')}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-display uppercase tracking-wider transition-all border ${demoModelSize === 'large'
                                            ? 'bg-secondary/15 border-secondary/40 text-secondary'
                                            : 'bg-transparent border-transparent text-muted-foreground hover:text-foreground hover:border-surface-3'
                                        }`}
                                    title="Phi 3.5 Mini - Higher quality (~2.2 GB download)"
                                >
                                    <FlaskConical size={10} />
                                    <span className="hidden sm:inline">Quality</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* MAIN CONTENT: Chat + Sidebar */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Chat column */}
                    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                        {/* CHAT AREA */}
                        <div
                            ref={chatContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto"
                        >
                            <div className="max-w-2xl mx-auto px-4 py-6">
                                <div className="space-y-5">
                                    {messages.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}
                                            style={{ animationDelay: `${idx * 50}ms` }}
                                        >
                                            <div className={`relative max-w-[80%] ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}`}>
                                                {msg.source === 'queued' && (
                                                    <div className="flex items-center gap-1 mb-1 justify-end">
                                                        <Clock size={9} className="text-accent" />
                                                        <span className="text-[9px] font-display text-accent uppercase tracking-wider">Queued</span>
                                                    </div>
                                                )}
                                                <div
                                                    className={`px-4 py-3 text-sm leading-relaxed ${msg.role === 'user'
                                                        ? msg.source === 'queued'
                                                            ? 'bg-gradient-to-br from-accent/80 to-accent/60 text-accent-foreground rounded-2xl rounded-br-sm opacity-75'
                                                            : 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl rounded-br-sm shadow-glow-sm'
                                                        : 'bg-surface-2 border border-surface-3 text-foreground rounded-2xl rounded-bl-sm'
                                                        }`}
                                                >
                                                    {msg.source === 'typing' ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                        </div>
                                                    ) : (
                                                        <div className="chat-prose">
                                                            <ReactMarkdown
                                                                remarkPlugins={[remarkMath]}
                                                                rehypePlugins={[rehypeKatex]}
                                                            >
                                                                {msg.text}
                                                            </ReactMarkdown>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={endOfMsgRef} />
                                </div>
                            </div>
                        </div>

                        {/* INPUT FOOTER */}
                        <footer className="flex-none glass-card backdrop-blur-xl border-t border-surface-2 p-4">
                            {/* Queue indicator */}
                            {pendingQueue.length > 0 && (
                                <div className="max-w-2xl mx-auto mb-2 flex items-center gap-2 px-1">
                                    <Clock size={11} className="text-accent" />
                                    <span className="text-[10px] font-display text-accent uppercase tracking-wider">
                                        {pendingQueue.length} question{pendingQueue.length > 1 ? 's' : ''} queued
                                    </span>
                                </div>
                            )}
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
                                                : loading
                                                    ? "Type your next question to queue it..."
                                                    : "Ask about calculus, trigonometry, statistics..."
                                    }
                                    className="input-base flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
                                    {...keystrokeAttachToInput()}
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || context?.fatigue_metric?.status === 'LOCKOUT' || (!isModelReady && isDemoMode)}
                                    className={`p-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none transition-all ${loading && input.trim()
                                            ? 'bg-accent text-accent-foreground hover:opacity-90 shadow-glow-sm'
                                            : 'btn-primary'
                                        }`}
                                    title={loading ? 'Queue this question' : 'Send'}
                                >
                                    {loading && input.trim() ? <ListPlus size={18} /> : <Send size={18} />}
                                </button>
                            </form>
                        </footer>
                    </div>

                    {/* Topic Sidebar */}
                    <TopicSidebar
                        subject={userProfile.subject}
                        onTopicClick={(subtopic, topic, code) => {
                            const question = `Explain ${subtopic} from ${topic} (${code})`;
                            setInput(question);
                        }}
                    />
                </div>

            </div>

            {/* Keystroke Analytics Panel — rendered outside main container for proper fixed positioning */}
            {showKeystrokePanel && (
                <KeystrokeAnalytics
                    metrics={keystrokeMetrics}
                    historicalMetrics={historicalMetrics}
                    behaviorAnalysis={behaviorAnalysis}
                    onClose={() => setShowKeystrokePanel(false)}
                />
            )}

            {/* Queue Confirmation Dialog */}
            {showQueueConfirm && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 animate-reveal">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={cancelQueueMessage} />
                    <div className="relative glass-card border border-accent/20 rounded-2xl p-5 max-w-sm w-full shadow-glow animate-reveal z-10">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                                <ListPlus size={20} className="text-accent" />
                            </div>
                            <h3 className="font-display font-bold text-foreground text-sm">Queue This Question?</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                            MAIT is still responding. Want to queue your question so it's answered next?
                        </p>
                        <div className="bg-surface-1 border border-surface-3 rounded-xl px-3 py-2 mb-4">
                            <p className="text-xs text-foreground line-clamp-3 italic">"{showQueueConfirm}"</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={confirmQueueMessage}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-display font-bold tracking-wide bg-accent text-accent-foreground hover:opacity-90 transition-all"
                            >
                                <ListPlus size={14} />
                                Queue It
                            </button>
                            <button
                                onClick={cancelQueueMessage}
                                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-display font-medium tracking-wide bg-surface-1 border border-surface-3 text-muted-foreground hover:text-foreground transition-all"
                            >
                                Wait Instead
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Auto-Save Popup */}
            {showAutoSavePrompt && (
                <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 animate-reveal">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => {
                        setShowAutoSavePrompt(false);
                        localStorage.setItem('mait_autosave_dismissed', 'true');
                    }} />
                    <div className="relative glass-card border border-primary/20 rounded-2xl p-5 max-w-sm w-full shadow-glow animate-reveal z-10">
                        <button
                            onClick={() => {
                                setShowAutoSavePrompt(false);
                                localStorage.setItem('mait_autosave_dismissed', 'true');
                            }}
                            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X size={16} />
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                                <Save size={20} className="text-primary" />
                            </div>
                            <h3 className="font-display font-bold text-foreground text-sm">Save Your Chats?</h3>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                            Want to automatically save your chat history as a text file when you leave? You can also save anytime using the <strong className="text-foreground">SAVE</strong> button in the toolbar.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAutoSaveToggle(true)}
                                className="flex-1 btn-primary py-2 px-3 rounded-xl text-xs font-display font-bold tracking-wide"
                            >
                                Enable Auto-Save
                            </button>
                            <button
                                onClick={() => {
                                    setShowAutoSavePrompt(false);
                                    localStorage.setItem('mait_autosave_dismissed', 'true');
                                }}
                                className="flex-1 py-2 px-3 rounded-xl text-xs font-display font-medium tracking-wide bg-surface-1 border border-surface-3 text-muted-foreground hover:text-foreground hover:border-surface-3 transition-all"
                            >
                                No Thanks
                            </button>
                        </div>
                        {autoSaveEnabled && (
                            <p className="text-[10px] text-primary mt-2 text-center font-display">Auto-save enabled!</p>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

function LoginModal({ show, onClose, onSubmit, onDemo, onGoogleSuccess, authLoading }) {
    const [code, setCode] = useState('')
    const [error, setError] = useState(false)
    const [showAccessCode, setShowAccessCode] = useState(false)

    const [isVerifying, setIsVerifying] = useState(false)

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsVerifying(true)
        setError(false)
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
            const res = await fetch(`${API_URL}/auth/verify-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            })
            if (res.ok) {
                onSubmit(true)
            } else {
                setError(true)
                setTimeout(() => setError(false), 2000)
            }
        } catch {
            setError(true)
            setTimeout(() => setError(false), 2000)
        } finally {
            setIsVerifying(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <div className="glass-card p-8 rounded-2xl w-full max-w-sm border-glow animate-reveal">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                        Sign In
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-surface-2"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                {/* Google Sign-In */}
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground text-center font-display">
                        Sign in with Google to save your progress across devices
                    </p>
                    <div className="flex justify-center">
                        {authLoading ? (
                            <div className="text-xs text-muted-foreground font-display animate-pulse">Signing in...</div>
                        ) : (
                            <GoogleLogin
                                onSuccess={onGoogleSuccess}
                                onError={() => console.error('Google login failed')}
                                theme="filled_black"
                                shape="pill"
                                size="large"
                                text="signin_with"
                                width="300"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-surface-3"></div>
                        <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-surface-3"></div>
                    </div>

                    {/* Access code toggle */}
                    {!showAccessCode ? (
                        <button
                            onClick={() => setShowAccessCode(true)}
                            className="w-full py-3 rounded-xl text-sm font-display border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                        >
                            Use Access Code
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Enter Access Code"
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(false); }}
                                className={`input-base text-center font-display text-lg tracking-[0.15em] uppercase py-4 ${error ? 'border-destructive focus:border-destructive' : ''}`}
                            />
                            {error && (
                                <p className="text-destructive text-xs text-center font-display">
                                    Invalid Access Code
                                </p>
                            )}
                            <button
                                type="submit"
                                className="w-full btn-primary py-3 rounded-xl font-display"
                            >
                                Unlock
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <button
                        onClick={onDemo}
                        className="text-muted-foreground text-xs font-display hover:text-primary transition-colors"
                    >
                        Or try the free demo instead
                    </button>
                </div>
            </div>
        </div>
    )
}

export default App
