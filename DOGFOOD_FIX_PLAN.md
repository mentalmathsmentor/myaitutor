# DOGFOOD FIX PLAN v2 — Executing SOL_TRIAGE Part A + C (W1–W17)

**Date:** 2026-07-21 | **Author:** Claude Fable 5 (Chairman) | **Status:** PENDING DARRA APPROVAL — no code changes until ratified.
**Provenance:** v1 reviewed adversarially by GPT-5.6 Sol (`.cx_sol_plan_check.txt`); all 14 review findings triaged, 13 accepted and folded in below (v2 changes marked ⟲), 1 narrowed (Cerberus idempotency — solved with a per-question counted column rather than a verification-evidence table). Sol also conceded 3 of its round-1 dismissed claims, rebutted 3 (accepted — see SOL_TRIAGE.md Round 2), and confirmed both Chairman additions C1/C2.
**Branch:** `claude/mait-dogfood-v1-audit-64j8dk` (PR #68).
**Execution model:** one sequential migration lane, then **three parallel Sonnet lanes with disjoint file sets**. Cross-lane contracts pinned in §5; lanes code against the contract, never each other's files. Any lane needing a file outside its list STOPS and reports.

**Standing guardrails (all lanes):** brownfield — flag off, never delete; no `vector_chunks` changes; no prompt-pedagogy rewrites; tutor-facing full worked answers untouched; Alembic single-head discipline; Australian English in user-facing copy.

---

## 0. Lane 0 — Migration + models (FIRST, blocks lanes 1–2)

**Files (exclusive):** new `alembic/versions/2026072x_xxx_dogfood_week1_integrity.py` (revision off `c7d2e4a91b03`), ⟲ `db/tutor_models.py` (mirror every change in `__table_args__`/columns).

1. ⟲ **Preflight repair (data, non-destructive):** for any student with >1 open session (`status != 'completed'`), keep the newest open, `UPDATE` older ones to `completed` (migration note documents this). Runs before index creation so the index cannot fail on pre-existing duplicates.
2. **(W5)** Partial unique index `uq_sessions_one_open_per_student` ON `sessions (student_id) WHERE status != 'completed'`.
3. **(W3a)** Partial unique index `uq_mistake_vault_evidence` ON `mistake_vault (evidence_id) WHERE evidence_id IS NOT NULL`.
4. ⟲ **(W9)** New column `question_log.cerberus_fix_count SMALLINT NULL` — NULL = never verified/counted; write-once makes catch accounting idempotent and attributable.
5. **(B2 — CONDITIONAL, only if Darra rules yes)** composite FKs + non-negative CHECKs per SOL_TRIAGE B2. If unruled: SKIP with comment block.

**Acceptance:** `alembic upgrade head` + `downgrade -1` round-trip on Neon DEV; single head; preflight collapses a manufactured duplicate-open-session fixture correctly.

---

## 1. Lane 1 — Backend: session identity, memory, generation

**Files (exclusive):** `services/student_memory.py`, `routers/chat.py`, `app/main.py`, `scripts/mock_session_smoke.py`, `mait-mvp/README.md`, ⟲ new `tests/test_session_identity.py` (this lane touches NO existing test file).

- **W5 — one open session per student, Sydney-day-bounded.** `get_or_create_active_session`: session-day = `Australia/Sydney` (`zoneinfo`). ⟲ Creation explicitly sets `date=today_sydney` (never rely on the DB `CURRENT_DATE` default — server TZ ≠ Sydney around midnight). Found open session with `date < today_sydney` → mark `completed`, open fresh. Creation uses ⟲ **targetless** `INSERT … ON CONFLICT DO NOTHING` (a bare `(student_id)` conflict target cannot infer a partial index) + re-select on miss. Fix the docstring.
- **W12 — shaky not due same-session.** `assemble_student_context(db, student, current_session)`: `shaky` is due only if `last_seen IS NULL OR last_seen < current_session.created_at`.
- **W11 — clamp at line boundary.** Cut at last `\n` ≤ `cap*4` (hard-cut fallback for a single oversize line), append `\n…[truncated]`.
- **W8 — atomic counters; no transaction across Gemini; ⟲ no writes into a completed session.** Commit the session-open/lookup transaction **before** embedding+Gemini. Post-Gemini persistence transaction: `SELECT … FOR UPDATE` the session; ⟲ if `status='completed'` (check-in raced the generation) → rollback and **409 `"session completed during generation — start a new session and regenerate"`**; else insert logs and increment via `UPDATE sessions SET questions_generated = questions_generated + :n`. Deck snapshot write stays (display-only; comment says export reads `question_log` per W14).
- **W16 — persist intent ⟲ + ordinal.** `question_payload={**item.model_dump(), "intent": intent, "ordinal": i}` where `i` is the 0-based position across the whole response's question items (parts in order, questions in order) — `created_at` alone is NOT a total order (single-transaction rows share `now()`); export ordering (W14) depends on this.
- **⟲ W17 — mode XOR validator.** Pydantic `model_validator` on `GenerateChatRequest`: exactly one of `student_id` / (`class_id`+`thread_id`) → else 422. (Sol's F14 rebuttal accepted: precedence was undocumented API surface, not just hygiene.)
- **W10 — echo-mode env guard.** `main.py` startup: `MAIT_PROMPT_ECHO=1` without `MAIT_ENV=test` → `RuntimeError`. Update smoke-script docstring + README (`MAIT_ENV=test MAIT_PROMPT_ECHO=1 …`). `start_dogfood.sh` untouched, never sets `MAIT_ENV`.

**Tests (`tests/test_session_identity.py`, all new):** stale-yesterday session auto-closes; two concurrent opens → one row; ⟲ check-in racing generation → 409 and zero rows/counters written; counter increments are concurrency-safe; `intent`+`ordinal` present and sequential across parts; shaky-this-session not due; clamp never splits a line; both-IDs request → 422; app refuses echo without `MAIT_ENV=test` (isolated-process import test).

---

## 2. Lane 2 — Backend: outcomes, export, Cerberus, compile

**Files (exclusive):** `routers/students.py`, `routers/cerberus.py`, `routers/canvas.py`, `services/deck_export.py`, `services/artifact_engine.py`, ⟲ `tests/test_instrumentation.py` (sole owner; adds `MAIT_ENV=test` beside line 24's echo var), new `tests/test_outcome_idempotency.py`.

- **W3a — outcome idempotency (⟲ race-proofed).** First-tap detection is a conditional write, not a read: `UPDATE question_log SET outcome=:o WHERE id=:id AND outcome IS NULL RETURNING id` — row returned = first tap → run the mastery transition; no row → prior outcome exists: same outcome → 200 no-op (⟲ but a supplied `misconception_tag` still updates the row); different → **409**. Order of checks pinned: ownership 404 → completed-session **409** → conditional-update path. Mastery row: `INSERT … ON CONFLICT (student_id, subject, topic) DO NOTHING` + `SELECT … FOR UPDATE`. ⟲ **Mastered promotion requires distinct-session evidence** (canon: sessions, not days): promote `solid→mastered` only if `EXISTS (SELECT 1 FROM question_log WHERE student_id=:st AND topic=:t AND outcome='nailed' AND session_id != :current_session)`. ⟲ Vault insert via `pg_insert(...).on_conflict_do_nothing(index_elements=['evidence_id'], index_where=…)` — never a caught `IntegrityError` inside the shared transaction. Tag divergence rule: vault files the FIRST tag; later tag edits update `question_log.misconception_tag` only (ledger UI later; documented in docstring).
- **W14 — export from `question_log` (⟲ ordered, precisely marked).** Query `QuestionLog WHERE session_id=:id ORDER BY created_at, (question_payload->>'ordinal')::int`. Build items from `question_payload`. Empty → 409. ⟲ **W1 marks exactly the exported rows:** capture the fetched ids, `UPDATE question_log SET kept=true WHERE id = ANY(:ids) AND kept IS NULL`, then recount `questions_kept` from `kept IS TRUE` (a generate committing mid-export is neither exported nor marked). Keep `exported_to_canvas` bookkeeping in `sessions.deck`.
- **W1 — kept toggle endpoint.** `PATCH /api/questions/{id}/kept` `{kept: bool}` → set row, recount session counter (idempotent).
- **W2 — edit events.** `POST /api/sessions/{id}/edit-event` `{count: int}` ⟲ validated `1 ≤ count ≤ 500` → atomic `edits_made` increment.
- **W9 — Cerberus catch accounting (⟲ persisted, idempotent, attributable).** When `session_id` present: prefetch that session's `question_log` ids; items whose `question_log_id` is absent/foreign/unparseable are verified but excluded from counting. Per counted item: `fix_n = min(1, #fix-suggestions)`; write once via `UPDATE question_log SET cerberus_fix_count = :fix_n WHERE id=:id AND cerberus_fix_count IS NULL`; ⟲ dedupe repeated ids within the batch; session counter = `UPDATE sessions SET cerberus_catch_count = (SELECT COALESCE(SUM(cerberus_fix_count),0) FROM question_log WHERE session_id=:sid)` — resubmission cannot inflate.
- **W6 — markdown→LaTeX correctness.** Split on math spans (`$$…$$`, `$…$`, `\(...\)`, `\[...\]`) first; markdown regexes + LaTeX-escape of bare `% & # _ ^ ~` on non-math segments only; math byte-identical; backslash-commands in prose survive.
- **W7 — compile hardening.** `/canvas/compile`: `Depends(get_current_tutor)` + `@limiter.limit("10/minute")` + 200k source cap; pdflatex env `openin_any=p`.

**Tests:** same-outcome retap no-op (streak unchanged); different-outcome 409; ⟲ two SIMULTANEOUS first taps → exactly one transition; completed-session tap 409; no duplicate vault rows; mastered needs distinct-session evidence (same-day two-sessions case passes, single-session case blocked); ⟲ export marks only fetched ids (mid-export generate excluded) and repeat-export idempotent; ⟲ export order asserted exactly across multi-part + multi-generate decks; Sol's pinned strings — `$3 * 4 * 5$`, `$2 ** 3 ** 4$` unchanged in math; `50% & _` escaped in prose; ⟲ repeated verify requests + duplicate batch ids don't inflate catch_count; foreign `question_log_id` excluded; compile 401/429/413 paths.

---

## 3. Lane 3 — Frontend: session scoping, chips, Canvas linkage

**Files (exclusive):** `stores/useExoskeletonStore.js`, `features/exoskeleton/Workspace.jsx`, `features/exoskeleton/CadenceRenderer.jsx`, `stores/canvasStore.ts`, `pages/CanvasWorkspace.tsx`.

- **W4 — session-keyed messages (⟲ shape pinned).** Student-mode assistant messages stored as `{role:'assistant', parts, sessionId}` under key `session-${sessionId}`. Store adds `completedSessionIds: []` and `exportedSessionIds: []`. `sessionCheckin` success: archive the key, push id to `completedSessionIds`. `OutcomeButtons` receive `sessionId` via message context: disabled while POST in flight (per-question pending map) and read-only when `sessionId ∈ completedSessionIds`. ⟲ "End session" button disabled while `isGenerating` (pairs with Lane 1's 409 backstop).
- **W13 — stale-selection guard.** `setActiveStudent` discards the session-open response if `get().activeStudent?.id` no longer matches the captured id.
- **W15 — misconception chip (⟲ canon-conformant).** Plain tap records the outcome (unchanged). **Long-press** (pointer: 500 ms hold; desktop also right-click) on `struggled`/`bombed` opens the chip picker: suggestion chips from `GET /api/students/{id}/vault-tags` (contract §5.6) + one free-text line. Selecting/submitting calls the outcome endpoint with the same outcome + tag (§5.3 semantics). Canon §7 line 128 is the ruling interaction; no 6-second auto-dismiss.
- **W1 (frontend) — kept chip.** Kept ✓/✗ toggle on question cards, visible when the card's `sessionId ∈ exportedSessionIds` (pushed on export success), calling `PATCH /api/questions/{id}/kept`.
- **W2 (frontend) — edit events (⟲ semantics pinned).** `seedCanvasFromExport` stores `sessionId` on the canvas document. Counted operations: `updateElement`, `addElement`, `deleteElement`, and each reorder/move — 1 each; batched on 2-second idle (matches the repo's auto-save debounce rule); flush batch → `POST /api/sessions/{sessionId}/edit-event {count}`; no-op without `sessionId`.

**Acceptance (no frontend test harness exists — not invented this week):** `npm run build` clean; manual script: generate → double-tap = one transition, buttons disable in flight → long-press chip with vault suggestions → export → kept chips appear, mid-export generate stays unmarked → Canvas edits land in `edits_made` → check-in (blocked while generating) → old cards read-only, new session clean.

---

## 4. Explicitly out of scope this week

pdflatex containerisation (W7 stops at auth+cap+paranoid mode); generate idempotency keys (no client auto-retry exists); B1/R2 middleware (Darra); outcome-correction reversal (write-once + future ledger); Cerberus verification-evidence table (the `cerberus_fix_count` column covers idempotency at week-1 cost); all Phase 3 pillar work.

## 5. Cross-lane contracts (pinned)

1. `PATCH /api/questions/{id}/kept` `{kept: bool}` → `200 {"question_id","kept","questions_kept"}`; 404 unknown/unowned.
2. `POST /api/sessions/{id}/edit-event` `{count: int (1–500), source?: str}` → `200 {"edits_made"}`; 404 unknown/unowned; 422 out-of-range.
3. `POST /api/questions/{id}/outcome` — check order: ownership 404 → completed-session 409 → conditional first-write (transition) → same-outcome no-op 200 (tag still updates; vault files first tag only) → different-outcome 409.
4. Echo mode requires `MAIT_ENV=test` at process start; `start_dogfood.sh` never sets it.
5. Deck-export response shape unchanged; source of truth = `question_log` ordered by `(created_at, ordinal)`; marks exported ids only.
6. ⟲ `GET /api/students/{id}/vault-tags` → `200 {"tags": [str]}` — distinct `failure_mode` of that student's ACTIVE vault rows, most recent first, ≤12. (Lane 2 implements in `routers/students.py`; Lane 3 consumes.)
7. Generate response unchanged, but student-mode may now return **409** when check-in completed the session mid-generation; Lane 3 surfaces the message verbatim.

## 6. Order of operations & verification gate

1. Lane 0 lands + round-trips (incl. preflight fixture test). 2. Lanes 1–3 parallel. 3. Integration: full backend `pytest`; `MAIT_ENV=test MAIT_PROMPT_ECHO=1` smoke via `mock_session_smoke.py --echo`; Lane-3 manual script; one real-key mock session before the first student session.
