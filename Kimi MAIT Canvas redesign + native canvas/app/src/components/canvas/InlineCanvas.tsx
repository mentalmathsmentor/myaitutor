import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Save,
  Eye,
  History,
  ChevronUp,
  ChevronDown,
  Maximize2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore, createDocumentFromWorksheet } from '@/stores/canvasStore';
import { FragmentList } from './FragmentList';
import { PdfPreviewPane } from './PdfPreviewPane';
import { CanvasToolbar } from './CanvasToolbar';
import { InsertFragmentMenu } from './InsertFragmentMenu';
import { ScanQuestionModal } from './ScanQuestionModal';
import { RevisionPanel } from './RevisionPanel';
import { RevisionTimeline } from './RevisionTimeline';
import { CompileErrorBanner } from './CompileErrorBanner';

interface InlineCanvasProps {
  config: {
    yearLevel: string;
    subject: string;
    topics: string[];
    questionCount: number;
    difficulty: number;
  };
  onExpand?: () => void;
}

// Mock compilation service
const mockCompile = async (latexSource: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (latexSource.includes('\\documentclass')) {
        resolve({ 
          success: true, 
          pdfUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO...'
        });
      } else {
        resolve({ 
          success: false, 
          error: '! LaTeX Error: Missing \\documentclass command.' 
        });
      }
    }, 2000);
  });
};

const mockHumanizeError = async (_error: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("There's a missing command in your document. Make sure you have a proper LaTeX preamble with \\documentclass.");
    }, 500);
  });
};

export function InlineCanvas({ config, onExpand }: InlineCanvasProps) {
  const [showRevisionTimeline, setShowRevisionTimeline] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const {
    document: doc,
    fragmentsById,
    fragmentOrder,
    activeBuild,
    isCompiling,
    setDocument,
    setFragments,
    setActiveBuild,
    setIsCompiling,
    getOrderedFragments,
    setShowInsertMenu,
    setShowScanModal,
    setShowRevisionPanel,
    showRevisionPanel,
  } = useCanvasStore();

  // Initialize document from config
  useEffect(() => {
    if (!isInitialized && config) {
      const { document: newDoc, fragments } = createDocumentFromWorksheet(config);
      setDocument(newDoc);
      setFragments(fragments);
      setIsInitialized(true);
    }
  }, [config, isInitialized, setDocument, setFragments]);

  // Track unsaved changes
  useEffect(() => {
    if (doc) {
      setHasUnsavedChanges(true);
    }
  }, [fragmentsById, fragmentOrder, doc]);

  const assembleLatex = useCallback(() => {
    const fragments = getOrderedFragments();
    return fragments.map((f) => f.contentLatex).join('\n\n');
  }, [getOrderedFragments]);

  const handleCompile = async () => {
    setIsCompiling(true);
    setActiveBuild(null);
    
    const latexSource = assembleLatex();
    
    const buildId = `build_${Date.now()}`;
    setActiveBuild({
      id: buildId,
      documentId: doc?.id || '',
      status: 'compiling',
      createdAt: new Date().toISOString(),
    });
    
    const result = await mockCompile(latexSource);
    
    if (result.success) {
      setActiveBuild({
        id: buildId,
        documentId: doc?.id || '',
        status: 'success',
        pdfUrl: result.pdfUrl,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    } else {
      const humanizedError = await mockHumanizeError(result.error || '');
      setActiveBuild({
        id: buildId,
        documentId: doc?.id || '',
        status: 'failed',
        errorMessage: result.error,
        errorMessageHuman: humanizedError,
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      });
    }
    
    setIsCompiling(false);
  };

  const handleSave = () => {
    setHasUnsavedChanges(false);
  };

  const handleExport = (format: 'pdf' | 'tex') => {
    if (format === 'tex') {
      const latex = assembleLatex();
      const blob = new Blob([latex], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc?.title || 'worksheet'}.tex`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf' && activeBuild?.pdfUrl) {
      const a = document.createElement('a');
      a.href = activeBuild.pdfUrl;
      a.download = `${doc?.title || 'worksheet'}.pdf`;
      a.click();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handleCompile();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCompile]);

  if (!doc) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-mait-cyan animate-spin" />
          <span className="text-white/60">Initializing Canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-strong rounded-2xl overflow-hidden"
    >
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-3 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mait-cosmic to-mait-cyan flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-white font-medium text-sm sm:text-base">
                {doc?.title || 'Untitled Worksheet'}
              </h2>
              {hasUnsavedChanges && (
                <span className="text-xs text-yellow-400">Unsaved changes</span>
              )}
            </div>
          </div>
          
          {/* Build Status */}
          <div className="hidden sm:flex items-center gap-2">
            {isCompiling && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Compiling...
              </div>
            )}
            {activeBuild?.status === 'success' && !isCompiling && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Compiled
              </div>
            )}
            {activeBuild?.status === 'failed' && !isCompiling && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                Error
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRevisionTimeline(!showRevisionTimeline)}
            className="hidden md:flex text-white/60 hover:text-white"
          >
            <History className="w-4 h-4 mr-1" />
            History
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            className="text-white/60 hover:text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            <span className="hidden sm:inline">Save</span>
          </Button>
          
          <div className="h-6 w-px bg-white/20 hidden sm:block" />
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('tex')}
            className="hidden sm:flex btn-glass"
          >
            <Download className="w-4 h-4 mr-1" />
            .tex
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={!activeBuild?.pdfUrl}
            className="hidden sm:flex btn-glass"
          >
            <Download className="w-4 h-4 mr-1" />
            .pdf
          </Button>
          
          <Button
            onClick={handleCompile}
            disabled={isCompiling}
            className="btn-cosmic"
          >
            {isCompiling ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Eye className="w-4 h-4 mr-1" />
                Preview
              </>
            )}
          </Button>
          
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="text-white/60 hover:text-white hidden lg:flex"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-white/60 hover:text-white"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            {/* Toolbar */}
            <CanvasToolbar 
              onInsert={() => setShowInsertMenu(true)}
              onScan={() => setShowScanModal(true)}
              onToggleRevision={() => setShowRevisionPanel(!showRevisionPanel)}
              showRevision={showRevisionPanel}
            />

            {/* Main Content - Side by Side */}
            <div className="flex flex-col lg:flex-row" style={{ minHeight: '600px', maxHeight: '800px' }}>
              {/* Left Pane - Fragment List */}
              <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10">
                {/* Error Banner */}
                <CompileErrorBanner />
                
                {/* Fragment List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                  <FragmentList />
                </div>
                
                {/* Mobile Preview Button */}
                <div className="lg:hidden p-4 border-t border-white/10">
                  <Button
                    onClick={handleCompile}
                    disabled={isCompiling}
                    className="w-full btn-cosmic"
                  >
                    {isCompiling ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Preview PDF
                  </Button>
                </div>
              </div>
              
              {/* Right Pane - PDF Preview */}
              <div className="hidden lg:flex flex-1 flex-col">
                <PdfPreviewPane 
                  pdfUrl={activeBuild?.pdfUrl}
                  isCompiling={isCompiling}
                />
              </div>
              
              {/* Revision Panel - Overlay */}
              <AnimatePresence>
                {showRevisionPanel && (
                  <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    className="absolute right-0 top-[180px] bottom-0 w-80 glass-card-strong border-l border-white/10 z-40"
                  >
                    <RevisionPanel />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Keyboard Shortcut Hint */}
            <div className="px-4 py-2 border-t border-white/10 bg-white/5 flex items-center justify-between">
              <span className="text-xs text-white/30">
                Ctrl+Shift+P to Preview • Ctrl+S to Save
              </span>
              <span className="text-xs text-white/30">
                {fragmentOrder.length} fragments
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <InsertFragmentMenu />
      <ScanQuestionModal />
      
      {/* Revision Timeline Drawer */}
      <RevisionTimeline 
        isOpen={showRevisionTimeline}
        onClose={() => setShowRevisionTimeline(false)}
      />
    </motion.div>
  );
}
