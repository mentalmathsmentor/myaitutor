import { useEffect, useState, useCallback, useRef } from 'react';
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
import { ElementList } from './ElementList';
import { PdfPreviewPane } from './PdfPreviewPane';
import { CanvasToolbar } from './CanvasToolbar';
import { InsertElementMenu } from './InsertElementMenu';
import { ScanQuestionModal } from './ScanQuestionModal';
import { RevisionPanel } from './RevisionPanel';
import { RevisionTimeline } from './RevisionTimeline';
import { CompileErrorBanner } from './CompileErrorBanner';
import { API_URL } from '@/config/api';

interface InlineCanvasProps {
  config: {
    yearLevel: string;
    subject: string;
    topics: string[];
    questionCount: number;
    difficulty: number;
  };
  // Full WorksheetRequest built by buildWorksheetRequest() — when provided,
  // this is sent directly to /canvas/generate instead of the minimal config payload.
  worksheetRequest?: Record<string, unknown> | null;
  onExpand?: () => void;
}

const compileCanvasPdf = async (latexSource: string): Promise<{ success: boolean; pdfUrl?: string; error?: string }> => {
  try {
    const studentId = localStorage.getItem('mait_student_id') || 'anonymous_student';
    const response = await fetch(`${API_URL}/canvas/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Student-Id': studentId
      },
      body: JSON.stringify({ latex_source: latexSource })
    });
    const data = await response.json();
    return data;
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};

const mockHumanizeError = async (_error: string): Promise<string> => {
  return "Compilation failed. Check the syntax of your LaTeX blocks.";
};

export function InlineCanvas({ config, worksheetRequest, onExpand }: InlineCanvasProps) {
  const [showRevisionTimeline, setShowRevisionTimeline] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [generationWarning, setGenerationWarning] = useState<string | null>(null);
  const initRef = useRef(false);
  
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

  // Initialize document from config
  useEffect(() => {
    if (!isInitialized && config && !initRef.current) {
      initRef.current = true;
      const initCanvas = async () => {
        try {
          const studentId = localStorage.getItem('mait_student_id') || 'anonymous_student';
          
          // Use the full WorksheetRequest from the studio if available (preferred path).
          // Fall back to a minimal request built from config if called without it.
          const requestBody = worksheetRequest ?? {
            requestVersion: "2",
            worksheetSettings: {
              course: config.yearLevel,
              subject: config.subject,
              difficulty: "Mixed",
              numberOfQuestions: config.questionCount,
              headerSpaces: "Include Name line. Include Date line.",
              workingSpace: "Dynamic Space",
              marks: "Assign and right-align marks.",
              answerKey: "No answer key.",
              watermark: true,
              mode: "EXAM STRICT (Pure questions only, no pedagogy tools)"
            },
            topicSummary: config.topics.join(" | "),
            syllabusPacket: {
              topicSummary: config.topics.join(" | "),
              outcomes: [],
              dotPoints: config.topics,
              include: [],
              exclude: [],
              assessmentEmphasis: [],
              questionStyleNotes: []
            },
            pedagogicalDrills: [],
            customInstructions: "",
            legacyFields: { manual_prompt: "", context_source: "builtin" }
          };

          const response = await fetch(`${API_URL}/canvas/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
            body: JSON.stringify({
              student_id: studentId,
              worksheet_request: requestBody,
            })
          });
          
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData?.detail || "Failed to generate canvas");
          }
          const data = await response.json();
          setDocument(data.document);
          setElements(data.elements);
        } catch (e: any) {
          console.error("[Canvas] /canvas/generate failed:", e.message);
          // Fall back to a local scaffold so the canvas is still usable.
          // The placeholder question makes clear that AI generation did not run.
          const { document: localDoc, elements: localElements } = createDocumentFromWorksheet(config);
          setDocument(localDoc);
          setElements(localElements);
          setGenerationWarning(`AI generation unavailable: ${e.message}. The canvas loaded with a blank scaffold — add questions manually or check that the backend is running.`);
        } finally {
          setIsInitialized(true);
        }
      };
      
      initCanvas();
    }
  }, [config, isInitialized, setDocument, setElements]);

  // Track unsaved changes
  useEffect(() => {
    if (doc) {
      setHasUnsavedChanges(true);
    }
  }, [elementsById, elementOrder, doc]);

  const assembleLatex = useCallback(() => {
    const elements = getOrderedElements();
    return elements.map((e) => e.contentLatex).join('\n\n');
  }, [getOrderedElements]);

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
    
    const result = await compileCanvasPdf(latexSource);
    
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

  const handleSave = async () => {
    if (!doc) return;
    try {
      const studentId = localStorage.getItem('mait_student_id') || 'anonymous_student';
      const elements = getOrderedElements();
      
      // Update each element (in a real app, this might be a single bulk endpoint)
      for (const e of elements) {
        await fetch(`${API_URL}/canvas/elements/${e.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
          body: JSON.stringify({
            contentLatex: e.contentLatex,
            sortKey: e.sortKey,
            isLocked: e.isLocked,
            isCollapsed: e.isCollapsed
          })
        });
      }
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Save failed", e);
    }
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

  if (initError) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500/80 mb-2" />
        <h3 className="text-xl font-bold text-white">Initialization Failed</h3>
        <p className="text-red-300 max-w-md text-center">{initError}</p>
        <Button 
          variant="outline"
          onClick={() => window.location.reload()}
          className="mt-4 border-white/20 text-white/80 hover:text-white hover:bg-white/5"
        >
          Back to Studio
        </Button>
      </div>
    );
  }

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
              {/* Left Pane - Element List */}
              <div className="w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-r border-white/10">
                {/* Generation Warning Banner */}
                {generationWarning && (
                  <div className="flex items-start gap-3 px-4 py-3 bg-yellow-500/10 border-b border-yellow-500/20">
                    <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-300/80 text-xs flex-1">{generationWarning}</p>
                    <button
                      onClick={() => setGenerationWarning(null)}
                      className="text-yellow-400/50 hover:text-yellow-400 text-xs"
                    >✕</button>
                  </div>
                )}
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
              <div className="hidden lg:flex flex-1 flex-col min-w-0">
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
                {elementOrder.length} elements
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <InsertElementMenu />
      <ScanQuestionModal />
      
      {/* Revision Timeline Drawer */}
      <RevisionTimeline 
        isOpen={showRevisionTimeline}
        onClose={() => setShowRevisionTimeline(false)}
      />
    </motion.div>
  );
}
