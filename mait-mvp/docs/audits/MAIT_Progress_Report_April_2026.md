# MAIT Strategic Alignment & Progress Report
**Date:** 9th April 2026

This document presents a strategic comparison between the current codebase state (specifically referencing the work completed on `feature/hybrid-worksheet-input`), the **MAIT Native Canvas Implementation Plan**, and the overarching **MAIT Investor Vision**.

---

## 1. Fulfillment of the "Native Canvas" Implementation Plan
The *Native Canvas Implementation Plan* describes a structured transition away from off-platform Gemini generation toward a dual-purpose, on-platform Artifact Canvas and Study Canvas. 

**Where we stand today:**
* **Pre-requisite UI Overhaul Complete:** The Native Canvas plan explicitly dictated that the existing `WorksheetStudio` frontend must *"preserve current syllabus/topic/pedagogy setup"* and act as the primary launchpad (incorporating a future "Open in Canvas" button). 
* **The Hybrid-Input Refactor Impact:** By obliterating the confusing A/B Official vs. Manual tabs and merging them into a linear vertical stack today, we have successfully created the unified visual intake form required to cleanly pipe data into the upcoming backend `document_service`. The input form is no longer a disjointed state machine, but a single stream of context perfectly primed for Phase 1 of the Canvas architecture.
* **Fallback Systems Maintained:** The plan required that external Gemini launching remain available as a fallback until the Native Canvas stabilizes. That infrastructure remains wholly untouched and operational on this branch.

## 2. Alignment with the Overall Vision (Investor One-Pager)
The *MAIT Vision Document* strongly anchors the platform's unique selling proposition on being an **expert, math-focused, specific tool for the Australian curriculum** (specifically HSC Mathematics Advanced) rather than a generic chatbot.

**Where we stand today:**
* **Enforcing the "Math First" Philosophy:** Modifying `stage_subjects.json` to brutally force Mathematics as the first default subject from Early Stage 1 to Stage 6 directly serves the Vision Document. It immediately immerses new prospects and investors in the math-centric use case.
* **Curriculum Locking (Boundary Enforcement):** By explicitly building UI blockers for unreleased subjects like English and Biology ("No predefined topic list exists for this subject yet. Switch to manual entry"), we strictly enforce the platform's promise of high-fidelity, verified mathematics generation. We block users from creating hallucinatory outputs using generic LLM logic natively, thereby protecting brand trust during the 2026 pilot.

## 3. Intersection with Pipeline Refactoring Goals
The overarching `MAIT_REFACTOR_PLAN.md` targets heavy technical debt reduction prior to launching Native Canvas. 
* **Feedback Mechanism Safety:** The Refactor Plan highlights adding rate limits (`@limiter.limit("5/minute")`) and strict CORS protections. By shrinking the Feedback box UI physically to sit beneath the FAQ, isolating its endpoint API URL dynamically, enforcing CORS explicitly, and tightening the rate limits down to `1/minute`, we have directly advanced the security hardening mandates set out in the Refactor blueprint.

## 4. Next Steps to Proceed
With the Worksheet UI intake flow now streamlined, secure, and visually appealing, the architectural runway is completely clear to begin **Phase 1 of Native Canvas**:
1. **Zustand Architecting:** Offload application memory into global state stores so Canvas components can parse context without prop-drilling.
2. **Backend Persistence Layers:** Provision SQLite models (`Document`, `ArtifactDocumentBody`) on Uvicorn.
3. **The "Open in Canvas" Hook:** Wire the new Hybrid Worksheet Input data straight into the `documents/compile` backend router to bypass Google Gemini off-platform interactions forever.
