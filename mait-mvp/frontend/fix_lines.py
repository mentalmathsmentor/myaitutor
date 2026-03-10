import re

with open("src/WorksheetGenerator.jsx", "r") as f:
    content = f.read()

# We will find the exact block and replace it.
old_block = r"""\pagestyle{fancy}
\fancyhf{}
\lhead{ ${lheadContent} }
\rhead{}
\cfoot{Page \thepage \\[0.2cm] \footnotesize \textbf{AI SELF-CHECK:} \textit{Ask AI for a hint, not the answer.}}
${removeWatermark ? '\rfoot{}' : '\rfoot{\textcolor{gray!50}{\tiny \textit{myaitutor.au/worksheets}}}'}
\renewcommand{\headrulewidth}{0.4pt}
\setlength{\headheight}{30pt}
\begin{document}
\sloppy
${headerString ? `\n${headerString}\n\vspace{0.8cm}\n` : ''}
\begin{center}
    {\Large \textbf{ ${mode === 'A' ? 'Syllabus Focus: Mixed Topics' : 'Custom Worksheet'} }}
\end{center}
\vspace{0.5cm}

${contentString}

${spacingLogic}

${marksLogic}

${answerKeyLogic}
` : ''
    }
** 2. LAYOUT & FORMATTING RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment.Let LaTeX handle numbering.Do NOT use custom labels like \item[\textbf{Question 1: }].
* LINE BREAKS: Do NOT use \\ for line breaks within questions.Use a blank line(double return) to ensure text aligns to the left margin perfectly.
* Spacing: ${ spacingLogic }
* ** MARKS ALIGNMENT(CRITICAL):** ${ marksLogic === 'Do not assign marks' ? marksLogic : `If assigning marks, you MUST use \`${marksLogic}\` at the very end of the question text. The \mbox{} is critical to prevent the number and the word 'Marks' from being split across two lines. Do NOT let the marks wrap to a new line awkwardly. Ensure they are pushed completely flush-right.` }
* ** MANDATORY DIAGRAMS & SHAPES:** If a question mentions a shape, graph, diagram, angle relationship(e.g., "vertically opposite", "transversal"), or geometric property, you MUST generate the corresponding TikZ code to draw a clean, professional diagram below the question text.

** 3. PAGINATION & FOOTER:**
* Before every new \item, insert \needspace{ 6cm }.

** 4. SCALING FOR 30 + QUESTIONS:**
        If the request is for more than 20 questions, ensure you maintain high quality and varied task difficulty.For 30 + questions, you may use smaller spacing segments to fit the content while maintaining readability.

** 5. ANSWER KEY:**
        ${ answerKeyLogic }.

***
** USER CONTENT TO PROCESS:**
        ${ contentString }
    `;"""

new_block = r"""\\pagestyle{fancy}
\\fancyhf{}
\\lhead{ ${lheadContent} }
\\rhead{}
\\cfoot{Page \\thepage \\\\[0.2cm] \\footnotesize \\textbf{AI SELF-CHECK:} \\textit{Ask AI for a hint, not the answer.}}
${removeWatermark ? '\\rfoot{}' : '\\rfoot{\\textcolor{gray!50}{\\tiny \\textit{myaitutor.au/worksheets}}}'}
\\renewcommand{\\headrulewidth}{0.4pt}
\\setlength{\\headheight}{30pt}
\\begin{document}
\\sloppy
${headerString ? `\n${headerString}\n\\vspace{0.8cm}\n` : ''}
\\begin{center}
    {\\Large \\textbf{ ${mode === 'A' ? 'Syllabus Focus: Mixed Topics' : 'Custom Worksheet'} }}
\\end{center}
\\vspace{0.5cm}

${contentString}

${spacingLogic}

${marksLogic}

${answerKeyLogic}

**2. LAYOUT & FORMATTING RULES:**
* NATIVE NUMBERING ONLY: Use the standard enumerate environment. Let LaTeX handle numbering. Do NOT use custom labels like \\item[\\textbf{Question 1:}].
* LINE BREAKS: Do NOT use \\\\ for line breaks within questions. Use a blank line (double return) to ensure text aligns to the left margin perfectly.
* Spacing: ${spacingLogic}
* **MARKS ALIGNMENT (CRITICAL):** ${marksLogic === 'Do not assign marks' ? marksLogic : `If assigning marks, you MUST use \`${marksLogic}\` at the very end of the question text. The \\mbox{} is critical to prevent the number and the word 'Marks' from being split across two lines. Do NOT let the marks wrap to a new line awkwardly. Ensure they are pushed completely flush-right.`}
* **MANDATORY DIAGRAMS & SHAPES:** If a question mentions a shape, graph, diagram, angle relationship (e.g., "vertically opposite", "transversal"), or geometric property, you MUST generate the corresponding TikZ code to draw a clean, professional diagram below the question text.

**3. PAGINATION & FOOTER:**
* Before every new \\item, insert \\needspace{6cm}.

**4. SCALING FOR 30+ QUESTIONS:**
If the request is for more than 20 questions, ensure you maintain high quality and varied task difficulty. For 30+ questions, you may use smaller spacing segments to fit the content while maintaining readability.

**5. ANSWER KEY:**
${answerKeyLogic}.

***
**USER CONTENT TO PROCESS:**
${contentString}
`;"""

import sys

# Replace using string manipulation to be safe
start_idx = content.find("\\pagestyle{fancy}")
if start_idx == -1:
    print("Could not find start index")
    sys.exit(1)

end_marker = "    `;\n    }\n\n    const closeModal = () => {"
end_idx = content.find(end_marker)
if end_idx == -1:
    print("Could not find end index")
    sys.exit(1)

# Now just inject exactly what we want in between!
final_content = content[:start_idx] + new_block + "\n    }\n\n    const closeModal = () => {" + content[end_idx + len(end_marker):]

with open("src/WorksheetGenerator.jsx", "w") as f:
    f.write(final_content)
print("Replaced!")
