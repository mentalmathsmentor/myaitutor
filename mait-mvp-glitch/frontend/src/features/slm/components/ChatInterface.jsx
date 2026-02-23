import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { modelService } from '../services/ModelService';
import MessageBubble from './MessageBubble';

const ChatInterface = () => {
    const [status, setStatus] = useState("initializing"); // initializing | ready | error
    const [statusMsg, setStatusMsg] = useState("Booting neural engine...");
    const [messages, setMessages] = useState([
        { role: 'assistant', content: "Hello! I'm your local Mental Maths Mentor. No cloud, just us. What shall we tackle?" }
    ]);
    const [queue, setQueue] = useState([]);
    const [input, setInput] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const init = async () => {
            try {
                const modelName = await modelService.initialize((progress) => {
                    setStatusMsg(progress);
                });
                setStatus("ready");
                setStatusMsg(`Active: ${modelName}`);
            } catch (e) {
                setStatus("error");
                setStatusMsg("Failed to load local model.");
            }
        };
        init();
    }, []);

    const scrollToBottom = () => {
        window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: "smooth"
        });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isGenerating]);

    // Queue Processor
    useEffect(() => {
        if (!isGenerating && status === 'ready' && queue.length > 0) {
            const nextMessage = queue[0];
            setQueue(prev => prev.slice(1));
            executeChat(nextMessage);
        }
    }, [isGenerating, status, queue]);

    const executeChat = async (userText) => {
        // Add User Message
        // We keep track of history as just the raw text for the model context
        // But for the UI we want "Bubbles"
        const currentMessages = [...messages, { role: 'user', content: userText }];
        setMessages(currentMessages);
        setIsGenerating(true);

        // We capture the index where the bot's new bubbles will start
        const botStartIndex = currentMessages.length;

        try {
            await modelService.streamChat(currentMessages, (currentFullResponse) => {
                // Split by double newline to separate "thoughts" or "paragraphs"
                const segments = currentFullResponse.split(/\n\n+/).filter(s => s.trim());

                if (segments.length === 0) {
                    // Show valid "Thinking..." if nothing yet
                    setMessages(prev => {
                        const history = prev.slice(0, botStartIndex);
                        return [...history, { role: 'assistant', content: "Thinking..." }];
                    });
                    return;
                }

                setMessages(prev => {
                    // Keep history up to (and including) user message
                    // Everything after botStartIndex is "current generation" to be replaced by the split segments
                    const history = prev.slice(0, botStartIndex);

                    const newBotMessages = segments.map((seg, idx) => ({
                        role: 'assistant',
                        content: seg
                    }));

                    return [...history, ...newBotMessages];
                });
            });
        } catch (err) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Error: Could not generate response." }]);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || status !== 'ready') return;

        const userText = input;
        setInput("");

        if (isGenerating) {
            setQueue(prev => [...prev, userText]);
        } else {
            executeChat(userText);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
            {/* Header */}
            <header className="flex items-center justify-between p-4 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur fixed top-0 w-full z-10 transition-all">
                <div className="flex items-center gap-2 max-w-3xl mx-auto w-full">
                    <div className="flex items-center gap-2">
                        <div className="bg-emerald-500/10 p-2 rounded-lg">
                            <Sparkles className="text-emerald-400" size={20} />
                        </div>
                        <div>
                            <h1 className="font-bold text-sm tracking-wide">MAIT <span className="opacity-50">Local Core</span></h1>
                            <div className="flex items-center gap-1.5 pt-0.5">
                                <div className={`w-1.5 h-1.5 rounded-full ${status === 'ready' ? 'bg-emerald-500 animate-pulse' :
                                    status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`} />
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                                    {statusMsg}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="w-full max-w-3xl mx-auto px-4 pt-24 pb-32 space-y-6">
                {messages.map((msg, i) => (
                    <MessageBubble key={i} role={msg.role} content={msg.content} />
                ))}

                {status === 'initializing' && (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                        <Loader2 className="animate-spin text-zinc-600" size={32} />
                        <p className="text-xs text-zinc-600 font-mono text-center">
                            Downloading/compiling weights...<br />This may take a moment.
                        </p>
                    </div>
                )}
            </div>

            {/* Sticky Queue Note */}
            {queue.length > 0 && (
                <div className="fixed bottom-24 right-4 z-20 w-48 rotate-2 animate-in slide-in-from-bottom-4 transition-all">
                    <div className="bg-yellow-200 text-yellow-900 p-3 shadow-lg rounded-sm font-sans text-sm border-t-8 border-yellow-300 transform hover:scale-105 transition-transform duration-200">
                        <div className="font-bold border-b border-yellow-900/10 pb-1 mb-1 flex justify-between items-center">
                            <span className="font-mono text-xs uppercase tracking-wider">Queue ({queue.length})</span>
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 opacity-90 text-xs">
                            {queue.map((q, i) => (
                                <li key={i} className="truncate">{q}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="fixed bottom-0 w-full bg-zinc-950/90 backdrop-blur p-4 border-t border-zinc-900">
                <form onSubmit={handleSend} className="relative flex items-center gap-2 max-w-3xl mx-auto">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={status === 'ready' ? (isGenerating ? "Mind is busy... (press enter to queue)" : "Ask a math question...") : "Waiting for model..."}
                        disabled={status !== 'ready'}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-all text-sm placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || status !== 'ready'}
                        className={`p-3.5 rounded-xl transition-all shadow-lg active:scale-95 text-white
                            ${isGenerating ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}
                            disabled:bg-zinc-800 disabled:text-zinc-600`}
                    >
                        {isGenerating ? <span className="font-bold text-xs">Q+</span> : <Send size={18} />}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatInterface;
