import re
from typing import List, Dict

def parse_monolithic_latex(raw_latex: str, title: str = "Worksheet") -> List[Dict[str, str]]:
    """
    Decomposes a raw LaTeX enumerate block (output directly from Gemini)
    into a sequence of individual question elements for the MAIT Canvas.
    
    Expected format:
    \begin{enumerate}
      \item ...
      \item ...
    \end{enumerate}
    """
    elements = []
    
    preamble = f"""\\documentclass[12pt, a4paper]{{article}}
\\usepackage[top=1cm, bottom=1.2cm, left=2cm, right=2cm, headheight=18pt, headsep=12pt, footskip=15pt, includehead, includefoot]{{geometry}}
\\usepackage{{amsmath, amssymb, fancyhdr, graphicx, tikz, pgfplots, enumitem, tcolorbox, needspace, multicol}}
\\usepackage[none]{{hyphenat}}
\\usepackage[hidelinks]{{hyperref}}
\\usetikzlibrary{{arrows.meta, calc, angles, quotes, patterns, decorations.markings, intersections, positioning}}
\\pgfplotsset{{compat=1.18}}
\\setlength{{\\columnsep}}{{1cm}}
\\setlength{{\\columnseprule}}{{0.4pt}}
\\setlist[enumerate,1]{{labelindent=0.4cm,leftmargin=!,labelsep=0.35cm,align=left,widest=99}}
\\pagestyle{{fancy}}
\\fancyhf{{}}
\\lhead{{ \\textbf{{ MyAITutor.au }} }}
\\rhead{{ \\textbf{{ {title} }} }}
\\cfoot{{Page \\thepage}}
\\renewcommand{{\\headrulewidth}}{{0.4pt}}

\\begin{{document}}
\\sloppy"""

    elements.append({
        "kind": "preamble",
        "content_latex": preamble,
        "label": "Preamble",
        "is_locked": True,
        "is_collapsed": True,
        "sort_key": "a0"
    })
    
    header = f"""\\begin{{center}}
    {{\\Large \\textbf{{ {title} }} }}
\\end{{center}}
\\vspace{{0.5cm}}

Name: \\underline{{\\hspace{{6cm}}}} \\hfill Date: \\underline{{\\hspace{{3cm}}}}

\\vspace{{1em}}"""

    elements.append({
        "kind": "header",
        "content_latex": header,
        "label": "Header",
        "is_locked": False,
        "is_collapsed": False,
        "sort_key": "a1"
    })

    # Normalize line endings
    latex = raw_latex.replace('\r\n', '\n').strip()
    
    # We expect Gemini to output exactly a \begin{enumerate} ... \end{enumerate} block.
    # We will slice off the wrappers and make them locked blocks.
    match = re.search(r'\\begin\{enumerate\}(.*?)\\end\{enumerate\}', latex, flags=re.DOTALL)
    if not match:
        # If Gemini failed to wrap it, just dump it as one block
        elements.append({
            "kind": "question",
            "content_latex": latex,
            "label": "Questions",
            "is_locked": False,
            "is_collapsed": False,
            "sort_key": "a2_0_invalid"
        })
        return elements

    inner_content = match.group(1)
    
    elements.append({
        "kind": "text_block",
        "content_latex": "\\begin{enumerate}",
        "label": "List Start",
        "is_locked": True,
        "is_collapsed": True,
        "sort_key": "a2_a_start"
    })
    
    # Split the inner_content by top-level \item.
    # To avoid splitting on \item inside a sub-environment, we maintain a depth counter.
    items = []
    current_item = []
    depth = 0
    
    tokens = re.split(r'(\\begin\{[^}]+\}|\\end\{[^}]+\}|\\item\b\s*(?:\[[^\]]*\])?)', inner_content)
    
    for token in tokens:
        if token.startswith('\\begin{'):
            depth += 1
            current_item.append(token)
        elif token.startswith('\\end{'):
            depth -= 1
            current_item.append(token)
        elif token.startswith('\\item') and depth == 0:
            # We hit a top-level item! Finish the previous item.
            if current_item:
                text = "".join(current_item).strip()
                if text:
                    items.append(text)
            current_item = [token]
        else:
            current_item.append(token)
            
    if current_item:
        text = "".join(current_item).strip()
        if text:
            items.append(text)
            
    # Add each top-level item as a question block!
    for i, item_text in enumerate(items):
        label_text = item_text[:30].replace('\n', ' ').strip() + "..." if len(item_text) > 30 else item_text.replace('\n', ' ')
        elements.append({
            "kind": "question",
            "content_latex": item_text,
            "label": f"Question {i+1}",
            "is_locked": False,
            "is_collapsed": False,
            "sort_key": f"a2_b_{i:03d}"
        })
        
    elements.append({
        "kind": "text_block",
        "content_latex": "\\end{enumerate}",
        "label": "List End",
        "is_locked": True,
        "is_collapsed": True,
        "sort_key": "a2_c_end"
    })
    
    elements.append({
        "kind": "text_block",
        "content_latex": "\\rfoot{\\textcolor{gray!50}{\\tiny \\textit{myaitutor.au/worksheets}}}",
        "label": "Watermark",
        "is_locked": False,
        "is_collapsed": False,
        "sort_key": "a2_d_wm"
    })

    footer = "\\vfill\n\n\\hrule\n\\vspace{0.5em}\n\\begin{center}\n\\textit{End of Worksheet}\n\\end{center}\n\n\\end{document}"
    elements.append({
        "kind": "footer",
        "content_latex": footer,
        "label": "Footer",
        "is_locked": True,
        "is_collapsed": True,
        "sort_key": "a3"
    })
    
    return elements
