from __future__ import annotations

import argparse
import asyncio
import json
import logging
import sqlite3
import sys
import uuid
from pathlib import Path
from typing import Any

from dateutil import parser as date_parser
from sqlalchemy import delete, text

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.db.models import (  # noqa: E402
    ArtifactBuild,
    ConversationHistory,
    Document,
    DocumentElement,
    DocumentRevision,
    StudentContextRecord,
    User,
    VisitCounter,
    WaitlistEmail,
)
from app.db.serializers import generate_public_id, parse_json_text, utc_now  # noqa: E402
from app.db.session import async_session_maker  # noqa: E402
from app.models import StudentContext  # noqa: E402


LOG_PATH = ROOT / "migration_errors.log"


def parse_args() -> argparse.Namespace:
    default_sqlite = ROOT / "data" / "mait.db"
    parser = argparse.ArgumentParser(description="Migrate MAIT data from SQLite to Postgres.")
    parser.add_argument(
        "--sqlite-path",
        default=str(default_sqlite),
        help="Path to the SQLite database file",
    )
    return parser.parse_args()


def setup_logger() -> logging.Logger:
    logger = logging.getLogger("sqlite_to_postgres_migration")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()
    handler = logging.FileHandler(LOG_PATH, mode="w", encoding="utf-8")
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
    logger.addHandler(handler)
    return logger


def fetch_rows(conn: sqlite3.Connection, table_name: str) -> list[sqlite3.Row]:
    try:
        return conn.execute(f"SELECT * FROM {table_name}").fetchall()
    except sqlite3.OperationalError:
        return []


def row_value(row: sqlite3.Row, key: str, default: Any = None) -> Any:
    return row[key] if key in row.keys() else default


def parse_datetime(value: Any, *, field_name: str) -> Any:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        raise ValueError(f"{field_name} expected an ISO datetime string, got numeric value {value!r}")
    return date_parser.isoparse(str(value))


def parse_bool(value: Any, *, field_name: str) -> bool:
    if isinstance(value, bool):
        return value
    if value in (0, "0", "false", "False", None, ""):
        return False
    if value in (1, "1", "true", "True"):
        return True
    raise ValueError(f"{field_name} expected 0/1/true/false, got {value!r}")


async def migrate() -> None:
    args = parse_args()
    sqlite_path = Path(args.sqlite_path)
    if not sqlite_path.exists():
        print("No SQLite database found, skipping data migration.")
        return

    logger = setup_logger()
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row

    documents_id_map: dict[str, uuid.UUID] = {}
    elements_id_map: dict[str, uuid.UUID] = {}
    revisions_id_map: dict[str, uuid.UUID] = {}
    builds_id_map: dict[str, uuid.UUID] = {}

    migrated_rows = 0
    skipped_rows = 0
    max_history_id = 0

    async with async_session_maker() as session:
        await session.execute(delete(ArtifactBuild))
        await session.execute(delete(DocumentRevision))
        await session.execute(delete(DocumentElement))
        await session.execute(delete(Document))
        await session.execute(delete(User))
        await session.execute(delete(ConversationHistory))
        await session.execute(delete(VisitCounter))
        await session.execute(delete(WaitlistEmail))
        await session.execute(delete(StudentContextRecord))
        await session.commit()

        for row in fetch_rows(conn, "student_contexts"):
            try:
                payload = json.loads(row["context_json"])
                validated = StudentContext.model_validate(payload)
                session.add(
                    StudentContextRecord(
                        student_id=row["student_id"],
                        context_json=validated.model_dump(mode="json"),
                        updated_at=parse_datetime(row["updated_at"], field_name="student_contexts.updated_at") or utc_now(),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("student_contexts[%s] skipped: %s", row["student_id"], exc)

        for row in fetch_rows(conn, "waitlist_emails"):
            try:
                session.add(
                    WaitlistEmail(
                        email=row["email"],
                        timestamp=parse_datetime(row["timestamp"], field_name="waitlist_emails.timestamp") or utc_now(),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("waitlist_emails[%s] skipped: %s", row["email"], exc)

        visit_rows = fetch_rows(conn, "visit_counter")
        if visit_rows:
            try:
                visit_row = visit_rows[0]
                session.add(VisitCounter(id=1, count=int(visit_row["count"] or 0)))
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("visit_counter skipped: %s", exc)
        else:
            session.add(VisitCounter(id=1, count=0))

        for row in fetch_rows(conn, "conversation_history"):
            try:
                history_id = int(row["id"])
                session.add(
                    ConversationHistory(
                        id=history_id,
                        student_id=row["student_id"],
                        role=row["role"],
                        content=row["content"],
                        timestamp=parse_datetime(row["timestamp"], field_name="conversation_history.timestamp") or utc_now(),
                        fatigue_state=row["fatigue_state"],
                        blooms_level=row["blooms_level"],
                        topic=row["topic"],
                    )
                )
                max_history_id = max(max_history_id, history_id)
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("conversation_history[%s] skipped: %s", row["id"], exc)

        for row in fetch_rows(conn, "users"):
            try:
                session.add(
                    User(
                        google_id=row["google_id"],
                        student_id=row["student_id"],
                        email=row["email"],
                        name=row["name"],
                        picture=row["picture"],
                        created_at=parse_datetime(row["created_at"], field_name="users.created_at") or utc_now(),
                        last_login=parse_datetime(row["last_login"], field_name="users.last_login") or utc_now(),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("users[%s] skipped: %s", row["google_id"], exc)

        for row in fetch_rows(conn, "documents"):
            try:
                document_uuid = uuid.uuid4()
                public_id = row_value(row, "id") or generate_public_id("doc")
                documents_id_map[public_id] = document_uuid
                session.add(
                    Document(
                        id=document_uuid,
                        public_id=public_id,
                        student_id=row_value(row, "student_id"),
                        title=row_value(row, "title"),
                        kind=row_value(row, "kind", "artifact") or "artifact",
                        source=row_value(row, "source", "manual") or "manual",
                        metadata_json=parse_json_text(row_value(row, "metadata_json", "{}")),
                        created_at=parse_datetime(row_value(row, "created_at"), field_name="documents.created_at") or utc_now(),
                        updated_at=parse_datetime(row_value(row, "updated_at"), field_name="documents.updated_at") or utc_now(),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("documents[%s] skipped: %s", row_value(row, "id", "<missing>"), exc)

        element_rows = fetch_rows(conn, "document_elements")
        if not element_rows:
            element_rows = fetch_rows(conn, "document_fragments")

        for row in element_rows:
            try:
                document_uuid = documents_id_map.get(row_value(row, "document_id"))
                if document_uuid is None:
                    raise ValueError(f"missing mapped document for {row_value(row, 'document_id')!r}")

                element_uuid = uuid.uuid4()
                public_id = row_value(row, "id") or generate_public_id("elem")
                elements_id_map[public_id] = element_uuid
                session.add(
                    DocumentElement(
                        id=element_uuid,
                        public_id=public_id,
                        document_id=document_uuid,
                        sort_key=row_value(row, "sort_key") or row_value(row, "order_index"),
                        kind=row_value(row, "kind") or row_value(row, "role"),
                        label=row_value(row, "label"),
                        content_latex=row_value(row, "content_latex"),
                        metadata_json=parse_json_text(row_value(row, "metadata_json", "{}")),
                        version_id=row_value(row, "version_id"),
                        is_locked=parse_bool(row_value(row, "is_locked", 0), field_name="document_elements.is_locked"),
                        is_collapsed=parse_bool(row_value(row, "is_collapsed", 0), field_name="document_elements.is_collapsed"),
                        created_at=parse_datetime(row_value(row, "created_at"), field_name="document_elements.created_at") or utc_now(),
                        updated_at=parse_datetime(row_value(row, "updated_at"), field_name="document_elements.updated_at") or utc_now(),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("document_elements[%s] skipped: %s", row_value(row, "id", "<missing>"), exc)

        for row in fetch_rows(conn, "document_revisions"):
            try:
                document_uuid = documents_id_map.get(row_value(row, "document_id"))
                if document_uuid is None:
                    raise ValueError(f"missing mapped document for {row_value(row, 'document_id')!r}")

                element_uuid = None
                if row_value(row, "element_id"):
                    element_uuid = elements_id_map.get(row_value(row, "element_id"))
                    if element_uuid is None:
                        raise ValueError(f"missing mapped element for {row_value(row, 'element_id')!r}")

                revision_uuid = uuid.uuid4()
                public_id = row_value(row, "id") or generate_public_id("rev")
                revisions_id_map[public_id] = revision_uuid
                session.add(
                    DocumentRevision(
                        id=revision_uuid,
                        public_id=public_id,
                        document_id=document_uuid,
                        element_id=element_uuid,
                        instruction_text=row_value(row, "instruction_text"),
                        provider=row_value(row, "provider", "manual") or "manual",
                        input_snapshot=row_value(row, "input_snapshot"),
                        output_snapshot=row_value(row, "output_snapshot"),
                        status=row_value(row, "status", "pending") or "pending",
                        created_at=parse_datetime(row_value(row, "created_at"), field_name="document_revisions.created_at") or utc_now(),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("document_revisions[%s] skipped: %s", row_value(row, "id", "<missing>"), exc)

        for row in fetch_rows(conn, "artifact_builds"):
            try:
                document_uuid = documents_id_map.get(row_value(row, "document_id"))
                if document_uuid is None:
                    raise ValueError(f"missing mapped document for {row_value(row, 'document_id')!r}")

                build_uuid = uuid.uuid4()
                public_id = row_value(row, "id") or generate_public_id("build")
                builds_id_map[public_id] = build_uuid
                session.add(
                    ArtifactBuild(
                        id=build_uuid,
                        public_id=public_id,
                        document_id=document_uuid,
                        status=row_value(row, "status", "queued") or "queued",
                        pdf_path=row_value(row, "pdf_path"),
                        error_message_human=row_value(row, "error_message_human"),
                        build_log=row_value(row, "build_log"),
                        created_at=parse_datetime(row_value(row, "created_at"), field_name="artifact_builds.created_at") or utc_now(),
                        completed_at=parse_datetime(row_value(row, "completed_at"), field_name="artifact_builds.completed_at"),
                    )
                )
                migrated_rows += 1
            except Exception as exc:
                skipped_rows += 1
                logger.error("artifact_builds[%s] skipped: %s", row_value(row, "id", "<missing>"), exc)

        await session.commit()

        if max_history_id:
            await session.execute(
                text(
                    "SELECT setval(pg_get_serial_sequence('conversation_history', 'id'), :value, true)"
                ),
                {"value": max_history_id},
            )
            await session.commit()

    conn.close()
    print(
        f"Migrated {migrated_rows:,} rows. "
        f"Skipped {skipped_rows:,} rows with validation errors (see migration_errors.log)."
    )


if __name__ == "__main__":
    asyncio.run(migrate())
