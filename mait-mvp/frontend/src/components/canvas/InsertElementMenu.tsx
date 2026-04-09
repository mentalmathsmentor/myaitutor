import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  HelpCircle, 
  PenTool, 
  Lightbulb, 
  LayoutTemplate,
  ScanLine,
  SquarePen,
  ListOrdered,
  MessageSquare,
  Grid3X3,
  Circle,
  TrendingUp,
  ImageOff,
  AlertTriangle,
  GraduationCap,
  Minus,
  FileText,
  Bot,
  Key
} from 'lucide-react';
import { useCanvasStore } from '@/stores/canvasStore';
import { ELEMENT_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory } from '@/config/elementTemplates';

// Icon mapping
const iconMap: Record<string, React.ElementType> = {
  SquarePen,
  ListOrdered,
  MessageSquare,
  Grid3X3,
  Circle,
  TrendingUp,
  ImageOff,
  AlertTriangle,
  GraduationCap,
  Lightbulb,
  Minus,
  FileText,
  Bot,
  Key,
  HelpCircle,
  PenTool,
  LayoutTemplate,
  ScanLine,
};

export function InsertElementMenu() {
  const { showInsertMenu, setShowInsertMenu, addElement, selectedElementId } = useCanvasStore();
  const [activeCategory, setActiveCategory] = useState('Questions');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  
  const handleInsert = (templateId: string) => {
    const template = ELEMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    
    addElement({
      kind: template.kind,
      contentLatex: template.defaultContent,
      label: template.label,
      metadata: template.metadata,
    }, selectedElementId || undefined);
    
    setShowInsertMenu(false);
  };
  
  const handleScanFromImage = () => {
    setShowInsertMenu(false);
    // Open scan modal
    setTimeout(() => {
      useCanvasStore.getState().setShowScanModal(true);
    }, 100);
  };
  
  if (!showInsertMenu) return null;
  
  const templates = getTemplatesByCategory(activeCategory);
  
  return (
    <AnimatePresence>
      {showInsertMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInsertMenu(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-[600px] max-h-[80vh] glass-card-strong rounded-2xl flex flex-col overflow-hidden shadow-2xl border border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <SquarePen className="w-5 h-5 text-mait-cyan" />
                Insert Element
              </h2>
              <button
                onClick={() => setShowInsertMenu(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Category Sidebar */}
              <div className="w-32 sm:w-40 border-r border-white/10 p-2 overflow-y-auto bg-white/5">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const Icon = iconMap[cat.icon] || HelpCircle;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors mb-1 ${
                        activeCategory === cat.id
                          ? 'bg-mait-cosmic/20 text-mait-cyan border border-mait-cyan/20'
                          : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="truncate">{cat.label}</span>
                    </button>
                  );
                })}
                
                <div className="my-2 border-t border-white/10" />
                
                <button
                  onClick={handleScanFromImage}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm text-mait-cyan hover:bg-mait-cyan/10 transition-colors"
                >
                  <ScanLine className="w-4 h-4" />
                  From Image
                </button>
              </div>
              
              {/* Templates Grid */}
              <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3 px-1">
                  {activeCategory}
                </h3>
                
                <div className="grid gap-2">
                  {templates.map((template) => {
                    const Icon = iconMap[template.icon] || SquarePen;
                    const isHovered = hoveredTemplate === template.id;
                    
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleInsert(template.id)}
                        onMouseEnter={() => setHoveredTemplate(template.id)}
                        onMouseLeave={() => setHoveredTemplate(null)}
                        className={`flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                          isHovered
                            ? 'bg-white/10 border border-white/20'
                            : 'bg-white/5 border border-transparent hover:border-white/10'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isHovered ? 'bg-mait-cosmic/30' : 'bg-white/5'
                        }`}>
                          <Icon className={`w-5 h-5 ${isHovered ? 'text-mait-cyan' : 'text-white/60'}`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium text-sm truncate">{template.label}</span>
                            {template.metadata?.marks && (
                              <span className="text-xs text-white/40">[{template.metadata.marks}M]</span>
                            )}
                          </div>
                          
                          <p className="text-white/40 text-xs mt-1 line-clamp-2 italic">
                            {template.defaultContent.slice(0, 100).replace(/\\[a-zA-Z]+/g, ' ')}...
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-3 border-t border-white/10 bg-white/5 text-center shrink-0">
              <p className="text-white/40 text-xs">
                Click a template to insert it after the selected element
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
