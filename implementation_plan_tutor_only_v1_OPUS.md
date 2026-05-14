# Implementation Plan — Tutor-Only V1 (Dogfooding Phase)

**Status:** Canonical spec for the 7–14 day single-user sprint.
**Owner:** Darra (founder, sole user).
**Branch:** `docs/tutor-only-v1-plan` → merges to `main` once approved.

---

## 1. Strategic Context

We are deliberately delaying the full multi-tenant rollout (Tutor + Student + Parent auth, magic links, JWT, privacy scrubbing, parent emails) and instead shipping a **single-user Tutor Command Center** that the founder uses live this week.

**Three reasons to dogfood first:**

1. **Replace OpenAI Custom Gems immediately.** Darra currently runs live sessions through ChatGPT Custom Gems with a hand-tuned "Universal Worksheet Generator" prompt. Each session pays GPT pricing for output the platform should produce itself. Migrating those Gems into MAIT's Canvas + Gemini stack produces ROI from day one.
2. **Validate the NESA RAG pipeline on real syllabus content.** The existing RAG (`mait-mvp/backend/app/services/rag/`) runs FAISS + `all-MiniLM-L6-v2` against a single PDF. Before any student sees a generated question, we need empirical evidence that retrieval surfaces the correct NESA dot-points. The tutor — who knows the syllabus cold — is the only person qualified to judge retrieval quality, and only in real sessions.
3. **Skip auth friction.** Student auth, COPPA-safe parent flows, and magic-link rotation are weeks of work that produce zero value while we don't yet know if the core artifact (NESA-grounded worksheets) is good enough to justify a multi-user product. Build the engine first; gate it later.

Phase 2 starts the day Darra signs off on the Validation Criteria in §9.

---

## 2. Data Model (Tutor-Only Schema)

All new tables live in Neon Postgres alongside the existing schema (`mait-mvp/backend/app/db/models.py`). No existing tables are dropped; we add and softly link.

### 2.1 `tutor_students`

Manual profiles created by the tutor. These replace the Google-OAuth `users` row as the addressable "student" for V1.

```sql
CREATE TABLE tutor_students (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id       TEXT NOT NULL UNIQUE,            -- short slug for URLs
    name            TEXT NOT NULL,
    year_level      TEXT,                            -- e.g. "Year 11"
    syllabus_focus  TEXT NOT NULL,                   -- e.g. "Maths Advanced", "MEX1"
    current_topics  TEXT[] NOT NULL DEFAULT '{}',    -- e.g. {"MA-C1.1","MA-T1"}
    struggle_areas  TEXT[] NOT NULL DEFAULT '{}',    -- free-form: "factor theorem", "unit circle"
    bloom_state     JSONB NOT NULL DEFAULT '{}'::jsonb,
                    -- {"current_level":"Apply","history":[{"topic":"MA-C1.1","level":"Understand","ts":"..."}]}
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tutor_students_public_id ON tutor_students(public_id);
```

`bloom_state` mirrors the shape already produced by `blooms_engine.advance_bloom_level()` so we can reuse that code path verbatim.

### 2.2 `vector_documents` (RAG source registry)

One row per ingested syllabus PDF.

```sql
CREATE TABLE vector_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_path     TEXT NOT NULL UNIQUE,            -- e.g. "Syllabi/Maths Advanced Syllabus.pdf"
    syllabus_code   TEXT NOT NULL,                   -- "MA","MEX1","MEX2","M7-10"
    title           TEXT NOT NULL,
    sha256          TEXT NOT NULL,                   -- so we re-ingest on change
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    chunk_count     INTEGER NOT NULL DEFAULT 0
);
```

### 2.3 `vector_chunks` (pgvector embeddings)

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE vector_chunks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id     UUID NOT NULL REFERENCES vector_documents(id) ON DELETE CASCADE,
    chunk_text      TEXT NOT NULL,
    embedding       VECTOR(1536),                    -- text-embedding-3-small dim
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
                    -- {"subject":"Maths Advanced","module":"Calculus",
                    --  "topic":"Introduction to Differentiation",
                    --  "outcome":"MA11-5","content_code":"MA-C1.1",
                    --  "stage":"6","page":42}
    chunk_index     INTEGER NOT NULL,
    token_count     INTEGER NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- HNSW index for cosine similarity; IVFFlat is the cheaper fallback.
CREATE INDEX idx_chunks_embedding
    ON vector_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- B-tree on content_code so hybrid retrieval (§3.3) can filter cheaply.
CREATE INDEX idx_chunks_content_code
    ON vector_chunks ((metadata->>'content_code'));
```

### 2.4 Linking the existing Canvas to a tutor student

The existing `documents` table (`models.py:89`) already keys by `student_id: String`. We do **not** change its type — we change its semantic. Going forward:

```sql
ALTER TABLE documents ADD COLUMN tutor_student_id UUID
    REFERENCES tutor_students(id) ON DELETE SET NULL;

CREATE INDEX idx_documents_tutor_student_id ON documents(tutor_student_id);
```

`student_id` (TEXT) remains for the legacy Google-auth path; `tutor_student_id` is the new FK used by Tutor-Only V1. Worksheets generated through the Question Generator (§4.3) populate both fields, with `student_id` set to the tutor's own ID (the only logged-in user).

---

## 3. The pgvector RAG Pipeline

We are migrating off FAISS (`mait-mvp/backend/app/services/rag/vector_store.py`) onto pgvector in Neon. FAISS lives on disk and won't scale across deploys; pgvector keeps the embeddings co-located with the rest of the schema and survives container restarts.

### 3.1 Enabling pgvector in Neon

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Run once per database; ship via Alembic migration `0xxx_enable_pgvector.py` immediately before the `vector_chunks` migration so the column type resolves.

### 3.2 Ingestion script (`scripts/ingest_nesa_syllabus.py`)

A standalone Python entrypoint that walks `Syllabi/*.pdf`, extracts hierarchy-aware chunks, embeds them, and inserts into `vector_chunks`.

```python
# scripts/ingest_nesa_syllabus.py (sketch)
def ingest(pdf_path: Path, syllabus_code: str) -> None:
    raw_pages = extract_pages(pdf_path)                  # pdfplumber
    sections = parse_nesa_hierarchy(raw_pages)           # see §7 chunking
    chunks = list(chunk_sections(sections,
                                 target_tokens=400,
                                 overlap_tokens=60))
    embeddings = openai.embeddings.create(
        model="text-embedding-3-small",
        input=[c.text for c in chunks],
    ).data
    upsert_document_and_chunks(pdf_path, syllabus_code,
                               chunks, embeddings)
```

`parse_nesa_hierarchy` is the crucial bit: NESA PDFs follow a deterministic structure (Subject → Stage → Module → Topic → Outcome → Content). We use page-level heading regex to attach `module`, `topic`, `outcome`, and `content_code` to every chunk's `metadata` JSONB **before** embedding. This is what makes hybrid retrieval (§3.3) cheap.

### 3.3 Retrieval logic

The Question Generator endpoint (§4.3) calls a new `RAGRetriever.retrieve_for_topic()`:

```python
async def retrieve_for_topic(
    db: AsyncSession,
    syllabus_focus: str,          # "Maths Advanced"
    topic: str,                   # "Differentiation"
    struggle_areas: list[str],    # ["chain rule", "implicit"]
    top_k: int = 8,
) -> list[Chunk]:
    query = f"{topic}. Student struggles: {', '.join(struggle_areas)}"
    q_embedding = embed(query)

    # Hybrid: vector similarity scoped by syllabus, with content-code boost
    sql = text("""
        SELECT vc.*, 1 - (vc.embedding <=> :q_emb) AS score
        FROM vector_chunks vc
        JOIN vector_documents vd ON vd.id = vc.document_id
        WHERE vd.syllabus_code = :syllabus
        ORDER BY vc.embedding <=> :q_emb
        LIMIT :k
    """)
    return await db.execute(sql, {"q_emb": q_embedding,
                                  "syllabus": syllabus_code_for(syllabus_focus),
                                  "k": top_k})
```

The returned chunks are then **literally injected into the Gemini system prompt** as a fenced block, e.g.:

```
<NESA_SYLLABUS_CONTEXT>
[MA-C1.1, Outcome MA11-5] establish the derivative function...
[MA-C1.2] differentiate a range of functions...
</NESA_SYLLABUS_CONTEXT>
```

This is the same envelope shape `educational_agent.generate_response_async` already passes via `syllabus_context` (`educational_agent.py:34-38, 56-62`), so the existing `gemini_client.get_gemini_response()` signature does not change.

---

## 4. Tutor Command Center (The UI)

A new `/tutor` route in the existing Next.js frontend. Gated only by the founder's own Google login (the existing `User` row in `users` table).

### 4.1 Student list (`/tutor`)

- Table view: name, year level, syllabus focus, last session, current Bloom level.
- "+ New Student" opens a modal form that POSTs to `/api/tutor/students`.
- Inline edit for `current_topics` and `struggle_areas` (chips, comma-separated entry).

### 4.2 Student detail (`/tutor/students/[id]`)

- Header: name, year, syllabus.
- Three panels: **Current Topics**, **Struggle Areas**, **Bloom State** (read-only summary of `bloom_state.history`).
- "Recent Worksheets" list (joins `documents` on `tutor_student_id`) with deep links into the Canvas.
- "Generate Questions" button → §4.3.

### 4.3 Question Generator (`/tutor/students/[id]/generate`)

The dogfooding centrepiece.

1. Tutor lands with student context pre-loaded.
2. Selects a **syllabus topic** from a dropdown (driven by `vector_documents` metadata).
3. Picks **question count** (3 / 5 / 10) and **target Bloom level**.
4. Clicks **Generate**.

Backend handler `POST /api/tutor/students/{id}/generate`:

1. Loads `tutor_students` row → reads `struggle_areas`, `bloom_state`.
2. Calls `RAGRetriever.retrieve_for_topic(...)` (§3.3).
3. Passes retrieved chunks + student context into Gemini via the existing `generate_worksheet_latex()` path (`canvas.py:69`).
4. Persists output as a `documents` row with `tutor_student_id` set.
5. Returns `{document_id}` so the frontend can redirect into the Native Canvas at `/canvas/{document_id}`.

The result is that the Generator and the Canvas are **the same artifact pipeline** — generated questions are immediately editable, re-orderable, and PDF-exportable using the existing canvas routes (`canvas.py:132-211`).

---

## 5. Implementation Sequence (7–14 day sprint)

Each phase is independently shippable; the tutor can start dogfooding after Phase 4 even if Phase 5 is incomplete (using curl / Postman against the API).

### Phase 1 — Schema + pgvector (Days 1–2)

- [ ] Alembic migration: `CREATE EXTENSION vector`.
- [ ] Alembic migration: `tutor_students`, `vector_documents`, `vector_chunks` (with HNSW index).
- [ ] Alembic migration: `ALTER TABLE documents ADD COLUMN tutor_student_id`.
- [ ] Add SQLAlchemy models in `mait-mvp/backend/app/db/models.py` (alongside existing `Document`, `User`).
- [ ] Smoke test: run migrations against a Neon dev branch, verify `\d vector_chunks` shows the HNSW index.

### Phase 2 — `tutor_students` CRUD (Day 3)

- [ ] New router `mait-mvp/backend/app/routers/tutor_students.py` with `GET /tutor/students`, `POST /tutor/students`, `GET /tutor/students/{id}`, `PATCH /tutor/students/{id}`, `DELETE /tutor/students/{id}`.
- [ ] Auth gate: reuse `get_current_student_id` — only Darra's `student_id` is allowed; everyone else 403s. (Cheap allowlist via env var `TUTOR_USER_IDS` for V1.)
- [ ] Pydantic schemas in same file; serializers mirror `db/serializers.py`.

### Phase 3 — NESA ingestion (Days 3–5, parallel with Phase 2)

- [ ] `scripts/ingest_nesa_syllabus.py` per §3.2.
- [ ] Hierarchy parser unit-tested on `Maths Advanced Syllabus.pdf` (the file already wired into `rag/config.py:SYLLABUS_SOURCES`).
- [ ] Ingest all six core PDFs in `Syllabi/`: Maths Advanced, Ext 1, Ext 2, K-10, Year 11 Standard, Year 7-8.
- [ ] Verify count: expect ~600–1200 chunks total at 400-token target size.
- [ ] Store cost log (USD spent on embeddings) in commit message — budget cap is $5.

### Phase 4 — RAG retrieval + Question Generator endpoint (Days 5–7)

- [ ] New service `mait-mvp/backend/app/services/rag/pgvector_retriever.py` (sits next to existing `retrieval_service.py`; we do not delete FAISS until V1 is validated).
- [ ] Wire `POST /api/tutor/students/{id}/generate` per §4.3.
- [ ] Re-use `generate_worksheet_latex()` from `artifact_engine` — only inject the new `syllabus_context` string built from RAG chunks.
- [ ] Manual test: hit the endpoint with curl for one real student profile, eyeball the generated LaTeX, confirm NESA codes appear in the output.

### Phase 5 — Frontend dashboard (Days 7–10)

- [ ] `/tutor` student list page (data fetched via existing fetch wrapper).
- [ ] `/tutor/students/[id]` detail page.
- [ ] `/tutor/students/[id]/generate` form → redirects to `/canvas/[document_id]` on success.
- [ ] Zero new design system work — reuse existing canvas chrome.

### Buffer — Days 11–14

Live sessions. Bugs and prompt-quality issues fixed same-day. No new features.

---

## 6. Out of Scope (Phase 2)

Anything below that creeps in is a bug in the plan.

- Student auth, magic links, JWT, refresh-token rotation.
- Student-facing chat, dashboards, profile pages.
- Parent emails, onboarding, consent flow, COPPA age gates.
- Privacy scrubbers / PII redaction (tutor is the only data-entry actor).
- Multi-tutor support — a hard-coded allowlist is fine for V1.
- Stripe / billing.
- FAISS deletion — keep it running in parallel until pgvector is validated.
- Re-ranker, query rewriting, multi-step retrieval (see §7).
- Mobile-responsive polish on `/tutor/*` — desktop only.

---

## 7. Critical Architectural Decisions

### 7.1 Embedding model → **OpenAI `text-embedding-3-small`**

| Option | Cost | Quality | Sovereignty | Verdict |
|---|---|---|---|---|
| `text-embedding-3-small` (OpenAI) | $0.02 / 1M tokens | High; strong on technical English | US-hosted | ✅ Pick |
| `gemini-embedding-001` (Google) | Free tier | Comparable | AU region available | Defer to Phase 2 |
| `sentence-transformers all-MiniLM-L6-v2` (local) | $0 | Lower; current FAISS baseline | Sovereign | Already in use, will keep as fallback |

**Justification:** Full NESA corpus is ~2M tokens; re-ingestion costs ~$0.04. Quality materially beats MiniLM-L6 (current FAISS embedder) on hierarchical technical prose. Sovereignty matters for student PII — but in V1, **no student PII is ever embedded**; only public NESA text. Cost and quality win.

### 7.2 Chunking strategy → **Hierarchical, 400-token target, 60-token overlap**

- **Hierarchy** (Subject → Module → Topic → Outcome → Content) is captured in `metadata` JSONB, not in chunk text.
- **Size:** 400 tokens. Larger (500–800) is wasteful — NESA "Content" entries are short dot-points; smaller than 200 fragments them.
- **Overlap:** 60 tokens (~15%) to catch sentences spanning a boundary.
- **Metadata fields:** `subject`, `stage`, `module`, `topic`, `outcome` (e.g. `MA11-5`), `content_code` (e.g. `MA-C1.1`), `page`, `source_pdf`.
- **Anti-pattern:** do not duplicate parent-topic text into every child chunk — the embedding loses specificity. Filter on metadata at query time instead.

### 7.3 Retrieval approach → **Hybrid (vector + content-code keyword), v1**

Cosine similarity works fine for free-form topics ("differentiation"), but NESA's grammar is built on **codes** (`MA-C1.1`, `MA11-5`). When the tutor picks a topic with a known code, an exact-match on `metadata->>'content_code'` is dramatically more precise than vector alone. The B-tree index in §2.3 makes the hybrid query trivially cheap.

**Phase 2 path:** prerequisite-graph layer (`requires`, `prerequisite_for`) over chunk metadata, so a student struggling on `MA-C1.2` auto-pulls `MA-C1.1` foundations. Out of scope.

### 7.4 Re-ranking → **Defer**

A cross-encoder (e.g. `bge-reranker-base`) over top-K hits improves quality, but at this scale (~10 generations/day) the latency cost is real and the lift is marginal because hybrid retrieval (§7.3) already constrains candidates with the code filter. Revisit only if §9 criterion 3 fails.

---

## 8. Open Questions

Decisions I cannot make confidently from the codebase alone.

1. **`tutor_students` ↔ `student_contexts` overlap.** The existing `student_contexts` table (`models.py:16`) already encodes Bloom level, current topic, and fatigue in a `context_json` JSONB blob. Should `tutor_students.bloom_state` replace that, or should `tutor_students` reference `student_contexts.student_id` and let the JSONB remain source of truth? Consolidating is cleaner; risks breaking the chat path mid-sprint.
2. **Gemini model for question generation.** Chat runs `gemini-3.1-flash-lite-preview` (`gemini_client.py:12`). For worksheet generation, is Flash-Lite sufficient or do we need `gemini-3.1-pro-preview`? Pro is ~10× the cost but better on multi-step LaTeX math. Default to Flash-Lite and override via `GEMINI_MODEL` env — but I'd like a cost ceiling from the founder.
3. **Canvas `student_id` semantics.** `documents.student_id: String` currently maps to Google-OAuth `users.student_id`. If a generated worksheet's `tutor_student_id` points to a `tutor_students` row, should the legacy `student_id` be the tutor's own ID or NULL? The Canvas auth gate (`canvas.py:64-66`) compares `student_id` to the authenticated user — easiest is to set it to the tutor's ID.
4. **FAISS deprecation timing.** Plan keeps FAISS alive throughout V1. When do we delete `rag/vector_store.py`? Instinct: only after the chat path (`educational_agent.py:34`) also calls pgvector — Phase 2 task.

---

## 9. Validation Criteria

V1 is **done** when all five are true. These are the gates for moving to Phase 2 planning.

1. **Real-student migration.** Darra has created `tutor_students` rows for ≥ 5 of his current paying students with populated `syllabus_focus`, `current_topics`, and `struggle_areas`.
2. **Live session usage.** The Question Generator has been used in ≥ 3 real tutoring sessions, with the generated worksheet shown to the student during the lesson (not as post-prep).
3. **Subjective RAG groundedness.** In a sample of 10 generations, ≥ 8 contain at least one NESA content code (`MA-X.Y`) that Darra confirms is the correct dot-point for the topic. This is a subjective rubric scored by the founder.
4. **Per-student context shows up in the worksheet.** For 5 worksheets generated for students with non-empty `struggle_areas`, at least 3 of them visibly target the struggle area (e.g. a "chain rule" struggle yields a worksheet with chain-rule questions, not generic differentiation).
5. **Custom Gem retirement.** Darra publicly (in the team channel) declares the OpenAI Custom Gem workflow deprecated for his use and runs ≥ 1 full tutoring week on MAIT alone.

When all five fire, we open Phase 2 planning (multi-tenant auth, student chat, parent onboarding).
