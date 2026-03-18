import uuid
from datetime import datetime
from typing import Optional, List
import aiosqlite
from .storage import _DB_PATH

async def create_document(student_id: str, title: str) -> dict:
    """Create a new document for a student and return the document metadata."""
    doc_id = f"doc_{uuid.uuid4().hex[:12]}"
    now = datetime.now().isoformat()
    
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO documents (id, student_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (doc_id, student_id, title, now, now),
        )
        await db.commit()
        
    return {
        "id": doc_id,
        "studentId": student_id,
        "title": title,
        "createdAt": now,
        "updatedAt": now
    }

async def get_document(document_id: str) -> Optional[dict]:
    """Retrieve a document by ID."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, student_id, title, created_at, updated_at FROM documents WHERE id = ?",
            (document_id,),
        )
        row = await cursor.fetchone()
        if not row:
            return None
            
        return {
            "id": row["id"],
            "studentId": row["student_id"],
            "title": row["title"],
            "createdAt": row["created_at"],
            "updatedAt": row["updated_at"]
        }

async def get_documents_by_student(student_id: str) -> List[dict]:
    """Retrieve all documents belonging to a specific student."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, student_id, title, created_at, updated_at FROM documents WHERE student_id = ? ORDER BY updated_at DESC",
            (student_id,),
        )
        rows = await cursor.fetchall()
        return [
            {
                "id": row["id"],
                "studentId": row["student_id"],
                "title": row["title"],
                "createdAt": row["created_at"],
                "updatedAt": row["updated_at"]
            }
            for row in rows
        ]

async def update_document_title(document_id: str, new_title: str) -> bool:
    """Update a document's title."""
    now = datetime.now().isoformat()
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute(
            "UPDATE documents SET title = ?, updated_at = ? WHERE id = ?",
            (new_title, now, document_id),
        )
        await db.commit()
        return cursor.rowcount > 0

async def delete_document(document_id: str) -> bool:
    """Delete a document by ID."""
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute("DELETE FROM documents WHERE id = ?", (document_id,))
        await db.commit()
        return cursor.rowcount > 0
