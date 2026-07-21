# PEDAGOGY FINDINGS — Council Synthesis (Round 1: Sol + Gemini)

**Date:** 2026-07-21 | **Synthesiser:** Claude Fable 5 (Chairman) | **Status:** Round 1 of 2 — subscription deep-research results (ChatGPT/Gemini/Claude Research) pending; §7 reserves their slot. Nothing here auto-applies; changes to ruled canon constants need Darra (§4).
**Sources:** GPT-5.6 Sol offline synthesis with repo mapping (`.cx_sol_pedagogy.txt`, epistemic-status header honoured); Gemini (CLI default model — 3.1 Pro id rejected by API; model self-identification not confirmed) with web search (`.gx_gemini_pedagogy.txt`). Citation spot-checks by Chairman: Sol's citations all recognised and correctly characterised; Gemini's mostly real (Kang 2016, Rohrer et al. 2015, Wilson et al. 2019, Bisra et al. 2018, Pashler et al. 2008, Nancekivell et al. 2020) — **"Kao & Roll 2022" unverified, treat as unsupported**; Gemini's "expanding robustly superior, 5/5" is overclaimed against the literature (see D1).

---

## 1. Convergent findings (both model families agree — adopt as defaults)

1. **Spacing + effortful retrieval with feedback: robust. Exact intervals: not evidence-fixed.** 14d/42d are defensible weekly-session defaults, nothing more. (Cepeda 2006/2008; Adesope et al. 2017; Dunlosky et al. 2013.)
2. **Interleaving belongs in the deck** — strongest direct maths evidence in the whole report (Rohrer, Dedrick & Stershic 2015 classroom RCT; Brunmair & Richter 2019 meta-analysis on moderators). Carve-out both models insisted on: block the first examples of a genuinely new procedure; interleave 2–3 *confusable* types; retreat to blocked when discrimination errors spike.
3. **Trap items probing a student's known misconception are supported** — only when immediately followed by refutational correction, guided retry, and a later near-transfer check. Never repeat an uncorrected trap. (Refutational tradition: Guzzetti et al. 1993; Tippett 2010 — mostly science/text, transfer to live maths flagged by Sol.)
4. **`struggled` must not promote mastery state** (success-with-help ≠ competence); `skipped` is neutral. Unanimous.
5. **Vault retirement needs a rule**: unassisted disconfirming probes on varied forms, spanning ≥2 sessions with one delayed. (Gemini says 3 probes, Sol says 2 — both admit the number is operational policy, not evidence.)
6. **Worked-example → completion → faded → independent** sequencing for novices; expertise reversal for fluent seniors (Sweller & Cooper 1985; Renkl & Atkinson 2003; Kalyuga et al. 2003). In a 1-1 setting the live tutor is the example engine — deck cards cue the tutor's modelling, solution initially concealed.
7. **Self-explanation prompts** carry meta-analytic support (Bisra et al. 2018) — a [PROMPT RULE], not a new feature.
8. **Post-session extraction → structured approve/reject list** (mastery deltas, vault entries), not prose recaps. Matches canon §7's review-before-commit exactly.
9. **No success-rate target in the product.** The "85% rule" (Wilson et al. 2019) is a stylised model result, not a tutoring law. Cue-based instead: repeated effortless success → step up; repeated failure without progress → scaffold. Tutor judgment owns the switch-point.
10. **Anti-pattern list (unanimous, implement as refusals):** no learning-styles adaptation (Pashler et al. 2008; Coffield et al. 2004); no points/badges/streak-rewards (Sailer & Homner 2020; Deci et al. 1999); no decay theatre — "due for a check" is the only honest overdue language; no time pressure except tutor-selected exam-pacing segments; **never auto-commit AI-inferred state** (already canon's explicit-assertion rule — now also evidence-aligned).

## 2. Disagreements between the families (Chairman's verdict on each)

- **D1 · Expanding vs fixed spacing.** Gemini: expanding "robustly superior", recommends 7→21→60. Sol: no settled advantage over equal spacing once retrieval success is controlled (Karpicke & Roediger 2007). **Verdict: Sol reads the literature correctly** — the spacing *effect* is robust, the *schedule shape* is contested. Keep interval values as tunable constants; do not architect an expanding-schedule engine on this evidence. Revisit if the deep-research round finds post-2020 resolution.
- **D2 · Demotion mechanics.** Gemini: demote after 2 consecutive failures. Sol: one `bombed` resets success evidence and schedules review but never demotes alone; demote after 2 independent failures, preferably across sessions. **Verdict: adopt Sol's shape** (evidence-reset beats state-flip — less brittle against slips and bad items), which also subsumes Gemini's direction. This CHANGES a ruled canon constant → §4.
- **D3 · Success-rate heuristic.** Gemini keeps 70–80% as a soft band; Sol refuses any number. **Verdict: Sol** — no band in code or UI; the cue-based rule (§1.9) is the implementable form.

## 3. Repo-grounded corrections (Sol's mapping pass; verified against code by Chairman)

1. **Retrieval anchor is semantically wrong today:** `_due_for_retrieval` measures from `last_seen` — so a *failed* attempt postpones the next retrieval (a bombed mastered topic hides for another 42 days). Anchor on **last unassisted success** (`last_succeeded`), not exposure. `student_memory.py:58-67`, `tutor_models.py:31`. High priority; feeds the dashboard brief generator.
2. **`error_class = outcome` is a category error:** `record_outcome` writes the tap outcome ('bombed'/'struggled') into `mistake_vault.error_class`. An outcome is not an error class. Vault schema semantics need mechanism/confidence/lifecycle fields at dashboard build time. `routers/students.py:165-174`.
3. **Warmup template contradicts the evidence and canon §7:** currently "3-5 quick activation tasks" (generic); should be 2–3 **due cumulative retrievals** drawn from the mastery map. `prompts.py` `INTENT_TEMPLATES["warmup"]`. One-line change.
4. **Classroom assumptions leak into the 1-1 path:** `SYSTEM_INSTRUCTION_CORE`'s stage calibration prescribes think-pair-share/partner work — wrong surface for 1-1 tutoring. One-line change.
5. **Honest null (Sol):** no pre-session brief/deck assembler exists — `TutorSession.brief/deck` are storage without a generator. The dashboard build is a design addition, not an adaptation.

## 4. Constants: current ruled values vs proposed (DARRA TO RATIFY — these amend canon §7)

| Constant | Canon (ruled) | Proposed (council) | Evidence honesty |
|---|---|---|---|
| Promote | 2 consecutive ✓ | `solid`: ≥3 unassisted ✓ across ≥2 item forms; `mastered`: ≥2 sessions incl. one delayed retrieval + one explanation/transfer item | theory-or-expert; numbers are policy, direction is evidence |
| Demote | 1 ✗ drops a level | 1 `bombed` resets success evidence + schedules review; demote only on 2 independent failures (pref. cross-session) | theory-or-expert, unanimous direction |
| Intervals | shaky→next, solid→14d, mastered→42d | keep values; **re-anchor on last unassisted success**; treat as tunable | interval values unverifiable either way; anchor fix is unambiguous |
| Warmup | 3 questions | 2–3 due retrievals, scaled to deck length | one-line |
| `struggled` | (unspecified) | never promotes; logged as assistance signal | unanimous |
| Vault retirement | (none) | 2–3 unassisted varied-form disconfirmations across ≥2 sessions, one delayed; supersede, reactivate on new evidence | operational policy, honestly unvalidated |

**Decision needed** — ratify column 3 (or amend); everything else in this file follows canon's existing rulings.

## 5. Prompt-rule pack (drop-in sentences for the dashboard's generator templates)

1. *"For each known-misconception probe, provide the tutor with the correct-model contrast, an immediate guided retry, and a later near-transfer check; never repeat an uncorrected trap."*
2. *"After complex items, add a self-explanation prompt (e.g. 'What was your first step and why?' / 'What concept is this testing?')."*
3. *"Feedback must identify the task/process issue, elicit or explain a correction, and require a retry; no ability labels, no person praise."*
4. *"Never adapt content to claimed learning styles; use multiple representations because the mathematics requires them."*
5. *"Sequence new procedures worked-example → completion → faded → independent; skip scaffolds for already-fluent students (expertise reversal)."*
6. Deck shapes: Sol's R10 (Year 8) and R11 (Year 12 pre-HSC) 12–13-card decks adopted as the brief generator's default templates.

## 6. Where evidence cannot rule (stays under tutor judgment; software shows evidence, never decides)

Exact interval values and retrieval ratios · numeric vault-retirement thresholds · success-rate bands and productive-struggle switch-points · marginal value of dashboard nudges for an *expert* tutor (the high-dosage-tutoring literature identifies tutoring+dosage, not software features — Sol's sharpest framing) · effect of tutor-only mastery colours (direct evidence absent; expose uncertainty, never celebrate streaks).

## 7. Pending: subscription deep-research round

Reserved for ChatGPT/Gemini/Claude Research outputs. Six questions Sol's critique added — worth appending to those runs if not yet launched: knowledge-component granularity (what is a "topic" before thresholds mean anything); marginal dashboard benefit for expert tutors; outcome-tap measurement drift; attention/anchoring costs of live prompts; between-session ecology (school/homework dominate spacing); within-student crossover evaluation design for the dogfood itself.
