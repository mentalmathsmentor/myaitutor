import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  RotateCcw,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/stores/canvasStore';

// Mock revision service
const mockRequestRevision = async (
  fragmentContent: string,
  instruction: string
): Promise<{
  success: boolean;
  outputSnapshot?: string;
  error?: string;
}> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate AI revision
      if (instruction.toLowerCase().includes('harder')) {
        resolve({
          success: true,
          outputSnapshot: fragmentContent.replace(
            /\\hfill \\textbf{\[\d+ Marks\]}/,
            '\\hfill \\textbf{[5 Marks]}'
          ) + '\n\\vspace{1cm}\n\\textit{Hint: Consider using integration by parts twice.}',
        });
      } else if (instruction.toLowerCase().includes('add')) {
        resolve({
          success: true,
          outputSnapshot: fragmentContent + '\n\\vspace{0.5cm}\n\\textit{Additional part: Verify your answer by differentiation.}',
        });
      } else {
        resolve({
          success: true,
          outputSnapshot: fragmentContent.replace(/3x\^2/, '5x^3'),
        });
      }
    }, 2000);
  });
};

export function RevisionPanel() {
  const {
    selectedFragmentId,
    fragmentsById,
    pendingRevision,
    setPendingRevision,
    addRevision,
    applyRevision,
    rejectRevision,
  } = useCanvasStore();
  
  const [instruction, setInstruction] = useState('');
  const [isRequesting, setIsRequesting] = useState(false);
  
  const selectedFragment = selectedFragmentId ? fragmentsById[selectedFragmentId] : null;
  
  const handleRequestRevision = async () => {
    if (!selectedFragment || !instruction.trim()) return;
    
    setIsRequesting(true);
    
    const result = await mockRequestRevision(
      selectedFragment.contentLatex,
      instruction
    );
    
    if (result.success && result.outputSnapshot) {
      const revision = {
        id: `rev_${Date.now()}`,
        fragmentId: selectedFragment.id,
        instruction: instruction.trim(),
        inputSnapshot: selectedFragment.contentLatex,
        outputSnapshot: result.outputSnapshot,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
      };
      
      setPendingRevision(revision);
      addRevision(revision);
    }
    
    setIsRequesting(false);
  };
  
  const handleApply = () => {
    if (pendingRevision) {
      applyRevision(pendingRevision.id);
      setPendingRevision(null);
      setInstruction('');
    }
  };
  
  const handleReject = () => {
    if (pendingRevision) {
      rejectRevision(pendingRevision.id);
      setPendingRevision(null);
    }
  };
  
  if (!selectedFragment) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
          <Bot className="w-6 h-6 text-white/30" />
        </div>
        <p className="text-white/50 text-sm">
          Select a fragment to revise it with AI
        </p>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h3 className="text-white font-medium flex items-center gap-2">
          <Bot className="w-4 h-4 text-mait-cyan" />
          AI Revision
        </h3>
        <p className="text-white/50 text-xs mt-1">
          {selectedFragment.label}
        </p>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Instruction Input */}
        {!pendingRevision && (
          <div className="space-y-3">
            <label className="text-white/60 text-sm">
              What would you like to change?
            </label>
            
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g., 'Make this question harder', 'Add a hint', 'Change the numbers'..."
              className="w-full h-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none focus:border-mait-cyan focus:outline-none"
            />
            
            {/* Quick suggestions */}
            <div className="flex flex-wrap gap-2">
              {['Make harder', 'Add hint', 'Simplify', 'Add part (b)', 'Change numbers'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInstruction(suggestion)}
                  className="px-2 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            
            <Button
              onClick={handleRequestRevision}
              disabled={!instruction.trim() || isRequesting}
              className="w-full btn-cosmic disabled:opacity-50"
            >
              {isRequesting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Thinking...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Request Revision
                </>
              )}
            </Button>
          </div>
        )}
        
        {/* Pending Revision Preview */}
        <AnimatePresence>
          {pendingRevision && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="p-3 rounded-lg bg-mait-cyan/10 border border-mait-cyan/30">
                <p className="text-mait-cyan text-sm font-medium mb-1">
                  AI Suggestion Ready
                </p>
                <p className="text-white/60 text-xs">
                  "{pendingRevision.instruction}"
                </p>
              </div>
              
              {/* Diff Preview */}
              <div className="space-y-2">
                <label className="text-white/40 text-xs">Preview Changes</label>
                
                {/* Before */}
                <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                  <p className="text-red-400 text-[10px] uppercase mb-1">Before</p>
                  <p className="text-white/60 text-xs font-mono line-through">
                    {pendingRevision.inputSnapshot.slice(0, 100)}...
                  </p>
                </div>
                
                <ChevronRight className="w-4 h-4 text-white/30 mx-auto" />
                
                {/* After */}
                <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                  <p className="text-green-400 text-[10px] uppercase mb-1">After</p>
                  <p className="text-white/80 text-xs font-mono">
                    {pendingRevision.outputSnapshot.slice(0, 100)}...
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-green-500 hover:bg-green-600"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply
                </Button>
                
                <Button
                  onClick={handleReject}
                  variant="outline"
                  className="flex-1 btn-glass"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
              
              <Button
                onClick={() => {
                  setPendingRevision(null);
                  setInstruction('');
                }}
                variant="ghost"
                size="sm"
                className="w-full text-white/40 hover:text-white"
              >
                <RotateCcw className="w-3 h-3 mr-2" />
                Try Different Instruction
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Tips */}
        <div className="mt-6 p-3 rounded-lg bg-white/5">
          <p className="text-white/40 text-xs mb-2">Tips for best results:</p>
          <ul className="text-white/30 text-xs space-y-1 list-disc list-inside">
            <li>Be specific about what to change</li>
            <li>Reference specific parts of the question</li>
            <li>Ask for hints rather than full solutions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
