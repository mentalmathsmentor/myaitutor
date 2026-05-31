import { useState, Suspense, lazy } from 'react'
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary'
import Navigation from './components/Navigation'
import MarketingPageShell from './components/MarketingPageShell'
import LoginModal from './components/LoginModal'
import useAuth from './hooks/useAuth'
import { API_URL } from './config/api'

// Lazy Load Heavy Route Components
const NewLandingPage = lazy(() => import('./NewLandingPage'))
const AIResources = lazy(() => import('./AIResources'))
const WorksheetStudio = lazy(() => import('./sections/WorksheetStudio'))
const PastPapers = lazy(() => import('./PastPapers'))
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'))
const ChatPage = lazy(() => import('./pages/ChatPage'))
const TutorWorkspace = lazy(() => import('./features/exoskeleton/Workspace'))

function AppRoutes() {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Determine logical page name from path for Navigation active state
    // e.g. "/" -> "landing", "/resources" -> "resources"
    const page = location.pathname === '/' ? 'landing' : location.pathname.substring(1);
    
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Auth
    const {
        authUser,
        studentId,
        authLoading,
        handleLoginSubmit,
        handleGoogleSuccess,
        handleLogout: rawLogout,
    } = useAuth(API_URL, {
        onLoginSuccess: () => {
            setShowLoginModal(false);
            navigate('/app');
        },
        onLogout: () => {
            navigate('/');
        },
    });

    const handleLogout = rawLogout;

    const handleLoginClick = () => {
        if (page === 'app') return;
        setShowLoginModal(true);
    };

    // Provide a shim string-based navigate for child components that expect it
    const legacyNavigate = (targetPage) => {
        if (targetPage === 'landing') navigate('/');
        else navigate(`/${targetPage}`);
    };

    const loginModal = (
        <LoginModal
            show={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSubmit={handleLoginSubmit}
            onDemo={() => { setShowLoginModal(false); navigate('/demo'); }}
            onGoogleSuccess={handleGoogleSuccess}
            authLoading={authLoading}
        />
    );

    const nav = (
        <Navigation
            currentPage={page}
            navigate={legacyNavigate}
            onLoginClick={handleLoginClick}
            authUser={authUser}
            onLogout={handleLogout}
        />
    );

    return (
        <>
            {nav}
            <Suspense fallback={
                <div className="min-h-screen w-full flex items-center justify-center bg-mait-dark">
                    <div className="w-8 h-8 border-4 border-mait-cyan border-t-transparent rounded-full animate-spin"></div>
                </div>
            }>
                <Routes>
                    <Route path="/" element={
                        <ErrorBoundary><NewLandingPage navigate={legacyNavigate} onLoginClick={handleLoginClick} /></ErrorBoundary>
                    } />
                    
                    <Route path="/resources" element={
                        <MarketingPageShell>
                            <div className="pt-20 lg:pt-24">
                                <ErrorBoundary><AIResources /></ErrorBoundary>
                            </div>
                        </MarketingPageShell>
                    } />

                    <Route path="/worksheets" element={
                        <ErrorBoundary><WorksheetStudio setCurrentSection={legacyNavigate} /></ErrorBoundary>
                    } />

                    <Route path="/privacy" element={
                        <MarketingPageShell>
                            <div className="pt-20 lg:pt-24">
                                <ErrorBoundary><PrivacyPolicy navigate={legacyNavigate} /></ErrorBoundary>
                            </div>
                        </MarketingPageShell>
                    } />

                    <Route path="/pastpapers" element={
                        <MarketingPageShell>
                            <div className="pt-20 lg:pt-24 min-h-screen">
                                <ErrorBoundary><PastPapers /></ErrorBoundary>
                            </div>
                        </MarketingPageShell>
                    } />

                    {/* Chat interfaces */}
                    <Route path="/app" element={
                        <ChatPage
                            studentId={studentId}
                            authUser={authUser}
                            handleLogout={handleLogout}
                            isDemoMode={false}
                        />
                    } />

                    <Route path="/demo" element={
                        <ChatPage
                            studentId={studentId}
                            authUser={authUser}
                            handleLogout={handleLogout}
                            isDemoMode={true}
                        />
                    } />

                    <Route path="/tutor" element={
                        <ErrorBoundary><TutorWorkspace /></ErrorBoundary>
                    } />
                    
                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Suspense>
            {loginModal}
        </>
    );
}

export default AppRoutes
