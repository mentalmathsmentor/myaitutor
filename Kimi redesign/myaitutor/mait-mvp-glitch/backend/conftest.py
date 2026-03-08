"""
Shared pytest fixtures and module-level mocking for the MAIT backend test suite.

This conftest.py patches heavy third-party modules (pypdf, docx, sentence-transformers,
google.genai) at the sys.modules level BEFORE any test file imports app.main.
This avoids needing to install these large packages just to run unit tests.
"""
import sys
from types import ModuleType
from unittest.mock import MagicMock

# ---------------------------------------------------------------------------
# Pre-import mocking: stub out heavy modules that are imported transitively
# by the RAG pipeline, artifact engine, and Gemini client.
# ---------------------------------------------------------------------------

# Create mock modules for packages that may not be installed in the test env
_MOCK_MODULES = [
    "pypdf",
    "docx",
    "sentence_transformers",
    "google",
    "google.genai",
    "google.genai.types",
]

for mod_name in _MOCK_MODULES:
    if mod_name not in sys.modules:
        mock_mod = MagicMock()
        # For google.genai, ensure sub-attribute access works
        if mod_name == "google":
            mock_mod.genai = MagicMock()
            mock_mod.genai.types = MagicMock()
        sys.modules[mod_name] = mock_mod

# ---------------------------------------------------------------------------
# Now safe to import app-level code
# ---------------------------------------------------------------------------

import pytest
from datetime import datetime, timedelta

from app.models import (
    StudentContext,
    FatigueMetric,
    FatigueStatus,
    KeystrokeMetrics,
    KeystrokeProfile,
    PedagogicalState,
    BloomsLevel,
)


# ---------------------------------------------------------------------------
# Shared fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def fresh_context():
    """Create a fresh StudentContext with default values."""
    ctx = StudentContext(student_id="test_student")
    ctx.fatigue_metric.current_score = 0
    ctx.fatigue_metric.status = FatigueStatus.FRESH
    ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
    return ctx


@pytest.fixture
def weary_context():
    """Create a StudentContext in WEARY state."""
    ctx = StudentContext(student_id="weary_student")
    ctx.fatigue_metric.current_score = 70
    ctx.fatigue_metric.status = FatigueStatus.WEARY
    ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
    return ctx


@pytest.fixture
def lockout_context():
    """Create a StudentContext in LOCKOUT state."""
    ctx = StudentContext(student_id="locked_student")
    ctx.fatigue_metric.current_score = 100
    ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
    ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
    return ctx


@pytest.fixture
def sample_keystroke_metrics():
    """Create sample KeystrokeMetrics for testing."""
    return KeystrokeMetrics(
        wpm=55.0,
        avg_dwell_time_ms=110.0,
        avg_flight_time_ms=75.0,
        avg_thinking_time_ms=4000.0,
        total_thinking_time_ms=20000.0,
        error_corrections=5,
        error_rate=2.5,
        characters_typed=200,
        session_duration_ms=120000,
        rhythm_variance=8000.0,
        keystroke_count=220,
    )


@pytest.fixture
def context_with_old_timestamp():
    """Create a context where the last interaction was 30 minutes ago."""
    ctx = StudentContext(student_id="absent_student")
    ctx.fatigue_metric.current_score = 80
    ctx.fatigue_metric.status = FatigueStatus.WEARY
    ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=30)
    return ctx
