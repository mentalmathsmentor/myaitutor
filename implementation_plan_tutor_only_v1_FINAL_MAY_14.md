# Implementation Plan — Tutor-Only V1 (Dogfooding Phase)

**Status:** FINAL (Canonical spec for the 7–14 day single-user sprint).
**Owner:** Darra (founder, sole user).
**Target Branch:** `docs/tutor-only-v1-plan`

---

## 1. Strategic Context

We are deliberately delaying the full multi-tenant rollout (Tutor + Student + Parent auth, magic links, JWT, privacy scrubbing) to ship a **single-user Tutor Command Center**. 

**Core Objectives:**
1. **Replace OpenAI Custom Gems immediately:** Generate immediate ROI by moving live session preparation into the MAIT-native stack.
2. **Validate the NESA RAG pipeline:** Test the retrieval engine empirically in real sessions before exposing it to students.
3. **Skip Auth Friction:** Build the core engine first, gate it later.

---

## 2. Data Model (Tutor-Only Schema)

All new tables live in Neon Postgres alongside the existing schema. We do not drop existing tables; we add and softly link.

### 2.1 `tutor_students`
Manual profiles created by the tutor. These replace the Google-OAuth `users` row as the addressable "student" for V1.

```sql
CREATE TABLE tutor_students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id       TEXT NOT NULL UNIQUE,            
    name            TEXT NOT NULL,
    year_level      TEXT,                            
    syllabus_focus  TEXT NOT NULL,                   
    current_topics  JSONB NOT NULL DEFAULT '[]'::jsonb,
    struggle_areas  JSONB NOT NULL DEFAULT '[]'::jsonb,
    bloom_state     JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes           TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_students_public_id ON tutor_students(public_id);
```

### 2.2 `vector_documents` & `vector_chunks`
Store the ingested NESA syllabus dot-points.

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name     TEXT NOT NULL,
    syllabus_code   TEXT NOT NULL,
    content_hash    TEXT NOT NULL UNIQUE,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vector_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES vector_documents(id) ON DELETE CASCADE,
    chunk_text      TEXT NOT NULL,
    embedding       VECTOR(1536),                    -- text-embedding-3-small dim
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
                    -- e.g., {"subject":"Maths Advanced", "content_code":"MA-C1.1"}
    chunk_index     INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for cosine similarity
CREATE INDEX idx_chunks_embedding
    ON vector_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- B-tree on content_code for cheap hybrid filtering
CREATE INDEX idx_chunks_content_code
    ON vector_chunks ((metadata->>'content_code'));
```

### 2.3 Linking to Existing Canvas (Auth Bypass Strategy)
To integrate with the existing `documents` and Canvas endpoints without rewriting `verify_student_auth`, we gracefully extend the schema:

```sql
ALTER TABLE documents ADD COLUMN tutor_student_id UUID
    REFERENCES tutor_students(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_tutor_student_id ON documents(tutor_student_id);
```
**Auth Bypass:** When the Question Generator creates a worksheet, it sets `documents.student_id` to **Darra's Google OAuth ID** (the authenticated session). It sets `documents.tutor_student_id` to the specific `tutor_students.id`. This satisfies the legacy auth middleware while preserving the true pedagogical link.

---

## 3. The pgvector RAG Pipeline

### 3.1 Ingestion (`scripts/ingest_nesa_syllabus.py`)
A standalone Python script using `pdfplumber` to extract NESA hierarchy. Chunks target ~400 tokens with 60-token overlap, tagging exact NESA codes (`MA-C1.1`) into the `metadata` JSONB.

### 3.2 Hybrid Retrieval Logic
Retrieval merges semantic search with exact NESA code filtering.

```sql
SELECT vc.id, vc.chunk_text, vc.metadata,
       1 - (vc.embedding <=> :query_embedding) AS similarity
FROM vector_chunks vc
JOIN vector_documents vd ON vd.id = vc.document_id
WHERE vd.syllabus_code = :syllabus
  AND (:code IS NULL OR vc.metadata->>'content_code' = :code)
ORDER BY vc.embedding <=> :query_embedding
LIMIT 8;
```

### 3.3 Gemini Injection
Returned chunks are formatted into a `<NESA_SYLLABUS_CONTEXT>` block and injected into the existing Gemini system prompt via `educational_agent.py`.

---

## 4. Tutor Command Center (The UI)

A new, protected Next.js route cluster `/tutor`.

*   **`/tutor`**: Home view showing active students and recent worksheets.
*   **`/tutor/students/new`**: Lightweight profile creation.
*   **`/tutor/students/[id]`**: Detail page showing struggle areas and Bloom state.
*   **`/tutor/question-generator`**: The core dogfooding tool.
    *   **Step 1 (Preview):** `POST /api/tutor/generate/preview` runs RAG and returns draft questions with syllabus citations.
    *   **Step 2 (Create):** `POST /api/tutor/generate/worksheet` transforms the preview into a Native Canvas `Document` and redirects the tutor to `/canvas/[document_id]`.

---

## 5. Implementation Sequence

*   **Phase 1 (Days 1-2):** Database schema updates, Alembic migrations, and pgvector extension setup in Neon.
*   **Phase 2 (Day 3):** Backend CRUD for `tutor_students` and document linking.
*   **Phase 3 (Days 4-5):** Build the NESA ingestion script and populate Neon.
*   **Phase 4 (Days 6-8):** Implement pgvector Hybrid Retrieval, the `/api/tutor/generate` endpoints, and Gemini prompt injection.
*   **Phase 5 (Days 9-11):** Build the React Command Center UI (`/tutor/*`) and wire up the Native Canvas handoff.

---

## 6. Critical Architectural Decisions

1.  **Embedding Model:** `text-embedding-3-small` (OpenAI). Highly performant for technical prose, extremely cheap, standard 1536 dims.
2.  **Chunking:** 400-token target, 60 overlap. Metadata JSONB stores the hierarchy to prevent text bloat in the embedding.
3.  **Retrieval:** Hybrid. B-Tree exact match on `content_code` + HNSW cosine similarity.
4.  **Re-ranking:** Deferred to Phase 2 to minimize latency in live sessions.

---

## 7. Out of Scope (Phase 2)

*   Student/Parent authentication, JWTs, and Magic Links.
*   Student-facing chat interfaces.
*   Privacy scrubbers.
*   FAISS deletion (run in parallel until validated).

---

## 8. Validation Criteria (Definition of Done)

1.  Darra has migrated current paying students into `tutor_students`.
2.  The Question Generator has been used in ≥ 3 live tutoring sessions.
3.  Retrieved syllabus context is demonstrably grounded in exact NESA dot-points.
4.  Generated worksheets visibly target specific student `struggle_areas`.
5.  The legacy OpenAI Custom Gem workflow is officially deprecated.
