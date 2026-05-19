# MAIT — 3-Week Emergency Sprint Plan (Tutor-Only Prep Mode)

**Author:** OPUS planning pass
**Window:** Wed of week 1 → end of week 3 (≈21 calendar days, 30–45 build hours total)
**Operator:** Darayat "Darra" Chowdhury — solo builder + classroom teacher
**Co-builder:** Aether (autonomous M1 MacBook agent, Gemini Flash 3, overnight only)
**Status:** Architecture locked from prior planning sessions. This document scopes and sequences the sprint only.

---

## 1. Strategic Context

Darra is stepping into a 3-week instructional volunteer / SLSO stint covering an absent teacher across Y7–Y12, layered on top of his existing 2-day/week teacher-aide role and AI-committee work at the same private school. He is already a known quantity: 4+ years tutoring, Class Teacher of the Year 2023, 200+ hours of converted voluntary SLSO time, students consistently rate his lessons as the highlight of their week.

The pivotal framing: **MAIT is not auditioning, and neither is Darra.** He has already passed. The tool exists to compress prep time and add depth to lessons he would already deliver competently. MAIT augments expertise — it does not compensate for inexperience. If MAIT disappeared tomorrow, his classes would still be very good. With MAIT, prep should be faster and lessons richer in scaffolding, examples, and activity variety.

**Hard constraints driving every decision:**

- **Time:** 10–15 build hours per week, not 30–40. Evenings after teaching will be short and tired. Anything that does not directly speed up tomorrow's prep is deferred.
- **Audience:** Tutor-only. Students do not touch MAIT in this window. The entire student-facing surface (auth, consent, billing, safety review, session management) is out of scope.
- **Compute partner:** Aether runs the long, mechanical work overnight. Darra never babysits a Python script during prep hours.
- **Reliability floor:** If MAIT breaks mid-prep at 9:00 PM, Darra must fall back to his existing Custom Gem workflow in < 30 seconds without losing material.
- **Locked architecture:** `tutor_students`, `vector_documents`, `vector_chunks`; nullable `tutor_id` on `documents`; `text-embedding-3-small`; hierarchical ~400-token chunks with JSONB metadata; hybrid retrieval (pgvector HNSW cosine + B-tree exact match on `content_code`); two-step `.docx → syllabus.json → pgvector` ingestion. Not re-litigated here.

**Goal:** by end of week 3, Darra opens MAIT (not the Custom Gem) as his default prep tool, and prep time per lesson is measurably lower than baseline.

---

## 2. Scope Cut (Explicit Deferrals)

Every item below has been actively considered and pushed beyond the 3-week window. Not forgotten — out of scope for *this* sprint.

| Deferred feature | Why it is out of scope for this window |
|---|---|
| **Tutor↔student tethering** | Students do not touch MAIT in these 3 weeks. The data model supports it (`tutor_students` exists), but no UI, no invitation flow, no assignment surface is built. |
| **Magic-link auth / student-facing chat** | Same reason. The auth model is tutor-only single-user. The whole student session pipeline (rate limits, transcript persistence, parental visibility) is deferred. |
| **Parental consent flows** | Without student users there is no consent surface to build. Wiring this now would burn a full week on legal copy review alone. |
| **Stripe integration / Cerberus payment safety testing** | No paying users in this window. Billing is a Q3 problem, not a 3-week-sprint problem. |
| **Complex SLM routing & semantic cache** | Routing logic and a cache layer save latency and cost, but neither is the bottleneck right now — *building the thing* is. Deferred to weeks 2/3 as time permits, not as a blocker for shipping. |
| **Voice-mode / live conversational tutoring** | A potential future surface for students. Not relevant to tutor prep. |
| **Cross-subject corpora beyond Mathematics** | Science, PDHPE, Engineering Studies, Physics PDFs are present in `Syllabi/` but ingesting them this sprint dilutes Aether's overnight budget. Math first. |
| **Worksheet Studio refactor / Canvas v2** | Already on a separate track (`MAIT_NATIVE_CANVAS_IMPLEMENTATION_PLAN_Final.md`). Not coupled to this sprint. |
| **Analytics / engagement dashboards** | Single user. Darra is his own dashboard. |

**Rule of thumb:** if a feature requires a second human to test it, it is out of scope.

---

## 3. The 3-Week Plan (High Level)

### Week 1 — Skeleton + Corpus Boot (Wed start)
- **Schema additions:** Apply the locked migration adding `tutor_students`, `vector_documents`, `vector_chunks`, and the nullable `tutor_id` column on `documents`. One migration, reviewed once, applied to dev then prod.
- **Aether kicks off ingestion:** Subject 1 (Maths Advanced Y11–12) begins overnight on Wed. Subject 2 (Maths Standard 2 Y11–12) follows Thu/Fri night. Darra wakes up to a Discord summary each morning.
- **Question Generator backend:** Single API endpoint. Hardcoded to Gemini Flash. RAG context retrieved via the hybrid pgvector + `content_code` query against whichever subjects Aether has finished. **No router, no cache, no escalation logic.** Goal is to *ship* an endpoint that, given `(year_level, topic, count)`, returns NESA-grounded questions by Saturday morning.

### Week 2 — Coverage + UI + Variety
- Aether finishes Maths Stage 5 (Y9–10) and Maths Stage 4 (Y7–8) corpora across the week's nights, completing the four priority subjects by ~Wednesday of week 2.
- **Question Generator UI:** A spartan single-page surface inside the existing MAIT app — year-level selector, topic picker (driven by NESA outcome codes from the ingested corpus), count, "Generate". No Worksheet Studio integration this week; output is copy-pasteable.
- **Activity-variety endpoint:** Same RAG pipeline, different prompt template. Generates 3–5 activity formats appropriate to the year group from a topic input.
- **(Stretch) SLM routing:** If — and only if — weeks 1 outcomes shipped on time, add WebLLM in-browser for the trivial "classify this query / extract topic from prompt" tasks. Server-side routing logic stays minimal: 3-way switch (cached / Flash / Pro), no smart scoring.

### Week 3 — Classroom-Informed Refinement + Cache
- Week 3 is largely driven by what Darra observes when he uses MAIT in actual classroom prep through weeks 1–2. The backlog for week 3 is *populated* in real time across weeks 1–2 via a `lessons-learned.md` he keeps open.
- **Voice calibration:** Tighten prompt templates against Darra's actual style based on lesson artefacts produced in weeks 1–2. Concretely: collect 10 outputs he reworded by hand, diff them, encode the deltas as system-prompt rules.
- **Semantic cache layer:** Cache embeddings of recent queries; if a new query has cosine similarity > 0.92 to a cached query, return the cached completion. This is the single biggest latency + cost win and goes last because by week 3 we know what queries actually recur.
- **Reliability hardening:** Healthcheck endpoint, fallback banner, "open in Custom Gem" escape hatch (see §10).

---

## 4. Year 7–12 Curriculum Mapping (Aether's Ingestion Queue)

Mapped to the actual NESA documents present in `/Syllabi/`. Order matches Darra's teaching load — Stage 6 first because senior classes are the highest-stakes prep and have the densest content.

| Priority | Subject / Stage | Year levels | Source documents in `Syllabi/` | Notes |
|---|---|---|---|---|
| **1** | **Mathematics Advanced Stage 6** | Y11–Y12 | `MADV - Y11-12 2024 Syllabus/`, `Maths Advanced Syllabus.pdf` | Single biggest prep load. Hierarchical chunking on Topic → Subtopic → Outcome. |
| **2** | **Mathematics Standard 2 Stage 6** | Y11–Y12 | `Year 11 Maths Standard/`, `STAGE2 - mathematics_k_10_2022 (S2)` | Standard 2 specifically; do not waste a night on Standard 1 unless taught. |
| **3** | **Mathematics Stage 5** | Y9–Y10 | `NESA - mathematics_k_10_2022 (S5)`, `Maths K-10 Syllabus.pdf`, `STAGE5, S6 MATHS/` | Strand-rich; ensure outcome codes (e.g., `MA5-...`) land in JSONB metadata. |
| **4** | **Mathematics Stage 4** | Y7–Y8 | `MATHS Year 7 and 8 syllabus/`, `Maths K-10 Syllabus.pdf` (S4 sections) | Last because cognitive load on these year groups is in *activity design*, not content depth. |
| *(deferred)* | Maths Extension 1 & 2 | Y11–Y12 | `Maths Ext. 1 syllabus.pdf`, `mathematics-extension-2-stage-6-syllabus-2017.docx` | Only if Darra is actually covering Ext classes during the stint. Aether ingests only on demand. |
| *(deferred)* | Science 7–10, Physics, PDHPE, Engineering Studies | Mixed | Various PDFs in `Syllabi/` | Out of scope; documents stay on disk for future sprints. |

**Aether constraint:** one subject corpus per night. Validation + retrieval probes run before the next subject is queued. Failure on a probe = ingestion paused until Darra reviews in the morning.

---

## 5. Simplified Architecture (Week 1 CTO Ruling)

The locked architecture supports a routed, cached, multi-model topology. Week 1 deliberately does not use most of it. The CTO ruling for week 1 is: **build one wire end-to-end before adding any branching logic.**

### Week 1 default operation

```
[Darra UI/CLI prompt]
        │
        ▼
[Question Generator endpoint] ──► [Hybrid retriever]
                                      ├─ pgvector HNSW cosine on vector_chunks.embedding
                                      └─ B-tree exact match on content_code (e.g. "MA-C1.1")
                                      ▼
                                  top-k chunks
                                      │
        ┌─────────────────────────────┘
        ▼
[Gemini Flash 3 (hardcoded)]
        │
        ▼
[Response to Darra]
```

- **Single model:** Gemini Flash 3. Period.
- **Single retrieval path:** the hybrid query is one call; pgvector and the B-tree filter are combined in SQL (`WHERE content_code = $1 OR embedding <=> $2 < threshold`, then re-ranked by cosine).
- **Escalation:** a manual UI toggle ("Use deep reasoning") routes the request through Gemini 3.1 Pro for cross-topic, multi-step problems. Also triggerable inline via the prompt prefix `!pro `. No automatic routing — Darra decides.

### Migration path (weeks 2–3)

- **Week 2 (stretch):** add an in-browser WebLLM (small SLM, e.g. Llama-3.2-1B-Instruct quantised) for trivial pre-processing: query classification ("is this a question-gen request or a refresher?"), topic extraction, lightweight reformulation. Runs client-side; failure = bypass and go straight to Flash.
- **Week 3:** semantic cache layer in front of the LLM call. Query → embed → cosine-compare to last N cached query embeddings → if > 0.92, return cached completion. Cache TTL 7 days. Invalidated when its source `vector_chunks` rows are touched.

### If the SLM router *is* attempted earlier

If Darra elects to bring it forward, the topology becomes:

```
prompt ─► WebLLM classifier ─► {trivial → cached / WebLLM, default → Flash + RAG, hard → Pro + RAG}
                                                 │
                                                 ▼
                                  semantic cache lookup (cosine > 0.92)
                                                 │
                                              hit → return
                                              miss → call LLM, write back to cache
```

Router and cache are **independent** — either can ship without the other. The plan pulls cache first (week 3) because cost/latency wins exceed routing wins at Darra's volume.

---

## 6. Activity Variety Generation

Different year groups need different lesson formats. Question generation alone is insufficient — Darra needs activity *types* the same way he currently brainstorms them by hand on the train.

### Prompt patterns per stage

- **Year 7–8 (Stage 4):** game-heavy and kinaesthetic.
  - Prompt template tags: `format=game|kinaesthetic|low-stakes`, examples include hangman variants, "math bingo", around-the-world flashcards, walking number-line tasks, dice probability stations.
  - System prompt instruction: *"Generate 3 activity formats for a 50-min Stage 4 lesson on {topic}. At least 2 must involve physical movement or play. Avoid worksheets unless explicitly requested."*
- **Year 9–10 (Stage 5):** balanced mix.
  - Tags: `format=game|partner|exit-ticket|investigation`. Activities like Desmos challenge cards, think-pair-share on a multi-step problem, exit-ticket misconception probes.
  - System prompt: *"Generate 3 activities mixing engagement and rigour for a 50-min Stage 5 lesson on {topic}. Include 1 partner/group task, 1 individual investigation, 1 quick formative check."*
- **Year 11–12 (Stage 6):** rigorous, written, scaffolded.
  - Tags: `format=scaffolded-problem|past-paper|written-explanation|peer-marking`. Past HSC questions tagged by outcome code (`MA-C1.1` etc.), 4-mark scaffolded extended responses, "explain your method" peer-marking.
  - System prompt: *"Generate 3 rigorous activities for a 50-min Stage 6 {Maths Advanced|Standard 2} lesson on {topic}. At least 1 must reference past HSC question style. Include marking criteria where applicable."*

### "Lesson plan completer" use case

Darra often arrives at prep with a Chalkie-generated PPT outline: topic, learning intentions, 2 slide titles — nothing on how to *do* the lesson. The completer:

1. Accepts the outline (pasted text; newline-split only in week 1).
2. Extracts year level + topic via a quick prompt (or explicit form fields if extraction is brittle).
3. Pulls matching RAG context for the outcome.
4. Returns 2–3 activity formats with prompts, materials, timings.

UI: second tab beside Question Generator. Same backend endpoint, `mode=activities`. Output copy-pasteable; no slide-injection automation this sprint.

---

## 7. Personal Voice Calibration

Darra's teaching voice is the product. Outputs that sound like ChatGPT-on-defaults are worse than no output, because Darra has to spend time rewriting them — and rewriting is what MAIT is supposed to save.

**Voice specification:**

- **Australian English.** "Maths" not "math". "Practise" (verb) / "practice" (noun). "Colour", "metre", "analyse". "Year 7", not "7th grade". "Term 2", not "Q2".
- **Casual but professional.** Contractions are fine ("you'll", "let's", "that's"). Greetings like "G'day team" or "right, crew" are in-voice for Y7–10. Stage 6 leans slightly more formal but still warm.
- **Warm and age-appropriate.** Explanations meet the student where they are. No condescension. No "great question!" filler.
- **Concrete examples drawn from local context.** Cricket (run rates, strike rates, Duckworth-Lewis as a probability hook), AFL (kicking arcs as parabolas), Husqvarna chainsaws / mowers (rates and ratios), Bondi (tides as periodic functions), HSC marking schemes, Westfield gift cards as percentage problems.

**Voice template encoding (system prompt fragment, drop-in for all generation endpoints):**

```
You are writing for an Australian Year {N} classroom in NSW under the NESA syllabus.
Voice rules:
- Australian spelling and idiom; never American.
- Casual but professional; warm not cloying.
- Use concrete Australian examples (cricket, AFL, Bondi, NSW context) over generic ones.
- No corporate edtech tone, no "leverage", "stakeholders", "synergy", "unpack", "deep dive".
- No "great question!", no excessive emoji, no exclamation overuse.
- Match register to year level: Y7–8 playful, Y9–10 conversational, Y11–12 precise.
- Cite NESA outcome codes inline where relevant (e.g. "(MA-C1.1)").
```

**Calibration loop (week 3):** Darra picks 10 outputs he reworded by hand in weeks 1–2, diffs original vs reworded, and the deltas become explicit "do not" rules appended to the system prompt. Not a fine-tune — just prompt engineering against real evidence.

---

## 8. Aether Parallelisation

Aether's job is everything Darra would otherwise do by typing into a terminal at 11pm.

### Overnight pipeline (per subject)

```
1. Pick next subject from /Syllabi/ ingestion queue (priority order from §4).
2. .docx → syllabus.json:
     parse hierarchical structure (Stage → Topic → Subtopic → Outcome → Content)
     attach JSONB metadata: { stage, year, outcome_code, parent_path }
     emit syllabus.json as durable source of truth (committed to repo).
3. syllabus.json → pgvector:
     chunk at ~400 tokens respecting hierarchy boundaries (do not split mid-outcome)
     embed via text-embedding-3-small
     upsert into vector_chunks with tutor_id = NULL (shared corpus)
4. Validate parse quality:
     count chunks per outcome; flag outcomes with 0 chunks
     spot-check 5 random chunks: do they contain coherent NESA-style language?
     verify outcome_code coverage matches the syllabus's published outcome list
5. Run retrieval probes (10 per subject):
     fixed query bank like "Generate 3 questions on differentiation for Y12 Advanced"
     measure: does top-1 chunk contain the right outcome_code? recall@5?
     log probe results to a markdown report.
6. Discord-ping Darra at his usual morning checkpoint (~7:00am):
     attach: subject name, chunk count, probe pass rate, 3 sample chunks, link to the JSON
     await thumbs-up reaction before queuing next subject overnight.
```

### What Aether will NOT do

- Will not push code or schema migrations (Darra reviews and runs migrations himself).
- Will not write product code or modify the running app.
- Will not touch any path under `mait-mvp/` other than read-only ingestion scripts.
- Will not retry on validation failure — it pauses and waits for Darra. Silent corruption is worse than a stall.

---

## 9. Implementation Sequence (Day-by-Day)

Pinned to 10–15 build hours per week. "Darra hours" are wall-clock blocks where he is actually at a keyboard, awake, not teaching. "Aether overnight" runs while he sleeps.

### Week 1 (Wed → Tue)

| Day | Darra (build hours) | Aether overnight |
|---|---|---|
| **Wed** | Apply schema migration (`tutor_students`, `vector_documents`, `vector_chunks`, nullable `documents.tutor_id`) to dev DB, smoke-test on prod. *(2 h)* Kick Aether off on Maths Advanced. *(0.5 h)* | Ingest Maths Advanced Y11–12 → Discord report by 7am Thu. |
| **Thu** | Review Aether's Maths Advanced report; approve or fix. Stub Question Generator endpoint scaffold (route, request schema, mock response). *(2 h)* Queue Aether for Maths Standard 2. | Ingest Maths Standard 2 Y11–12 → Discord report by 7am Fri. |
| **Fri** | Wire the hybrid retriever query (pgvector + B-tree by `content_code`). Hand-test against 5 queries from each subject ingested so far. *(3 h)* | Idle (Friday night is a recovery night — no overnight job). |
| **Sat** | Wire Gemini Flash call into the endpoint. End-to-end test: prompt in, NESA-grounded questions out. Ship a CLI / minimal HTTP surface — no UI yet. *(4 h)* Queue Aether for Stage 5. | Ingest Maths Stage 5 → Discord report by 7am Sun. |
| **Sun** | **Rest / off.** Optional 1 h review of Aether's Stage 5 report; queue Stage 4. | Ingest Maths Stage 4 → Discord report by 7am Mon. |
| **Mon** | Use the Question Generator endpoint to prep Tuesday's lessons. Note every rough edge in `lessons-learned.md`. *(2 h, dual-purpose — counts as prep, not build)* | Idle / regression probes only. |
| **Tue** | Address top 2 rough edges from Monday's use. *(1.5 h)* | Idle. |

**Week 1 build hours: ~13 h.** Within budget. Saturday is the heavy day on purpose — biggest single contiguous block.

### Week 2 (Wed → Tue)

| Day | Darra | Aether overnight |
|---|---|---|
| **Wed** | Spartan Question Generator UI: year-level select, topic select (populated from ingested outcome codes), count, "Generate", output box. No styling beyond defaults. *(3 h)* | Re-probe all four corpora with the full probe bank (regression). |
| **Thu** | Wire activity-variety prompt templates (§6) into the same endpoint with a `mode` switch. *(2 h)* | Idle. |
| **Fri** | Add lesson-plan completer tab to UI. Hand-test end-to-end against a real Chalkie PPT outline. *(2 h)* | Idle. |
| **Sat** | **Stretch:** WebLLM client-side classifier for `mode` auto-detection. Skip entirely if behind. *(0–4 h)* | Idle. |
| **Sun** | **Rest / off.** | Idle. |
| **Mon** | Classroom use. Update `lessons-learned.md`. *(prep, not build)* | Idle. |
| **Tue** | Address top 2 rough edges. *(1.5 h)* | Idle. |

**Week 2 build hours: ~9–13 h.**

### Week 3 (Wed → Tue)

| Day | Darra | Aether overnight |
|---|---|---|
| **Wed** | Triage `lessons-learned.md`: pick the 3 highest-impact fixes for the week. *(1 h)* Start fix #1. *(2 h)* | Re-run retrieval probes; flag any regressions. |
| **Thu** | Voice calibration: diff 10 reworded outputs, encode deltas as system-prompt rules, A/B test on 5 prompts. *(3 h)* | Idle. |
| **Fri** | Semantic cache: in-memory or Redis depending on what is already wired. Cosine > 0.92 threshold, 7-day TTL. *(3 h)* | Idle. |
| **Sat** | Reliability: healthcheck endpoint, fallback banner ("MAIT is degraded — fall back to Custom Gem here →"), one-click escape hatch. *(2 h)* | Idle. |
| **Sun** | **Rest / off.** | Idle. |
| **Mon** | Final classroom-use pass. Write 1-page retro: what shipped, what to do post-sprint. *(1 h)* | Idle. |
| **Tue** | Buffer / fix anything that broke. *(2 h)* | Idle. |

**Week 3 build hours: ~12 h.**

**Total sprint build hours: ~34–38.** Within the 30–45 envelope. Sunday off every week is non-negotiable.

---

## 10. Risks and Mitigations

### Burnout

The largest risk. Failure modes: skipping sleep, skipping food, skipping rest days.

- **Sunday is off.** Hard rule. No build, no Aether queueing, no prep beyond what Monday morning strictly requires.
- **Hard stop 10:30pm** on build nights. `lessons-learned.md` exists partly so an unfinished thought can be parked instead of forced.
- **Aether as relief valve.** Too tired to think? Write a one-line task into Aether's queue and go to bed. It runs overnight or pings for clarification in the morning.
- **End-of-week-2 check-in.** If energy is gone, drop week 3 stretch items in this order: WebLLM router → semantic cache → voice calibration. Reliability hardening is never dropped.

### MAIT breaks mid-prep (fallback)

Highest-impact reliability risk: 9pm the night before a Year 11 lesson, API throws 500s.

- **Custom Gem fallback stays live for the entire sprint.** Banner in the MAIT UI on healthcheck fail: *"MAIT degraded — open Custom Gem"* with one-click link.
- **Local output log.** Every generation also persists to `~/mait-output-log.md`. If the app dies, the last 24 h of generations are still on disk.
- **No "delete the Custom Gem" celebration.** The Gem only gets archived after week 3 if MAIT has shipped reliably and Darra has used it for two consecutive prep weeks without falling back.

### Weird RAG retrievals

Will happen. Symptoms: wrong outcome codes cited, Stage 4 content surfaced for a Stage 6 prompt, generic non-NESA phrasing.

- **Automated detection:** Aether's nightly probes use a fixed query bank. Any drop in top-1 outcome-code accuracy below 80% triggers a Discord alert.
- **Manual detection:** Every UI output shows the outcome codes of the top 3 retrieved chunks. Codes mismatching the prompt = something is wrong.
- **Fix paths:** chunk-level (re-chunk and re-embed a specific outcome); query-level (boost exact `content_code` matches in the SQL re-rank); model-level (escalate that prompt class to Pro via the manual toggle).

### Aether silently corrupts the corpus

Low probability, high impact. A bad ingestion run could re-embed with truncated text and break retrieval everywhere.

- `syllabus.json` is committed per subject; re-ingestion from JSON is cheap.
- Probes run *after* ingestion, *before* queuing the next subject. Probe failure halts the queue.
- `vector_chunks` rows carry `ingested_at` and `ingestion_run_id`. A bad run is deletable by ID.

### Time slip on week 1 endpoint

If Saturday EOD has no working RAG endpoint, week 2 cannot start on schedule.

- **Mitigation:** Friday's hand-test (5 queries × 2 ingested subjects) is the canary. If it fails, Saturday's scope drops to the minimum — hardcoded prompt, hardcoded year level, return raw retrieved chunks if the LLM call is the broken layer. Ship a wire; iterate next week.

---

## 11. Validation Criteria

The sprint is successful if, by the end of week 3, all of the following are true:

1. **Custom Gem usage drops to zero for prep.** Darra defaults to MAIT for question generation, activity ideas, and refreshers. Custom Gem remains live as a fallback only.
2. **Measured prep-time reduction.** Self-reported time per lesson plan drops by ≥ 30% versus baseline (Darra estimates baseline in week 0; logs actual in weeks 2–3).
3. **All four priority NESA Maths corpora ingested and probed.** Maths Advanced, Standard 2, Stage 5, Stage 4 all have ≥ 80% top-1 outcome-code retrieval accuracy on the probe bank.
4. **Zero mid-prep outages without a working fallback.** If MAIT breaks, the fallback banner appears and the Custom Gem link works. Counted across the full sprint.
5. **Voice calibration measurable.** Of the last 10 outputs generated in week 3, ≥ 7 are usable without Darra rewriting the prose (he marks each output usable / needs-rewrite as he goes).

If 4/5 land, the sprint is a clear win. If only 1–2 land, the post-sprint retro focuses on whether the architecture or the time budget is the binding constraint.

---

## 12. Open Questions

Decisions I cannot make confidently from the brief alone. To resolve before Wed start where possible:

1. **Outcome-code taxonomy stability.** The hybrid retriever uses `content_code` for B-tree exact-match. Are NESA outcome codes consistent across Stage 4 / 5 / 6, or do they use different prefix conventions (`MA4-…` vs `MA-C…`)? If the latter, JSONB metadata needs an explicit `outcome_code_scheme` field so the retriever routes correctly. **Recommend:** Aether confirms the scheme during Maths Advanced ingestion Wed night, reports before subject 2 queues.
2. **Gemini 3.1 Pro availability and cost.** Week-1 escalation assumes Pro is accessible and affordable for occasional manual use. If prohibitive, fall back to Flash with `temperature=0.1` + longer system prompt for "deep reasoning" mode.
3. **WebLLM feasibility on Darra's prep device.** Week-2 stretch assumes browser RAM for a 1–2 B param quantised model. If primary prep is on a low-RAM school-issued device, skip WebLLM entirely and rely on cache + manual routing.
4. **Lessons-learned capture surface.** Plain `lessons-learned.md` opened in VS Code, or an in-app "report this output" button? Recommend file for week 1 (zero build cost); button in week 2 only if file friction is real.
5. **PPT outline ingestion fidelity.** Lesson-plan completer assumes pasted text. If Chalkie outputs include slide images, formulas, or non-text artefacts that matter, paste-only is insufficient. Validate against 3 real Chalkie outputs by end of week 1; add `python-pptx` to Aether's queue in week 2 if needed.
6. **Discord channel for Aether reports.** New channel, DM, or existing channel? Recommend `#aether-reports` with morning auto-summary — trivial to set up, unblocks the morning approval loop.
7. **Migration deployment path.** The migration is additive (new tables + nullable column), so applying it Wed before any corpus is ingested is safe. But: does CI/CD auto-run migrations on deploy, or does Darra apply it manually? Confirm before Wed.

---

*End of plan.*
