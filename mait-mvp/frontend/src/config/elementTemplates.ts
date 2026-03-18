import type { ElementKind } from '@/stores/canvasStore';

export interface ElementTemplate {
  id: string;
  kind: ElementKind;
  label: string;
  icon: string;
  category: string;
  defaultContent: string;
  metadata?: {
    marks?: number;
    spaceAfter?: string;
    isImagePlaceholder?: boolean;
  };
}

export const ELEMENT_TEMPLATES: ElementTemplate[] = [
  // ... (content stays same, just renaming the constant and interface)
  // ── Questions ──────────────────────────────────────────
  {
    id: 'standard_question',
    kind: 'question',
    label: 'Standard Question [2 Marks]',
    icon: 'SquarePen',
    category: 'Questions',
    defaultContent: `\\item Solve the following equation for $x$:

\\[ 3x^2 - 12x + 9 = 0 \\]

\\hfill \\textbf{[2 Marks]}`,
    metadata: { marks: 2, spaceAfter: '4cm' },
  },
  {
    id: 'multi_part_question',
    kind: 'question',
    label: 'Multi-Part Question [6 Marks]',
    icon: 'ListOrdered',
    category: 'Questions',
    defaultContent: `\\item Consider the function $f(x) = x^3 - 3x + 2$.
\\begin{enumerate}[label=(\\alph*)]
  \\item Find $f'(x)$. \\hfill \\textbf{[2 Marks]}
  \\item Find the stationary points and determine their nature. \\hfill \\textbf{[3 Marks]}
  \\item Sketch the graph of $y = f(x)$. \\hfill \\textbf{[1 Mark]}
\\end{enumerate}`,
    metadata: { marks: 6, spaceAfter: '6cm' },
  },
  {
    id: 'short_answer',
    kind: 'question',
    label: 'Short Answer [1 Mark]',
    icon: 'MessageSquare',
    category: 'Questions',
    defaultContent: `\\item Simplify: $(x^2)^3$. \\hfill \\textbf{[1 Mark]}

\\vspace{2cm}`,
    metadata: { marks: 1, spaceAfter: '2cm' },
  },
  
  // ── Diagrams ───────────────────────────────────────────
  {
    id: 'number_plane',
    kind: 'diagram',
    label: 'Number Plane (TikZ)',
    icon: 'Grid3X3',
    category: 'Diagrams',
    defaultContent: `\\begin{center}
\\begin{tikzpicture}[scale=0.6]
  \\draw[step=1cm,gray!30,very thin] (-5,-5) grid (5,5);
  \\draw[thick,->] (-5,0) -- (5,0) node[right] {$x$};
  \\draw[thick,->] (0,-5) -- (0,5) node[above] {$y$};
  \\foreach \\x in {-4,-3,-2,-1,1,2,3,4}
    \\draw (\\x,0.1) -- (\\x,-0.1) node[below,font=\\tiny] {\\x};
  \\foreach \\y in {-4,-3,-2,-1,1,2,3,4}
    \\draw (0.1,\\y) -- (-0.1,\\y) node[left,font=\\tiny] {\\y};
\\end{tikzpicture}
\\end{center}`,
    metadata: { spaceAfter: '1cm' },
  },
  {
    id: 'unit_circle',
    kind: 'diagram',
    label: 'Unit Circle (Trig)',
    icon: 'Circle',
    category: 'Diagrams',
    defaultContent: `\\begin{center}
\\begin{tikzpicture}[scale=2]
  \\draw[thick] (0,0) circle (1);
  \\draw[thick,->] (-1.3,0) -- (1.3,0) node[right] {$x$};
  \\draw[thick,->] (0,-1.3) -- (0,1.3) node[above] {$y$};
  \\draw[dashed] (0,0) -- (30:1) node[midway,above] {$1$};
  \\draw (0.3,0) arc (0:30:0.3) node[midway,right,font=\\small] {$\\theta$};
\\end{tikzpicture}
\\end{center}`,
    metadata: { spaceAfter: '1cm' },
  },
  {
    id: 'parabola_graph',
    kind: 'diagram',
    label: 'Parabola Graph',
    icon: 'TrendingUp',
    category: 'Diagrams',
    defaultContent: `\\begin{center}
\\begin{tikzpicture}[scale=0.8]
  \\draw[step=1cm,gray!30,very thin] (-4,-3) grid (4,5);
  \\draw[thick,->] (-4,0) -- (4,0) node[right] {$x$};
  \\draw[thick,->] (0,-3) -- (0,5) node[above] {$y$};
  \\draw[thick,blue,domain=-2.2:2.2,samples=100] plot (\\x, {\\x*\\x});
  \\fill[blue] (0,0) circle (3pt) node[below left] {$(0,0)$};
\\end{tikzpicture}
\\end{center}`,
    metadata: { spaceAfter: '1cm' },
  },
  {
    id: 'image_placeholder',
    kind: 'diagram',
    label: 'Image Placeholder',
    icon: 'ImageOff',
    category: 'Diagrams',
    defaultContent: `\\begin{center}
\\fbox{\\parbox{0.8\\textwidth}{
  \\centering
  \\vspace{3cm}
  {\\large\\textit{Image Placeholder}}\\\\[0.5em]
  {\\small\\textcolor{gray}{Space reserved for image insertion}}
  \\vspace{3cm}
}}
\\end{center}`,
    metadata: { spaceAfter: '1cm', isImagePlaceholder: true },
  },
  
  // ── Pedagogical Blocks ─────────────────────────────────
  {
    id: 'sabotage_box',
    kind: 'instruction',
    label: 'Spot the Error Box',
    icon: 'AlertTriangle',
    category: 'Pedagogical',
    defaultContent: `\\noindent\\fbox{\\parbox{\\textwidth}{
  \\textbf{SPOT THE ERROR}\\\\[0.5em]
  A student submitted this working. Find and correct the mistake:
  \\[ (x+2)^2 = x^2 + 4 \\]
}}`,
    metadata: { spaceAfter: '3cm' },
  },
  {
    id: 'worked_example',
    kind: 'worked_example',
    label: 'Worked Example',
    icon: 'GraduationCap',
    category: 'Pedagogical',
    defaultContent: `\\noindent\\fbox{\\parbox{\\textwidth}{
  \\textbf{Worked Example}\\\\[0.5em]
  \\textbf{Find} $\\frac{d}{dx}(x^2 \\sin x)$\\\\[0.5em]
  \\textbf{Solution:} Using the product rule, $\\frac{d}{dx}(uv) = u'v + uv'$:
  \\begin{align*}
    u &= x^2, \\quad u' = 2x \\\\
    v &= \\sin x, \\quad v' = \\cos x \\\\
    \\frac{d}{dx}(x^2 \\sin x) &= 2x\\sin x + x^2\\cos x
  \\end{align*}
}}`,
    metadata: { spaceAfter: '2cm' },
  },
  {
    id: 'hint_box',
    kind: 'instruction',
    label: 'Hint Box',
    icon: 'Lightbulb',
    category: 'Pedagogical',
    defaultContent: `\\noindent\\fbox{\\parbox{\\textwidth}{
  \\textbf{Hint}\\\\[0.5em]
  Remember to check your answer by substituting back into the original equation.
}}`,
    metadata: { spaceAfter: '1cm' },
  },
  
  // ── Layout ─────────────────────────────────────────────
  {
    id: 'section_divider',
    kind: 'text_block',
    label: 'Section Divider',
    icon: 'Minus',
    category: 'Layout',
    defaultContent: `\\vspace{12pt}
\\hrule
\\vspace{6pt}
{\\large\\bfseries Section B --- Extended Response}
\\vspace{6pt}
\\hrule
\\vspace{12pt}`,
    metadata: { spaceAfter: '0cm' },
  },
  {
    id: 'new_page',
    kind: 'text_block',
    label: 'New Page',
    icon: 'FileText',
    category: 'Layout',
    defaultContent: `\\newpage`,
    metadata: { spaceAfter: '0cm' },
  },
  {
    id: 'self_check_footer',
    kind: 'footer',
    label: 'AI Self-Check Footer',
    icon: 'Bot',
    category: 'Layout',
    defaultContent: `\\vfill
\\hrule
\\vspace{0.2cm}
{\\footnotesize \\textbf{SELF-CHECK PROTOCOL:} \\\\
\\textbf{Stuck?} Screenshot this question. \\\\
\\textbf{Ask AI:} \\textit{"Act as my tutor and coach me through this..."}}`,
  },
  {
    id: 'answer_key_header',
    kind: 'header',
    label: 'Answer Key Header',
    icon: 'Key',
    category: 'Layout',
    defaultContent: `\\newpage
\\begin{center}
\\Large\\textbf{Answer Key}
\\end{center}

\\vspace{1em}`,
  },
];

export const TEMPLATE_CATEGORIES = [
  { id: 'Questions', icon: 'HelpCircle', label: 'Questions' },
  { id: 'Diagrams', icon: 'PenTool', label: 'Diagrams' },
  { id: 'Pedagogical', icon: 'Lightbulb', label: 'Pedagogical' },
  { id: 'Layout', icon: 'LayoutTemplate', label: 'Layout' },
];

export const getTemplatesByCategory = (categoryId: string) => {
  return ELEMENT_TEMPLATES.filter((t) => t.category === categoryId);
};

export const getTemplateById = (id: string) => {
  return ELEMENT_TEMPLATES.find((t) => t.id === id);
};
