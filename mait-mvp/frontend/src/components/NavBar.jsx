import { BrainCircuit, Home, BookOpen, FileText, Play, Lock, Menu, X, GraduationCap, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'

const NAV_ITEMS = [
    { id: 'landing', label: 'Home', icon: Home },
    { id: 'resources', label: 'AI Resources', icon: BookOpen },
    { id: 'worksheets', label: 'Worksheets', icon: FileText },
    { id: 'pastpapers', label: 'Past Papers', icon: GraduationCap },
    { id: 'demo', label: 'Free Demo', icon: Play },
]

export default function NavBar({ currentPage, navigate, onLoginClick, authUser, onLogout }) {
    const [mobileOpen, setMobileOpen] = useState(false)
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const isActive = (id) => currentPage === id

    return (
        <nav className={`fixed top-0 left-0 right-0 z-[999] transition-all duration-500 ${scrolled ? 'backdrop-blur-2xl border-b border-white/5 shadow-2xl bg-black/40' : 'bg-transparent'}`}>
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
                {/* Logo */}
                <button
                    onClick={() => navigate('landing')}
                    className="flex items-center group"
                >
                    <img
                        src="/mait-logo.png"
                        alt="MAIT Logo"
                        className="h-8 w-auto object-contain brightness-110"
                    />
                </button>

                {/* Desktop nav links */}
                <div className="hidden md:flex items-center gap-1">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon
                        const active = isActive(item.id)
                        return (
                            <button
                                key={item.id}
                                onClick={() => navigate(item.id)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display tracking-wide transition-all duration-200 ${active
                                    ? 'bg-primary/15 text-primary border border-primary/30'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-1 border border-transparent'
                                    }`}
                            >
                                <Icon size={14} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>

                {/* Right side: Auth + mobile menu toggle */}
                <div className="flex items-center gap-2">
                    {authUser ? (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('app')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display tracking-wide transition-all duration-200 border ${currentPage === 'app'
                                    ? 'bg-primary/15 text-primary border-primary/30'
                                    : 'text-foreground hover:text-primary border-surface-3 hover:border-primary/30'
                                    }`}
                            >
                                {authUser.picture ? (
                                    <img src={authUser.picture} alt="" className="w-4 h-4 rounded-full" referrerPolicy="no-referrer" />
                                ) : (
                                    <Lock size={12} />
                                )}
                                <span className="hidden sm:inline">{authUser.name?.split(' ')[0] || 'App'}</span>
                            </button>
                            <button
                                onClick={onLogout}
                                className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-surface-1"
                                title="Sign out"
                            >
                                <LogOut size={13} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={onLoginClick}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display tracking-wide transition-all duration-200 border ${currentPage === 'app'
                                ? 'bg-primary/15 text-primary border-primary/30'
                                : 'text-foreground hover:text-primary border-surface-3 hover:border-primary/30'
                                }`}
                        >
                            <Lock size={12} />
                            <span className="hidden sm:inline">Login</span>
                        </button>
                    )}

                    {/* Mobile hamburger */}
                    <button
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                </div>
            </div>

            {/* Mobile dropdown */}
            {mobileOpen && (
                <div className="md:hidden border-t border-surface-2 px-4 py-3 space-y-1 bg-background/95 backdrop-blur-xl">
                    {NAV_ITEMS.map(item => {
                        const Icon = item.icon
                        const active = isActive(item.id)
                        return (
                            <button
                                key={item.id}
                                onClick={() => { navigate(item.id); setMobileOpen(false); }}
                                className={`flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-display transition-all ${active
                                    ? 'bg-primary/15 text-primary'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-surface-1'
                                    }`}
                            >
                                <Icon size={16} />
                                {item.label}
                            </button>
                        )
                    })}
                </div>
            )}
        </nav>
    )
}
