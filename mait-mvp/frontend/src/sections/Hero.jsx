import { useEffect, useState, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Brain, 
  Sparkles, 
  Zap, 
  Shield,
  Play,
  FileText,
  ArrowRight
} from 'lucide-react';

export default function Hero({ scrollToSection, navigate, onLoginClick }) {
  const [typedText, setTypedText] = useState('');
  const fullText = 'No wukkas, mate. Let\'s crack this together.';
  const containerRef = useRef(null);
  
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index));
        index++;
      } else {
        clearInterval(timer);
      }
    }, 50);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    { value: '4hrs', label: '→ 45sec', sublabel: 'Worksheet prep time', icon: Zap },
    { value: '100%', label: 'NESA Aligned', sublabel: 'Curriculum locked', icon: Shield },
    { value: 'Tri-Brain', label: 'Architecture', sublabel: 'Privacy-first AI', icon: Brain },
  ];

  return (
    <section 
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-mait-cosmic/20 blur-3xl"
          animate={{
            x: [0, 50, 0],
            y: [0, -30, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-mait-cyan/15 blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-mait-nebula/10 blur-3xl"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 grid-pattern opacity-50" />
        
        {/* Particle Stars */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.1, 0.4, 0.1],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <motion.div 
        style={{ y, opacity }}
        className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
      >
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card"
            >
              <Sparkles className="w-4 h-4 text-mait-cyan" />
              <span className="text-sm text-white/80">The Sovereign Educational AI</span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-4"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                <span className="text-white">Your AI</span>
                <br />
                <span className="gradient-text-animated">Study Mate</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/60 max-w-lg">
                Curriculum-aware tutoring for NSW HSC students. 
                Built by educators, powered by the Tri-Brain Architecture.
              </p>
            </motion.div>

            {/* AI Response Preview */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="glass-card-strong p-4 rounded-xl max-w-md"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-mait-cosmic to-mait-cyan flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-medium text-white/80">Mate</span>
                <span className="text-xs text-white/40">Just now</span>
              </div>
              <p className="text-white/90 font-mono text-sm">
                {typedText}
                <span className="animate-typing-cursor inline-block w-0.5 h-4 bg-mait-cyan ml-1 align-middle" />
              </p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="grid max-w-2xl gap-4 sm:grid-cols-[1.35fr_1fr_1.05fr]"
            >
              <button
                onClick={() => navigate('worksheets')}
                className="btn-cosmic text-white px-8 py-4 text-base rounded-xl flex items-center justify-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Worksheet Maker
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={() => navigate('demo')}
                className="rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 px-8 py-4 text-base font-medium text-mait-deep-space transition hover:-translate-y-0.5 hover:shadow-[0_15px_35px_-10px_rgba(34,197,94,0.45)]"
              >
                <span className="flex items-center justify-center gap-2">
                  <Play className="w-5 h-5" />
                  Free Demo
                </span>
              </button>
              
              <button
                onClick={onLoginClick}
                className="btn-glass text-white px-8 py-4 text-base rounded-xl w-full"
              >
                Full Access
              </button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-3 gap-4 pt-4"
            >
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                  className="glass-card p-4 rounded-xl text-center group hover:border-mait-cosmic/50 transition-colors"
                >
                  <stat.icon className="w-5 h-5 text-mait-cyan mx-auto mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-mait-cyan font-medium">{stat.label}</div>
                  <div className="text-xs text-white/40">{stat.sublabel}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Right Column - Interactive Terminal */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="relative"
          >
            <div className="relative">
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-mait-cosmic/30 to-mait-cyan/30 rounded-3xl blur-2xl opacity-50" />
              
              {/* Terminal Window */}
              <div className="relative terminal-window rounded-2xl overflow-hidden shadow-2xl">
                {/* Terminal Header */}
                <div className="terminal-header px-4 py-3 flex items-center gap-2">
                  <div className="terminal-dot bg-red-500" />
                  <div className="terminal-dot bg-yellow-500" />
                  <div className="terminal-dot bg-green-500" />
                  <span className="ml-4 text-xs text-white/40 font-mono">worksheet-studio.mait — launch flow</span>
                </div>
                
                {/* Terminal Content */}
                <div className="terminal-content p-6 min-h-[400px]">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-mait-cyan/20 bg-mait-cyan/5 px-4 py-3 text-sm text-mait-cyan"
                  >
                    Teacher workflow: curriculum {'\u2192'} instructions {'\u2192'} Gemini Canvas {'\u2192'} editable worksheet
                  </motion.div>
                  <div className="mt-6 space-y-4">
                    {[
                      {
                        delay: 0.8,
                        step: '01',
                        title: 'Pick stage and subject',
                        detail: 'Year 12 Mathematics Advanced with syllabus points or manual brief.',
                      },
                      {
                        delay: 1.05,
                        step: '02',
                        title: 'Tune additions and output',
                        detail: 'Question count, spacing, proof-style, worded problems, answer key.',
                      },
                      {
                        delay: 1.3,
                        step: '03',
                        title: 'Generate instructions',
                        detail: 'MAIT writes Gemini-ready Canvas instructions with the exact worksheet format.',
                      },
                      {
                        delay: 1.55,
                        step: '04',
                        title: 'Edit live in Canvas',
                        detail: 'Tweak individual questions, regenerate sections, and export the final worksheet.',
                      },
                    ].map((item, index) => (
                      <motion.div
                        key={item.step}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: item.delay }}
                        className="relative rounded-2xl border border-white/10 bg-white/5 p-4"
                      >
                        {index < 3 && (
                          <motion.div
                            className="absolute left-[1.125rem] top-[3.35rem] h-6 w-px bg-gradient-to-b from-emerald-400/80 to-transparent"
                            animate={{ opacity: [0.45, 1, 0.45] }}
                            transition={{ duration: 1.8, repeat: Infinity, delay: item.delay }}
                          />
                        )}
                        <div className="flex items-start gap-4">
                          <motion.div
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-300"
                            animate={{ scale: [1, 1.04, 1] }}
                            transition={{ duration: 2, repeat: Infinity, delay: item.delay }}
                          >
                            {item.step}
                          </motion.div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-white">{item.title}</div>
                            <div className="mt-1 text-sm leading-relaxed text-white/55">{item.detail}</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1.9 }}
                    className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-300"
                  >
                    Launches into an editable Gemini Canvas flow, not a locked one-shot PDF.
                  </motion.div>
                </div>
              </div>
              

            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-2"
        >
          <span className="text-xs text-white/40">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-mait-cyan"
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
