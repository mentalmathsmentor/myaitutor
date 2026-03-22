import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { generateKeyBetween } from 'fractional-indexing';

import { API_URL } from '@/config/api';

// Debounce map for element update persistence (element id → timer id)
const _updateDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

function persistElementUpdate(docId: string, elemId: string, patch: Record<string, unknown>) {
  clearTimeout(_updateDebounceTimers[elemId]);
  _updateDebounceTimers[elemId] = setTimeout(async () => {
    try {
      await fetch(`${API_URL}/canvas/elements/${elemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
    } catch (err) {
      console.warn('[canvas] Failed to persist element update:', err);
    }
    delete _updateDebounceTimers[elemId];
  }, 1500);
}

// Element Types
export type ElementKind =
  | 'preamble'
  | 'header'
  | 'question'
  | 'diagram'
  | 'instruction'
  | 'worked_example'
  | 'footer'
  | 'text_block'
  | 'mcq_options';

export interface Element {
  id: string;
  kind: ElementKind;
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
  elementId: string;
  instruction: string;
  inputSnapshot: string;
  outputSnapshot: string;
  status: 'pending' | 'applied' | 'rejected';
  createdAt: string;
}

interface CanvasState {
  // Document
  document: Document | null;

  // Elements — keyed by ID for O(1) lookup
  elementsById: Record<string, Element>;
  elementOrder: string[];

  // Build state
  activeBuild: ArtifactBuild | null;
  isCompiling: boolean;

  // Revision state
  pendingRevision: Revision | null;
  revisionHistory: Revision[];

  // UI state
  selectedElementId: string | null;
  expandedElementIds: Set<string>;
  showInsertMenu: boolean;
  showScanModal: boolean;
  showRevisionPanel: boolean;

  // Actions
  setDocument: (doc: Document) => void;
  setElements: (elements: Element[]) => void;
  addElement: (element: Omit<Element, 'id' | 'sortKey' | 'versionId' | 'createdAt' | 'updatedAt'>, afterId?: string) => string;
  updateElement: (id: string, patch: Partial<Element>) => void;
  deleteElement: (id: string) => void;
  reorderElement: (id: string, newIndex: number) => void;
  moveElement: (id: string, direction: 'up' | 'down') => void;
  toggleExpanded: (id: string) => void;
  expandElement: (id: string) => void;
  collapseElement: (id: string) => void;
  selectElement: (id: string | null) => void;

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
  getOrderedElements: () => Element[];
  getElementById: (id: string) => Element | undefined;
  getNextSortKey: (afterId?: string) => string;
}

export const useCanvasStore = create<CanvasState>()(
  immer((set, get) => ({
    // Initial state
    document: null,
    elementsById: {},
    elementOrder: [],
    activeBuild: null,
    isCompiling: false,
    pendingRevision: null,
    revisionHistory: [],
    selectedElementId: null,
    expandedElementIds: new Set(),
    showInsertMenu: false,
    showScanModal: false,
    showRevisionPanel: false,

    // Document actions
    setDocument: (doc) => set({ document: doc }),

    // Element actions
    setElements: (elements) => {
      const byId: Record<string, Element> = {};
      const order: string[] = [];

      // Sort by sortKey
      const sorted = [...elements].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

      sorted.forEach((e) => {
        byId[e.id] = e;
        order.push(e.id);
      });

      set({ elementsById: byId, elementOrder: order });
    },

    addElement: (element, afterId) => {
      const id = `elem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();

      // Generate sort key
      let sortKey: string;
      const { elementOrder, elementsById, document: doc } = get();

      if (afterId && elementsById[afterId]) {
        const afterIndex = elementOrder.indexOf(afterId);
        const beforeId = elementOrder[afterIndex + 1];
        const afterKey = elementsById[afterId].sortKey;
        const beforeKey = beforeId ? elementsById[beforeId].sortKey : null;
        sortKey = generateKeyBetween(afterKey, beforeKey);
      } else {
        // Add at end
        const lastId = elementOrder[elementOrder.length - 1];
        const lastKey = lastId ? elementsById[lastId]?.sortKey : null;
        sortKey = generateKeyBetween(lastKey, null);
      }

      const newElement: Element = {
        ...element,
        id,
        sortKey,
        versionId: `v_${Date.now()}`,
        createdAt: now,
        updatedAt: now,
      };

      set((state) => {
        state.elementsById[id] = newElement;
        // Insert in correct position based on sortKey
        const insertIndex = state.elementOrder.findIndex((eid) =>
          state.elementsById[eid].sortKey > sortKey
        );
        if (insertIndex === -1) {
          state.elementOrder.push(id);
        } else {
          state.elementOrder.splice(insertIndex, 0, id);
        }
        state.selectedElementId = id;
        state.expandedElementIds.add(id);
      });

      // Persist to backend and reconcile server-assigned ID
      if (doc?.id) {
        fetch(`${API_URL}/canvas/documents/${doc.id}/elements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sortKey,
            kind: element.kind,
            label: element.label,
            contentLatex: element.contentLatex,
          }),
        })
          .then((res) => res.json())
          .then((data: { element?: { id?: string } }) => {
            const serverId = data?.element?.id;
            if (serverId && serverId !== id) {
              // Reconcile: replace the frontend-generated ID with the server-assigned one
              set((state) => {
                const elem = state.elementsById[id];
                if (!elem) return;
                elem.id = serverId;
                state.elementsById[serverId] = elem;
                delete state.elementsById[id];
                const idx = state.elementOrder.indexOf(id);
                if (idx !== -1) state.elementOrder[idx] = serverId;
                if (state.selectedElementId === id) state.selectedElementId = serverId;
                if (state.expandedElementIds.has(id)) {
                  state.expandedElementIds.delete(id);
                  state.expandedElementIds.add(serverId);
                }
              });
            }
          })
          .catch((err) => console.warn('[canvas] Failed to persist new element:', err));
      }

      return id;
    },

    updateElement: (id, patch) => {
      set((state) => {
        const element = state.elementsById[id];
        if (element) {
          Object.assign(element, patch, {
            updatedAt: new Date().toISOString(),
            versionId: `v_${Date.now()}`
          });
        }
      });

      // Debounced persist to backend
      const { document: doc } = get();
      if (doc?.id) {
        persistElementUpdate(doc.id, id, patch as Record<string, unknown>);
      }
    },

    deleteElement: (id) => {
      set((state) => {
        delete state.elementsById[id];
        state.elementOrder = state.elementOrder.filter((eid) => eid !== id);
        if (state.selectedElementId === id) {
          state.selectedElementId = null;
        }
        state.expandedElementIds.delete(id);
      });

      // Persist deletion to backend (fire-and-forget)
      fetch(`${API_URL}/canvas/elements/${id}`, { method: 'DELETE' })
        .catch((err) => console.warn('[canvas] Failed to persist element deletion:', err));
    },

    reorderElement: (id, newIndex) => {
      set((state) => {
        const currentIndex = state.elementOrder.indexOf(id);
        if (currentIndex === -1) return;

        // Remove from current position
        state.elementOrder.splice(currentIndex, 1);
        // Insert at new position
        state.elementOrder.splice(newIndex, 0, id);

        // Only recalculate sort key for the MOVED element — avoid loop dependency bug
        const prevId = newIndex > 0 ? state.elementOrder[newIndex - 1] : null;
        const nextId = newIndex < state.elementOrder.length - 1 ? state.elementOrder[newIndex + 1] : null;
        const prevKey = prevId ? state.elementsById[prevId].sortKey : null;
        const nextKey = nextId ? state.elementsById[nextId].sortKey : null;
        const newSortKey = generateKeyBetween(prevKey, nextKey);
        state.elementsById[id].sortKey = newSortKey;

        // Persist new sort key to backend (fire-and-forget, after state is committed)
        const newSortKeyCapture = newSortKey;
        setTimeout(() => {
          fetch(`${API_URL}/canvas/elements/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sortKey: newSortKeyCapture }),
          }).catch((err) => console.warn('[canvas] Failed to persist reorder:', err));
        }, 0);
      });
    },

    moveElement: (id, direction) => {
      const { elementOrder, reorderElement } = get();
      const currentIndex = elementOrder.indexOf(id);
      if (currentIndex === -1) return;

      const newIndex = direction === 'up'
        ? Math.max(0, currentIndex - 1)
        : Math.min(elementOrder.length - 1, currentIndex + 1);

      if (newIndex !== currentIndex) {
        reorderElement(id, newIndex);
      }
    },

    toggleExpanded: (id) => {
      set((state) => {
        if (state.expandedElementIds.has(id)) {
          state.expandedElementIds.delete(id);
        } else {
          state.expandedElementIds.add(id);
        }
      });
    },

    expandElement: (id) => {
      set((state) => state.expandedElementIds.add(id));
    },

    collapseElement: (id) => {
      set((state) => state.expandedElementIds.delete(id));
    },

    selectElement: (id) => set({ selectedElementId: id }),

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
          // Update element content
          const element = state.elementsById[rev.elementId];
          if (element) {
            element.contentLatex = rev.outputSnapshot;
            element.updatedAt = new Date().toISOString();
            element.versionId = `v_${Date.now()}`;
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
    getOrderedElements: () => {
      const { elementsById, elementOrder } = get();
      return elementOrder.map((id) => elementsById[id]).filter(Boolean);
    },
    getElementById: (id) => get().elementsById[id],
    getNextSortKey: (afterId) => {
      const { elementOrder, elementsById } = get();
      if (afterId && elementsById[afterId]) {
        const afterIndex = elementOrder.indexOf(afterId);
        const beforeId = elementOrder[afterIndex + 1];
        const afterKey = elementsById[afterId].sortKey;
        const beforeKey = beforeId ? elementsById[beforeId].sortKey : null;
        return generateKeyBetween(afterKey, beforeKey);
      }
      const lastId = elementOrder[elementOrder.length - 1];
      const lastKey = lastId ? elementsById[lastId]?.sortKey : null;
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
}): { document: Document; elements: Element[] } => {
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

  // Create initial elements
  const elements: Element[] = [
    {
      id: `elem_${Date.now()}_preamble`,
      kind: 'preamble',
      sortKey: 'a0',
      contentLatex: `\\documentclass[11pt, a4paper]{article}
\\usepackage[a4paper, margin=2cm]{geometry}
\\usepackage{amsmath, amssymb, amsthm, enumitem}
\\usepackage{tikz, pgfplots}
\\usepackage{fancyhdr, lastpage}
\\usepackage{tcolorbox}
\\usetikzlibrary{arrows.meta, calc, angles, quotes}
\\pgfplotsset{compat=1.18}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{1em}
\\pagestyle{fancy}
\\fancyhf{}
\\rfoot{Page \\thepage\\ of \\pageref{LastPage}}

\\begin{document}`,
      label: 'Preamble',
      versionId: 'v1',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: `elem_${Date.now()}_header`,
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
      id: `elem_${Date.now()}_questions`,
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
      id: `elem_${Date.now()}_footer`,
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

  return { document, elements };
};
