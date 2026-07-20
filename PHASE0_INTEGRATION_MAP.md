# PHASE 0 — Integration Map (MAIT Dogfood v1)

**Mode:** read-only audit. **Date:** 2026-07-20. **Repo:** `mentalmathsmentor/myaitutor` @ `claude/mait-dogfood-v1-audit-64j8dk`. All paths/names verified against the working tree; canon claims verified against `MAIT_ARCHITECTURE_CANON.md`.

**App:** `mait-mvp/` — FastAPI backend (`backend/app/`) + Vite/React frontend (`frontend/src/`). Stack migrated **SQLite → Neon Postgres + pgvector** (merge `feature/pgvector-rag`, HEAD `2c4f16b`); SQLite modules survive as `*_legacy_sqlite.py` (*"Do not import"*).

> **Authority note.** The dogfood terms **`/teach`, "Cerberus", "cockpit", "unified tutor surface", "memory engine"** appear **only** in the handoff brief and live code — they are **absent from every mandated vision/canon doc** (subagent-verified). The operative contract is therefore `MAIT_ARCHITECTURE_CANON.md`, which **already ratifies** the Tutor V1 schema and rules the brief leans on. Where the brief and canon collide, brief wins on *scope* (§4), but canon wins on *names/schemas/invariants* — logged, never resolved silently.

---

## 1. Reuse map (existing module → dogfood role)

| Existing module (verified) | What it is | Dogfood role |
|---|---|---|
| `features/exoskeleton/Workspace.jsx` (route `/teach`) + `StartupWizard`, `CadenceRenderer`, Zustand `useExoskeletonStore` | Tutor V1 "prep cockpit": cohort picker, topic+refinements, 6 intent tools + chat, staged `parts` render. | **ADAPT (heavy).** Reuse shell/store/API wiring, but canon §7 ratifies a *different* cockpit UX (full-screen question **cards**, one-tap outcome buttons ✓/~/✗/skip → `question_log`, **command bar**, traffic-light mastery map) — **not** the current chat-cadence thread. So this is partial rebuild toward canon §7, not light reuse. |
| `routers/chat.py :: POST /api/chat/generate` | Generator core: Gemini-768 embed → pgvector `vector_chunks` top-3 (subject + `metadata_json->>'topic'`, **no year_level filter**) → `INTENT_TEMPLATES[intent]` + `SYSTEM_INSTRUCTION_CORE` → `gemini-3.5-flash` structured `ExoskeletonResponse` → logs Messages+citations. | **REUSE/ADAPT.** Canon §7/§6 mandate adding a **`student_context`** placeholder to `INTENT_TEMPLATES` — the exact injection point for per-student memory (Phase 1). Question-set items feed Cerberus (Phase 2). |
| `models.py` `ExoskeletonResponse`/`Part` / `QuestionSetItem {id, question_latex, teacher_answer_latex, marks}`; part `type∈{text,glass_box,question_set,activity}`, `tier∈{all,support,core,extension}`, questions under field **`questions`** | Structured generator output contract. | **REUSE.** `QuestionSetItem` is the exact unit Cerberus verifies; maps cleanly to Cerberus input `{question_text, worked_solution, outcome_or_bloom_tag, student_level_tag}`. *(NB latent bug: `Workspace.jsx` offline mock emits `items`/`title` — not in schema; not a Phase 0 action.)* |
| `components/canvas/*` (`InlineCanvas.tsx`, `ElementList/Editor`, `PdfPreviewPane`, `RevisionPanel/Timeline`, `CompileErrorBanner`) via `sections/WorksheetStudio.jsx` | Canvas LaTeX IDE: element edit + live PDF preview + AI fragment revision. | **REUSE** — the edit→compile→export leg of the Done line. |
| `routers/canvas.py` (`/generate`, **`/compile`**, element CRUD, `/elements/{id}/revise`, `/revisions/{id}/apply\|reject`, `/vision-parse`) + `services/latex_decomposer.py` | Canvas backend. `/compile` → pdflatex → base64 `data:` PDF. | **REUSE** — `/compile` = "compile LaTeX → export PDF". |
| `services/artifact_engine.py :: compile_latex_to_pdf` (pdflatex subprocess), `generate_worksheet_pdf/latex` | LaTeX→PDF + standalone NESA worksheet gen. | **REUSE** compile; worksheet path secondary to cockpit generator. |
| `db/tutor_models.py` — `Tutor`, `TutorClass(name, year_level, subject, ability_tier, profile_metadata JSONB)`, `ChatThread`, `Message(role, content, retrieval_citations JSONB)` | **Teacher-sprint** persistence (migration head `928e2e58469d tutor_v1`). | **ADAPT/SUPERSEDE.** Canon §7 rules `chat_threads` **out** for the tutor build, replaced by `sessions`; `tutor_students` replaces cohort framing (`class_id` nullable for 1-1). |
| `deps.py :: get_current_tutor()` → `LOCAL_DEV_TUTOR_ID` (all-zeros UUID; seeded in migration `928e2e58469d`) | Auth **stubbed to single-user** (tutor path). | **REUSE.** "Single user = the tutor" already true. Google OAuth / `MAIT_ACCESS_CODE` → flag-off. |
| `services/storage.py::get_history(limit=20)` + `ConversationHistory` | ~20-message window (legacy student path). | **REFERENCE.** Canon §7 replaces conversational memory with relational two-tier memory (below). |
| `services/rag/*` — FAISS + `all-MiniLM-L6-v2` **384-dim** (via `syllabus_service`, `/query`+`/interact`, `educational_agent`) | Older syllabus RAG. | **FLAG-OFF / decommission-later.** Canon §8: FAISS/MiniLM **DEAD, never reintroduce**; still live-imports at boot via legacy student path (logged `docs/AUDIT_2026-06-12.md`, `faiss-cpu`+`sentence-transformers` still in `requirements.txt`, relevant to 512 MB host). |
| `scripts/ingest_to_pgvector.py`, `db/models.py::VectorChunk (Vector(768), HNSW cosine)` | Gemini-768 pgvector ingest + schema (`vector_chunks`, 276 chunks, NESA-only). | **REUSE the pattern**; **do not alter `vector_chunks`** without Darra (canon §8). |
| Keystroke psychometrics, `features/slm/*` (WebLLM/`CodeVerifier`/`ModelConsentGate`), Avatars/persona/voice, PDF-ingest, tiered safety | Out-of-scope subsystems (also confirmed "OUT" by canon drift log). | **FLAG-OFF, do not delete.** |
| Canon §7 tables `sessions`, `tutor_students`, `topic_mastery`, `question_log`, `mistake_vault`; two-tier memory | **Ratified in canon, NOT in code** (absent from `db/` + Alembic chain). | **BUILD-NEW to canon spec** (Phase 1+3) — see §3. |
| **Cerberus verifier** | Absent (only `TODO.md:19` stub; canon **silent**). | **BUILD-NEW** (Phase 2). |
| **`tailscale serve`** | Absent anywhere. | **BUILD-NEW ops** (Phase 4). |

---

## 2. /teach verdict — **already merged; in-place adapt (no branch, no cherry-pick)**

`/teach` and the whole Tutor Exoskeleton are **not on a diverged branch** — they are merged into `main`. Verified: only `main` + this audit branch exist; the introducing commits (`93f791a`→`63e1a42`→`ea0c08d`→`d07a042`) are in **both**; `git log --all -S "/teach"` returns only these + doc mentions. **Divergence = 0 (it *is* the default branch).** The initialiser's premise of a separate `/teach` branch to `git show` is **stale**. Reusable in place: `features/exoskeleton/*` + `routers/chat.py`. Caveat: current cockpit UX is an *earlier* iteration than canon §7's ratified card/tap/command-bar design, and it does **not** hand off to the Canvas IDE — unification is net-new (Conflict C5).

---

## 3. Memory-engine port plan

- **Source:** Brief names a *"companion app repo."* Canon §7 identifies the lineage: the student-memory is **"two-tier, Vesper-derived"** — but canon explicitly rules *"Vesper's SQLite + Markdown-file watchdog is NOT ported"*; relational state = **Postgres**, editability = ledger UI, Markdown = parent-report export only. No Vesper source is in session scope (grep: "Vesper" appears only in canon). → **Open Q1** (is Vesper the companion repo; port source vs. clean canon-§7 build).
- **Design fork to resolve (Open Q2):** Brief Phase 1 wants **embedding top-k** over per-student *session notes + misconception tags*. Canon §7 specifies **relational** student memory — rolling-summary `tutor_students.profile` JSONB (Tier 1) + episodic `sessions` (Tier 2) + `topic_mastery` + `mistake_vault` — reserving embeddings for the syllabus corpus only. These are different stores; need Darra's call.
- **Target schema (canon §7, Postgres/pgvector — build these, don't invent names):**
  - `tutor_students` — (id, tutor_id FK, name→**alias slug only**, course/subject, year_level, `profile` JSONB incl. running summary; `class_id` nullable; **no** `fatigue_state`).
  - `sessions` — THE SPINE (id, tutor_id FK, student_id FK, date, status, brief/deck/dump refs). Replaces `chat_threads` for the tutor build. = brief's "session auto-logged".
  - `topic_mastery` — per (student, subject, topic): `status ∈ unseen→introduced→shaky→solid→mastered`, last_seen, last_succeeded, streak.
  - `question_log` — per generated question: session/student FK, topic, payload ref, `outcome ∈ nailed/struggled/bombed/skipped`, **optional misconception tag**, ts. = brief's Phase 3 kept/edited metrics + Phase 1 "misconception tags".
  - `mistake_vault` — error triplets (student, topic→failure_mode→error_class), evidence = `question_log` FK. = brief's "misconception tags" store.
- **PII (schema-level, canon-compatible):** alias slug is the only identifier; no surname/school/contact columns. Canon **R2** (pseudonymisation middleware real→slug before external API) is *ruling-pending but must not be precluded* → **Open Q5**.
- **Migration:** Alembic (linear single-head chain `20260424_000001`→`1a1707433d05`→`928e2e58469d`). New head for the §7 tables. **Migration note required** (guardrail). Do **not** touch `vector_chunks` (canon §8).
- **Retrieval wiring:** compact per-student context block → new `student_context` placeholder in `INTENT_TEMPLATES` (`chat.py::generate_chat`), kept **separate** from syllabus `vector_chunks` retrieval so Cerberus can be denied it (Phase 2).

---

## 4. Conflict log

**4a — Handoff brief vs actual code**
- **C1 · SQLite vs pgvector.** Brief: memory = *"SQLite + 768-dim Gemini embeddings … as already built."* Code: migrated to Postgres+pgvector; SQLite is legacy rollback-only. 768-dim Gemini embeddings are real but currently embed **syllabus** chunks, not per-student memory. → build port on pgvector.
- **C2 · Two embedding systems.** Legacy `/query` = MiniLM **384-dim** FAISS; cockpit `/api/chat/generate` = Gemini **768-dim** pgvector. Standardize on 768/pgvector.
- **C3 · `/teach` is not a branch** — already merged to `main`; no divergence to measure.
- **C4 · Cockpit ≠ Canvas IDE.** Done line needs generate→Cerberus→edit→compile→export on **one** surface; today `/teach` and `WorksheetStudio` are separate with no handoff. Net-new integration.
- **C5 · "student" vs "class/cohort".** Brief wants alias-slug students (S1…); code models `TutorClass`/"Cohorts". Adapt.

**4b — Handoff brief vs vision docs / canon** *(subagent-distilled, canon-verified)*
- **V1 · SQLite explicitly BANNED.** Canon §8: *"NEVER use SQLite/aiosqlite for active logic, or FAISS/sentence-transformers anywhere."* This **overrules** the brief's "SQLite … as already built" — pgvector is mandatory. (Strengthens C1; decisive.)
- **V2 · Schema already ratified, not built.** Canon §7 specifies `sessions`/`tutor_students`/`topic_mastery`/`question_log`/`mistake_vault`; code still has teacher-sprint `tutor_classes`/`chat_threads`/`messages`. Dogfood Phase 1+3 ≈ *land the already-ratified canon schema*, using canon names — **not** invent (`student_memory` etc.).
- **V3 · Memory paradigm.** Brief = embedding top-k over notes; canon §7 = relational two-tier (rolling summary + episodic + mastery + vault). Genuine fork (→Q2).
- **V4 · "textbook" context.** Brief Mission says *"syllabus/**textbook** context"*; canon §8/§4: **NESA syllabus ONLY**, no textbook content ingested or named as truth (styles-only references allowed). Conflict (→Q4).
- **V5 · Naming absent from canon.** `Cerberus`, `/teach`, "cockpit", "unified tutor surface" exist only in brief/code. Reconcile vocabulary with canon (Exoskeleton, `mistake_vault`, command bar) rather than introducing parallel terms.
- **V6 · Vision doc is stale on audience/architecture** (not a *brief* conflict — vision is superseded by canon): Feb'26 vision frames student-as-user + hybrid Edge-Cloud "Tri-Brain"/SLM + avatars/voice + 3-tier safety as *locked core*; canon + brief invert to tutor-as-sole-user and flag all of that OFF. Confirms the brief's OUT list aligns with canon, against the older vision.
- **FLAG · MyAITeam vision doc not found** (searched repo, absent). Named in the initialiser authority chain but unavailable → Q5.

---

## 5. Open questions for Darra (max 5)

1. **Vesper / memory source.** Canon §7 calls the student-memory "Vesper-derived" but rules Vesper's SQLite/watchdog *not* ported (Postgres instead). Is **Vesper** the "companion app repo"? Do you want me to pull from its source (grant access), or implement canon §7 clean in-repo?
2. **Memory paradigm (the fork).** Brief wants **embedding top-k** over per-student notes + misconception tags; canon §7 specifies a **relational** two-tier store (rolling summary + episodic `sessions` + `topic_mastery` + `mistake_vault`), embeddings reserved for the corpus. Which is the dogfood store — vector-retrieval notes, canon's relational tier, or relational + optional note embeddings?
3. **Build to canon §7 + canon cockpit UX?** Confirm I implement Phase 1+3 directly to canon names (`sessions`/`tutor_students`/`topic_mastery`/`question_log`/`mistake_vault`; brief's "session log"→`sessions`, "misconception tags"→`mistake_vault`/`question_log.misconception_tag`), and that the cockpit follows canon §7 UX (question cards + one-tap outcomes + command bar + traffic-light map), superseding the current chat-cadence Workspace — rather than inventing new tables/UX.
4. **Textbook vs NESA-only.** Brief Mission says "syllabus/**textbook** context"; canon bans textbook content (NESA syllabus only, styles-only prompt refs). Confirm syllabus-only for the dogfood.
5. **PII / pseudonymisation (canon R2) + MyAITeam doc.** Alias-slug-only at schema is in; do you also want canon's pseudonymisation middleware (real→slug before any external API call) in V1 now, or deferred? And — the **MyAITeam vision doc isn't in the repo**; where is it? (Needed to close the authority-chain reconciliation for the "unified tutor surface".)

---

**STOP — awaiting approval. Phase 1 not started.**
