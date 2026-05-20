# Comparison to Existing Implementation Plans

This document compares the newly generated 3-week sprint plan (`implementation_plan_3week_sprint_GEMINI.md`) against the existing legacy and parallel plans located on the repository (`OPUS`, `GEMINI_old`, and `GPT`).

## 1. Core Agreements Across All Plans
*   **Aggressive Scope Cuts (Tutor-Only Focus):** All plans violently agree that student-facing features, complex multi-tenant auth, parental consent flows, Stripe integration, and Cerberus testing must be entirely deferred. The product must act solely as a Tutor Command Center.
*   **Database Schema Additions:** There is universal consensus on the required schema extensions to support the RAG pipeline:
    *   `tutor_students` table (for manual profiles with `struggle_areas`, `current_topics`, `bloom_state`).
    *   `vector_documents` and `vector_chunks` tables for storing embedded syllabus data.
    *   Adding a nullable `tutor_id` (or `tutor_student_id`) to the `documents` table to bypass standard auth middleware.
*   **RAG over NESA Syllabus:** All plans abandon the previous FAISS implementation in favor of a durable `pgvector` store, enabling targeted retrieval of NESA syllabus dot-points.
*   **Primary Objective:** To completely deprecate Darra's reliance on standalone OpenAI Custom Gems and replace them with an integrated, curriculum-grounded MAIT UI.

## 2. Key Disagreements and Divergences

### A. Embedding Model Choice
*   **My Plan, Opus Plan, and Old Gemini Plan:** Recommend **OpenAI's `text-embedding-3-small`**. The justification is its unparalleled cost-efficiency, speed, and high performance on educational text, paired with native 1536-dimensional support.
*   **GPT Plan:** Argues for **`gemini-embedding-001`**. GPT's rationale is to maintain a pure Gemini stack and explicitly avoid reintroducing OpenAI into the workflow that Darra is trying to replace. 
*   **Resolution in Sprint:** The sprint proceeds with `text-embedding-3-small` (as dictated by the locked architecture), acknowledging GPT's sovereignty argument but prioritizing retrieval benchmark performance for V1.

### B. Strategic Context & Target Audience
*   **My Plan & Opus Plan:** Pivot the strategic context to address Darra's immediate **3-week emergency SLSO teaching stint** covering Year 7-12 classes. The focus is on rapid classroom prep (worksheet generation, lesson activities) under a severe 10-15 hour/week build constraint.
*   **Old Gemini & GPT Plans:** Frame the sprint around **live 1-on-1 tutoring sessions**, optimizing for a workflow where Darra generates worksheets *during* a session with a single student. 
*   **Resolution:** The 3-week sprint model overrides the 1-on-1 model. The features built must scale to multi-student classroom prep (hence the introduction of diverse activity generation).

### C. Execution and Ingestion Strategy (Aether vs. Manual)
*   **My Plan & Opus Plan:** Introduce **Aether**, an autonomous M1 Macbook agent running overnight cron jobs to handle the `.docx -> syllabus.json -> pgvector` ingestion. This is a radical departure designed to protect Darra's build hours.
*   **Old Gemini & GPT Plans:** Treat ingestion as a standard Python script (`ingest_nesa.py`) that Darra would run manually during his build phase.

### D. Architectural Complexity (SLMs & Routing)
*   **My Plan & Opus Plan:** Explicitly acknowledge the existence of a complex SLM router (WebLLM) and Semantic Cache, but issue a "CTO Ruling" to strictly **defer them to Weeks 2/3**. Week 1 is hardcoded to Gemini Flash 3 to guarantee shipping.
*   **Old Gemini & GPT Plans:** Do not discuss SLM routing or semantic caching, viewing the architecture strictly as a straightforward LLM call.

## 3. Newly Surfaced Decisions (Introduced in My Plan & Opus)
These features and decisions were not present in the original V1 planning documents but are critical for the 3-week classroom sprint:

1.  **Activity Variety Generation:** Recognizing that generic worksheets fail in Year 7-8 classrooms. The new plan introduces specific prompt patterns tailored by Stage (e.g., Kinaesthetic games for Stage 4, Exit Tickets for Stage 5, scaffolded past-papers for Stage 6).
2.  **Personal Voice Calibration:** A formalized system prompt layer designed to explicitly enforce Darra's Australian teaching voice (e.g., using "maths", citing local contexts like AFL or Bondi, and preventing corporate edtech jargon).
3.  **The "Lesson Plan Completer":** A new workflow allowing Darra to paste a rough Chalkie-generated PPT outline and have MAIT suggest connecting pedagogical activities.
4.  **Automated Validation & Discord Webhooks:** Aether is tasked not just with data ingestion, but with running automated retrieval probes and reporting the pass/fail rates via a daily 7:00 AM Discord ping.
