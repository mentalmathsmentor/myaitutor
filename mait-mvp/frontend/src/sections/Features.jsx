import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  Brain, 
  UserCircle, 
  Heart, 
  MessageCircle,
  Sparkles,
  Zap,
  Eye,
  BarChart3,
  BookOpen,
  Clock,
  Coffee,
  Lightbulb
} from 'lucide-react';

export default function Features() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeFeature, setActiveFeature] = useState(0);

  const pillars = [
    {
      id: 'brain',
      icon: Brain,
      title: 'The Knowledge Engine',
      subtitle: 'The "Brain"',
      description: 'Syllabus-grounded AI with dynamic context loading and persistent memory for continuous learning journeys.',
      features: [
        { icon: BookOpen, text: 'RAG-powered syllabus alignment' },
        { icon: Zap, text: 'Dynamic context injection' },
        { icon: BarChart3, text: 'Topic mastery tracking' },
      ],
      color: 'from-blue-500 to-cyan-500',
      glowColor: 'shadow-blue-500/30',
    },
    {
      id: 'face',
      icon: UserCircle,
      title: 'The Avatar System',
      subtitle: 'The "Face"',
      description: 'Sims-4 level customization with interactive personas that emote in real-time based on conversation context.',
      features: [
        { icon: Sparkles, text: 'Full appearance customization' },
        { icon: MessageCircle, text: 'Dynamic emotional responses' },
        { icon: Lightbulb, text: 'Historical figure personas' },
      ],
      color: 'from-purple-500 to-pink-500',
      glowColor: 'shadow-purple-500/30',
    },
    {
      id: 'conscience',
      icon: Heart,
      title: 'The Wellness Engine',
      subtitle: 'The "Conscience"',
      description: 'Proactive wellness monitoring with fatigue detection, break reminders, and eye strain reduction.',
      features: [
        { icon: Eye, text: '20-20-20 rule enforcement' },
        { icon: Clock, text: 'Keystroke psychometrics' },
        { icon: Coffee, text: 'Mandatory break lockouts' },
      ],
      color: 'from-green-500 to-emerald-500',
      glowColor: 'shadow-green-500/30',
    },
  ];

  const additionalFeatures = [
    { icon: MessageCircle, title: 'Snap Interface', desc: 'Social messaging cues for lower activation energy' },
    { icon: Eye, title: 'Active Engagement', desc: 'Screen dims on inactivity—no vanity metrics' },
    { icon: BarChart3, title: 'EES Score', desc: 'Engagement Efficiency beyond time-on-screen' },
    { icon: Lightbulb, title: 'Guess-First', desc: 'Orchestrated latency for active recall' },
    { icon: Sparkles, title: 'TTS Control', desc: 'Granular text-to-speech with speed adjustment' },
    { icon: Zap, title: 'Multimodal', desc: 'Code-based diagrams via Matplotlib/Mermaid' },
  ];

  return (
    <section id="features" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <motion.div
          className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full bg-mait-cosmic/10 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity }}
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
            <Sparkles className="w-4 h-4 text-mait-cyan" />
            <span className="text-sm text-white/80">Core Feature Pillars</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Built for{' '}
            <span className="gradient-text">Deep Learning</span>
          </h2>
          
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Four interconnected pillars designed to create a learning environment 
            with zero friction and maximum engagement.
          </p>
        </motion.div>

        {/* Feature Pills Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-wrap justify-center gap-3 mb-12"
        >
          {pillars.map((pillar, index) => (
            <button
              key={pillar.id}
              onClick={() => setActiveFeature(index)}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all duration-300 ${
                activeFeature === index
                  ? `bg-gradient-to-r ${pillar.color} text-white shadow-lg ${pillar.glowColor}`
                  : 'glass-card text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <pillar.icon className="w-5 h-5" />
              <span className="font-medium">{pillar.title}</span>
            </button>
          ))}
        </motion.div>

        {/* Active Feature Display */}
        <motion.div
          key={activeFeature}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card-strong rounded-2xl p-8 lg:p-12 mb-16"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Content */}
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${pillars[activeFeature].color} mb-4`} style={{ opacity: 0.9 }}>
                {(() => {
                  const IconComponent = pillars[activeFeature].icon;
                  return <IconComponent className="w-4 h-4 text-white" />;
                })()}
                <span className="text-xs text-white font-medium">{pillars[activeFeature].subtitle}</span>
              </div>
              
              <h3 className="text-2xl lg:text-3xl font-bold text-white mb-4">
                {pillars[activeFeature].title}
              </h3>
              
              <p className="text-white/60 leading-relaxed mb-8">
                {pillars[activeFeature].description}
              </p>
              
              <div className="space-y-4">
                {pillars[activeFeature].features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${pillars[activeFeature].color} flex items-center justify-center flex-shrink-0`}>
                      <feature.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white/80">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Right - Visual */}
            <div className="relative">
              <div className={`absolute -inset-4 bg-gradient-to-r ${pillars[activeFeature].color} rounded-3xl blur-xl opacity-30`} />
              
              <div className="relative glass-card p-8 rounded-2xl">
                {/* Dynamic visual based on active feature */}
                {activeFeature === 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">NESA Syllabus</p>
                        <p className="text-xs text-white/40">Mathematics Advanced</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {['MA-F1 Working with Functions', 'MA-F2 Graphing Techniques', 'MA-T1 Trigonometry'].map((topic, i) => (
                        <div key={topic} className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                          <div className="w-2 h-2 rounded-full bg-green-400" />
                          <span className="text-sm text-white/70">{topic}</span>
                          <div className="ml-auto flex gap-1">
                            {[...Array(3)].map((_, j) => (
                              <div key={j} className={`w-2 h-2 rounded-full ${j <= i ? 'bg-green-400' : 'bg-white/20'}`} />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {activeFeature === 1 && (
                  <div className="text-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mx-auto mb-4 flex items-center justify-center">
                      <UserCircle className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-white font-medium mb-2">Your Custom Tutor</p>
                    <div className="flex justify-center gap-2 mb-4">
                      {['Hair', 'Eyes', 'Outfit', 'Voice'].map((trait) => (
                        <span key={trait} className="px-2 py-1 text-xs rounded bg-white/10 text-white/60">
                          {trait}
                        </span>
                      ))}
                    </div>
                    <div className="glass-card p-3 rounded-lg text-left">
                      <p className="text-sm text-white/70">"No wukkas, mate! Let's tackle this step by step."</p>
                    </div>
                  </div>
                )}
                
                {activeFeature === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/60">Fatigue Level</span>
                      <span className="text-green-400 font-mono">FRESH</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full w-1/4 bg-gradient-to-r from-green-500 to-green-400 rounded-full" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-3 rounded-lg text-center">
                        <Eye className="w-5 h-5 text-mait-cyan mx-auto mb-1" />
                        <p className="text-xs text-white/60">20-20-20</p>
                      </div>
                      <div className="glass-card p-3 rounded-lg text-center">
                        <Coffee className="w-5 h-5 text-mait-cyan mx-auto mb-1" />
                        <p className="text-xs text-white/60">Break Soon</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Additional Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <h3 className="text-xl font-bold text-white text-center mb-8">
            Additional Capabilities
          </h3>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {additionalFeatures.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.4, delay: 0.6 + index * 0.05 }}
                className="glass-card p-5 rounded-xl group hover:border-mait-cyan/50 transition-colors"
              >
                <feature.icon className="w-6 h-6 text-mait-cyan mb-3 group-hover:scale-110 transition-transform" />
                <h4 className="text-white font-medium mb-1">{feature.title}</h4>
                <p className="text-sm text-white/50">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
