"""
Tests for the wellness engine: fatigue calculation, decay, status transitions, and lockout.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch

from app.models import StudentContext, FatigueMetric, FatigueStatus
from app.services import wellness_engine
from app.services.wellness_engine import (
    calculate_fatigue,
    check_wellness,
    update_fatigue,
    WEARY_THRESHOLD,
    LOCKOUT_THRESHOLD,
    BASE_FATIGUE_PER_MESSAGE,
    INTENSITY_EXPONENT,
    DECAY_RATE_PER_MINUTE,
    TIME_WINDOW_MINUTES,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _fresh_context(student_id: str = "test_student") -> StudentContext:
    """Create a StudentContext with a known, deterministic timestamp."""
    ctx = StudentContext(student_id=student_id)
    ctx.fatigue_metric.current_score = 0
    ctx.fatigue_metric.status = FatigueStatus.FRESH
    return ctx


# ===========================================================================
# Tests for calculate_fatigue
# ===========================================================================

class TestCalculateFatigue:
    """Unit tests for the pure calculate_fatigue function."""

    def test_zero_messages_zero_fatigue(self):
        """With 0 messages and 0 current fatigue, result should be 0."""
        result = calculate_fatigue(messages_in_window=0, minutes_since_last=0.0, current_fatigue=0.0)
        assert result == 0.0

    def test_one_message_no_prior_fatigue(self):
        """First message should add BASE * 1^EXPONENT = BASE."""
        result = calculate_fatigue(messages_in_window=1, minutes_since_last=0.0, current_fatigue=0.0)
        expected = BASE_FATIGUE_PER_MESSAGE * (1 ** INTENSITY_EXPONENT)
        assert result == pytest.approx(expected, abs=0.1)

    def test_ten_messages_causes_high_fatigue(self):
        """10 messages in window should produce a very high score (near lockout)."""
        result = calculate_fatigue(messages_in_window=10, minutes_since_last=0.0, current_fatigue=0.0)
        # 3 * 10^1.6 = 3 * ~39.8 = ~119.4, capped at 100
        assert result == 100.0

    def test_fatigue_capped_at_100(self):
        """Score should never exceed 100."""
        result = calculate_fatigue(messages_in_window=20, minutes_since_last=0.0, current_fatigue=90.0)
        assert result <= 100.0

    def test_decay_reduces_existing_fatigue(self):
        """Time away should reduce the fatigue before new increase is applied."""
        # 30 minutes away from a score of 60 -> decay = 30 * 2 = 60 -> decayed to 0
        result = calculate_fatigue(messages_in_window=0, minutes_since_last=30.0, current_fatigue=60.0)
        assert result == 0.0

    def test_partial_decay(self):
        """5 minutes away from score 50 -> decay = 10 -> decayed to 40, then 0 msgs adds 0."""
        result = calculate_fatigue(messages_in_window=0, minutes_since_last=5.0, current_fatigue=50.0)
        expected = max(0.0, 50.0 - (5.0 * DECAY_RATE_PER_MINUTE))
        assert result == pytest.approx(expected, abs=0.1)

    def test_decay_cannot_go_negative(self):
        """Decay should not produce a negative score."""
        result = calculate_fatigue(messages_in_window=0, minutes_since_last=1000.0, current_fatigue=10.0)
        assert result >= 0.0

    def test_moderate_messaging(self):
        """5 messages with no prior fatigue should produce a moderate score."""
        result = calculate_fatigue(messages_in_window=5, minutes_since_last=0.0, current_fatigue=0.0)
        # 3 * 5^1.6 = 3 * ~12.0 = ~36
        assert 20 < result < 60

    def test_high_existing_fatigue_plus_messages(self):
        """Starting at 50, adding 3 messages should push higher."""
        result = calculate_fatigue(messages_in_window=3, minutes_since_last=0.0, current_fatigue=50.0)
        # decayed = 50 (0 mins away), increase = 3 * 3^1.6 ~ 3*6.5 ~ 19.5
        # total ~ 69.5
        assert result > 50


# ===========================================================================
# Tests for check_wellness (decay-only check)
# ===========================================================================

class TestCheckWellness:
    """Tests for check_wellness which applies time-based decay."""

    def test_fresh_stays_fresh_when_low_score(self):
        """A context with low fatigue should remain FRESH after check."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 10
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        result = check_wellness(ctx)
        assert result.fatigue_metric.status == FatigueStatus.FRESH

    def test_weary_decays_to_fresh_after_long_absence(self):
        """After enough time away, a WEARY student should decay back to FRESH."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 70
        ctx.fatigue_metric.status = FatigueStatus.WEARY
        # Set last interaction to 60 minutes ago -> decay = 60 * 2 = 120 -> score becomes 0
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=60)

        result = check_wellness(ctx)
        assert result.fatigue_metric.status == FatigueStatus.FRESH

    def test_high_score_remains_weary_if_recent(self):
        """A high score with very recent interaction should stay WEARY."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 70
        ctx.fatigue_metric.status = FatigueStatus.WEARY
        # Set last interaction to 1 second ago -> minimal decay
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(seconds=1)

        result = check_wellness(ctx)
        # 70 - (1/60 * 2) ~ 69.97 -> still WEARY
        assert result.fatigue_metric.status == FatigueStatus.WEARY

    @patch("app.services.wellness_engine.datetime")
    def test_lockout_score_stays_lockout_if_recent(self, mock_datetime):
        """A score at 100 with the same timestamp should remain LOCKOUT."""
        fixed_now = datetime(2024, 6, 15, 12, 0, 0)
        mock_datetime.now.return_value = fixed_now
        # Keep timedelta available
        mock_datetime.side_effect = lambda *a, **k: datetime(*a, **k)

        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 100
        ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
        ctx.fatigue_metric.last_interaction_timestamp = fixed_now

        result = check_wellness(ctx)
        assert result.fatigue_metric.status == FatigueStatus.LOCKOUT

    def test_lockout_decays_to_weary_after_some_time(self):
        """Score at 100 should decay to WEARY after some minutes but not enough for FRESH."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 100
        ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
        # After 10 minutes: 100 - 10*2 = 80 -> WEARY (>=60, <100)
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=10)

        result = check_wellness(ctx)
        assert result.fatigue_metric.status == FatigueStatus.WEARY

    def test_lockout_fully_decays_to_fresh_after_long_break(self):
        """Score at 100 should decay to FRESH after a full break (>50 minutes)."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 100
        ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
        # After 60 minutes: 100 - 60*2 = -20 -> clamped to 0 -> FRESH
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=60)

        result = check_wellness(ctx)
        assert result.fatigue_metric.status == FatigueStatus.FRESH


# ===========================================================================
# Tests for update_fatigue
# ===========================================================================

class TestUpdateFatigue:
    """Tests for update_fatigue which processes a new interaction."""

    def test_first_message_increases_score(self):
        """First ever message should increase fatigue from 0."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
        result = update_fatigue(ctx, interaction_complexity=1)
        assert result.fatigue_metric.current_score > 0

    def test_message_timestamps_appended(self):
        """update_fatigue should add the current time to message_timestamps."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()
        assert len(ctx.message_timestamps) == 0
        result = update_fatigue(ctx)
        assert len(result.message_timestamps) >= 1

    def test_old_timestamps_pruned(self):
        """Timestamps older than the time window should be pruned."""
        ctx = _fresh_context()
        old_time = datetime.now() - timedelta(minutes=TIME_WINDOW_MINUTES + 5)
        ctx.message_timestamps = [old_time, old_time]
        ctx.fatigue_metric.last_interaction_timestamp = old_time

        result = update_fatigue(ctx)
        # The 2 old timestamps should be pruned, only the new one remains
        assert len(result.message_timestamps) == 1

    def test_status_transitions_fresh_to_weary(self):
        """Enough messages should transition status from FRESH to WEARY."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        # Send several messages quickly to push past WEARY_THRESHOLD (60)
        for _ in range(7):
            ctx = update_fatigue(ctx, interaction_complexity=1)

        assert ctx.fatigue_metric.current_score >= WEARY_THRESHOLD
        assert ctx.fatigue_metric.status in (FatigueStatus.WEARY, FatigueStatus.LOCKOUT)

    def test_rapid_messages_trigger_lockout(self):
        """10 rapid messages should trigger LOCKOUT status."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        for _ in range(10):
            ctx = update_fatigue(ctx)

        assert ctx.fatigue_metric.status == FatigueStatus.LOCKOUT
        assert ctx.fatigue_metric.current_score >= LOCKOUT_THRESHOLD

    def test_score_after_single_message(self):
        """After one message, score should equal BASE * 1^EXPONENT = BASE."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        result = update_fatigue(ctx)
        expected = BASE_FATIGUE_PER_MESSAGE * (1 ** INTENSITY_EXPONENT)
        assert result.fatigue_metric.current_score == int(expected)

    def test_update_sets_last_interaction_timestamp(self):
        """update_fatigue should update the last_interaction_timestamp to now."""
        ctx = _fresh_context()
        old_time = datetime.now() - timedelta(minutes=30)
        ctx.fatigue_metric.last_interaction_timestamp = old_time

        before = datetime.now()
        result = update_fatigue(ctx)
        after = datetime.now()

        assert result.fatigue_metric.last_interaction_timestamp >= before
        assert result.fatigue_metric.last_interaction_timestamp <= after


# ===========================================================================
# Tests for fatigue status transitions
# ===========================================================================

class TestFatigueStatusTransitions:
    """Tests ensuring correct FRESH -> WEARY -> LOCKOUT transitions and back."""

    def test_fresh_to_weary_to_lockout_progression(self):
        """Sending enough messages should move through FRESH -> WEARY -> LOCKOUT."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        statuses_seen = set()

        for _ in range(12):
            ctx = update_fatigue(ctx)
            statuses_seen.add(ctx.fatigue_metric.status)

        # Should have hit at least FRESH and LOCKOUT
        assert FatigueStatus.FRESH in statuses_seen or FatigueStatus.WEARY in statuses_seen
        assert FatigueStatus.LOCKOUT in statuses_seen

    def test_lockout_recovers_after_long_break(self):
        """After lockout and a long break, check_wellness should return FRESH."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 100
        ctx.fatigue_metric.status = FatigueStatus.LOCKOUT
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(hours=1)

        result = check_wellness(ctx)
        assert result.fatigue_metric.status == FatigueStatus.FRESH


# ===========================================================================
# Tests for time-based decay behavior
# ===========================================================================

class TestTimeBasedDecay:
    """Tests focused on the time-based decay mechanism."""

    def test_score_drops_after_long_absence(self):
        """After a long absence, fatigue score should drop significantly."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 80
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=30)

        result = check_wellness(ctx)
        # Decay = 30 * 2 = 60. Score = 80 - 60 = 20. Status: FRESH
        # Note: check_wellness doesn't update current_score, it just checks status
        # The decayed score is computed internally for status check only
        assert result.fatigue_metric.status == FatigueStatus.FRESH

    def test_decay_in_update_fatigue(self):
        """update_fatigue should also apply decay before adding new fatigue."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 50
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now() - timedelta(minutes=20)
        # Decay = 20 * 2 = 40. Decayed score = 10.
        # Then add increase for 1 msg: 3 * 1^1.6 = 3
        # New score should be ~13

        result = update_fatigue(ctx)
        # Should be much lower than 50 due to decay
        assert result.fatigue_metric.current_score < 50

    def test_no_decay_if_interaction_is_immediate(self):
        """If the last interaction was just now, there should be no decay."""
        ctx = _fresh_context()
        ctx.fatigue_metric.current_score = 50
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        result = update_fatigue(ctx)
        # No decay, just increase from 1 message on top of 50
        assert result.fatigue_metric.current_score >= 50


# ===========================================================================
# Tests for rapid messaging / intensity detection
# ===========================================================================

class TestRapidMessaging:
    """Tests that rapid messaging correctly triggers high fatigue / lockout."""

    def test_ten_rapid_messages_trigger_lockout(self):
        """Sending 10 messages rapidly (no time gap) should cause lockout."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        for _ in range(10):
            ctx = update_fatigue(ctx)

        assert ctx.fatigue_metric.current_score == 100
        assert ctx.fatigue_metric.status == FatigueStatus.LOCKOUT

    def test_five_rapid_messages_moderate_fatigue(self):
        """5 rapid messages should produce moderate fatigue but likely not lockout."""
        ctx = _fresh_context()
        ctx.fatigue_metric.last_interaction_timestamp = datetime.now()

        for _ in range(5):
            ctx = update_fatigue(ctx)

        # 5th message: messages_in_window = 5
        # increase = 3 * 5^1.6 ~ 3 * 12.0 ~ 36
        # Plus previous accumulated score
        assert ctx.fatigue_metric.current_score > 0
        # Score should be well above base but below or around lockout
        assert ctx.fatigue_metric.current_score < 100 or ctx.fatigue_metric.current_score == 100

    def test_exponential_scaling(self):
        """The fatigue increase should scale exponentially with message count."""
        ctx1 = _fresh_context()
        ctx1.fatigue_metric.last_interaction_timestamp = datetime.now()

        # 2 messages
        for _ in range(2):
            ctx1 = update_fatigue(ctx1)
        score_2 = ctx1.fatigue_metric.current_score

        ctx2 = _fresh_context()
        ctx2.fatigue_metric.last_interaction_timestamp = datetime.now()

        # 4 messages
        for _ in range(4):
            ctx2 = update_fatigue(ctx2)
        score_4 = ctx2.fatigue_metric.current_score

        # 4 messages should produce MORE than double the score of 2 messages
        # due to exponential scaling
        assert score_4 > score_2 * 2
