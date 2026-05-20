# Comparison Matrix: GPT-5.5 vs Opus vs Gemini 3-Week Sprint Plans

## Source Plans Compared

| Plan | File / ref inspected | Overall stance |
|---|---|---|
| GPT-5.5 | `implementation_plan_3week_sprint_GPT.md` on `docs/emergency-3week-plan-GPT` | Most conservative and sprint-safe. Prioritises a working tutor-prep loop, exact retrieval, hardcoded Week 1 model choice, and Aether-owned ingestion. |
| Opus | `origin/docs/emergency-3week-plan-OPUS:implementation_plan_3week_sprint.md` | Strong strategic framing and good file-level curriculum mapping, but still carries too much Week 1/2 infrastructure ambition for a tired solo builder. |
| Gemini | `docs/emergency-3week-plan-GEMINI:implementation_plan_3week_sprint_GEMINI.md` | Broad and energetic, but internally repetitive, overconfident about automation, and too willing to spend Week 3 on cache/router work instead of hardening. |

## Executive Verdict

The GPT-5.5 plan is the most pragmatic sprint plan because it treats the emergency teaching situation as the primary constraint. It refuses to turn Week 1 into a schema, router, cache, or UI-polish project. It also gives Aether a clear overnight role without assuming flawless autonomy.

Opus is the strongest competitor. It has the best mapping to actual repo syllabus folders and the clearest fallback thinking. Its main weakness is that it smuggles optional architecture into the sprint: manual Pro escalation, WebLLM classifier, semantic cache, healthcheck banners, output logs, and migration/prod smoke-test work all compete with Darra's limited energy.

Gemini is the least safe as a 3-week execution plan. It repeats sections, uses inconsistent model naming, assumes a high degree of Aether success, sets unrealistic validation targets, and schedules semantic caching plus local SLM routing before the core teaching-prep workflow has earned that complexity.

## Aggressive Matrix

| Dimension | GPT-5.5 plan | Opus plan | Gemini plan | Judgement |
|---|---|---|---|---|
| Emergency fit | Frames MAIT as a tutor-only prep accelerator for tomorrow's teaching. Keeps Week 1 wire-first. | Strong emergency framing, but spends more time on system apparatus than the first usable prep path. | Understands the emergency, but the plan reads like a product roadmap compressed into 21 days. | GPT-5.5 wins. Opus is close. Gemini over-scopes. |
| Week 1 model routing | Explicitly hardcoded to Gemini Flash 3.5 + RAG. Complex routing deferred. | Says hardcoded Gemini Flash 3, but adds a manual Pro escalation toggle in Week 1. | Says hardcoded Gemini Flash, but also adds manual Gemini 3.1 Pro escalation and later router/caching language. | GPT-5.5 is the only plan that cleanly obeys the Week 1 hardcode constraint. |
| Backend routing bottlenecks | Avoids router design until there is evidence it is needed. Week 2/3 decision table only if stable. | Adds a manual deep-reasoning branch and stretch WebLLM classifier. This creates UI, API, model-selection, fallback, and testing surfaces. | Adds Pro toggle, semantic cache, and WebLLM/local SLM routing. Also proposes cache hit-rate targets by Week 3. | Opus and Gemini both risk turning routing into the bottleneck. Gemini is worst because cache/router become success criteria. |
| RAG correctness | Centres exact `content_code` match first, then vector fallback, with visible weak-context handling. | Good hybrid retrieval detail, including outcome-code probe accuracy and retrieved codes in UI. | Mentions exact match and source inspection, but relies heavily on automated probes and broad success claims. | GPT-5.5 and Opus are strong. Gemini is acceptable architecturally but too optimistic operationally. |
| Ingestion responsibility | Darra does not write ingestion script. Aether handles overnight `.docx -> syllabus.json -> pgvector`, reports ambiguity. | Aether owns ingestion and validation, with useful source-folder mapping. Says Aether will not modify app code. | Aether runs a detailed Python ingestion stack and pytest probes, with script names and cron details. | GPT-5.5 best matches "Darra does not write ingestion during build hours". Opus is good. Gemini risks making Aether's pipeline itself the project. |
| Aether failure handling | Reports failure, ambiguity, exact-match test results, and next action. Does not assume full success. | Pauses on validation failure and requires morning approval, which is strong. | Expects automated validation and success notifications, but validation targets are too rigid and too early. | Opus is slightly strongest on pause semantics. GPT-5.5 is safer on scope. Gemini is brittle. |
| Time budget realism | 10-15 hours/week with slack, explicit small slices, no native PPT parsing, no cache deliverable. | 34-38 hours total is plausible on paper, but too many context switches: migration, endpoint, UI, activities, completer, WebLLM, cache, healthcheck. | Schedules schema work, backend endpoints, CLI, UI, activity module, lesson completer, Pro toggle, semantic cache, and local SLM prototype. | GPT-5.5 is realistic. Opus is possible only if everything goes cleanly. Gemini is overcommitted. |
| Week 3 priorities | Hardening, weak-context behaviour, copy-friendly outputs, validation, prompt tightening. | Voice calibration, semantic cache, healthcheck, fallback banner, output log. | Semantic cache implementation, local SLM prototype, final UI polish. | GPT-5.5 correctly treats Week 3 as stabilisation. Opus partially does. Gemini treats Week 3 as architecture expansion. |
| Prompt engineering | Uses prompt contracts and year-band-specific output structures without overfitting to novelty. | Good voice rules and stage-specific examples, but includes banned-style prompt fragments like avoiding "deep dive" while also proposing rigid voice constraints that may over-steer. | Provides long prompt templates with too many instructions, including behaviour management and 10 examples inside a single activity prompt. | GPT-5.5 has the cleanest prompt strategy. Gemini's prompts are likely to produce bloated outputs. Opus is vivid but may overfit voice. |
| Activity variety | Separates Year 7-8 games, Year 9-10 partner/error analysis, Year 11-12 HSC rigour. Adds practical fields like prep time and misconception. | Similar stage bands, with strong local examples and lesson completer use case. | Similar stage bands, but repeats sections and pushes full worksheet generation for Stage 6. | GPT-5.5 and Opus are strongest. Gemini's duplication and worksheet-heavy HSC prompt can drift from "activity variety" into another generation product. |
| PowerPoint feedback | Keeps Week 1 as pasted/extracted slide text. Focuses feedback on sequence, clarity, misconceptions, checks, syllabus alignment. | Mentions Chalkie PPT outline and lesson completer, but PowerPoint feedback is less explicit as a first-class use case. | Mentions lesson completer, but less clear on direct PowerPoint feedback criteria. | GPT-5.5 wins on the user-specified PowerPoint use case. |
| Curriculum mapping | Correct priority order and rationale. Does not depend on exact file names. | Best source-document mapping to actual `Syllabi/` paths. | Correct priority order, less grounded in actual repo file structure. | Opus wins file-grounding. GPT-5.5 wins sprint-level priority. |
| Validation metrics | Uses reachable metrics: daily real prep use, 80 percent validation retrieval, three real outputs, visible weak retrieval. | Good retrieval target and fallback target, but "Custom Gem usage drops to zero" may punish a healthy fallback. | 40 percent prep reduction, 100 percent Aether validation success, complete Custom Gem deprecation by Week 2, 15 percent cache hit rate. | GPT-5.5 is most honest. Gemini's metrics are unrealistic. Opus has a few success criteria that conflict with keeping fallbacks alive. |
| Fallback to Custom Gems | Treats fallback as a safety valve, not a failure. | Strong fallback banner and Custom Gem escape hatch. | Mentions fallback prompts in a Google Doc, but validation criteria demand complete deprecation by Week 2. | Opus and GPT-5.5 are aligned. Gemini contradicts itself. |
| Burnout mitigation | Strict scope, Aether-owned ingestion, no late architecture indulgence. | Strong Sunday rest and hard-stop framing. | Mentions zero-build teaching days, but loads the surrounding days heavily. | Opus has the best explicit rest rules. GPT-5.5 has better scope discipline. Gemini underestimates fatigue. |
| Document quality | Clean required sections, no duplicate blocks, pragmatic sequencing. | Clear, structured, strong tables and diagrams. | Contains repeated sections in architecture, activity generation, Aether, and validation. | GPT-5.5 and Opus are production-quality. Gemini needs editing before use. |

## Backend Routing Bottleneck Findings

### Finding 1: Gemini turns routing/caching into a Week 3 deliverable too early

Gemini schedules semantic cache schema, cache logic, and local SLM routing in Week 3, then makes cache hit rate a validation criterion. That is a logic error for Darra's volume and context. Cache value depends on repeated query patterns, and those patterns are unknown until MAIT has been used for real prep. Building cache before stabilising retrieval and prompt contracts risks optimising the wrong layer.

GPT-5.5 is stronger because it makes routing a Week 2/3 option only after the hardcoded path is reliable. The better order is: exact retrieval, visible citations, prompt contracts, weak-context handling, then maybe routing.

### Finding 2: Opus's manual Pro escalation adds more product surface than it admits

Opus presents manual Pro escalation as a simple toggle. In practice, it adds UI state, backend route branching, model configuration, cost controls, logging, prompt variants, and validation for two output behaviours. That may be reasonable after Week 1, but it violates the spirit of "Week 1 hardcoded to Gemini Flash 3.5 + RAG".

The GPT-5.5 plan avoids this bottleneck by making Week 1 a single wire. If a deep-reasoning path is needed, it should be a deliberate Week 2 decision after real failures show up.

### Finding 3: Both Opus and Gemini overvalue SLM routing at Darra's scale

For a single tutor doing prep, API cost and latency are not yet the binding constraint. The binding constraint is whether the system retrieves the right NESA chunk and returns something Darra can use while tired. A local WebLLM classifier is appealing engineering, but it creates a second model stack for little emergency value.

GPT-5.5 makes the right call: a small decision table later, not a router now.

## Prompt Engineering Flaws

### Gemini

- The prompt templates are too large and prescriptive. Asking for behaviour management, activity rules, 10 examples, misconceptions, and full facilitation steps in one generation is likely to produce long, generic outputs that Darra must trim.
- The Stage 6 prompt requests a 30-minute worksheet with multiple-choice, standard application, complex multi-stage problems, and full worked solutions. That is worksheet generation, not activity variety. It may be useful, but it does not directly solve the specified activity-variety use case.
- The voice prompt says "You are Darra". That is too identity-heavy and unnecessary. MAIT should write in Darra's preferred teaching voice, not impersonate him.
- The document repeats prompt sections, which is a sign that the implementation instructions would also be harder to maintain.

### Opus

- Opus's voice section is vivid and locally grounded, but it risks overfitting Australian context examples. Cricket, AFL, Bondi, and Westfield examples can help, but forcing local flavour into every output could become distracting, especially for Stage 6 HSC work.
- The "Lesson plan completer" is useful, but it competes with the four stated primary use cases if it becomes a fifth product mode in Week 2.
- The calibration loop is smart, but diffing 10 rewritten outputs in Week 3 is only realistic if Darra has consistently saved originals and edits during teaching weeks.

### GPT-5.5

- GPT-5.5 is more restrained, but its validation criteria could be slightly tougher around retrieval. "At least 80 percent" is pragmatic, but for exact `content_code` prompts the target should be closer to 95 percent exact-code retrieval once the relevant corpus exists.
- The plan could borrow Opus's explicit source-document mapping from `Syllabi/` to reduce Aether's discovery work.

## Unrealistic Time Estimates

| Plan | Unrealistic estimate | Why it is risky | Better sprint-safe adjustment |
|---|---|---|---|
| Gemini | Week 1 schema migrations, backend endpoints, CLI, UI foundation, prompt refinement, and four overnight corpus runs. | A migration plus working RAG endpoint plus UI is already near the whole Week 1 budget, especially with teaching. | Week 1 should ship one text-in/text-out prep path. UI can be plain. Corpus priority should tolerate failures. |
| Gemini | 100 percent Aether success on nightly validation probes. | `.docx` extraction and syllabus hierarchy parsing are exactly where weird source formatting breaks automation. | Require reportable failures, retry strategy, and manual inspection of JSON as source of truth. |
| Gemini | Complete Custom Gem deprecation by end of Week 2. | Fallback is a safety strategy. Deprecating it during an emergency stint increases risk. | Keep Custom Gems active through Week 3 and measure reduced reliance, not deletion. |
| Gemini | Semantic cache handles 15 percent of all queries by end of Week 3. | Query volume may be too low and too varied. Cache design may not be worth building yet. | Track repeated prompt patterns first. Build cache post-sprint if repetition is real. |
| Opus | Week 1 applies schema to dev and prod, ingests corpora, builds endpoint, wires retriever, calls Gemini, and ships CLI/minimal HTTP. | Possible for a rested backend engineer, but fragile for a teaching week with 10-15 build hours. | Apply migration only if needed for the wire. Stub corpus or use first successful Aether corpus. |
| Opus | Week 2 UI plus activity mode plus lesson-plan completer plus optional WebLLM classifier. | Four surfaces in one week means none gets enough real classroom testing. | Keep two modes: question generation and activity variety. Make PowerPoint feedback text-only. |
| Opus | Week 3 cache and healthcheck/fallback banner/output logging. | Reliability work is good, but cache is not reliability. | Drop cache first if energy slips. Spend Week 3 on bad retrieval cases and output usefulness. |
| GPT-5.5 | Day 5 PowerPoint feedback v1 after concept, questions, retrieval, and activity mode in the same week. | Still ambitious if retrieval is not stable by Day 3. | Keep PowerPoint feedback text-only and allow it to slip to early Week 2 if RAG issues appear. |

## Recommended Final Position

Use the GPT-5.5 plan as the final execution baseline. Borrow two things from Opus:

- The explicit mapping from priority curricula to concrete `Syllabi/` source folders.
- The hard rest rule and fallback banner concept, if cheap.

Do not adopt Gemini's Week 3 semantic cache target, 100 percent Aether autonomy metric, full Custom Gem deprecation, or local SLM prototype schedule. Those are good post-sprint exploration items, but they are bad emergency-sprint commitments.

The safest implementation stance is:

1. Week 1: Gemini Flash 3.5 + RAG, one wire, no router.
2. Week 2: prompt contracts, curriculum coverage, activity variety, validation set.
3. Week 3: retrieval fixes, weak-context handling, PowerPoint feedback polish, copy-friendly outputs, fallback hardening.

Anything beyond that should earn its place by saving Darra prep time during the stint, not by making the architecture feel more complete.
