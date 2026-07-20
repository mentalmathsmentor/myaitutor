# MAIT Dogfood v1 — Claude Code Handoff Brief

**Date:** 20/07/2026 | **Owner:** Darra | **Dogfood window:** ~20/07 → 17/08/2026

---

## Mission

Collapse the three-tool tutoring workflow (Gemini gem with syllabus/textbook context + separate worksheet generator + LaTeX compiler) into **one unified MAIT surface** used daily by a single tutor with ~5 students. Single user: the tutor. Students are subjects, not users.

## Done line (ship gate)

Open MAIT → select student → generate question set with that student's memory context injected → Cerberus inline suggestions render beside each question → edit → compile LaTeX → export PDF → session auto-logged. Full loop **< 10 minutes**. Reachable from laptop and tablet over Tailscale.

## Scope

**IN:** unified cockpit UI, per-student memory (ported), Cerberus isolated verifier with inline fix suggestions, reuse of existing Canvas LaTeX IDE, session logging + friction capture, local deploy + `tailscale serve`.

**OUT — feature-flag off, do not delete:** student accounts/auth, payments, keystroke psychometrics, WebLLM/SLM edge layer, Chalkie/PDF ingestion gate, three-tier student safety protocol, async tutor summaries, voice, avatars.

---

## Phase 0 — Audit first (mandatory, before any code)

- Map the existing MVP codebase: locate the Canvas LaTeX IDE, the question/worksheet generation path, and any existing memory or embedding code.
- Locate the memory engine source in the companion app repo for the port.
- Produce a **one-page integration map** (what exists, what gets reused, what gets flagged off, what gets built) and stop for approval before writing code.
- **Single-agent session. No subagent swarm.** Verify file paths and module names against the repo — never assume.

## Phase 1 — Student memory port

- Per-student namespace on the existing stack: SQLite + 768-dim Gemini embeddings, ~20-message retrieval windows as already built.
- Student record: alias slug only (`S1`, `S2`, ...), year level, subject/topic map, misconception tags, session notes.
- Retrieval: top-k over session notes + misconception tags → compact context block injected into the Generator prompt.
- **PII rule:** no surnames, no school names, no contact details anywhere in the store. Enforce at the schema level, not by convention.

## Phase 2 — Cerberus (isolation contract)

- Input **only**: `{question_text, worked_solution, outcome_or_bloom_tag, student_level_tag}`.
- Explicitly **not** passed: syllabus/textbook RAG context, generator reasoning, retrieval chunks. Independence is the point — this doubles as the live test of the Generator/Evaluator collusion risk.
- Output: inline suggestion diffs with severity (`fix` / `warn` / `style`), rendered next to each question. No pass/fail gate.
- Routing stays invisible to the tutor: one surface, no model plumbing exposed in the UI.

## Phase 3 — Instrumentation (the month must produce data)

- `sessions` table auto-captured per session: student slug, date, topics, questions generated vs kept ratio, Cerberus catch count, edits made.
- Post-session check-in, ≤10 seconds, three fields: context relevance (1–5), Cerberus usefulness (1–5), friction note (free text).
- These answer the three dogfood questions: does student memory improve question relevance; does verification catch real errors; what breaks.

## Phase 4 — Deploy + smoke test

- Local-first. `tailscale serve` for tablet access during sessions. No public exposure. Gemini API key via env var (own key — BYOK is deferred).
- Smoke test: run one full mock session against a fabricated student end-to-end before the first real session.

---

## Guardrails

- **Brownfield discipline:** feature-flag off, never delete. Every removal must be reversible.
- Any change touching the memory engine schema gets a migration note in the PR/commit.
- **Review pass happens post-window via codex-cross-review (Sol tier)** — do not spend Fable hours self-reviewing this diff.
- If a phase blows past its estimate, ship the loop without polish. The Done line is the only gate.
