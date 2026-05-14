# Implementation Plan: Tutor-Only V1 (The Dogfooding Phase)

## 1. Strategic Context

The primary goal of this sprint is to rapidly deliver a **Tutor-Only Command Center** that enables the founder to replace his current OpenAI Custom Gems and leverage MAIT's new pgvector-based RAG pipeline in live tutoring sessions. By strategically delaying the full multi-tenant (Tutor/Student/Parent) authentication rollout, we remove significant friction (student login flows, complex privacy scrubbers, magic links) and accelerate the validation of the core instructional engine. 

This approach provides immediate ROI in live sessions, tests the NESA RAG corpus with real students, and anchors future student-facing features on a proven pedagogy engine.

## 2. Data Model (Tutor-Only Schema)

We will introduce new tables to support manual student profiling and the pgvector RAG implementation, while keeping the existing `users` and multi-tenant logic untouched for now.

### `tutor_students`
Manually created profiles managed exclusively by the tutor.
*   **`id`** (`UUID`, primary_key, default `uuid4`)
*   **`name`** (`String`, nullable=False)
*   **`syllabus_focus`** (`String`, nullable=False) - e.g., "Mathematics Advanced"
*   **`current_topics`** (`JSONB`, default `[]`) - Active topics being taught.
*   **`struggle_areas`** (`JSONB`, default `[]`) - Specific areas of difficulty.
*   **`bloom_state`** (`String`, default `'remembering'`) - Current pedagogical tier.
*   **`created_at`** / **`updated_at`** (`DateTime`)

### `vector_documents`
Represents source materials (e.g., NESA Mathematics Syllabus).
*   **`id`** (`UUID`, primary_key)
*   **`title`** (`String`, nullable=False)
*   **`source_url`** (`String`, nullable=True)
*   **`created_at`** / **`updated_at`** (`DateTime`)

### `vector_chunks`
Stores the embedded NESA syllabus dot-points. Requires the `pgvector` extension.
*   **`id`** (`UUID`, primary_key)
*   **`document_id`** (`UUID`, ForeignKey(`vector_documents.id`, ondelete="CASCADE"))
*   **`content`** (`Text`, nullable=False) - The raw text of the syllabus point.
*   **`metadata_json`** (`JSONB`, default `{}`) - Contains hierarchical data (Subject, Module, Topic, Outcome).
*   **`embedding`** (`Vector(N)`) - Vector dimension depends on the embedding model (e.g., 1536 for OpenAI, 768 for Gemini).
*   *Index*: HNSW or IVFFlat index on the `embedding` column for fast similarity search.

### Updates to Existing Models
Modify `Document` (or Worksheet) in `app.db.models`:
*   Add `tutor_student_id` (`UUID`, ForeignKey(`tutor_students.id`), nullable=True).
*   This links manually created students to the worksheets generated in the Native Canvas, decoupling it from the rigid `student_id` tied to Google Auth in the current implementation.

## 3. The pgvector RAG Pipeline

This replaces the current FAISS implementation in `educational_agent.py` and `syllabus_service.py` with a robust Postgres-backed vector store.

1.  **Neon DB Configuration**: 
    *   Activate the `pgvector` extension in Neon (`CREATE EXTENSION IF NOT EXISTS vector;`).
2.  **Ingestion Script**: 
    *   Create a standalone Python script (`scripts/ingest_nesa.py`) that parses the structured NESA Mathematics Syllabus.
    *   Chunks the content hierarchically and calls the embedding API.
    *   Inserts records into `vector_documents` and `vector_chunks`.
3.  **Retrieval Logic**:
    *   When the tutor selects a student and topic, the system combines the student's `struggle_areas` and the specific `topic` into a search query.
    *   Embed the search query and perform a cosine similarity search (`<=>`) against `vector_chunks.embedding`.
    *   Inject the top-K relevant NESA syllabus dot-points into the `get_gemini_response` system prompt, overriding generic LLM behavior with specific curriculum standards.

## 4. Tutor Command Center (The UI)

The v1 dashboard will be a streamlined, protected route for the tutor to manage sessions.

*   **Student Roster View**: A simple list of all manually created students (`tutor_students`).
*   **Student Detail View**: Displays the student's `struggle_areas`, `bloom_state`, and recently generated worksheets.
*   **The Question Generator**: 
    *   A form where the tutor selects: (1) Student, (2) Target Topic.
    *   The backend runs the RAG pipeline to retrieve relevant syllabus points.
    *   Calls the Gemini LLM to generate targeted, differentiated questions.
*   **Native Canvas Integration**: 
    *   The output of the Question Generator is mapped to the existing `WorksheetRequest` schema.
    *   It is sent to the existing `/canvas/generate` endpoint, which uses `generate_worksheet_latex` to instantly render it as a usable, editable PDF in the Native Canvas.

## 5. Implementation Sequence

**Phase 1: Database Schema & Vector Setup (Days 1-2)**
*   Enable `pgvector` in Neon.
*   Update `models.py` with `tutor_students`, `vector_documents`, and `vector_chunks`.
*   Generate and apply Alembic migrations.

**Phase 2: Backend CRUD for Tutor Students (Day 3)**
*   Create FastAPI router (`/tutor/students`) for basic CRUD operations on `tutor_students`.
*   Update `Document` model to accept `tutor_student_id` as an optional foreign key.

**Phase 3: NESA Syllabus Ingestion (Days 4-5)**
*   Build the `ingest_nesa.py` script.
*   Process the curriculum data, embed using the chosen model, and populate the Neon database.

**Phase 4: RAG Retrieval & Question Generator Endpoint (Days 6-8)**
*   Implement `vector_service.py` with `pgvector` similarity search.
*   Create the `/tutor/generate-questions` endpoint that merges student context, RAG retrieval, and Gemini API calls.
*   Format output for seamless handoff to the Native Canvas.

**Phase 5: Frontend Dashboard (Days 9-11)**
*   Build the React components for the Student Roster and Detail views.
*   Build the Question Generator UI and wire it to the `/tutor/generate-questions` endpoint.
*   Integrate the response into the existing Worksheet Studio / Canvas view.

## 6. Out of Scope (Phase 2)

To strictly prevent scope creep, the following are **NOT** included in this sprint:
*   NO Student Authentication, Magic Links, Google OAuth, or JWT Auth for students.
*   NO Student-facing chat interfaces or self-serve pedagogical agents.
*   NO Parent emails, progress reports, or onboarding flows.
*   NO complex privacy scrubbers or PII masking (since the tutor is the sole data entry point).

## 7. Critical Architectural Decisions

### Embedding Model
*   **Recommendation:** `text-embedding-3-small` (OpenAI).
*   **Justification:** While Gemini is used for generation, OpenAI's `text-embedding-3-small` is exceptionally cheap ($0.02/1M tokens), highly performant, and produces 1536-dimensional vectors which are well-supported. Local sentence-transformers require maintaining infrastructure, and Gemini's embeddings, while free tier, often lag behind OpenAI's v3 models in pure retrieval benchmarks. 

### Chunking Strategy
*   **Recommendation:** Preserve NESA hierarchy.
*   **Justification:** Math syllabus items rely heavily on their parent context. A chunk should represent a single Outcome or Content point, but its `metadata_json` MUST include the Subject, Module, and Topic. 
*   **Parameters:** Chunk size: 256-512 tokens. Overlap: 50 tokens.

### Retrieval Approach
*   **Recommendation:** Pure vector similarity for V1.
*   **Justification:** Simplest to implement using `pgvector`'s `<=>` operator. Hybrid search (vector + keyword for MA-C1.1 codes) is more accurate but requires setting up PostgreSQL full-text search alongside vectors, which delays the V1 sprint. We will rely on the embedding model's ability to understand the codes for now.

### Re-ranking
*   **Recommendation:** Defer for V1.
*   **Justification:** Re-ranking (e.g., Cohere Re-rank) significantly improves RAG quality but adds API latency and complexity. For V1, simple cosine similarity top-K (K=5) will be sufficient to validate the workflow.

## 8. Open Questions

> [!WARNING]
> The following architectural decisions require clarification before Phase 4 execution:

1.  **Worksheet Integration:** The current `CanvasGenerateRequest` in `routers/canvas.py` strictly requires a `student_id` string (tied to Google Auth) and enforces `verify_student_auth`. Do we bypass this auth dependency entirely for the `/tutor` routes, or do we mock a `student_id` for the tutor's session to reuse the existing `/canvas/generate` endpoint unmodified?
2.  **Generative Model Consistency:** The current `educational_agent.py` uses Gemini via `get_gemini_response`. The RAG pipeline will retrieve via OpenAI embeddings. Should the Question Generator continue using Gemini for the final prompt synthesis to keep costs low, or switch to GPT-4o for potentially better formatting of LaTeX mathematical notation?
3.  **FAISS Deprecation:** Does the existing FAISS setup in `syllabus_service.py` need to be maintained alongside `pgvector` during this phase, or can we safely tear it down immediately?

## 9. Validation Criteria

"Tutor-Only V1" is officially considered DONE when:

1.  **Migration:** Darra has successfully migrated his current active tutoring students into the `tutor_students` database via the new UI.
2.  **Usage:** The Question Generator has been successfully used to drive at least 3 real, live tutoring sessions.
3.  **RAG Grounding:** Subjective review confirms that generated math questions are demonstrably grounded in specific NESA syllabus dot-points (e.g., correctly bounding the scope of Calculus questions), rather than generic LLM outputs.
4.  **Contextualization:** Worksheets generated for a student visibly incorporate their specific `struggle_areas` and `bloom_state` in the difficulty and phrasing of the questions.
5.  **Deprecation:** The legacy OpenAI Custom Gem workflow is officially deprecated and no longer used for live sessions.
