# Keystroke Psychometrics System

## Overview

A real-time keystroke dynamics tracking system that measures typing patterns to build a psychometric profile of each student. Data persists locally and syncs to the backend.

## Files Created

| File | Location | Purpose |
|------|----------|---------|
| `KeystrokeMetricsService.js` | `/frontend/src/services/` | Core singleton service for tracking |
| `useKeystrokeTracker.js` | `/frontend/src/hooks/` | React hook wrapper |
| `KeystrokeAnalytics.jsx` | `/frontend/src/components/` | Visual dashboard UI |

## Files Modified

| File | Changes |
|------|---------|
| `App.jsx` | Added hook integration, keystroke handlers on input, sync to backend on message send, analytics panel toggle |
| `models.py` | Added `KeystrokeMetrics`, `KeystrokeProfile`, `KeystrokeSubmission` models; added `keystroke_profile` to `StudentContext` |
| `main.py` | Added 3 new endpoints + classification helper functions |

## Metrics Tracked

| Metric | Description | Unit |
|--------|-------------|------|
| **WPM** | Words per minute (5 chars = 1 word) | wpm |
| **Real-time WPM** | Rolling 10-second window | wpm |
| **Dwell Time** | Key press duration | ms |
| **Flight Time** | Gap between keystrokes | ms |
| **Thinking Time** | Pauses > 2 seconds | ms |
| **Error Rate** | Backspace/delete per 100 chars | % |
| **Rhythm Variance** | Typing consistency score | variance |
| **Message Frequency** | Messages per minute (15-min window) | msg/min |

## API Endpoints

```
POST   /keystroke-metrics           Submit session metrics
GET    /keystroke-profile/{id}      Retrieve student profile
DELETE /keystroke-profile/{id}      Reset profile
```

### Request Body (`POST /keystroke-metrics`)
```json
{
  "student_id": "string",
  "metrics": {
    "wpm": 45.0,
    "avg_dwell_time_ms": 120.0,
    "avg_flight_time_ms": 85.0,
    "avg_thinking_time_ms": 3500.0,
    "total_thinking_time_ms": 7000.0,
    "error_corrections": 3,
    "error_rate": 2.1,
    "characters_typed": 142,
    "session_duration_ms": 18500,
    "rhythm_variance": 8500.0,
    "keystroke_count": 156
  }
}
```

## Behavioral Classification

| Category | Levels |
|----------|--------|
| Typing Speed | `fast` (>60), `moderate` (>40), `slow` (>20), `very_slow` |
| Consistency | `very_consistent`, `consistent`, `moderate`, `variable` |
| Thinking Pattern | `deliberate`, `thoughtful`, `moderate`, `quick` |
| Error Tendency | `accurate`, `normal`, `error_prone`, `high_error` |

## Usage

### Frontend Hook
```jsx
const { metrics, historicalMetrics, handlers, recordMessage } = useKeystrokeTracker();

<input
  onKeyDown={handlers.onKeyDown}
  onKeyUp={handlers.onKeyUp}
  onFocus={handlers.onFocus}
  onBlur={handlers.onBlur}
/>

// On message submit
const sessionMetrics = recordMessage();
```

### Accessing Analytics Panel
Click the **PSYCHOMETRICS** button in the header (shows real-time WPM when typing).

## Storage

- **Frontend**: `localStorage` key `mait_keystroke_metrics` (persists across sessions)
- **Backend**: In-memory `sessions` dict (resets on server restart)

## Thresholds

| Parameter | Value |
|-----------|-------|
| Thinking threshold | 2000ms |
| Real-time WPM window | 10 seconds |
| Session history limit | 50 sessions |
| Message frequency window | 15 minutes |
