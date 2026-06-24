# MAIT — Repository State (As Built)

**Generated:** 12/06/2026 by read-only audit against branch `feature/pgvector-rag` (commit `d07a042`).
**Companion docs:** `/MAIT_ARCHITECTURE_CANON.md` (decisions + verified reality), `/docs/AUDIT_2026-06-12.md` (audit findings).

---

## 1. Directory Map (2 levels, working code only)

```
/  (repo root — also contains legacy assets, vision PDFs, old plans, "Kimi redesign/" snapshot)
├── MAIT_ARCHITECTURE_CANON.md      ← single source of truth
├── docs/                            ← repo-level docs (this file, audit reports)
├── Syllabi/                         ← raw NESA source documents (.pdf/.docx)
└── mait-mvp/                        ← THE APPLICATION
    ├── backend/
    │   ├── alembic/                 ← migrations (3 revisions, single head 928e2e58469d)
    │   ├── alembic.ini              ← script_location = alembic (run from backend/)
    │   ├── app/                     ← FastAPI application package
    │   │   ├── main.py              ← app factory, Sentry init, router registration
    │   │   ├── deps.py              ← auth deps (get_current_tutor local bypass), rate limiter
    │   │   ├── models.py            ← Pydantic schemas (incl. ExoskeletonResponse contract)
    │   │   ├── db/                  ← SQLAlchemy: models.py (legacy+canvas), tutor_models.py, session.py
    │   │   ├── routers/             ← auth, chat, canvas, worksheet, analytics, misc, questions
    │   │   └── services/            ← prompts.py, gemini_client.py, rag/ (legacy FAISS), etc.
    │   ├── scripts/                 ← ingest_to_pgvector.py, generate_json.py, normalize_db.py,
    │   │                              verify_pgvector.py, ingest_syllabus.py, sqlite_to_postgres_migration.py
    │   ├── tests/
    │   └── requirements.txt
    ├── corpus/
    │   └── syllabus.json            ← ⚠️ EMPTY `{}` placeholder (durable corpus JSON not committed)
    ├── docs/                        ← app-level docs + audits/ (April audit banner-marked superseded)
    └── frontend/
        ├── src/
        │   ├── App.jsx              ← React Router v6 route table
        │   ├── features/exoskeleton/ ← Workspace.jsx, CadenceRenderer.jsx, StartupWizard.jsx
        │   ├── features/slm/         ← legacy in-browser SLM chat surface
        │   ├── stores/               ← Zustand (useExoskeletonStore.js, canvasStore.ts, …)
        │   ├── components/           ← ui/ (Shadcn ×53), canvas/, worksheet/
        │   └── pages/, sections/, services/, hooks/, lib/, utils/
        └── vite.config.js            ← dev proxy → localhost:8000
```

---

## 2. API Routes (method · path · purpose)

### Tutor Exoskeleton (active sprint surface) — `app/routers/chat.py`
| Method | Path | Purpose |
|---|---|---|
| POST | `/api/classes/init` | Create cohort (TutorClass) + its first ChatThread; seeds local dev tutor idempotently |
| GET | `/api/classes` | List cohorts for current tutor |
| DELETE | `/api/classes/{class_id}` | Delete cohort; bulk-deletes its threads first (messages cascade at DB level) |
| GET | `/api/threads/{class_id}` | List threads + fully serialised message history for a cohort |
| GET | `/api/topics?subject=` | Topic dropdown feed: `SELECT DISTINCT metadata_json->>'topic' … WHERE subject = :subject` |
| POST | `/api/chat/generate` | THE generation route: pgvector retrieval (subject + exact topic, LIMIT 3) → Gemini 3.5 Flash structured output (`ExoskeletonResponse`) → persists user+assistant messages with citations |

### Legacy student surface (FAISS-era; still registered) — `app/routers/chat.py`
| Method | Path | Purpose |
|---|---|---|
| GET | `/context/{student_id}` | Fetch/create legacy StudentContext |
| POST | `/interact` | Legacy tutoring interaction (wellness/fatigue engine + FAISS RAG) |
| POST | `/query` | Legacy chunked chat response (FAISS RAG + Gemini) |
| POST | `/reset/{student_id}` | Clear legacy context + history |
| GET | `/history/{student_id}` | Legacy conversation history |

### Auth — `app/routers/auth.py` (prefix `/auth`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/verify-access` | Access-code gate (`MAIT_ACCESS_CODE`) |
| POST | `/auth/google` | Google ID-token sign-in (legacy student auth) |
| POST | `/auth/migrate` | Migrate anonymous → Google identity |
| GET | `/auth/me/{student_id}` | Fetch user record |

### Native Canvas — `app/routers/canvas.py` (prefix `/canvas`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/canvas/generate` | Generate worksheet document (LaTeX) into canvas |
| GET | `/canvas/documents` | List documents for owner |
| GET | `/canvas/documents/{doc_id}` | Fetch document + elements |
| POST | `/canvas/documents/{doc_id}/elements` | Insert element |
| PUT | `/canvas/elements/{elem_id}` | Update element |
| DELETE | `/canvas/elements/{elem_id}` | Delete element |
| DELETE | `/canvas/documents/{doc_id}` | Delete document |
| POST | `/canvas/compile` | Compile LaTeX → PDF (`pdflatex --no-shell-escape`) |
| POST | `/canvas/elements/{elem_id}/revise` | AI revision of an element |
| POST | `/canvas/revisions/{rev_id}/apply` | Apply a proposed revision |
| POST | `/canvas/revisions/{rev_id}/reject` | Reject a proposed revision |
| GET | `/canvas/documents/{doc_id}/revisions` | List revisions |
| POST | `/canvas/documents/{doc_id}/vision-parse` | Parse uploaded image into canvas content |

### Worksheet (legacy Gem-style) — `app/routers/worksheet.py`
| Method | Path | Purpose |
|---|---|---|
| POST | `/generate-worksheet` | One-shot worksheet generation |
| GET | `/worksheet-topics` | Topic list for worksheet UI |

### Questions — `app/routers/questions.py` (prefix `/questions`)
| Method | Path | Purpose |
|---|---|---|
| POST | `/questions/generate` | Generate question set |
| POST | `/questions/regenerate` | Regenerate a question |

### Analytics — `app/routers/analytics.py`
| Method | Path | Purpose |
|---|---|---|
| POST | `/keystroke-metrics` | Ingest keystroke psychometrics batch |
| GET | `/keystroke-profile/{student_id}` | Fetch derived typing profile |
| DELETE | `/keystroke-profile/{student_id}` | Delete typing profile |
| POST | `/visit` | Increment visit counter |
| GET | `/visits` | Read visit counter |

### Misc — `app/routers/misc.py`
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Health/root |
| POST | `/api/feedback` | Feedback submission (Resend email) |
| POST | `/subscribe` | Waitlist email capture |

---

## 3. Database Tables (Neon Postgres, pgvector)

| Table | Purpose |
|---|---|
| `tutors` | Tutor identities; mock dev tutor `00000000-…-000000000000` seeded in-migration |
| `tutor_classes` | Cohorts: name, `year_level` (int), `subject`, `ability_tier`, `profile_metadata` JSONB |
| `chat_threads` | Per-cohort conversation containers (teacher sprint; Tutor V1 ruling replaces with `sessions`) |
| `messages` | Thread turns; `role`, `content` (JSON payload as text), `retrieval_citations` JSONB |
| `vector_chunks` | LOCKED corpus: `content`, `embedding vector(768)` (HNSW cosine), `content_code` (B-tree), `subject`+`year_level` (composite B-tree), `metadata_json` JSONB |
| `documents` | Canvas artifacts; legacy `student_id` (String) + nullable `tutor_id`/`class_id`/`thread_id` FKs |
| `document_elements` | Canvas fragments; LexoRank `sort_key`, `content_latex` |
| `document_revisions` | AI-revision proposals per document/element |
| `artifact_builds` | LaTeX→PDF build records |
| `users` | Legacy student Google-auth accounts |
| `student_contexts` | Legacy per-student pedagogical state (`context_json`) |
| `conversation_history` | Legacy student chat log |
| `waitlist_emails` | Marketing waitlist capture |
| `visit_counter` | Site visit counter |

**Alembic:** 3 revisions, linear, single head `928e2e58469d` (see audit §5).

---

## 4. Environment Variables Consumed (names only)

**Backend** (`os.getenv` / `os.environ`):
`DATABASE_URL` · `GEMINI_API_KEY` · `GEMINI_MODEL` · `CORS_ORIGINS` · `GOOGLE_CLIENT_ID` · `MAIT_ACCESS_CODE` · `RESEND_API_KEY` · `SENTRY_DSN`

**Frontend** (`import.meta.env`):
`VITE_GOOGLE_CLIENT_ID` (plus built-in `DEV` flag gating offline mocks)

`.env` is git-ignored; `backend/.env.example` documents the expected set.

---

## 5. Running Locally (as actually configured)

**Backend** (from `mait-mvp/backend/`, requires `.env` with `DATABASE_URL` + `GEMINI_API_KEY`):
```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Port 8000 is what the frontend dev proxy expects. `DATABASE_URL` must be the Neon DEV branch (asyncpg; `sslmode=` is auto-rewritten to `ssl=` in `app/db/session.py`).

**Migrations** (from `mait-mvp/backend/`):
```bash
alembic upgrade head        # single head: 928e2e58469d
alembic heads               # must show exactly one head — if two appear, STOP and flag
```

**Frontend** (from `mait-mvp/frontend/`):
```bash
npm install
npm run dev                 # Vite on :5173, proxies /api, /auth, /canvas, /query, etc. → :8000
```
Tests: `npm test` (Vitest) · backend `pytest` from `mait-mvp/backend/`.

**Exoskeleton dev note:** with the backend down, the Workspace falls back to local offline mock responses in `import.meta.env.DEV` only — mocks emit `title`/`items` fields the live contract does not (see audit §1, VERIFY-6).
