import { useState } from 'react'
import { XCircle } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'

export default function LoginModal({ show, onClose, onSubmit, onDemo, onGoogleSuccess, authLoading }) {
    const [code, setCode] = useState('')
    const [error, setError] = useState(false)
    const [showAccessCode, setShowAccessCode] = useState(false)
    const [isVerifying, setIsVerifying] = useState(false)

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsVerifying(true)
        setError(false)
        const success = await onSubmit(code)
        if (!success) {
            setError(true)
            setTimeout(() => setError(false), 2000)
        }
        setIsVerifying(false)
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/90 backdrop-blur-md">
            <div className="glass-card p-8 rounded-2xl w-full max-w-sm border-glow animate-reveal">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                        Sign In
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-surface-2"
                    >
                        <XCircle size={18} />
                    </button>
                </div>

                {/* Google Sign-In */}
                <div className="space-y-4">
                    <p className="text-xs text-muted-foreground text-center font-display">
                        Sign in with Google to save your progress across devices
                    </p>
                    <div className="flex justify-center">
                        {authLoading ? (
                            <div className="text-xs text-muted-foreground font-display animate-pulse">Signing in...</div>
                        ) : (
                            <GoogleLogin
                                onSuccess={onGoogleSuccess}
                                onError={() => console.error('Google login failed')}
                                theme="filled_black"
                                shape="pill"
                                size="large"
                                text="signin_with"
                                width="300"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-3 my-4">
                        <div className="flex-1 h-px bg-surface-3"></div>
                        <span className="text-[10px] text-muted-foreground font-display uppercase tracking-wider">or</span>
                        <div className="flex-1 h-px bg-surface-3"></div>
                    </div>

                    {/* Access code toggle */}
                    {!showAccessCode ? (
                        <button
                            onClick={() => setShowAccessCode(true)}
                            className="w-full py-3 rounded-xl text-sm font-display border border-surface-3 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                        >
                            Use Access Code
                        </button>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Enter Access Code"
                                value={code}
                                onChange={(e) => { setCode(e.target.value); setError(false); }}
                                className={`input-base text-center font-display text-lg tracking-[0.15em] uppercase py-4 ${error ? 'border-destructive focus:border-destructive' : ''}`}
                            />
                            {error && (
                                <p className="text-destructive text-xs text-center font-display">
                                    Invalid Access Code
                                </p>
                            )}
                            <button
                                type="submit"
                                className="w-full btn-primary py-3 rounded-xl font-display"
                            >
                                Unlock
                            </button>
                        </form>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <button
                        onClick={onDemo}
                        className="text-muted-foreground text-xs font-display hover:text-primary transition-colors"
                    >
                        Or try the free demo instead
                    </button>
                </div>
            </div>
        </div>
    )
}
