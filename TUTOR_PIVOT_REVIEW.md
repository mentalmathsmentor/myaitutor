# Review of MAIT Architecture and Tutor-Mediated Pivot

## 1. Current Deployment Architecture

MAIT currently employs a **Hybrid Edge-Cloud Architecture**.

### The Edge (Browser)
*   **React SPA**: Built with Vite and Tailwind CSS.
*   **Demo Mode**: Runs completely in the browser without cloud dependencies using **WebLLM** (SmolLM 360M or Llama 3.2 3B). This provides a completely private, fast tutoring experience.
*   **Keystroke Psychometrics**: A service running in the browser captures typing patterns (WPM, dwell time, etc.) to gauge frustration, fatigue, and flow states, syncing to the backend.
*   **Rendering**: Uses KaTeX for LaTeX maths and react-markdown.

### The Cloud (Backend)
*   **FastAPI / Python**: The core backend framework handling requests.
*   **Storage**: SQLite with an `aiosqlite` async wrapper. A migration path to PostgreSQL is actively being discussed/built.
*   **AI Orchestration**: Uses `google-genai` to interface with Google Gemini (defaulting to 3.1 Flash-Lite, escalating to Pro as needed).
*   **RAG Engine**: Currently built on local **FAISS** with `sentence-transformers` generating embeddings from official NSW Maths Syllabi.
*   **Engines**:
    *   **Wellness Engine**: Tracks exponential cognitive fatigue and enforces lockouts.
    *   **Bloom's Taxonomy Engine**: Assesses the student's cognitive level to progress teaching strategies.
    *   **Artifact Engine**: Generates PDF worksheets using `pdflatex`.

## 2. The Tutor-Mediated Pivot

A major pivot was attempted: **The Tutor-Only Command Center (Dogfooding Phase / Emergency 3-Week Sprint)**.

### Strategic Context
The founder/lead tutor (Darra) needed to use MAIT for an emergency 3-week teaching stint covering Year 7-12 classes, alongside his normal tutoring, replacing his manual OpenAI Custom Gems workflow with a unified MAIT experience to save prep time.

**Post-Sprint Update:** The emergency 3-week stint has concluded. Darra *did* use the teacher-facing version in the classroom, but found the workflow/UI was "not easy enough" to support the speed required for live teaching preparation. This feedback will likely drive the next phase of UI/UX revisions.

### The Major Deferrals (Scope Cuts)
To meet the 3-week deadline and a 10-15 hour/week build budget, the team violently agreed to defer all student-facing complexity:
*   **No Student Authentication**: Deferred.
*   **No Student-Facing Chat**: Deferred. Students won't interact directly with MAIT during this sprint.
*   **No Parental Consent/Privacy Flows**: Deferred.
*   **No Billing/Stripe**: Deferred.
*   **Simplified RAG**: No Semantic Caching or WebLLM routing for the first week.

### Schema Changes (Tutor-Only Schema)
The architecture introduces new tables bypassing the standard multi-tenant auth:
*   `tutor_students`: Manually created profiles for the tutor's real students, tracking `struggle_areas`, `current_topics`, and `bloom_state`.
*   `vector_documents` & `vector_chunks`: Moving away from FAISS to a **PostgreSQL `pgvector`** implementation for syllabus storage and retrieval.
*   `documents.tutor_student_id`: A nullable foreign key linking generated worksheets directly to these manual student profiles, bypassing the standard `student_id` Google Auth logic.

### UI Enhancements
The frontend will gain a new `/tutor` route family containing:
*   Student Roster and Detail Views.
*   A **Question Generator / Activity Generator** combining the selected student's context, the target topic, and `pgvector` RAG into a prompt for Gemini, formatting the output for the Native Canvas.

## 3. Considerations from the Branch Plans

There was significant debate across different planning passes (GPT, Gemini, OPUS/Sprint) resulting in a synthesis branch (`docs/emergency-3week-plan-OPUS`).

### Points of Consensus
*   Drop FAISS, use **pgvector**.
*   Adopt the `tutor_students` schema.
*   Defer all student-facing authentication and features.
*   Retain a hierarchical NESA chunking strategy (~400 tokens with JSONB metadata mapping Subject -> Course -> Module -> Topic -> Outcome).

### Points of Divergence and Final Decisions
*   **Embedding Model**: GPT advocated for `gemini-embedding-001` (to avoid OpenAI entirely), while Gemini/OPUS pushed for **`text-embedding-3-small`**. **Decision**: The sprint proceeds with `text-embedding-3-small` (1536 dim) for cost and retrieval performance.
*   **Use Case Frame**: Early plans (GPT/Gemini) optimized for live 1-on-1 tutoring sessions. The OPUS plan correctly reframed the sprint around **classroom prep** for the emergency SLSO stint.
*   **Ingestion Automation**: The OPUS plan introduces **Aether** (an autonomous M1 agent running overnight) to handle the `.docx -> syllabus.json -> pgvector` ingestion, protecting the human developer's limited build hours.
*   **Activity Generation**: Because the sprint is for classrooms (Years 7-12), the OPUS plan adds a requirement for diverse activities (e.g., kinaesthetic games for Y7/8, rigorous past-papers for Y11/12), not just plain worksheets.
*   **Australian Voice Calibration**: The OPUS plan adds a formalized task to calibrate the system prompt to Darra's specific Australian teaching voice.
*   **Fallback Reliability**: The OPUS plan mandates keeping the legacy OpenAI Custom Gem workflow warm and accessible via a 1-click fallback until the new MAIT system proves reliable over two consecutive weeks of prep.