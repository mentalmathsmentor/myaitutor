import { useEffect, useState, useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Brain, Sparkles, Zap, Shield, Play, ArrowRight } from 'lucide-react'

export default function Hero({ scrollToSection, navigate }) {
  const [typedText, setTypedText] = useState('')
  const fullText = "No wukkas, mate. Let's crack this together."
  const containerRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  })

  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index <= fullText.length) {
        setTypedText(fullText.slice(0, index))
        index++
      } else {
        clearInterval(timer)
      }
    }, 50)
    return () => clearInterval(timer)
  }, [])

  const stats = [
    { value: '4hrs', label: '→ 45sec', sublabel: 'Worksheet prep time', icon: Zap },
    { value: '100%', label: 'NESA Aligned', sublabel: 'Curriculum locked', icon: Shield },
    { value: 'Tri-Brain', label: 'Architecture', sublabel: 'Privacy-first AI', icon: Brain },
  ]

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20"
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'hsl(265 85% 60% / 0.2)' }}
          animate={{ x: [0, 50, 0], y: [0, -30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full blur-3xl"
          style={{ background: 'hsl(180 85% 55% / 0.15)' }}
          animate={{ x: [0, -40, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 grid-pattern opacity-50" />
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white"
            style={{
              left: `${(i * 37 + 11) % 100}%`,
              top: `${(i * 53 + 7) % 100}%`,
            }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.5, 1] }}
            transition={{
              duration: 2 + (i % 3),
              repeat: Infinity,
              delay: (i * 0.3) % 2,
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
          {/* Left Column */}
          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card"
            >
              <Sparkles className="w-4 h-4 text-mait-cyan" />
              <span className="text-sm text-white/80">The Sovereign Educational AI</span>
            </motion.div>

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
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(265 85% 60%), hsl(180 85% 55%))' }}>
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
              className="flex flex-wrap gap-4"
            >
              <button
                onClick={() => navigate && navigate('demo')}
                className="btn-primary px-8 py-4 rounded-xl flex items-center gap-2 group"
              >
                <Play className="w-5 h-5" />
                Try Free Demo
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </button>
              <button
                onClick={() => scrollToSection && scrollToSection('architecture')}
                className="btn-glass px-8 py-4 rounded-xl"
              >
                Explore Architecture
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
              <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-50" style={{ background: 'linear-gradient(to right, hsl(265 85% 60% / 0.3), hsl(180 85% 55% / 0.3))' }} />
              <div className="relative terminal-window rounded-2xl overflow-hidden shadow-2xl">
                <div className="terminal-header px-4 py-3 flex items-center gap-2">
                  <div className="terminal-dot bg-red-500" />
                  <div className="terminal-dot bg-yellow-500" />
                  <div className="terminal-dot bg-green-500" />
                  <span className="ml-4 text-xs text-white/40 font-mono">mate@mait — A.G.E. Pipeline</span>
                </div>
                <div className="terminal-content p-6 space-y-4 min-h-[400px]">
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-green-400 font-mono text-sm">
                    $ mait --init worksheet-generator
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-white/70 font-mono text-sm">
                    Initializing Artifact Generation Engine...
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="space-y-2">
                    {['Loading NESA syllabus database...', 'Initializing LaTeX compiler...', 'Mounting TikZ diagram engine...'].map((msg, i) => (
                      <div key={i} className="flex items-center gap-2 text-white/60 font-mono text-sm">
                        <span className="text-mait-cyan">✓</span>
                        {msg}
                      </div>
                    ))}
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-green-400 font-mono text-sm">
                    Ready! Select your curriculum parameters:
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.8 }} className="glass-card p-4 rounded-lg space-y-3">
                    {[['Year Level', 'Year 12'], ['Subject', 'Mathematics Advanced'], ['Topic', 'Integration by Parts'], ['Questions', '15']].map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-white/60 text-sm">{k}</span>
                        <span className="text-mait-cyan font-mono text-sm">{v}</span>
                      </div>
                    ))}
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-mait-cyan animate-pulse" />
                    <span className="text-white/50 font-mono text-xs">Generating worksheet.pdf...</span>
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }} className="text-green-400 font-mono text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Worksheet generated in 0.42s!
                  </motion.div>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }} className="flex items-center gap-2 text-white/40 font-mono text-sm">
                    <span className="text-mait-cosmic">$</span>
                    <span className="animate-typing-cursor inline-block w-2 h-4 bg-white/40" />
                  </motion.div>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 3, type: "spring" }}
                className="absolute -bottom-4 -right-4 glass-card-strong px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm text-white/80">A.G.E. Online</span>
              </motion.div>
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
  )
}
