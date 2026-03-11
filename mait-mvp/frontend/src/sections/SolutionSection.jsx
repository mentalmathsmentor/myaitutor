import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Shield, Zap, Heart, CheckCircle2, Lock, Cpu, Cloud, Eye } from 'lucide-react'

export default function SolutionSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const solutions = [
    {
      icon: Shield, title: 'The Privacy Airlock', subtitle: 'Tri-Brain Architecture',
      description: "A Small Language Model runs locally on the student's device, acting as a firewall. PII is scrubbed via local regex and OCR before any cloud interaction.",
      features: ['Local SLM processes sensitive data', 'Regex-based PII detection', 'Zero data retention policy', 'GDPR & NESA compliant'],
      color: 'from-green-500/20 to-emerald-500/20', gradient: 'from-green-500 to-emerald-500',
    },
    {
      icon: Zap, title: 'Keystroke Psychometrics', subtitle: 'Cognitive Wellness',
      description: 'MAIT monitors typing cadence, delete-retype cycles, and interaction latency to detect cognitive fatigue and trigger structured breaks.',
      features: ['Real-time fatigue detection', 'Dynamic break scheduling', '20-20-20 eye strain reminders', 'Active engagement tracking'],
      color: 'from-mait-cosmic/20 to-mait-cyan/20', gradient: 'from-mait-cosmic to-mait-cyan',
    },
    {
      icon: Heart, title: 'The A.G.E. Pipeline', subtitle: 'Artifact Generation Engine',
      description: 'Transforms 4 hours of worksheet prep into 45 seconds. Generates curriculum-locked, differentiated PDFs with vector-perfect TikZ diagrams.',
      features: ['LaTeX/TikZ diagram generation', 'NESA-aligned question banks', 'Auto-generated answer keys', 'Differentiated difficulty levels'],
      color: 'from-purple-500/20 to-pink-500/20', gradient: 'from-purple-500 to-pink-500',
    },
  ]

  const architectureLayers = [
    { name: 'The Eye', icon: Eye, description: 'Local OCR & Image Processing', tech: 'Tesseract.js / Moondream', color: 'text-blue-400' },
    { name: 'The Shield', icon: Lock, description: 'PII Detection & Sanitization', tech: 'Custom Regex Filter', color: 'text-green-400' },
    { name: 'The Face', icon: Cpu, description: 'Edge SLM - Persona & Empathy', tech: 'Gemma 2B / Gemini Nano', color: 'text-mait-cyan' },
    { name: 'The Brain', icon: Cloud, description: 'Cloud LLM - Truth & Reasoning', tech: 'Gemini 2.0 Pro', color: 'text-mait-cosmic' },
  ]

  return (
    <section id="solution" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: 'linear-gradient(to right, transparent, hsl(265 85% 60% / 0.3), transparent)' }} />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{ background: 'hsl(265 85% 60% / 0.1)' }}
          animate={{ scale: [1, 1.1, 1], x: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity }}
        />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-16">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <CheckCircle2 className="w-4 h-4 text-mait-cyan" />
            <span className="text-sm text-white/80">The Solution</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            The <span className="gradient-text">MAIT Architecture</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Not a generic chatbot. A Sovereign Educational AI platform engineered specifically for the NSW HSC context.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8 mb-20">
          {solutions.map((solution, index) => (
            <motion.div key={solution.title} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: index * 0.15 }} className="group">
              <div className="glass-card-strong p-6 lg:p-8 rounded-2xl h-full feature-card relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${solution.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${solution.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <solution.icon className="w-7 h-7 text-white" />
                  </div>
                  <span className="text-xs font-mono text-white/40 uppercase tracking-wider">{solution.subtitle}</span>
                  <h3 className="text-xl font-bold text-white mt-1 mb-4">{solution.title}</h3>
                  <p className="text-white/60 leading-relaxed mb-6">{solution.description}</p>
                  <ul className="space-y-3">
                    {solution.features.map((feature, fIndex) => (
                      <motion.li key={feature} initial={{ opacity: 0, x: -10 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.4, delay: 0.5 + index * 0.1 + fIndex * 0.05 }} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${solution.gradient} flex items-center justify-center flex-shrink-0`}>
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm text-white/70">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }} className="glass-card-strong rounded-2xl p-8 lg:p-12">
          <div className="text-center mb-10">
            <h3 className="text-2xl lg:text-3xl font-bold text-white mb-3">The Tri-Brain Stack</h3>
            <p className="text-white/60 max-w-xl mx-auto">
              Four layers working in harmony to ensure privacy, accuracy, and empathy in every interaction.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {architectureLayers.map((layer, index) => (
              <motion.div key={layer.name} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }} className="relative">
                <div className="glass-card p-6 rounded-xl h-full text-center group hover:border-mait-cosmic/50 transition-colors">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border border-white/20 flex items-center justify-center">
                    <span className="text-xs text-white/60">{index + 1}</span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <layer.icon className={`w-6 h-6 ${layer.color}`} />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-1">{layer.name}</h4>
                  <p className="text-sm text-white/60 mb-3">{layer.description}</p>
                  <span className="text-xs font-mono text-white/40">{layer.tech}</span>
                </div>
                {index < architectureLayers.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                    <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/20">
                        <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 1.2 }} className="mt-10 glass-card p-6 rounded-xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <span className="text-white/60">User Input</span>
              </div>
              <div className="hidden lg:block flex-1 h-px" style={{ background: 'linear-gradient(to right, hsl(142 71% 45% / 0.5), hsl(180 85% 55% / 0.5), hsl(265 85% 60% / 0.5))' }} />
              <div className="flex items-center gap-2">
                <span className="text-green-400">Privacy Scrubbed</span>
                <span className="text-white/30">→</span>
                <span className="text-mait-cyan">Persona Applied</span>
                <span className="text-white/30">→</span>
                <span className="text-mait-cosmic">Truth Verified</span>
              </div>
              <div className="hidden lg:block flex-1 h-px" style={{ background: 'linear-gradient(to right, hsl(265 85% 60% / 0.5), hsl(142 71% 45% / 0.5))' }} />
              <div className="flex items-center gap-3">
                <span className="text-white/60">Response</span>
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
