"""Legacy SQLite data access. Preserved for rollback reference. Do not import."""
import asyncio
import os
import uuid
from datetime import datetime
from typing import Optional, List

import aiosqlite
from .storage import _DB_PATH
from .gemini_client import get_client, MODEL_ID

FRAGMENT_REVISION_SYSTEM_PROMPT = r"""You are a LaTeX worksheet editor for NSW HSC Mathematics.
You will receive ONE fragment of a LaTeX worksheet and an editing instruction.

RULES:
1. Output ONLY the revised LaTeX fragment. No commentary, no markdown fences.
2. Preserve the exact LaTeX style, packages, and formatting conventions of the input.
3. Do NOT add \documentclass, \begin{document}, or \end{document} — you are editing a fragment.
4. ALL math must use proper LaTeX: \frac{}{}, \int_{}, \lim_{}, etc.
5. If the instruction asks to add content, add it seamlessly within the fragment.
6. If the instruction is ambiguous, err on the side of minimal change."""


def _build_revision_prompt(kind: str, label: str, content_latex: str, instruction: str) -> str:
    return f"""FRAGMENT KIND: {kind}
FRAGMENT LABEL: {label}

CURRENT CONTENT:
{content_latex}

INSTRUCTION: {instruction}

Output the revised fragment only."""


async def create_revision(element_id: str, instruction: str) -> dict:
    """
    Request an AI revision for a specific element.

    1. Fetches the element to snapshot its current content.
    2. Calls Gemini to produce a revised LaTeX fragment.
    3. Stores the revision in document_revisions with status='pending'.
    4. Returns the revision dict.
    """
    from google.genai import types

    # 1. Fetch the element
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, document_id, kind, label, content_latex FROM document_elements WHERE id = ?",
            (element_id,),
        )
        row = await cursor.fetchone()
        if not row:
            raise ValueError(f"Element {element_id} not found")

    document_id = row["document_id"]
    kind = row["kind"]
    label = row["label"]
    input_snapshot = row["content_latex"]

    # 2. Call Gemini
    user_prompt = _build_revision_prompt(kind, label, input_snapshot, instruction)
    config = types.GenerateContentConfig(
        system_instruction=FRAGMENT_REVISION_SYSTEM_PROMPT,
        max_output_tokens=1500,
        temperature=0.3,
    )

    client = get_client()
    try:
        response = await asyncio.wait_for(
            client.aio.models.generate_content(
                model=MODEL_ID,
                contents=user_prompt,
                config=config,
            ),
            timeout=30.0,
        )
        output_snapshot = response.text.strip()
    except Exception as e:
        # Store a failed revision
        rev_id = f"rev_{uuid.uuid4().hex[:12]}"
        now = datetime.now().isoformat()
        async with aiosqlite.connect(_DB_PATH) as db:
            await db.execute(
                """INSERT INTO document_revisions
                   (id, document_id, element_id, instruction_text, provider, input_snapshot, output_snapshot, status, created_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (rev_id, document_id, element_id, instruction, "gemini", input_snapshot, "", "failed", now),
            )
            await db.commit()
        raise RuntimeError(f"Gemini revision failed: {e}")

    # 3. Store revision
    rev_id = f"rev_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()

    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """INSERT INTO document_revisions
               (id, document_id, element_id, instruction_text, provider, input_snapshot, output_snapshot, status, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (rev_id, document_id, element_id, instruction, "gemini", input_snapshot, output_snapshot, "pending", now),
        )
        await db.commit()

    return {
        "id": rev_id,
        "document_id": document_id,
        "element_id": element_id,
        "instruction_text": instruction,
        "provider": "gemini",
        "input_snapshot": input_snapshot,
        "output_snapshot": output_snapshot,
        "status": "pending",
        "created_at": now,
    }


async def apply_revision(revision_id: str) -> dict:
    """
    Apply a pending revision: update the element's content_latex to the revision's output.
    """
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT * FROM document_revisions WHERE id = ?", (revision_id,)
        )
        rev = await cursor.fetchone()
        if not rev:
            raise ValueError(f"Revision {revision_id} not found")
        if rev["status"] != "pending":
            raise ValueError(f"Revision {revision_id} is not pending (status={rev['status']})")

        now = datetime.now().isoformat()

        # Update element content
        await db.execute(
            "UPDATE document_elements SET content_latex = ?, updated_at = ? WHERE id = ?",
            (rev["output_snapshot"], now, rev["element_id"]),
        )

        # Mark revision as applied
        await db.execute(
            "UPDATE document_revisions SET status = 'applied' WHERE id = ?",
            (revision_id,),
        )
        await db.commit()

    return {
        "id": rev["id"],
        "document_id": rev["document_id"],
        "element_id": rev["element_id"],
        "instruction_text": rev["instruction_text"],
        "provider": rev["provider"],
        "input_snapshot": rev["input_snapshot"],
        "output_snapshot": rev["output_snapshot"],
        "status": "applied",
        "created_at": rev["created_at"],
    }


async def reject_revision(revision_id: str) -> dict:
    """Mark a pending revision as rejected."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        cursor = await db.execute(
            "SELECT * FROM document_revisions WHERE id = ?", (revision_id,)
        )
        rev = await cursor.fetchone()
        if not rev:
            raise ValueError(f"Revision {revision_id} not found")

        await db.execute(
            "UPDATE document_revisions SET status = 'rejected' WHERE id = ?",
            (revision_id,),
        )
        await db.commit()

    return {
        "id": rev["id"],
        "document_id": rev["document_id"],
        "element_id": rev["element_id"],
        "instruction_text": rev["instruction_text"],
        "provider": rev["provider"],
        "input_snapshot": rev["input_snapshot"],
        "output_snapshot": rev["output_snapshot"],
        "status": "rejected",
        "created_at": rev["created_at"],
    }


async def list_revisions(document_id: str, element_id: Optional[str] = None) -> List[dict]:
    """List revisions for a document, optionally filtered by element."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        if element_id:
            cursor = await db.execute(
                """SELECT * FROM document_revisions
                   WHERE document_id = ? AND element_id = ?
                   ORDER BY created_at DESC""",
                (document_id, element_id),
            )
        else:
            cursor = await db.execute(
                """SELECT * FROM document_revisions
                   WHERE document_id = ?
                   ORDER BY created_at DESC""",
                (document_id,),
            )

        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "document_id": row["document_id"],
                "element_id": row["element_id"],
                "instruction_text": row["instruction_text"],
                "provider": row["provider"],
                "input_snapshot": row["input_snapshot"],
                "output_snapshot": row["output_snapshot"],
                "status": row["status"],
                "created_at": row["created_at"],
            }
            for row in rows
        ]
