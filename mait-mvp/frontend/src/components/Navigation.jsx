import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, 
  FileText, 
  Menu, 
  X,
  ChevronRight,
  Home, 
  BookOpen, 
  Play, 
  Lock, 
  GraduationCap, 
  LogOut
} from 'lucide-react';

const NAV_ITEMS = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'resources', label: 'AI Resources', icon: BookOpen },
    { id: 'worksheets', label: 'Worksheets', icon: FileText },
    { id: 'pastpapers', label: 'Past Papers', icon: GraduationCap },
    { id: 'demo', label: 'Free Demo', icon: Play },
]

export default function Navigation({ 
  currentPage, 
  navigate,
  onLoginClick,
  authUser,
  onLogout,
  scrollToSection 
}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);


  const isOnLanding = currentPage === 'landing';

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-500 ${
          isScrolled 
            ? 'bg-mait-space/82 backdrop-blur-xl border-b border-white/10 shadow-2xl'
            : 'bg-mait-space/70 backdrop-blur-xl border-b border-white/5'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.button
              onClick={() => {
                navigate('landing');
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
              <div className="hidden sm:block text-left">
                <span className="text-lg font-bold gradient-text">MAIT</span>
                <span className="text-xs text-white/50 block -mt-1">My AI Tutor</span>
              </div>
            </motion.button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'landing' && isOnLanding) {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        navigate(item.id);
                      }
                    }}
                    className={`px-4 py-2 text-sm transition-all duration-200 rounded-lg ${
                      active
                        ? 'text-mait-cyan bg-mait-cyan/10 border border-mait-cyan/20'
                        : 'text-white/70 hover:text-white hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            {/* Right side: Auth + CTA + Mobile Toggle */}
            <div className="flex items-center gap-3">
              {/* Auth Button */}
              {authUser ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('app')}
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all duration-200 border ${
                      currentPage === 'app'
                        ? 'bg-mait-cyan/15 text-mait-cyan border-mait-cyan/30'
                        : 'text-white/70 hover:text-white border-white/10 hover:border-white/30 hover:bg-white/5'
                    }`}
                  >
                    {authUser.picture ? (
                      <img src={authUser.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <Lock size={14} />
                    )}
                    <span>{authUser.name?.split(' ')[0] || 'App'}</span>
                  </button>
                  <button
                    onClick={onLogout}
                    className="hidden sm:flex p-2 text-white/50 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5"
                    title="Sign out"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onLoginClick}
                  className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm transition-all duration-200 text-white/70 hover:text-white border border-white/10 hover:border-white/30 hover:bg-white/5"
                >
                  <Lock size={14} />
                  <span>Login</span>
                </button>
              )}

              {/* Worksheet CTA Button */}
              <button
                onClick={() => navigate('worksheets')}
                className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 ${
                  currentPage === 'worksheets'
                    ? 'bg-mait-cyan/20 text-mait-cyan border border-mait-cyan/50'
                    : 'bg-gradient-to-r from-mait-cosmic to-mait-violet text-white hover:shadow-neon-purple'
                }`}
              >
                <FileText className="w-4 h-4" />
                Worksheet Studio
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
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
            className="fixed inset-x-0 top-16 z-[990] lg:hidden"
          >
            <div className="mx-4 mt-2 p-4 rounded-2xl glass-card-strong bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
              <div className="space-y-2">
                {/* Mobile Navigation Links */}
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const active = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
                        active
                          ? 'bg-mait-cyan/20 text-mait-cyan'
                          : 'text-white/80 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
                
                <div className="border-t border-white/10 my-4" />
                
                {/* Mobile Auth & CTA */}
                {authUser ? (
                  <>
                    <button
                      onClick={() => { navigate('app'); setIsMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3"
                    >
                      {authUser.picture ? (
                        <img src={authUser.picture} alt="" className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <Lock size={16} />
                      )}
                      {authUser.name?.split(' ')[0] || 'App'}
                    </button>
                    <button
                      onClick={() => { onLogout(); setIsMobileMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left text-red-400 hover:bg-red-400/10 rounded-lg transition-colors flex items-center gap-3"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { onLoginClick(); setIsMobileMenuOpen(false); }}
                    className="w-full px-4 py-3 text-left text-white hover:bg-white/5 rounded-lg transition-colors flex items-center gap-3"
                  >
                    <Lock size={16} />
                    Login
                  </button>
                )}

                <button
                  onClick={() => {
                    navigate('worksheets');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full mt-2 px-4 py-3 bg-gradient-to-r from-mait-cosmic to-mait-violet text-white hover:shadow-neon-purple rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <FileText className="w-5 h-5" />
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
