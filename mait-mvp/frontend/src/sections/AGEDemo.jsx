import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { 
  FileText, 
  Clock, 
  Sparkles,
  CheckCircle2,
  Download,
  Calculator,
  BookOpen,
  GraduationCap
} from 'lucide-react';

export default function AGEDemo({ navigate }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      number: '01',
      title: 'Select Curriculum',
      description: 'Choose Year, Subject, and specific syllabus outcomes from the NESA database.',
      icon: GraduationCap,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      number: '02',
      title: 'Configure Parameters',
      description: 'Set question count, difficulty spread, and pedagogical drill types.',
      icon: Calculator,
      color: 'from-mait-cosmic to-purple-500',
    },
    {
      number: '03',
      title: 'Generate & Export',
      description: 'LaTeX compiles into a print-ready PDF with answer key in under a second.',
      icon: Download,
      color: 'from-green-500 to-emerald-500',
    },
  ];

  const features = [
    { icon: CheckCircle2, text: 'Vector-perfect TikZ diagrams' },
    { icon: CheckCircle2, text: 'NESA-exam styling' },
    { icon: CheckCircle2, text: 'Auto-generated answer keys' },
    { icon: CheckCircle2, text: 'Differentiated difficulty levels' },
  ];

  const timeComparison = [
    { label: 'Traditional', time: '4 hours', color: 'bg-red-500', width: '100%' },
    { label: 'MAIT A.G.E.', time: '45 seconds', color: 'bg-green-500', width: '5%' },
  ];

  return (
    <section id="demo" className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-mait-cyan/30 to-transparent" />
        <motion.div
          className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-mait-cyan/5 blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 10, repeat: Infinity }}
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
            <span className="text-sm text-white/80">The A.G.E. Pipeline</span>
          </motion.div>
          
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6">
            From{' '}
            <span className="text-red-400">4 Hours</span>
            {' '}to{' '}
            <span className="text-green-400">45 Seconds</span>
          </h2>
          
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            The Artifact Generation Engine transforms worksheet preparation from a 
            tedious chore into a single click.
          </p>
        </motion.div>

        {/* Time Comparison Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="glass-card-strong rounded-2xl p-8 mb-12"
        >
          <div className="flex items-center justify-between mb-6">
            <span className="text-white/60">Worksheet Preparation Time</span>
            <Clock className="w-5 h-5 text-mait-cyan" />
          </div>
          
          <div className="space-y-4">
            {timeComparison.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -20 }}
                animate={isInView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.4 + index * 0.2 }}
                className="relative"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium">{item.label}</span>
                  <span className={`font-mono font-bold ${index === 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {item.time}
                  </span>
                </div>
                <div className="h-4 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={isInView ? { width: item.width } : {}}
                    transition={{ duration: 1.5, delay: 0.6 + index * 0.2, ease: "easeOut" }}
                    className={`h-full ${item.color} rounded-full`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.5, delay: 1 }}
            className="mt-6 text-center"
          >
            <span className="text-3xl font-bold gradient-text">320x Faster</span>
            <span className="text-white/60 ml-2">than traditional methods</span>
          </motion.div>
        </motion.div>

        {/* 3-Step Process */}
        <div className="grid lg:grid-cols-3 gap-6 mb-12">
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.3 + index * 0.15 }}
              onMouseEnter={() => setActiveStep(index)}
              className="group cursor-pointer"
            >
              <div className={`glass-card-strong p-6 rounded-2xl h-full transition-all duration-300 ${
                activeStep === index ? 'border-mait-cyan/50 shadow-neon-cyan' : ''
              }`}>
                {/* Step Number */}
                <div className="flex items-center justify-between mb-6">
                  <span className={`text-4xl font-bold bg-gradient-to-r ${step.color} bg-clip-text text-transparent`}>
                    {step.number}
                  </span>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-white/60 leading-relaxed">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* PDF Preview Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="glass-card-strong rounded-2xl p-8"
        >
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left - Features */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-4">
                Exam-Ready Output
              </h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                Every generated worksheet mimics the exact font, layout, and styling 
                of official NESA HSC examinations. Students build psychological 
                familiarity with the real exam format.
              </p>
              
              <div className="grid sm:grid-cols-2 gap-4">
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.text}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: 0.9 + index * 0.1 }}
                    className="flex items-center gap-3"
                  >
                    <feature.icon className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-white/70">{feature.text}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            
            {/* Right - PDF Preview */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-mait-cosmic/20 to-mait-cyan/20 rounded-3xl blur-xl" />
              
              <div className="relative bg-white rounded-lg shadow-2xl overflow-hidden transform rotate-1 hover:rotate-0 transition-transform duration-500 aspect-[1/1.414] group-hover:scale-[1.02]">
                {/* PDF Header overlay */}
                <div className="absolute top-0 left-0 right-0 bg-gray-100 px-4 py-2 border-b border-gray-200 flex items-center gap-2 z-10 opacity-70 group-hover:opacity-100 transition-opacity">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <span className="ml-4 text-[10px] text-gray-500 font-mono">Universal Worksheet.pdf</span>
                </div>
                
                {/* PDF Content */}
                <object
                  data="/Universal_Worksheet.pdf#toolbar=0&navpanes=0&scrollbar=0"
                  type="application/pdf"
                  className="w-full h-full border-none"
                  aria-label="Universal Worksheet Preview"
                >
                  <div className="flex h-full items-center justify-center bg-white p-6 text-center text-gray-700">
                    Preview unavailable. Open <a href="/Universal_Worksheet.pdf" target="_blank" rel="noreferrer" className="ml-1 underline">Universal Worksheet.pdf</a>.
                  </div>
                </object>
              </div>
              
              {/* Floating Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="absolute -bottom-4 -right-4 glass-card-strong px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <FileText className="w-4 h-4 text-mait-cyan" />
                <span className="text-sm text-white/80">LaTeX → PDF</span>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 1 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => navigate('worksheets')}
            className="btn-cosmic text-white px-8 py-4 text-base rounded-xl inline-flex items-center gap-2"
          >
            <BookOpen className="w-5 h-5" />
            Try the Worksheet Studio
            <Sparkles className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
}
