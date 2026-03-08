# MAIT (MyAITutor) - Codebase Review

**Date**: 2026-02-23
**Branch**: `claude/review-codebase-sqhR2`

---

## Project Overview

**MAIT (MyAITutor)** is an AI-powered tutoring application for NSW HSC Mathematics students. It features a FastAPI backend with Google Gemini integration and a React/Vite frontend with an in-browser WebLLM local model. The project is branded as "Mate" - a friendly Australian AI tutor.

### Architecture

```
mait-mvp-glitch/
├── backend/          # Python FastAPI backend
│   ├── app/
│   │   ├── main.py           # FastAPI app, endpoints
│   │   ├── models.py         # Pydantic models
│   │   └── services/
│   │       ├── gemini_client.py      # Google Gemini API integration
│   │       ├── educational_agent.py  # Response generation orchestrator
│   │       ├── wellness_engine.py    # Fatigue tracking system
│   │       ├── syllabus_service.py   # RAG syllabus wrapper (disabled)
│   │       └── rag/                  # RAG subsystem (disabled - ChromaDB hangs)
│   │           ├── retrieval_service.py
│   │           ├── vector_store.py
│   │           ├── document_processor.py
│   │           ├── embeddings.py
│   │           └── config.py
│   ├── data/                # Syllabus PDF and text
│   └── test_*.py            # Various test scripts
├── frontend/         # React + Vite + Tailwind CSS
│   └── src/
│       ├── App.jsx                    # Main application component
│       ├── LandingPage.jsx            # Authentication/landing page
│       ├── main.jsx                   # React entry point
│       ├── index.css                  # Custom CSS with design system
│       ├── features/slm/             # Local SLM (Small Language Model)
│       │   ├── components/ChatInterface.jsx
│       │   ├── components/MessageBubble.jsx
│       │   ├── components/CodeVerifier.jsx
│       │   ├── components/GraphViewer.jsx
│       │   └── services/ModelService.js
│       ├── components/
│       │   ├── Avatar.jsx
│       │   └── KeystrokeAnalytics.jsx
│       ├── hooks/useKeystrokeTracker.js
│       ├── services/KeystrokeMetricsService.js
│       └── utils/
│           ├── privacy.js             # PII scanning
│           └── cn.js                  # className utility
└── documentation files (.md, .pdf)
```

---

## Verification Results

### Backend

| Check | Result |
|-------|--------|
| **Dependencies install** | PASS - `requirements-minimal.txt` installs cleanly |
| **Imports resolve** | PASS - `from app.main import app` succeeds |
| **Server starts** | PASS - Uvicorn starts on port 8000, no errors |
| **GET /** | PASS - Returns `{"status":"online","system":"MAIT MVP"}` |
| **GET /context/{id}** | PASS - Returns full StudentContext with defaults |
| **POST /reset/{id}** | PASS - Resets student context successfully |
| **POST /keystroke-metrics** | PASS - Accepts metrics, returns updated profile |
| **GET /keystroke-profile/{id}** | PASS - Returns keystroke psychometric profile |
| **POST /subscribe** | PASS - Saves email to waitlist |
| **Input validation** | PASS - Empty query correctly rejected with 422 |
| **GET /docs** | PASS - OpenAPI/Swagger docs accessible |
| **POST /interact** | FAIL (expected) - No Gemini API key configured |
| **POST /query** | FAIL (expected) - No Gemini API key configured |
| **Fatigue fast-spam test** | PASS - 10 rapid messages spike to 100 |
| **Fatigue slow-pace test** | FAIL - Algorithm accumulates even with timestamp manipulation |

### Frontend

| Check | Result |
|-------|--------|
| **npm install** | PASS - 269 packages, 2 moderate vulnerabilities |
| **vite build** | PASS - Builds successfully in ~13s |
| **Bundle warning** | WARNING - JS bundle is 6.3MB (WebLLM library is large) |

---

## Key Features Reviewed

### 1. Fatigue-Aware Tutoring System
- **Models**: `FatigueMetric` with FRESH/WEARY/LOCKOUT states (0-100 score)
- **Wellness Engine**: Rolling window intensity tracking with exponential scaling
- **Behavior**: Response complexity decreases with fatigue; LOCKOUT blocks interaction
- **Issue**: The exponential fatigue formula `BASE * (count ^ 1.6)` is aggressive - 5 messages in 15 minutes already triggers LOCKOUT (score 95). The slow-pace test fails because message count in the window accumulates regardless of spacing within the window.

### 2. Google Gemini Integration
- Uses `google-genai` SDK with `gemini-3-flash-preview` model
- Async client with 30s timeout and 3 retries with exponential backoff
- System prompt instructs Gemini to act as a "raw data provider" with structured sections
- Fatigue state injected into system prompt to control output verbosity
- **Note**: RAG/ChromaDB integration is fully coded but disabled due to hangs at import

### 3. Local SLM (Small Language Model)
- Uses `@mlc-ai/web-llm` to run `Llama-3.2-3B-Instruct-q4f32_1-MLC` in-browser
- Falls back from `window.ai` (Gemini Nano, currently disabled) to WebLLM
- Streaming chat with chunked message display
- Separate ChatInterface with its own message queue system

### 4. Keystroke Psychometrics
- Comprehensive keystroke tracking: WPM, dwell time, flight time, thinking time
- Behavioral classification: typing speed, consistency, thinking pattern, error tendency
- Backend aggregation across sessions with weighted averages
- **Note**: Currently disabled in App.jsx (hardcoded stubs replacing the hook)

### 5. Privacy Shield
- Client-side PII scanning before data leaves the browser
- Detects Australian mobile numbers, emails, credit card numbers
- **Note**: The `scanForPII` function is imported but never called in the current flow

### 6. Authentication
- Simple access code gate: `HSCMATE2026` hardcoded in `LandingPage.jsx`
- No real authentication/session management
- Student ID generated via `crypto.randomUUID()` and persisted in localStorage

### 7. Design System
- Custom "retro-futuristic cosmic" dark theme
- Tailwind CSS with HSL CSS variables for theming
- Glass morphism cards, glow effects, glitch animations
- JetBrains Mono + Outfit font pairing
- LaTeX rendering via KaTeX with remark-math/rehype-katex

---

## Issues Found

### Critical

1. **Security: `exec()` in educational_agent.py:71** - The `execute_verification_code` function runs arbitrary Python code from LLM responses using `exec()`. Even with a restricted globals dict, this is a code execution vulnerability. An adversarial prompt could cause the LLM to generate malicious Python that gets executed server-side.

2. **Security: Hardcoded access code** - `HSCMATE2026` is hardcoded in frontend source code (`LandingPage.jsx:11`). Anyone can view it via browser dev tools.

3. **Security: CORS is `allow_origins=["*"]`** - Despite `CRITICAL_FIXES.md` documenting this as fixed, the actual code in `main.py:31` still has `allow_origins=["*"]` with a comment "REVERTED: Allow all for MVP dev to fix 400 Error".

### High

4. **RAG system completely disabled** - ChromaDB hangs on import, so the entire RAG pipeline (document processing, vector store, retrieval service) is bypassed. Comments throughout the code indicate this. The Gemini client operates without syllabus context.

5. **Fatigue algorithm is too aggressive** - The formula `BASE_FATIGUE_PER_MESSAGE * (messages_in_window ** 1.6)` means just 5 messages in a 15-minute window reaches score 95 (LOCKOUT). This would frustrate real students who are genuinely studying.

6. **No Gemini API key** - The `.env` file doesn't exist (only `.env.example`). The `/interact` and `/query` endpoints return 500 errors without it.

7. **In-memory session storage** - All student contexts are stored in a Python dict (`sessions`). Server restart loses all data. No TTL cleanup, so memory grows unbounded.

### Medium

8. **Keystroke tracking disabled** - The `useKeystrokeTracker` hook is imported but replaced with hardcoded stubs in `App.jsx:54-59`. The entire psychometric feature is non-functional in the main chat view.

9. **Privacy scanner unused** - `scanForPII` is imported in `App.jsx:7` but never called anywhere in the component.

10. **Hardcoded local file paths in RAG config** - `config.py:12-15` references `/Users/darayeet/Documents/...` paths that only work on one developer's machine.

11. **Large frontend bundle** - The production JS bundle is 6.3MB, primarily due to the WebLLM library. This would cause slow initial loads.

12. **`test_fatigue.py` slow-pace test fails** - The test's timestamp manipulation doesn't effectively simulate spaced messages because `update_fatigue()` calls `datetime.now()` internally, and messages all appear in the same window.

13. **Deprecated Pydantic Config class** - `models.py:24-28` uses `class Config` with `json_encoders` which is deprecated in Pydantic v2 (should use `model_config` with `ConfigDict`).

14. **Deprecated FastAPI lifecycle** - `main.py:20` uses `@app.on_event("startup")` which is deprecated in favor of the `lifespan` parameter.

### Low

15. **No unit tests** - The existing test files are manual scripts, not proper pytest test suites.

16. **Dead code** - Multiple debug files in backend root (`debug_*.py`, `verify_api.py`, `list_models.py`, `output.txt`, `gemini_debug_log.txt`).

17. **Email storage in flat JSON file** - `emails.json` is a flat file used for waitlist storage, with no deduplication or validation beyond basic email format.

18. **`.DS_Store` committed** - macOS metadata file is in the repository root.

---

## Summary

The MAIT MVP is a well-structured educational technology prototype with an ambitious feature set: fatigue-aware AI tutoring, in-browser local LLM, keystroke psychometrics, and RAG-based syllabus retrieval. The backend API works correctly for all non-Gemini endpoints, and the frontend builds cleanly.

The main gaps are: (1) the RAG system is disabled, (2) the `exec()` code execution is a security risk, (3) the fatigue formula needs tuning, and (4) several features (keystroke tracking, PII scanning) are coded but not wired up. The CORS fix documented in CRITICAL_FIXES.md was reverted. With a Gemini API key configured, the core tutoring flow would be functional.
