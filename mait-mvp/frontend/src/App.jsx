import { useState, useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'
import Navigation from './components/Navigation'
import NewLandingPage from './NewLandingPage'
import AIResources from './AIResources'
import WorksheetStudio from './sections/WorksheetStudio'
import PastPapers from './PastPapers'
import PrivacyPolicy from './pages/PrivacyPolicy'
import ChatPage from './pages/ChatPage'
import MarketingPageShell from './components/MarketingPageShell'
import LoginModal from './components/LoginModal'
import useAuth from './hooks/useAuth'
import { API_URL } from './config/api'
import { getPageFromPath, navigateTo } from './lib/navigation'

function App() {
    const [page, setPage] = useState(getPageFromPath)
    const [showLoginModal, setShowLoginModal] = useState(false)

    // Clean URL routing — browser back/forward support
    useEffect(() => {
        const onNav = () => setPage(getPageFromPath());
        window.addEventListener('popstate', onNav);
        return () => window.removeEventListener('popstate', onNav);
    }, []);

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
            navigateTo('app');
        },
        onLogout: () => {
            navigateTo('landing');
        },
    });

    const handleLogout = rawLogout;

    const handleLoginClick = () => {
        if (page === 'app') return;
        setShowLoginModal(true);
    };

    const loginModal = (
        <LoginModal
            show={showLoginModal}
            onClose={() => setShowLoginModal(false)}
            onSubmit={handleLoginSubmit}
            onDemo={() => { setShowLoginModal(false); navigateTo('demo'); }}
            onGoogleSuccess={handleGoogleSuccess}
            authLoading={authLoading}
        />
    );

    const nav = (
        <Navigation
            currentPage={page}
            navigate={navigateTo}
            onLoginClick={handleLoginClick}
            authUser={authUser}
            onLogout={handleLogout}
        />
    );

    // Chat pages (app / demo) — full-screen chat experience
    if (page === 'app' || page === 'demo') {
        return (
            <>
                {nav}
                <ChatPage
                    studentId={studentId}
                    authUser={authUser}
                    handleLogout={handleLogout}
                    isDemoMode={page === 'demo'}
                />
            </>
        );
    }

    // Marketing / content pages
    if (page === 'landing') {
        return (
            <>
                {nav}
                <ErrorBoundary><NewLandingPage navigate={navigateTo} onLoginClick={handleLoginClick} /></ErrorBoundary>
                {loginModal}
            </>
        )
    }

    if (page === 'resources') {
        return (
            <>
                {nav}
                <MarketingPageShell>
                    <div className="pt-20 lg:pt-24">
                        <ErrorBoundary><AIResources /></ErrorBoundary>
                    </div>
                </MarketingPageShell>
                {loginModal}
            </>
        )
    }

    if (page === 'worksheets') {
        return (
            <>
                {nav}
                <MarketingPageShell>
                    <div className="pt-20 lg:pt-24 max-w-7xl mx-auto px-4 pb-12">
                        <ErrorBoundary><WorksheetStudio setCurrentSection={navigateTo} /></ErrorBoundary>
                    </div>
                </MarketingPageShell>
                {loginModal}
            </>
        )
    }

    if (page === 'privacy') {
        return (
            <>
                {nav}
                <MarketingPageShell>
                    <div className="pt-20 lg:pt-24">
                        <ErrorBoundary><PrivacyPolicy navigate={navigateTo} /></ErrorBoundary>
                    </div>
                </MarketingPageShell>
                {loginModal}
            </>
        )
    }

    if (page === 'pastpapers') {
        return (
            <>
                {nav}
                <MarketingPageShell>
                    <div className="pt-20 lg:pt-24 min-h-screen">
                        <ErrorBoundary><PastPapers /></ErrorBoundary>
                    </div>
                </MarketingPageShell>
                {loginModal}
            </>
        )
    }

    // Fallback
    return null;
}

export default App
