# ANTIGRAVITY DIRECTIVE: CANON VERIFICATION & DOCUMENTATION SYNC
**Agent:** Gemini 3.1 Pro or 3.5 Flash in Antigravity
**Branch:** `feature/pgvector-rag` (confirm this is the current working branch first)
**Mode:** READ-ONLY AUDIT FIRST. Then a single, surgical documentation commit. NO application code changes.

## YOUR AUTHORITY (read carefully)
The new `MAIT_ARCHITECTURE_CANON.md` (provided alongside this directive — place it at repo root) has two layers:
- **DECISION layer:** rulings made by Darra. You have ZERO authority here. If the repo contradicts a ruling, you report the contradiction — you do not "fix" the doc to match the code, and you do not fix the code.
- **REALITY layer:** items marked `[VERIFY-1]`..`[VERIFY-7]` plus file paths, column names, and counts. Here you verify against the actual repo/DB and patch the doc to match reality.

If you believe a DECISION is wrong, write it in the report under "Contested decisions" with your reasoning. Do not act on it.

## TASK 1 — Resolve every [VERIFY] marker
1. `[VERIFY-1]` Sentry: is the SDK still initialised in `app/main.py`? Note DSN env var name.
2. `[VERIFY-2]` FAISS legacy: grep for `faiss`, `sentence_transformers`, `MiniLM`. List any live import paths (dead files are fine; live imports are flagged).
3. `[VERIFY-3]` KaTeX delimiter regex: which frontend file converts `\(`/`\)` → `$`?
4. `[VERIFY-4]` Corpus counts: run read-only SQL against Neon DEV — total chunks, per-subject counts, `SELECT DISTINCT subject`, and 5 sample `metadata_json->>'topic'` values per subject. Confirm 276 total and the five exact subject strings.
5. `[VERIFY-5]` Chat-intent retrieval: read the generate route — when intent is `chat` / no topic selected, what filter actually runs? Document the as-built behaviour.
6. `[VERIFY-6]` Pydantic contract: confirm `ExoskeletonResponse` location and exact field names/enums (type, tier, question_latex, teacher_answer_latex, marks).
7. `[VERIFY-7]` Schema truth: list actual tables in Neon DEV, the current Alembic head(s) (flag immediately if more than one head), and the actual columns on `tutors`, `tutor_classes`, `chat_threads`, `messages`, `documents`, `vector_chunks`. Confirm the mock tutor row exists.

## TASK 2 — Repo documentation sync
1. Place the new `MAIT_ARCHITECTURE_CANON.md` at repo root with all [VERIFY] markers resolved (replace marker text with verified fact; keep a one-line `<!-- verified DD/MM/YYYY against <commit> -->` comment).
2. Mark superseded docs: prepend a banner to any older architecture docs in the repo (e.g. previous `MAIT_ARCHITECTURE_CANON.md`, `MAIT_Locked_Architecture.md` if present): `> ⚠️ SUPERSEDED 12/06/2026 by /MAIT_ARCHITECTURE_CANON.md — do not build against this document.` Do not delete them.
3. Generate `docs/REPO_STATE.md` — a concise as-built map: directory tree (2 levels, no node_modules), every API route with method + path + one-line purpose, every DB table with one-line purpose, env vars consumed (names only, NEVER values), and how to run locally (backend, frontend, migrations) as actually configured.

## TASK 3 — Verification probes (read-only)
Run and record in the report:
1. One known-answer retrieval probe per subject (5 total): embed a topic-appropriate query with `models/gemini-embedding-2` @ 768, run the locked retrieval SQL (subject + exact topic filter), confirm top result is the expected topic. Record similarity scores.
2. Topic dropdown probe: the DISTINCT-topic query per subject; confirm no `MAO-WM-01`, no empty strings, no obvious duplicates.
3. Negative probe: confirm a query for an absent course (e.g. subject = 'Mathematics Extension 1') returns zero rows, not garbage.

## OUTPUT (the report)
Single Markdown report committed as `docs/AUDIT_2026-06-12.md` and pasted back to Darra, with sections:
1. **VERIFY resolutions** (1–7, each: finding + what you patched in the canon)
2. **Probe results** (scores, pass/fail)
3. **Contradictions found** (repo vs DECISION layer — report only)
4. **Contested decisions** (your reasoning, no action taken)
5. **Multi-head or migration anomalies** (if any: STOP-flag, do not attempt repair)
6. **Files changed** (should be: canon doc, superseded banners, REPO_STATE.md, this report — nothing else)

## HARD CONSTRAINTS
- No application code edits. No migrations. No DB writes (read-only SQL only).
- No re-embedding, no ingestion, no changes to `vector_chunks` rows.
- If anything requires a decision, log it in the report for Darra — never infer a ruling.
- Australian English in all docs.
