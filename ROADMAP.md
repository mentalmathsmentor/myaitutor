# MAIT (MyAITutor) Strategic Roadmap

**Date:** April 2026
**Context:** Synthesis of Vision Documents vs `mait-mvp` Codebase Reality

---

## Section A: Vision vs Reality

| Vision Concept | Intent | Current State | Notes |
| :--- | :--- | :--- | :--- |
| **Human-Centric Persona** | Deep empathy, "Mate" persona that dynamically adapts to tone. | **Partial** | SLM (WebLLM) configured; responsive avatar system started, but advanced text-driven emotional adaptation is rudimentary. |
| **Proactive Wellness Engine** | 20-20-20 rule, empathic fatigue, mandatory breaks. | **Deviated** | "FatigueMetric" exists but formula is mathematically flawed and far too aggressive (rapidly locks out students). |
| **Curriculum Alignment (RAG)** | AI rigorously grounded in NSW HSC syllabus. | **Not Started** | RAG architecture is stubbed (`vector_store.py`) but bypassed due to ChromaDB dependency hangs. LLM currently relies on base weights entirely. |
| **Sims-Level Customisation** | Visual avatar customisation (hair, clothes) to foster ownership. | **Deviated** | Core UI has a dark/cosmic theme, but interactive 3D/Sims-like avatar customisation is completely absent. |
| **Multimodal Generation** | Tutor generates complex math diagrams, TikZ on whiteboard. | **Partial** | LaTeX compilation works via Gemini, Native Canvas architecture planned but backend fragment parsing is minimal. |
| **Keystroke Psychometrics** | Track WPM, dwell time to classify student behaviour. | **Partial** | Sophisticated logic exists but is currently stubbed/disabled in `App.jsx`. |
| **Privacy Shield** | Local PII wiping before data leaves browser. | **Partial** | `privacy.js` logic exists but is explicitly unused in the component flow. |

## Section B: What's Working Well

1. **Strategic Pivot to Native Canvas:** The architectural blueprint for moving from monolithic LaTeX (`artifact_engine.py`) to a fragment-based native canvas (LexoRank ordering, Zustand state) is excellent and represents a significant step towards a viable B2B or educator tool.
2. **In-Browser SLM Setup:** Integrating `@mlc-ai/web-llm` to run local Llama-3 reduces server costs to zero for chat interactions and ensures baseline pedagogy without constant API hits.
3. **Comprehensive Backend Scaffolding:** The FastAPI structure is cleanly separated (models, services, routes) and prepares well for expansion.
4. **Keystroke Engine Logic:** While disabled, the foundational maths for typing cadence and psychometric classification (`KeystrokeMetricsService.js`) exceeds typical MVP scope and could act as a massive differentiator.
5. **Humanised Developer Experience:** Using a cheap Gemini Flash pass to translate raw `pdflatex` compilation errors into plain English for teachers is an incredibly clever and pragmatic UX solution.

## Section C: Critical Gaps

1. **The RAG Disconnect:** Without RAG, MAIT is just a prompt wrapper around a foundational LLM. The syllabus alignment is the core "Moat" described in the vision document. This is the biggest single gap between promise and reality.
2. **True Native Canvas Backend Validation:** The frontend is stubbed for the new fragment canvas, but the backend decomposition logic (parsing monolithic LaTeX to fragments) is fragile and relies on simple regex. 
3. **Missing Authentication Model:** The `HSCMATE2026` gate provides zero user isolation. Without real Auth, "Persistent Memory" (Pillar 1) cannot exist because we cannot securely tie sessions to users across devices.
4. **Data Persistence:** Sessions are currently held in a Python dictionary in memory. Every Uvicorn restart wipes all student progress, fatigue parameters, and conversation history.

## Section D: Production Blockers

| Blocker | Severity | Rationale |
| :--- | :--- | :--- |
| **Arbitrary Code Execution (`exec()`)** | **CRITICAL** | `educational_agent.py` contains `exec()` running LLM output. Even with isolated globals, this is a severe security vulnerability. An adversarial student prompt could compromise the server infrastructure. |
| **Broken RAG Pipeline** | **CRITICAL** | The AI tutor functions without NSW HSC grounding, risking hallucinations and incorrect pedagogy. Must fix ChromaDB hang. |
| **In-Memory Volatility** | **HIGH** | Server restarts wipe all student session states. Requires immediate transition to SQLite/PostgreSQL. |
| **Aggressive Fatigue Scaling** | **HIGH** | The `BASE * (count ^ 1.6)` formula locks students out within 15 minutes of regular study pacing. The curve must be flattened. |
| **PII Data Leakage Risk** | **MEDIUM** | `scanForPII` is unused. Real student data could be passed to backend/Gemini unnecessarily, violating Australian Privacy Principles. |
| **Open CORS Policy** | **MEDIUM** | Standard security risk; API currently has `allow_origins=["*"]` despite documentation claiming otherwise. |

## Section E: The 90-Day Roadmap

### Horizon 1: Next 2 Weeks (Stabilisation & Security)
*Ship blockers, production-ready fixes, critical gap closures.*
* **S (Complexity)** Remove `exec()`: Immediately sandbox Python execution, or remove dynamic evaluation entirely if unnecessary for core maths generation.
* **M** Fix Persistence: Map Pydantic models to aiosqlite/SQLAlchemy to ensure session state survives pod restarts.
* **M** Re-enable RAG: Replace ChromaDB with a simpler/functioning vector store (e.g., FAISS or pure LLM embeddings stored in SQLite) to restore syllabus grounding.
* **S** Tune Wellness Engine: Flatten the fatigue progression curve so a lockout only triggers after 90+ minutes of continuous input.
* **S** Wire up PII Scanner: Activate the unused `privacy.js` logic in the main chat hook to ensure APP compliance.

### Horizon 2: Weeks 3-6 (Core Feature Completion)
*Unlocking the school pilot.*
* **L** V1 Native Canvas: Ship the fragment-based UI (Zustand state) + backend decomposition logic, allowing teachers to drag, drop, and revise worksheet sections.
* **M** Real Authentication: Integrate Google OAuth / Firebase / Supabase to provide secure, multi-device persistent memory for users.
* **M** WebLLM Performance Limits: Implement an async loading boundary and memory checks so the 6.3MB bundle doesn't freeze low-end student laptops on initial load.

### Horizon 3: Weeks 7-12 (Differentiators & Monetisation)
*Features that justify the $5-15/week pricing.*
* **M** Keystroke Psychometrics UI: Expose the disabled keystroke analytics to teachers/students in a "Study Insights" dashboard.
* **L** Multimodal / Image Parsing: Finalise Tier 2 of the vision (Optical Extraction Protocol for worksheets) using Gemini Flash.
* **M** Payments: Integrate Stripe for recurring tier billing, automatically enforcing the Freemium "Wellness Engine frequency" limits.

## Section F: What to Cut

1. **Sims-Level Visual Customisation (Pillar 2):** Fully customisable 3D/animated avatars require disproportionate engineering effort (WebGL, massive asset pipelines) for a solo developer. **Strategic Cut:** Abstract the persona into a high-quality static or simply animated 2D avatar and rely entirely on text/TTS personality shifting.
2. **B2B Platform Licensing Scope:** Dreaming of NESA licensing while struggling with MVP memory persistence is a distraction. **Strategic Cut:** Focus 100% on the single-player B2C student experience and the teacher Native Canvas. Attempting multi-tenant B2B abstraction now will break momentum.
3. **Complex SyncTeX (Bidirectional LaTeX Scrolling):** Highlighted as a non-goal in the Canvas plan, but worth reiterating. **Strategic Cut:** Keep manual "Preview" updates; building a live web PDF sync is a high-effort, low-reward trap.

## Section G: Risks & Open Questions

* **WebLLM Hardware Reality:** We are assuming high school students have hardware capable of running a 3B parameter model in-browser. Have we profiled this on a cheap 4GB RAM 2018 school-issued Chromebook? If the browser tab crashes, MAIT fails instantly.
* **Latency vs Persona:** Empathy requires speed. If generating a supportive, dynamic TTS response out of the model takes 8 seconds, the "Mate" connection breaks entirely. Are we tracking time-to-first-byte (TTFB)?
* **Australian Privacy Principles (APP):** Storing "psychometric profiles" based on keystroke cadence represents high-sensitivity biometric and behavioural data. Is this legally permissible for minors under the APP without explicit and rigid parental consent frameworks?
* **Vision Document Ambiguity:** The February 2026 text addendums (and Canvas docs) pivot heavily towards a teacher worksheet tool, while the original January vision is purely student-centric. We need to decide if MAIT is fundamentally a B2C student companion or a B2B teacher utility, as splitting focus between both will starve the product of velocity.
