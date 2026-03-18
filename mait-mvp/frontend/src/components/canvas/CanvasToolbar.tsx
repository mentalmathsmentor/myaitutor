import { Plus, ScanLine, Bot, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CanvasToolbarProps {
  onInsert: () => void;
  onScan: () => void;
  onToggleRevision: () => void;
  showRevision: boolean;
}

export function CanvasToolbar({ 
  onInsert, 
  onScan, 
  onToggleRevision,
  showRevision 
}: CanvasToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-white/5">
      {/* Insert Button */}
      <Button
        onClick={onInsert}
        className="btn-cosmic flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Insert Element
        <ChevronDown className="w-3 h-3" />
      </Button>
      
      {/* Scan Button */}
      <Button
        variant="outline"
        onClick={onScan}
        className="btn-glass flex items-center gap-2"
      >
        <ScanLine className="w-4 h-4" />
        <span className="hidden sm:inline">Scan Question</span>
        <span className="sm:hidden">Scan</span>
      </Button>
      
      <div className="flex-1" />
      
      {/* Revision Toggle */}
      <Button
        variant={showRevision ? 'default' : 'outline'}
        onClick={onToggleRevision}
        className={showRevision ? 'bg-mait-cosmic/30 text-mait-cyan border-mait-cosmic/50' : 'btn-glass'}
      >
        <Bot className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">AI Revision</span>
        <span className="sm:hidden">AI</span>
      </Button>
    </div>
  );
}
