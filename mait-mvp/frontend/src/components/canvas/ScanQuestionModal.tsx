import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  ScanLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/stores/canvasStore';
import { API_URL } from '@/config/api';

export function ScanQuestionModal() {
  const { showScanModal, setShowScanModal, document, setElements, getOrderedElements } = useCanvasStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [result, setResult] = useState<{
    success: boolean;
    elements?: Array<{
      id: string;
      kind: string;
      label: string;
      contentLatex: string;
      sortKey: string;
    }>;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewImage(dataUrl);
      setIsProcessing(true);

      try {
        const base64 = dataUrl.split(',')[1];
        const mimeType = file.type || 'image/jpeg';

        const res = await fetch(`${API_URL}/canvas/documents/${document?.id}/vision-parse`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_base64: base64,
            image_mime_type: mimeType,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: 'Vision parse failed' }));
          setResult({ success: false, error: err.detail || 'Vision parse failed' });
        } else {
          const data = await res.json();
          setResult({
            success: true,
            elements: data.elements || [],
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setResult({ success: false, error: msg });
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsDataURL(file);
  }, [document?.id]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleInsertElements = () => {
    if (result?.elements) {
      // Elements are already persisted by the backend vision-parse endpoint.
      // Merge them into the frontend store.
      const existing = getOrderedElements();
      const existingIds = new Set(existing.map((e: { id: string }) => e.id));
      const newElements = result.elements.filter((e) => !existingIds.has(e.id));

      if (newElements.length > 0) {
        // Merge into store — add to elementsById and elementOrder
        const currentStore = useCanvasStore.getState();
        const updatedById = { ...currentStore.elementsById };
        const updatedOrder = [...currentStore.elementOrder];

        for (const elem of newElements) {
          updatedById[elem.id] = {
            id: elem.id,
            kind: elem.kind as any,
            label: elem.label,
            contentLatex: elem.contentLatex,
            sortKey: elem.sortKey,
            isLocked: false,
            isCollapsed: false,
          };
          updatedOrder.push(elem.id);
        }

        // Sort order by sortKey
        updatedOrder.sort((a, b) =>
          (updatedById[a]?.sortKey || '').localeCompare(updatedById[b]?.sortKey || '')
        );

        useCanvasStore.setState({
          elementsById: updatedById,
          elementOrder: updatedOrder,
        });
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setShowScanModal(false);
    setPreviewImage(null);
    setResult(null);
    setIsProcessing(false);
  };

  if (!showScanModal) return null;

  return (
    <AnimatePresence>
      {showScanModal && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[500px] glass-card-strong rounded-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-mait-cyan" />
                Scan Question from Image
              </h2>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 overflow-y-auto">
              {!previewImage && !result && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-mait-cyan/50 transition-colors"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Upload className="w-8 h-8 text-white/40" />
                  </div>

                  <p className="text-white font-medium mb-2">
                    Drop an image here, or click to browse
                  </p>
                  <p className="text-white/50 text-sm mb-4">
                    Supports: JPG, PNG, HEIC
                  </p>

                  <div className="flex justify-center gap-3">
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="btn-glass"
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Browse Files
                    </Button>

                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      className="btn-glass"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Take Photo
                    </Button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* Preview & Processing */}
              {previewImage && (
                <div className="space-y-4">
                  {/* Image Preview */}
                  <div className="relative rounded-xl overflow-hidden bg-black/30">
                    <img
                      src={previewImage}
                      alt="Scanned question"
                      className="w-full max-h-64 object-contain"
                    />

                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-mait-cyan animate-spin mb-3" />
                        <p className="text-white font-medium">Analyzing image...</p>
                        <p className="text-white/50 text-sm">Converting to LaTeX</p>
                      </div>
                    )}
                  </div>

                  {/* Processing Steps */}
                  {isProcessing && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span className="text-white/60">Image uploaded</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Loader2 className="w-4 h-4 text-mait-cyan animate-spin" />
                        <span className="text-white">Extracting text and equations...</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-4 h-4 rounded-full border border-white/20" />
                        <span className="text-white/40">Generating LaTeX elements</span>
                      </div>
                    </div>
                  )}

                  {/* Results */}
                  {result && (
                    <div className="space-y-4">
                      {result.success ? (
                        <>
                          <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle2 className="w-5 h-5" />
                            <span className="font-medium">Successfully parsed!</span>
                          </div>

                          <p className="text-white/60 text-sm">
                            Found {result.elements?.length} element(s):
                          </p>

                          <div className="space-y-2">
                            {result.elements?.map((elem, idx) => (
                              <div
                                key={idx}
                                className="p-3 rounded-lg bg-white/5 border border-white/10"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-mait-cosmic/20 text-mait-cyan">
                                    {elem.kind.toUpperCase()}
                                  </span>
                                  <span className="text-white text-sm">{elem.label}</span>
                                </div>
                                <p className="text-white/40 text-xs font-mono truncate">
                                  {elem.contentLatex.slice(0, 80)}...
                                </p>
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleInsertElements}
                              className="flex-1 btn-cosmic"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Insert Elements
                            </Button>
                            <Button
                              onClick={handleClose}
                              variant="outline"
                              className="btn-glass"
                            >
                              Cancel
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">Could not parse image</span>
                          </div>

                          <p className="text-white/60 text-sm">
                            {result.error || 'The image could not be processed. Try a clearer image or enter the content manually.'}
                          </p>

                          <Button
                            onClick={() => {
                              setPreviewImage(null);
                              setResult(null);
                            }}
                            variant="outline"
                            className="btn-glass"
                          >
                            Try Again
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="p-3 border-t border-white/10 bg-white/5">
              <p className="text-white/40 text-xs text-center">
                Powered by Gemini Flash Vision
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
