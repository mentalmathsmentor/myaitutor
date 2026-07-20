"""Cerberus — isolated question verifier (dogfood Phase 2).

ISOLATION CONTRACT (handoff brief, unchanged by approval):
  Input ONLY: {question_text, worked_solution, outcome_or_bloom_tag,
  student_level_tag}. Explicitly NOT passed: syllabus/textbook RAG context,
  generator reasoning, retrieval chunks, student memory. Independence is the
  point — this doubles as the live test of Generator/Evaluator collusion risk.

  The contract is enforced structurally, not by convention:
  - CerberusItem forbids extra fields (pydantic extra="forbid"), so a caller
    cannot smuggle rag_chunks/student_context through the API.
  - build_cerberus_prompt() is a pure function of a CerberusItem; there is no
    DB session, retrieval service, or generator state in this module's
    imports — keep it that way.

  Output: inline suggestion diffs with severity fix/warn/style. No pass/fail
  gate — Cerberus advises, the tutor decides.

Routing is invisible to the tutor: model comes from CERBERUS_MODEL env
(default gemini-3.5-flash), no model plumbing in the UI.
"""

from __future__ import annotations

import asyncio
import os
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

CERBERUS_SYSTEM_INSTRUCTION = """
You are Cerberus, an independent verifier of mathematics tutoring questions. You receive ONE question with its worked solution and two tags. You know nothing else — no syllabus extracts, no generator notes, no student history — and you must not assume any.

Check, in order of importance:
1. CORRECTNESS: is the worked solution mathematically correct, step by step? Recompute everything yourself.
2. WELL-POSEDNESS: is the question unambiguous, self-contained, and solvable with the information given?
3. LEVEL FIT: is the question appropriate for the given student level tag, and consistent with the outcome/Bloom tag?
4. QUALITY: LaTeX validity, units, notation consistency, realistic numbers.

Report findings as inline suggestion diffs:
- severity "fix": mathematically wrong, unsolvable, or contradicts its own answer. Must include a corrected replacement.
- severity "warn": ambiguous, level-mismatched, or pedagogically risky. Replacement optional but preferred.
- severity "style": notation, phrasing, LaTeX, or formatting polish.
For each suggestion: `target` is "question" or "solution"; `span` quotes the EXACT text being replaced (verbatim substring); `replacement` is the proposed new text; `note` is one sentence of rationale.

There is NO pass/fail verdict. An empty suggestions list means you verified it and found nothing to raise. Never rewrite wholesale — smallest viable diffs only. Output only the structured response.
""".strip()


class CerberusSeverity(str, Enum):
    FIX = "fix"
    WARN = "warn"
    STYLE = "style"


class CerberusItem(BaseModel):
    """The complete Cerberus input universe. Do not add fields — widening this
    model is a breach of the isolation contract and needs Darra's ruling."""

    model_config = ConfigDict(extra="forbid")

    question_text: str = Field(..., min_length=1, max_length=8000)
    worked_solution: str = Field(..., min_length=1, max_length=16000)
    outcome_or_bloom_tag: str = Field(..., min_length=1, max_length=200)
    student_level_tag: str = Field(..., min_length=1, max_length=200)


class CerberusSuggestion(BaseModel):
    severity: CerberusSeverity
    target: str = Field(..., pattern="^(question|solution)$")
    span: str
    replacement: str
    note: str


class CerberusResult(BaseModel):
    suggestions: List[CerberusSuggestion] = Field(default_factory=list)


def build_cerberus_prompt(item: CerberusItem) -> str:
    """Pure function of the four contract fields — nothing else may appear."""
    return (
        f"Student level tag: {item.student_level_tag}\n"
        f"Outcome/Bloom tag: {item.outcome_or_bloom_tag}\n\n"
        f"QUESTION:\n{item.question_text}\n\n"
        f"WORKED SOLUTION:\n{item.worked_solution}"
    )


async def verify_item(item: CerberusItem, timeout_s: float = 45.0) -> CerberusResult:
    """Verify one question. Echo/smoke mode (MAIT_PROMPT_ECHO=1) makes no
    external call and returns a deterministic sample suggestion."""
    if os.getenv("MAIT_PROMPT_ECHO") == "1":
        print("=== MAIT_PROMPT_ECHO: cerberus prompt ===")
        print(f"--- system_instruction ---\n{CERBERUS_SYSTEM_INSTRUCTION}")
        print(f"--- user turn ---\n{build_cerberus_prompt(item)}")
        print("=== END MAIT_PROMPT_ECHO ===")
        return CerberusResult(
            suggestions=[
                CerberusSuggestion(
                    severity=CerberusSeverity.STYLE,
                    target="question",
                    span=item.question_text[:40],
                    replacement=item.question_text[:40],
                    note="Echo-mode sample suggestion; no verification performed.",
                )
            ]
        )

    from google.genai import types

    from .gemini_client import get_client

    client = get_client()
    config = types.GenerateContentConfig(
        system_instruction=CERBERUS_SYSTEM_INSTRUCTION,
        temperature=0.1,
        max_output_tokens=4000,
        response_mime_type="application/json",
        response_schema=CerberusResult,
    )
    response = await asyncio.wait_for(
        client.aio.models.generate_content(
            model=os.getenv("CERBERUS_MODEL", "gemini-3.5-flash"),
            contents=build_cerberus_prompt(item),
            config=config,
        ),
        timeout=timeout_s,
    )

    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, CerberusResult):
        return parsed
    if parsed is not None:
        return CerberusResult.model_validate(parsed)
    return CerberusResult.model_validate_json(response.text)


async def verify_batch(
    items: List[CerberusItem], concurrency: int = 4
) -> List[Optional[CerberusResult]]:
    """Verify a deck. Per-item failures degrade VISIBLY (None result, logged) —
    never silently (Vesper risk R-04); the tutor sees 'verification
    unavailable', not fabricated cleanliness."""
    semaphore = asyncio.Semaphore(concurrency)

    async def bounded(item: CerberusItem) -> Optional[CerberusResult]:
        async with semaphore:
            try:
                return await verify_item(item)
            except Exception as exc:  # visible degradation, not a swallow
                print(f"[cerberus] verification failed for item: {exc}")
                return None

    return list(await asyncio.gather(*(bounded(item) for item in items)))
