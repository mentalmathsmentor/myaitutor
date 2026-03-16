# MAIT Pre-Canvas Refactor Plan

> **Purpose:** Fix every known fault in the codebase before starting Native Canvas Phase 1.
>
> **Scope:** Backend (`main.py`, services) + Frontend (`App.jsx`, `WorksheetGenerator.jsx`).
>
> **Estimated effort with AI agents:** 1 day. Each section is self-contained and can be parallelized.
>
> **Rule:** Zero new features. Only fix, split, and harden.

---

## Priority Tiers

| Tier | What | Why |
|---|---|---|
| **P0 — Security** | Auth bypass, access code leak, unprotected routes | Exploitable in production today |
| **P1 — Backend Structure** | Router separation, logging, error handling | Blocks clean Canvas route mounting |
| **P2 — Frontend Structure** | State extraction, component split | Blocks Canvas workspace without causing re-render hell |
| **P3 — Code Quality** | Magic numbers, dead code, consistency | Nice-to-have, do if time permits |

---

## P0 — Security Fixes (Do First, ~30 minutes)

### P0.1 Fix `verify_student_auth()` — Auth Bypass

**File:** `backend/app/main.py` line 48-51

**Bug:** If the `X-Student-Id` header is missing entirely, the check passes silently. Any client can access any student's data by simply omitting the header.

**Current:**
```python
async def verify_student_auth(request: Request, student_id: str):
    header_id = request.headers.get("X-Student-Id")
    if header_id and header_id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized: Student ID mismatch")
```

**Fix:**
```python
async def verify_student_auth(request: Request, student_id: str):
    header_id = request.headers.get("X-Student-Id")
    if not header_id or header_id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
```

### P0.2 Add Auth to Unprotected Routes

**File:** `backend/app/main.py`

These routes accept `student_id` but never call `verify_student_auth()`:

| Route | Line | Risk |
|---|---|---|
| `POST /keystroke-metrics` | 384 | Inject fake psychometric data for any student |
| `GET /keystroke-profile/{student_id}` | 447 | Read any student's typing behavior |
| `DELETE /keystroke-profile/{student_id}` | 457 | Delete any student's keystroke profile |
| `GET /auth/me/{student_id}` | 371 | Read any student's auth status |
| `POST /auth/migrate` | 325 | Migrate any student's data without authorization |

**Fix:** Add `await verify_student_auth(request, student_id)` as the first line of each handler. For `/auth/migrate`, validate that the requester owns the `old_student_id`.

### P0.3 Remove Access Code from Debug Logs

**File:** `backend/app/main.py` line 271

**Bug:** Prints the expected access code to stdout: `print(f"DEBUG AUTH: Received '{received_code}', Expected '{expected_code}'")`

**Fix:** Delete this line entirely. If debugging is needed, log only whether the check passed or failed, never the expected value.

### P0.4 Remove Default Hardcoded Access Code

**File:** `backend/app/main.py` line 269

**Current:** `expected_code = os.getenv("MAIT_ACCESS_CODE", "HSCMATE2026").strip().upper()`

The default fallback means anyone running without the env var set has a known access code.

**Fix:** Remove the default. If `MAIT_ACCESS_CODE` is not set, reject all access code attempts:
```python
expected_code = os.getenv("MAIT_ACCESS_CODE")
if not expected_code:
    raise HTTPException(status_code=503, detail="Access code verification is not configured")
expected_code = expected_code.strip().upper()
```

### P0.5 Add Rate Limiting to Critical Unprotected Routes

**File:** `backend/app/main.py`

Currently rate-limited (3 of 18 routes):
- `POST /interact` — 20/min
- `POST /generate-worksheet` — 5/min
- `POST /api/feedback` — 5/min

**Add rate limiting to:**

| Route | Recommended Limit | Reason |
|---|---|---|
| `POST /query` | `15/minute` | Hits Gemini API, costs money |
| `POST /auth/verify-access` | `5/minute` | Brute-force access code |
| `POST /auth/google` | `10/minute` | OAuth token verification |
| `POST /auth/migrate` | `3/minute` | Data migration, sensitive |
| `POST /reset/{student_id}` | `3/minute` | Destructive (deletes history) |
| `POST /keystroke-metrics` | `30/minute` | Flood protection |

**Implementation:** Add `@limiter.limit("N/minute")` decorator to each route.

### P0.6 Tighten CORS Configuration

**File:** `backend/app/main.py` lines 68-77

**Current:** `allow_methods=["*"]`, `allow_headers=["*"]`

**Fix:**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-Student-Id", "Authorization"],
)
```

### P0.7 Add `--no-shell-escape` to pdflatex

**File:** `backend/app/services/artifact_engine.py` line 472

**Current:** pdflatex runs with `-interaction=nonstopmode` and `-halt-on-error` but no shell-escape restriction.

**Fix:** Add `"--no-shell-escape"` to the subprocess args list to prevent `\write18` command injection from malicious LaTeX.

---

## P1 — Backend Structural Refactor (~2 hours)

### P1.1 Split `main.py` into APIRouter Modules

**Current:** 672 lines, all routes in one file.

**Target structure:**
```
backend/app/
├── main.py                    ← App factory, middleware, startup only (~60 lines)
├── dependencies.py            ← Shared dependencies (verify_student_auth, get_context)
├── routers/
│   ├── __init__.py
│   ├── health.py              ← GET / (health check)
│   ├── interactions.py        ← POST /interact, POST /query, GET /context, GET /history, POST /reset
│   ├── auth.py                ← POST /auth/verify-access, /auth/google, /auth/migrate, GET /auth/me
│   ├── keystroke.py           ← POST /keystroke-metrics, GET/DELETE /keystroke-profile
│   ├── artifacts.py           ← POST /generate-worksheet, GET /worksheet-topics
│   ├── feedback.py            ← POST /api/feedback
│   └── waitlist.py            ← POST /subscribe, POST /visit, GET /visits
```

**Implementation steps:**

1. Create `backend/app/dependencies.py`:
```python
"""Shared FastAPI dependencies used across routers."""
from fastapi import Request, HTTPException
from .services.storage import get_context as _get_context, save_context as _save_context
from .models import StudentContext

async def verify_student_auth(request: Request, student_id: str):
    """Validate X-Student-Id header matches the requested student."""
    header_id = request.headers.get("X-Student-Id")
    if not header_id or header_id != student_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

async def get_or_create_context(student_id: str) -> StudentContext:
    """Fetch existing context or create a fresh one."""
    context = await _get_context(student_id)
    if context is None:
        context = StudentContext(student_id=student_id)
        await _save_context(student_id, context)
    return context
```

2. Create each router file using `APIRouter`:
```python
# Example: routers/interactions.py
from fastapi import APIRouter, Request
from ..dependencies import verify_student_auth, get_or_create_context

router = APIRouter()

@router.post("/interact")
@limiter.limit("20/minute")
async def interact(request: Request, body: InteractionRequest):
    await verify_student_auth(request, body.student_id)
    # ... existing logic
```

3. Slim down `main.py` to just:
```python
from fastapi import FastAPI
from .routers import health, interactions, auth, keystroke, artifacts, feedback, waitlist

app = FastAPI(title="My AI Tutor")

# Middleware (CORS, rate limiter, Sentry)
# ...

# Startup event (init_db, RAG)
# ...

# Mount routers
app.include_router(health.router)
app.include_router(interactions.router)
app.include_router(auth.router, prefix="/auth")
app.include_router(keystroke.router)
app.include_router(artifacts.router)
app.include_router(feedback.router, prefix="/api")
app.include_router(waitlist.router)
```

**Why this matters for Canvas:** The Canvas routes (`POST /documents`, `POST /documents/{id}/compile`, etc.) will be mounted as `app.include_router(canvas.router, prefix="/api/v1/canvas")`. Without router separation, you'd be adding ~15 more endpoints to a 672-line file.

### P1.2 Replace All `print()` with Structured Logging

**File:** All backend files

**10 print statements to replace:**

| File | Line | Current | Replacement |
|---|---|---|---|
| `main.py` | 62 | `print("MAIT Backend starting...")` | `logger.info("MAIT Backend starting")` |
| `main.py` | 64 | `print("SQLite database initialized.")` | `logger.info("SQLite database initialized")` |
| `main.py` | 65 | `print("RAG system enabled...")` | `logger.info("RAG system enabled", extra={"backend": "FAISS"})` |
| `main.py` | 66 | `print("Application startup complete.")` | `logger.info("Application startup complete")` |
| `main.py` | 183 | `print(f"RAG retrieval failed...")` | `logger.warning("RAG retrieval failed", exc_info=True)` |
| `main.py` | 271 | `print(f"DEBUG AUTH: ...")` | **DELETE** (security leak) |
| `main.py` | 540 | `print(f"[A.G.E.] Worksheet generation failed...")` | `logger.error("Worksheet generation failed", exc_info=True)` |
| `main.py` | 550 | `print(f"[A.G.E.] Unexpected error...")` | `logger.error("Unexpected worksheet error", exc_info=True)` |
| `main.py` | 636 | `print("[Feedback] RESEND_API_KEY is not set.")` | `logger.warning("RESEND_API_KEY not configured")` |
| `main.py` | 661 | `print(f"[Feedback] Failed to send email...")` | `logger.error("Feedback email dispatch failed", exc_info=True)` |

Also replace print statements in:
- `artifact_engine.py` (lines 423, 425, 435, 439, 524, 535, 538, 557)
- `gemini_client.py` (line 175 — `DEBUG: Gemini Raw Response` — **delete or move to debug level**)

**Setup pattern:**
```python
# backend/app/logging_config.py
import logging
import sentry_sdk

def setup_logging():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

# In each module:
import logging
logger = logging.getLogger(__name__)
```

Sentry is already configured (lines 36-43 in `main.py`) but never used in route handlers. With proper `logging.error(..., exc_info=True)`, Sentry will automatically capture exceptions.

### P1.3 Standardize Error Handling

**Pattern to apply across all routers:**

```python
# dependencies.py
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

class ServiceError(Exception):
    """Base exception for MAIT service errors."""
    def __init__(self, message: str, user_message: str = "Something went wrong"):
        self.message = message
        self.user_message = user_message
        super().__init__(message)

# In route handlers:
try:
    result = await some_service_call()
except ServiceError as e:
    logger.error(e.message, exc_info=True)
    raise HTTPException(status_code=500, detail=e.user_message)
except Exception as e:
    logger.error("Unexpected error", exc_info=True)
    raise HTTPException(status_code=500, detail="An unexpected error occurred")
```

**Specific fixes:**

1. **`/query` route (line ~162):** Verify that `request.complexity` is correctly accessing the body parameter, not the FastAPI Request object. The audit flagged a potential `AttributeError` — confirm and fix if the parameter names are shadowed.

2. **Visit counter (line 606-607):** Currently silently returns `{"count": 0}` on any error. Add logging:
```python
except Exception as e:
    logger.warning("Visit counter read failed", exc_info=True)
    return {"count": 0}
```

3. **Worksheet generation (lines 541-557):** Don't leak raw Gemini/pdflatex errors to the client. Replace:
```python
# Before:
detail={"error": "worksheet_generation_failed", "message": str(e)}
# After:
detail={"error": "worksheet_generation_failed", "message": "Worksheet generation failed. Please try again."}
```
Log the full error server-side with `logger.error(...)`.

### P1.4 Move Utility Functions Out of `main.py`

**Keystroke classification functions** (lines 467-507 in `main.py`) are pure utility functions that don't belong in the route file.

**Move to:** `backend/app/services/keystroke_utils.py`

```python
# keystroke_utils.py
def classify_typing_speed(wpm: float) -> str: ...
def classify_consistency(variance: float) -> str: ...
def classify_thinking_pattern(avg_thinking_ms: float) -> str: ...
def classify_error_tendency(error_rate: float) -> str: ...
```

**Import in router:** `from ..services.keystroke_utils import classify_typing_speed, ...`

---

## P2 — Frontend Structural Refactor (~2 hours)

### P2.1 Extract State into Zustand Stores

**Current:** 28 `useState` + 6 `useRef` in one component.

**Target:** 4 Zustand stores (installing Zustand is already planned for Canvas Phase 1 — do it now).

#### Store 1: `stores/chatStore.js`
Owns all chat-related state. Used by the chat page and Canvas revision panel.

```javascript
// stores/chatStore.js
import { create } from 'zustand'

export const useChatStore = create((set, get) => ({
  // State
  messages: [/* initial greeting */],
  input: '',
  loading: false,
  context: null,
  messageQueue: [],
  pendingQueue: [],

  // Actions
  setInput: (input) => set({ input }),
  setLoading: (loading) => set({ loading }),
  addMessage: (msg) => set(state => ({ messages: [...state.messages, msg] })),
  setMessages: (messages) => set({ messages }),
  setContext: (context) => set({ context }),
  enqueue: (msg) => set(state => ({ messageQueue: [...state.messageQueue, msg] })),
  dequeue: () => set(state => ({
    messageQueue: state.messageQueue.slice(1)
  })),
  clearHistory: () => set({ messages: [/* greeting */] }),
}))
```

**Migrated from App.jsx:**
- `messages` (line 121) → `chatStore.messages`
- `input` (line 125) → `chatStore.input`
- `loading` (line 126) → `chatStore.loading`
- `context` (line 120) → `chatStore.context`
- `messageQueue` (line 131) → `chatStore.messageQueue`
- `pendingQueue` (line 151) → `chatStore.pendingQueue`

#### Store 2: `stores/modelStore.js`
Owns all local brain / model download state. Only used in demo mode.

```javascript
// stores/modelStore.js
export const useModelStore = create((set) => ({
  isModelReady: false,
  modelLoading: 'Initializing...',
  downloadProgress: null,
  demoModelSize: 'balanced',
  localBrainChoice: null,
  loadedModelName: null,
  downloadError: null,
  webGPUError: null,
  showModelSwitchConfirm: null,

  setModelReady: (ready) => set({ isModelReady: ready }),
  setModelLoading: (msg) => set({ modelLoading: msg }),
  setDownloadProgress: (p) => set({ downloadProgress: p }),
  setDemoModelSize: (size) => set({ demoModelSize: size }),
  setLocalBrainChoice: (choice) => set({ localBrainChoice: choice }),
  setDownloadError: (err) => set({ downloadError: err }),
  setWebGPUError: (err) => set({ webGPUError: err }),
  reset: () => set({
    isModelReady: false, downloadProgress: null,
    downloadError: null, loadedModelName: null,
  }),
}))
```

**Migrated from App.jsx:**
- `isModelReady` (line 128)
- `modelLoading` (line 127)
- `downloadProgress` (line 129)
- `demoModelSize` (line 142)
- `localBrainChoice` (line 143)
- `loadedModelName` (line 147)
- `downloadError` (line 144)
- `webGPUError` (line 145)
- `showModelSwitchConfirm` (line 146)

#### Store 3: `stores/uiStore.js`
Owns all modal/panel visibility state.

```javascript
// stores/uiStore.js
export const useUIStore = create((set) => ({
  page: getPageFromPath(),
  showLocalChat: false,
  showMobileSyllabus: false,
  showLoginModal: false,
  showKeystrokePanel: false,
  showOverlay: false,
  showAutoSavePrompt: false,
  showQueueConfirm: null,
  autoSaveEnabled: localStorage.getItem('mait_autosave') === 'true',
  isIdle: false,

  navigateTo: (page) => {
    window.history.pushState({}, '', `/${page}`)
    set({ page })
    window.scrollTo(0, 0)
  },
  setShowLoginModal: (show) => set({ showLoginModal: show }),
  setShowKeystrokePanel: (show) => set({ showKeystrokePanel: show }),
  setShowLocalChat: (show) => set({ showLocalChat: show }),
  setShowMobileSyllabus: (show) => set({ showMobileSyllabus: show }),
  setIsIdle: (idle) => set({ isIdle: idle }),
  toggleAutoSave: () => set(state => {
    const next = !state.autoSaveEnabled
    localStorage.setItem('mait_autosave', String(next))
    return { autoSaveEnabled: next }
  }),
}))
```

**Migrated from App.jsx:**
- `page` (line 83)
- `showLocalChat` (line 84)
- `showMobileSyllabus` (line 85)
- `showLoginModal` (line 86)
- `showKeystrokePanel` (line 137)
- `showOverlay` (line 130)
- `showAutoSavePrompt` (line 148)
- `showQueueConfirm` (line 152)
- `autoSaveEnabled` (line 149)
- `isIdle` (line 155)

#### Store 4: `stores/timerStore.js`
Owns study timer and clock state.

```javascript
// stores/timerStore.js
export const useTimerStore = create((set) => ({
  currentTime: new Date(),
  studyTimerRunning: false,
  studyTimerSeconds: 0,

  tick: () => set({ currentTime: new Date() }),
  startTimer: () => set({ studyTimerRunning: true }),
  stopTimer: () => set({ studyTimerRunning: false }),
  resetTimer: () => set({ studyTimerSeconds: 0, studyTimerRunning: false }),
  incrementTimer: () => set(state => ({
    studyTimerSeconds: state.studyTimerSeconds + 1,
  })),
}))
```

**After migration, App.jsx drops from 28 useState to ~2** (`userProfile` stays local to App since it's auth-bound, and any truly transient UI state).

### P2.2 Split App.jsx into Route-Level Components

**Current:** 1,628 lines. One component renders everything.

**Target:**
```
frontend/src/
├── App.jsx                        ← Routing shell only (~80 lines)
├── layouts/
│   └── MarketingLayout.jsx        ← Navigation + footer wrapper for public pages
├── pages/
│   ├── ChatPage.jsx               ← Chat UI for page=app/demo (~400 lines)
│   ├── DemoPage.jsx               ← Demo-specific wrappers (model download, idle timer)
│   └── CanvasWorkspace.jsx        ← (Phase 1 — new file, already in Canvas plan)
├── components/
│   ├── chat/
│   │   ├── ChatContainer.jsx      ← Message list + input + auto-scroll
│   │   ├── MessageBubble.jsx      ← (already exists in features/slm/)
│   │   ├── ChatInput.jsx          ← Input field + send button
│   │   └── ChatHUD.jsx            ← Fatigue bar, timer, brain status toolbar
│   ├── modals/
│   │   ├── LoginModal.jsx         ← Google OAuth + access code login
│   │   ├── ModelSwitchModal.jsx   ← Confirm model switch dialog
│   │   ├── QueueConfirmModal.jsx  ← Message queue confirmation
│   │   └── AutoSavePrompt.jsx     ← Auto-save notification bar
│   └── ...existing components
```

**Slim App.jsx becomes:**
```jsx
function App() {
  const { page } = useUIStore()
  const { authUser, studentId } = useAuth()

  if (page === 'landing') return <MarketingLayout><NewLandingPage /></MarketingLayout>
  if (page === 'resources') return <MarketingLayout><AIResources /></MarketingLayout>
  if (page === 'worksheets') return <MarketingLayout><WorksheetGenerator /></MarketingLayout>
  if (page === 'pastpapers') return <MarketingLayout><PastPapers /></MarketingLayout>
  if (page === 'privacy') return <MarketingLayout><PrivacyPolicy /></MarketingLayout>
  if (page === 'demo') return <DemoPage studentId={studentId} />
  if (page === 'app') return <ChatPage studentId={studentId} authUser={authUser} />

  return <MarketingLayout><NewLandingPage /></MarketingLayout>
}
```

**Migration order:**
1. Create stores (P2.1) — no UI changes yet, just move state
2. Create `MarketingLayout.jsx` — extract the `Navigation + ErrorBoundary` wrapper
3. Extract `ChatPage.jsx` — move the `page === 'app'` JSX block and its handlers
4. Extract `ChatContainer.jsx`, `ChatInput.jsx`, `ChatHUD.jsx` from ChatPage
5. Extract modals into `components/modals/`
6. Slim App.jsx to routing shell

**Each step is independently testable.** The app should work identically after each extraction.

### P2.3 Extract Business Logic from Components into Hooks

**Current:** `processUserMessage()` is a ~200-line function inside App.jsx that handles math routing, cloud API calls, local model streaming, hybrid mode, and queue management.

**Target:** Extract into a custom hook:

```javascript
// hooks/useMessageProcessor.js
export function useMessageProcessor() {
  const { addMessage, setLoading } = useChatStore()
  const { isModelReady, localBrainChoice } = useModelStore()

  const processMessage = async (text, studentId) => {
    // Math engine check
    // Cloud API path
    // Local model path
    // Hybrid path
  }

  return { processMessage }
}
```

Also extract:
- `fetchContext()` → `hooks/useContextFetcher.js`
- `fetchHistory()` → `hooks/useHistoryLoader.js`
- Idle timer logic → `hooks/useIdleTimer.js` (already partially a concern of DemoPage)

### P2.4 Extract Constants and Config

**File:** Create `frontend/src/config/constants.js`

```javascript
// config/constants.js
export const API_URL = import.meta.env.VITE_API_URL || 'https://myaitutor-54iv.onrender.com'

// Rate/timing constants (currently magic numbers in App.jsx)
export const IDLE_TIMEOUT_MS = 5000
export const IDLE_REASONING_TIMEOUT_MS = 180000
export const MESSAGE_STAGGER_MS = 100
export const AUTO_SCROLL_THRESHOLD_PX = 150
export const KEYSTROKE_DEBOUNCE_MS = 200
export const MAX_HISTORY_LIMIT = 50
export const AUTO_SAVE_MIN_MESSAGES = 3

// Worksheet Generator (currently magic numbers in WorksheetGenerator.jsx)
export const QUESTION_SLIDER_MAX = 50
export const QUESTION_INPUT_MAX = 100
export const GEMINI_GEM_URL = 'https://gemini.google.com/gem/14I7EkTkmvun49uuifaHINSEv64BO_hbG?usp=sharing'
export const LAUNCH_DELAY_MS = 3000
```

Replace all magic numbers with these imports.

---

## P3 — Code Quality (~1 hour, if time permits)

### P3.1 Remove Dead Code

**App.jsx:**
- `firstTimeMode` (line 173 in WorksheetGenerator) — useState declared, never read. Delete.
- `includeCanvasSetup` (line 193 in WorksheetGenerator) — stored in localStorage, never used. Delete.

**WorksheetGenerator.jsx:**
- Duplicate validation logic in `copyToClipboard()` and `handleGeneratePdf()` — extract to `validateSelection()` and call from both.
- Hardcoded Gem URL appears 3 times — extract to constant (done in P2.4).

### P3.2 Fix Inconsistent localStorage Patterns

**Current:** Strings stored as `'true'`/`'false'` and compared with `=== 'true'`.

**Fix:** Create a tiny utility:
```javascript
// utils/storage.js
export const localStore = {
  getBool: (key, fallback = false) => {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === 'true'
  },
  setBool: (key, value) => localStorage.setItem(key, String(!!value)),
  getJSON: (key, fallback = null) => {
    try { return JSON.parse(localStorage.getItem(key)) } catch { return fallback }
  },
  setJSON: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
}
```

### P3.3 Fix WorksheetGenerator UX Issues

1. **Confusing primary action label:** Change "Generate Instructions & Launch Gemini" to "Copy to Clipboard & Open Gemini" — accurately describes what happens.

2. **Unused "First time mode" checkbox:** Remove entirely or wire it to show an onboarding overlay.

3. **Question count slider/input inconsistency:** Slider max is 50, input max is 100. Pick one (50 is reasonable for worksheets).

### P3.4 Backend: Consistent Async Patterns

- `POST /keystroke-metrics` handler is sync despite doing I/O — make async.
- `wellness_engine.check_wellness()` and `wellness_engine.update_fatigue()` are sync pure functions called from async routes — this is fine, no change needed.

### P3.5 Backend: PDF Temp Directory Cleanup

**File:** `backend/app/services/artifact_engine.py`

**Current:** PDF files are generated in `tempfile.mkdtemp()` directories that are never cleaned up unless compilation fails. Over time this leaks disk space.

**Fix:** Add cleanup after the FileResponse is sent. Use a background task:
```python
from fastapi import BackgroundTasks

@router.post("/generate-worksheet")
async def generate_worksheet(request: Request, body: WorksheetRequest, background_tasks: BackgroundTasks):
    pdf_path = await generate_worksheet_pdf(body)
    output_dir = os.path.dirname(pdf_path)
    background_tasks.add_task(shutil.rmtree, output_dir, True)
    return FileResponse(pdf_path, ...)
```

---

## Execution Plan

### Phase A: Security (P0) — 30 minutes
Run these in parallel:
- **Agent 1:** Fix `verify_student_auth()`, add auth to unprotected routes, remove debug log, remove default access code
- **Agent 2:** Add rate limiting decorators, tighten CORS, add `--no-shell-escape`

### Phase B: Backend Structure (P1) — 1 hour
Run these in parallel:
- **Agent 1:** Create `routers/` directory, split `main.py` into router files, create `dependencies.py`
- **Agent 2:** Replace all `print()` with logging, move keystroke utils, standardize error handling

### Phase C: Frontend Structure (P2) — 1 hour
Run sequentially (each step depends on prior):
1. Install Zustand: `npm install zustand`
2. Create 4 store files (chatStore, modelStore, uiStore, timerStore)
3. Migrate useState calls from App.jsx to stores (one store at a time, test between each)
4. Extract `MarketingLayout.jsx`
5. Extract `ChatPage.jsx`
6. Extract modals
7. Slim App.jsx to routing shell

### Phase D: Code Quality (P3) — 30 minutes
- Extract constants
- Remove dead code
- Fix localStorage patterns
- Add PDF cleanup

### Verification

After each phase, verify:
- `cd mait-mvp/backend && python -m pytest` (if tests exist)
- `cd mait-mvp/frontend && npm run build` (compilation check)
- Manual smoke test: login, send a chat message, generate a worksheet

---

## What NOT to Change

- **Do NOT add TypeScript.** It's a worthy goal but it's a multi-day migration that blocks Canvas work. Save it for post-V1.
- **Do NOT add React Router.** The custom routing works. Canvas will be one more `if (page === 'canvas')` branch. Not worth the migration cost now.
- **Do NOT refactor the RAG subsystem.** It works, it's isolated, and Canvas doesn't touch it.
- **Do NOT refactor `WorksheetGenerator.jsx` into step sub-components.** It's 1,413 lines but the steps are stable and won't change during Canvas work. The Canvas entry point ("Open in Canvas" button) is a small addition that doesn't require restructuring the wizard.
- **Do NOT add dependency injection to the backend.** The singleton/import pattern is fine for a solo-dev SQLite app. DI is enterprise overhead you don't need.

---

*Fix what's broken. Split what's blocking. Leave everything else alone.*
