import { useState } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Download,
  Loader2,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PdfPreviewPaneProps {
  pdfUrl?: string;
  isCompiling: boolean;
}

export function PdfPreviewPane({ pdfUrl, isCompiling }: PdfPreviewPaneProps) {
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  
  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 50));
  const handleReset = () => {
    setZoom(100);
    setRotation(0);
  };
  const handleRotate = () => setRotation((rotation + 90) % 360);
  
  // Mock PDF content for demo
  const renderMockPdf = () => {
    return (
      <div 
        className="bg-white text-black p-8 min-h-[800px] shadow-lg transition-transform origin-center"
        style={{ 
          transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
          width: '210mm',
          minHeight: '297mm',
          margin: '0 auto',
        }}
      >
        {/* Mock Worksheet Content */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">Mathematics Advanced</h1>
          <p className="text-gray-600">Year 12 — Integration by Parts</p>
        </div>
        
        <div className="border-b-2 border-black mb-6 pb-4">
          <div className="flex justify-between mb-2">
            <span>Name: _________________________________</span>
            <span>Date: ___________</span>
          </div>
        </div>
        
        <div className="space-y-8">
          <div>
            <p className="font-bold mb-4">1. Evaluate the following integrals:</p>
            <div className="ml-4 space-y-6">
              <div>
                <p className="mb-2">(a) ∫ x² · ln(x) dx <span className="float-right">[3 marks]</span></p>
                <div className="h-24 border border-gray-300 bg-gray-50"></div>
              </div>
              <div>
                <p className="mb-2">(b) ∫ eˣ · cos(x) dx <span className="float-right">[4 marks]</span></p>
                <div className="h-24 border border-gray-300 bg-gray-50"></div>
              </div>
              <div>
                <p className="mb-2">(c) ∫ x · sin(2x) dx <span className="float-right">[3 marks]</span></p>
                <div className="h-24 border border-gray-300 bg-gray-50"></div>
              </div>
            </div>
          </div>
          
          <div className="border-t pt-6">
            <p className="font-bold mb-4">2. Consider the function f(x) = x³ - 3x + 2.</p>
            <div className="ml-4 space-y-4">
              <div>
                <p className="mb-2">(a) Find f'(x). <span className="float-right">[2 marks]</span></p>
                <div className="h-16 border border-gray-300 bg-gray-50"></div>
              </div>
              <div>
                <p className="mb-2">(b) Find the stationary points and determine their nature. <span className="float-right">[4 marks]</span></p>
                <div className="h-24 border border-gray-300 bg-gray-50"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-12 pt-4 border-t text-center text-sm text-gray-500">
          End of Worksheet — Total: 16 marks
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <span className="text-white/60 text-sm">PDF Preview</span>
          {isCompiling && (
            <span className="flex items-center gap-1 text-yellow-400 text-sm">
              <Loader2 className="w-3 h-3 animate-spin" />
              Compiling...
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomOut}
            className="text-white/60 hover:text-white"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-white/60 text-sm w-16 text-center">{zoom}%</span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleZoomIn}
            className="text-white/60 hover:text-white"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-5 bg-white/20 mx-2" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRotate}
            className="text-white/60 hover:text-white"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-white/60 hover:text-white"
          >
            Reset
          </Button>
          
          {pdfUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const a = document.createElement('a');
                a.href = pdfUrl;
                a.download = 'worksheet.pdf';
                a.click();
              }}
              className="text-mait-cyan hover:text-mait-cyan/80"
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>
      
      {/* PDF Content */}
      <div className="flex-1 overflow-auto bg-gray-900/50 p-8">
        {isCompiling ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-2xl bg-mait-cosmic/20 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-mait-cyan animate-spin" />
            </div>
            <p className="text-white/60">Compiling LaTeX...</p>
            <p className="text-white/40 text-sm mt-1">This may take a few seconds</p>
          </div>
        ) : pdfUrl ? (
          <div className="flex justify-center">
            {renderMockPdf()}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
              <Eye className="w-10 h-10 text-white/20" />
            </div>
            <h3 className="text-white/60 font-medium mb-2">No preview yet</h3>
            <p className="text-white/40 text-sm max-w-xs mb-4">
              Click "Preview" to compile your worksheet and see the PDF output
            </p>
            <p className="text-white/30 text-xs">
              Shortcut: Ctrl+Shift+P
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
