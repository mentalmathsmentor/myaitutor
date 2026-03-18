export default function MarketingPageShell({ children, className = '' }) {
    return (
        <div className={`min-h-screen bg-cosmic noise-overlay ${className}`}>
            <div className="orb-container" aria-hidden="true">
                <div className="orb orb-1" />
                <div className="orb orb-2" />
                <div className="orb orb-3" />
            </div>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    )
}
