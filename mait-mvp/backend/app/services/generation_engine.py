"""
MAIT Teach Generation Engine (Custom Gem Killer).

Built to Fable_Teach_Revamp_Prompt.md (v3) §2 and Phase B, within the
MAIT_ARCHITECTURE_CANON.md contracts (§2 generation stack, §4 retrieval,
§5 response shape, §8 guardrails).

Separation of concerns (directive §2, canonical interface):
- The PUBLIC engine function `generate_teach_response` does NOT own
  retrieval. It receives the pre-formatted `rag_chunks` string and owns
  prompt assembly + the Gemini structured-output call only.
- The retrieval toolkit (embed_query, retrieve_chunks, build_citations,
  format_rag_chunks) lives in this module — the directive's fence permits
  MOVING the retrieval call into the service — but it is invoked by the
  ROUTER, which passes the formatted result in.

Canonical parameters (directive §2 — exactly these inputs):
    intent, topic, year_level, subject, ability_tier,
    refinements="", rag_chunks, student_context=""

student_context contract (Vesper-derived, directive §2):
- Injected VERBATIM after the intent template as "\\n\\nStudent Context:\\n..."
  ONLY when non-empty. Empty string -> no block, no filler text.
- This engine never produces or parses the profile string; the post-session
  extraction pipeline (future build) owns the format.
- AUTOPHAGY GUARD (Vesper rule): callers must only ever populate this field
  with human-asserted content (tutor observations, outcome taps). Never
  inject previous AI-generated outputs as student context.

Retrieval is LOCKED (directive §2 / Canon §4): the SQL shape, embedding
model, and vector_chunks are unchanged — the call site merely moved.
"""

import asyncio
from enum import Enum
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ExoskeletonResponse
from .gemini_client import get_client
from .prompts import INTENT_TEMPLATES, SYSTEM_INSTRUCTION_CORE
from .security import apply_egress_airlock


class TutorIntent(str, Enum):
    WARMUP = "warmup"
    LESSON_PLAN = "lesson_plan"
    PRACTICE_SET = "practice_set"
    CHALLENGE = "challenge"
    EXPLAIN_ALT = "explain_alt"
    ACTIVITY = "activity"
    CHAT = "chat"


GENERATION_MODEL = "gemini-3.5-flash"
GENERATION_TEMPERATURE = 0.4
GENERATION_MAX_OUTPUT_TOKENS = 8000
GENERATION_TIMEOUT_SECONDS = 60.0

EMBEDDING_MODEL = "models/gemini-embedding-2"
EMBEDDING_DIMENSIONALITY = 768

RETRIEVAL_LIMIT = 3
EMPTY_RETRIEVAL_NOTICE = (
    "No exact topic chunks were retrieved for this subject/topic filter."
)

STUDENT_CONTEXT_HEADER = "Student Context:"

_RETRIEVAL_SQL = text(f"""
    SELECT
        id,
        content,
        content_code,
        subject,
        source_document,
        metadata_json,
        embedding <=> CAST(:query_embedding AS vector) AS distance
    FROM vector_chunks
    WHERE subject = :subject
      AND metadata_json->>'topic' = :topic
    ORDER BY embedding <=> CAST(:query_embedding AS vector)
    LIMIT {RETRIEVAL_LIMIT}
""")

# §4 ratified fallback (07/07/2026): subject-wide cosine, no topic filter.
# Same LIMIT, no distance cap, no year_level filter — looser by design,
# never ungrounded.
_SUBJECT_FALLBACK_SQL = text(f"""
    SELECT
        id,
        content,
        content_code,
        subject,
        source_document,
        metadata_json,
        embedding <=> CAST(:query_embedding AS vector) AS distance
    FROM vector_chunks
    WHERE subject = :subject
    ORDER BY embedding <=> CAST(:query_embedding AS vector)
    LIMIT {RETRIEVAL_LIMIT}
""")


class GenerationEngineError(Exception):
    """Base class for all generation-engine failures."""


class UnsupportedIntentError(GenerationEngineError):
    """The requested intent has no template in INTENT_TEMPLATES."""

    def __init__(self, intent: str):
        self.intent = intent
        super().__init__(f"Unsupported intent: {intent}")


class EmbeddingError(GenerationEngineError):
    """The query embedding call failed."""


class GenerationError(GenerationEngineError):
    """The Gemini generation call failed, timed out, or returned an
    invalid payload that could not be validated as ExoskeletonResponse."""


# ---------------------------------------------------------------------------
# Retrieval toolkit — called by the ROUTER (directive §2: the public engine
# function receives rag_chunks; it does not own retrieval).
# ---------------------------------------------------------------------------

def _embedding_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def _embed_query_sync(query: str) -> list[float]:
    from google.genai import types

    client = get_client()
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=apply_egress_airlock(query),  # R2 airlock: last stop before SDK
        config=types.EmbedContentConfig(
            output_dimensionality=EMBEDDING_DIMENSIONALITY
        ),
    )
    return response.embeddings[0].values


async def embed_query(query: str) -> list[float]:
    """Embed a retrieval query with the ratified corpus model (Canon §2)."""
    try:
        return await asyncio.to_thread(_embed_query_sync, query)
    except Exception as exc:
        raise EmbeddingError(f"Query embedding failed: {exc}") from exc


async def retrieve_chunks(
    db: AsyncSession,
    *,
    subject: str,
    topic: str,
    query_embedding: list[float],
) -> list[dict[str, Any]]:
    """Run the locked retrieval contract (Canon §4) and return row mappings."""
    result = await db.execute(
        _RETRIEVAL_SQL,
        {
            "query_embedding": _embedding_literal(query_embedding),
            "subject": subject,
            "topic": topic,
        },
    )
    return [dict(row) for row in result.mappings().all()]


async def retrieve_chunks_subject_only(
    db: AsyncSession,
    *,
    subject: str,
    query_embedding: list[float],
) -> list[dict[str, Any]]:
    """§4 ratified fallback: subject-wide cosine search over the NESA corpus.

    Used when no topic is selected or the exact-topic filter returns zero
    rows — grounding is preserved (subject scope), never abandoned.
    """
    result = await db.execute(
        _SUBJECT_FALLBACK_SQL,
        {
            "query_embedding": _embedding_literal(query_embedding),
            "subject": subject,
        },
    )
    return [dict(row) for row in result.mappings().all()]


def build_citations(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": str(row["id"]),
            "content_code": row["content_code"],
            "subject": row["subject"],
            "topic": row["metadata_json"].get("topic") if row["metadata_json"] else None,
            "source_document": row["source_document"],
            "distance": float(row["distance"]) if row["distance"] is not None else None,
        }
        for row in rows
    ]


def format_rag_chunks(rows: list[dict[str, Any]]) -> str:
    formatted = "\n\n".join(
        (
            f"[Chunk {index}] content_code={row['content_code'] or 'n/a'} "
            f"topic={(row['metadata_json'] or {}).get('topic') or 'n/a'} "
            f"source={row['source_document'] or 'n/a'}\n{row['content']}"
        )
        for index, row in enumerate(rows, start=1)
    )
    return formatted or EMPTY_RETRIEVAL_NOTICE


# ---------------------------------------------------------------------------
# Generation engine proper
# ---------------------------------------------------------------------------

def build_prompt(
    *,
    intent: str,
    rag_chunks: str,
    year_level: int,
    subject: str,
    ability_tier: str,
    refinements: str,
    student_context: str = "",
) -> str:
    """Fill the intent template. Templates are Chairman-authored and are
    imported verbatim from prompts.py — never rewritten here. Every
    declared placeholder is .format()-supplied on every call.

    Empty rag_chunks (zero retrieval results) is substituted with the
    "No exact topic chunks" notice so the grounding admission rule
    (Canon §5) always has something explicit to work from.

    student_context (directive §2): non-empty -> appended verbatim after
    the intent template as a "Student Context:" block; empty -> nothing.
    """
    if intent not in INTENT_TEMPLATES:
        raise UnsupportedIntentError(intent)

    prompt = INTENT_TEMPLATES[intent].format(
        rag_chunks=rag_chunks.strip() or EMPTY_RETRIEVAL_NOTICE,
        year_level=year_level,
        subject=subject,
        ability_tier=ability_tier,
        refinements=refinements,
    )

    clean_context = (student_context or "").strip()
    if clean_context:
        prompt = f"{prompt}\n\n{STUDENT_CONTEXT_HEADER}\n{clean_context}"
    return prompt


async def generate_structured_response(prompt: str) -> ExoskeletonResponse:
    """Call Gemini with native structured output.

    SYSTEM_INSTRUCTION_CORE rides as the native `system_instruction`
    (verbatim, per the prompts.py usage contract). The parts contract is
    enforced by `response_schema=ExoskeletonResponse`; the typed
    `response.parsed` payload is preferred, with validation fallbacks for
    partial SDK support.

    R2 airlock (RATIFIED 07/07/2026): the final compiled prompt passes
    through the regex egress scrub immediately before the SDK call —
    this is the single choke point for every generation payload,
    including refinements and student_context.
    """
    from google.genai import types

    prompt = apply_egress_airlock(prompt)

    client = get_client()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_INSTRUCTION_CORE,
        temperature=GENERATION_TEMPERATURE,
        max_output_tokens=GENERATION_MAX_OUTPUT_TOKENS,
        response_mime_type="application/json",
        response_schema=ExoskeletonResponse,
    )

    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=GENERATION_MODEL,
                contents=prompt,
                config=config,
            ),
            timeout=GENERATION_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError as exc:
        raise GenerationError(
            f"Gemini generation timed out after {GENERATION_TIMEOUT_SECONDS:.0f}s"
        ) from exc
    except Exception as exc:
        raise GenerationError(f"Gemini generation failed: {exc}") from exc

    try:
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, ExoskeletonResponse):
            return parsed
        if parsed is not None:
            return ExoskeletonResponse.model_validate(parsed)
        response_text = getattr(response, "text", None)
        if not response_text:
            raise ValueError("Gemini returned an empty response body")
        return ExoskeletonResponse.model_validate_json(response_text)
    except GenerationError:
        raise
    except Exception as exc:
        raise GenerationError(
            f"Gemini returned an invalid ExoskeletonResponse payload: {exc}"
        ) from exc


async def generate_teach_response(
    *,
    intent: TutorIntent | str,
    topic: str,
    year_level: int,
    subject: str,
    ability_tier: str,
    refinements: str = "",
    rag_chunks: str,
    student_context: str = "",
) -> ExoskeletonResponse:
    """Generate tutor-facing content: prompt assembly -> Gemini -> validated
    ExoskeletonResponse.

    Canonical interface per Fable_Teach_Revamp_Prompt.md §2. `topic` is part
    of the canonical parameter set (the router also uses it as the retrieval
    filter and embedding fallback); `rag_chunks` arrives pre-formatted from
    the router's retrieval call and passes through to the template
    unmodified. `student_context` must contain only human-asserted content
    (autophagy guard) and is injected verbatim only when non-empty.

    Raises:
        UnsupportedIntentError: intent has no template (caller maps to 400).
        GenerationError: Gemini call failed/timed out/invalid (caller maps to 502).
    """
    intent_key = intent.value if isinstance(intent, TutorIntent) else str(intent)

    prompt = build_prompt(
        intent=intent_key,
        rag_chunks=rag_chunks,
        year_level=year_level,
        subject=subject,
        ability_tier=ability_tier,
        refinements=(refinements or "").strip(),
        student_context=student_context,
    )

    return await generate_structured_response(prompt)
