"""
Optical Extraction Protocol — single-call Gemini Flash vision pipeline.

Accepts a base64-encoded image of a maths question / worksheet section,
calls Gemini Flash multimodal to convert it into native editable LaTeX
fragment objects, and persists them to the database.
"""
import asyncio
import base64
import json
import logging
import os
import time
import uuid
from typing import List, Optional, Tuple

from .gemini_client import get_client, MODEL_ID
from .element_service import create_element, get_elements
from app.logging_config import (
    hash_identifier,
    log_event,
    text_preview,
    usage_metadata_from_response,
)

logger = logging.getLogger(__name__)

VISION_PARSE_SYSTEM_PROMPT = r"""You are a maths worksheet digitizer for NSW HSC Mathematics.
You will receive a photograph of a maths question, diagram, or worksheet section.

Your job is to convert it into an ARRAY of LaTeX fragment objects that can be
directly inserted into a block-based worksheet editor.

OUTPUT FORMAT (strict JSON array, no commentary, no markdown fences):
[
  {
    "kind": "question",
    "label": "Question N — [topic] [M Marks]",
    "content_latex": "\\item The full LaTeX of the question..."
  },
  {
    "kind": "diagram",
    "label": "Diagram — [description]",
    "content_latex": "\\begin{center}\\begin{tikzpicture}...\\end{tikzpicture}\\end{center}"
  }
]

VALID FRAGMENT KINDS: question, diagram, instruction, worked_example, text_block, header, footer

RULES:
1. ALL math must use proper LaTeX: \frac{}{}, \int_{}, \lim_{}, \sin, etc.
2. Each question is its own fragment object. Multi-part questions stay as one fragment.
3. Place marks at the end of each question: \hfill \textbf{[N Marks]}

CRITICAL — DIAGRAM BAIL-OUT GUARDRAIL:
4. If the image contains a SIMPLE graph, number plane, geometric figure, or function plot:
   → Write the TikZ/pgfplots code to recreate it.
   → Use \begin{center}\begin{tikzpicture}...\end{tikzpicture}\end{center}
   → For function graphs, prefer pgfplots: \begin{axis}...\addplot...\end{axis}
5. If the image contains a COMPLEX photograph, intricate biological diagram, real-world
   image, or any diagram you are NOT confident you can recreate accurately in TikZ:
   → DO NOT attempt TikZ.
   → Output the Smart Image Placeholder instead:
   {"kind": "diagram", "label": "Diagram — [brief description]",
    "content_latex": "\\begin{center}\\begin{tcolorbox}[height=6cm, colback=white, colframe=gray!50, dashed]\\centering\\vspace{2.5cm}\\textcolor{gray}{\\textit{[brief description of original image]}}\\end{tcolorbox}\\end{center}"}
6. When in doubt between TikZ and placeholder, CHOOSE THE PLACEHOLDER. A clean
   placeholder that the teacher can stamp over is better than broken TikZ.

ALLOWED PACKAGES (already in preamble): tikz, pgfplots, amsmath, amssymb, tcolorbox"""


def _make_sort_keys_after(after_key: str, count: int) -> List[str]:
    """Generate `count` sort_keys that are lexicographically after `after_key`.

    Uses the convention of appending 'V' + digit so that keys sort correctly
    within fractional-indexing's default alphabet (0-9A-Za-z).
    """
    return [f"{after_key}V{i}" for i in range(count)]


async def vision_parse(
    image_base64: str,
    image_mime_type: str,
    doc_id: str,
    insert_after_sort_key: Optional[str] = None,
    actor_student_id: Optional[str] = None,
) -> Tuple[List[dict], int]:
    """
    Parse an image into LaTeX fragment objects via Gemini Flash vision.

    Returns (saved_elements, placeholders_used).
    """
    from google.genai import types

    # Decode image
    image_bytes = base64.b64decode(image_base64)

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part(
                    inline_data=types.Blob(
                        mime_type=image_mime_type,
                        data=image_bytes,
                    )
                ),
                types.Part(text="Convert this image into LaTeX worksheet fragments."),
            ],
        )
    ]

    config = types.GenerateContentConfig(
        system_instruction=VISION_PARSE_SYSTEM_PROMPT,
        max_output_tokens=2000,
        temperature=0.1,
    )

    client = get_client()
    gemini_request_id = uuid.uuid4().hex
    started = time.perf_counter()
    log_event(
        logger,
        "gemini_request",
        gemini_request_id=gemini_request_id,
        call_site="image_to_fragment_service.vision_parse",
        model=MODEL_ID,
        prompt=text_preview("Convert this image into LaTeX worksheet fragments."),
        system_prompt=text_preview(VISION_PARSE_SYSTEM_PROMPT),
        image_mime_type=image_mime_type,
        image_bytes_length=len(image_bytes),
        document_id_hash=hash_identifier(doc_id),
        student_id_hash=hash_identifier(actor_student_id),
        verification_status="pending_json_parse",
    )
    response = await asyncio.wait_for(
        client.aio.models.generate_content(
            model=MODEL_ID,
            contents=contents,
            config=config,
        ),
        timeout=45.0,
    )

    # Parse JSON from response — strip markdown fences if present
    raw = response.text.strip()
    latency_ms = round((time.perf_counter() - started) * 1000, 2)
    log_event(
        logger,
        "gemini_response",
        gemini_request_id=gemini_request_id,
        call_site="image_to_fragment_service.vision_parse",
        model=MODEL_ID,
        latency_ms=latency_ms,
        response=text_preview(raw),
        **usage_metadata_from_response(response),
        document_id_hash=hash_identifier(doc_id),
        student_id_hash=hash_identifier(actor_student_id),
        verification_status="pending_json_parse",
    )
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1]  # remove opening fence line
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    raw = raw.strip()

    try:
        fragment_data: list = json.loads(raw)
    except Exception as e:
        log_event(
            logger,
            "gemini_verification",
            level=logging.ERROR,
            call_site="image_to_fragment_service.vision_parse",
            gemini_request_id=gemini_request_id,
            error_type=type(e).__name__,
            error_message=str(e),
            response=text_preview(raw),
            document_id_hash=hash_identifier(doc_id),
            student_id_hash=hash_identifier(actor_student_id),
            verification_status="failed",
        )
        raise

    # Determine insertion sort_key
    if not insert_after_sort_key:
        existing = await get_elements(doc_id)
        insert_after_sort_key = existing[-1]["sortKey"] if existing else "a0"

    sort_keys = _make_sort_keys_after(insert_after_sort_key, len(fragment_data))

    # Persist each fragment
    saved: List[dict] = []
    for i, frag in enumerate(fragment_data):
        elem = await create_element(
            document_id=doc_id,
            sort_key=sort_keys[i],
            kind=frag.get("kind", "question"),
            label=frag.get("label", "Scanned Element"),
            content_latex=frag.get("content_latex", ""),
        )
        saved.append(elem)

    # Count placeholder fragments
    placeholders = sum(
        1
        for f in fragment_data
        if "tcolorbox" in f.get("content_latex", "") and "dashed" in f.get("content_latex", "")
    )

    log_event(
        logger,
        "gemini_verification",
        call_site="image_to_fragment_service.vision_parse",
        gemini_request_id=gemini_request_id,
        parsed_element_count=len(fragment_data),
        placeholders_used=placeholders,
        document_id_hash=hash_identifier(doc_id),
        student_id_hash=hash_identifier(actor_student_id),
        verification_status="passed",
    )
    log_event(
        logger,
        "canvas_operation",
        action="vision_parse_inserted_elements",
        document_id_hash=hash_identifier(doc_id),
        student_id_hash=hash_identifier(actor_student_id),
        changed_fields=["document_elements"],
        inserted_count=len(saved),
        placeholders_used=placeholders,
    )
    return saved, placeholders
