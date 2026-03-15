---
name: hsc-math-content
description: Generate NSW HSC-aligned mathematics content including problems, worked solutions, explanations, and teaching scaffolds. Use when creating or improving math tutoring content, practice questions, or syllabus-grounded explanations for Year 11-12 students.
---

This skill guides the generation of high-quality, curriculum-accurate mathematics content for NSW HSC students (Years 11–12). All content must be grounded in the current NESA Mathematics syllabi and adhere to HSC marking conventions.

The user provides a topic, question, or content need. They may specify the course (Standard 1/2, Advanced, Extension 1, Extension 2), year level, Bloom's taxonomy level, or difficulty tier.

## Curriculum Alignment

Always reference the correct syllabus:
- **Mathematics Standard 1 & 2** — practical, real-world applications; no calculus in Standard 1
- **Mathematics Advanced** — functions, calculus, statistics, networks
- **Mathematics Extension 1** — further calculus, combinatorics, vectors, trigonometry
- **Mathematics Extension 2** — complex numbers, proof, mechanics, further integration

**CRITICAL**: Never introduce techniques that are outside the HSC syllabus for the specified course. A Standard student cannot use integration by parts; an Advanced student cannot use vectors. HSC marking schemes penalise non-syllabus methods.

## Content Generation Principles

### Problems & Questions
- Match the HSC exam format: structured multi-part questions with marks allocated per part
- Use realistic Australian contexts (e.g., finance problems using AUD, geography using Australian cities)
- Scale difficulty across parts: (a) is accessible, later parts extend to Band 6 challenge
- Include calculator-allowed and non-calculator variants where relevant
- Provide `[X marks]` notation for each part

### Worked Solutions
- Show every line of working — HSC markers award method marks, not just final answers
- Use correct mathematical notation (LaTeX formatting where possible)
- Annotate key steps with brief justifications ("using the product rule", "factorising the quadratic")
- Flag common student errors alongside the correct method
- Match precision to the marks: a 3-mark question needs 3 distinct steps visible

### Explanations & Teaching
- Use the Socratic approach: guide students to discover the method rather than stating it outright
- Scaffold from concrete → abstract (worked example first, then general rule)
- Connect to prior knowledge (e.g., "recall from Year 10 that...")
- Anticipate and address misconceptions explicitly
- Use multiple representations: algebraic, graphical, numerical, verbal

### Bloom's Taxonomy Alignment
Calibrate content to the student's cognitive level:
- **Remember** — recall formulas, definitions, identify graph types
- **Understand** — explain why a method works, interpret a result
- **Apply** — use a technique on a standard problem
- **Analyse** — compare methods, identify structure in a complex problem
- **Evaluate** — judge the most efficient approach, verify a solution's reasonableness
- **Create** — construct a proof, design a problem, generalise a pattern

## Formatting Standards

- Use LaTeX notation for all mathematical expressions: `$x^2 + 3x - 4 = 0$`
- Display equations on their own line: `$$\int_0^1 x^2\,dx = \frac{1}{3}$$`
- Structure problems with clear part labels: **(a)**, **(b)**, **(c)**
- Include a **Hint** section for scaffold-level support and a **Solution** section hidden by default
- Mark extension challenges clearly: ⭐ for Band 5–6 difficulty

## Quality Checklist

Before finalising any content:
- [ ] Syllabus dot-point reference confirmed
- [ ] Method is valid for the specified course level
- [ ] Marking guide allocates marks to correct steps
- [ ] Answer is verified by back-substitution or alternative method
- [ ] Language is age-appropriate and free of jargon beyond HSC expectations
- [ ] Australian context used where applicable
