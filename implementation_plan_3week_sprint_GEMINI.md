# Implementation Plan: 3-Week Sprint (Emergency Teaching Situation)
## 1. Strategic Context
Darayat "Darra" Chowdhury is a highly experienced and exceptional young educator with over 4 years of 1-1 tutoring and 2 years of small-group class teaching. Earning the title of Class Teacher of the Year 2023, he has successfully converted 200+ hours of voluntary SLSO (Student Learning Support Officer) work into a two-day-per-week paid teacher aide position, and has been fully integrated into the AI committee at a prestigious private school. His students consistently rate his lessons as the absolute highlight of their week and deeply appreciate his engaging and highly effective teaching style.

He is currently stepping into a 3-week instructional volunteer/SLSO stint, covering for an absent teacher across multiple classes spanning Year 7 to Year 12. During this critical window, the MyAITutor (MAIT) platform’s primary objective is to make his already-effective teaching even faster, richer, and more efficient during preparation time. Crucially, Darra is **not auditioning** for this role—he has already proven his pedagogical competence. MAIT is strictly designed to augment his capabilities and drastically reduce his prep time, rather than compensating for any lack of experience. 

Given that teaching multiple classes is intensely exhausting, Darra operates under severe time constraints, with only 10-15 build hours available per week. MAIT must be heavily automated. To achieve this, Aether (an autonomous M1 Macbook agent powered by Gemini Flash 3) will operate in parallel overnight, handling the bulk of the heavy lifting such as the NESA syllabus ingestion. Darra’s build hours must be rigorously protected for core application assembly, leaving Aether to handle background cron jobs and data processing.

## 2. Scope Cut (Explicit Deferrals)
To strictly adhere to the 10-15 hours/week budget and guarantee shipping within the 3-week window, the following features are explicitly deferred until post-sprint. MAIT will operate strictly as a Tutor-Only Tool for this period.

*   **Tutor-Student Tethering:** Deferred. In this 3-week window, students will not interact directly with MAIT. Therefore, complex relational database schemas linking tutor IDs to student dashboards, assignment allocations, and progress tracking are completely unnecessary.
*   **Magic Link Auth / Student-Facing Chat:** Deferred. Authentication will be heavily simplified. We will implement a tutor-only single-user authentication model. Bypassing the complex auth middleware for students prevents security edge cases and saves significant frontend routing time.
*   **Parental Consent Flows:** Deferred. Since students do not directly access the platform, there are no COPPA/privacy compliance requirements, nor any need for parental onboarding or consent tracking UI.
*   **Stripe Integration / Cerberus Testing:** Deferred. Monetization and payment gateways are completely irrelevant for a personal volunteer stint. Rigorous end-to-end automated testing (Cerberus) will be skipped in favor of manual "smoke testing" by Darra during his actual prep sessions.
*   **Complex SLM Routing and Semantic Caching:** Deferred to Week 2/3 (or post-sprint). Building a router that seamlessly shifts between WebLLM (Small Language Models) and Gemini 3.1 Pro based on task complexity requires extensive benchmarking and edge-case handling. For Week 1, we will hardcode all backend LLM calls to Gemini Flash to guarantee functionality. Semantic Caching (e.g., storing vectors with cosine > 0.92) is a "nice-to-have" optimization that will be prioritized only if API latency becomes a tangible bottleneck.

## 3. The 3-Week Plan
The sprint is divided into three distinct phases, mapping directly to Darra's availability and immediate classroom needs.

### Week 1: Foundational Prep & Ingestion (Starting Wednesday)
*   **Core Objective:** Establish a baseline RAG application capable of generating NESA-grounded questions and providing instant pedagogical refreshers.
*   **Schema Additions:** Implement the simplified `tutor_students` table (for Darra's manual notes on class profiles), the `vector_documents` and `vector_chunks` tables for the RAG corpus, and the nullable `tutor_id` on the existing `documents` table to bypass standard auth middleware.
*   **Aether Pipeline Initialization:** Aether begins the automated nightly ingestion of NESA syllabi (.docx → syllabus.json → pgvector).
*   **Backend Hardcoding:** Hardcode the Question Generator backend to utilize Gemini Flash + pgvector RAG. 
*   **Initial Output:** A bare-bones, functional CLI or simplified web interface that Darra can query to generate worksheet questions for his first few days of classes.

### Week 2: UI Expansion & Activity Diversification
*   **Core Objective:** Move beyond basic questions into diverse, year-level-appropriate activities and provide a usable frontend.
*   **Multi-Year-Level Coverage:** Expand the prompt templates to dynamically adjust output based on the target audience (Year 7-8 vs. Year 11-12).
*   **UI Implementation:** Build a clean, rapid-entry UI for the Question Generator, allowing Darra to quickly input syllabus codes and generate formatted output.
*   **Activity Variety Module:** Implement the prompt engineering required for games, kinaesthetic activities, and scaffolded problems.
*   **Stretch Goal (Time Permitting):** Begin integrating local SLM routing for extremely simple classification or summarization tasks to reduce API dependence.

### Week 3: Refinement & Advanced Optimizations
*   **Core Objective:** Polish the outputs based on real-world classroom feedback and implement time-saving optimizations.
*   **Classroom Feedback Loop:** Refine prompt templates based on what actually worked with the students. Did the Year 8s find the math bingo too complex? Adjust the prompt.
*   **Voice Calibration Integration:** Fine-tune the system prompts to perfectly capture Darra's distinct Australian teaching voice.
*   **Semantic Cache Layer:** Build the Semantic Caching layer (cosine similarity > 0.92) to drastically speed up repeated queries (e.g., repeatedly asking for Year 10 algebraic fraction questions).

## 4. Year 7-12 Curriculum Mapping
Aether’s overnight ingestion pipeline must be strictly prioritized to match Darra’s teaching load and the complexity of the subjects. The durable source of truth is the intermediate `syllabus.json` file.

**Aether's Ingestion Priority Order:**
1.  **Mathematics Advanced Stage 6 (Year 11-12):** Highest priority. The content is complex, the stakes for students are higher (HSC preparation), and Darra will likely need precise, scaffolded questions that strictly adhere to NESA outcomes.
2.  **Mathematics Standard 2 Stage 6 (Year 11-12):** Second priority. Requires a strong focus on practical applications and clear, step-by-step scaffolding.
3.  **Mathematics Stage 5 (Year 9-10):** Third priority. This stage introduces critical foundational algebraic and geometric concepts. Activities must balance rigor with engagement.
4.  **Mathematics Stage 4 (Year 7-8):** Lowest initial priority, though crucial for engagement. These classes will rely more heavily on the "Activity Variety Generation" module for games and interactive tasks.

**Chunking Strategy:** Hierarchical (Subject → Module → Topic → Outcome → Content). Chunks should be approximately 400 tokens, maintaining rich JSONB metadata to allow hybrid search (combining exact-match `content_code` like "MA-C1.1" with cosine similarity).

## 5. Simplified Architecture (Week 1 CTO Ruling)
To completely derisk Week 1 and ensure Darra has a highly functional, reliable tool prior to his first classes, we are bypassing the complex SLM (Small Language Model) router proposed in earlier architectural iterations. Complexity is the enemy of a 3-week emergency sprint.

**Week 1 Operational Architecture (The "Happy Path"):**
*   **Default Routing:** All preparation queries are unconditionally routed to Gemini Flash + pgvector RAG. Gemini Flash provides the optimal, proven balance of speed, cost-efficiency, and a massive context window (ideal for processing multiple retrieved RAG chunks and generating comprehensive initial lesson drafts).
*   **Manual Escalation (The 'Panic Button'):** The UI will feature a deliberate, manual toggle (represented as a toggle switch or a specific prompt tag like `@deep-think`) that allows Darra to explicitly route a query to Gemini 3.1 Pro. This pathway is strictly reserved for complex cross-topic reasoning, evaluating convoluted lesson sequences, or generating highly nuanced, multi-step explanations for Stage 6 Advanced Mathematics where Flash might lack the requisite depth of reasoning.
*   **Retrieval Mechanism:** A hybrid search approach utilizing pgvector. It will combine HNSW (Hierarchical Navigable Small World) cosine similarity for semantic matching alongside a B-tree index exact-match on the NESA `content_code`. This ensures that if Darra queries a specific code (e.g., "MA-C1.1"), the exact corresponding syllabus chunk is guaranteed to be retrieved, bypassing any semantic fuzziness.
*   **Embedding Model:** OpenAI `text-embedding-3-small` will be used exclusively for generating embeddings during both the nightly Aether ingestion and real-time retrieval. It is cheap, fast, and highly effective for educational text.

**The Post-Sprint Migration Path (Weeks 2-3+):**
Once the core functionality is rock-solid and Darra's immediate daily prep needs are consistently met, we will introduce the programmatic routing layer. 
*   **Phase 1 (Semantic Caching):** Implement a fast Redis or local memory cache that stores the embedding vector of incoming queries. If a new query has a cosine similarity > 0.92 to a cached query (e.g., asking for Year 10 algebraic fractions twice in one week), the system returns the cached response instantly, bypassing the LLM entirely.
*   **Phase 2 (SLM Integration):** Integrate a local WebLLM instance (e.g., a quantized Llama 3 8B model) running on the M1's Neural Engine. The router will evaluate incoming queries. Simple factual retrievals, formatting tasks, or basic spelling/grammar checks will be handed off to the local SLM, reserving the expensive API calls exclusively for heavy generative tasks.
To completely derisk Week 1 and ensure Darra has a functional tool by his first classes, we are bypassing the complex SLM router.

**Week 1 Operational Architecture:**
*   **Default Routing:** All prep queries are unconditionally routed to Gemini Flash + pgvector RAG. Gemini Flash provides the optimal balance of speed, cost, and context window for processing RAG chunks and generating initial lesson drafts.
*   **Manual Escalation:** The UI will feature a manual toggle (or a specific prompt tag like `@deep-think`) that allows Darra to explicitly route a query to Gemini 3.1 Pro. This is reserved for complex cross-topic reasoning, evaluating convoluted lesson sequences, or generating highly nuanced explanations for Stage 6 Advanced Mathematics.
*   **Retrieval:** Hybrid search using pgvector HNSW cosine similarity alongside B-tree index exact-match on NESA `content_code`.
*   **LLM Choice:** OpenAI `text-embedding-3-small` will be used for generating embeddings during ingestion and retrieval.

**Migration Path (Weeks 2-3):**
Once the core functionality is stable and Darra's immediate prep needs are met, we will introduce a programmatic router. This router will evaluate the incoming query complexity. Simple factual retrievals or reformatting tasks can be handed off to a local WebLLM instance (saving API costs and reducing latency), while the Semantic Cache layer will intercept identical or highly similar queries (cosine > 0.92) and return cached responses instantly.

## 6. Activity Variety Generation
A generic output format is useless for a teacher spanning Year 7 to Year 12. The system must generate developmentally appropriate activities using specific prompt patterns. This module must dynamically adjust cognitive load, scaffolding, and engagement mechanisms based on the Stage.

**Year 7-8 (Stage 4):**
*   **Focus:** Engagement, kinaesthetic learning, foundational skill reinforcement, concrete operational tasks. Students at this age require frequent context shifting and highly interactive formats to maintain focus.
*   **Activity Types:** 
    *   *Mathematical Hangman/Pictionary:* For cementing complex vocabulary (e.g., "perpendicular", "isosceles").
    *   *Math Bingo:* Students populate a 4x4 grid with answers; the tutor reads out the questions.
    *   *Relay Races:* Teams solve sequential problems on the whiteboard where each answer feeds into the next question.
    *   *"Find someone who...":* Grid activities where students must ask peers to solve a problem on their sheet.
*   **Prompt Pattern:** `You are an expert Australian educator designing a Stage 4 mathematics lesson. The topic is {Topic}, specifically targeting outcome {Outcome}. Generate a high-energy, 15-minute introductory game that gets students out of their seats. The activity must not require complex materials—only a whiteboard, markers, and printouts. Ensure the rules are extremely simple. Provide a step-by-step guide on how to facilitate the game, including how to handle disruptive behavior or misunderstandings. Generate 10 specific examples of questions/prompts to use within the game.`

**Year 9-10 (Stage 5):**
*   **Focus:** Consolidating abstract concepts, collaborative problem solving, transitioning from concrete to abstract reasoning.
*   **Activity Types:** 
    *   *Partner work ("Think-Pair-Share"):* Encourages mathematical discourse and collaborative error checking.
    *   *Exit Tickets:* Crucial for formative assessment at the end of the lesson to gauge retention.
    *   *Error Analysis ("Spot the Mistake"):* Providing students with a fully worked, but intentionally flawed, solution and asking them to identify and correct the error. This builds higher-order evaluative skills.
*   **Prompt Pattern:** `Design a 20-minute partner activity for Year {Year} mathematics covering {Outcome} ({Content_Code}). Create a set of 4 scaffolded problems escalating in difficulty. For each problem, include a 'deliberate error' version (a fully written out incorrect solution) that students must critique and correct together. The errors should reflect common student misconceptions (e.g., forgetting to distribute a negative sign, misapplying exponent laws). Finally, provide a concise 'Exit Ticket' question to assess understanding at the end of the lesson, along with the ideal student response.`

**Year 11-12 (Stage 6):**
*   **Focus:** Rigor, HSC exam preparation, complex multi-step reasoning, strict adherence to NESA marking guidelines.
*   **Activity Types:** 
    *   *Scaffolded problems:* Breaking down complex 4-mark HSC questions into smaller 1-mark steps.
    *   *Past Paper Integration:* Modifying the parameters of historical HSC questions to create novel practice material.
    *   *Detailed Worked Solutions:* Providing step-by-step breakdowns that explicitly state the marking criteria for each step.
*   **Prompt Pattern:** `Generate a rigorous, 30-minute written practice worksheet for Mathematics {Advanced/Standard 2} covering {Content_Code}. The output must mirror the style, tone, and formatting of official NESA HSC exams. Begin with 3 multiple-choice warm-up questions. Follow with 3 standard application questions (2-3 marks each). Conclude with 1 complex, multi-stage problem (4-5 marks) that requires synthesizing information from multiple topics. Provide fully worked, step-by-step solutions for the tutor, explicitly noting where marks would be awarded according to standard HSC marking bands.`

**Lesson Plan Completer (The 'Glue' Feature):**
Often, a tutor will have a rough slide deck (e.g., generated by Chalkie) but lack the connective tissue between slides. The UI will feature a "Lesson Completer" tool. Darra pastes a rough outline or uploads the PPT text, and the LLM acts as an instructional designer. It will suggest 2-3 specific activity formats that seamlessly bridge the concepts on the slides, ensuring a logical pedagogical flow rather than a disjointed series of lectures.
A generic output format is useless for a teacher spanning Year 7 to Year 12. The system must generate developmentally appropriate activities using specific prompt patterns.

**Year 7-8 (Stage 4):**
*   **Focus:** Engagement, kinaesthetic learning, foundational skill reinforcement.
*   **Activity Types:** Hangman (for mathematical vocabulary), Math Bingo, Relay Races, "Find someone who..." grid activities.
*   **Prompt Pattern:** `You are an expert Australian educator designing a Stage 4 mathematics lesson. The topic is {Topic}. Generate a high-energy, 15-minute introductory game that gets students out of their seats. The activity must not require complex materials—only a whiteboard, markers, and printouts. Ensure the rules are extremely simple.`

**Year 9-10 (Stage 5):**
*   **Focus:** Consolidating abstract concepts, collaborative problem solving.
*   **Activity Types:** Partner work ("Think-Pair-Share"), Exit Tickets for formative assessment, Error Analysis (spotting the deliberate mistake).
*   **Prompt Pattern:** `Design a 20-minute partner activity for Year {Year} mathematics covering {Outcome}. Create a set of 4 scaffolded problems. For each problem, include a 'deliberate error' version that students must critique and correct together. Provide a concise 'Exit Ticket' question to assess understanding at the end of the lesson.`

**Year 11-12 (Stage 6):**
*   **Focus:** Rigor, HSC exam preparation, complex multi-step reasoning.
*   **Activity Types:** Scaffolded problems, integration of past HSC paper questions, detailed worked solutions.
*   **Prompt Pattern:** `Generate a rigorous, 30-minute written practice worksheet for Mathematics {Advanced/Standard 2} covering {Content_Code}. Begin with 3 warm-up questions, followed by 4 standard application questions, and conclude with 2 complex, multi-stage problems mimicking the style of NESA HSC exams. Provide fully worked, step-by-step solutions for the tutor.`

**Lesson Plan Completer:**
The UI will feature a "Lesson Completer" tool. Darra pastes a rough outline (e.g., from a PowerPoint slide), and the LLM suggests 2-3 activity formats that seamlessly bridge the concepts on the slides.

## 7. Personal Voice Calibration
MAIT is not a generic corporate EdTech tool. It acts as Darra's pedagogical exoskeleton and must perfectly emulate his teaching voice.

**The Darra Persona:**
*   **Tone:** Casual but professional, warm, encouraging, age-appropriate.
*   **Dialect/Context:** Strictly Australian English.
*   **Anti-Patterns:** No American spelling (e.g., use 'colour', 'maths' instead of 'math'). Avoid overly formal academic registers, robotic corporate jargon, or generic stock examples (no "apples and oranges").
*   **Preferred Contexts:** Relatable Australian examples (e.g., cricket batting averages, AFL scoring, measuring a backyard for a Hills Hoist, engine capacities of Husqvarnas, wave heights at Bondi).

**Prompt Encoding Implementation:**
Every LLM call will be prepended with a strictly enforced system prompt layer: `[SYSTEM: You are Darra, an exceptional Australian high school maths teacher. Use Australian English spelling (e.g., 'maths', not 'math'). Keep your tone warm, relatable, and slightly casual. When generating word problems, use culturally relevant Australian contexts (e.g., cricket, local suburbs, AFL) instead of generic examples. Never use corporate educational jargon.]`

## 8. Aether Parallelisation
Darra's time is the most constrained resource in this project. The ingestion of complex, badly formatted NESA .docx files cannot consume his 10-15 hour weekly budget. The cognitive load of parsing syllabi, handling weird Microsoft Word formatting artifacts, and structuring JSON must be entirely offloaded. Aether (an autonomous agent running locally on Darra's M1 Macbook) will handle this asynchronously while Darra sleeps.

**The Philosophy of Aether:**
Aether is not just a cron job; it is treated as a junior developer whose sole responsibility is data wrangling and validation. By utilizing Gemini Flash 3, Aether has the context window to read entire syllabus modules and the intelligence to structure them accurately without hardcoded regex brittle-ness.

**The Detailed Overnight Pipeline:**
1.  **Initiation (2:00 AM):** A locally scheduled macOS `launchd` job wakes the M1 Macbook and triggers the `aether_ingest.py` script.
2.  **Extraction & Cleaning:** Aether ingests the raw NESA `.docx` files for the targeted syllabus (e.g., Stage 6 Advanced). It uses `python-docx` to extract text and tables, employing a pre-processing LLM pass to strip out headers, footers, and non-instructional boilerplate.
3.  **Structuring (The Core Task):** The cleaned text is fed into Gemini Flash 3 with a strict JSON schema requirement. The model is instructed to map the content into the defined hierarchical schema: `Subject → Module → Topic → Outcome → Content`. The output is saved to `syllabus_[stage].json`. This JSON file is crucial—it acts as the durable, version-controlled source of truth, meaning the database can be wiped and rebuilt in seconds without re-running the expensive LLM extraction.
4.  **Semantic Embedding:** Aether iterates through the JSON structure, creating semantically dense chunks. Each chunk (targeting ~400 tokens) contains the specific content point, prepended with its full hierarchical path (e.g., "Mathematics Advanced > Calculus > Introduction to Differentiation > The Derivative Function > MA-C1.1"). This hierarchical prepending is vital for the embedding model to grasp the context. The chunks are sent to the OpenAI `text-embedding-3-small` API.
5.  **Database Insertion:** The resulting 1536-dimensional vectors, alongside the raw text and rich JSONB metadata (including the `content_code`), are upserted into the `vector_chunks` table in the local pgvector database.
6.  **Automated Validation Probes:** This is critical. Aether does not just assume success. It runs a suite of automated Python `pytest` retrieval probes. It simulates user queries (e.g., "Find me the outcomes for integration by substitution") and asserts that the returned chunks:
    *   Possess cosine similarities above a strict threshold (e.g., > 0.85).
    *   Contain the correct corresponding `content_code` in their metadata.
7.  **Discord Notification & Reporting (7:00 AM):** Aether utilizes a simple Discord Webhook to ping Darra's private server. 
    *   *Success State:* `[🟢 Aether] SUCCESS: Mathematics Advanced Stage 6 ingested. 452 chunks embedded. 15/15 Validation probes passed. Cost: $0.12.`
    *   *Failure State:* `[🔴 Aether] ERROR: Stage 6 Standard ingestion failed during Structuring phase. JSON schema validation error at line 412. Execution halted to prevent DB corruption. Logs attached.`
    Darra reviews this notification over breakfast. If it's green, he has a newly augmented brain ready for his afternoon classes. If red, he knows he must fall back to manual methods for that specific subject that day.
Darra's time is the most constrained resource in this project. The ingestion of complex, badly formatted NESA .docx files cannot consume his 10-15 hour weekly budget. Aether (an autonomous agent running on an M1 Macbook) will handle this asynchronously.

**The Overnight Pipeline:**
1.  **Initiation:** At 2:00 AM daily, Aether’s cron job triggers the ingestion script.
2.  **Extraction:** Aether parses the raw NESA `.docx` files for the targeted syllabus.
3.  **Structuring:** The content is mapped into the strictly defined hierarchical schema (Subject → Module → Topic → Outcome → Content) and saved to `syllabus.json`. This JSON file acts as the durable, version-controlled source of truth.
4.  **Embedding:** Aether chunks the JSON data (~400 tokens per chunk) and sends it to the OpenAI `text-embedding-3-small` API.
5.  **Database Insertion:** The resulting vectors and rich JSONB metadata are inserted into the `vector_chunks` table in pgvector.
6.  **Validation Probes:** Aether runs a suite of automated retrieval probes (e.g., querying "What are the outcomes for calculus in Stage 6?") and asserts that the returned chunks possess cosine similarities above an acceptable threshold.
7.  **Notification:** At 7:00 AM, Aether sends a webhook notification to Darra's Discord: `[🟢 Aether] Mathematics Advanced Stage 6 successfully ingested. 452 chunks embedded. Validation probes passed. Ready for review.` Darra can briefly approve the logs over breakfast.

## 9. Implementation Sequence (Day-by-Day)
This sequence strictly respects the 10-15 hour weekly budget (averaging 1.5 - 2 hours per day).

### Week 1
*   **Wednesday (Day 1):** Darra: Database schema migrations (`tutor_students`, `vector_documents`, `vector_chunks`, nullable `tutor_id`). Aether: Configured to run Stage 6 Advanced overnight.
*   **Thursday (Day 2):** Darra: Build backend API endpoints for Question Generator (hardcoded to Gemini Flash). Aether: Configured to run Stage 6 Standard 2 overnight.
*   **Friday (Day 3):** Darra: Implement basic CLI/scripts to hit the Question Generator API and test RAG retrieval manually. Aether: Configured to run Stage 5 overnight.
*   **Saturday (Day 4):** Darra (Extended 3hr block): Build foundational UI for the Question Generator. Connect frontend to backend. Aether: Configured to run Stage 4 overnight.
*   **Sunday (Day 5):** Darra: Refine prompt templates for basic question generation. Test system against actual Monday lesson plans. Aether: Runs validation sweeps and data cleanup.
*   **Monday (Day 6):** Darra: First day of teaching! Zero build hours. Aether: Idle.
*   **Tuesday (Day 7):** Darra: Review generated vs. actual lesson effectiveness. Minor bug fixes. Aether: Idle.

### Week 2
*   **Wednesday (Day 8):** Darra: Implement "Activity Variety Generation" prompt patterns for Stage 4/5 (Games, Bingo).
*   **Thursday (Day 9):** Darra: Implement "Activity Variety Generation" prompt patterns for Stage 6 (HSC scaffolded problems).
*   **Friday (Day 10):** Darra: Build UI dropdowns/toggles for selecting Activity Types and Year Levels.
*   **Saturday (Day 11):** Darra (Extended 3hr block): Build the "Lesson Plan Completer" feature. Integrate the manual Gemini 3.1 Pro escalation toggle.
*   **Sunday (Day 12):** Darra: Deep tune the Personal Voice Calibration system prompt layer. Test with Australian contexts.
*   **Monday (Day 13):** Darra: Teaching. Zero build hours.
*   **Tuesday (Day 14):** Darra: Review and refine based on classroom feedback.

### Week 3
*   **Wednesday (Day 15):** Darra: Begin implementing the Semantic Cache layer (database schema for cached queries).
*   **Thursday (Day 16):** Darra: Implement caching logic (cosine similarity > 0.92 check before LLM call).
*   **Friday (Day 17):** Darra: Prototype local SLM routing (WebLLM integration) for basic tasks, if time permits.
*   **Saturday (Day 18):** Darra: Final UI polish and robustness improvements based on two weeks of usage.
*   **Sunday (Day 19):** Darra: Comprehensive review. Document what worked and what failed for post-sprint development.
*   **Monday (Day 20):** Darra: Teaching. Zero build hours.
*   **Tuesday (Day 21):** Darra: Project wrap-up and post-mortem analysis.

## 10. Risks and Mitigations
*   **Risk:** Burnout. 10-15 hours of coding on top of teaching preparation and delivery is unsustainable long-term.
    *   **Mitigation:** Strict enforcement of the build budget. If a feature takes too long, cut it. Mondays are mandatory zero-build days. Rely heavily on Aether for overnight processing.
*   **Risk:** MAIT system failure mid-prep (e.g., database crash, API outage).
    *   **Mitigation:** Fallback to custom Google Gems. Darra must maintain a set of backup prompts in a standard Google Doc that can be pasted directly into the Gemini web interface if the custom backend fails.
*   **Risk:** RAG Hallucinations or poor retrieval (e.g., pulling Stage 4 outcomes for a Stage 6 query).
    *   **Mitigation:** Ensure hybrid search is strictly weighting the `content_code` exact match. Implement a "Source Inspection" button in the UI so Darra can instantly see which syllabus chunks were injected into the context window.

## 11. Validation Criteria
The success of this 3-week sprint is defined by the following measurable, objective criteria. If these are met, the project is a definitive success.

1.  **Prep Time Reduction (Quantitative):** Darra’s average lesson preparation time must be demonstrably reduced by at least 40% compared to his baseline manual preparation time (e.g., reducing a 60-minute prep session to under 35 minutes).
2.  **Aether Autonomy (Quantitative):** Aether successfully ingests all four designated mathematical stages overnight without requiring manual code intervention, regex tweaking, or data cleaning from Darra, logging a 100% success rate on its nightly validation probes.
3.  **Custom Gem Deprecation (Qualitative):** By the conclusion of Week 2, Darra has organically and completely transitioned away from using standalone Google Gems or ChatGPT for prep work, relying entirely on the integrated, RAG-grounded MAIT UI.
4.  **Activity Diversity Utilization (Qualitative):** The system successfully generates at least three distinct types of activities (e.g., a Stage 4 game, a Stage 5 partner activity, and a Stage 6 scaffolded problem) that are demonstrably printed, used, and effective in the actual classroom environment.
5.  **Cache Hit Rate & Latency (Quantitative):** By the end of Week 3, the Semantic Cache layer successfully intercepts and handles at least 15% of all queries. Furthermore, cache hits must return to the UI in under 200ms, proving the viability of the caching architecture for future scaling.
The success of this 3-week sprint is defined by the following measurable criteria:
1.  **Prep Time Reduction:** Darra’s average lesson preparation time is demonstrably reduced by at least 40% compared to baseline manual preparation.
2.  **Aether Autonomy:** Aether successfully ingests all four mathematical stages overnight without requiring manual intervention from Darra, logging a 100% success rate on validation probes.
3.  **Custom Gem Deprecation:** By the end of Week 2, Darra has completely transitioned away from using standalone Google Gems for prep, relying entirely on the integrated MAIT UI.
4.  **Activity Diversity:** The system successfully generates at least three distinct types of activities (e.g., game, partner work, scaffolded problem) that are demonstrably used in the classroom.
5.  **Cache Hit Rate:** By the end of Week 3, the Semantic Cache layer handles at least 15% of all queries, proving the viability of the caching architecture.

## 12. Open Questions
*   **SLM Viability:** Is WebLLM robust enough to handle the classification tasks planned for Week 3 on the client side, or will it drain too much local memory on the M1 while teaching?
*   **Cache Threshold:** Is a cosine similarity threshold of `0.92` too aggressive or too lenient for mathematical syllabus queries? This will require empirical testing during Week 3.
*   **Aether Error Handling:** If Aether’s ingestion pipeline fails at 3:00 AM, should it automatically attempt a retry, or immediately halt and ping Discord to avoid corrupting the vector database? (Recommendation: immediate halt).
