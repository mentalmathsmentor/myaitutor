import { useRef, useCallback } from 'react'
import Hero from './sections/Hero'
import ProblemSection from './sections/ProblemSection'
import SolutionSection from './sections/SolutionSection'
import AGEDemo from './sections/AGEDemo'
import Features from './sections/Features'
import Architecture from './sections/Architecture'
import Footer from './sections/Footer'

/**
 * NewLandingPage — the Kimi-designed landing page
 * Drop-in replacement for the legacy LandingPage.jsx
 * 
 * Props:
 *   navigate(page: string)  — production navigate function
 *   onLoginClick()          — opens login modal
 */
export default function NewLandingPage({ navigate, onLoginClick }) {
  const scrollToSection = useCallback((sectionId) => {
    const el = document.getElementById(sectionId)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <main className="min-h-screen bg-cosmic noise-overlay">
      {/* Background orbs */}
      <div className="orb-container">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>

      {/* Math particle background */}
      <div className="math-particles" aria-hidden="true">
        {['∫', '∂', 'Σ', '∇', 'π', 'θ', 'λ', '∞', '√', '≈', 'Δ', 'φ'].map((symbol, i) => (
          <div
            key={i}
            className="math-particle"
            style={{
              left: `${(i * 37 + 11) % 90}%`,
              animationDelay: `${i * 1.2}s`,
              fontSize: `${1 + (i % 3) * 0.4}rem`,
            }}
          >
            {symbol}
          </div>
        ))}
      </div>

      {/* Landing Sections */}
      <div className="relative z-10">
        <Hero scrollToSection={scrollToSection} navigate={navigate} onLoginClick={onLoginClick} />

        <div id="problem">
          <ProblemSection />
        </div>

        <div id="solution">
          <SolutionSection />
        </div>

        <div id="demo">
          <AGEDemo navigate={navigate} />
        </div>

        <div id="features">
          <Features />
        </div>

        <div id="architecture">
          <Architecture />
        </div>

        <Footer navigate={navigate} />
      </div>
    </main>
  )
}
