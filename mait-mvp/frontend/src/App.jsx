import { useState, useEffect, Suspense, lazy } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Lazy load heavy components
const WorksheetStudio = lazy(() => import('./sections/WorksheetStudio'));
// import ChatPage from './sections/ChatPage';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState(() => window.location.hash.replace('#', '') || 'home');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash.replace('#', '') || 'home');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (path) => {
    window.location.hash = path;
  };

  return (
    <div className="min-h-screen bg-mait-space text-gray-200 font-outfit selection:bg-mait-cosmic/30">
      <nav className="flex items-center justify-between p-4 border-b border-white/10 backdrop-blur-md">
        <h1 className="text-xl font-bold bg-gradient-to-r from-mait-cosmic to-mait-cyan bg-clip-text text-transparent">
          MAIT.
        </h1>
        <div className="flex gap-4">
          <button onClick={() => navigate('home')} className="hover:text-mait-cyan transition-colors">Home</button>
          <button onClick={() => navigate('studio')} className="hover:text-mait-cyan transition-colors">Studio</button>
        </div>
      </nav>

      <main className="p-6">
        <Suspense fallback={<div className="text-mait-cyan animate-pulse">Loading modules...</div>}>
          {currentRoute === 'home' && (
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Welcome back to the Hub.</h2>
              {/* Home Component Details */}
            </div>
          )}
          
          {currentRoute === 'studio' && (
            <WorksheetStudio navigate={navigate} />
          )}
        </Suspense>
      </main>
    </div>
  );
}
