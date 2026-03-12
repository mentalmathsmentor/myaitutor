import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Cpu, 
  Cloud, 
  Shield, 
  Eye,
  Code,
  Database,
  Lock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

export default function Architecture() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeTab, setActiveTab] = useState('stack');

  const tabs = [
    { id: 'stack', label: 'Tech Stack', icon: Code },
    { id: 'privacy', label: 'Privacy', icon: Lock },
    { id: 'pedagogy', label: 'Pedagogy', icon: Sparkles },
  ];

  const techStack = [
    {
      layer: 'Client',
      icon: Eye,
      techs: ['React + Vite', 'TypeScript', 'Tailwind CSS', 'WebGPU'],
      color: 'from-blue-500 to-cyan-500',
    },
    {
      layer: 'Edge',
      icon: Cpu,
      techs: ['Gemma 2B', 'MediaPipe', 'Transformers.js', 'Local Vector Store'],
      color: 'from-mait-cosmic to-purple-500',
    },
    {
      layer: 'Cloud',
      icon: Cloud,
      techs: ['Gemini 3.0 Pro', 'FastAPI', 'ChromaDB', 'LaTeX Compiler'],
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const privacyFeatures = [
    {
      title: 'Local PII Scrubbing',
      description: 'Names, school logos, and faces are redacted on-device before cloud transmission.',
      icon: Shield,
      color: 'text-green-400',
    },
    {
      title: 'Zero Data Retention',
      description: 'All cloud interactions are ephemeral—no data is stored for model training.',
      icon: Database,
      color: 'text-mait-cyan',
    },
    {
      title: 'Consent-Based Fallback',
      description: 'If WebGPU is unavailable, users must explicitly consent to cloud processing.',
      icon: CheckCircle2,
      color: 'text-blue-400',
    },
  ];

  const pedagogicalFeatures = [
    {
      title: 'Active Retrieval Blur',
      description: 'Formulas are blurred until tapped, forcing shape recognition before full reveal.',
      icon: Eye,
      color: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Guess-First Protocol',
      description: 'Students must attempt an answer before the AI reveals the solution.',
      icon: Zap,
      color: 'from-mait-cosmic to-mait-cyan',
    },
    {
      title: 'Feynman Mode',
      description: 'AI simulates a novice student, challenging the user to teach the concept.',
      icon: Sparkles,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  return (
    <section id="architecture" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mait-cosmic/30 to-transparent" />
        <motion.div
          className="absolute top-1/3 left-0 w-[500px] h-[500px] rounded-full bg-mait-cosmic/5 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
          }}
          transition={{ duration: 15, repeat: Infinity }}
        />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6"
          >
            <Code className="w-4 h-4 text-mait-cyan" />
            <span className="text-sm text-white/80">Technical Architecture</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            The{' '}
            <span className="gradient-text">Nervous System</span>
          </h2>
          
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            A split-stack architecture that decouples Emotional Intelligence (Local) 
            from Raw Compute (Cloud).
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-mait-cosmic to-mait-violet text-white shadow-neon-purple'
                  : 'glass-card text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </motion.div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card-strong rounded-2xl p-8 lg:p-12"
        >
          {activeTab === 'stack' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Hybrid Edge-Cloud Stack</h3>
                <p className="text-white/60">Leveraging WebGPU and the latest Gemini capabilities</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {techStack.map((layer, index) => (
                  <motion.div
                    key={layer.layer}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="glass-card p-6 rounded-xl"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center mb-4`}>
                      <layer.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-4">{layer.layer}</h4>
                    <ul className="space-y-2">
                      {layer.techs.map((tech) => (
                        <li key={tech} className="flex items-center gap-2 text-sm text-white/60">
                          <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${layer.color}`} />
                          {tech}
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                ))}
              </div>
              
              {/* Data Flow */}
              <div className="glass-card p-6 rounded-xl mt-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-blue-400" />
                    <span className="text-white/60">User Input</span>
                  </div>
                  <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-blue-400 via-mait-cosmic to-green-400" />
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400">OCR</span>
                    <span className="text-white/30">→</span>
                    <span className="text-mait-cyan">Scrub</span>
                    <span className="text-white/30">→</span>
                    <span className="text-mait-cosmic">Process</span>
                    <span className="text-white/30">→</span>
                    <span className="text-green-400">Respond</span>
                  </div>
                  <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-green-400 to-blue-400" />
                  <div className="flex items-center gap-3">
                    <span className="text-white/60">Output</span>
                    <MessageIcon />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">The Privacy Airlock</h3>
                <p className="text-white/60">Zero PII leaves the browser. Ever.</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {privacyFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="glass-card p-6 rounded-xl"
                  >
                    <feature.icon className={`w-10 h-10 ${feature.color} mb-4`} />
                    <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                    <p className="text-white/60 text-sm">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
              
              {/* Privacy Alert Example */}
              <div className="glass-card p-6 rounded-xl border border-red-500/30 bg-red-500/5">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="text-white font-medium mb-2">PII Detection Example</h4>
                    <p className="text-white/60 text-sm mb-4">
                      If a student accidentally uploads an image containing a credit card number, 
                      the local SLM immediately blocks the transmission.
                    </p>
                    <div className="glass-card p-4 rounded-lg font-mono text-sm">
                      <p className="text-red-400">System_Alert: PII_DETECTED_CREDIT_CARD</p>
                      <p className="text-white/70 mt-2">
                        "Whoa! I see a credit card number in that pic. I can't send that to the 
                        cloud—privacy first! Crop that out and try again?"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pedagogy' && (
            <div className="space-y-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">High-Impact Teaching</h3>
                <p className="text-white/60">Pedagogical strategies embedded in the architecture</p>
              </div>
              
              <div className="grid md:grid-cols-3 gap-6">
                {pedagogicalFeatures.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.1 }}
                    className="glass-card p-6 rounded-xl"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-white mb-2">{feature.title}</h4>
                    <p className="text-white/60 text-sm">{feature.description}</p>
                  </motion.div>
                ))}
              </div>
              
              {/* Bloom's Taxonomy */}
              <div className="glass-card p-6 rounded-xl">
                <h4 className="text-white font-medium mb-4">Bloom's Taxonomy Integration</h4>
                <div className="flex flex-wrap gap-2">
                  {['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'].map((level, index) => (
                    <div
                      key={level}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        index <= 2 
                          ? 'bg-green-500/20 text-green-400' 
                          : index <= 4 
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {level}
                    </div>
                  ))}
                </div>
                <p className="text-white/50 text-sm mt-4">
                  MAIT guides students through each level, adjusting question complexity 
                  based on demonstrated mastery.
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Bottom Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12"
        >
          {[
            { value: '<1s', label: 'Local Response' },
            { value: '2-4s', label: 'Cloud Response' },
            { value: '100%', label: 'Privacy Compliant' },
            { value: '0', label: 'Data Retention' },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={isInView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
              className="glass-card p-4 rounded-xl text-center"
            >
              <div className="text-2xl font-bold gradient-text">{stat.value}</div>
              <div className="text-xs text-white/50">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function MessageIcon() {
  return (
    <div className="w-8 h-8 rounded-full bg-mait-cosmic/20 flex items-center justify-center">
      <svg className="w-4 h-4 text-mait-cosmic" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    </div>
  );
}
