# PEDAGOGY RESEARCH BRIEF — Tutor Dashboard Learning-Science Pass

**Date:** 2026-07-21 | **Owner:** Darra | **Purpose:** put evidence under the tutor-dashboard build (pre-session brief, deck, mastery map, outcome taps, post-session distillation) before its constants freeze. Canon §7's numbers are currently ruled by fiat; this pass confirms or corrects them.
**How to use:** §1 is the master prompt — paste it whole into each deep-research tool (§2 has per-tool notes). §3 records the council runs already dispatched from this repo (Sol offline synthesis; Gemini 3.1 Pro with web search). Results get synthesised into `PEDAGOGY_FINDINGS.md` (Chairman's job), which then amends the dashboard spec.

---

## 1. MASTER PROMPT (self-contained — paste as-is)

You are researching the learning-science foundation for a real product decision. Produce a decision-grade research report, not a literature survey.

CONTEXT (real and specific — ground every recommendation in it):
A solo professional mathematics tutor in NSW, Australia runs 60-minute weekly 1-1 sessions with ~5 students across Years 7–12, teaching to the NSW NESA syllabus (Stage 4, Stage 5, Mathematics Standard 1/2, Mathematics Advanced; HSC exam preparation for seniors). The tutor is building a personal tutoring cockpit ("MAIT") that replaces a ChatGPT/Gemini custom-bot prep workflow. Already built: an AI question generator grounded in retrieved syllabus extracts; per-student memory (per-topic mastery states, a "misconception vault" of observed errors, session logs); an independent AI verifier that checks each generated question; LaTeX worksheet export. The tutor always sees full worked solutions. Students do not use the app directly in this cycle — every surface is tutor-facing.

The dashboard being designed has four parts:
1. PRE-SESSION BRIEF (auto-generated per student): mastery snapshot, overdue retrieval topics, active misconceptions, and a pre-generated question deck (retrieval/trap warmup + main set on the planned topic + challenge reserve).
2. IN-SESSION: full-screen question cards; after each question the tutor taps one outcome — nailed / struggled / bombed / skipped; struggled and bombed can attach a misconception tag.
3. COMMAND BAR: ad-hoc AI question generation mid-session.
4. POST-SESSION: the tutor brain-dumps free text; AI extracts proposed structured updates (mastery transitions, misconception entries, profile-summary changes) which the tutor reviews and approves before anything commits.

CURRENT CONSTANTS — RULED BY FIAT, NOT EVIDENCE; your job is to confirm or correct each:
- Mastery ladder per topic: unseen → introduced → shaky → solid → mastered. Promote after 2 consecutive successes at the current level; demote one level on a single hard failure ("bombed"); promotion to mastered must span ≥2 distinct sessions.
- Spaced retrieval: shaky → due next session; solid → due ~14 days; mastered → due ~42 days, resurfacing as challenge/checking items (mastered topics are excluded from new teaching but never from retrieval).
- Deck shape: 3-question retrieval/trap warmup, then the main set, then challenge reserve.
- Misconception vault entries are triplets (topic → failure mode → error class), created only from errors the tutor actually observed and tagged.

RESEARCH QUESTIONS — answer every one; rank the evidence:
Q1 SPACING & RETRIEVAL. What do meta-analyses and recent replications (Cepeda et al.; Dunlosky et al.; Carpenter; Rohrer; anything 2015+) say about spacing intervals for secondary-maths skill retention over a term/year horizon? Expanding vs fixed schedules — is that contest resolved? Are next-session / ~14-day / ~42-day defensible values? What retrieval-to-new-content ratio within a session does evidence support? Interleaved vs blocked practice inside one 60-minute session — how much interleaving, for whom, and when does it backfire?
Q2 MASTERY MODEL. Against mastery-learning, precision-teaching, and knowledge-tracing literatures (Bloom; Binder; BKT/DKT parameter conventions; ALEKS/Khan-style implementations): is 2-consecutive-correct-promote / 1-fail-demote sound? What thresholds distinguish procedural fluency from conceptual mastery? Should "struggled" (succeeded with help) and "skipped" move the state at all?
Q3 MISCONCEPTIONS. Best-validated misconception taxonomies for secondary algebra, geometry, fractions/ratio, and statistics (CSMS/ICCAMS, Hart, Ryan & Williams, diagnostic-question banks like Eedi/White Rose). Is deliberately generating questions that probe a student's KNOWN misconception ("trap" items) supported, and under what feedback conditions? Refutational-text/feedback evidence vs avoidance approaches. What evidence standard should retire a vault entry (misconception considered resolved)?
Q4 ITEM & DECK DESIGN. Using the worked-example effect, faded scaffolding, self-explanation prompts, variation theory, and cognitive-load-informed sequencing: concretely, how should a 10–15 question 1-1 session deck be composed and ORDERED for (a) a struggling Year 8 student on fractions, and (b) a Year 12 Advanced student eight weeks before the HSC? Where do worked examples belong in a deck when a live tutor (not the material) supplies the explanation?
Q5 TUTORING MOVES. From human-tutoring research (Bloom's 2-sigma and its modern re-analyses; VanLehn 2011; Lepper & Woolverton; the 2020s high-dosage-tutoring literature, e.g. Nickow/Oreopoulos/Quan): which tutor behaviours carry the largest effects, which can a dashboard scaffold or prompt, and which must remain purely human judgment the software should stay out of?
Q6 SESSION RECORDS. From formative-assessment and learning-progression research (Black & Wiliam; learning-progression work in maths): which session data most predicts next-session effectiveness, and therefore what should the post-session AI extraction prioritise capturing — and what is noise not worth the tutor's review time?
Q7 MOTIVATION & DIFFICULTY. Evidence on desirable-difficulty / success-rate bands (the ~70–85% claims — how solid are they, e.g. Wilson et al. 2019 "eighty-five percent rule" vs critiques?), productive struggle vs frustration in 1-1 settings, feedback design (process vs person praise, Dweck-adjacent replication status), and whether visible streaks/mastery colours help or harm for ages 12–18 when the TUTOR (not the student) sees them.
Q8 ANTI-PATTERNS. What popular edtech pedagogy should this product explicitly refuse to implement — learning styles, over-gamification, decay-theatre ("your skills are rusting!"), speed pressure for accuracy tasks, etc. — with the evidence for why.

OUTPUT CONTRACT:
- Every recommendation maps to exactly ONE implementation slot: [PROMPT RULE] (a sentence the question-generator prompt should contain), [CONSTANT] (a number/threshold, with the value you recommend), [DECK RULE] (composition/ordering), or [UI] (what the tutor-facing dashboard shows). Tag each with an evidence tier — meta-analysis / RCT / quasi-experimental / theory-or-expert — and confidence 1–5.
- Cite specific studies and reviews with years. Where evidence is thin, contested, or has failed replication, SAY SO plainly — do not smooth over null results.
- Prioritise findings that survive contact with this exact setting: 1-1 with a live expert tutor present (much ITS/classroom evidence does not transfer — flag when it doesn't).
- End with: (a) TOP 10 CHANGES ranked by expected effect size × implementation cheapness; (b) the 3 current constants most likely to be wrong; (c) the 3 research questions above where evidence is too weak to rule and tutor judgment should stay in charge.

---

## 2. Per-tool notes

- **ChatGPT Deep Research:** paste §1 verbatim; when it asks scoping questions, answer "secondary mathematics, one-to-one human tutoring, evidence tiers as specified". Ask it to browse for post-2015 replications specifically.
- **Gemini Deep Research:** paste §1 verbatim; it structures well — additionally request a comparison table of recommended vs current constants.
- **Claude (Research mode):** paste §1 verbatim; ask it to be adversarial about the 70–85% success-band and expanding-spacing claims specifically (both are shakier than folk wisdom suggests).
- Do NOT share repo code or student data with any tool — §1 is deliberately self-contained and pseudonymous.

## 3. Council runs dispatched from this repo (2026-07-21)

- **GPT-5.6 Sol (codex, offline — no web):** §1 answered from training knowledge, plus two Sol-specific tasks: critique/extend the research questions (what the brief missed), and map each recommendation onto the actual repo hooks (`INTENT_TEMPLATES`/`SYSTEM_INSTRUCTION_CORE` in `services/prompts.py`, `RETRIEVAL_INTERVAL_DAYS` + mastery ladder in `db/tutor_models.py`, `_apply_mastery_transition` in `routers/students.py`, deck assembly in the planned brief generator). Output: `.cx_sol_pedagogy.txt`.
- **Gemini 3.1 Pro (gemini CLI, web search on, read-only mode):** §1 verbatim + instruction to use web search for post-2015 meta-analyses and NSW/NESA-specific sources (AERO, Ochre/Maths Hub, NESA support materials). Output: `.gx_gemini_pedagogy.txt`.
- **Synthesis rule (canon §9):** council outputs are triaged by the Chairman into `PEDAGOGY_FINDINGS.md` — verified against citations where checkable, never auto-applied; Darra ratifies anything that changes a ruled constant.
