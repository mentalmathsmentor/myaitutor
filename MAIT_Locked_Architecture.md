> ⚠️ SUPERSEDED 12/06/2026 by /MAIT_ARCHITECTURE_CANON.md — do not build against this document.

# MAIT (MyAITutor.au) - Canonical Project Handover & Sprint Blueprint

**Last Updated:** May 2026
**Status:** CANONICAL REFERENCE. All agents must respect these decisions. Deviations require explicit human approval.

## 1. STRATEGIC CONTEXT
**Product Pivot:** MAIT has pivoted from a direct-to-student app to a **Tutor-Mediated AI Exoskeleton**. 
**The User:** The tutor is the sole user for V1. AI augments their workflow (worksheet generation, lesson prep, slide analysis). Students gain access in Phase 2 only via tutor-mediated tethering.
**Beachhead:** Darayat's own tutoring students and SLSO placement classes.

## 2. THE GROUND TRUTH TECH STACK (LOCKED)
Do not hallucinate alternatives. Adhere strictly to these parameters:

### Backend & Database
*   **Core**: FastAPI + Uvicorn (async-first), Python 3.11.
*   **Database**: Neon serverless Postgres.
*   **ORM/Migrations**: SQLAlchemy 2.0 (Async ORM) + Alembic. (NO raw `aiosqlite`).
*   **Connection Pooling**: `pool_size=5`, `max_overflow=3`, `pool_pre_ping=True`, `pool_recycle=1800`, `expire_on_commit=False`. Engine disposal on shutdown is required.

### AI, RAG & Vector Store
*   **Generation Model**: Google Gemini (`google-genai` SDK, `gemini-3.5-flash` baseline for V1). Multi-tier routing (WebLLM/Pro) is deferred to Phase 2.
*   **Embedding Model**: Google `text-embedding-004` (768 dimensions).
*   **Vector Database**: `pgvector` extension on Neon.
*   **Retrieval Strategy (Hybrid)**: 
    1. HNSW cosine similarity search (Primary).
    2. B-tree exact match on `content_code` (Supplementary override).
    3. Filtered by active `year_level` and `subject`.
*   **Ingestion Pipeline**: Aether (M1 agent) handles nightly cron: `.docx` → `syllabus.json` (durable truth) → chunking → `text-embedding-004` → `pgvector`.

### Frontend & UI
*   **Core**: React 18, Vite.
*   **State & Routing**: `Zustand` (global state) + `React Router`.
*   **Styling & Components**: Tailwind CSS + Shadcn UI.
*   **Aesthetic**: Existing MAIT Identity (Dark mode, `#0A0E17` background, Cyan/Teal accents). No unauthorized design overhauls. Typography: Outfit (body), JetBrains Mono (code).
*   **Worksheet/Canvas Tools**: `fractional-indexing` (LexoRank) for sorting, `@dnd-kit/core` for drag-and-drop.

## 3. V1 SCHEMA REQUIREMENTS
Tables configured via SQLAlchemy Async ORM:
*   `tutors`: Minimal multi-tenancy foundation (`id`, `email`, `name`, `google_id`).
*   `tutor_classes`: Cohort grouping (`id`, `tutor_id` FK, `name`, `year_level`, `subject`).
*   `tutor_students`: Manual profiles (`id`, `tutor_id` FK, `class_id` FK nullable, `syllabus_focus_topics` JSONB, `fatigue_state`).
*   `chat_threads`: Conversation containers (`id`, `tutor_id` FK, `class_id` FK nullable, `title`).
*   `messages`: Individual turns (`id`, `thread_id` FK, `role`, `content`, `retrieval_citations` JSONB).
*   `vector_chunks`: RAG corpus (`id`, `content`, `content_code`, `metadata` JSONB, `embedding` vector(768)).
*   `documents`: Existing table; MUST ensure nullable `tutor_id` column exists for auth bypass.

## 4. STRICT GUARDRAILS (NEVER DO / ALWAYS DO)

**NEVER DO**:
*   NEVER use SQLite or `aiosqlite` for active logic (legacy files are for rollback only).
*   NEVER use FAISS or `sentence-transformers` (we are exclusively on `pgvector` + `text-embedding-004`).
*   NEVER use the `X-Student-Id` header hack to bypass auth for tutors. Use the nullable `tutor_id` on document creation.
*   NEVER use float sort keys for drag-and-drop. Use LexoRank (`fractional-indexing`).
*   NEVER skip `--no-shell-escape` when running `pdflatex` via subprocess.

**ALWAYS DO**:
*   ALWAYS use Tailwind utility classes; no inline styles.
*   ALWAYS auto-save fragment edits on a 2-second idle debounce.
*   ALWAYS humanize LaTeX errors via Gemini before surfacing to the user.
*   ALWAYS append `\hfill \textbf{[N Marks]}` to generated HSC questions.
*   ALWAYS communicate in Australian English (maths, organise). Write with a warm, direct, "Big Brother" peer-level tone. No corporate edtech jargon.

## 5. THE CLANKA COUNCIL WORKFLOW
You are part of a specialized multi-agent workflow. Respect your lane and do not overwrite decisions made in this document without explicit human permission.
*   **Claude Opus**: Architecture, prompt engineering, strategic decisions.
*   **Claude Sonnet**: Precise execution of well-specified tasks.
*   **GPT-5.5 Codex**: Autonomous grinding, multi-file refactors.
*   **Gemini Flash/Pro**: Verification, audit work, NESA ingestion via Aether.
*   **Aether**: Local M1 autonomous background operations.