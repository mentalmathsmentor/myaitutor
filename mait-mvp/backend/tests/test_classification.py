"""
Tests for the behavioral classification helper functions in main.py.
These functions classify keystroke psychometric data into human-readable categories.
"""
import pytest

from app.main import (
    classify_typing_speed,
    classify_consistency,
    classify_thinking_pattern,
    classify_error_tendency,
)


# ===========================================================================
# Tests for classify_typing_speed
# ===========================================================================

class TestClassifyTypingSpeed:
    """Tests for WPM-based typing speed classification."""

    def test_fast_speed(self):
        """WPM > 60 should be classified as 'fast'."""
        assert classify_typing_speed(61.0) == "fast"
        assert classify_typing_speed(100.0) == "fast"
        assert classify_typing_speed(150.0) == "fast"

    def test_moderate_speed(self):
        """WPM between 40 and 60 (exclusive) should be 'moderate'."""
        assert classify_typing_speed(41.0) == "moderate"
        assert classify_typing_speed(50.0) == "moderate"
        assert classify_typing_speed(60.0) == "moderate"

    def test_slow_speed(self):
        """WPM between 20 and 40 (exclusive) should be 'slow'."""
        assert classify_typing_speed(21.0) == "slow"
        assert classify_typing_speed(30.0) == "slow"
        assert classify_typing_speed(40.0) == "slow"

    def test_very_slow_speed(self):
        """WPM <= 20 should be 'very_slow'."""
        assert classify_typing_speed(20.0) == "very_slow"
        assert classify_typing_speed(10.0) == "very_slow"
        assert classify_typing_speed(0.0) == "very_slow"

    def test_boundary_60(self):
        """WPM of exactly 60 should be 'moderate' (not fast)."""
        assert classify_typing_speed(60.0) == "moderate"

    def test_boundary_40(self):
        """WPM of exactly 40 should be 'slow' (not moderate)."""
        assert classify_typing_speed(40.0) == "slow"

    def test_boundary_20(self):
        """WPM of exactly 20 should be 'very_slow' (not slow)."""
        assert classify_typing_speed(20.0) == "very_slow"

    def test_just_above_boundaries(self):
        """Values just above each boundary should be in the higher category."""
        assert classify_typing_speed(60.1) == "fast"
        assert classify_typing_speed(40.1) == "moderate"
        assert classify_typing_speed(20.1) == "slow"


# ===========================================================================
# Tests for classify_consistency
# ===========================================================================

class TestClassifyConsistency:
    """Tests for typing rhythm variance classification."""

    def test_very_consistent(self):
        """Variance < 5000 should be 'very_consistent'."""
        assert classify_consistency(0.0) == "very_consistent"
        assert classify_consistency(1000.0) == "very_consistent"
        assert classify_consistency(4999.0) == "very_consistent"

    def test_consistent(self):
        """Variance between 5000 and 15000 (exclusive) should be 'consistent'."""
        assert classify_consistency(5000.0) == "consistent"
        assert classify_consistency(10000.0) == "consistent"
        assert classify_consistency(14999.0) == "consistent"

    def test_moderate_consistency(self):
        """Variance between 15000 and 30000 (exclusive) should be 'moderate'."""
        assert classify_consistency(15000.0) == "moderate"
        assert classify_consistency(20000.0) == "moderate"
        assert classify_consistency(29999.0) == "moderate"

    def test_variable(self):
        """Variance >= 30000 should be 'variable'."""
        assert classify_consistency(30000.0) == "variable"
        assert classify_consistency(50000.0) == "variable"
        assert classify_consistency(100000.0) == "variable"

    def test_boundary_5000(self):
        """Variance of exactly 5000 should be 'consistent' (not very_consistent)."""
        assert classify_consistency(5000.0) == "consistent"

    def test_boundary_15000(self):
        """Variance of exactly 15000 should be 'moderate' (not consistent)."""
        assert classify_consistency(15000.0) == "moderate"

    def test_boundary_30000(self):
        """Variance of exactly 30000 should be 'variable' (not moderate)."""
        assert classify_consistency(30000.0) == "variable"


# ===========================================================================
# Tests for classify_thinking_pattern
# ===========================================================================

class TestClassifyThinkingPattern:
    """Tests for thinking time-based pattern classification."""

    def test_deliberate(self):
        """Avg thinking time > 10000ms should be 'deliberate'."""
        assert classify_thinking_pattern(10001.0) == "deliberate"
        assert classify_thinking_pattern(15000.0) == "deliberate"
        assert classify_thinking_pattern(30000.0) == "deliberate"

    def test_thoughtful(self):
        """Avg thinking time between 5000 and 10000 (exclusive) should be 'thoughtful'."""
        assert classify_thinking_pattern(5001.0) == "thoughtful"
        assert classify_thinking_pattern(7500.0) == "thoughtful"
        assert classify_thinking_pattern(10000.0) == "thoughtful"

    def test_moderate_thinking(self):
        """Avg thinking time between 2000 and 5000 (exclusive) should be 'moderate'."""
        assert classify_thinking_pattern(2001.0) == "moderate"
        assert classify_thinking_pattern(3500.0) == "moderate"
        assert classify_thinking_pattern(5000.0) == "moderate"

    def test_quick(self):
        """Avg thinking time <= 2000ms should be 'quick'."""
        assert classify_thinking_pattern(2000.0) == "quick"
        assert classify_thinking_pattern(1000.0) == "quick"
        assert classify_thinking_pattern(0.0) == "quick"

    def test_boundary_10000(self):
        """Thinking time of exactly 10000 should be 'thoughtful' (not deliberate)."""
        assert classify_thinking_pattern(10000.0) == "thoughtful"

    def test_boundary_5000(self):
        """Thinking time of exactly 5000 should be 'moderate' (not thoughtful)."""
        assert classify_thinking_pattern(5000.0) == "moderate"

    def test_boundary_2000(self):
        """Thinking time of exactly 2000 should be 'quick' (not moderate)."""
        assert classify_thinking_pattern(2000.0) == "quick"


# ===========================================================================
# Tests for classify_error_tendency
# ===========================================================================

class TestClassifyErrorTendency:
    """Tests for error rate-based tendency classification."""

    def test_zero_characters_returns_unknown(self):
        """If no characters typed, should return 'unknown'."""
        assert classify_error_tendency(0, 0) == "unknown"
        assert classify_error_tendency(5, 0) == "unknown"

    def test_accurate(self):
        """Error rate < 2% should be 'accurate'."""
        # 1 error in 100 chars = 1%
        assert classify_error_tendency(1, 100) == "accurate"
        # 0 errors
        assert classify_error_tendency(0, 100) == "accurate"
        # 19 errors in 1000 chars = 1.9%
        assert classify_error_tendency(19, 1000) == "accurate"

    def test_normal(self):
        """Error rate between 2% and 5% (exclusive) should be 'normal'."""
        # 3 errors in 100 chars = 3%
        assert classify_error_tendency(3, 100) == "normal"
        # 2 errors in 100 chars = 2%
        assert classify_error_tendency(2, 100) == "normal"
        # 49 errors in 1000 chars = 4.9%
        assert classify_error_tendency(49, 1000) == "normal"

    def test_error_prone(self):
        """Error rate between 5% and 10% (exclusive) should be 'error_prone'."""
        # 5 errors in 100 chars = 5%
        assert classify_error_tendency(5, 100) == "error_prone"
        # 7 errors in 100 chars = 7%
        assert classify_error_tendency(7, 100) == "error_prone"
        # 99 errors in 1000 chars = 9.9%
        assert classify_error_tendency(99, 1000) == "error_prone"

    def test_high_error(self):
        """Error rate >= 10% should be 'high_error'."""
        # 10 errors in 100 chars = 10%
        assert classify_error_tendency(10, 100) == "high_error"
        # 20 errors in 100 chars = 20%
        assert classify_error_tendency(20, 100) == "high_error"

    def test_boundary_2_percent(self):
        """Error rate of exactly 2% should be 'normal'."""
        assert classify_error_tendency(2, 100) == "normal"

    def test_boundary_5_percent(self):
        """Error rate of exactly 5% should be 'error_prone'."""
        assert classify_error_tendency(5, 100) == "error_prone"

    def test_boundary_10_percent(self):
        """Error rate of exactly 10% should be 'high_error'."""
        assert classify_error_tendency(10, 100) == "high_error"

    def test_very_low_error_rate(self):
        """1 error in 10000 chars = 0.01% should be 'accurate'."""
        assert classify_error_tendency(1, 10000) == "accurate"

    def test_very_high_error_rate(self):
        """50 errors in 100 chars = 50% should be 'high_error'."""
        assert classify_error_tendency(50, 100) == "high_error"
