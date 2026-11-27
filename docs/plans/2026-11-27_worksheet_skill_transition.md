# Worksheet skill transition and receipt-verified curriculum plan

Date: 27/11/2026  
Status: implemented in the worksheet handoff branch; live account upload still requires Darra.

## Verified platform facts

- Google says Gems transition to skills for personal accounts in November 2026. For personal accounts aged 18+, Gems became read-only on 17/11/2026 and are scheduled for removal on 17/12/2026. Workspace business/enterprise/non-profit and Education accounts have later 2027 migration windows.
  - https://support.google.com/gemini/answer/18560919?hl=en-GB
  - https://knowledge.workspace.google.com/admin/generative-ai/gemini-app/about-the-transition-to-skills
- Gemini skills are centred on `SKILL.md`; the skill name must be lowercase kebab-case, the description is limited to 1,024 characters, uploads are limited to 100 MB, `SKILL.md` to 10 MB, and a package to 100 files. Scripts must not need internet access or external API calls.
  - https://support.google.com/gemini/answer/17094296?hl=en
  - https://support.google.com/gemini/answer/18977944
- Agent Skills are now an open vendor-neutral format: a directory containing at minimum `SKILL.md`, with optional `scripts/`, `references/` and `assets/`.
  - https://agentskills.io/specification
- Claude documents progressive disclosure and recommends keeping the main `SKILL.md` under about 500 lines, moving detail into references. Claude ZIP uploads need the skill directory at the ZIP top level.
  - https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
  - https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
  - https://claude.com/docs/skills/how-to
- Gemini skills do not yet support every Gem feature; Google specifically lists Canvas and Deep Research among unsupported/default-tool gaps at the time of research. This must be verified in the target account before relying on either feature.
- No official numeric Gem instruction character limit was found. The former 8,000-character repository test is therefore not treated as a Google requirement; the replacement regression test checks documented portable-skill constraints instead.

## Curriculum model

The copied prompt must not say merely “use IB”. It must resolve and preserve the exact curriculum identity:

- NSW/NESA: exact stage, subject/course and syllabus version.
- IB MYP: exact MYP year 1-5 and whether standard or extended mathematics applies. The official MYP mathematics page describes number, algebra, geometry/trigonometry and statistics/probability, and standard versus extended challenge levels. An official IB research summary states that the IB approach does not provide specific or suggested year-by-year content; schools structure it themselves. Therefore a school year such as Year 8 must never be converted automatically into an MYP year. If the school confirms Year 8 = MYP Year 3, the prompt may use that confirmed mapping.
  - https://www.ibo.org/programmes/middle-years-programme/curriculum/mathematics/
  - https://www.ibo.org/globalassets/new-structure/research/pdfs/myp-math-skills-framework-summary-en.pdf
- IB DP: exact course (`analysis and approaches` or `applications and interpretation`), exact level (`SL` or `HL`), assessment cohort, and whether the current or incoming curriculum applies. The official DP page lists AA SL/HL and AI SL/HL, says students can study only one DP mathematics course, and distinguishes the current courses from the new curriculum taught from 2027 with first assessment in 2029.
  - https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/

## Receipt contract now embedded in Search prompts

Before generating, the receiving AI must retrieve official sources now and produce exact receipts:

1. source title;
2. organisation;
3. canonical URL or uploaded filename;
4. version, publication/last-updated date or first-assessment date;
5. access date;
6. exact section, page, table or heading used.

It must build a `topic -> receipt -> question-number` mapping and include it under Sources. If it cannot produce exact receipts, it must stop and ask for a syllabus upload or clarification. It must never claim alignment from memory, a local topic list, or an inaccessible page.

## Skill-first implementation shape

- Canonical source: `mait-mvp/frontend/src/features/worksheet/engine/SKILL.md`.
- Export helper: `mait-mvp/scripts/export_worksheet_skill.py`.
- Generated local artefacts, not committed because `frontend/dist/` is ignored:
  - `mait-mvp/frontend/dist/skills/mait-worksheet/SKILL.md`
  - `mait-mvp/frontend/dist/skills/mait-worksheet-skill.zip`
- The ZIP uses a top-level `mait-worksheet/` directory, matching Claude’s documented shape and remaining a reasonable Gemini upload package. Microsoft Agent Builder may require a different ZIP shape; do not assume one archive fits every host.
- `mait-mvp/Gem_Base_Instructions.md` is now only a deprecation/migration marker, not a source of truth.

## Creative worksheet-engine directions worth considering next

Highest-value near-term items from the independent inventive review:

1. deterministic returned-LaTeX linter in MAIT, checking question counts, mark totals, banned commands and teacher/student separation;
2. structured `%TEACHER` receipt lines that the linter recomputes rather than trusts;
3. misconception seeds in the syllabus registry, clearly labelled as MyAITutor-authored;
4. composition presets (Balanced / Drill-heavy / Exam arc / Custom) instead of only a raw count;
5. optional second-pass verify-lane prompt for a different AI;
6. single-question revision prompt builder;
7. prerequisite-aware suggestions using existing course topology;
8. bounded A/B variants for assessment integrity.

Deeper architecture candidates: plan → verify → render pipeline, explicit topic graph, verified numeric seed bank, server-side lint report, bounded layout vocabulary, and carefully constrained context themes. Do not automate sending, scrape official syllabus text into the packet, persist student identity, or trust model-written receipts without independent recomputation.
