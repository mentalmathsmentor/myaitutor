# MAIT EXOSKELETON: SYSTEM CONTEXT & ARCHITECTURE CANON
*Branch:* `feature/pgvector-rag`

## 1. THE TECH STACK & RULES (LOCKED)
- **Backend:** FastAPI, Python 3.11, SQLAlchemy 2.0 (Strict Async ORM), Alembic, Neon serverless Postgres + `pgvector`.
- **Frontend:** React 18, Vite 5, Tailwind CSS 3.4, Zustand (Global State), Shadcn UI.
- **Strict Guardrails:**
  - NEVER use SQLite or `aiosqlite`.
  - ALWAYS query topics from the database using exactly `metadata_json->>'topic'`.

## 2. THE SHARED CONTRACTS
Both frontend and backend rely on strict JSON data contracts. 
- **The Response Schema:** The LLM outputs a JSON payload matching the `ExoskeletonResponse` model. The `parts` array contains objects with:
  - `type`: Enum `["text", "glass_box", "question_set", "activity"]`
  - `tier`: Enum `["all", "support", "core", "extension"]`
  - `items`: For question sets, `marks` is an OPTIONAL integer. `question_latex` is required.
- **The Prompt Engine:** Handled in `app/services/prompts.py`. Contains explicit pedagogical intents.

## 3. FRONTEND UI & PRESENTATION
- **CadenceRenderer:** Do not render AI responses instantly. Use the 400ms interval typing engine to process the `parts` array sequentially.
- **KaTeX Strictness:** Markdown strings containing Math must be parsed via `remark-math` and `rehype-katex`. Newlines (`\n`) must be sanitized using CSS `whitespace-pre-wrap` to prevent bleed.

## 4. PEDAGOGICAL PROMPT CONTRACTS (V1)
- **Teacher-Facing V1:** The AI acts as a lesson-prep co-pilot. ALWAYS provide full, meticulous worked solutions (`teacher_answer_latex`) so the tutor has the marking key. (The Socratic "never give direct answers" protocol is deferred to the Phase 2 Student App).
- **LaTeX Formatting:** NEVER wrap entire English sentences in `\text{}`. NEVER use LaTeX environments for lists (no `\begin{enumerate}`). Use standard Markdown for prose and lists, and only use `$` or `$$` for actual mathematical variables/equations.
