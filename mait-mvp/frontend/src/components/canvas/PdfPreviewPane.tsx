import { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
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

  const handleZoomIn = () => setZoom(Math.min(zoom + 25, 200));
  const handleZoomOut = () => setZoom(Math.max(zoom - 25, 50));
  const handleReset = () => setZoom(100);

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
          <div className="w-full flex justify-center pointer-events-auto">
            <div
              className="bg-white shadow-2xl origin-top"
              style={{ 
                width: '100%',
                maxWidth: '210mm',
                aspectRatio: '1 / 1.4142',
                transform: `scale(${zoom / 100})`
              }}
            >
              <iframe
                src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=Fit`}
                title="PDF Preview"
                className="w-full h-full border-0"
              />
            </div>
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
