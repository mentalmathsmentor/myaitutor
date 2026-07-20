# SOL TRIAGE — Adversarial Review of `claude/mait-dogfood-v1-audit-64j8dk`

**Date:** 2026-07-21 | **Reviewer:** GPT-5.6 Sol via `codex exec` (reasoning=high, 159k tokens; Sol ran 12 focused backend tests — passed; frontend build not run, no node_modules in worktree). **Triage:** Claude Fable 5, every finding ruled after reading the target code directly. Raw output: `.cx_sol_output.txt` (gitignored).
**This file is the work order.** Part A items are fixes for a junior agent, ordered by severity — highest first. Part B needs Darra. Part C are Chairman's additions Sol didn't raise. Fix references (W1…) are cited by `PHASE_3_DESIGN_SPEC.md` §0/§5.

---

## Part A — Real bugs (fix in dogfood week 1, this order)

**A1 · [REAL BUG] Sol F4 — core dogfood counters are unwired.** `useExoskeletonStore.js:114`, `Workspace.jsx:13`, `tutor_models.py:204-207`.
Sol is right; independently confirmed by grep before Sol reported. No caller ever sends `kept` (UI calls `recordOutcome(questionId, outcome)` only); nothing anywhere writes `edits_made`; `misconception_tag` is always null from the UI (see C2). `questions_kept`, `edits_made` stay 0 for the whole month — two of the handoff's Phase-3 metrics are dead, and every kept-ratio gate in the Phase 3 spec starves.
Fix (**W1**): on deck-export success, backend marks that session's exported `question_log` rows `kept=true` and sets `questions_kept` via atomic SQL `UPDATE … SET questions_kept = (SELECT count(*) …)` (server-side, no new UI). Add tap-to-toggle "kept" chip on question cards for exclusions. (**W2**): `edits_made` — either wire a Canvas edit-event counter (`POST /api/sessions/{id}/edit-event`, debounced client-side) or formally drop the column from reporting this cycle; do not leave it silently dead.

**A2 · [REAL BUG] Sol F2 — outcome taps are non-idempotent and race-unsafe.** `students.py:154-176, 181-228`, `CadenceRenderer.jsx:88`.
Sol is right on all four sub-claims; each verified in code: re-tapping/changing an outcome re-runs `_apply_mastery_transition` (two ✓ taps on ONE question promote — canon requires 2 *consecutive questions*); a `struggled/bombed`+tag re-tap files duplicate `MistakeVault` rows; concurrent first-taps race the `topic_mastery` SELECT-then-INSERT into a unique violation; nothing enforces canon's "mastered promotion spans ≥2 sessions".
Fix (**W3a**): make outcomes write-once (409 on change unless `?force=1`, which first reverses the prior transition — simplest: forbid change, tutor uses force sparingly); `INSERT … ON CONFLICT` upsert + `SELECT … FOR UPDATE` on the mastery row; unique partial index on `mistake_vault (evidence_id) WHERE evidence_id IS NOT NULL`; promotion to `mastered` requires `last_succeeded` in an earlier session; disable outcome buttons while POST is in flight.

**A3 · [REAL BUG] Sol F5 — cockpit messages are keyed by student, not session.** `Workspace.jsx:416`, `useExoskeletonStore.js:273`.
Sol is right: thread key is `student-${id}`, so after check-in the next session (same tab) still shows the old cards with **live outcome buttons writing to the completed session's `question_log` and advancing current mastery**; `hasDeck` also reads stale messages. (Scope note: store is in-memory, so a reload clears it — but "tab stays open for a month" is exactly the dogfood posture.)
Fix (**W4**): key `messagesByThread` by `session-${activeSession.id}` for student mode; on `sessionCheckin` success archive that key; `record_outcome` route additionally rejects outcomes for sessions with `status='completed'` (server-side backstop).

**A4 · [REAL BUG] Sol F3 — "active session" lookup spans days and races.** `student_memory.py:70-95`, migration `:79`.
Sol is right: the docstring says "today's session" but the query is any non-completed session ever — an unclosed July session silently absorbs August generates, dates, and check-ins; two devices' first opens can both INSERT (no partial unique index).
Fix (**W5**): add partial unique index `ON sessions (student_id) WHERE status != 'completed'` (new migration off `c7d2e4a91b03`); creation via `INSERT … ON CONFLICT DO NOTHING` + re-select; auto-close: if the found open session's `date` < today (Australia/Sydney — pin the session-day timezone), mark it `completed` and open a fresh one.

**A5 · [REAL BUG] Sol F13 — markdown→LaTeX conversion corrupts math and never escapes prose.** `deck_export.py:20-36`.
Sol is right; regexes verified: `$3 * 4 * 5$` → `$3 \textit{ 4 } 5$` (italic regex pairs single `*`s across math, DOTALL lets it span lines); `**` power-notation becomes `\textbf`; prose `%`/`&`/`#` pass unescaped into pdflatex (`%` silently comments out the rest of the line — worst case is *silent content loss on the printed worksheet*, not a compile error).
Fix (**W6**): split each string on math spans (`$…$`, `$$…$$`, `\(...\)`) first; apply the markdown regexes and LaTeX-escape (`% & # _ ^ ~`) ONLY to non-math segments; leave math segments byte-untouched. ~30 lines, no new dependency.

**A6 · [REAL BUG — pre-existing surface] Sol F1 — arbitrary LaTeX reaches pdflatex on an unauthenticated route.** `canvas.py:198-211`, `artifact_engine.py:483-495`, fed by `deck_export.py`.
Sol's facts verified: `/canvas/compile` has no auth dep and no limiter and compiles caller-supplied source; `--no-shell-escape` blocks shell, not TeX file reads (`\input{/etc/passwd}` renders into the returned PDF). Severity context Sol under-weighted: the endpoint **pre-dates this diff** (reuse map §1), ALL tutor auth is a stub (`get_current_tutor` → constant), and exposure is localhost + tailnet-only — so "Critical" overstates dogfood risk; the new deck-export path only adds a prompt-injection route into an already-open door.
Fix (**W7**, cheap hardening now, not a redesign): add the (stubbed) tutor dependency + `@limiter.limit`, cap `latex_source` length, and run the pdflatex subprocess with `openin_any=p` in its env (TeX Live paranoid file-read mode). Container sandboxing = post-dogfood.

**A7 · [REAL BUG] Sol F6 — generation counters race; transaction held across Gemini.** `chat.py:542-568`.
Sol is right mechanically: `questions_generated += n` is Python read-modify-write (two concurrent generates lose one increment and one overwrites the other's `deck`); the DB transaction opened by the student/session lookups stays open across embedding + up to 60s of Gemini (holds 1 of 5 pooled Neon connections). At single-tutor scale the lost-update needs tablet+laptop generating simultaneously — plausible, not daily. Retry-duplication requires a client retry that the UI doesn't do (no auto-retry in `runGenerate`) — noted, deprioritised.
Fix (**W8**): `UPDATE sessions SET questions_generated = questions_generated + :n` (atomic SQL); same for `cerberus_catch_count`; commit the session-open before the Gemini await. Idempotency keys: skip for V1 (no client retry exists).

**A8 · [REAL BUG — narrow] Sol F8 — Cerberus catch accounting is not idempotent.** `cerberus.py` router `:59-93`.
Right: one question with 3 `fix` diffs = 3 catches, and re-verifying the same deck increments again; increment is read-modify-write. Context Sol missed: the UI calls verify exactly once per generate and `question_log_id` is never persisted, so today's only real corruption path is per-suggestion multi-counting; the "planted IDs inflate counters" vector requires the (single, stub-authed) client to attack itself.
Fix (**W9**): count `min(1, fix-suggestions)` per item; validate `question_log_id` is a UUID belonging to `session_id` when both are supplied (one EXISTS query); atomic SQL increment (rolled into W8).

**A9 · [REAL BUG — severity demoted] Sol F7 — echo mode lacks an environment guard.** `chat.py:418-533`, `cerberus.py:94-109`.
Facts right: `MAIT_PROMPT_ECHO=1` persists stub questions into real `question_log`/`questions_generated`/`sessions.deck` and prints the full student-context prompt to server logs. Overstatements: it's an opt-in dev var (default off), the stub content is unmistakably fake on sight, echo Cerberus emits only a `style` suggestion so `cerberus_catch_count` is NOT polluted (router counts `fix` only — Sol's "fake verification" line ignores this), and "logs" are a local `uvicorn.log` on the tutor's own machine.
Fix (**W10**, one line each): refuse `MAIT_PROMPT_ECHO` at startup unless `ENVIRONMENT=test` (env var already conventional in repo); keep the smoke script exporting both.

**A10 · [REAL BUG — minor] Sol F12 — token clamp cuts mid-LaTeX.** `student_memory.py:52-55`.
Right: `text[:cap*4]` can sever `$…$` or a `\frac` mid-token inside the injected prompt block; degradation is prompt-quality only (no crash path).
Fix (**W11**): clamp at the last newline under the cap and append `…[truncated]`. Three lines; fold into W-batch.

**A11 · [PARTIAL] Sol F11 — retrieval-due logic.** `student_memory.py:58-67, 124-153`.
- *Shaky = due immediately, even mid-same-session:* **REAL (minor)** — a topic marked shaky at 4:10pm is "due for spaced retrieval" in the 4:20pm generate of the same session. Fix (**W12**): due only if `last_seen` predates the current session's `created_at` (pass the session into `assemble_student_context`).
- *"Mixes subjects":* **FALSE POSITIVE** — the only `TopicMastery` writer (`students.py:202-209`) always stamps `student.subject`; a student has exactly one subject column, so cross-subject rows cannot exist through any current writer.
- *Alphabetical, not overdue-ranked:* **FALSE POSITIVE for this diff** — canon's "due retrievals ranked" describes the *pre-session brief*, which is explicitly unbuilt (Phase 3 spec §3.3 item 1); ordering inside a context block the model reads whole is cosmetic.

**A12 · [PARTIAL] Sol F14 — mode precedence and stale-selection race.** `chat.py:356-415`, `useExoskeletonStore.js:60-71`.
- *Both-IDs silently pick student mode / flag-off falls to class mode:* **FALSE POSITIVE** — documented precedence in the request-model docstring ("two modes, one endpoint, routing invisible"), and the UI can never send both. An XOR validator is fine hygiene but nothing is broken.
- *Rapid S1→S2 lets S1's slow session-open overwrite S2's `activeSession`:* **REAL (minor)** — no staleness check in `setActiveStudent`. Fix (**W13**): capture the requested student id in the closure; discard the response if `get().activeStudent?.id` no longer matches.

## Part B — Judgment calls (Darra to rule)

**B1 · [JUDGMENT CALL] Sol F9 — "schema-level PII rule" doesn't cover free text.** migration `:67,87`, `students.py:36-56`.
Sol's side: the CHECK guards only `name`; `profile` JSONB, `dump`, `friction_note` accept surnames/schools freely and `dump` is injected into next-session Gemini prompts — the migration note's "schema-level PII rule" claim overreaches, and that's exactly canon R2's unresolved territory.
My side: free text is structurally un-CHECKable; the handoff's enforceable core (no name/contact *columns*, alias-only identifier) IS schema-enforced; the tutor is the only author of these fields, on their own five students. Softening the migration comment is a one-line docs fix either way. **Darra to rule** (= R2; recommendation in PHASE_3_DESIGN_SPEC §1.2: defer middleware, nothing precludes it).

**B2 · [JUDGMENT CALL] Sol F10 — composite FKs + numeric CHECKs.** migration `:98,139,158`.
Sol's side: DB permits tutor/student/session mismatches and negative counters; composite FKs `(session_id, student_id)` etc. make bad writers impossible, cheap to add while tables are empty.
My side: every current writer validates ownership at the app layer (verified: `record_outcome` joins session→tutor; `chat.py` checks `student.tutor_id`); single-tutor V1 gets hardening value ≈ 0 and every future migration pays the composite-FK tax. **Darra to rule**; if yes, fold into the W5 migration rather than a separate head.

## Part C — Chairman's additions (not raised by Sol)

**C1 · [REAL BUG] `sessions.deck` holds only the LAST generate — export silently drops earlier sets.** `chat.py:563`, `deck_export.py`, `students.py:257-292`.
Each generate **overwrites** `session_obj.deck`, and deck-export exports `session.deck` — so warmup + practice-set + challenge across three generates exports only the challenge. Sol's F6 caught the *concurrent* overwrite but not the sequential data loss on the Done-line export leg. Fix (**W14**): accumulate — `deck = {"parts": old_parts + new_parts}` on each generate (bounded by session), or export from `question_log` (the durable per-question record) instead of the deck snapshot. Recommend the latter; it also makes W1 trivial.
**C2 · [REAL BUG] Misconception chips don't exist — `mistake_vault` has no inlet.** `CadenceRenderer.jsx:88` calls `recordOutcome(questionId, outcome)`; the tag param is always null, so the vault (Feynman's entire data source, spec §2.2) stays empty all month. Fix (**W15**): long-press/second-tap on `struggled`/`bombed` opens a one-line tag picker (free text + recent tags for that student).
**C3 · [GAP] `intent` is never persisted per question.** `question_payload` lacks it, blocking the command-bar gate (spec §3.3). Fix (**W16**): add `"intent": intent` into `question_payload` at `chat.py:551-556` — additive JSONB key, no migration.
**C4 · [DOC] Canon line 6 claims the May/Locked architecture docs "exist nowhere in this repo" — both exist at repo root (SUPERSEDED banners). One-line REALITY-layer patch next canon audit; no code impact.

## Concurrence with Sol's clean bill

Sol's "areas that held up" all match my independent read: migration↔model parity + single-head chain + child-first downgrade; Gemini-failure ordering (no orphaned logs / double counts — the 502 path precedes all counter writes); Cerberus four-field model boundary structurally airtight (`extra="forbid"`, pure prompt builder, no retrieval imports — the router's `question_log_id` never reaches the model); timezone normalisation + empty-store degradation in memory assembly; deck JSONB copy-and-reassign; `--no-shell-escape` present.
