"""tutor_v1_canon_schema — canon §7 Tutor V1 spine (dogfood v1, Phase 1)

Revision ID: c7d2e4a91b03
Revises: 928e2e58469d
Create Date: 2026-07-20

MIGRATION NOTE (required by dogfood guardrail — every memory-engine schema
change carries one):

  WHAT: Creates the five canon-§7 Tutor V1 tables ratified in
  MAIT_ARCHITECTURE_CANON.md but not previously built:
    - tutor_students  (1-1 student record; `name` is an ALIAS SLUG ONLY,
      enforced by CHECK `name ~ '^S[0-9]+$'` — the schema-level PII rule:
      no surname/school/contact columns exist anywhere in this schema)
    - sessions        (THE SPINE; replaces chat_threads for the tutor build
      per canon ruling. Carries brief/deck/dump plus the dogfood Phase 3
      instrumentation: questions_generated/kept, cerberus_catch_count,
      edits_made, and the <=10s post-session check-in fields
      context_relevance 1-5, cerberus_usefulness 1-5, friction_note)
    - topic_mastery   (per student+subject+topic; status enum
      unseen/introduced/shaky/solid/mastered, streak, last_seen,
      last_succeeded — canon mastery state machine constants)
    - question_log    (one row per generated question, outcome enum
      nailed/struggled/bombed/skipped NULLABLE until a one-tap outcome is
      recorded; optional misconception_tag; `kept` boolean is a dogfood
      addition evidencing the generated-vs-kept ratio)
    - mistake_vault   (structured error triplets topic->failure_mode->
      error_class with question_log evidence FK; `status`
      active/superseded — never delete, supersede: Vesper ledger
      discipline carried over)

  WHAT IT DOES NOT DO: no teacher-sprint table (tutors, tutor_classes,
  chat_threads, messages) is altered or dropped — brownfield rule:
  feature-flag off, never delete; the old tables are dropped post-dogfood,
  not now. vector_chunks untouched (LOCKED per canon §6).

  ENUM STRATEGY: plain String + CHECK constraints (matches existing repo
  style; no native PG enums to migrate later).

  DOWNGRADE: drops only the five new tables, children first. Fully
  reversible; no data in existing tables is touched either way.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'c7d2e4a91b03'
down_revision = '928e2e58469d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'tutor_students',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tutor_id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('year_level', sa.Integer(), nullable=False),
        sa.Column('class_id', sa.UUID(), nullable=True),
        sa.Column('profile', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tutor_id'], ['tutors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['class_id'], ['tutor_classes.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("name ~ '^S[0-9]+$'", name='ck_tutor_students_alias_slug'),
        sa.UniqueConstraint('tutor_id', 'name', name='uq_tutor_students_tutor_alias'),
    )
    op.create_index('idx_tutor_students_tutor_id', 'tutor_students', ['tutor_id'], unique=False)

    op.create_table(
        'sessions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('tutor_id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('date', sa.Date(), server_default=sa.text('CURRENT_DATE'), nullable=False),
        sa.Column('status', sa.String(), server_default=sa.text("'active'"), nullable=False),
        sa.Column('brief', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('deck', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('dump', sa.Text(), nullable=True),
        sa.Column('topics', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column('questions_generated', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('questions_kept', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('cerberus_catch_count', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('edits_made', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('context_relevance', sa.SmallInteger(), nullable=True),
        sa.Column('cerberus_usefulness', sa.SmallInteger(), nullable=True),
        sa.Column('friction_note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['tutor_id'], ['tutors.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['tutor_students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('planned', 'active', 'completed')", name='ck_sessions_status'),
        sa.CheckConstraint('context_relevance IS NULL OR (context_relevance BETWEEN 1 AND 5)', name='ck_sessions_context_relevance'),
        sa.CheckConstraint('cerberus_usefulness IS NULL OR (cerberus_usefulness BETWEEN 1 AND 5)', name='ck_sessions_cerberus_usefulness'),
    )
    op.create_index('idx_sessions_tutor_id', 'sessions', ['tutor_id'], unique=False)
    op.create_index('idx_sessions_student_id', 'sessions', ['student_id'], unique=False)
    op.create_index('idx_sessions_date', 'sessions', ['date'], unique=False)

    op.create_table(
        'topic_mastery',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('subject', sa.String(), nullable=False),
        sa.Column('topic', sa.String(), nullable=False),
        sa.Column('status', sa.String(), server_default=sa.text("'unseen'"), nullable=False),
        sa.Column('streak', sa.Integer(), server_default=sa.text('0'), nullable=False),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_succeeded', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['tutor_students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('unseen', 'introduced', 'shaky', 'solid', 'mastered')", name='ck_topic_mastery_status'),
        sa.UniqueConstraint('student_id', 'subject', 'topic', name='uq_topic_mastery_student_subject_topic'),
    )
    op.create_index('idx_topic_mastery_student_id', 'topic_mastery', ['student_id'], unique=False)

    op.create_table(
        'question_log',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('topic', sa.String(), nullable=False),
        sa.Column('question_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('outcome', sa.String(), nullable=True),
        sa.Column('misconception_tag', sa.String(), nullable=True),
        sa.Column('kept', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['session_id'], ['sessions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['student_id'], ['tutor_students.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("outcome IS NULL OR outcome IN ('nailed', 'struggled', 'bombed', 'skipped')", name='ck_question_log_outcome'),
    )
    op.create_index('idx_question_log_session_id', 'question_log', ['session_id'], unique=False)
    op.create_index('idx_question_log_student_id', 'question_log', ['student_id'], unique=False)

    op.create_table(
        'mistake_vault',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('student_id', sa.UUID(), nullable=False),
        sa.Column('topic', sa.String(), nullable=False),
        sa.Column('failure_mode', sa.String(), nullable=False),
        sa.Column('error_class', sa.String(), nullable=False),
        sa.Column('evidence_id', sa.UUID(), nullable=True),
        sa.Column('status', sa.String(), server_default=sa.text("'active'"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['student_id'], ['tutor_students.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['evidence_id'], ['question_log.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("status IN ('active', 'superseded')", name='ck_mistake_vault_status'),
    )
    op.create_index('idx_mistake_vault_student_id', 'mistake_vault', ['student_id'], unique=False)
    op.create_index('idx_mistake_vault_status', 'mistake_vault', ['status'], unique=False)


def downgrade() -> None:
    op.drop_table('mistake_vault')
    op.drop_table('question_log')
    op.drop_table('topic_mastery')
    op.drop_table('sessions')
    op.drop_table('tutor_students')
