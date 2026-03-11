import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, FileText, Menu, X, ChevronRight, LogOut, User } from 'lucide-react'

export default function Navigation({
  currentPage,
  navigate,
  onLoginClick,
  authUser,
  onLogout,
  scrollToSection,
}) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on page change
  useEffect(() => { setIsMobileMenuOpen(false) }, [currentPage])

  const isOnLanding = currentPage === 'landing'

  const scrollItems = [
    { id: 'problem', label: 'The Problem' },
    { id: 'solution', label: 'The Solution' },
    { id: 'demo', label: 'A.G.E. Demo' },
    { id: 'features', label: 'Features' },
    { id: 'architecture', label: 'Architecture' },
  ]

  const pageLinks = [
    { id: 'worksheets', label: 'Worksheet Studio', icon: FileText },
  ]

  const handleNav = (id) => {
    navigate(id)
    setIsMobileMenuOpen(false)
  }

  const handleScroll = (id) => {
    if (scrollToSection) scrollToSection(id)
    setIsMobileMenuOpen(false)
  }

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          isScrolled ? 'backdrop-blur-xl border-b border-white/10' : 'bg-transparent'
        }`}
        style={isScrolled ? { background: 'hsl(230 25% 5% / 0.8)' } : {}}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <motion.button
              onClick={() => { navigate('landing'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              className="flex items-center gap-3 group"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-neon-purple" style={{ background: 'linear-gradient(135deg, hsl(265 85% 60%), hsl(180 85% 55%))' }}>
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-xl"
                  style={{ background: 'hsl(265 85% 60% / 0.5)' }}
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
              {isOnLanding && scrollItems.map(item => (
                <button key={item.id} onClick={() => handleScroll(item.id)} className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  {item.label}
                </button>
              ))}
              {pageLinks.map(link => (
                <button
                  key={link.id}
                  onClick={() => handleNav(link.id)}
                  className={`px-4 py-2 text-sm transition-colors rounded-lg flex items-center gap-1.5 ${currentPage === link.id ? 'text-mait-cyan bg-mait-cyan/10' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                >
                  <link.icon className="w-3.5 h-3.5" />
                  {link.label}
                </button>
              ))}
            </div>

            {/* Right Side: Auth + Hamburger */}
            <div className="flex items-center gap-3">
              {authUser ? (
                <div className="relative hidden sm:block">
                  <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="flex items-center gap-2 px-3 py-2 rounded-xl glass-card hover:bg-white/10 transition-colors">
                    {authUser.picture ? (
                      <img src={authUser.picture} alt="" className="w-7 h-7 rounded-full" />
                    ) : (
                      <User className="w-5 h-5 text-mait-cyan" />
                    )}
                    <span className="text-sm text-white/80 max-w-[100px] truncate">{authUser.name || authUser.email}</span>
                  </button>
                  <AnimatePresence>
                    {showProfileMenu && (
                      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="absolute right-0 top-full mt-2 glass-card-strong rounded-xl p-2 min-w-[160px]">
                        <button onClick={() => { onLogout && onLogout(); setShowProfileMenu(false) }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                          <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <button
                  onClick={onLoginClick}
                  className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 text-white`}
                  style={{ background: 'linear-gradient(to right, hsl(265 85% 60%), hsl(270 100% 65%))' }}
                >
                  Full Access
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}

              {/* Worksheets CTA (always visible on desktop) */}
              <button
                onClick={() => handleNav('worksheets')}
                className={`hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all duration-300 text-sm ${
                  currentPage === 'worksheets'
                    ? 'text-mait-cyan border border-mait-cyan/50 bg-mait-cyan/10'
                    : 'border border-white/20 text-white/80 hover:bg-white/10'
                }`}
              >
                <FileText className="w-4 h-4" />
                Studio
              </button>

              {/* Mobile Menu Button */}
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors">
                {isMobileMenuOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
              </button>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} className="fixed inset-x-0 top-16 z-40 lg:hidden">
            <div className="mx-4 mt-2 p-4 rounded-2xl glass-card-strong">
              <div className="space-y-1">
                {isOnLanding && scrollItems.map(item => (
                  <button key={item.id} onClick={() => handleScroll(item.id)} className="w-full px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm">
                    {item.label}
                  </button>
                ))}
                <div className="border-t border-white/10 my-2" />
                <button onClick={() => handleNav('worksheets')} className="w-full flex items-center gap-2 px-4 py-3 text-left text-mait-cyan hover:bg-mait-cyan/10 rounded-lg transition-colors text-sm">
                  <FileText className="w-4 h-4" />
                  Worksheet Studio
                </button>
                {authUser ? (
                  <button onClick={() => { onLogout && onLogout(); setIsMobileMenuOpen(false) }} className="w-full flex items-center gap-2 px-4 py-3 text-left text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-sm">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                ) : (
                  <button onClick={() => { onLoginClick && onLoginClick(); setIsMobileMenuOpen(false) }} className="w-full flex items-center gap-2 px-4 py-3 text-left text-white hover:bg-white/10 rounded-lg transition-colors text-sm font-medium" style={{ background: 'linear-gradient(to right, hsl(265 85% 60% / 0.2), hsl(180 85% 55% / 0.2))' }}>
                    Full Access <ChevronRight className="w-4 h-4 ml-auto" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
