# MAIT Tutor-Only V1 Implementation Plan: The Dogfooding Phase

This document is the canonical architectural specification for MAIT's Tutor-Only V1 sprint. It intentionally delays multi-tenant Tutor/Student/Parent authentication and focuses on a single-user Command Center that Darra can use in live tutoring sessions this week.

## 1. Strategic Context

Tutor-Only V1 exists to make MAIT useful before it becomes broadly multi-tenant. The near-term goal is not a polished platform with student onboarding, parent workflows, or production-grade role management. The goal is to replace Darra's current OpenAI Custom Gems workflow with a MAIT-native command center backed by the same curriculum-aware pipeline the full product will later use.

This is dogfooding in the practical sense: the founder should be able to create manual student profiles, capture each student's current topics and struggle areas, retrieve grounded NESA syllabus context from pgvector, generate targeted questions through Gemini, and turn those questions into Native Canvas worksheets during real sessions. That loop creates immediate ROI and tests the product's hardest claim: MAIT can produce better, more context-aware tutoring material than a generic LLM prompt.

The strategic reason for postponing full authentication is friction. Student magic links, JWT issuance, parent onboarding, privacy controls, and cross-role authorization are valuable, but they do not prove the core learning loop. In this sprint the tutor is the only operator. The database should still be shaped so Phase 2 can add real accounts later, but v1 should optimize for speed, reliability, and live-session usefulness.

The current codebase already supports useful pieces: `documents` and `document_elements` model Native Canvas artifacts; `canvas.py` can generate a document from a worksheet request; `artifact_engine.WorksheetRequest` already carries a `syllabusPacket`; and `educational_agent.py` has a RAG step before calling Gemini. The pivot is to replace the current FAISS syllabus retrieval path with durable Neon pgvector tables and expose a tutor-first workflow around it.

## 2. Data Model (Tutor-Only Schema)

Create a new manual student profile table. These are not auth users. They are tutor-owned pedagogical records.

```sql
CREATE TABLE tutor_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  syllabus_focus text NOT NULL DEFAULT 'NSW Mathematics',
  current_topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  struggle_areas jsonb NOT NULL DEFAULT '[]'::jsonb,
  bloom_state jsonb NOT NULL DEFAULT '{"level":"remember","notes":""}'::jsonb,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_students_active ON tutor_students (is_active);
CREATE INDEX idx_tutor_students_current_topics ON tutor_students USING gin (current_topics);
CREATE INDEX idx_tutor_students_struggle_areas ON tutor_students USING gin (struggle_areas);
```

`current_topics`, `struggle_areas`, and `bloom_state` should remain JSONB for v1 because Darra will iterate on how he describes student context. Suggested shapes:

```json
{
  "current_topics": [{"course":"Mathematics Advanced","topic":"Differentiation","code":"MA-C1"}],
  "struggle_areas": [{"label":"chain rule setup","severity":"high","evidence":"misses inner derivative"}],
  "bloom_state": {"level":"apply","target":"analyse","notes":"Can execute routine steps but struggles with method choice."}
}
```

Create corpus-level document records for source material.

```sql
CREATE TABLE vector_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name text NOT NULL,
  source_type text NOT NULL, -- pdf, docx, html, manual
  source_uri text,
  syllabus text NOT NULL, -- e.g. NSW Mathematics Advanced
  version_label text,
  content_hash text NOT NULL UNIQUE,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
```

Create chunk records for pgvector retrieval.

```sql
CREATE TABLE vector_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES vector_documents(id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  chunk_text text NOT NULL,
  embedding vector(768) NOT NULL,
  subject text,
  course text,
  module text,
  topic text,
  outcome_code text,
  content_code text,
  hierarchy_path text NOT NULL,
  page_start integer,
  page_end integer,
  token_count integer,
  content_hash text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index),
  UNIQUE (content_hash)
);

CREATE INDEX idx_vector_chunks_hierarchy ON vector_chunks (course, module, topic);
CREATE INDEX idx_vector_chunks_codes ON vector_chunks (outcome_code, content_code);
CREATE INDEX idx_vector_chunks_metadata ON vector_chunks USING gin (metadata_json);
CREATE INDEX idx_vector_chunks_embedding
  ON vector_chunks USING hnsw (embedding vector_cosine_ops);
```

The existing `documents` table already has `student_id text`, which Native Canvas uses for ownership checks. For Tutor-Only V1, add a nullable `tutor_student_id` foreign key rather than replacing `student_id`.

```sql
ALTER TABLE documents
  ADD COLUMN tutor_student_id uuid REFERENCES tutor_students(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_tutor_student_id ON documents (tutor_student_id);
```

If a separate `worksheets` table exists outside the inspected models, apply the same nullable `tutor_student_id` link there. Native Canvas appears to persist worksheets as `documents` plus `document_elements`, so `documents.tutor_student_id` is the primary v1 link.

## 3. The pgvector RAG Pipeline

Enable pgvector in Neon through an Alembic migration:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

The ingestion script should live under `mait-mvp/backend/scripts/ingest_nesa_syllabus_pgvector.py`. It should parse NESA PDF/DOCX sources, preserve curriculum hierarchy, embed each chunk, and upsert into `vector_documents` and `vector_chunks`.

The current FAISS path already has useful precedent in `services/rag/document_processor.py`: it extracts syllabus text, detects topic and content codes, and stores metadata. The new script should reuse or adapt that parsing logic but write to Postgres instead of local FAISS files.

Skeleton:

```python
async def ingest_file(path: Path, db: AsyncSession) -> None:
    raw = extract_text(path)
    sections = parse_nesa_hierarchy(raw)
    document = await upsert_vector_document(db, path, raw)
    for index, section in enumerate(chunk_sections(sections, max_tokens=650, overlap=100)):
        embedding = await embed_text(section.embedding_text)
        await upsert_vector_chunk(
            db,
            document_id=document.id,
            chunk_index=index,
            chunk_text=section.text,
            embedding=embedding,
            metadata=section.metadata,
        )
```

Retrieval for the Question Generator should build a query from both explicit topic selection and student context:

```text
Topic: Differentiation
Syllabus focus: NSW Mathematics Advanced
Student struggle areas: chain rule setup; choosing product vs quotient rule
Bloom state: apply -> analyse
```

The retrieval service should:

1. Generate an embedding for the retrieval query.
2. Search `vector_chunks` using cosine distance.
3. Add keyword/code filters when the request includes NESA codes such as `MA-C1` or `MA-C1.1`.
4. Return the top 6 to 8 chunks with `chunk_text`, `outcome_code`, `content_code`, and hierarchy metadata.
5. Convert results into the existing `SyllabusPacket` shape consumed by `artifact_engine.WorksheetRequest`.

Example retrieval SQL:

```sql
SELECT id, chunk_text, outcome_code, content_code, metadata_json,
       1 - (embedding <=> :query_embedding) AS similarity
FROM vector_chunks
WHERE (:course IS NULL OR course = :course)
  AND (:topic IS NULL OR topic ILIKE '%' || :topic || '%')
ORDER BY embedding <=> :query_embedding
LIMIT 8;
```

The prompt to Gemini should not say "use the syllabus generally." It should inject actual retrieved dot-points and codes:

```text
Use these NESA syllabus excerpts as hard constraints:
- MA-C1.1: ...
- MA-C2.3: ...

Generate questions for this student:
- Struggles: ...
- Bloom target: ...
```

## 4. Tutor Command Center (The UI)

Tutor-Only V1 should add a private dashboard surface, not a public student experience.

Routes:

- `/tutor`: command center home with active students, recent worksheets, and a primary "Generate Questions" action.
- `/tutor/students`: list manually created students with name, syllabus focus, current topics, and struggle summary.
- `/tutor/students/new`: lightweight profile creation form.
- `/tutor/students/:id`: student detail page showing context, struggle areas, Bloom state, generated worksheets, and quick actions.
- `/tutor/question-generator`: select student, syllabus topic, difficulty, number of questions, mode, and optional tutor instructions.
- `/canvas/:documentId`: existing Native Canvas worksheet editing view.

The Question Generator should produce two outputs. First, a preview of generated questions and the retrieved syllabus context used. Second, a "Create Worksheet" action that transforms the result into a Native Canvas document.

Backend flow:

1. `POST /tutor/question-generator/preview`
   - Input: `tutor_student_id`, selected topic/code, worksheet settings, optional instructions.
   - Load `tutor_students`.
   - Retrieve pgvector syllabus chunks.
   - Build a `SyllabusPacket`.
   - Return preview questions plus retrieval citations.

2. `POST /tutor/question-generator/create-worksheet`
   - Build or accept a `WorksheetRequest`.
   - Call the existing worksheet generation path.
   - Persist through Native Canvas as a `documents` row with `tutor_student_id`.
   - Return `document_id` and route the tutor into the canvas.

The current `canvas.py` endpoints require `X-Student-Id`. For v1, use a fixed internal owner id such as `tutor_local` for `documents.student_id` and attach the real student context via `documents.tutor_student_id`. That avoids changing every Canvas ownership query during the dogfooding sprint.

## 5. Implementation Sequence

Phase 1, days 1-2: Database schema and pgvector setup. Add Alembic migration for `CREATE EXTENSION vector`, `tutor_students`, `vector_documents`, `vector_chunks`, and `documents.tutor_student_id`. Verify migration locally and against Neon. Add SQLAlchemy models matching the migration. Keep existing auth tables untouched.

Phase 2, days 2-3: Tutor student CRUD. Add backend routes under `/tutor/students` for create, list, get, update, archive. Keep payloads close to the table shape. Do not add student login. Add focused tests for CRUD and document linking.

Phase 3, days 3-5: NESA syllabus ingestion. Build the ingestion script, adapt the existing syllabus-aware parsing, and support repeatable upserts by content hash. Start with the currently configured `data/Maths Advanced Syllabus.pdf`, then add other NESA files only if Darra needs them for live sessions this week.

Phase 4, days 5-8: RAG retrieval and Question Generator endpoint. Implement a pgvector retrieval service that returns chunks plus citation metadata. Build the `SyllabusPacket` adapter for `WorksheetRequest`. Add preview and create-worksheet endpoints. Ensure generated worksheets store `tutor_student_id`.

Phase 5, days 8-14: Simple frontend dashboard. Build student list, student detail, and Question Generator screens. Keep the design operational and dense. Surface retrieved syllabus citations so Darra can judge grounding quickly. Wire "Create Worksheet" directly into Native Canvas.

## 6. Out of Scope (Phase 2)

- No student authentication.
- No magic links.
- No JWT auth rollout.
- No student-facing chat interfaces.
- No parent emails, onboarding, dashboards, or summaries.
- No complex privacy scrubbers, since the tutor is the only user entering data in v1.
- No multi-tutor tenancy model.
- No payments, subscriptions, or school admin workflows.
- No broad redesign of Native Canvas.

## 7. Critical Architectural Decisions

**Embedding model:** Use `gemini-embedding-001` with a configured 768-dimensional output for v1. MAIT already uses Gemini for generation, so this keeps provider integration simple, avoids reintroducing OpenAI into the workflow Darra is trying to replace, and can support Australian-region deployment options. Local sentence-transformers are attractive for sovereignty and are already present in the FAISS code, but they add server/runtime weight and weaker retrieval quality. `text-embedding-3-small` is cheap and good, but it is US-hosted and strategically less aligned with the Gemini-based stack.

**Chunking strategy:** Preserve NESA hierarchy: Subject -> Course -> Module -> Topic -> Outcome -> Content. Chunk primarily at outcome/content-code boundaries. Target 500 to 700 tokens per chunk with 80 to 120 tokens overlap only when a content section must split. Attach metadata for `subject`, `course`, `module`, `topic`, `outcome_code`, `content_code`, `page_start`, `page_end`, `source_name`, `version_label`, and `hierarchy_path`. The chunk text should include the heading path so embeddings capture curriculum context.

**Retrieval approach:** Use hybrid retrieval for v1: pgvector similarity plus lightweight keyword/code filters. Pure vector search can miss exact NESA codes; graph retrieval is unnecessary for a 1-2 week sprint. The Phase 2 path is to add prerequisite relationships between outcomes and use graph expansion after the initial vector search.

**Re-ranking:** Defer LLM re-ranking for v1. It adds latency and another moving part during live tutoring. Instead, retrieve top 8, filter by similarity threshold, boost exact code/topic matches, and show citations in the UI. Add LLM re-ranking later if Darra sees plausible but weak syllabus matches.

## 8. Open Questions

- The existing `documents.student_id` is a string used by Native Canvas authorization. Is the fixed `tutor_local` owner id acceptable for dogfooding, or should the new `tutor_students.id` become the value stored in `documents.student_id`?
- The current RAG source config points at `data/Maths Advanced Syllabus.pdf`. Which NESA files are mandatory for this week's tutoring sessions: Advanced only, Extension 1, Extension 2, or Years 7-10 as well?
- The current Gemini integration defaults to `gemini-3.1-flash-lite-preview`. Should the Question Generator use the same model for speed/cost, or should worksheet generation switch to a higher-quality model for harder senior maths?
- The frontend routing and state structure were not inspected for this document. The UI route names above may need adjustment to fit the existing app router.

## 9. Validation Criteria

Tutor-Only V1 is working when these criteria are true:

- Darra has migrated his current active tutoring students into `tutor_students` with syllabus focus, current topics, struggle areas, and Bloom state.
- Darra has used the Question Generator in at least five real tutoring sessions.
- Retrieved syllabus context subjectively feels grounded in NESA dot-points rather than generic LLM mathematics output.
- Generated worksheets visibly incorporate per-student context, especially struggle areas and Bloom target.
- At least 80 percent of generated worksheets require only light tutor editing before use.
- The previous Custom Gem/OpenAI workflow is officially deprecated for Darra's live tutoring preparation.

Once these criteria are met, MAIT can move to Phase 2 planning for student authentication, parent communication, stronger privacy controls, and multi-user product hardening.
