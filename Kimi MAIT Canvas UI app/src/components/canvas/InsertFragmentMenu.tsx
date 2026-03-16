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
import { FRAGMENT_TEMPLATES, TEMPLATE_CATEGORIES, getTemplatesByCategory } from '@/config/fragmentTemplates';

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

export function InsertFragmentMenu() {
  const { showInsertMenu, setShowInsertMenu, addFragment, selectedFragmentId } = useCanvasStore();
  const [activeCategory, setActiveCategory] = useState('Questions');
  const [hoveredTemplate, setHoveredTemplate] = useState<string | null>(null);
  
  const handleInsert = (templateId: string) => {
    const template = FRAGMENT_TEMPLATES.find((t) => t.id === templateId);
    if (!template) return;
    
    addFragment({
      kind: template.kind,
      contentLatex: template.defaultContent,
      label: template.label,
      metadata: template.metadata,
    }, selectedFragmentId || undefined);
    
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
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInsertMenu(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[600px] sm:max-h-[80vh] glass-card-strong rounded-2xl z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <SquarePen className="w-5 h-5 text-mait-cyan" />
                Insert Fragment
              </h2>
              <button
                onClick={() => setShowInsertMenu(false)}
                className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex flex-1 overflow-hidden">
              {/* Category Sidebar */}
              <div className="w-40 border-r border-white/10 p-2 overflow-y-auto">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const Icon = iconMap[cat.icon] || HelpCircle;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                        activeCategory === cat.id
                          ? 'bg-mait-cosmic/20 text-mait-cyan'
                          : 'text-white/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {cat.label}
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
                <h3 className="text-white/40 text-xs uppercase tracking-wider mb-3">
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
                            <span className="text-white font-medium text-sm">{template.label}</span>
                            {template.metadata?.marks && (
                              <span className="text-xs text-white/40">[{template.metadata.marks}M]</span>
                            )}
                          </div>
                          
                          <p className="text-white/40 text-xs mt-1 line-clamp-2">
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
            <div className="p-3 border-t border-white/10 bg-white/5 text-center">
              <p className="text-white/40 text-xs">
                Click a template to insert it after the selected fragment
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
