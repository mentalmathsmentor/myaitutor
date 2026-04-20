import { useEffect } from 'react';
import { useCanvasStore } from '../stores/canvasStore';
import { FragmentCanvas } from '../components/canvas/FragmentCanvas';

export default function WorksheetStudio({ navigate }) {
  const { setFragments, fragmentOrder } = useCanvasStore();

  // Phase 1 Testing: Inject dummy fragments on mount if the canvas is empty
  useEffect(() => {
    if (fragmentOrder.length === 0) {
      setFragments([
        { 
          id: 'frag-1', 
          sort_key: 'a0', 
          kind: 'preamble', 
          label: 'Universal Preamble', 
          content_latex: '\\documentclass[12pt, a4paper]{article}\n\\usepackage{amsmath, amssymb}\n\\begin{document}' 
        },
        { 
          id: 'frag-2', 
          sort_key: 'a1', 
          kind: 'header', 
          label: 'HSC Header', 
          content_latex: '\\begin{center}\n\\Large\\textbf{Integration Quiz}\n\\end{center}' 
        },
        { 
          id: 'frag-3', 
          sort_key: 'a2', 
          kind: 'question', 
          label: 'Question 1', 
          content_latex: '\\item Find the indefinite integral of $f(x) = 3x^2 + 2x$. \\hfill \\textbf{[2 Marks]}' 
        }
      ]);
    }
  }, [setFragments, fragmentOrder.length]);

  return (
    <div className="flex flex-col gap-6 w-full h-[calc(100vh-120px)]">
      {/* Studio Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-mait-cosmic to-mait-cyan bg-clip-text text-transparent">
            Artifact Studio
          </h2>
          <p className="text-sm text-gray-400 mt-1">Native Canvas V3 — LexoRank Active</p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10">
            Export PDF
          </button>
          <button className="px-4 py-2 text-sm font-medium rounded-lg bg-mait-cosmic hover:bg-mait-cosmic/80 text-white transition-colors shadow-lg shadow-mait-cosmic/20">
            Compile Artifact
          </button>
        </div>
      </div>

      {/* The Native Canvas Workspace */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-6 backdrop-blur-[24px]">
        <FragmentCanvas />
      </div>
    </div>
  );
}
