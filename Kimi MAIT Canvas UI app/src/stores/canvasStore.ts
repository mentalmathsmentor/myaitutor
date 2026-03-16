import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateKeyBetween } from 'fractional-indexing';

// Fragment Types
export type FragmentKind = 
  | 'preamble' 
  | 'header' 
  | 'question' 
  | 'diagram' 
  | 'instruction' 
  | 'worked_example' 
  | 'footer' 
  | 'text_block';

export interface Fragment {
  id: string;
  kind: FragmentKind;
  sortKey: string;
  contentLatex: string;
  label: string;
  metadata?: {
    marks?: number;
    difficulty?: number;
    spaceAfter?: string;
    isImagePlaceholder?: boolean;
  };
  versionId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  id: string;
  title: string;
  kind: 'artifact' | 'study';
  source: 'worksheet_generator' | 'chat' | 'manual';
  metadata?: {
    yearLevel?: string;
    subject?: string;
    syllabus?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface ArtifactBuild {
  id: string;
  documentId: string;
  status: 'queued' | 'compiling' | 'success' | 'failed';
  pdfUrl?: string;
  errorMessage?: string;
  errorMessageHuman?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Revision {
  id: string;
  fragmentId: string;
  instruction: string;
  inputSnapshot: string;
  outputSnapshot: string;
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
}

interface CanvasState {
  // Document
  document: Document | null;
  
  // Fragments — keyed by ID for O(1) lookup
  fragmentsById: Record<string, Fragment>;
  fragmentOrder: string[];
  
  // Build state
  activeBuild: ArtifactBuild | null;
  isCompiling: boolean;
  
  // Revision state
  pendingRevision: Revision | null;
  revisionHistory: Revision[];
  
  // UI state
  selectedFragmentId: string | null;
  expandedFragmentIds: Set<string>;
  showInsertMenu: boolean;
  showScanModal: boolean;
  showRevisionPanel: boolean;
  
  // Actions
  setDocument: (doc: Document) => void;
  setFragments: (fragments: Fragment[]) => void;
  addFragment: (fragment: Omit<Fragment, 'id' | 'sortKey' | 'versionId' | 'createdAt' | 'updatedAt'>, afterId?: string) => string;
  updateFragment: (id: string, patch: Partial<Fragment>) => void;
  deleteFragment: (id: string) => void;
  reorderFragment: (id: string, newIndex: number) => void;
  moveFragment: (id: string, direction: 'up' | 'down') => void;
  toggleExpanded: (id: string) => void;
  expandFragment: (id: string) => void;
  collapseFragment: (id: string) => void;
  selectFragment: (id: string | null) => void;
  
  // Build actions
  setActiveBuild: (build: ArtifactBuild | null) => void;
  setIsCompiling: (compiling: boolean) => void;
  
  // Revision actions
  setPendingRevision: (rev: Revision | null) => void;
  addRevision: (rev: Revision) => void;
  applyRevision: (revisionId: string) => void;
  rejectRevision: (revisionId: string) => void;
  
  // UI actions
  setShowInsertMenu: (show: boolean) => void;
  setShowScanModal: (show: boolean) => void;
  setShowRevisionPanel: (show: boolean) => void;
  
  // Computed
  getOrderedFragments: () => Fragment[];
  getFragmentById: (id: string) => Fragment | undefined;
  getNextSortKey: (afterId?: string) => string;
}

export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    // Initial state
    document: null,
    fragmentsById: {},
    fragmentOrder: [],
    activeBuild: null,
    isCompiling: false,
    pendingRevision: null,
    revisionHistory: [],
    selectedFragmentId: null,
    expandedFragmentIds: new Set(),
    showInsertMenu: false,
    showScanModal: false,
    showRevisionPanel: false,
    
    // Document actions
    setDocument: (doc) => set({ document: doc }),
    
    // Fragment actions
    setFragments: (fragments) => {
      const byId: Record<string, Fragment> = {};
      const order: string[] = [];
      
      // Sort by sortKey
      const sorted = [...fragments].sort((a, b) => a.sortKey.localeCompare(b.sortKey));
      
      sorted.forEach((f) => {
        byId[f.id] = f;
        order.push(f.id);
      });
      
      set({ fragmentsById: byId, fragmentOrder: order });
    },
    
    addFragment: (fragment, afterId) => {
      const id = `frag_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      
      // Generate sort key
      let sortKey: string;
      const { fragmentOrder, fragmentsById } = get();
      
      if (afterId && fragmentsById[afterId]) {
        const afterIndex = fragmentOrder.indexOf(afterId);
        const beforeId = fragmentOrder[afterIndex + 1];
        const afterKey = fragmentsById[afterId].sortKey;
        const beforeKey = beforeId ? fragmentsById[beforeId].sortKey : null;
        sortKey = generateKeyBetween(afterKey, beforeKey);
      } else {
        // Add at end
        const lastId = fragmentOrder[fragmentOrder.length - 1];
        const lastKey = lastId ? fragmentsById[lastId]?.sortKey : null;
        sortKey = generateKeyBetween(lastKey, null);
      }
      
      const newFragment: Fragment = {
        ...fragment,
        id,
        sortKey,
        versionId: `v_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };
      
      set((state) => {
        state.fragmentsById[id] = newFragment;
        // Insert in correct position based on sortKey
        const insertIndex = state.fragmentOrder.findIndex((fid) => 
          state.fragmentsById[fid].sortKey > sortKey
        );
        if (insertIndex === -1) {
          state.fragmentOrder.push(id);
        } else {
          state.fragmentOrder.splice(insertIndex, 0, id);
        }
        state.selectedFragmentId = id;
        state.expandedFragmentIds.add(id);
      });
      
      return id;
    },
    
    updateFragment: (id, patch) => {
      set((state) => {
        const fragment = state.fragmentsById[id];
        if (fragment) {
          Object.assign(fragment, patch, { 
            updatedAt: new Date().toISOString(),
            versionId: `v_${Date.now()}`
          });
        }
      });
    },
    
    deleteFragment: (id) => {
      set((state) => {
        delete state.fragmentsById[id];
        state.fragmentOrder = state.fragmentOrder.filter((fid) => fid !== id);
        if (state.selectedFragmentId === id) {
          state.selectedFragmentId = null;
        }
        state.expandedFragmentIds.delete(id);
      });
    },
    
    reorderFragment: (id, newIndex) => {
      set((state) => {
        const currentIndex = state.fragmentOrder.indexOf(id);
        if (currentIndex === -1) return;
        
        // Remove from current position
        state.fragmentOrder.splice(currentIndex, 1);
        // Insert at new position
        state.fragmentOrder.splice(newIndex, 0, id);
        
        // Recalculate sort keys
        state.fragmentOrder.forEach((fid, idx) => {
          const prevKey = idx > 0 ? state.fragmentsById[state.fragmentOrder[idx - 1]].sortKey : null;
          const nextKey = idx < state.fragmentOrder.length - 1 ? state.fragmentsById[state.fragmentOrder[idx + 1]].sortKey : null;
          state.fragmentsById[fid].sortKey = generateKeyBetween(prevKey, nextKey);
        });
      });
    },
    
    moveFragment: (id, direction) => {
      const { fragmentOrder, reorderFragment } = get();
      const currentIndex = fragmentOrder.indexOf(id);
      if (currentIndex === -1) return;
      
      const newIndex = direction === 'up' 
        ? Math.max(0, currentIndex - 1)
        : Math.min(fragmentOrder.length - 1, currentIndex + 1);
      
      if (newIndex !== currentIndex) {
        reorderFragment(id, newIndex);
      }
    },
    
    toggleExpanded: (id) => {
      set((state) => {
        if (state.expandedFragmentIds.has(id)) {
          state.expandedFragmentIds.delete(id);
        } else {
          state.expandedFragmentIds.add(id);
        }
      });
    },
    
    expandFragment: (id) => {
      set((state) => state.expandedFragmentIds.add(id));
    },
    
    collapseFragment: (id) => {
      set((state) => state.expandedFragmentIds.delete(id));
    },
    
    selectFragment: (id) => set({ selectedFragmentId: id }),
    
    // Build actions
    setActiveBuild: (build) => set({ activeBuild: build }),
    setIsCompiling: (compiling) => set({ isCompiling: compiling }),
    
    // Revision actions
    setPendingRevision: (rev) => set({ pendingRevision: rev }),
    addRevision: (rev) => {
      set((state) => {
        state.revisionHistory.unshift(rev);
      });
    },
    applyRevision: (revisionId) => {
      set((state) => {
        const rev = state.revisionHistory.find((r) => r.id === revisionId);
        if (rev && rev.status === 'pending') {
          rev.status = 'applied';
          // Update fragment content
          const fragment = state.fragmentsById[rev.fragmentId];
          if (fragment) {
            fragment.contentLatex = rev.outputSnapshot;
            fragment.updatedAt = new Date().toISOString();
            fragment.versionId = `v_${Date.now()}`;
          }
        }
        if (state.pendingRevision?.id === revisionId) {
          state.pendingRevision = null;
        }
      });
    },
    rejectRevision: (revisionId) => {
      set((state) => {
        const rev = state.revisionHistory.find((r) => r.id === revisionId);
        if (rev) {
          rev.status = 'rejected';
        }
        if (state.pendingRevision?.id === revisionId) {
          state.pendingRevision = null;
        }
      });
    },
    
    // UI actions
    setShowInsertMenu: (show) => set({ showInsertMenu: show }),
    setShowScanModal: (show) => set({ showScanModal: show }),
    setShowRevisionPanel: (show) => set({ showRevisionPanel: show }),
    
    // Computed helpers
    getOrderedFragments: () => {
      const { fragmentsById, fragmentOrder } = get();
      return fragmentOrder.map((id) => fragmentsById[id]).filter(Boolean);
    },
    getFragmentById: (id) => get().fragmentsById[id],
    getNextSortKey: (afterId) => {
      const { fragmentOrder, fragmentsById } = get();
      if (afterId && fragmentsById[afterId]) {
        const afterIndex = fragmentOrder.indexOf(afterId);
        const beforeId = fragmentOrder[afterIndex + 1];
        const afterKey = fragmentsById[afterId].sortKey;
        const beforeKey = beforeId ? fragmentsById[beforeId].sortKey : null;
        return generateKeyBetween(afterKey, beforeKey);
      }
      const lastId = fragmentOrder[fragmentOrder.length - 1];
      const lastKey = lastId ? fragmentsById[lastId]?.sortKey : null;
      return generateKeyBetween(lastKey, null);
    },
  }))
);

// Helper to create initial document from worksheet config
export const createDocumentFromWorksheet = (config: {
  yearLevel: string;
  subject: string;
  topics: string[];
  questionCount: number;
  difficulty: number;
}): { document: Document; fragments: Fragment[] } => {
  const now = new Date().toISOString();
  const docId = `doc_${Date.now()}`;
  
  const document: Document = {
    id: docId,
    title: `${config.subject} Worksheet`,
    kind: 'artifact',
    source: 'worksheet_generator',
    metadata: {
      yearLevel: config.yearLevel,
      subject: config.subject,
      syllabus: config.topics,
    },
    createdAt: now,
    updatedAt: now,
  };
  
  // Create initial fragments
  const fragments: Fragment[] = [
    {
      id: `frag_${Date.now()}_preamble`,
      kind: 'preamble',
      sortKey: 'a0',
      contentLatex: `\\documentclass[11pt, a4paper]{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\usepackage{fontspec}
\\usepackage[english]{babel}
\\babelfont{rm}{Noto Sans}
\\usepackage{amsmath, amssymb, amsthm, tikz, enumitem}
\\usetikzlibrary{arrows.meta, calc, angles, quotes}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}

\\begin{document}`,
      label: 'Preamble',
      versionId: 'v1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `frag_${Date.now()}_header`,
      kind: 'header',
      sortKey: 'a1',
      contentLatex: `\\begin{center}
\\Large\\textbf{${config.subject}}\\\\[0.5em]
\\large ${config.yearLevel} — ${config.topics[0] || 'General Practice'}
\\end{center}

\\vspace{1em}

Name: \\underline{\\hspace{8cm}}\\\\[0.5em]
Date: \\underline{\\hspace{3cm}}

\\vspace{1em}`,
      label: 'Header',
      versionId: 'v1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `frag_${Date.now()}_questions`,
      kind: 'question',
      sortKey: 'a2',
      contentLatex: `\\begin{enumerate}[label=\\textbf{\\arabic*.}]
  \\item Evaluate $\\int x^2 \\, dx$. \\hfill \\textbf{[2 Marks]}
  
  \\vspace{4cm}
  
  \\item Find the derivative of $f(x) = 3x^3 - 2x^2 + x - 5$. \\hfill \\textbf{[3 Marks]}
  
  \\vspace{4cm}
  
  \\item Solve for $x$: $2x + 5 = 15$. \\hfill \\textbf{[2 Marks]}
\\end{enumerate}`,
      label: `Questions (Sample)`,
      metadata: { marks: 7 },
      versionId: 'v1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `frag_${Date.now()}_footer`,
      kind: 'footer',
      sortKey: 'a3',
      contentLatex: `\\vfill

\\hrule
\\vspace{0.5em}
\\begin{center}
\\textit{End of Worksheet}
\\end{center}

\\end{document}`,
      label: 'Footer',
      versionId: 'v1',
      createdAt: now,
      updatedAt: now,
    },
  ];
  
  return { document, fragments };
};
