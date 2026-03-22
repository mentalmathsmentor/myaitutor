import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Bot,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore, type Element, type ElementKind } from '@/stores/canvasStore';
import { ElementEditor } from './ElementEditor';
import { API_URL } from '@/config/api';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Kind badge colors
const kindColors: Record<ElementKind, { bg: string; text: string; border: string }> = {
  preamble: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  header: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  question: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  diagram: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  instruction: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  worked_example: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  footer: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  text_block: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  mcq_options: { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/30' },
};

// Kind labels
const kindLabels: Record<ElementKind, string> = {
  preamble: 'PREAMBLE',
  header: 'HEADER',
  question: 'QUESTION',
  diagram: 'DIAGRAM',
  instruction: 'INSTRUCTION',
  worked_example: 'WORKED EXAMPLE',
  footer: 'FOOTER',
  text_block: 'TEXT',
  mcq_options: 'MCQ OPTIONS',
};

interface SortableElementCardProps {
  element: Element;
  index: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableElementCard({ element, index, onMoveUp, onMoveDown }: SortableElementCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const {
    selectedElementId,
    expandedElementIds,
    toggleExpanded,
    selectElement,
    deleteElement,
    updateElement,
    setShowRevisionPanel,
    addElement,
    elementOrder,
    regeneratingElementId,
    setRegeneratingElementId,
  } = useCanvasStore();

  const isSelected = selectedElementId === element.id;
  const isExpanded = expandedElementIds.has(element.id);
  const colors = kindColors[element.kind];

  // Preview content (first 100 chars) — strip commands but keep text inside braces
  const previewContent = element.contentLatex
    .replace(/\\(?:begin|end)\{[^}]+\}/g, ' ')
    .replace(/\\[a-zA-Z]+(\[[^\]]*\])?/g, ' ')
    .replace(/[{}$]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100)
    .trim();

  const handleDuplicate = () => {
    addElement({
      kind: element.kind,
      contentLatex: element.contentLatex,
      label: `${element.label} (Copy)`,
      metadata: element.metadata,
    }, element.id);
  };

  const hasDiagram = /\\begin\{tikzpicture\}|\\begin\{axis\}|pgfplots/.test(element.contentLatex);
  const isRegenerating = regeneratingElementId === element.id;

  const handleRegenerateDiagram = async () => {
    setRegeneratingElementId(element.id);
    try {
      const studentId = localStorage.getItem('mait_student_id') || 'anonymous';
      const res = await fetch(`${API_URL}/questions/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Student-Id': studentId },
        body: JSON.stringify({
          student_id: studentId,
          original_question_latex: element.contentLatex,
          error_feedback: 'Diagram needs spatial correction or failed to render correctly.',
          topic: element.label,
          marks: element.metadata?.marks || 2,
        }),
      });
      if (!res.ok) throw new Error(`Regeneration failed: ${res.status}`);
      const data = await res.json() as { question?: { question_latex?: string } };
      if (data.question?.question_latex) {
        updateElement(element.id, { contentLatex: data.question.question_latex });
      }
    } catch (err) {
      console.error('[Regenerate]', err);
    } finally {
      setRegeneratingElementId(null);
    }
  };

  const isFirst = index === 0;
  const isLast = index === elementOrder.length - 1;

  return (
    <div ref={setNodeRef} style={style}>
      <motion.div
        layout={!isDragging}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className={`rounded-xl border transition-all ${
          isSelected
            ? `border-mait-cyan/50 shadow-neon-cyan`
            : 'border-white/10 hover:border-white/20'
        } ${colors.bg}`}
      >
        {/* Card Header */}
        <div className="flex items-center gap-2 p-3">
          {/* Drag Handle — only this initiates drag */}
          <div
            className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Clickable area — selection + expand/collapse */}
          <div
            className="flex-1 flex items-center gap-2 cursor-pointer min-w-0"
            onClick={() => {
              selectElement(element.id);
              toggleExpanded(element.id);
            }}
          >
            {/* Kind Badge */}
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${colors.bg} ${colors.text} border ${colors.border}`}>
              {kindLabels[element.kind]}
            </span>

            {/* Label */}
            <span className="flex-1 text-white/80 text-sm font-medium truncate">
              {element.label}
            </span>

            {/* Marks indicator */}
            {element.metadata?.marks && (
              <span className="text-xs text-white/50 shrink-0">
                [{element.metadata.marks}M]
              </span>
            )}

            {/* Expand/Collapse */}
            <button className="text-white/40 hover:text-white/80 shrink-0">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Collapsed Preview */}
        {!isExpanded && (
          <div className="px-3 pb-3">
            <p className="text-white/40 text-xs font-mono truncate">
              {previewContent || 'Empty element'}
            </p>
          </div>
        )}

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-3">
                {/* Label Editor */}
                <div>
                  <label className="text-white/40 text-xs mb-1 block">Label</label>
                  <input
                    type="text"
                    value={element.label}
                    onChange={(e) => updateElement(element.id, { label: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-mait-cyan focus:outline-none"
                  />
                </div>

                {/* LaTeX Editor */}
                <ElementEditor
                  elementId={element.id}
                  content={element.contentLatex}
                  onChange={(content) => updateElement(element.id, { contentLatex: content })}
                />

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowRevisionPanel(true)}
                    className="text-mait-cyan hover:text-mait-cyan/80 text-xs"
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    Revise with AI
                  </Button>

                  {hasDiagram && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateDiagram}
                      disabled={isRegenerating}
                      className="text-orange-400 hover:text-orange-300 text-xs"
                    >
                      {isRegenerating ? (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3 mr-1" />
                      )}
                      Regenerate Diagram
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDuplicate}
                    className="text-white/50 hover:text-white text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Duplicate
                  </Button>

                  <div className="flex-1" />

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMoveUp}
                    disabled={isFirst}
                    className="text-white/50 hover:text-white text-xs disabled:opacity-30"
                  >
                    ↑
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onMoveDown}
                    disabled={isLast}
                    className="text-white/50 hover:text-white text-xs disabled:opacity-30"
                  >
                    ↓
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteElement(element.id)}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function ElementList() {
  const {
    getOrderedElements,
    moveElement,
    reorderElement,
    setShowInsertMenu,
  } = useCanvasStore();

  const elements = getOrderedElements();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = elements.findIndex((e: Element) => e.id === active.id);
    const newIndex = elements.findIndex((e: Element) => e.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    reorderElement(active.id as string, newIndex);
  };

  if (elements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Plus className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-white font-medium mb-2">No elements yet</h3>
        <p className="text-white/50 text-sm mb-4 max-w-xs">
          Start building your worksheet by adding elements from the template library
        </p>
        <Button onClick={() => setShowInsertMenu(true)} className="btn-cosmic">
          <Plus className="w-4 h-4 mr-2" />
          Add Element
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Element Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowInsertMenu(true)}
          className="text-mait-cyan hover:text-mait-cyan/80"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Element Cards — Sortable */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={elements.map((e: Element) => e.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {elements.map((element: Element, index: number) => (
              <SortableElementCard
                key={element.id}
                element={element}
                index={index}
                onMoveUp={() => moveElement(element.id, 'up')}
                onMoveDown={() => moveElement(element.id, 'down')}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
