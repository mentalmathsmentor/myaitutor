import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronLeft, 
  FileText, 
  AlertCircle,
  CheckCircle2,
  Loader2,
  Download,
  Save,
  Eye,
  History
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore, createDocumentFromWorksheet } from '@/stores/canvasStore';
import { ElementList } from '@/components/canvas/ElementList';
import { PdfPreviewPane } from '@/components/canvas/PdfPreviewPane';
import { CanvasToolbar } from '@/components/canvas/CanvasToolbar';
import { InsertElementMenu } from '@/components/canvas/InsertElementMenu';
import { ScanQuestionModal } from '@/components/canvas/ScanQuestionModal';
import { RevisionPanel } from '@/components/canvas/RevisionPanel';
import { RevisionTimeline } from '@/components/canvas/RevisionTimeline';
import { CompileErrorBanner } from '@/components/canvas/CompileErrorBanner';
import type { Section } from '../App';

interface CanvasWorkspaceProps {
  setCurrentSection: (section: Section) => void;
  initialConfig?: {
    yearLevel: string;
    subject: string;
    topics: string[];
    questionCount: number;
    difficulty: number;
  } | null;
}

// Mock compilation service
const mockCompile = async (latexSource: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simulate successful compilation
      if (latexSource.includes('\\\\documentclass')) {
        resolve({ 
          success: true, 
          pdfUrl: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsO...' // Mock PDF data
        });
      } else {
        resolve({ 
          success: false, 
          error: '! LaTeX Error: Missing \\\\documentclass command.' 
        });
      }
    }, 2000);
  });
};

// Mock humanized error service
const mockHumanizeError = async (_error: string): Promise<string> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("There's a missing command in your document. Make sure you have a proper LaTeX preamble with \\\\documentclass.");
    }, 500);
  });
};

export default function CanvasWorkspace({ setCurrentSection, initialConfig }: CanvasWorkspaceProps) {
  const [showRevisionTimeline, setShowRevisionTimeline] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const {
    document: doc,
    elementsById,
    elementOrder,
    activeBuild,
    isCompiling,
    setDocument,
    setElements,
    setActiveBuild,
    setIsCompiling,
    getOrderedElements,
    setShowInsertMenu,
    setShowScanModal,
    setShowRevisionPanel,
    showRevisionPanel,
  } = useCanvasStore();

  // Initialize document from config or create blank
  useEffect(() => {
    if (!doc) {
      if (initialConfig) {
        const { document: newDoc, elements } = createDocumentFromWorksheet(initialConfig);
        setDocument(newDoc);
        setElements(elements);
      } else {
        // Create blank document
        const now = new Date().toISOString();
        setDocument({
          id: `doc_${Date.now()}`,
          title: 'Untitled Worksheet',
          kind: 'artifact',
          source: 'manual',
          createdAt: now,
          updatedAt: now,
        });
        setElements([]);
      }
    }
  }, [initialConfig, doc, setDocument, setElements]);

  // Track unsaved changes
  useEffect(() => {
    if (doc) {
      setHasUnsavedChanges(true);
    }
  }, [elementsById, elementOrder, doc]);

  // Assemble LaTeX from elements
  const assembleLatex = useCallback(() => {
    const elements = getOrderedElements();
    return elements.map((f) => f.contentLatex).join('\n\n');
  }, [getOrderedElements]);

  // Handle compile
  const handleCompile = async () => {
    setIsCompiling(true);
    setActiveBuild(null);
    
    const latexSource = assembleLatex();
    
    // Create pending build
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

  // Handle save
  const handleSave = () => {
    // Mock save
    setHasUnsavedChanges(false);
  };

  // Handle export
  const handleExport = (format: 'pdf' | 'tex') => {
    if (format === 'tex') {
      const latex = assembleLatex();
      const blob = new Blob([latex], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `${doc?.title || 'worksheet'}.tex`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'pdf' && activeBuild?.pdfUrl) {
      const a = window.document.createElement('a');
      a.href = activeBuild.pdfUrl;
      a.download = `${doc?.title || 'worksheet'}.pdf`;
      a.click();
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + P = Preview/Compile
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        handleCompile();
      }
      // Ctrl/Cmd + S = Save
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
      <div className="min-h-screen cosmic-gradient flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 text-mait-cyan animate-spin" />
          <span className="text-white/60">Initializing Canvas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen cosmic-gradient flex flex-col">
      {/* Header */}
      <header className="glass-card-strong border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrentSection('landing')}
            className="flex items-center gap-2 text-white/60 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit</span>
          </button>
          
          <div className="h-6 w-px bg-white/20" />
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-mait-cosmic to-mait-cyan flex items-center justify-center">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-white font-medium text-sm sm:text-base truncate max-w-[150px] sm:max-w-xs">
                {doc?.title || 'Untitled'}
              </h1>
              {hasUnsavedChanges && (
                <span className="text-xs text-yellow-400">Unsaved changes</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Center - Build Status */}
        <div className="hidden md:flex items-center gap-2">
          {isCompiling && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Compiling...
            </div>
          )}
          {activeBuild?.status === 'success' && !isCompiling && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Compiled
            </div>
          )}
          {activeBuild?.status === 'failed' && !isCompiling && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/20 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              Error
            </div>
          )}
        </div>
        
        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRevisionTimeline(!showRevisionTimeline)}
            className="hidden sm:flex text-white/60 hover:text-white"
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
        </div>
      </header>

      {/* Toolbar */}
      <CanvasToolbar 
        onInsert={() => setShowInsertMenu(true)}
        onScan={() => setShowScanModal(true)}
        onToggleRevision={() => setShowRevisionPanel(!showRevisionPanel)}
        showRevision={showRevisionPanel}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane - Element List */}
        <div className="w-full lg:w-1/2 xl:w-5/12 flex flex-col border-r border-white/10">
          {/* Error Banner */}
          <CompileErrorBanner />
          
          {/* Element List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            <ElementList />
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
              className="absolute right-0 top-[120px] bottom-0 w-80 glass-card-strong border-l border-white/10 z-40"
            >
              <RevisionPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modals */}
      <InsertElementMenu />
      <ScanQuestionModal />
      
      {/* Revision Timeline Drawer */}
      <RevisionTimeline 
        isOpen={showRevisionTimeline}
        onClose={() => setShowRevisionTimeline(false)}
      />

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-4 right-4 text-xs text-white/30 hidden xl:block">
        Ctrl+Shift+P to Preview • Ctrl+S to Save
      </div>
    </div>
  );
}
