import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';

export function CompileErrorBanner() {
  const { activeBuild } = useCanvasStore();
  const [showRawLog, setShowRawLog] = useState(false);
  
  if (!activeBuild || activeBuild.status !== 'failed') {
    return null;
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="border-b border-red-500/30"
      >
        <div className="bg-red-500/10 p-4">
          {/* Main Error Message */}
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-medium mb-1">
                Compilation failed
              </p>
              <p className="text-white/70 text-sm">
                {activeBuild.errorMessageHuman || 'There was an error compiling your worksheet. Check your LaTeX syntax.'}
              </p>
              
              {/* Toggle Raw Log */}
              <button
                onClick={() => setShowRawLog(!showRawLog)}
                className="flex items-center gap-1 text-white/40 hover:text-white/60 text-xs mt-2 transition-colors"
              >
                <Terminal className="w-3 h-3" />
                {showRawLog ? 'Hide' : 'Show'} technical details
                {showRawLog ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              
              {/* Raw Log */}
              <AnimatePresence>
                {showRawLog && activeBuild.errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 overflow-hidden"
                  >
                    <pre className="p-3 rounded-lg bg-black/50 text-red-300/70 text-xs font-mono overflow-x-auto">
                      {activeBuild.errorMessage}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
