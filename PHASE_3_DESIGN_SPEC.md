# PHASE 3 DESIGN SPEC — Post-Dogfood Build (Tethering · Pedagogy · Cockpit)

**Date:** 2026-07-21 | **Author:** Claude Fable 5 (Chairman) | **Ratifier:** Darra
**Authority:** handoff brief + PHASE0 map (scope) → MAIT_ARCHITECTURE_CANON.md (names/schemas/invariants). Vision docs raw material only.
**Target stack (as built, locked):** React 18 + Zustand + FastAPI + Neon Postgres/pgvector, 512MB host, single Gemini provider (`gemini-3.5-flash`), Tutor V1 baseline: cockpit at `/teach`, canon §7 relational memory, Cerberus, deck→Canvas export, `sessions` instrumentation.
**Executable when:** dogfood window closes (~17/08/2026). Every dogfood-dependent choice below is a programmatic gate; whatever the data says, the spec runs without rework — gates select between pre-specified paths, never trigger redesign.

---

## 0. Gate protocol

All gates are SQL predicates over the dogfood window (`sessions.date BETWEEN '2026-07-20' AND '2026-08-17'`, Neon DEV branch), evaluated once at execution start. Fields used: `context_relevance`, `cerberus_usefulness`, `friction_note`, `questions_generated`, `questions_kept`, `cerberus_catch_count`, plus `question_log.outcome/misconception_tag/kept`, `topic_mastery`, `mistake_vault`.

**Precondition P0 (blocking, week-1 of window):** three gate inputs have **no writers** in the merged code — `questions_kept` (frontend never sends `kept`), `edits_made` (no writer anywhere), `misconception_tag` (UI always sends null → `mistake_vault` never populated from taps). These are logged as work-order items W1, W2, W15 in `SOL_TRIAGE.md`. Any gate reading a dead field states its degraded fallback inline. If they don't land in week 1, the degraded branch is taken automatically — the gate never blocks.

**No decision needed.**

---

## 1. Pillar 1 — Student Tethering (canon Phase 2 wedge; dependency root)

### 1.1 Auth flow ruling — recommend **tutor-generated OTP**

One flow, hand-rolled on **PyJWT + two Postgres tables** (no fastapi-users/authlib — neither supports a tutor-as-approver actor model; hand-rolling is the norm at this scale).

- **Binding:** tutor taps *Generate code* on a student card → `POST /api/students/{id}/otp` → 6-digit `secrets`-based code, sha256-hashed into `student_otp (student_id FK, otp_hash, expires_at, attempts)`, TTL 10 min, single-use, 5 attempts, `slowapi`-limited (already a dependency). Tutor reads the code out; student enters it once on their device at `/student`.
- **Session:** bind issues access JWT (15 min, claims `{sub: student_id, ver, device_id}`) + refresh token (30 days, device-bound) stored hashed in `student_devices (id, student_id FK ondelete CASCADE, device_label, refresh_token_hash, token_version int default 0, last_seen_at, revoked_at)`.
- **Revocation (instant, Postgres-only):** `token_version` bump on the device row (or all rows for the student) — one `UPDATE`, next refresh dies; access tokens self-expire ≤15 min. No Redis, no denylist.
- **Why not the others (one line each):** *Magic-link* — most 8–16-year-olds have no email; delivery collapses to hand-relaying a link (OTP with extra infrastructure: Resend wiring, SPF/DKIM, deliverability). *Device-code* — same security class as OTP but needs a pending-grants poll loop + live cockpit approval view; more moving parts, zero security gain at 5-student scale, and it puts the student's device in the initiating role where OTP keeps the tutor as the explicit gatekeeper.

**Decision needed** — ratify OTP as the single flow.

### 1.2 Privacy — the exact exposure vector each option forces (canon R2 unresolved)

- **Magic-link:** forces a **real contact detail (student/parent email) into the store** — breaches the schema-level PII rule (`ck_tutor_students_alias_slug`; no contact columns exist, deliberately). Only option that structurally violates R2's direction.
- **Device-code:** no new PII. Exposure = shoulder-surfed pairing code + an unauthenticated polling endpoint (rate-limit).
- **Tutor OTP:** no new PII. Exposure = code overheard/screenshotted within its 10-min TTL + an unauthenticated bind endpoint (rate-limit, attempt cap). Device rows hold only alias-linked hashes.
- **R2 note:** tethering adds **zero new external-API exposure** — student-surface Gemini calls carry the same alias-slug-only context as today, so the R2 middleware ruling (pseudonymisation before external calls) can stay pending without precluding this pillar. Regulatory scan (OAIC Children's Online Privacy Code in exposure draft, registered by 10/12/2026; COPPA only if US data flows) supports alias-only + parent-consent-via-tutor as adequate for a 5-student private-tutoring V1.

**Decision needed** — rule R2 once: middleware now vs deferred. Recommend deferred; nothing here precludes it.

### 1.3 Surface split — one app, one new route, one new store

- **Route:** `/student` added as a lazy route in `App.jsx` beside `/teach` and `/canvas` (plain react-router; no second app, no second root). Note `lib/navigation.ts`'s legacy `VALID_PAGES` doesn't know `/teach`/`/canvas` either — use `useNavigate` only, as `Workspace.jsx` already does.
- **Store:** new `useStudentStore` (student token, assigned deck, own mastery snapshot). Do **not** widen `useExoskeletonStore` — its consumers assume a tutor is driving (subagent-verified: all state is cockpit-scoped).
- **Reused components:** `MathMarkdown` (KaTeX), `QuestionItem` in a new answer-stripped variant. **Server-side stripping is the contract:** `GET /api/student/me/deck` serialises the session deck **minus `teacher_answer_latex`, marks-criteria, Cerberus suggestions** — the answer never reaches the student client, so no CSS/JS "hide" can leak it (the "UI Camouflage" vision concept is superseded-era raw material; the durable idea kept here is: student surface is a *curated projection*, not the cockpit re-skinned).
- **Student dashboard V1 = 3 read-only panels + 1 runner:** assigned deck (question cards), own traffic-light mastery map (colours only, no vault text — vault verbatim is R3-pending and never student-visible), streak/last-session line; practice runner per gate G1.
- **Tutor curation:** per-student toggle set `student_view: {deck: bool, map: bool, runner: bool}` in `tutor_students.profile` JSONB (tutor-editable ledger already the pattern). Default all-off; tethering without curation shows a friendly empty state.

**No decision needed.**

### 1.4 Scope gates

- **G1 (practice runner):** `SELECT count(*) FILTER (WHERE outcome IS NOT NULL)::float / NULLIF(count(*),0) FROM question_log` (window) **≥ 0.5** → runner ships with self-reported outcome capture (student taps feed a separate log, never `question_log` — explicit-assertion rule: only tutor taps are evidence). **< 0.5** → deck-viewer only; outcome capture stays tutor-side.
- **G2 (live student generation):** `median(context_relevance) ≥ 3` over ≥10 completed sessions → student runner may request step-down/more-like-this generation (student-templates, §2). Below → student surface serves **tutor-pre-generated decks only**; no student-initiated Gemini calls this cycle. *(Degraded P0 path: none — `context_relevance` has a live writer.)*

**No decision needed** (gated).

---

## 2. Pillar 2 — Pedagogy Engine (student surface; depends on Pillar 1)

### 2.1 `socratic_strictness` dial

- **Schema:** `tutor_students.socratic_strictness SMALLINT NOT NULL DEFAULT 1` + `CHECK (socratic_strictness BETWEEN 0 AND 3)` (column, not JSONB — it gates prompt assembly and deserves a constraint; matches repo String+CHECK style). Alembic head off `c7d2e4a91b03`, migration note per guardrail.
- **Tutor UI:** 4-stop segmented control on the student card in the cockpit sidebar: `0 Direct · 1 Guided · 2 Socratic · 3 Hardline`.
- **Prompt modulation (exact, student templates only):** a `{strictness_block}` slotted into the new `STUDENT_TEMPLATES` (sibling of `INTENT_TEMPLATES`, same `.format()`-all-placeholders rule):
  - **0:** "After the student makes one genuine attempt, you may show the next worked step. Never the final answer unattempted."
  - **1:** "Hint ladder only: nudge → method name → first step. Reveal a worked step only after two attempts. Never the final answer."
  - **2:** "Questions only. Every turn ends with exactly one question back to the student. No worked steps, no final answers."
  - **3:** "As 2, and refuse 'just tell me' with a redirect to the smallest sub-question the student can answer."
- **Isolation invariant (pinned by test, like `test_prompt_contract.py`):** the tutor generate path (`INTENT_TEMPLATES`) never reads `socratic_strictness`; grep-level test asserts the column name appears nowhere in `routers/chat.py`'s class/tutor branch or `INTENT_TEMPLATES`.

**Decision needed** — default level (recommend 1) and the four label names; the ladder itself is authored pedagogy (Claude's lane per canon §9).

### 2.2 Feynman reverse-tutoring

- **Trigger (all must hold; offered as a card, never auto-started):** student surface live (G2 passed) · tutor enabled `feynman: true` in `student_view` · topic has **≥2 active `mistake_vault` rows for that student** · `topic_mastery.status ∈ ('shaky','solid')`.
- **Misconception sourcing — strictly the student's own vault:** the prompt receives only that student's active `(topic → failure_mode → error_class)` triplets, verbatim, with the instruction *"role-play a novice making exactly these recorded errors; never invent error types not listed."* Fewer than 2 rows → the card is not offered and the student sees nothing (empty-store degradation, same rule as `student_memory.py`).
- **Guardrails — deliberate errors stay off tutor surfaces and out of memory:**
  1. Feynman exchanges write to a new `student_activity` table (session FK, type, payload JSONB) — **never** `question_log`, so mastery transitions and generated-vs-kept metrics can't ingest fabricated errors (explicit-assertion rule holds: no tutor tap, no evidence, no write).
  2. The post-session dump extractor receives no `student_activity` rows of type `feynman`.
  3. Feynman content is never merged into `sessions.deck`; the cockpit renderer has no part type for it, and `CadenceRenderer` silently drops unknown types (verified) — failure direction is invisibility on the tutor surface, which is the safe direction.
- **G3 (ship gate):** `SELECT count(*) FROM (SELECT student_id, topic FROM mistake_vault WHERE status='active' GROUP BY 1,2 HAVING count(*)>=2) t` **≥ 3** by window end → build. Below → the vault-entry UX (W15 misconception chips) demonstrably didn't happen; build W15 properly first and defer Feynman one cycle. *(P0 degraded path: if W15 never lands, G3 reads 0 and defers — correct outcome, not a gate failure.)*

**No decision needed** (gated).

### 2.3 Standing invariant (restated, unweakened)

Tutor-facing = full worked answers, always (`teacher_answer_latex` complete). Socratic behaviour exists only inside `STUDENT_TEMPLATES` behind student auth. This spec adds a pinned test; nothing in Pillars 1–3 conditions or dilutes it.

**No decision needed.**

---

## 3. Pillar 3 — Cockpit UX Evolution (tutor surface)

### 3.1 Staged reveal / "orchestrated latency"

**Verification result (subagent, exact-quote pass):** the term exists **only** in `Feb '26 MyAITutor_ Project Vision Document.txt` (root, lines 133–147: student-facing "Guess-First" workflow; plus wellness echoes) — absent from canon and from both named architecture docs. It is superseded-era, student-as-user raw material. *(Same pass found all five probed concepts — UI Camouflage, Glass Box Transparency, core_truth, Feynman mode — only in that .txt; and found canon's line-6 claim that the May/Locked docs "don't exist" is stale: both sit at repo root with SUPERSEDED banners. Doc-hygiene note only.)*

**Verdict: do not port latency theatre to the tutor cockpit.** Canon §7 already rules that all generation latency lives in the pre-session brief, and bans thread UI. The existing `CadenceRenderer` sleep-cadence (520–1200 ms per text part + 400 ms beats, cards gated until all text lands) is the *opposite* of what a live session needs — it delays outcome buttons behind fake typing.

- **Spec:** `CadenceRenderer` **is** the right chassis — reveal logic is already isolated behind a `parts` prop with local state; no Zustand change required (parts arrive complete; progressive reveal is presentation). Add a `cadence` prop: `'staged'` (default; class-mode prep feel preserved) vs `'instant'` (student-session mode: text parts render immediately, `cardsReady` true on mount, outcome buttons live at once). One prop, two paths, no new renderer.
- The only legitimate descendant of "orchestrated latency" is **guess-first during student-surface generation** (a Pillar 2 student-template behaviour, available only past G2) — while a step-down set generates, the runner asks for the student's first-step guess. Costs nothing on the tutor side.

**Decision needed** — ratify: cockpit gets `instant` mode; guess-first relocates to the student surface (or is dropped).

### 3.2 Glass-box separation

Extend the **existing** `glass_box` part type — no parallel system, no new part type (new types would vanish silently in the renderer; a variant degrades to a plain glass box, additive and safe). `ExoskeletonResponsePart` gains `variant: Optional[str] = None` ∈ `insight` (default) | `misconception_spotlight` | `provenance` (surfaces the retrieval citations already returned by `/api/chat/generate` but currently dropped by the student-mode UI). Renderer: one switch on `part.variant` inside the current `TextPart` glass branch.

**No decision needed.**

### 3.3 Unbuilt canon §7 items, ranked by expected dogfood friction

1. **Pre-session brief + pre-generated deck** — attacks the two frictions the current build guarantees: mid-session generation latency and topic/refinement typing. **G4:** `count(*) FILTER (WHERE friction_note ~* 'slow|wait|lag|latenc|typ|set ?up')::float / NULLIF(count(friction_note),0) ≥ 0.25` **OR** `avg(questions_generated) ≥ 8` per completed session (heavy mid-session generation = latency pain) → build first. Else it drops behind item 2.
2. **Traffic-light mastery map** — only worth pixels if outcome data exists. **G5:** outcome-tap adoption ≥ 0.5 (G1's predicate) **AND** `count(*) FROM topic_mastery ≥ 20` → build; below, spend the effort on making outcome tapping cheaper instead (that's the data pipe everything else drinks from).
3. **Command bar** — the cockpit already has a chat input; the canon command bar is a promotion of it. Intent is not persisted per generation (gap: W16 logs `intent` into `question_log.question_payload` — additive JSONB key, no migration), so this cycle's proxy: **G6:** `count(*) FILTER (WHERE friction_note ~* 'chat|command|refine|input') ≥ 3` → promote; else keep the existing footer input and revisit with W16 data next cycle.

**Decision needed** — ratify the ranking + gates as the build order.

---

## 4. Conditional appendix — keystroke/grit telemetry: **NO-GO**

NO-GO for this cycle, structurally. Keystroke dynamics are behavioural-biometric-class data; captured from identified minors (alias slugs pseudonymise, they do not anonymise — dwell/flight-time patterns are themselves re-identifying, so "schema-level anonymous" is not achievable for this signal class), they sit in the worst quadrant of the OAIC's incoming Children's Online Privacy Code while R2 (pseudonymisation) and R3 (verbatim policy) are still unruled; consent would have to come from parents through a surface this product deliberately doesn't have; and the pedagogical yield is marginal against what the `sessions` spine already measures (outcomes, kept-ratio, friction) on a host with no headroom for another sync path. The existing `KeystrokeMetricsService` stays feature-flagged off per the handoff OUT-list. Revisit only after: parent-facing consent infrastructure exists, R2/R3 are ruled, and a concrete pedagogical decision is named that outcome taps cannot answer. **No decision needed.**

---

## 5. Work-order deltas the gates depend on (junior-agent tasks, week 1 of window)

Cross-referenced in `SOL_TRIAGE.md` (full work order W1–W16 there): **W1** wire `kept` (deck-export marks exported questions kept), **W2** wire `edits_made` (Canvas edit counter) or formally drop the column this cycle, **W15** misconception chip on struggled/bombed taps (vault's only inlet), **W16** persist `intent` into `question_log.question_payload`. Gates additionally lean on **W5** (one open session per student — session identity) and **W14** (deck accumulation / export from `question_log`), without which per-session metrics blur across days and the export leg under-reports kept questions. Without W1/W15 the month cannot answer the kept-ratio and vault questions the handoff names as the point of dogfooding.

**No decision needed.**
