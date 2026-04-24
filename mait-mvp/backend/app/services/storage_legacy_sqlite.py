"""Legacy SQLite data access. Preserved for rollback reference. Do not import."""

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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversation_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                content TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                fatigue_state TEXT,
                blooms_level TEXT,
                topic TEXT
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_conv_student
            ON conversation_history(student_id)
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_conv_timestamp
            ON conversation_history(student_id, timestamp)
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                google_id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL UNIQUE,
                email TEXT,
                name TEXT,
                picture TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_users_student_id
            ON users(student_id)
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id TEXT PRIMARY KEY,
                student_id TEXT NOT NULL,
                title TEXT NOT NULL,
                kind TEXT DEFAULT 'artifact',
                source TEXT DEFAULT 'manual',
                metadata_json TEXT DEFAULT '{}',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_documents_student_id
            ON documents(student_id)
        """)
        # Migrate existing documents table to add new columns if missing
        cursor = await db.execute("PRAGMA table_info(documents)")
        doc_columns = [row[1] for row in await cursor.fetchall()]
        if "kind" not in doc_columns:
            await db.execute("ALTER TABLE documents ADD COLUMN kind TEXT DEFAULT 'artifact'")
        if "source" not in doc_columns:
            await db.execute("ALTER TABLE documents ADD COLUMN source TEXT DEFAULT 'manual'")
        if "metadata_json" not in doc_columns:
            await db.execute("ALTER TABLE documents ADD COLUMN metadata_json TEXT DEFAULT '{}'")
        # 2. Document Elements Migration Logic
        # Check for legacy table
        cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='document_fragments'")
        has_fragments = await cursor.fetchone() is not None
        
        cursor = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='document_elements'")
        has_elements = await cursor.fetchone() is not None
        
        if has_fragments:
            if has_elements:
                # Accidental double-creation scenario. Drop the new empty one to unblock rename.
                await db.execute("DROP TABLE document_elements")
            # Safely rename the old table
            await db.execute("ALTER TABLE document_fragments RENAME TO document_elements")
            
        # Ensure the table is created properly for new installations
        await db.execute("""
            CREATE TABLE IF NOT EXISTS document_elements (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                sort_key TEXT NOT NULL,
                kind TEXT NOT NULL,
                label TEXT,
                content_latex TEXT,
                metadata_json TEXT DEFAULT '{}',
                version_id TEXT,
                is_locked BOOLEAN DEFAULT 0,
                is_collapsed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        """)
        
        # Apply any pending column changes if table existed before rename
        cursor = await db.execute("PRAGMA table_info(document_elements)")
        columns = [row[1] for row in await cursor.fetchall()]
        if "role" in columns and "kind" not in columns:
            await db.execute("ALTER TABLE document_elements RENAME COLUMN role TO kind")
        if "order_index" in columns and "sort_key" not in columns:
            await db.execute("ALTER TABLE document_elements RENAME COLUMN order_index TO sort_key")
        if "label" not in columns:
            await db.execute("ALTER TABLE document_elements ADD COLUMN label TEXT")
        if "version_id" not in columns:
            await db.execute("ALTER TABLE document_elements ADD COLUMN version_id TEXT")
        if "is_locked" not in columns:
            await db.execute("ALTER TABLE document_elements ADD COLUMN is_locked BOOLEAN DEFAULT 0")
        if "is_collapsed" not in columns:
            await db.execute("ALTER TABLE document_elements ADD COLUMN is_collapsed BOOLEAN DEFAULT 0")

        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_elements_document_id
            ON document_elements(document_id)
        """)

        # document_revisions — stores per-element AI revision history
        await db.execute("""
            CREATE TABLE IF NOT EXISTS document_revisions (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                element_id TEXT,
                instruction_text TEXT,
                provider TEXT DEFAULT 'manual',
                input_snapshot TEXT,
                output_snapshot TEXT,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_revisions_document_id
            ON document_revisions(document_id)
        """)

        # artifact_builds — stores compilation build records
        await db.execute("""
            CREATE TABLE IF NOT EXISTS artifact_builds (
                id TEXT PRIMARY KEY,
                document_id TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                pdf_path TEXT,
                error_message_human TEXT,
                build_log TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
            )
        """)
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_builds_document_id
            ON artifact_builds(document_id)
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


async def save_message(
    student_id: str,
    role: str,
    content: str,
    fatigue_state: str = None,
    blooms_level: str = None,
    topic: str = None,
) -> None:
    """Save a single conversation message."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO conversation_history
                (student_id, role, content, fatigue_state, blooms_level, topic)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (student_id, role, content, fatigue_state, blooms_level, topic),
        )
        await db.commit()


async def get_history(student_id: str, limit: int = 20) -> List[dict]:
    """Retrieve the last N messages for a student, ordered chronologically."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            """
            SELECT role, content, timestamp, fatigue_state, blooms_level, topic
            FROM conversation_history
            WHERE student_id = ?
            ORDER BY id DESC
            LIMIT ?
            """,
            (student_id, limit),
        )
        rows = await cursor.fetchall()
        # Reverse so oldest first (chronological order)
        return [
            {
                "role": row["role"],
                "content": row["content"],
                "timestamp": row["timestamp"],
                "fatigue_state": row["fatigue_state"],
                "blooms_level": row["blooms_level"],
                "topic": row["topic"],
            }
            for row in reversed(rows)
        ]


async def clear_history(student_id: str) -> None:
    """Clear all conversation history for a student."""
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            "DELETE FROM conversation_history WHERE student_id = ?",
            (student_id,),
        )
        await db.commit()


async def get_history_token_estimate(student_id: str) -> int:
    """Rough token count estimate for a student's history."""
    async with aiosqlite.connect(_DB_PATH) as db:
        cursor = await db.execute(
            "SELECT SUM(LENGTH(content)) FROM conversation_history WHERE student_id = ?",
            (student_id,),
        )
        row = await cursor.fetchone()
        total_chars = row[0] or 0
        return total_chars // 4


async def upsert_user(
    google_id: str,
    student_id: str,
    email: str = "",
    name: str = "",
    picture: str = "",
) -> dict:
    """Create or update a user record. Returns the user dict."""
    now = datetime.now().isoformat()
    async with aiosqlite.connect(_DB_PATH) as db:
        await db.execute(
            """
            INSERT INTO users (google_id, student_id, email, name, picture, last_login)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(google_id) DO UPDATE SET
                email = excluded.email,
                name = excluded.name,
                picture = excluded.picture,
                last_login = excluded.last_login
            """,
            (google_id, student_id, email, name, picture, now),
        )
        await db.commit()
    return await get_user_by_google_id(google_id)


async def get_user_by_google_id(google_id: str) -> Optional[dict]:
    """Look up a user by Google ID."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT google_id, student_id, email, name, picture, created_at, last_login FROM users WHERE google_id = ?",
            (google_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


async def get_user_by_student_id(student_id: str) -> Optional[dict]:
    """Look up a user by student_id."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT google_id, student_id, email, name, picture, created_at, last_login FROM users WHERE student_id = ?",
            (student_id,),
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


async def get_all_emails() -> List[dict]:
    """Retrieve all waitlist emails."""
    async with aiosqlite.connect(_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT email, timestamp FROM waitlist_emails")
        rows = await cursor.fetchall()
        return [{"email": row["email"], "timestamp": row["timestamp"]} for row in rows]
