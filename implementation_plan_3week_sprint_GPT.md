# Implementation Plan: Emergency 3-Week Sprint (GPT)

## 1. Strategic Context

Darayat "Darra" Chowdhury is stepping into a 3-week SLSO teaching stint across Years 7-12. MAIT does not need to become a complete student platform in this window. It needs to become a fast, reliable prep partner for an already-effective teacher who is moving between stages, courses, lesson modes, and student needs with very little spare build time.

The sprint therefore optimises for teacher preparation, not student interaction. Students do not touch MAIT during this 3-week period. The only user is Darra. The product wins if it helps him turn a rough lesson idea, PowerPoint, syllabus dot point, or content code into usable teaching material faster than he could do alone.

The locked architecture is already enough: `tutor_students`, `vector_documents`, `vector_chunks`, nullable `documents.tutor_id`, OpenAI `text-embedding-3-small`, hierarchical ~400-token chunks with JSONB metadata, hybrid pgvector HNSW plus exact `content_code` lookup, and two-step `.docx -> syllabus.json -> pgvector` ingestion. Week 1 should connect those wires, not re-argue them. Aether handles overnight syllabus ingestion; Darra should not spend build hours writing that pipeline.

The primary use cases are:

- PowerPoint feedback: identify weak explanations, missing checks for understanding, sequencing issues, and opportunities to ground slides in NESA outcomes.
- Concept refreshers: give Darra quick, accurate refreshers before he teaches a topic, especially across unfamiliar or older course areas.
- NESA-grounded question generation: produce questions that map to syllabus outcomes and content codes, with appropriate stage and difficulty.
- Activity variety suggestions: convert a standard explanation or worksheet idea into age-appropriate games, partner tasks, mini-whiteboard routines, HSC-style drills, or formative checks.

The sprint succeeds when these use cases become dependable enough to use under time pressure. It does not require perfect automation, broad student analytics, polished student dashboards, or complex AI orchestration. It requires a tight prep loop: upload or paste teaching material, identify the course and content target, retrieve the right syllabus context, produce useful Australian English output, and make it easy for Darra to iterate.

## 2. Scope Cut (Explicit Deferrals)

This sprint must be deliberately narrow. The risk is not lack of ambition; the risk is spending Darra's 10-15 weekly build hours on infrastructure that does not help him prepare lessons during the SLSO window.

Deferred until after the 3-week stint:

- Student login, student accounts, student chat, and student submissions.
- Parent-facing views, class portals, consent flows, or live classroom dashboards.
- Full assessment authoring, marking pipelines, rubric moderation, and long-term analytics.
- School-wide tenancy, complex permissions, LMS integrations, and advanced document lifecycle tooling.
- Automated PowerPoint rewriting or full slide generation.
- Full observability dashboards beyond lightweight logs and webhook reporting.

Deferred inside the 3-week window unless the basics are stable:

- Complex SLM routing. Week 1 stays hardcoded to Gemini Flash 3.5 plus RAG. Week 2 or Week 3 may introduce a tiny decision table only if the core tutor-prep loop is reliable.
- Multi-model evaluation harnesses. Manual review and a small golden set are enough.
- Sophisticated reranking. Exact `content_code` matching plus vector similarity is the v1 shape.
- Deep learner modelling. `tutor_students` can exist for manual notes, but personalisation is light.
- Automatic ingestion repair. Aether reports failures; Darra decides whether to retry, patch JSON, or fall back to Custom Gems.

The key rule is that every sprint task must answer one of two questions:

1. Does this help Darra prepare a better lesson in less time this week?
2. Does this reduce the risk that RAG retrieves or fabricates the wrong syllabus context?

If a task cannot answer one of those questions, it is a deferral.

## 3. The 3-Week Plan

### Week 1: Wire-First Tutor Prep With Gemini Flash 3.5 + RAG

Week 1 should create a working tutor-only prep loop as quickly as possible. The system should be hardcoded to Gemini Flash 3.5 for generation and to the locked hybrid RAG path for syllabus grounding. The aim is not to prove the final architecture. The aim is to make MAIT usable for Darra's immediate prep.

The first working slice should support a single prep input: a plain text paste, extracted slide text, or a short lesson description. The user selects or types a subject, stage/course, and content code where known. MAIT retrieves matching chunks using exact `content_code` lookup first, then semantic similarity if the code is missing or partial. The prompt receives the retrieved syllabus context, the tutor's request, and voice rules. The output returns a practical teaching response with visible curriculum grounding and suggestions Darra can use immediately.

Week 1 user-visible modes:

- Concept refresher: "Remind me how to teach this clearly."
- Question generator: "Give me NESA-grounded questions for this outcome."
- Activity variety: "Make this more engaging for this year group."
- PowerPoint feedback, v1: "Review the extracted slide text and tell me what to improve."

PowerPoint feedback in Week 1 does not need native slide rendering. It can accept extracted slide text, pasted speaker notes, or a rough outline. That is enough for the sprint goal. The feedback should focus on teaching sequence, clarity, misconceptions, opportunities for checks for understanding, and alignment to the retrieved syllabus chunks.

Week 1 backend behaviour:

- Hardcode Gemini Flash 3.5 as the generation model.
- Use `text-embedding-3-small` for any new corpus embeddings.
- Query RAG with `content_code` exact match first where present.
- Fall back to vector similarity with metadata filters for subject, stage, module, and topic.
- Include retrieved metadata in logs so Darra can quickly inspect whether the right syllabus context was used.
- Return concise citations in the response: content code, outcome, topic, and source document title.

Week 1 acceptance target: Darra can use MAIT for at least one real prep task per teaching day, even if the interface is plain.

### Week 2: Reliability, Coverage, and Better Prompt Contracts

Week 2 should improve trust. By this point, Aether should have ingested the priority syllabuses overnight. Darra's build time should go into tightening retrieval behaviour, response formats, and the most painful teaching prep workflows discovered in Week 1.

The main product improvement is prompt contract discipline. Each tool should return predictable sections, not a wandering essay. For example, PowerPoint feedback should return: "What works", "Fix before teaching", "Syllabus alignment", "Checks for understanding", and "One fast upgrade". Question generation should return a question set grouped by difficulty, with answers and the exact syllabus link used. Activity variety should return options by classroom energy level and preparation time.

Week 2 may introduce a basic routing decision, but only if there is a real need. Complex SLM routing remains deferred. A reasonable Week 2 route is a simple branch between:

- RAG-grounded curriculum prep for syllabus-sensitive tasks.
- Non-RAG creative variation for low-stakes activity brainstorming, still using the selected year group and topic.

Even this should be conservative. Most outputs should still include retrieved curriculum context because Darra's highest-value use cases are NESA-grounded.

Week 2 should also add a small validation set: 20-30 prompts across Stage 4, Stage 5, Mathematics Standard 2, and Mathematics Advanced, each with the expected content code or topic and a short judgement note.

Week 2 acceptance target: for the priority curriculum areas, MAIT retrieves the expected syllabus context most of the time, and Darra trusts the structure of the outputs enough to skim and use them quickly.

### Week 3: Teaching-Week Hardening and Practical Polish

Week 3 is the hardening week. The product should be tuned around the workflows Darra actually used in Weeks 1 and 2.

Expected Week 3 work:

- Improve empty-state and failure-state handling.
- Add stronger "insufficient context" behaviour when RAG does not retrieve enough relevant syllabus material.
- Tighten response length controls for time-poor prep.
- Improve PowerPoint feedback prompts with common slide-level teaching checks.
- Add export-friendly formatting for generated questions and activities.
- Add a small "copy into slides" or "copy into worksheet" output shape if the existing app patterns make this cheap.
- Review activity variety prompts across Year 7-12 for age fit.
- Triage any recurring retrieval mistakes from logs and Aether reports.

If complex routing has still not become necessary, it should remain deferred. A stable hardcoded system is more valuable than a clever but brittle router during an emergency teaching stint. If routing is introduced, it should be explicitly limited to two or three task types, with a fallback to the Week 1 Gemini Flash 3.5 + RAG path.

Week 3 acceptance target: MAIT is boringly useful. Darra can open it during prep, ask for help, receive grounded output, and move on without debugging the system.

## 4. Year 7-12 Curriculum Mapping

Curriculum ingestion and validation should follow teaching value and risk:

1. Mathematics Advanced Stage 6.
2. Mathematics Standard 2 Stage 6.
3. Stage 5 Mathematics.
4. Stage 4 Mathematics.

Mathematics Advanced Stage 6 comes first because HSC-aligned teaching has the highest precision requirement. When Darra asks for a concept refresher or question set in Advanced, the response must respect course language, outcome boundaries, and expected rigour. Weak alignment here is more damaging than a slightly generic Year 7 activity.

Mathematics Standard 2 Stage 6 is second because it has a different course identity and should not be treated as a lighter copy of Advanced. The system must preserve the Standard 2 emphasis on application, modelling, interpretation, and accessible but still rigorous HSC preparation. Prompting should avoid accidentally drifting into Advanced-only assumptions.

Stage 5 is third because Years 9-10 often require careful bridging. Darra needs material that can support consolidation, extension, and mixed readiness. Stage 5 retrieval should make outcomes and content groupings easy to inspect, especially when a class is moving toward Stage 6 readiness.

Stage 4 is fourth, but not because it is unimportant. Stage 4 needs strong activity design and clarity. However, the immediate risk of high-stakes syllabus misalignment is lower than Stage 6. Stage 4 outputs should focus on conceptual clarity, classroom energy, concrete examples, and confidence-building.

For each corpus, Aether should produce:

- A durable `syllabus.json` file.
- A count of documents, chunks, outcomes, and content codes.
- A list of content codes that failed validation or appeared ambiguous.
- A sample retrieval report for 5-10 representative codes.
- A Discord webhook summary after each overnight run.

Manual validation should focus on content-code retrieval. If exact code search fails for a priority corpus, that is a Week 1 or Week 2 blocker because it undermines the RAG trust model.

## 5. Simplified Architecture

The sprint architecture is intentionally plain:

1. Tutor prep input enters MAIT through a tutor-only surface.
2. The request is classified by the selected tool, not by a complex autonomous router.
3. The system builds a retrieval query from subject, stage/course, module/topic, and optional `content_code`.
4. Hybrid retrieval fetches syllabus chunks from `vector_chunks`.
5. The prompt is assembled with retrieved context, task instructions, voice rules, and output format.
6. Gemini Flash 3.5 generates the response.
7. The UI shows the answer with visible curriculum grounding and a quick way to iterate.

The Week 1 philosophy is wire-first. The goal is a complete, usable path even if parts are plain, manual, or hardcoded. Hardcoded model choice, a narrow prompt builder, minimal UI, and manual corpus validation are all acceptable. A half-built sophisticated system is not.

The nullable `tutor_id` on `documents` is a pragmatic emergency bypass, not a long-term auth precedent. The tutor-only assumption is correct because the user population is exactly one teacher.

The RAG layer should be conservative. If the request includes a content code, exact metadata match should be the first retrieval path. If the exact match returns enough chunks, vector search should supplement rather than replace it. If the exact match fails, the response should say so internally through logs and, where helpful, visibly in the answer: "I could not find an exact match for `MA-C1.1`; I used nearby syllabus context instead." That honesty matters more than smoothness.

## 6. Activity Variety Generation

Activity variety is one of the highest-leverage use cases because it turns a normal explanation into a better classroom moment without requiring Darra to redesign an entire lesson. The prompt strategy should vary strongly by year group.

For Years 7-8, the prompt should favour games, movement, short rounds, visible thinking, low-stakes competition, and concrete representations. Outputs should include activities like card sorts, mini-whiteboard relays, matching tasks, "which one doesn't belong", quick estimation challenges, team problem trails, and teacher-led whole-class games. The model should be told to keep rules simple, avoid heavy setup, and include a quiet version for classes that need calmer pacing.

For Years 9-10, the prompt should favour partner work, structured discussion, error analysis, and productive struggle. Students at this stage often benefit from comparing methods, explaining reasoning, and identifying misconceptions. Outputs should include paired worked-example repair, two-method comparison, reciprocal teaching, ranking tasks, mini-debates about solution strategies, and short investigation prompts. The prompt should ask for a version that supports mixed readiness: a core entry task, an extension move, and a support scaffold.

For Years 11-12, activity variety should not mean making everything playful. The emphasis should be rigorous HSC preparation, precise language, exam technique, and conceptual depth. Outputs should include HSC-style question ladders, proof or reasoning prompts where appropriate, timed retrieval practice, common-error diagnosis, marking-criteria unpacking, and "explain why this method works" tasks. The model should be directed to preserve rigour while still adding variety. For example, a Year 12 activity can be engaging because it asks students to compare two plausible solutions and defend the more efficient one.

Every activity response should include:

- Year group fit.
- Prep time.
- Materials.
- Steps.
- Teacher moves.
- Likely misconception.
- Fast exit ticket.
- How it connects to the retrieved syllabus context.

This structure keeps activity suggestions useful under time pressure.

## 7. Personal Voice Calibration

MAIT should sound like a useful Australian colleague, not a corporate teaching manual. The voice should be warm, casual but professional, and direct. Australian English should be the default: "maths", "Year 11", "marking criteria", "worked example", "class", "students", and "lesson" should feel natural.

The system should not overpraise Darra or produce motivational filler. It should respect him as an expert teacher. Useful phrasing looks like:

- "This is teachable as-is, but the middle step needs a clearer bridge."
- "I'd add one quick check here before the class practises independently."
- "For Year 8, make this more physical and lower the writing load."
- "For HSC prep, keep the context but increase the demand by asking students to justify the method."

The model should be encouraged to be specific, practical, and classroom-aware. It should avoid vague advice like "make it engaging" unless it immediately follows with a concrete activity. It should avoid American school language unless present in the source material. It should not apologise at length. When context is missing, it should ask one short follow-up or state the assumption it used.

Voice calibration should be encoded in shared prompt rules so all four prep tools feel like the same colleague. PowerPoint feedback can be more direct. Activity generation can be a little warmer. HSC question generation should be precise and restrained. Concept refreshers should be clear and confidence-building.

## 8. Aether Parallelisation

Aether's role is to protect Darra's build hours. It should handle overnight NESA syllabus ingestion, one subject corpus per night, using Gemini Flash 3.5 as needed for extraction and transformation. Darra should wake up to a report, not a half-finished ingestion task.

The overnight pipeline is:

1. Take the source syllabus `.docx`.
2. Convert it into structured `syllabus.json`.
3. Validate the JSON shape against the expected hierarchy: Subject, Module, Topic, Outcome, Content.
4. Chunk content at roughly 400 tokens with JSONB metadata.
5. Embed chunks using `text-embedding-3-small`.
6. Insert into `vector_documents` and `vector_chunks`.
7. Run spot retrieval tests against known content codes.
8. Send a Discord webhook report.

The Discord report should include:

- Corpus name and source file.
- Start and finish time.
- Number of documents and chunks created.
- Number of outcomes and content codes parsed.
- Embedding success or failure count.
- Exact-match retrieval test results.
- Any ambiguous headings or missing fields.
- Recommended next action for Darra.

Aether should not silently "fix" syllabus ambiguity in ways that change meaning. If headings are unclear, it should preserve source text in JSON and report the ambiguity. JSON is the durable source of truth, so it must be reviewable and repairable. Pgvector can always be rebuilt from JSON.

The overnight order should follow the curriculum priority list. If a corpus fails, Aether should report the failure and continue with the next planned corpus on the following night only if Darra has enough usable coverage. Otherwise, the failed corpus becomes the next night's retry.

## 9. Implementation Sequence (Day-by-Day)

This schedule assumes 10-15 build hours per week. The plan intentionally leaves slack because Darra is also teaching.

### Week 1

Day 1, 2-3 hours: Confirm the branch, create the tutor-only prep surface, and wire a single request path from input to generation. Hardcode Gemini Flash 3.5. Add the first shared prompt contract with Australian English voice rules. Use a small manually selected syllabus context if the full corpus is not ready yet.

Day 2, 2 hours: Wire hybrid retrieval. Prioritise exact `content_code` lookup, then vector fallback. Return retrieved metadata in the response or debug panel. Create basic "insufficient context" behaviour.

Day 3, 2 hours: Implement concept refresher and NESA-grounded question generation as two explicit tool modes. Keep outputs structured and short enough to skim.

Day 4, 2 hours: Add activity variety generation. Tune separate prompt branches for Years 7-8, Years 9-10, and Years 11-12. Test at least one prompt per band.

Day 5, 2-3 hours: Add PowerPoint feedback v1 using pasted or extracted slide text. Focus on teaching sequence, missing checks, misconceptions, and syllabus alignment. Review the week's real prep outputs and note the top three friction points.

Aether overnight in Week 1: ingest Mathematics Advanced Stage 6 first, then Mathematics Standard 2 Stage 6 if the first corpus succeeds.

### Week 2

Day 6, 1-2 hours: Review Aether reports. Fix corpus metadata problems that block exact content-code retrieval. Do not chase cosmetic JSON cleanup unless it affects retrieval.

Day 7, 2 hours: Tighten prompt contracts for all four tools. Add predictable headings and stricter output limits.

Day 8, 2-3 hours: Build the 20-30 prompt validation set across the four priority curriculum areas. Include expected content codes and short human judgement notes.

Day 9, 2 hours: Improve retrieval filters for stage/course, module, and topic. Add logging that makes bad retrieval easy to diagnose.

Day 10, 2-3 hours: Decide whether limited Week 2/3 routing is justified. If not, keep the hardcoded path. If yes, add only a tiny decision table for RAG-sensitive versus low-stakes creative tasks.

Aether overnight in Week 2: ingest Stage 5, then Stage 4. Rerun any failed Stage 6 corpus before moving down the priority list if Stage 6 coverage is not trustworthy.

### Week 3

Day 11, 2 hours: Harden failure states. Make missing content codes, weak retrieval, and empty corpora obvious rather than hidden.

Day 12, 2 hours: Improve PowerPoint feedback based on actual teaching prep. Add targeted checks for lesson flow, cognitive load, student practice, and misconceptions.

Day 13, 2 hours: Add copy-friendly output shapes for question sets, activities, and slide feedback. Keep formatting simple.

Day 14, 2-3 hours: Run the validation set manually. Mark failures as retrieval, prompt, corpus, or expectation problems. Fix only the highest-impact issues.

Day 15, 2-3 hours: Final polish and sprint review. Document what is reliable, what requires teacher judgement, and what should wait until after the SLSO stint.

## 10. Risks and Mitigations

Burnout is the biggest delivery risk. Darra has 10-15 build hours per week, but he is also teaching across Years 7-12. The mitigation is strict scope discipline, hardcoded Week 1 choices, and Aether-owned ingestion. Any task that creates a late-night debugging hole should be questioned.

The Custom Gems fallback is a real safety valve. If MAIT's app path is unstable, Darra can still use curated Gemini Custom Gems with pasted syllabus context or exported JSON snippets. The sprint should not treat that as failure. It is a continuity plan that protects teaching quality while the product hardens.

RAG hallucination is the biggest product risk. Mitigations include exact content-code retrieval, visible citations, "insufficient context" behaviour, manual validation prompts, and conservative language. The model should never imply syllabus certainty when retrieval is weak.

Corpus ingestion errors are likely. The `.docx` source may contain headings, tables, or formatting that do not map cleanly into JSON. The mitigation is to keep `syllabus.json` durable, inspectable, and rebuildable. Aether reports should make ambiguity visible.

Overengineering is a recurring risk. Complex SLM routing, agentic planning, and broad UI polish can all consume the sprint. The mitigation is to keep Week 1 hardcoded, Week 2 evaluative, and Week 3 stabilising.

Model quality drift is possible. Gemini Flash 3.5 may produce overly generic activity ideas or under-rigorous HSC material. The mitigation is strong prompt contracts, year-band-specific instructions, and examples from Darra's actual teaching style.

## 11. Validation Criteria

The sprint should be judged by measurable teaching-prep outcomes, not by architectural elegance.

By the end of Week 1:

- Darra can complete at least one real prep task per teaching day using MAIT.
- The system can produce a concept refresher, question set, activity variation, and PowerPoint feedback from tutor input.
- Responses include visible curriculum grounding when corpus context exists.
- Exact `content_code` retrieval works for the first priority corpus.

By the end of Week 2:

- Mathematics Advanced Stage 6 and Mathematics Standard 2 Stage 6 are usable through RAG.
- Stage 5 and Stage 4 ingestion is complete or has clear Aether failure reports.
- A 20-30 prompt validation set exists.
- At least 80 percent of validation prompts retrieve the expected syllabus area or a clearly acceptable neighbouring chunk.
- Darra can skim the output structure without rewriting the prompt each time.

By the end of Week 3:

- MAIT saves Darra at least 30 minutes across three separate prep sessions in a week.
- At least three generated outputs are used directly or lightly adapted for actual lessons.
- PowerPoint feedback identifies at least one useful improvement in two real slide outlines.
- Activity variety outputs feel age-appropriate across Years 7-8, Years 9-10, and Years 11-12.
- Weak retrieval cases are visible and handled honestly.
- Darra has a clear post-sprint backlog rather than a pile of half-finished emergency features.

## 12. Open Questions

- Which exact Year 7-12 classes will Darra teach first, and does that change the overnight ingestion order within the locked priority list?
- What is the minimum PowerPoint input format for Week 1: pasted slide text, uploaded file text extraction, or manually copied outlines?
- Where should retrieved syllabus metadata appear in the UI: inline under the answer, in a collapsible context panel, or in debug-only logs?
- How much student profile data is worth entering manually into `tutor_students` during the 3-week stint?
- Which content codes should seed the Week 2 validation set for Mathematics Advanced, Mathematics Standard 2, Stage 5, and Stage 4?
- Does Darra prefer terse outputs by default, with an "expand" option, or fuller first drafts?
- What is the exact Discord webhook format Aether should use so overnight reports are easy to scan on a teaching morning?
- After the sprint, should MAIT invest first in student-facing workflows, better document handling, or a more formal routing/evaluation layer?
