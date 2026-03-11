import { useRef, useState, useEffect } from 'react'
import { motion, useInView } from 'framer-motion'
import { Brain, Mail, ExternalLink, Github, Twitter, Linkedin, Sparkles, Heart } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

export default function Footer({ navigate }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [visitorCount, setVisitorCount] = useState(null)

  // Production: POST /visit on mount to get visitor count
  useEffect(() => {
    fetch(`${API_URL}/visit`, { method: 'POST' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.count) setVisitorCount(data.count) })
      .catch(() => {})
  }, [])

  const handleSubscribe = async (e) => {
    e.preventDefault()
    if (!email) return
    try {
      const res = await fetch(`${API_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSubscribed(true)
        setEmail('')
      }
    } catch {}
  }

  const handleProductLink = (action, href) => {
    if (action) { action() } else if (href?.startsWith('#')) { document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' }) } else if (href) { window.location.href = href }
  }

  const links = {
    product: [
      { label: 'Worksheet Studio', action: () => navigate && navigate('worksheets') },
      { label: 'Features', href: '#features' },
      { label: 'Architecture', href: '#architecture' },
      { label: 'A.G.E. Demo', href: '#demo' },
    ],
    resources: [
      { label: 'NESA Syllabus', href: 'https://educationstandards.nsw.edu.au', external: true },
      { label: 'AI Resources', action: () => navigate && navigate('resources') },
      { label: 'Past Papers', action: () => navigate && navigate('pastpapers') },
    ],
    company: [
      { label: 'Privacy Policy', action: () => navigate && navigate('privacy') },
      { label: 'Contact', href: 'mailto:darayat.chowdhury@student.unsw.edu.au' },
    ],
  }

  return (
    <footer ref={ref} className="relative py-16 lg:py-24 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 rounded-full blur-3xl" style={{ background: 'hsl(265 85% 60% / 0.05)' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CTA + Waitlist */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="glass-card-strong rounded-2xl p-8 lg:p-12 mb-16 text-center">
          <motion.div initial={{ scale: 0.9 }} animate={isInView ? { scale: 1 } : {}} transition={{ duration: 0.5, delay: 0.1 }} className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-neon-purple" style={{ background: 'linear-gradient(135deg, hsl(265 85% 60%), hsl(180 85% 55%))' }}>
            <Sparkles className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
            Ready to Transform<br /><span className="gradient-text">Your Teaching Workflow?</span>
          </h2>
          <p className="text-white/60 max-w-xl mx-auto mb-8">
            Join the 2026 Pilot Program and be among the first to experience the Sovereign Educational AI platform.
          </p>

          {/* Waitlist form (from production) */}
          {subscribed ? (
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl glass-card-strong text-mait-cyan font-medium">
              <Sparkles className="w-5 h-5" />
              You're on the waitlist! 🎉
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@school.edu.au"
                className="input-base flex-1 text-sm"
                required
              />
              <button type="submit" className="btn-cosmic px-6 py-3 rounded-xl whitespace-nowrap">
                Join Waitlist
              </button>
            </form>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <button onClick={() => navigate && navigate('worksheets')} className="btn-cosmic px-8 py-4 rounded-xl flex items-center justify-center gap-2">
              <Brain className="w-5 h-5" />
              Try Worksheet Studio
            </button>
            <a href="mailto:darayat.chowdhury@student.unsw.edu.au" className="btn-glass px-8 py-4 rounded-xl flex items-center justify-center gap-2">
              <Mail className="w-5 h-5" />
              Contact for Pilot
            </a>
          </div>

          {visitorCount && (
            <p className="text-white/30 text-xs mt-6">
              {visitorCount.toLocaleString()} educators have visited
            </p>
          )}
        </motion.div>

        {/* Footer Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }} className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, hsl(265 85% 60%), hsl(180 85% 55%))' }}>
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div><span className="text-lg font-bold gradient-text">MAIT</span><span className="text-xs text-white/50 block -mt-1">My AI Tutor</span></div>
            </div>
            <p className="text-white/50 text-sm mb-4">The Sovereign Educational AI platform for NSW HSC students and educators.</p>
            <div className="flex gap-3">
              {[{ icon: Twitter, href: '#' }, { icon: Linkedin, href: '#' }, { icon: Github, href: 'https://github.com/darayeet', external: true }].map((social, index) => (
                <a key={index} href={social.href} target={social.external ? '_blank' : undefined} rel={social.external ? 'noopener noreferrer' : undefined} className="w-9 h-9 rounded-lg glass-card flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-white font-medium mb-4">Product</h4>
            <ul className="space-y-2">
              {links.product.map(link => (
                <li key={link.label}>
                  <button onClick={() => handleProductLink(link.action, link.href)} className="text-white/50 hover:text-white text-sm transition-colors text-left">
                    {link.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-white font-medium mb-4">Resources</h4>
            <ul className="space-y-2">
              {links.resources.map(link => (
                <li key={link.label}>
                  {link.action ? (
                    <button onClick={link.action} className="text-white/50 hover:text-white text-sm transition-colors">
                      {link.label}
                    </button>
                  ) : (
                    <a href={link.href} target={link.external ? '_blank' : undefined} rel={link.external ? 'noopener noreferrer' : undefined} className="text-white/50 hover:text-white text-sm transition-colors flex items-center gap-1">
                      {link.label}
                      {link.external && <ExternalLink className="w-3 h-3" />}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              {links.company.map(link => (
                <li key={link.label}>
                  {link.action ? (
                    <button onClick={link.action} className="text-white/50 hover:text-white text-sm transition-colors">{link.label}</button>
                  ) : (
                    <a href={link.href} className="text-white/50 hover:text-white text-sm transition-colors">{link.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>

        {/* Bottom Bar */}
        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 0.3 }} className="pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">
              © 2026 MAIT (My AI Tutor). Built with <Heart className="w-3 h-3 inline text-red-400" /> for NSW educators.
            </p>
            <div className="flex items-center gap-4 text-sm text-white/40">
              <span>Privacy First</span><span>•</span><span>NESA Aligned</span><span>•</span><span>Australian Made</span>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={isInView ? { opacity: 1 } : {}} transition={{ duration: 0.6, delay: 0.4 }} className="mt-8 text-center">
          <p className="text-white/30 text-xs">Architected by Darayat Ilham Chowdhury — Mechatronics & Computer Science, UNSW</p>
          <p className="text-white/20 text-xs mt-1">Award-Winning Senior Mathematics Tutor | Mental Maths Mentor</p>
        </motion.div>
      </div>
    </footer>
  )
}
