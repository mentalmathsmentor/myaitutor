import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  FileText, 
  Menu, 
  X,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Section } from '../App';

interface NavigationProps {
  currentSection: Section;
  setCurrentSection: (section: Section) => void;
  scrollToSection: (sectionId: string) => void;
}

export default function Navigation({ 
  currentSection, 
  setCurrentSection,
  scrollToSection 
}: NavigationProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Navigation items for future use
  // const navItems = [
  //   { id: 'landing', label: 'Home', icon: Sparkles },
  //   { id: 'worksheet-studio', label: 'Worksheet Studio', icon: FileText },
  // ];

  const scrollItems = [
    { id: 'problem', label: 'The Problem' },
    { id: 'solution', label: 'The Solution' },
    { id: 'demo', label: 'A.G.E. Demo' },
    { id: 'features', label: 'Features' },
    { id: 'architecture', label: 'Architecture' },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled 
            ? 'bg-mait-space/80 backdrop-blur-xl border-b border-white/10' 
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.button
              onClick={() => {
                setCurrentSection('landing');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mait-cosmic to-mait-cyan flex items-center justify-center shadow-neon-purple">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-xl bg-mait-cosmic/50"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-lg font-bold gradient-text">MAIT</span>
                <span className="text-xs text-white/50 block -mt-1">My AI Tutor</span>
              </div>
            </motion.button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {currentSection === 'landing' && scrollItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5"
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setCurrentSection('worksheet-studio')}
                className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                  currentSection === 'worksheet-studio'
                    ? 'bg-mait-cyan/20 text-mait-cyan border border-mait-cyan/50'
                    : 'bg-gradient-to-r from-mait-cosmic to-mait-violet text-white hover:shadow-neon-purple'
                }`}
              >
                <FileText className="w-4 h-4" />
                Worksheet Studio
                <ChevronRight className="w-4 h-4" />
              </Button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-16 z-40 lg:hidden"
          >
            <div className="mx-4 mt-2 p-4 rounded-2xl glass-card-strong">
              <div className="space-y-2">
                {currentSection === 'landing' && scrollItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      scrollToSection(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    {item.label}
                  </button>
                ))}
                
                <div className="border-t border-white/10 my-2" />
                
                <button
                  onClick={() => {
                    setCurrentSection('worksheet-studio');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-mait-cyan hover:bg-mait-cyan/10 rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Worksheet Studio
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
