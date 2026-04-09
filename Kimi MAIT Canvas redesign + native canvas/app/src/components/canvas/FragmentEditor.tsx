import { useState, useRef } from 'react';
import { 
  ChevronDown,
  Type
} from 'lucide-react';

interface FragmentEditorProps {
  fragmentId: string;
  content: string;
  onChange: (content: string) => void;
}

// Math symbols and commands
const mathSymbols = [
  { label: '×', command: '\\times ' },
  { label: '÷', command: '\\div ' },
  { label: '±', command: '\\pm ' },
  { label: '∞', command: '\\infty ' },
  { label: '≠', command: '\\neq ' },
  { label: '≤', command: '\\leq ' },
  { label: '≥', command: '\\geq ' },
  { label: '∈', command: '\\in ' },
  { label: '∉', command: '\\notin ' },
  { label: '⊂', command: '\\subset ' },
  { label: '∪', command: '\\cup ' },
  { label: '∩', command: '\\cap ' },
  { label: '∅', command: '\\emptyset ' },
  { label: '∀', command: '\\forall ' },
  { label: '∃', command: '\\exists ' },
  { label: '∴', command: '\\therefore ' },
  { label: '∵', command: '\\because ' },
  { label: '≈', command: '\\approx ' },
  { label: '≡', command: '\\equiv ' },
  { label: '→', command: '\\rightarrow ' },
  { label: '⇒', command: '\\Rightarrow ' },
  { label: '↔', command: '\\leftrightarrow ' },
  { label: '⇔', command: '\\Leftrightarrow ' },
  { label: '∠', command: '\\angle ' },
  { label: '°', command: '^\\circ ' },
  { label: '′', command: "'" },
  { label: '″', command: "''" },
];

const greekLetters = [
  { label: 'α', command: '\\alpha ' },
  { label: 'β', command: '\\beta ' },
  { label: 'γ', command: '\\gamma ' },
  { label: 'δ', command: '\\delta ' },
  { label: 'ε', command: '\\epsilon ' },
  { label: 'ζ', command: '\\zeta ' },
  { label: 'η', command: '\\eta ' },
  { label: 'θ', command: '\\theta ' },
  { label: 'ι', command: '\\iota ' },
  { label: 'κ', command: '\\kappa ' },
  { label: 'λ', command: '\\lambda ' },
  { label: 'μ', command: '\\mu ' },
  { label: 'ν', command: '\\nu ' },
  { label: 'ξ', command: '\\xi ' },
  { label: 'π', command: '\\pi ' },
  { label: 'ρ', command: '\\rho ' },
  { label: 'σ', command: '\\sigma ' },
  { label: 'τ', command: '\\tau ' },
  { label: 'φ', command: '\\phi ' },
  { label: 'χ', command: '\\chi ' },
  { label: 'ψ', command: '\\psi ' },
  { label: 'ω', command: '\\omega ' },
  { label: 'Γ', command: '\\Gamma ' },
  { label: 'Δ', command: '\\Delta ' },
  { label: 'Θ', command: '\\Theta ' },
  { label: 'Λ', command: '\\Lambda ' },
  { label: 'Π', command: '\\Pi ' },
  { label: 'Σ', command: '\\Sigma ' },
  { label: 'Φ', command: '\\Phi ' },
  { label: 'Ψ', command: '\\Psi ' },
  { label: 'Ω', command: '\\Omega ' },
];

const latexCommands = [
  { label: '\\frac{}{}', command: '\\frac{}{}', cursorOffset: -3 },
  { label: '\\sqrt{}', command: '\\sqrt{}', cursorOffset: -1 },
  { label: '^{}', command: '^{}', cursorOffset: -1 },
  { label: '_{}', command: '_{}', cursorOffset: -1 },
  { label: '\\int', command: '\\int_{}^{}', cursorOffset: -5 },
  { label: '\\sum', command: '\\sum_{}^{}', cursorOffset: -5 },
  { label: '\\prod', command: '\\prod_{}^{}', cursorOffset: -5 },
  { label: '\\infty', command: '\\infty', cursorOffset: 0 },
  { label: '\\theta', command: '\\theta', cursorOffset: 0 },
];

export function FragmentEditor({ content, onChange }: FragmentEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [showSymbolPalette, setShowSymbolPalette] = useState(false);
  const [symbolTab, setSymbolTab] = useState<'math' | 'greek'>('math');
  const [isSaving, setIsSaving] = useState(false);
  
  // Track cursor position
  const handleSelect = () => {
    if (textareaRef.current) {
      setCursorPosition(textareaRef.current.selectionStart);
    }
  };
  
  // Insert command at cursor
  const insertCommand = (command: string, cursorOffset: number = 0) => {
    const before = content.slice(0, cursorPosition);
    const after = content.slice(cursorPosition);
    const newContent = before + command + after;
    onChange(newContent);
    
    // Set cursor position after insertion
    setTimeout(() => {
      if (textareaRef.current) {
        const newPosition = cursorPosition + command.length + cursorOffset;
        textareaRef.current.setSelectionRange(newPosition, newPosition);
        textareaRef.current.focus();
        setCursorPosition(newPosition);
      }
    }, 0);
  };
  
  // Auto-save indicator
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
    }, 500);
  };
  
  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 rounded-lg bg-white/5">
        {/* LaTeX Commands */}
        {latexCommands.map((cmd) => (
          <button
            key={cmd.label}
            onClick={() => insertCommand(cmd.command, cmd.cursorOffset)}
            className="px-2 py-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors text-xs font-mono"
            title={cmd.label}
          >
            {cmd.label}
          </button>
        ))}
        
        <div className="w-px h-5 bg-white/20 mx-1" />
        
        {/* Common delimiters */}
        <button
          onClick={() => insertCommand('$$', -1)}
          className="px-2 py-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono"
          title="Inline math"
        >
          $...$
        </button>
        <button
          onClick={() => insertCommand('$$$$', -2)}
          className="px-2 py-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono"
          title="Display math"
        >
          $$...$$
        </button>
        <button
          onClick={() => insertCommand('\\left( \\right)', -9)}
          className="px-2 py-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono"
          title="Parentheses"
        >
          ( )
        </button>
        <button
          onClick={() => insertCommand('\\left[ \\right]', -9)}
          className="px-2 py-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono"
          title="Brackets"
        >
          [ ]
        </button>
        <button
          onClick={() => insertCommand('\\left\\{ \\right\\}', -10)}
          className="px-2 py-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white text-xs font-mono"
          title="Braces"
        >
          {'{ }'}
        </button>
        
        <div className="w-px h-5 bg-white/20 mx-1" />
        
        {/* Symbol Palette Toggle */}
        <button
          onClick={() => setShowSymbolPalette(!showSymbolPalette)}
          className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs ${
            showSymbolPalette ? 'bg-mait-cosmic/30 text-mait-cyan' : 'text-white/60 hover:text-white hover:bg-white/10'
          }`}
        >
          <Type className="w-3 h-3" />
          Symbols
          <ChevronDown className={`w-3 h-3 transition-transform ${showSymbolPalette ? 'rotate-180' : ''}`} />
        </button>
      </div>
      
      {/* Symbol Palette */}
      {showSymbolPalette && (
        <div className="p-2 rounded-lg bg-white/5 border border-white/10 animate-in slide-in-from-top-2">
          {/* Tabs */}
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setSymbolTab('math')}
              className={`px-3 py-1 rounded text-xs ${
                symbolTab === 'math' ? 'bg-mait-cosmic/30 text-mait-cyan' : 'text-white/50 hover:text-white'
              }`}
            >
              Math Symbols
            </button>
            <button
              onClick={() => setSymbolTab('greek')}
              className={`px-3 py-1 rounded text-xs ${
                symbolTab === 'greek' ? 'bg-mait-cosmic/30 text-mait-cyan' : 'text-white/50 hover:text-white'
              }`}
            >
              Greek Letters
            </button>
          </div>
          
          {/* Symbols Grid */}
          <div className="grid grid-cols-9 gap-1">
            {(symbolTab === 'math' ? mathSymbols : greekLetters).map((sym) => (
              <button
                key={sym.label}
                onClick={() => insertCommand(sym.command)}
                className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white text-sm font-mono transition-colors"
                title={sym.command}
              >
                {sym.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Textarea */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onSelect={handleSelect}
          onKeyUp={handleSelect}
          onClick={handleSelect}
          placeholder="Enter LaTeX content..."
          className="w-full h-48 px-4 py-3 rounded-lg bg-black/30 border border-white/10 text-white font-mono text-sm resize-y focus:border-mait-cyan focus:outline-none transition-colors"
          spellCheck={false}
        />
        
        {/* Save indicator */}
        <div className="absolute bottom-2 right-2 text-xs text-white/30">
          {isSaving ? 'Saving...' : 'Saved'}
        </div>
      </div>
      
      {/* Line count indicator */}
      <div className="flex items-center justify-between text-xs text-white/40">
        <span>{content.split('\n').length} lines</span>
        <span>{content.length} characters</span>
      </div>
    </div>
  );
}
