# Comparison: 3-Week Emergency Sprint vs Prior Tutor-Only V1 Plans

**This file:** synthesis of where my (OPUS) 3-week emergency sprint plan agrees with, departs from, or newly surfaces decisions absent from the three prior parallel-synthesis plans.

**Prior plans compared against** (found on `origin/claude/create-tutor-implementation-plan-FUcxM`):

- `implementation_plan_tutor_only_v1_OPUS.md` — yesterday's OPUS pass.
- `implementation_plan_tutor_only_v1_GEMINI.md` — yesterday's Gemini pass.
- `implementation_plan_tutor_only_v1_GPT.md` — yesterday's GPT pass.

**Important caveat on framing.** The three prior plans target a **7–14 day dogfooding sprint** in which Darra is *not* under classroom-teaching pressure and the user being modelled is the **1-1 paying tutoring student**. My plan targets a **3-week emergency teaching stint** in which Darra is *covering an absent teacher across Y7–12* and the user being modelled is **Darra's own classroom prep workflow**. Many of the differences below flow from that framing change rather than from architectural disagreement.

---

## 1. Agreements (all four plans align)

### Schema
- All four use `tutor_students`, `vector_documents`, `vector_chunks` as the new tables.
- All four add a nullable `tutor_student_id` (or equivalent `tutor_id`) column on the existing `documents` table to bridge into Native Canvas without breaking the legacy auth path. The locked architecture matches.
- All four enable `pgvector` via an Alembic migration and use an HNSW (or HNSW-with-IVFFlat-fallback) index for cosine similarity.

### Out-of-scope deferrals
All four agree to defer:
- Student authentication (magic links, JWT, refresh-token rotation).
- Student-facing chat or self-serve pedagogical agents.
- Parent emails, onboarding, consent / COPPA flows.
- Privacy scrubbers / PII redaction (tutor is the sole data-entry actor).
- Stripe / billing.
- Re-ranking, prerequisite-graph retrieval, query rewriting.

### Pipeline shape
- All four agree on hierarchical chunking that preserves Subject → Module → Topic → Outcome → Content-code structure in the chunk's metadata.
- All four agree on injecting retrieved chunks directly into the LLM system prompt as a fenced block of NESA dot-points.

### "Custom Gem deprecation" as a validation goal
All four plans treat retirement of the OpenAI Custom Gem workflow as a key success criterion.

---

## 2. Disagreements (where I depart from one or more prior plans)

### 2.1 Embedding model

| Plan | Choice | Dim |
|---|---|---|
| Locked architecture | OpenAI `text-embedding-3-small` | 1536 |
| **Mine (3-week sprint)** | OpenAI `text-embedding-3-small` | 1536 |
| Prior OPUS | OpenAI `text-embedding-3-small` | 1536 |
| Prior GEMINI | OpenAI `text-embedding-3-small` | 1536 |
| Prior GPT | **Gemini `gemini-embedding-001`** | **768** |

Three of four plans (including the locked architecture) agree on OpenAI. The prior GPT plan argues for Gemini embeddings on stack-consistency and sovereignty grounds. The locked architecture overrules — my plan follows the locked decision without re-litigating it.

### 2.2 Retrieval strategy

| Plan | Strategy |
|---|---|
| Locked architecture | Hybrid: pgvector HNSW cosine + B-tree exact-match on `content_code` |
| **Mine** | Hybrid (as locked) |
| Prior OPUS | Hybrid (matches locked) |
| Prior GEMINI | **Pure vector for V1**, hybrid deferred |
| Prior GPT | Hybrid with keyword/code filters |

The prior GEMINI plan defers hybrid in the interest of sprint speed. The locked architecture and three of four plans agree hybrid ships in V1 because NESA's grammar is built on outcome codes (e.g., `MA-C1.1`) where exact-match dominates vector similarity.

### 2.3 Chunk size

| Plan | Target tokens | Overlap |
|---|---|---|
| Locked | ~400 | (not specified) |
| **Mine** | ~400 | (defers to locked) |
| Prior OPUS | 400 | 60 (~15%) |
| Prior GEMINI | 256–512 | 50 |
| Prior GPT | 500–700 | 80–120 (only when content splits) |

The prior GPT plan argues for larger chunks to preserve NESA's longer outcome-with-content blocks; the locked architecture lands on ~400. Minor variance; not a hard disagreement.

### 2.4 Sprint length and operating reality

| Plan | Length | Operator state during sprint |
|---|---|---|
| **Mine** | 3 weeks (~30–45 build h total) | **Teaching full days; 10–15 build h/week** |
| Prior OPUS | 7–14 days | Not specified; implicit "normal availability" |
| Prior GEMINI | ~11 days | Not specified |
| Prior GPT | ~14 days | Not specified |

The prior plans implicitly assume a builder with full days available. My plan explicitly budgets Darra's evening hours against teaching exhaustion and treats Sunday as non-negotiable rest. This is the single biggest delta in operating model.

### 2.5 Target use case

| Plan | Primary user being optimised for |
|---|---|
| **Mine** | Darra's own classroom prep across Y7–12 (multiple year groups, no per-student profiling) |
| Prior OPUS | Darra's 1-1 paying tutoring students (per-student `struggle_areas`, `bloom_state`) |
| Prior GEMINI | Same as prior OPUS |
| Prior GPT | Same as prior OPUS |

The prior plans build heavy student-profile infrastructure (`current_topics`, `struggle_areas`, `bloom_state` JSONB) because the workflow is per-student question generation. My plan strips that surface entirely — within these 3 weeks Darra is preparing classroom lessons for groups of 20+ students he doesn't profile individually. `tutor_students` still exists in the locked schema, but I do not build CRUD UI for it in this sprint.

This is the biggest behavioural divergence: **my plan does not build a tutor-student dashboard.** The prior three plans all have routes for `/tutor/students`, `/tutor/students/[id]`, etc.

### 2.6 LLM for generation

| Plan | Default model | Escalation |
|---|---|---|
| **Mine** | Gemini Flash 3 (hardcoded) | Manual toggle / `!pro` prefix → Gemini 3.1 Pro |
| Prior OPUS | `gemini-3.1-flash-lite-preview` | Open question (Pro override via env) |
| Prior GEMINI | Gemini Flash (continue current model) | Suggests GPT-4o as alternative for LaTeX |
| Prior GPT | Same default; open question on Pro for senior maths | Defers |

I commit to Flash 3 + manual Pro escalation as the week-1 default. The prior plans flag this as an open question. The locked architecture doesn't pin a specific Gemini variant; my decision is consistent with all three prior plans' default direction.

### 2.7 Validation criteria

| Criterion | Mine | Prior OPUS | Prior GEMINI | Prior GPT |
|---|---|---|---|---|
| Custom Gem deprecated | ✅ | ✅ | ✅ | ✅ |
| ≥3 live tutoring sessions used the tool | — (no 1-1 sessions in window) | ✅ | ✅ | ≥ 5 |
| ≥5 students migrated to `tutor_students` | — | ✅ | ✅ | ✅ |
| Per-student `struggle_areas` reflected in output | — | ✅ | ✅ | ✅ |
| Subjective NESA groundedness check | (covered by probes) | ✅ | ✅ | ✅ |
| All four priority NESA Maths corpora ingested with ≥80% probe accuracy | ✅ | partial | partial | partial |
| Prep-time reduction ≥30% vs baseline | ✅ | — | — | — |
| Voice-calibrated outputs (≥7/10 usable without rewrite) | ✅ | — | — | — |
| Zero outages without working fallback | ✅ | — | — | — |

The prior plans validate against a 1-1 tutoring use case (real students migrated, real sessions). My plan validates against a classroom-prep use case (corpus coverage, prep-time reduction, voice quality, reliability). Both are defensible — they just measure different things.

### 2.8 Custom Gem fallback timing

| Plan | When is Custom Gem retired? |
|---|---|
| **Mine** | Stays live for the *entire* sprint as fallback; archived only after week 3 if MAIT has shipped reliably and Darra ran two consecutive prep weeks on it |
| Prior OPUS | Implicitly retired at validation gate (criterion 5: "publicly declares the Custom Gem workflow deprecated") |
| Prior GEMINI | Same as prior OPUS |
| Prior GPT | Same as prior OPUS |

I am more cautious. The prior plans treat retirement as a binary at-the-end event. My plan keeps the Gem warm throughout because classroom prep deadlines are unforgiving and the cost of being unable to ship a worksheet at 9pm is much higher than the cost of carrying a dual stack for three weeks.

---

## 3. New Decisions Surfaced by My Plan (Absent from Prior Three)

These are introduced by the framing change (emergency teaching stint, time-constrained operator) rather than by re-architecting the locked decisions.

### 3.1 Aether as an overnight compute partner

The prior plans assume Darra runs the ingestion script himself (Phase 3 in all three is "build and run `scripts/ingest_nesa_syllabus.py`"). My plan offloads that to Aether (autonomous M1 MacBook agent + Gemini Flash 3) overnight, one subject per night, with morning Discord approval before queueing the next subject. **Darra never writes the ingestion script during his build hours.**

This is enabled by the time-budget reality (10–15 h/week) and is the single largest schedule unlock in my plan.

### 3.2 Year-level activity variety patterns

None of the prior plans differentiate activity formats by stage. My plan specifies:
- **Y7–8 (Stage 4):** game-heavy, kinaesthetic (hangman, math bingo, dice probability stations).
- **Y9–10 (Stage 5):** balanced (Desmos challenges, partner work, exit tickets).
- **Y11–12 (Stage 6):** rigorous written, scaffolded, past-paper integrated.

This is a *new endpoint* (`mode=activities`) on the same backend as the Question Generator and a new UI tab. It addresses a specific gap in the prior plans: they generate *questions* but don't generate *lesson activities*.

### 3.3 Lesson-plan completer use case

The "Chalkie PPT outline → suggested activities" flow is new. None of the prior plans handle the case where Darra arrives at prep with a partial slide deck and needs MAIT to fill in the "how do I actually run this lesson" gap.

### 3.4 Voice calibration as an explicit week-3 task

Prior plans say nothing about voice. My plan specifies:
- Australian English rules (spelling, idiom, register per stage).
- "Avoid" list (American spelling, corporate edtech tone, "great question!").
- Concrete Australian context examples (cricket, AFL, Husqvarna, Bondi, Westfield).
- A calibration loop: diff 10 outputs Darra reworded by hand → encode the deltas as system-prompt rules.

This is product polish the prior plans skipped, justified for week 3 because by then there are real artefacts to calibrate against.

### 3.5 Semantic cache layer (week 3)

None of the prior plans propose a cache. My plan adds a cosine-similarity (> 0.92) cache with 7-day TTL as the single biggest latency + cost win, scheduled for week 3 once query patterns are observable.

### 3.6 WebLLM client-side router (week 2 stretch)

None of the prior plans propose an in-browser SLM for trivial pre-processing (query classification, topic extraction). My plan adds it as a stretch — explicitly droppable if energy budget is gone.

### 3.7 Reliability and fallback as a first-class risk

Prior plans treat reliability implicitly. My plan specifies:
- Healthcheck endpoint + UI banner on degradation.
- One-click Custom Gem fallback link.
- Local output log (`~/mait-output-log.md`) preserved across crashes.
- "No Custom Gem deletion celebration" rule until two stable prep weeks complete.

### 3.8 Burnout mitigation

Prior plans don't model operator burnout. My plan specifies:
- Sunday is off (hard rule).
- 10:30pm hard stop on build nights.
- `lessons-learned.md` exists so unfinished thoughts can be parked.
- Mid-sprint check-in (end of week 2) with explicit drop-order for week-3 stretch items.

### 3.9 Year 7–12 corpus prioritisation

Prior plans say "ingest the Maths Advanced PDF" (singular) and defer the rest. My plan specifies a 4-subject priority queue aligned to the actual teaching load:
1. Maths Advanced Stage 6
2. Maths Standard 2 Stage 6
3. Maths Stage 5 (Y9–10)
4. Maths Stage 4 (Y7–8)

with Extension 1/2 and non-Maths subjects explicitly deferred.

### 3.10 The "lessons-learned.md" feedback loop

Prior plans have no feedback-capture mechanism for the operator. My plan introduces a plain markdown file Darra keeps open during classroom prep, populated in real time, triaged at the start of week 3.

---

## 4. Open Questions Raised by My Plan That Prior Plans Did Not Address

1. **Outcome-code taxonomy stability across stages.** Are NESA codes consistent across Stage 4, 5, and 6 (`MA-C1.1` vs `MA4-…`)? Prior plans assume one code scheme; this needs explicit verification in Aether's first ingestion pass.
2. **Discord channel structure for Aether morning approval.** Prior plans don't propose Aether, so this is new.
3. **WebLLM RAM headroom on Darra's actual prep device.** Prior plans don't propose in-browser SLMs.
4. **PPT outline parsing fidelity.** Prior plans don't propose lesson-plan completion, so the Chalkie-output ingestion question is new.

---

## 5. Open Questions Raised by Prior Plans That My Plan Did Not Address

Listed here so they're not lost — Phase-2 / post-sprint items.

1. **`tutor_students` ↔ `student_contexts` overlap** (prior OPUS Q1). The existing `student_contexts` table has `context_json` with bloom state. Should the two converge? My plan doesn't touch this because I don't use `tutor_students` for per-student profiling in this window — but Phase 2 must resolve it.
2. **Canvas `student_id` semantics** (prior OPUS Q3, prior GPT Q1). When a generated worksheet links to a `tutor_students` row, what does `documents.student_id` (legacy TEXT field) get set to? My plan doesn't generate worksheets for individual `tutor_students` in this window so it sidesteps the question — Phase 2 will need a clean rule (likely "tutor's own ID" per prior OPUS).
3. **FAISS deprecation timing** (prior OPUS Q4, prior GEMINI Q3). My plan doesn't address this. Pragmatically: keep FAISS running in parallel for the duration of the sprint, delete only after MAIT has shipped reliably and chat-path migration to pgvector is complete (Phase 2).
4. **Model consistency for LaTeX-heavy worksheets** (prior GEMINI Q2). Should the worksheet generator switch to GPT-4o for LaTeX quality? I don't tackle worksheet generation in this 3-week window so the question is deferred.

---

## 6. Summary Table: Where Each Plan Lands on the Locked Architecture

| Locked decision | Mine | Prior OPUS | Prior GEMINI | Prior GPT |
|---|---|---|---|---|
| `tutor_students` table | ✅ | ✅ | ✅ | ✅ |
| `vector_documents` + `vector_chunks` | ✅ | ✅ | ✅ | ✅ |
| Nullable `tutor_id` on `documents` | ✅ | ✅ (named `tutor_student_id`) | ✅ | ✅ |
| OpenAI `text-embedding-3-small` (1536) | ✅ | ✅ | ✅ | ❌ (Gemini 768) |
| Hierarchical ~400-token chunks + JSONB metadata | ✅ | ✅ | partial | partial (larger) |
| Hybrid retrieval (HNSW + B-tree on `content_code`) | ✅ | ✅ | ❌ (pure vector V1) | ✅ |
| Two-step `.docx → syllabus.json → pgvector` | ✅ (Aether runs it) | implicit | implicit | implicit |
| Tutor-only auth, no students this window | ✅ | ✅ | ✅ | ✅ |

**Bottom line:** my plan is fully compatible with the locked architecture and does not re-derive any of it. The prior OPUS plan also matches; the prior GEMINI plan diverges on retrieval strategy; the prior GPT plan diverges on embedding model. The locked architecture incorporates the consensus of those three plus subsequent decision-making, and my sprint plan operates within it.

The substantive deltas are all about **time budget, operator reality, and use case** — not architecture. That's what justifies a separate document rather than a revision of the existing plans.

---

*End of comparison.*
