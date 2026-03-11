import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Clock, AlertTriangle, BrainCircuit, FileX, TrendingDown, Users } from 'lucide-react'

export default function ProblemSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  const problems = [
    {
      icon: Clock,
      title: '10+ Hours Weekly',
      description: 'Teachers spend over 10 hours each week on low-leverage administrative tasks like formatting worksheets and creating vector diagrams.',
      stat: '67%', statLabel: 'of prep time wasted',
      color: 'from-red-500/20 to-orange-500/20', iconColor: 'text-red-400',
    },
    {
      icon: AlertTriangle,
      title: 'Data Sovereignty Crisis',
      description: 'Generic AI tools expose schools to severe child-protection and data-privacy liabilities when students input PII.',
      stat: '100%', statLabel: 'of schools at risk',
      color: 'from-yellow-500/20 to-red-500/20', iconColor: 'text-yellow-400',
    },
    {
      icon: BrainCircuit,
      title: 'Digital Fatigue',
      description: 'Traditional EdTech optimizes for "time-on-screen," ignoring cognitive overload and exacerbating student burnout.',
      stat: '78%', statLabel: 'students report fatigue',
      color: 'from-purple-500/20 to-pink-500/20', iconColor: 'text-purple-400',
    },
  ]

  const painPoints = [
    { icon: FileX, text: 'Inconsistent formatting across worksheets' },
    { icon: TrendingDown, text: 'Vanity metrics mask actual learning' },
    { icon: Users, text: 'One-size-fits-all ignores individual needs' },
  ]

  return (
    <section id="problem" className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <motion.div
          className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-red-500/5 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
      </div>

      <div ref={ref} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-16">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-6">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm text-white/80">The Institutional Bottleneck</span>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            Schools Face a <span className="text-red-400">Three-Front Crisis</span>
          </h2>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            In the age of generative AI, NSW schools are struggling with data risks, teacher burnout, and student digital fatigue.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 mb-16">
          {problems.map((problem, index) => (
            <motion.div key={problem.title} initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: index * 0.15 }} className="group">
              <div className="glass-card-strong p-6 lg:p-8 rounded-2xl h-full feature-card relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${problem.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <problem.icon className={`w-7 h-7 ${problem.iconColor}`} />
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-bold text-white">{problem.stat}</span>
                    <span className="text-sm text-white/50 ml-2">{problem.statLabel}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-3">{problem.title}</h3>
                  <p className="text-white/60 leading-relaxed">{problem.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.5 }} className="glass-card-strong rounded-2xl p-8">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="lg:w-1/2">
              <h3 className="text-2xl font-bold text-white mb-4">The Hidden Cost of "Free" Tools</h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                While generic AI tools promise efficiency, they create new problems: inconsistent curriculum alignment, privacy vulnerabilities, and a one-size-fits-all approach that fails diverse learners.
              </p>
              <div className="flex flex-wrap gap-3">
                {painPoints.map((point, index) => (
                  <motion.div key={point.text} initial={{ opacity: 0, scale: 0.9 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.4, delay: 0.7 + index * 0.1 }} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5">
                    <point.icon className="w-4 h-4 text-mait-cyan" />
                    <span className="text-sm text-white/70">{point.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="lg:w-1/2">
              <div className="glass-card p-6 rounded-xl space-y-4">
                {[
                  { label: 'Teacher Workload', status: 'CRITICAL', color: 'text-red-400', bar: 'from-orange-500 to-red-500', width: '92%' },
                  { label: 'Student Engagement', status: 'DECLINING', color: 'text-yellow-400', bar: 'from-yellow-500 to-orange-500', width: '45%' },
                  { label: 'Data Security', status: 'AT RISK', color: 'text-red-400', bar: 'from-red-500 to-red-600', width: '78%' },
                ].map((item, i) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white/60">{item.label}</span>
                      <span className={`font-mono text-sm ${item.color}`}>{item.status}</span>
                    </div>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={isInView ? { width: item.width } : {}} transition={{ duration: 1.5, delay: 0.8 + i * 0.2 }} className={`h-full bg-gradient-to-r ${item.bar} rounded-full`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
