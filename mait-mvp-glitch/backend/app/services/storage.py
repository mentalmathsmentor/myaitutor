"""
SQLite-based persistent storage for MAIT student contexts.
Replaces in-memory dict so data survives server restarts.
"""

import os
import aiosqlite
from datetime import datetime
from typing import Optional, List

from ..models import StudentContext

# Database path: data/mait.db relative to backend directory
_DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
_DB_PATH = os.path.join(_DB_DIR, "mait.db")


async def init_db() -> None:
    """Create database tables if they don't exist. Create data/ directory if needed."""
    os.makedirs(_DB_DIR, exist_ok=True)

    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS student_contexts (
                student_id TEXT PRIMARY KEY,
                context_json TEXT NOT NULL,
                updated_at TIMESTAMP NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS waitlist_emails (
                email TEXT PRIMARY KEY,
                timestamp TEXT NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS visit_counter (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                count INTEGER NOT NULL DEFAULT 0
            )
        """)
        await db.execute("""
            INSERT OR IGNORE INTO visit_counter (id, count) VALUES (1, 0)
        """)
        await db.commit()


async def get_context(student_id: str) -> Optional[StudentContext]:
    """Retrieve a StudentContext from the database, or None if not found."""
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute(
            "SELECT context_json FROM student_contexts WHERE student_id = ?",
            (student_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return StudentContext.model_validate_json(row[0])


async def save_context(student_id: str, context: StudentContext) -> None:
    """Insert or update a StudentContext in the database."""
    context_json = context.model_dump_json()
    now = datetime.now().isoformat()

    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO student_contexts (student_id, context_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(student_id) DO UPDATE SET
                context_json = excluded.context_json,
                updated_at = excluded.updated_at
            """,
            (student_id, context_json, now),
        )
        await db.commit()


async def save_email(email: str) -> None:
    """Save a waitlist email to the database (ignore duplicates)."""
    timestamp = str(datetime.now())

    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT OR IGNORE INTO waitlist_emails (email, timestamp)
            VALUES (?, ?)
            """,
            (email, timestamp),
        )
        await db.commit()


async def increment_visit_count() -> int:
    """Increment and return the visit counter."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute("UPDATE visit_counter SET count = count + 1 WHERE id = 1")
        await db.commit()
        cursor = await db.execute("SELECT count FROM visit_counter WHERE id = 1")
        row = await cursor.fetchone()
        return row[0] if row else 0


async def get_visit_count() -> int:
    """Return the current visit count without incrementing."""
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute("SELECT count FROM visit_counter WHERE id = 1")
        row = await cursor.fetchone()
        return row[0] if row else 0


async def get_all_emails() -> List[dict]:
    """Retrieve all waitlist emails."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT email, timestamp FROM waitlist_emails")
        rows = await cursor.fetchall()
        return [{"email": row["email"], "timestamp": row["timestamp"]} for row in rows]
