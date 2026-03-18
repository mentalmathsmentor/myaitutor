import re
from typing import List, Dict

def parse_monolithic_latex(raw_latex: str) -> List[Dict[str, str]]:
    """
    Decomposes a monolithic LaTeX document string into logical elements
    suitable for the MAIT Native Canvas frontend.
    
    Expected elements:
    - Preamble (up to \begin{document})
    - Header (e.g. title and name fields)
    - Body (the questions)
    - Footer (e.g. page numbers, \end{document})
    """
    elements = []
    
    # Normalize line endings
    latex = raw_latex.replace('\\r\\n', '\\n')
    
    # 1. Extract Preamble
    preamble_match = re.search(r'^(.*?\\begin\{document\})', latex, flags=re.DOTALL)
    if preamble_match:
        preamble = preamble_match.group(1).strip()
        latex = latex[preamble_match.end():].strip()
    else:
        preamble = "\\documentclass[12pt,a4paper]{article}\\n\\begin{document}"
        
    elements.append({
        "kind": "preamble",
        "content_latex": preamble,
        "label": "Preamble",
        "is_locked": True,
        "is_collapsed": True,
        "sort_key": "a0"
    })
    
    # 2. Extract Footer
    footer_match = re.search(r'(\\vfill.*?\\end\{document\}|\\end\{document\})$', latex, flags=re.DOTALL)
    if footer_match:
        footer = footer_match.group(1).strip()
        latex = latex[:footer_match.start()].strip()
    else:
        footer = "\\end{document}"
        
    # 3. Extract Header vs Body
    # A typical header might be a \begin{center} ... \end{center} block at the top
    header_match = re.search(r'^(\\begin\{center\}.*?\\end\{center\})(.*?)$', latex, flags=re.DOTALL)
    
    if header_match:
        header = header_match.group(1).strip()
        body = header_match.group(2).strip()
        elements.append({
            "kind": "header",
            "content_latex": header,
            "label": "Header",
            "is_locked": False,
            "is_collapsed": False,
            "sort_key": "a1"
        })
    else:
        # If no clear header center block, just put everything in body, or look for \vspace
        body = latex
        
    elements.append({
        "kind": "question",
        "content_latex": body,
        "label": "Questions",
        "is_locked": False,
        "is_collapsed": False,
        "sort_key": "a2"
    })
    
    elements.append({
        "kind": "footer",
        "content_latex": footer,
        "label": "Footer",
        "is_locked": True,
        "is_collapsed": True,
        "sort_key": "a3"
    })
    
    return elements
