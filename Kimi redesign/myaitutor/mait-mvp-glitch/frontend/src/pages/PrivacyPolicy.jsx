import React from 'react';
import { Shield, Lock, Eye, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy({ navigate }) {
    return (
        <div className="min-h-screen bg-cosmic noise-overlay text-foreground flex flex-col p-6 max-w-4xl mx-auto">
            <header className="flex items-center gap-4 mb-12 animate-reveal animate-reveal-1">
                <button
                    onClick={() => navigate('landing')}
                    className="p-2 rounded-lg bg-surface-1 border border-surface-3 hover:border-primary/50 transition-all group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                </button>
                <h1 className="text-3xl font-display font-bold">Privacy Policy</h1>
            </header>

            <main className="space-y-12 pb-20">
                {/* Core Philosophy Section */}
                <section className="animate-reveal animate-reveal-2 bg-surface-1 border border-surface-3 rounded-2xl p-8">
                    <div className="flex items-center gap-3 mb-4 text-primary">
                        <Shield size={24} />
                        <h2 className="text-xl font-bold">Our Philosophy</h2>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                        At MAIT, we believe your data is an extension of your mind. We don't sell it, we don't exploit it, and we do everything in our power to keep it on your device. This is "privacy by default," built for the next generation of learners.
                    </p>
                </section>

                {/* Key Commitments */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="animate-reveal animate-reveal-3 bg-surface-1 border border-surface-3 rounded-2xl p-8 transition-all hover:border-accent/30 translate-y-0 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4 text-accent">
                            <Eye size={20} />
                            <h3 className="text-lg font-bold">PII Scrubbing</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Before your questions leave your device to talk to our cloud AI, our client-side Privacy Shield automatically redacts names, phone numbers, and emails.
                        </p>
                    </div>

                    <div className="animate-reveal animate-reveal-4 bg-surface-1 border border-surface-3 rounded-2xl p-8 transition-all hover:border-secondary/30 translate-y-0 hover:-translate-y-1">
                        <div className="flex items-center gap-3 mb-4 text-secondary">
                            <Lock size={20} />
                            <h3 className="text-lg font-bold">Local-First Data</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Your "Demo Mode" conversations happen entirely in your browser. No server interaction, no data logs, no footprint.
                        </p>
                    </div>
                </div>

                <section className="animate-reveal animate-reveal-5 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold mb-2">1. Data Collection</h3>
                        <p className="text-muted-foreground">
                            For authenticated users, we store anonymous conversation history and psychometric metrics (typing patterns) to improve your learning experience. We associate this with your unique Student ID, not your real identity where possible.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-2">2. How We Use Data</h3>
                        <p className="text-muted-foreground">
                            We use your interaction data to train our Wellness Engine, allowing "Mate" to understand when you are fatigued and need a break. We do NOT use your data for advertising.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-lg font-bold mb-2">3. Third-Party Services</h3>
                        <p className="text-muted-foreground">
                            Cloud processing is handled by Google Gemini. Your redacted queries are sent to Google's servers for high-level reasoning. None of your PII is intentionally sent during this process.
                        </p>
                    </div>
                </section>

                <footer className="mt-20 pt-10 border-t border-surface-3 text-center">
                    <p className="text-xs text-muted-foreground italic">
                        Last updated: March 2026. Built with care by Mental Maths Mentor.
                    </p>
                </footer>
            </main>
        </div>
    );
}
