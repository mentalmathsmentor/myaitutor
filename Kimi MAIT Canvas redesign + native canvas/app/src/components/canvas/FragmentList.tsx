// FragmentList component - no useState needed
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  GripVertical,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore, type Fragment, type FragmentKind } from '@/stores/canvasStore';
import { FragmentEditor } from './FragmentEditor';

// Kind badge colors
const kindColors: Record<FragmentKind, { bg: string; text: string; border: string }> = {
  preamble: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  header: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  question: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  diagram: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  instruction: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  worked_example: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  footer: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  text_block: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

// Kind labels
const kindLabels: Record<FragmentKind, string> = {
  preamble: 'PREAMBLE',
  header: 'HEADER',
  question: 'QUESTION',
  diagram: 'DIAGRAM',
  instruction: 'INSTRUCTION',
  worked_example: 'WORKED EXAMPLE',
  footer: 'FOOTER',
  text_block: 'TEXT',
};

interface FragmentCardProps {
  fragment: Fragment;
  index: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function FragmentCard({ fragment, index, onMoveUp, onMoveDown }: FragmentCardProps) {
  const {
    selectedFragmentId,
    expandedFragmentIds,
    toggleExpanded,
    selectFragment,
    deleteFragment,
    updateFragment,
    setShowRevisionPanel,
    addFragment,
    fragmentOrder,
  } = useCanvasStore();
  
  const isSelected = selectedFragmentId === fragment.id;
  const isExpanded = expandedFragmentIds.has(fragment.id);
  const colors = kindColors[fragment.kind];
  
  // Preview content (first 100 chars)
  const previewContent = fragment.contentLatex
    .replace(/\\[a-zA-Z]+(\[.*?\])?(\{.*?\})?/g, ' ')
    .replace(/\$\$?/g, '')
    .slice(0, 100)
    .trim();
  
  const handleDuplicate = () => {
    addFragment({
      kind: fragment.kind,
      contentLatex: fragment.contentLatex,
      label: `${fragment.label} (Copy)`,
      metadata: fragment.metadata,
    }, fragment.id);
  };
  
  const isFirst = index === 0;
  const isLast = index === fragmentOrder.length - 1;
  
  return (
    <motion.div
      layout
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
      <div 
        className="flex items-center gap-2 p-3 cursor-pointer"
        onClick={() => {
          selectFragment(fragment.id);
          toggleExpanded(fragment.id);
        }}
      >
        {/* Drag Handle */}
        <div className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60">
          <GripVertical className="w-4 h-4" />
        </div>
        
        {/* Kind Badge */}
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
          {kindLabels[fragment.kind]}
        </span>
        
        {/* Label */}
        <span className="flex-1 text-white/80 text-sm font-medium truncate">
          {fragment.label}
        </span>
        
        {/* Marks indicator */}
        {fragment.metadata?.marks && (
          <span className="text-xs text-white/50">
            [{fragment.metadata.marks}M]
          </span>
        )}
        
        {/* Expand/Collapse */}
        <button className="text-white/40 hover:text-white/80">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
      
      {/* Collapsed Preview */}
      {!isExpanded && (
        <div className="px-3 pb-3">
          <p className="text-white/40 text-xs font-mono truncate">
            {previewContent || 'Empty fragment'}
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
                  value={fragment.label}
                  onChange={(e) => updateFragment(fragment.id, { label: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:border-mait-cyan focus:outline-none"
                />
              </div>
              
              {/* LaTeX Editor */}
              <FragmentEditor 
                fragmentId={fragment.id}
                content={fragment.contentLatex}
                onChange={(content) => updateFragment(fragment.id, { contentLatex: content })}
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
                  onClick={() => deleteFragment(fragment.id)}
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
  );
}

export function FragmentList() {
  const { 
    getOrderedFragments,
    moveFragment,
    setShowInsertMenu,
  } = useCanvasStore();
  
  const fragments = getOrderedFragments();
  
  if (fragments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-4">
          <Plus className="w-8 h-8 text-white/30" />
        </div>
        <h3 className="text-white font-medium mb-2">No fragments yet</h3>
        <p className="text-white/50 text-sm mb-4 max-w-xs">
          Start building your worksheet by adding fragments from the template library
        </p>
        <Button onClick={() => setShowInsertMenu(true)} className="btn-cosmic">
          <Plus className="w-4 h-4 mr-2" />
          Add Fragment
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {/* Fragment Count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/50">
          {fragments.length} fragment{fragments.length !== 1 ? 's' : ''}
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
      
      {/* Fragment Cards */}
      <div className="space-y-3">
        {fragments.map((fragment, index) => (
          <FragmentCard
            key={fragment.id}
            fragment={fragment}
            index={index}
            onMoveUp={() => moveFragment(fragment.id, 'up')}
            onMoveDown={() => moveFragment(fragment.id, 'down')}
          />
        ))}
      </div>
    </div>
  );
}
