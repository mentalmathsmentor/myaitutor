"""
MAIT Teach Generation Engine.

Extracted from the /api/chat/generate router (Teach Endpoint Revamp, Phase B).
Owns the full generation pipeline for tutor-facing content:

    embed query -> pgvector retrieval -> prompt assembly -> Gemini structured
    output -> validated ExoskeletonResponse

The router keeps ownership checks (tutor/class/thread) and message
persistence; this module is HTTP-free and ORM-entity-free.

Explicit parameter interface (LOCKED):
    generate_teach_response(db, *, intent, topic, subject, year_level,
                            ability_tier, refinements)
Scalar, keyword-only parameters. No Request objects, no ORM entities,
no untyped dict payloads across this boundary.

Canon compliance (MAIT_ARCHITECTURE_CANON.md):
- §2: gemini-3.5-flash, max_output_tokens=8000, native structured output
  (response_mime_type="application/json" + response_schema).
- §2/§3: embeddings via models/gemini-embedding-2 @ output_dimensionality=768.
- §4: retrieval = subject + exact metadata_json->>'topic', cosine order,
  LIMIT 3, NO year_level filter, NO distance cap.
- §5: response shape is ExoskeletonResponse from app/models.py (unchanged).
"""

import asyncio
from dataclasses import dataclass, field
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ExoskeletonResponse
from .gemini_client import get_client
from .prompts import INTENT_TEMPLATES, SYSTEM_INSTRUCTION_CORE

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


@dataclass(frozen=True)
class GenerationResult:
    """Everything the caller needs to respond and persist."""

    response: ExoskeletonResponse
    citations: list[dict[str, Any]] = field(default_factory=list)
    rag_chunks: str = ""


def _embedding_literal(values: list[float]) -> str:
    return "[" + ",".join(str(float(value)) for value in values) + "]"


def _embed_query_sync(query: str) -> list[float]:
    from google.genai import types

    client = get_client()
    response = client.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=query,
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


def build_prompt(
    *,
    intent: str,
    rag_chunks: str,
    year_level: int,
    subject: str,
    ability_tier: str,
    refinements: str,
) -> str:
    """Fill the intent template. Templates are Chairman-authored and are
    imported verbatim from prompts.py — never rewritten here."""
    if intent not in INTENT_TEMPLATES:
        raise UnsupportedIntentError(intent)
    return INTENT_TEMPLATES[intent].format(
        rag_chunks=rag_chunks,
        year_level=year_level,
        subject=subject,
        ability_tier=ability_tier,
        refinements=refinements,
    )


async def generate_structured_response(prompt: str) -> ExoskeletonResponse:
    """Call Gemini with native structured output (Phase C).

    SYSTEM_INSTRUCTION_CORE rides as the native `system_instruction`
    (verbatim, per the prompts.py usage contract) instead of being
    concatenated into the user turn. The parts contract is enforced by
    `response_schema=ExoskeletonResponse`; the typed `response.parsed`
    payload is preferred, with validation fallbacks for partial SDK
    support.
    """
    from google.genai import types

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
    db: AsyncSession,
    *,
    intent: str,
    topic: str,
    subject: str,
    year_level: int,
    ability_tier: str,
    refinements: str | None = None,
) -> GenerationResult:
    """Full teach pipeline: embed -> retrieve -> prompt -> generate.

    Raises:
        UnsupportedIntentError: intent has no template (caller maps to 400).
        EmbeddingError: embedding call failed (caller maps to 502).
        GenerationError: Gemini call failed/timed out/invalid (caller maps to 502).
    """
    clean_refinements = (refinements or "").strip()

    # Free text rides in refinements as the embedding text; topic is the
    # exact-match filter, and the fallback embedding text (Canon §4).
    query_text = clean_refinements or topic
    query_embedding = await embed_query(query_text)

    rows = await retrieve_chunks(
        db,
        subject=subject,
        topic=topic,
        query_embedding=query_embedding,
    )
    citations = build_citations(rows)
    rag_chunks = format_rag_chunks(rows)

    prompt = build_prompt(
        intent=intent,
        rag_chunks=rag_chunks,
        year_level=year_level,
        subject=subject,
        ability_tier=ability_tier,
        refinements=clean_refinements,
    )

    response = await generate_structured_response(prompt)
    return GenerationResult(
        response=response,
        citations=citations,
        rag_chunks=rag_chunks,
    )
