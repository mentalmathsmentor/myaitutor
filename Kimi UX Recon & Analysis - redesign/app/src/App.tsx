import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Navigation from './components/Navigation';
import Hero from './sections/Hero';
import ProblemSection from './sections/ProblemSection';
import SolutionSection from './sections/SolutionSection';
import AGEDemo from './sections/AGEDemo';
import Features from './sections/Features';
import Architecture from './sections/Architecture';
import WorksheetStudio from './sections/WorksheetStudio';
import Footer from './sections/Footer';
import './App.css';

export type Section = 'landing' | 'worksheet-studio' | 'about';

function App() {
  const [currentSection, setCurrentSection] = useState<Section>('landing');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-mait-space flex items-center justify-center z-50">
        <div className="relative">
          {/* Animated Logo */}
          <motion.div
            className="w-24 h-24 rounded-2xl bg-gradient-to-br from-mait-cosmic to-mait-cyan flex items-center justify-center"
            animate={{
              scale: [1, 1.1, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <span className="text-4xl font-bold text-white">M</span>
          </motion.div>
          
          {/* Orbiting dots */}
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute -top-2 left-1/2 w-3 h-3 rounded-full bg-mait-cyan shadow-neon-cyan" />
          </motion.div>
          
          <motion.div
            className="absolute inset-0"
            animate={{ rotate: -360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <div className="absolute -bottom-2 left-1/2 w-2 h-2 rounded-full bg-mait-cosmic shadow-neon-purple" />
          </motion.div>
          
          <motion.p
            className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-mait-cyan font-mono text-sm whitespace-nowrap"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            Initializing MAIT...
          </motion.p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mait-space cosmic-gradient text-white overflow-x-hidden">
      <Navigation 
        currentSection={currentSection} 
        setCurrentSection={setCurrentSection}
        scrollToSection={scrollToSection}
      />
      
      <AnimatePresence mode="wait">
        {currentSection === 'landing' && (
          <motion.main
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Hero scrollToSection={scrollToSection} />
            <ProblemSection />
            <SolutionSection />
            <AGEDemo />
            <Features />
            <Architecture />
            <Footer setCurrentSection={setCurrentSection} />
          </motion.main>
        )}
        
        {currentSection === 'worksheet-studio' && (
          <motion.main
            key="worksheet-studio"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <WorksheetStudio setCurrentSection={setCurrentSection} />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
