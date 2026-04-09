import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
import aiosqlite
from .storage import _DB_PATH

async def create_element(document_id: str, sort_key: str, kind: str, label: str = "Element", 
                         content_latex: str = "", version_id: str = "v1",
                         is_locked: bool = False, is_collapsed: bool = False) -> dict:
    """Create a new document element and return its metadata."""
    elem_id = f"elem_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO document_elements 
            (id, document_id, sort_key, kind, label, content_latex, version_id, is_locked, is_collapsed, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (elem_id, document_id, sort_key, kind, label, content_latex, version_id, is_locked, is_collapsed, now, now),
        )
        await db.commit()
        
    return {
        "id": elem_id,
        "documentId": document_id,
        "sortKey": sort_key,
        "kind": kind,
        "label": label,
        "contentLatex": content_latex,
        "versionId": version_id,
        "isLocked": is_locked,
        "isCollapsed": is_collapsed,
        "createdAt": now,
        "updatedAt": now
    }

async def get_elements(document_id: str) -> List[dict]:
    """Retrieve all elements for a document, ordered by sort_key (LexoRank)."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT id, document_id, sort_key, kind, label, content_latex, version_id, is_locked, is_collapsed, created_at, updated_at 
            FROM document_elements 
            WHERE document_id = ? 
            ORDER BY sort_key ASC
            """,
            (document_id,),
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "documentId": row["document_id"],
                "sortKey": row["sort_key"],
                "kind": row["kind"],
                "label": row["label"],
                "contentLatex": row["content_latex"],
                "versionId": row["version_id"],
                "isLocked": bool(row["is_locked"]),
                "isCollapsed": bool(row["is_collapsed"]),
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"]
            }
            for row in rows
        ]

async def update_element(element_id: str, updates: Dict[str, Any]) -> Optional[dict]:
    """Update a specific element's details (e.g. content_latex, sort_key, etc)."""
    if not updates:
        return None
        
    now = datetime.now().isoformat()
    updates["updated_at"] = now
    
    # Map frontend camelCase to snake_case if necessary
    field_maps = {
        "contentLatex": "content_latex",
        "sortKey": "sort_key",
        "isLocked": "is_locked",
        "isCollapsed": "is_collapsed",
        "label": "label",
        "versionId": "version_id",
    }

    db_updates = {}
    for k, v in updates.items():
        db_key = field_maps.get(k, k)
        db_updates[db_key] = v

    # Whitelist allowed columns — never interpolate unverified names into SQL
    ALLOWED_COLUMNS = {"content_latex", "sort_key", "is_locked", "is_collapsed", "label", "version_id", "updated_at"}
    db_updates = {k: v for k, v in db_updates.items() if k in ALLOWED_COLUMNS}
    if not db_updates:
        return None

    set_clause = ", ".join([f"{k} = ?" for k in db_updates.keys()])
    values = list(db_updates.values()) + [element_id]
    
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            f"UPDATE document_elements SET {set_clause} WHERE id = ?",
            values,
        )
        await db.commit()
        
        if cursor.rowcount == 0:
            return None
            
        # Return updated element
        cursor = await db.execute("SELECT * FROM document_elements WHERE id = ?", (element_id,))
        row = await cursor.fetchone()
        
        return {
            "id": row["id"],
            "documentId": row["document_id"],
            "sortKey": row["sort_key"],
            "kind": row["kind"],
            "label": row["label"],
            "contentLatex": row["content_latex"],
            "versionId": row["version_id"],
            "isLocked": bool(row["is_locked"]),
            "isCollapsed": bool(row["is_collapsed"]),
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"]
        } if row else None


async def delete_element(element_id: str) -> bool:
    """Delete a document element."""
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute("DELETE FROM document_elements WHERE id = ?", (element_id,))
        await db.commit()
        return cursor.rowcount > 0
