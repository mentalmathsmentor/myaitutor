import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Bot, 
  CheckCircle2, 
  XCircle, 
  Clock,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/stores/canvasStore';

interface RevisionTimelineProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RevisionTimeline({ isOpen, onClose }: RevisionTimelineProps) {
  const { revisionHistory, applyRevision, rejectRevision, fragmentsById } = useCanvasStore();
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  const getFragmentLabel = (fragmentId: string) => {
    return fragmentsById[fragmentId]?.label || 'Unknown Fragment';
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          />
          
          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md glass-card-strong border-l border-white/10 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-mait-cyan" />
                Revision History
              </h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {revisionHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/50 mb-2">No revisions yet</p>
                  <p className="text-white/30 text-sm">
                    Select a fragment and use "Revise with AI" to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {revisionHistory.map((revision, index) => (
                    <motion.div
                      key={revision.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {revision.status === 'applied' && (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          )}
                          {revision.status === 'rejected' && (
                            <XCircle className="w-4 h-4 text-red-400" />
                          )}
                          {revision.status === 'pending' && (
                            <Clock className="w-4 h-4 text-yellow-400" />
                          )}
                          <span className="text-white/60 text-xs">
                            {formatTime(revision.createdAt)}
                          </span>
                        </div>
                        
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          revision.status === 'applied' ? 'bg-green-500/20 text-green-400' :
                          revision.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {revision.status.toUpperCase()}
                        </span>
                      </div>
                      
                      {/* Fragment Label */}
                      <p className="text-white/80 text-sm font-medium mb-1">
                        {getFragmentLabel(revision.fragmentId)}
                      </p>
                      
                      {/* Instruction */}
                      <p className="text-white/50 text-sm mb-3">
                        "{revision.instruction}"
                      </p>
                      
                      {/* Preview */}
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-white/5">
                          <p className="text-[10px] text-white/40 uppercase mb-1">Changes</p>
                          <p className="text-white/60 text-xs font-mono line-clamp-2">
                            {revision.outputSnapshot.slice(0, 100)}...
                          </p>
                        </div>
                      </div>
                      
                      {/* Actions for pending */}
                      {revision.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            onClick={() => applyRevision(revision.id)}
                            size="sm"
                            className="flex-1 bg-green-500 hover:bg-green-600 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Apply
                          </Button>
                          <Button
                            onClick={() => rejectRevision(revision.id)}
                            size="sm"
                            variant="outline"
                            className="flex-1 btn-glass text-xs"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                      
                      {/* Undo for applied */}
                      {revision.status === 'applied' && (
                        <Button
                          onClick={() => {
                            // Would need to implement undo logic
                          }}
                          size="sm"
                          variant="ghost"
                          className="mt-3 text-white/40 hover:text-white text-xs"
                        >
                          <RotateCcw className="w-3 h-3 mr-1" />
                          Undo this change
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-white/5">
              <p className="text-white/40 text-xs text-center">
                Revisions are stored for 30 days
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
