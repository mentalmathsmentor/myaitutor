"""
Tests for Pydantic models: StudentContext, FatigueMetric, BloomsLevel,
KeystrokeMetrics, and KeystrokeProfile.
"""
import pytest
from datetime import datetime
from pydantic import ValidationError

from app.models import (
    StudentContext,
    FatigueMetric,
    FatigueStatus,
    BloomsLevel,
    PedagogicalState,
    SessionStats,
    KeystrokeMetrics,
    KeystrokeProfile,
    KeystrokeSubmission,
)


# ===========================================================================
# Tests for StudentContext
# ===========================================================================

class TestStudentContext:
    """Tests for StudentContext model creation and defaults."""

    def test_creation_with_student_id_only(self):
        """StudentContext should be creatable with just a student_id."""
        ctx = StudentContext(student_id="alice")
        assert ctx.student_id == "alice"

    def test_default_fatigue_metric(self):
        """Default fatigue metric should have score=0 and FRESH status."""
        ctx = StudentContext(student_id="alice")
        assert ctx.fatigue_metric.current_score == 0
        assert ctx.fatigue_metric.status == FatigueStatus.FRESH

    def test_default_pedagogical_state(self):
        """Default pedagogical state should have APPLY level and no topic."""
        ctx = StudentContext(student_id="alice")
        assert ctx.pedagogical_state.blooms_level == BloomsLevel.APPLY
        assert ctx.pedagogical_state.current_topic is None
        assert ctx.pedagogical_state.mastery_score == 0.0

    def test_default_session_stats(self):
        """Default session stats should have empty topics and 0 interactions."""
        ctx = StudentContext(student_id="alice")
        assert ctx.session_stats.topics_covered == []
        assert ctx.session_stats.interactions_count == 0

    def test_default_keystroke_profile(self):
        """Default keystroke profile should have 0 sessions and empty history."""
        ctx = StudentContext(student_id="alice")
        assert ctx.keystroke_profile.total_sessions == 0
        assert ctx.keystroke_profile.session_history == []

    def test_default_message_timestamps(self):
        """Default message_timestamps should be an empty list."""
        ctx = StudentContext(student_id="alice")
        assert ctx.message_timestamps == []

    def test_two_contexts_are_independent(self):
        """Two StudentContexts should not share mutable defaults."""
        ctx1 = StudentContext(student_id="alice")
        ctx2 = StudentContext(student_id="bob")
        ctx1.message_timestamps.append(datetime.now())
        assert len(ctx2.message_timestamps) == 0

    def test_serialization_round_trip(self):
        """A StudentContext should serialize to dict and back."""
        ctx = StudentContext(student_id="alice")
        data = ctx.model_dump()
        ctx2 = StudentContext(**data)
        assert ctx2.student_id == "alice"
        assert ctx2.fatigue_metric.status == FatigueStatus.FRESH


# ===========================================================================
# Tests for FatigueMetric
# ===========================================================================

class TestFatigueMetric:
    """Tests for FatigueMetric model defaults and validation."""

    def test_default_values(self):
        """FatigueMetric defaults should be score=0, status=FRESH."""
        fm = FatigueMetric()
        assert fm.current_score == 0
        assert fm.status == FatigueStatus.FRESH
        assert isinstance(fm.last_interaction_timestamp, datetime)

    def test_score_ge_zero(self):
        """Score should not accept negative values."""
        with pytest.raises(ValidationError):
            FatigueMetric(current_score=-1)

    def test_score_le_100(self):
        """Score should not accept values above 100."""
        with pytest.raises(ValidationError):
            FatigueMetric(current_score=101)

    def test_score_boundary_zero(self):
        """Score of 0 should be valid."""
        fm = FatigueMetric(current_score=0)
        assert fm.current_score == 0

    def test_score_boundary_100(self):
        """Score of 100 should be valid."""
        fm = FatigueMetric(current_score=100)
        assert fm.current_score == 100

    def test_custom_status(self):
        """FatigueMetric should accept a custom status."""
        fm = FatigueMetric(status=FatigueStatus.WEARY)
        assert fm.status == FatigueStatus.WEARY

    def test_custom_timestamp(self):
        """FatigueMetric should accept a custom timestamp."""
        ts = datetime(2024, 1, 1, 12, 0, 0)
        fm = FatigueMetric(last_interaction_timestamp=ts)
        assert fm.last_interaction_timestamp == ts


# ===========================================================================
# Tests for BloomsLevel
# ===========================================================================

class TestBloomsLevel:
    """Tests for BloomsLevel enum."""

    def test_all_levels_exist(self):
        """All six Bloom's taxonomy levels should be defined."""
        expected = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]
        actual = [level.value for level in BloomsLevel]
        assert actual == expected

    def test_enum_count(self):
        """There should be exactly 6 levels."""
        assert len(BloomsLevel) == 6

    def test_level_values(self):
        """Each level should have the correct string value."""
        assert BloomsLevel.REMEMBER.value == "Remember"
        assert BloomsLevel.UNDERSTAND.value == "Understand"
        assert BloomsLevel.APPLY.value == "Apply"
        assert BloomsLevel.ANALYZE.value == "Analyze"
        assert BloomsLevel.EVALUATE.value == "Evaluate"
        assert BloomsLevel.CREATE.value == "Create"

    def test_levels_are_string_enum(self):
        """BloomsLevel members should be usable as strings."""
        assert str(BloomsLevel.APPLY) == "BloomsLevel.APPLY"
        assert BloomsLevel.APPLY == "Apply"


# ===========================================================================
# Tests for FatigueStatus
# ===========================================================================

class TestFatigueStatus:
    """Tests for FatigueStatus enum."""

    def test_all_statuses(self):
        """All three fatigue statuses should be defined."""
        assert FatigueStatus.FRESH.value == "FRESH"
        assert FatigueStatus.WEARY.value == "WEARY"
        assert FatigueStatus.LOCKOUT.value == "LOCKOUT"

    def test_status_count(self):
        """There should be exactly 3 statuses."""
        assert len(FatigueStatus) == 3

    def test_status_is_string_enum(self):
        """FatigueStatus should be usable as a string."""
        assert FatigueStatus.FRESH == "FRESH"


# ===========================================================================
# Tests for KeystrokeMetrics
# ===========================================================================

class TestKeystrokeMetrics:
    """Tests for KeystrokeMetrics model creation and validation."""

    def test_default_values(self):
        """All numeric fields should default to 0."""
        km = KeystrokeMetrics()
        assert km.wpm == 0
        assert km.avg_dwell_time_ms == 0
        assert km.avg_flight_time_ms == 0
        assert km.avg_thinking_time_ms == 0
        assert km.total_thinking_time_ms == 0
        assert km.error_corrections == 0
        assert km.error_rate == 0
        assert km.characters_typed == 0
        assert km.session_duration_ms == 0
        assert km.rhythm_variance == 0
        assert km.keystroke_count == 0

    def test_default_timestamp(self):
        """Default timestamp should be approximately now."""
        before = datetime.now()
        km = KeystrokeMetrics()
        after = datetime.now()
        assert before <= km.timestamp <= after

    def test_custom_values(self):
        """KeystrokeMetrics should accept custom values."""
        km = KeystrokeMetrics(
            wpm=65.5,
            avg_dwell_time_ms=120.0,
            avg_flight_time_ms=80.0,
            avg_thinking_time_ms=3000.0,
            error_corrections=5,
            characters_typed=200,
            session_duration_ms=60000,
            rhythm_variance=5000.0,
            keystroke_count=250,
        )
        assert km.wpm == 65.5
        assert km.avg_dwell_time_ms == 120.0
        assert km.characters_typed == 200
        assert km.keystroke_count == 250

    def test_serialization(self):
        """KeystrokeMetrics should serialize to dict."""
        km = KeystrokeMetrics(wpm=50.0, characters_typed=100)
        data = km.model_dump()
        assert data["wpm"] == 50.0
        assert data["characters_typed"] == 100


# ===========================================================================
# Tests for KeystrokeProfile
# ===========================================================================

class TestKeystrokeProfile:
    """Tests for KeystrokeProfile aggregation fields and defaults."""

    def test_default_values(self):
        """All default values should be 0 or empty."""
        kp = KeystrokeProfile()
        assert kp.total_sessions == 0
        assert kp.average_wpm == 0
        assert kp.average_dwell_time_ms == 0
        assert kp.average_flight_time_ms == 0
        assert kp.average_thinking_time_ms == 0
        assert kp.total_characters_typed == 0
        assert kp.total_error_corrections == 0
        assert kp.message_frequency_per_minute == 0
        assert kp.typing_rhythm_variance == 0
        assert kp.session_history == []
        assert kp.last_updated is None

    def test_default_behavioral_categories(self):
        """All behavioral analysis fields should default to 'unknown'."""
        kp = KeystrokeProfile()
        assert kp.typing_speed_category == "unknown"
        assert kp.consistency_category == "unknown"
        assert kp.thinking_pattern == "unknown"
        assert kp.error_tendency == "unknown"

    def test_session_history_is_list_of_metrics(self):
        """session_history should accept KeystrokeMetrics objects."""
        km = KeystrokeMetrics(wpm=50.0)
        kp = KeystrokeProfile(session_history=[km])
        assert len(kp.session_history) == 1
        assert kp.session_history[0].wpm == 50.0

    def test_last_updated_accepts_datetime(self):
        """last_updated should accept a datetime."""
        now = datetime.now()
        kp = KeystrokeProfile(last_updated=now)
        assert kp.last_updated == now


# ===========================================================================
# Tests for KeystrokeSubmission
# ===========================================================================

class TestKeystrokeSubmission:
    """Tests for KeystrokeSubmission request model."""

    def test_creation(self):
        """KeystrokeSubmission should require student_id and metrics."""
        sub = KeystrokeSubmission(
            student_id="alice",
            metrics=KeystrokeMetrics(wpm=45.0, characters_typed=100)
        )
        assert sub.student_id == "alice"
        assert sub.metrics.wpm == 45.0

    def test_missing_student_id_raises(self):
        """Missing student_id should raise ValidationError."""
        with pytest.raises(ValidationError):
            KeystrokeSubmission(metrics=KeystrokeMetrics())

    def test_missing_metrics_raises(self):
        """Missing metrics should raise ValidationError."""
        with pytest.raises(ValidationError):
            KeystrokeSubmission(student_id="alice")


# ===========================================================================
# Tests for PedagogicalState
# ===========================================================================

class TestPedagogicalState:
    """Tests for PedagogicalState model."""

    def test_default_values(self):
        """Default values should be None topic, APPLY level, 0 mastery."""
        ps = PedagogicalState()
        assert ps.current_topic is None
        assert ps.sub_topic is None
        assert ps.blooms_level == BloomsLevel.APPLY
        assert ps.mastery_score == 0.0

    def test_mastery_score_boundaries(self):
        """Mastery score should be between 0 and 1."""
        ps = PedagogicalState(mastery_score=0.0)
        assert ps.mastery_score == 0.0
        ps2 = PedagogicalState(mastery_score=1.0)
        assert ps2.mastery_score == 1.0

    def test_mastery_score_invalid(self):
        """Mastery score outside [0, 1] should be rejected."""
        with pytest.raises(ValidationError):
            PedagogicalState(mastery_score=1.5)
        with pytest.raises(ValidationError):
            PedagogicalState(mastery_score=-0.1)
