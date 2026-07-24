# FABLE 5 DIRECTIVE: GENERATION ENGINE REFACTOR (CUSTOM GEM KILLER) — v3
Branch: Create `feature/teach-revamp` off `feature/pgvector-rag` HEAD. Confirm parent with `git log -1` before any work. 
Mode: Autonomous long-horizon execution, checkpointed phases.

## 1. STRATEGIC CONTEXT
Replace Darra's manual Custom Gem workflow with a native generation engine behind `/api/chat/generate`: structured lesson plans, practice sets, and full LaTeX worked solutions — no truncation, no format hallucination. This engine is the seam the Tutor V1 build will plug student context into.

## 2. STRICT SCOPE FENCE (CRITICAL)
- **NO DB schema changes.** Do not alter `app/db/tutor_models.py` or `app/models.py` table-side, and write NO Alembic migrations. 
- **NO frontend changes.** Backend service + routing layers only.
- **RETRIEVAL IS LOCKED.** You may MOVE the retrieval call into the new service, but you may not change the query shape, the embedding model, or `vector_chunks` in any way.
- **PROMPT TEXT IS LOCKED.** `SYSTEM_INSTRUCTION_CORE` and `INTENT_TEMPLATES` in `services/prompts.py` are authored by Claude and locked. You may import and call them from the engine but must NOT rewrite their pedagogy or content. You MAY add a conditional `student_context` block that is appended only when the string is non-empty.
- **Conflict rule:** the repo `MAIT_ARCHITECTURE_CANON.md` (DECISION layer) outranks this directive. If any instruction here contradicts it, the canon wins and you note the conflict in your report. Note: `canonical_system_prompt.md` (May 2026) is SUPERSEDED by the canon — do not inherit its `[N Marks]` rule.
- **Engine interface (canonical params):** the generation engine's public function accepts exactly these inputs:
  - `intent: TutorIntent` — selects the template from `INTENT_TEMPLATES`.
  - `topic: str` — the corpus topic string (used for retrieval filter AND embedding fallback).
  - `year_level: int` — from `TutorClass`.
  - `subject: str` — from `TutorClass`.
  - `ability_tier: str` — from `TutorClass`.
  - `refinements: str = ""` — free-text from the teacher.
  - `rag_chunks: str` — the pre-formatted retrieved chunks string. The engine receives this; it does NOT own retrieval. The router calls `_embed_query` + retrieval SQL and passes the formatted result.
  - **`student_context: str = ""`** — optional, default empty. The Tutor V1 socket. When empty, the prompt omits the student block cleanly (no "No student context available" filler).

- **`student_context` format contract (Vesper-derived):** when populated by the Tutor V1 session system, this string will follow this shape:
  ```
  Last session ({date}): {topic}.
  Nailed: {successes}. Struggled: {struggles}.
  Active vault: {mistake_vault_highlights}.
  ```
  The generation engine does NOT produce or parse this — it injects it verbatim into the prompt when non-empty. The post-session extraction pipeline (future build) owns the format. The engine's only obligation is: empty string → omit block; non-empty string → inject as-is after the intent template. **Autophagy guard (Vesper rule):** this field must only ever contain human-asserted content (tutor observations, outcome taps). Never inject previous AI-generated outputs as student context.

## 3. CHECKPOINTED EXECUTION PLAN
Do not proceed to the next phase until the current one is verified against the file system.

**PHASE A — Read-Only Sync**
- Read `MAIT_ARCHITECTURE_CANON.md` in full: the `ExoskeletonResponse` contract, LaTeX rules, generation contract, and guardrails.
- Read `backend/app/routers/chat.py`, `backend/app/services/prompts.py`, `backend/app/models.py`.
- Confirm that `INTENT_TEMPLATES` declares these placeholders: `{rag_chunks}`, `{year_level}`, `{subject}`, `{ability_tier}`, and `{refinements}` (chat intent). Note any others found.

**PHASE B — Architectural Refactor (Separation of Concerns)**
- Extract generation + prompt-injection logic from `chat.py` into `backend/app/services/generation_engine.py`. The router becomes thin: validate -> call engine -> persist -> return.
- The engine function signature matches §2's canonical params exactly. The router maps `TutorClass` fields + request body into these params before calling the engine.
- Gemini call strictly enforces `ExoskeletonResponse` via native structured outputs (`google-genai` SDK): `response_mime_type="application/json"` + `response_schema`, `max_output_tokens=8000`.
- `student_context` injection: if non-empty, append a `\n\nStudent Context:\n{student_context}` block after the formatted intent template. If empty, append nothing.
- Prompt pipeline rules (tutor-facing surface — these are VERIFIED in the existing templates, do not rewrite):
  - ALWAYS full, meticulous worked solutions in `teacher_answer_latex`. 
  - `marks` is OPTIONAL. NEVER force-append `[N Marks]` or `\hfill \textbf{[N Marks]}`. 
  - Engineering/physics/mechatronics analogies: DEFAULT in `explain_alt`, available elsewhere when pedagogically apt for the year level — never forced globally.
  - Ban LaTeX list environments (`\begin{enumerate}`, `\begin{itemize}`); formal notation for seniors; `\displaystyle` for senior integrals/fractions.
  - Every template placeholder is `.format()`-supplied on every call — missing keys must be impossible by construction.

**PHASE C — Self-Verification**
- Write `backend/tests/test_generation_engine.py`: mock the Gemini client; assert:
  1. Schema-valid `ExoskeletonResponse` parts round-trip correctly.
  2. No forced `[N Marks]` in template output.
  3. Empty `student_context` produces clean prompts (no "Student Context:" block, no filler text).
  4. Non-empty `student_context` injects the block correctly after the intent template.
  5. List-environment ban holds in system instruction (`\begin{enumerate}`, `\begin{itemize}` absent).
  6. `max_output_tokens=8000` is set on the Gemini config.
  7. The `rag_chunks` string passes through to the template unmodified.
  8. Invalid Gemini JSON response raises a clear error (test the `model_validate_json` fallback path).
  9. Empty `rag_chunks` (zero retrieval results) produces a clean fallback prompt with the "No exact topic chunks" message.
  10. Gemini call timeout (60s) is configured.
- Run the tests; debug until green. Terminal blockers only -> stop and report.

**PHASE D — Commit & Report**
- Single commit: `feat(backend): extract generation engine for custom gem workflow`. Push `feature/teach-revamp`. No PR, no merge.
- Report back: files changed, test results, any canon conflicts encountered.