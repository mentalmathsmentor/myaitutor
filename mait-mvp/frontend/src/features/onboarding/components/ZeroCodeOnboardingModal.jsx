import React, { useState, useEffect } from 'react';
import { Sparkles, MousePointerClick, Zap, X } from 'lucide-react';

const STORAGE_KEY = 'mait_zerocode_onboarding_seen';

const ZeroCodeOnboardingModal = () => {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const hasSeenOnboarding = localStorage.getItem(STORAGE_KEY);
        if (!hasSeenOnboarding) {
            // Small delay so the workspace renders first, then the modal draws attention
            const timer = setTimeout(() => setIsOpen(true), 600);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem(STORAGE_KEY, 'true');
    };

    // Close on backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) handleDismiss();
    };

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => { if (e.key === 'Escape') handleDismiss(); };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
            onClick={handleBackdropClick}
        >
            <div
                className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0d0d1a] shadow-[0_0_80px_rgba(147,51,234,0.25)] animate-in fade-in zoom-in-95 duration-300"
                role="dialog"
                aria-modal="true"
                aria-labelledby="zerocode-modal-title"
            >
                {/* Close button */}
                <button
                    onClick={handleDismiss}
                    className="absolute right-4 top-4 z-10 rounded-full border border-white/10 p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
                    aria-label="Close onboarding"
                >
                    <X size={16} />
                </button>

                <div className="flex flex-col md:flex-row">
                    {/* ── Left: Media Panel ── */}
                    <div className="relative flex w-full flex-col items-center justify-center overflow-hidden border-b border-white/8 bg-[#110b22] p-6 md:w-[45%] md:border-b-0 md:border-r">
                        {/* Ambient glow */}
                        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.15),transparent_70%)]" />

                        {/* Media placeholder — swap this <div> for <img src="demo.gif" /> or <video autoPlay loop muted playsInline> */}
                        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#0a0814] shadow-inner">
                            <div className="flex flex-col items-center gap-3 p-4 text-center">
                                <div className="rounded-2xl bg-purple-500/15 p-4 text-purple-400">
                                    <MousePointerClick size={32} className="animate-bounce" />
                                </div>
                                <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">
                                    Drop your demo GIF here
                                </span>
                            </div>
                        </div>

                        <p className="mt-4 text-center text-[10px] uppercase tracking-widest text-white/25">
                            Highlight → type → done
                        </p>
                    </div>

                    {/* ── Right: Content Panel ── */}
                    <div className="flex w-full flex-col justify-center p-8 md:w-[55%] md:p-10">
                        {/* New Feature badge */}
                        <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-purple-300">
                            <Sparkles size={13} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">New Feature</span>
                        </div>

                        <h2
                            id="zerocode-modal-title"
                            className="mb-3 text-2xl font-bold leading-tight text-white md:text-3xl"
                        >
                            Zero coding required.<br />
                            Just highlight &amp; edit.
                        </h2>

                        <p className="mb-8 text-sm leading-relaxed text-white/55">
                            No wrestling with LaTeX. Highlight anything on your worksheet, describe what you want, and MAIT rewrites the code and recompiles — instantly.
                        </p>

                        {/* Feature bullets */}
                        <div className="mb-8 space-y-5">
                            <FeatureBullet
                                icon={<Zap size={16} />}
                                title="Too easy?"
                                description={<>Highlight any question and type <em className="text-white/80">"Make it harder."</em></>}
                            />
                            <FeatureBullet
                                icon={<MousePointerClick size={16} />}
                                title="Diagram weird?"
                                description={<>Highlight the image and type <em className="text-white/80">"Fix the angle."</em></>}
                            />
                            <FeatureBullet
                                icon={<Sparkles size={16} />}
                                title="Wrong scenario?"
                                description={<>Highlight the question and type <em className="text-white/80">"Change this to a cliff scenario."</em></>}
                            />
                        </div>

                        {/* CTA */}
                        <button
                            onClick={handleDismiss}
                            className="w-full rounded-xl bg-purple-600 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_24px_rgba(147,51,234,0.4)] transition hover:bg-purple-500 active:scale-[0.98]"
                        >
                            Got it, let's build! 🚀
                        </button>

                        <p className="mt-4 text-center text-[10px] text-white/25">
                            Won't show again · Toggle via settings anytime
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Small internal helper for consistent bullet layout
function FeatureBullet({ icon, title, description }) {
    return (
        <div className="flex items-start gap-4">
            <div className="mt-0.5 shrink-0 rounded-lg border border-white/8 bg-white/5 p-1.5 text-white/70">
                {icon}
            </div>
            <div>
                <h4 className="text-sm font-semibold text-white">{title}</h4>
                <p className="mt-0.5 text-xs leading-relaxed text-white/50">{description}</p>
            </div>
        </div>
    );
}

export default ZeroCodeOnboardingModal;
