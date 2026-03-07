# MAIT — MyAITutor

**Your AI Study Mate for HSC Maths**

MAIT is a personalised, empathetic, and curriculum-aligned AI learning companion built for NSW Higher School Certificate (HSC) Mathematics students. Unlike conventional AI chatbots that maximise screen time, MAIT is built on an ethical framework that prioritises student well-being and genuine learning — it knows when you're tired, adjusts its teaching style in real time, and locks you out when you need a break.

> *"Learns when you're tired. Knows when to push. The only tutor that optimises your cognitive load."*

Built by [Mental Maths Mentor](https://mentalmaths.au).

---

## Table of Contents

- [Core Vision](#core-vision)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Usage Guide](#usage-guide)
- [The Four Pillars](#the-four-pillars)
- [Privacy & Ethics](#privacy--ethics)
- [Roadmap](#roadmap)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

---

## Core Vision

MAIT's mission is to provide every student with a personalised, empathetic, and curriculum-aligned AI learning companion that prioritises academic growth **and** holistic well-being.

### What Makes MAIT Different

| Differentiator | Description |
|---|---|
| **Human-Centric Design** | Built on an ethical framework of student well-being, not engagement maximisation |
| **Proactive Wellness Engine** | Actively encourages healthy study habits — breaks, eye strain reduction, fatigue lockouts |
| **Deep Persona & Empathy** | "Mate" is not a faceless chatbot but a warm, Australian-voiced mentor that builds genuine connection |
| **Hyper-Specific Curriculum Alignment** | RAG system grounded in the official NSW NESA Mathematics syllabi |
| **Hybrid Edge-Cloud Architecture** | Local SLM for privacy and persona; cloud LLM for reasoning and syllabus truth |

### Target Audience

High school students in New South Wales, Australia — specifically those in Years 11 and 12 undertaking the HSC in Mathematics Advanced, Extension 1, and Extension 2.

---

## Key Features

### AI Tutoring Chat (Cloud Mode)
- **Socratic "Guide-Only" method** — Mate asks guiding questions, offers hints, and verifies solutions rather than giving answers directly
- **Fatigue-aware responses** — response length and complexity adapt to student energy levels (FRESH / WEARY / LOCKOUT)
- **Bloom's Taxonomy progression** — the system assesses demonstrated cognitive level (Remember through Create) and advances teaching strategies accordingly
- **LaTeX maths rendering** — equations rendered beautifully via KaTeX (`$$f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}$$`)
- **Code verification** — Python code blocks in responses are executed server-side and their outputs injected, ensuring mathematical accuracy
- **Structured responses** — every answer returns a `core_truth`, `explanation`, and `hints` for consistent pedagogical structure

### Free Demo Mode (Local SLM)
- **Runs entirely in your browser** via WebLLM + WebGPU — no API keys, no sign-up
- **Two model options**: SmolLM 360M (~200 MB, fast) or Llama 3.2 3B (~1.5 GB, higher quality)
- **Same "Mate" persona** — warm, encouraging, Australian expressions
- **Zero data leaves the device** — complete privacy for the demo experience

### Worksheet Generator (A.G.E. Engine)
- AI-powered NESA-styled worksheet creation
- Select topic, year level (11 / 12 Advanced / Ext 1 / Ext 2), question count (5-20), and difficulty
- Generates typeset-quality PDFs via LaTeX for print-ready worksheets

### Past Papers Browser
- Comprehensive catalogue of HSC past papers organised by year level and subject
- Sources: official NESA exam papers (2020-2025), THSC Online trial papers and internal assessments
- Built-in exam timer with countdown/count-up modes, preset durations, and danger-state warnings

### AI Resources Library
- 17+ ready-to-use AI prompt templates for students, teachers, and general users
- Copy-to-clipboard prompt cards covering homework help, exam revision, lesson planning, marking rubrics, and more

### Keystroke Psychometrics
- Real-time typing pattern analysis: WPM, dwell time, flight time, thinking pauses, error rate, rhythm variance
- Behavioural classification: typing speed, consistency, thinking pattern, error tendency
- Signals fed into the wellness engine to detect frustration, fatigue, and flow states
- Data persists locally in `localStorage` with optional backend sync

---

## Architecture

MAIT uses a **Hybrid Edge-Cloud Architecture** — decoupling emotional intelligence and context (local) from raw compute and reasoning (cloud).

```
┌──────────────────────────────────────────────────────────────┐
│                     BROWSER (The Edge)                       │
│                                                              │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │  React SPA  │  │ WebLLM (SLM) │  │ Keystroke Metrics   │ │
│  │  Vite +     │  │ SmolLM /     │  │ Service             │ │
│  │  Tailwind   │  │ Llama 3.2    │  │ (Psychometrics)     │ │
│  └──────┬──────┘  └──────────────┘  └──────────┬──────────┘ │
│         │              Demo Mode                │            │
│         │          (no cloud needed)            │            │
└─────────┼───────────────────────────────────────┼────────────┘
          │ HTTP POST /interact, /query           │ POST /keystroke-metrics
          │ POST /generate-worksheet              │
          ▼                                       ▼
┌──────────────────────────────────────────────────────────────┐
│                   FASTAPI BACKEND (The Cloud)                │
│                                                              │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────────┐ │
│  │  Wellness    │  │  Educational  │  │  Artifact Engine  │ │
│  │  Engine      │  │  Agent        │  │  (Worksheet Gen)  │ │
│  │  (Fatigue)   │  │  (Orchestr.)  │  │                   │ │
│  └──────────────┘  └───────┬───────┘  └───────────────────┘ │
│                            │                                 │
│  ┌──────────────┐  ┌──────┴────────┐  ┌───────────────────┐ │
│  │  Bloom's     │  │  Gemini       │  │  Syllabus RAG     │ │
│  │  Taxonomy    │  │  Client       │  │  (FAISS +         │ │
│  │  Engine      │  │  (Flash-Lite) │  │  Embeddings)      │ │
│  └──────────────┘  └───────────────┘  └───────────────────┘ │
│                                                              │
│  ┌──────────────┐  ┌───────────────────────────────────────┐ │
│  │  SQLite      │  │  NSW Maths Advanced Syllabus (PDF)    │ │
│  │  Storage     │  │  + FAISS Vector Index                 │ │
│  └──────────────┘  └───────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### Request Flow (Cloud Mode)

1. Student types a question; keystroke metrics are captured in real time
2. Frontend sends `POST /interact` with `student_id`, `query`, and `complexity`
3. **Wellness Engine** decays fatigue over idle time, then checks for LOCKOUT
4. **Bloom's Engine** assesses the question's cognitive level and selects a teaching strategy
5. **Syllabus RAG** retrieves relevant NSW curriculum context via FAISS embeddings
6. **Gemini Client** calls Gemini Flash with a fatigue-aware system prompt + syllabus context + Bloom's instruction
7. **Educational Agent** parses the structured response, executes any Python code blocks, and formats the reply
8. Response returns to the frontend with the tutor reply, updated fatigue state, Bloom's level, and mastery score

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework |
| **Vite 5** | Build tool and dev server |
| **Tailwind CSS 3** | Utility-first styling with custom retro-futuristic dark theme |
| **@mlc-ai/web-llm** | In-browser LLM inference via WebGPU |
| **KaTeX** | LaTeX maths rendering |
| **react-markdown** | Markdown rendering with remark-math / rehype-katex |
| **Framer Motion** | Animations |
| **Lucide React** | Icon library |

### Backend
| Technology | Purpose |
|---|---|
| **FastAPI** | Async Python web framework |
| **Uvicorn** | ASGI server |
| **Google Gemini (google-genai)** | Cloud LLM (Gemini 3.1 Flash-Lite, configurable via `GEMINI_MODEL` env var) |
| **FAISS** | Vector similarity search for RAG |
| **sentence-transformers** | Embedding generation for syllabus documents |
| **aiosqlite** | Async SQLite for persistent storage |
| **pdflatex** | PDF generation for worksheets |
| **Pydantic** | Data models and validation |

### Design System
- **Theme**: Retro-futuristic cosmic dark palette (HSL CSS variables)
- **Fonts**: Outfit (body) + JetBrains Mono (display/code)
- **Animations**: glitch, reveal-up, float, pulse-glow, shimmer

---

## Project Structure

```
myaitutor/
├── README.md                          ← you are here
├── mait-mvp/
│   ├── frontend/                      React + Vite SPA
│   │   ├── src/
│   │   │   ├── App.jsx                Main app + routing + chat UI
│   │   │   ├── LandingPage.jsx        Landing page + waitlist
│   │   │   ├── AIResources.jsx        AI prompt library
│   │   │   ├── WorksheetGenerator.jsx PDF worksheet tool
│   │   │   ├── PastPapers.jsx         Past papers browser + timer
│   │   │   ├── components/
│   │   │   │   ├── NavBar.jsx         Navigation bar
│   │   │   │   ├── Avatar.jsx         Tutor avatar
│   │   │   │   └── KeystrokeAnalytics.jsx  Psychometrics dashboard
│   │   │   ├── features/slm/         Local SLM (demo mode)
│   │   │   │   ├── components/
│   │   │   │   │   ├── ChatInterface.jsx   Local AI chat UI
│   │   │   │   │   ├── MessageBubble.jsx   Chat message component
│   │   │   │   │   ├── CodeVerifier.jsx    Code execution display
│   │   │   │   │   └── GraphViewer.jsx     Graph rendering
│   │   │   │   └── services/
│   │   │   │       └── ModelService.js     WebLLM engine manager
│   │   │   ├── hooks/
│   │   │   │   └── useKeystrokeTracker.js  Keystroke tracking hook
│   │   │   ├── services/
│   │   │   │   └── KeystrokeMetricsService.js  Typing analytics
│   │   │   └── utils/
│   │   │       ├── privacy.js         PII detection/redaction
│   │   │       └── cn.js             className utility
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── vite.config.js
│   │   ├── tailwind.config.js
│   │   └── postcss.config.js
│   │
│   ├── backend/                       FastAPI server
│   │   ├── app/
│   │   │   ├── main.py               Endpoints + CORS + startup
│   │   │   ├── models.py             Pydantic models (Fatigue, Bloom's, Keystroke, etc.)
│   │   │   └── services/
│   │   │       ├── gemini_client.py   Gemini API client (fatigue-aware prompting)
│   │   │       ├── educational_agent.py  Response orchestrator
│   │   │       ├── wellness_engine.py Fatigue tracking + lockout
│   │   │       ├── blooms_engine.py   Bloom's Taxonomy assessment
│   │   │       ├── syllabus_service.py  RAG syllabus wrapper
│   │   │       ├── artifact_engine.py Worksheet PDF generation
│   │   │       ├── storage.py         SQLite persistence
│   │   │       └── rag/              RAG subsystem
│   │   │           ├── config.py
│   │   │           ├── embeddings.py
│   │   │           ├── vector_store.py
│   │   │           ├── retrieval_service.py
│   │   │           └── document_processor.py
│   │   ├── data/
│   │   │   ├── Maths Advanced Syllabus.pdf
│   │   │   ├── Maths Advanced Syllabus.txt
│   │   │   └── faiss_index/          Pre-built vector index
│   │   ├── tests/
│   │   ├── .env.example
│   │   └── requirements.txt
│   │
│   ├── QUICKSTART.md                  5-minute setup guide
│   ├── SETUP.md                       Full setup + architecture
│   ├── GEMINI_INTEGRATION.md          LLM integration details
│   ├── KEYSTROKE_PSYCHOMETRICS.md     Typing analytics docs
│   └── CRITICAL_FIXES.md             Security fixes applied
│
└── *.pdf                              Project vision documents
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **Python** 3.10+ with **pip**
- A **Google Gemini API key** (free tier available) — [Get one here](https://aistudio.google.com/app/apikey)
- **pdflatex** (optional, for worksheet generation)
- A **WebGPU-capable browser** (Chrome 113+ or Edge 113+) for the local demo mode

### Quick Setup

#### 1. Clone the repository

```bash
git clone https://github.com/mentalmathsmentor/myaitutor.git
cd myaitutor/mait-mvp-glitch
```

#### 2. Backend

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # macOS/Linux
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# Start the server
uvicorn app.main:app --reload --port 8000
```

Backend will be available at `http://localhost:8000`. API docs at `http://localhost:8000/docs`.

#### 3. Frontend

In a separate terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Frontend will be available at `http://localhost:5173`.

#### 4. Try It Out

- Open `http://localhost:5173` in your browser
- **Full mode**: Ask Mate a maths question (e.g. "What is the derivative of x^2?")
- **Free demo**: Click "Try Free Demo" on the landing page — no API key needed, runs locally via WebGPU

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes (cloud mode) | Google Gemini API key |
| `GEMINI_MODEL` | No | Gemini model ID (default: `gemini-3.1-flash-lite`). Use `gemini-3.1-pro` for complex Extension 2 queries |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `http://localhost:5173,http://localhost:3000`). Production: `https://myaitutor.au,https://www.myaitutor.au` |
| `GOOGLE_CLIENT_ID` | Yes (Google login) | Google OAuth 2.0 Client ID — [Create one here](https://console.cloud.google.com/apis/credentials) |
| `VITE_GOOGLE_CLIENT_ID` | No | Frontend override for Google Client ID (default: uses hardcoded dev ID) |
| `VITE_API_URL` | No | Backend URL for the frontend (default: `http://127.0.0.1:8000`) |

---

## Usage Guide

### Pages

| Route | Description |
|---|---|
| `/` | Landing page with feature overview and waitlist |
| `/app` | Full AI tutoring chat (requires backend + API key) |
| `/demo` | Free local demo (runs in-browser via WebGPU, no backend needed) |
| `/resources` | AI prompt library for students, teachers, and everyone |
| `/worksheets` | AI worksheet generator (PDF download) |
| `/pastpapers` | HSC past papers browser with exam timer |

### Fatigue States

The Wellness Engine tracks cognitive fatigue using an exponential intensity model with time decay:

| State | Fatigue Score | Behaviour |
|---|---|---|
| **FRESH** (0-59%) | Low | Full detailed explanations with worked examples, up to 1500 tokens |
| **WEARY** (60-89%) | Moderate | Concise responses under 50 words, essential formulas only |
| **LOCKOUT** (90-100%) | High | Interaction blocked — "Take a break, mate" |

Fatigue increases exponentially with rapid-fire messages and decays at 2 points per minute of rest.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/interact` | Main tutoring interaction |
| `POST` | `/query` | Alternative query (chunked sections) |
| `GET` | `/context/{student_id}` | Retrieve student context |
| `POST` | `/reset/{student_id}` | Reset student context and conversation history |
| `GET` | `/history/{student_id}` | Retrieve conversation history for a student |
| `POST` | `/keystroke-metrics` | Submit keystroke session data |
| `GET` | `/keystroke-profile/{student_id}` | Get psychometric profile |
| `DELETE` | `/keystroke-profile/{student_id}` | Reset keystroke profile |
| `POST` | `/generate-worksheet` | Generate a PDF worksheet |
| `GET` | `/worksheet-topics` | List available worksheet topics |
| `POST` | `/subscribe` | Join the early access waitlist |
| `POST` | `/auth/google` | Google OAuth login (verify ID token, create/return user) |
| `POST` | `/auth/migrate` | Migrate anonymous data to Google account |
| `GET` | `/auth/me/{student_id}` | Get user profile for a student |

---

## The Four Pillars

The vision behind MAIT is organised into four core feature pillars:

### Pillar 1: The Knowledge Engine ("The Brain")
- **Syllabus-grounded AI** via RAG architecture pre-loaded with official NSW NESA syllabi
- **Dynamic context loading** based on state, year, and subject selection
- **Persistent memory** — the AI remembers past conversations and learning progress
- **Negative Constraint RAG** — a "Bouncer" that rejects university-level methods invalid for HSC marking (e.g. L'Hopital's rule when First Principles is required)

### Pillar 2: The Avatar System ("The Face")
- **"Mate" flagship persona** — supportive, knowledgeable, and relatable Australian mentor
- *Future*: Sims-4 level avatar customisation, animated emoting, historical/user-generated personas (Einstein for Physics, Shakespeare for English)

### Pillar 3: The Wellness Engine ("The Conscience")
- **Empathic fatigue system** with exponential intensity tracking and natural time decay
- **Keystroke psychometrics** — typing patterns signal frustration, flow, and fatigue
- *Future*: 20-20-20 eye strain rule, movement reminders, productive break queuing, tiered mental health support surface with crisis resource links

### Pillar 4: The Persona Engine ("The Soul")
- **Dynamic personality adaptation** based on user tone and interaction style
- **Socratic "Guess-First" workflow** — utilises API latency as a pedagogical tool (students guess while the cloud computes)
- *Future*: Dynamic TTS control, multimodal whiteboard generation, "Feynman" reverse-tutoring mode

---

## Privacy & Ethics

MAIT takes a **privacy-first** approach to student data:

- **Local-first processing** — the demo mode runs entirely in-browser via WebGPU; zero data leaves the device
- **PII detection** — a client-side privacy shield scans for and redacts personally identifiable information (names, phone numbers, emails, credit card numbers) before any data transits to the cloud
- **Isolated sessions** — each student gets a unique cryptographic ID via `crypto.randomUUID()`; no shared state between users
- **The "Data Shadow" philosophy** — the cloud intelligence never sees the user's identity or private data; only anonymised academic problems are transmitted
- **Safety boundaries** — a tiered response protocol for sensitive disclosures:
  - *Tier 1 (Mild)*: Empathetic response, encourages talking to a trusted person
  - *Tier 2 (Moderate)*: Surfaces professional resources (Kids Helpline, Beyond Blue)
  - *Tier 3 (Immediate risk)*: AI pauses; non-AI-generated modal with emergency services (000) and crisis line links

---

## Roadmap

### Current (MVP)
- [x] Cloud AI tutoring with fatigue-aware responses (Gemini Flash)
- [x] Local in-browser demo mode (WebLLM)
- [x] Bloom's Taxonomy progression engine
- [x] Syllabus RAG with FAISS embeddings (NSW Maths Advanced)
- [x] Keystroke psychometric tracking
- [x] Worksheet PDF generation
- [x] Past papers browser with exam timer
- [x] AI prompt resource library
- [x] PII privacy shield (client-side)
- [x] Waitlist / early access sign-up

### Next
- [x] Persistent conversation history in Gemini calls
- [ ] Streaming responses for real-time typing effect
- [x] Rate limiting (slowapi on `/interact` and `/generate-worksheet`)
- [ ] Session TTL cleanup
- [ ] Extension 1 and Extension 2 syllabus RAG documents
- [ ] "Guess-First" orchestrated latency workflow
- [ ] Topic mastery visualiser

### Future Vision
- [ ] Sims-4 level avatar customisation system
- [ ] Dynamic TTS with granular playback control
- [ ] "Feynman" reverse-tutoring mode
- [ ] Active Retrieval Blur (tap-to-unblur formulas)
- [ ] OCR camera input with Tri-Brain privacy stack
- [ ] Multimodal whiteboard (code-generated graphs/diagrams)
- [ ] Accessibility suite (OpenDyslexic, simplify text, TTS)
- [ ] Tutor platform with AI Digital Twin creation
- [ ] Expansion to English Advanced, Standard Maths, and Years 7-10

---

## Documentation

Detailed technical documentation lives inside `mait-mvp/`:

| Document | Description |
|---|---|
| [QUICKSTART.md](mait-mvp/QUICKSTART.md) | 5-minute setup guide with troubleshooting |
| [SETUP.md](mait-mvp/SETUP.md) | Full setup instructions and architecture diagram |
| [GEMINI_INTEGRATION.md](mait-mvp/GEMINI_INTEGRATION.md) | Gemini API integration details and fatigue flow |
| [KEYSTROKE_PSYCHOMETRICS.md](mait-mvp/KEYSTROKE_PSYCHOMETRICS.md) | Typing analytics system specification |
| [CRITICAL_FIXES.md](mait-mvp/CRITICAL_FIXES.md) | Security audit and fixes applied |

---

## Changelog

### 2026-03-06 — Google Login with Persistent Student Memory

**Summary:** Students can now sign in with Google to persist all their data (conversation history, fatigue state, Bloom's progress, keystroke profile) across devices and sessions. Anonymous access with access code still works as a fallback.

**Backend Changes:**

- **`services/auth.py`** (new) — Google OAuth ID token verification using `google-auth` library. Validates tokens against the configured `GOOGLE_CLIENT_ID` and extracts user profile (name, email, picture).
- **`storage.py`** — New `users` table mapping `google_id` to `student_id` with profile fields (email, name, picture, created_at, last_login). Methods: `upsert_user()`, `get_user_by_google_id()`, `get_user_by_student_id()`.
- **`main.py`** — Three new auth endpoints:
  - `POST /auth/google` — Verifies Google ID token, creates or returns existing user with stable `student_id` (`google_{sub}`)
  - `POST /auth/migrate` — Migrates conversation history and context from an anonymous `student_id` to a Google-based one (so no data is lost on first login)
  - `GET /auth/me/{student_id}` — Returns user profile
- **`.env` / `.env.example`** — Added `GOOGLE_CLIENT_ID` configuration.
- **`requirements.txt`** — Added `google-auth` dependency.

**Frontend Changes:**

- **`main.jsx`** — Wrapped app in `GoogleOAuthProvider` from `@react-oauth/google`.
- **`App.jsx`** — Auth state (`authUser`) persisted to `localStorage`. `studentId` now uses Google-based ID when logged in. Login modal redesigned with Google Sign-In button (primary) + access code (secondary fallback). HUD toolbar shows user avatar, first name, and logout button when authenticated. Logout generates a fresh anonymous ID. Data migration triggered automatically on first Google login.
- **`NavBar.jsx`** — Shows user avatar + first name with logout button when authenticated; shows "Login" lock icon when anonymous.
- **`package.json`** — Added `@react-oauth/google` and `jwt-decode` dependencies.

### 2026-03-06 — Persistent Conversation History

**Summary:** Gemini API calls now include rolling conversation history, enabling multi-turn tutoring with context persistence across page refreshes.

**Backend Changes:**

- **`storage.py`** — Added `conversation_history` table to SQLite schema with columns for `student_id`, `role`, `content`, `timestamp`, `fatigue_state`, `blooms_level`, and `topic`. New methods: `save_message()`, `get_history()`, `clear_history()`, `get_history_token_estimate()`.
- **`gemini_client.py`** — `get_gemini_response()` now accepts an optional `conversation_history` parameter. History is sent as multi-turn `Content` objects to the Gemini API. System prompt updated with instructions to use conversation context naturally without summarising it.
- **`educational_agent.py`** — `generate_response_async()` now fetches conversation history from storage before calling Gemini, passes it to the client, and saves both the user message and assistant response after receiving the reply. Includes token budget pruning (6000 token limit, oldest messages truncated first).
- **`main.py`** — New `GET /history/{student_id}` endpoint to retrieve conversation history. `/reset/{student_id}` now also clears conversation history. `/query` endpoint now fetches, prunes, and passes conversation history to Gemini, and saves both messages to storage.
- **`.env`** — Created with `GEMINI_API_KEY`, `GEMINI_MODEL`, and `CORS_ORIGINS` configured.

**Frontend Changes:**

- **`App.jsx`** — On chat page mount (`/app`), fetches conversation history via `GET /history/{student_id}` and populates the chat UI with previous messages. Added "CLEAR" button (with `Trash2` icon) in the HUD toolbar that calls `POST /reset/{student_id}` and resets the local message state. Demo mode is unaffected.

**What's NOT changed:** Fatigue/wellness engine, Bloom's taxonomy assessment, RAG/syllabus retrieval, keystroke psychometrics, local SLM demo mode.

---

## Contributing

MAIT is currently in active MVP development. If you'd like to contribute, please open an issue to discuss your proposed changes before submitting a pull request.

---

## License

All rights reserved. This project is proprietary software developed by Mental Maths Mentor.

---

<p align="center">
  <strong>Built with care in Sydney, Australia</strong><br>
  <em>Because every student deserves a tutor who actually cares if they're okay.</em>
</p>
