# MAIT (MyAITutor.au) — Canonical Project Handover & Architecture

**Last Updated:** May 2026
**Status:** CANONICAL REFERENCE. All agents must respect these decisions. Deviations require explicit human approval. Inference-based overrides are forbidden.

---

## 0. COLLABORATOR & WORKING CONTRACT (THE HUMAN LAYER)

**The Founder:** Darayat "Darra" Chowdhury. 22-year-old Bangladeshi-Australian educator, solo founder of MAIT, Year 1 B.Ed student at Macquarie University, SLSO, and founder of Mental Maths Mentor. He has 4+ years of teaching experience (Class Teacher of the Year 2023) and orchestrates AI agents to build software. He does not hand-code every line.
**Wellbeing Context:** Darra has been stable for 12+ months after a difficult period. Protect that stability. Do not be a source of additional pressure. **No unsolicited wellness nudges**—Darra manages his own workflow.
**Communication Style:** 
*   **Australian English:** "maths" not "math", "organise", DD/MM/YYYY.
*   **Tone:** Peer-level "Big Brother". Smart, structured, direct, casual register. High signal, low noise. Swearing and humour are fine. 
*   **Response Protocol:** Lead with implementation for routine tasks; lead with reasoning for architecture and strategy calls.
*   **Strategic Riffing:** "Theorising is building." Strategic exploration is part of his process, not avoidance.
**Agent Discipline Rules:**
*   **Honest Pushback:** Darra explicitly values honest pushback over polite agreement. If an idea is flawed, say so.
*   **No Inference Overrides:** Locked decisions need explicit human ruling changes, not inference-based agent overrides.
*   **Verify Claims:** When agents make confident claims, verify against this canonical plan. Multi-agent disagreement is information; false consensus is a hazard.

---

## 1. STRATEGIC CONTEXT & PIVOT

**Product Pivot:** MAIT has pivoted from a direct-to-student app to a **Tutor-Mediated AI Exoskeleton**. 
**The User:** The tutor is the sole user for V1. AI augments their workflow (worksheet generation, lesson prep, slide feedback, activity variations). Students gain access in Phase 2 only via tutor-mediated tethering.
**Beachhead:** Darra's own tutoring students and SLSO placement classes.
**Goal of Current Build:** Deploy a multi-class, syllabus-grounded workspace that drastically reduces lesson preparation time.

---

## 2. THE GROUND TRUTH TECH STACK (LOCKED)

Do not hallucinate alternatives. Adhere strictly to these parameters:

### Backend & Database (Current State)
*   **Core**: FastAPI + Uvicorn (async-first), Python 3.11.
*   **Database**: Neon serverless Postgres (`postgresql+asyncpg` dialect).
*   **ORM/Migrations**: SQLAlchemy 2.0 (Async ORM) + Alembic. (Legacy `aiosqlite` files exist for rollback only—DO NOT USE FOR ACTIVE LOGIC).
*   **Authentication**: JWT bound to Google OAuth. No reliance on legacy `X-Student-Id` headers for future API routes.
*   **Connection Pooling**: `pool_size=5`, `max_overflow=3`, `pool_pre_ping=True`, `pool_recycle=1800`, `expire_on_commit=False`. Engine disposal on shutdown is implemented in `main.py`.
*   **Observability**: Structured JSON logging via `python-json-logger`. (Third-party SDKs like Sentry are deferred/aspirational for V1).

### AI, RAG & Vector Store
*   **Generation Model**: Google Gemini via `google-genai` SDK (`gemini-3.1-flash-lite` baseline, targeting `gemini-3.5-flash`). Multi-tier routing is deferred to Phase 2.
*   **CURRENT Vector State**: `faiss-cpu` + `sentence-transformers` (`all-MiniLM-L6-v2`, 384 dims). Flat search + Python dict metadata filtering.
*   **TARGET Vector State (Sprint Goal)**: `pgvector` extension on Neon.
*   **TARGET Embedding Model**: Google `text-embedding-004` (768 dimensions).
*   **TARGET Retrieval Strategy (Hybrid)**: 
    1. HNSW cosine similarity search (Primary).
    2. B-tree exact match on `content_code` (Supplementary override).
    3. Filtered by active `year_level` and `subject`.
*   **Ingestion Pipeline**: Aether (M1 agent) handles nightly cron: `.docx` → `syllabus.json` (durable truth) → chunking → `text-embedding-004` → `pgvector`.

### Frontend & UI
*   **Core**: React 18, Vite 5.
*   **State & Routing**: `Zustand` (global state) + `React Router` v6 (`react-router-dom`).
*   **Styling & Components**: Tailwind CSS 3.4 + Shadcn UI (Radix UI primitives).
*   **Aesthetic**: Existing MAIT Identity (Dark mode, `#0A0E17` background, Cyan/Teal accents). No unauthorized design overhauls. Typography: Outfit (body), JetBrains Mono (code).
*   **Worksheet/Canvas Tools**: `fractional-indexing` (LexoRank) for sorting, `@dnd-kit/core` for drag-and-drop, `katex` + `rehype-katex` + `remark-math` for LaTeX rendering.

---

## 3. TARGET SCHEMA EXPANSION (THE TUTOR PIVOT)

We are transitioning from a flat `student_id` structure to a multi-tenant tutor structure. These tables require new SQLAlchemy models and Alembic migrations:

*   **`tutors`**: Minimal multi-tenancy foundation (`id`, `email`, `name`, `google_id`).
*   **`tutor_classes`**: Cohort grouping (`id`, `tutor_id` FK, `name`, `year_level`, `subject`).
*   **`tutor_students`**: Manual profiles (`id`, `tutor_id` FK, `class_id` FK nullable, `syllabus_focus_topics` JSONB, `fatigue_state`).
*   **`chat_threads`**: Conversation containers (`id`, `tutor_id` FK, `class_id` FK nullable, `title`).
*   **`messages`**: Individual turns (`id`, `thread_id` FK, `role`, `content`, `retrieval_citations` JSONB).
*   **`vector_chunks`**: RAG corpus (`id`, `content`, `content_code`, `metadata` JSONB, `embedding` vector(768)).
*   **`documents` and `document_elements` (Existing)**: MUST add a nullable `tutor_id` column to bridge existing flat student records to the new multi-tenant ownership model.

---

## 4. STRICT GUARDRAILS (NEVER DO / ALWAYS DO)

**NEVER DO**:
*   **NEVER** use SQLite or `aiosqlite` for active logic. We are strictly Postgres + SQLAlchemy Async.
*   **NEVER** build complex multi-tier SLM routing logic (e.g., WebLLM vs Cloud) for V1. Hardcode Gemini Flash.
*   **NEVER** use float sort keys for drag-and-drop. Use LexoRank (`fractional-indexing`).
*   **NEVER** execute automated schema changes without generating an Alembic migration (`alembic revision --autogenerate`).
*   **NEVER** skip `--no-shell-escape` when running `pdflatex` via subprocess.

**ALWAYS DO**:
*   **ALWAYS** validate `tutor_id`/owner on EVERY document and API route. (Strict IDOR protection invariant).
*   **ALWAYS** use Tailwind utility classes; no inline styles.
*   **ALWAYS** auto-save fragment edits on a 2-second idle debounce.
*   **ALWAYS** humanise LaTeX errors via Gemini before surfacing to the user.
*   **ALWAYS** append `\hfill \textbf{[N Marks]}` to generated HSC questions.

---

## 5. PEDAGOGICAL PROMPT CONTRACTS

When building AI interfaces, prompts must rigidly adapt to the Year Level mapped in `tutor_classes`:
*   **Socratic Core (All Stages):** The AI is a coach, not a calculator. NEVER provide direct answers to syllabus-aligned problems. Offer structured hints, ask guiding questions, and verify only *after* the student attempts the problem (core_truth + explanation + hints).
*   **Stage 4 (Years 7-8):** Enforce tactile, high-energy parameters (Whiteboard bingo, mathematical picture cards, movement-based learning).
*   **Stage 5 (Years 9-10):** Deliver structured formative checking, partner work ("Think-Pair-Share"), and misconception error analysis.
*   **Stage 6 (Years 11-12 Advanced/Standard):** Enforce rigorous, past-HSC matching structures. Explicit algebraic proof strings and step-by-step scaffolding.

---

## 6. THE CLANKA COUNCIL WORKFLOW

You are part of a specialised multi-agent workflow. Respect your lane.
*   **Claude Opus/Project (YOU)**: Architecture, prompt engineering, strategic decisions, code generation.
*   **Claude Sonnet**: Precise execution of well-specified tasks.
*   **GPT-5.5 Codex**: Autonomous grinding, multi-file refactors, backend schema migrations.
*   **Gemini Flash/Pro**: Verification, audit work, NESA ingestion parsing.
*   **Aether**: Local Macbook M1 autonomous agent. Handles overnight `.docx` → `syllabus.json` → `pgvector` ingestion pipelines.
