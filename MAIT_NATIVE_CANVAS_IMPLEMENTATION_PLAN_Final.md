# MAIT Native Canvas — V2 Implementation Plan (Final)

> **Revision:** V2-Final — Incorporates Gemini architect review, Claude architect review, and codebase audit.
>
> **Audience:** Solo developer shipping on a 4-week sprint.
>
> **Guiding principles:** Ship velocity > elegance. Solo-dev maintainability > enterprise patterns. Absolute stability > feature breadth. Minimal API costs always.

---

## 0. Glossary

| Term | Meaning |
|---|---|
| **Fragment** | One logical piece of a worksheet — preamble, header, question, diagram, instruction, footer, etc. The atomic unit of the canvas. |
| **Fragment Template** | A pre-built LaTeX snippet (e.g. "Spot the Error Box", "Number Plane") that teachers insert from the Insert Menu. Injected directly into the Zustand store as a new fragment. |
| **Document** | A persisted worksheet (artifact) or study note (study). Owns an ordered list of fragments. |
| **Sort Key** | A string-based LexoRank key that determines fragment ordering without integer collisions. |
| **Artifact Canvas** | The LaTeX block-editor for worksheets. |
| **Study Canvas** | The Markdown/rich-text editor for tutor notes (Phase 4+). |
| **A.G.E.** | Artifact Generation Engine — the existing `artifact_engine.py` pipeline. |
| **BYOK** | Bring Your Own Key — teachers supply their own Gemini/OpenAI API key. |

---

## 1. Summary

This plan defines the MAIT Native Canvas — a fragment-aware, dual-pane LaTeX block editor that replaces the current "copy-paste to Gemini" workflow with an in-product workspace. The target is a teacher-friendly worksheet editor where:

- Teachers see their worksheet as **a list of draggable blocks** (preamble, header, questions, footer), not raw LaTeX.
- Each block is independently editable, reorderable, and revisable by AI.
- Compilation to PDF happens on-demand via a manual "Preview" button (not on every keystroke).
- The system ships incrementally across 6 phases, with the first 3 phases constituting the 4-week V1 sprint.

### What this replaces

Currently: `WorksheetGenerator.jsx` → builds prompt → opens Gemini in new tab → teacher copy-pastes LaTeX → compiles externally.

After V1: `WorksheetGenerator.jsx` → "Open in Canvas" → dual-pane editor with fragment list (left) + PDF preview (right) → compile + export in-product.

---

## 2. Architecture Snapshot (Current State)

Based on codebase audit of `mait-mvp/`:

### Backend (`backend/app/`)
- **Framework:** FastAPI + Uvicorn, async-first
- **Database:** aiosqlite (SQLite), raw SQL — no ORM
- **Auth:** Google OAuth 2.0 token verification + access codes
- **AI:** Google Gemini (`google-genai` SDK), model `gemini-3.1-flash-lite`
- **LaTeX:** `artifact_engine.py` — Gemini generates full LaTeX → `pdflatex` compiles → PDF returned
- **State:** Pydantic models serialized as JSON into SQLite
- **Services:** `storage.py`, `gemini_client.py`, `artifact_engine.py`, `educational_agent.py`, `wellness_engine.py`, `blooms_engine.py`, RAG subsystem (FAISS)
- **Existing models in `models.py`:** `Document`, `ArtifactDocumentFragment`, `FragmentKind` enum — already stubbed but not wired

### Frontend (`frontend/src/`)
- **Framework:** React 18 + Vite
- **State:** Local React state only (no Zustand/Redux yet)
- **Styling:** Tailwind CSS + Framer Motion
- **Math rendering:** KaTeX + remark-math + rehype-katex
- **Routing:** Custom hash/pushState (no React Router)
- **Key components:** `WorksheetGenerator.jsx`, `MathInput.jsx`, `App.jsx` (1628 lines)
- **LaTeX input:** `MathInput.jsx` has a 24-button math keyboard with cursor management

### Key Insight
The existing `artifact_engine.py` generates a **monolithic** LaTeX document. The Native Canvas must decompose this into **fragments** so teachers can edit individual questions without regenerating the entire worksheet. This is the core architectural shift.

---

## 3. Product Shape — V1

### Canvas V1 Scope

Ship a single workspace route with one editor type:

- **Artifact Canvas** (LaTeX block editor for worksheets)
  - Left pane: ordered list of fragment cards (draggable, collapsible)
  - Right pane: compiled PDF preview (rendered on-demand)
  - Top toolbar: compile button, export, save state, undo/redo
  - Instruction sidebar: per-fragment AI revision input

### Entry Points

- **Worksheet Studio** (`WorksheetGenerator.jsx`): gains "Open in Canvas" button. Creates an `artifact` document from the generated LaTeX, parsing it into fragments.
- **External Gemini launch:** remains as fallback until Canvas is stable.
- **Direct creation:** "New Blank Worksheet" from canvas route.

### Non-goals for V1

- No Study Canvas (Markdown editor) — deferred to Phase 4
- No multi-user collaboration
- No Anthropic provider integration
- No SyncTeX (bidirectional scroll-sync between LaTeX source and PDF) — this is an over-engineering trap for a custom web viewer. Teachers click "Preview" and see the PDF. That's it.
- No auto-repair LLM compilation loop — deferred to Phase 6 (Post-V1)
- No Stripe billing / subscription entitlements
- No real-time collaborative editing
- No version branching (linear revision history only)

---

## 4. Data Model

### 4.1 `documents` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `owner_student_id` | TEXT NOT NULL | FK to authenticated user |
| `title` | TEXT NOT NULL | Default: "Untitled Worksheet" |
| `kind` | TEXT NOT NULL | `artifact` or `study` |
| `source` | TEXT NOT NULL | `worksheet_generator`, `chat`, `manual` |
| `current_revision_id` | TEXT | Points to latest applied revision |
| `metadata_json` | TEXT | Worksheet settings, syllabus packet, etc. |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### 4.2 `document_fragments` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `document_id` | TEXT NOT NULL | FK to documents |
| `sort_key` | TEXT NOT NULL | **LexoRank string** (see §4.3) |
| `kind` | TEXT NOT NULL | `preamble`, `header`, `question`, `diagram`, `instruction`, `worked_example`, `footer`, `text_block` |
| `content_latex` | TEXT NOT NULL | Raw LaTeX for this fragment |
| `label` | TEXT | Human-readable label, e.g. "Question 3" |
| `metadata_json` | TEXT | Marks, difficulty, etc. |
| `version_id` | TEXT NOT NULL | UUID — incremented on each edit |
| `created_at` | TEXT | ISO 8601 |
| `updated_at` | TEXT | ISO 8601 |

### 4.3 Fragment Ordering — LexoRank (String-Based Fractional Indexing)

**Problem:** Simple float `sort_key = (a + b) / 2` exhausts floating-point precision after ~52 drag-and-drop operations. Teachers who frequently reorder questions will hit collisions.

**Solution:** Use string-based fractional indexing via the `fractional-indexing` pattern (or the Python port `fractional_indexing`). This generates lexicographically sortable strings:

```
Fragment 1: sort_key = "a0"
Fragment 2: sort_key = "a1"
Fragment 3: sort_key = "a2"

-- Teacher drags Fragment 3 between 1 and 2:
Fragment 1: sort_key = "a0"
Fragment 3: sort_key = "a0V"   ← lexicographically between "a0" and "a1"
Fragment 2: sort_key = "a1"
```

**Implementation:**
- Use the `fractional-indexing` npm package on the frontend (where drag-and-drop happens).
- On the backend, `sort_key` is an opaque TEXT column — just `ORDER BY sort_key ASC`.
- On bulk reorder (e.g., "reset ordering"), regenerate clean keys `a0, a1, a2, ...`.
- No precision exhaustion, no float drift, works indefinitely.

### 4.4 `document_revisions` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `document_id` | TEXT NOT NULL | FK to documents |
| `fragment_id` | TEXT | NULL for whole-doc operations |
| `parent_revision_id` | TEXT | Previous revision |
| `instruction_text` | TEXT | What the teacher asked for |
| `provider` | TEXT | `gemini`, `openai`, `manual` |
| `model` | TEXT | e.g. `gemini-2.0-flash` |
| `input_snapshot` | TEXT | Fragment LaTeX before edit |
| `output_snapshot` | TEXT | Fragment LaTeX after edit |
| `diff_summary` | TEXT | Human-readable diff |
| `status` | TEXT NOT NULL | `pending`, `applied`, `failed` |
| `error_message` | TEXT | Humanized error if failed |
| `created_at` | TEXT | ISO 8601 |

### 4.5 `artifact_builds` table

| Column | Type | Notes |
|---|---|---|
| `id` | TEXT PK | UUID |
| `document_id` | TEXT NOT NULL | FK to documents |
| `status` | TEXT NOT NULL | `queued`, `compiling`, `success`, `failed` |
| `pdf_path` | TEXT | Path to compiled PDF |
| `build_log` | TEXT | Raw pdflatex log (kept for debugging) |
| `error_message_human` | TEXT | LLM-humanized error (see §7) |
| `triggered_by` | TEXT | `manual`, `revision_apply` |
| `created_at` | TEXT | ISO 8601 |
| `completed_at` | TEXT | ISO 8601 |

---

## 5. Backend Design

### 5.1 New Services

#### `document_service.py`
- `create_document(owner_id, kind, source, title, metadata) → Document`
- `get_document(doc_id, owner_id) → Document` (with auth check)
- `list_documents(owner_id, kind?) → List[Document]`
- `delete_document(doc_id, owner_id)`

#### `fragment_service.py`
- `create_fragment(doc_id, kind, content_latex, sort_key, label?, metadata?) → Fragment`
- `get_fragments(doc_id) → List[Fragment]` (ordered by `sort_key`)
- `update_fragment(fragment_id, content_latex?, sort_key?, label?, metadata?) → Fragment`
- `delete_fragment(fragment_id)`
- `reorder_fragments(doc_id, fragment_id, new_sort_key) → Fragment`
- `parse_monolithic_latex(latex_source) → List[Fragment]` — decomposes A.G.E. output into fragments

#### `compile_service.py`
- `compile_document(doc_id) → ArtifactBuild`
  1. Fetch all fragments ordered by `sort_key`
  2. Concatenate into a single LaTeX document
  3. Write to temp dir, run `pdflatex` (or Tectonic — see §5.3)
  4. On success: store PDF path, return `success`
  5. On failure: store raw log, pass log to humanizer (§7), return `failed`
- `get_build_status(build_id) → ArtifactBuild`
- `get_latest_build(doc_id) → ArtifactBuild`

#### `revision_service.py`
- `create_revision(doc_id, fragment_id, instruction, provider?) → Revision`
  1. Snapshot current fragment content
  2. Build targeted prompt: system instruction + fragment LaTeX + user instruction + "preserve surrounding context"
  3. Call provider (Gemini Flash by default)
  4. Store output as `pending` revision
  5. Return preview to frontend
- `apply_revision(revision_id)` — commit the pending revision to the fragment
- `reject_revision(revision_id)` — mark as `failed`, keep original
- `list_revisions(doc_id, fragment_id?) → List[Revision]`

### 5.2 New API Routes

Mount a new router: `POST /api/v1/canvas/...`

#### Documents
```
POST   /documents                    → create document
GET    /documents                    → list my documents
GET    /documents/{id}               → get document + fragments
DELETE /documents/{id}               → delete document
```

#### Fragments
```
POST   /documents/{id}/fragments            → create fragment
PATCH  /documents/{id}/fragments/{fid}      → update fragment content or sort_key
DELETE /documents/{id}/fragments/{fid}      → delete fragment
POST   /documents/{id}/fragments/reorder    → batch reorder (array of {id, sort_key})
```

#### Compilation
```
POST   /documents/{id}/compile              → trigger compilation (returns build_id)
GET    /documents/{id}/builds/{bid}         → poll build status
GET    /documents/{id}/builds/latest        → get latest build
GET    /documents/{id}/export/pdf           → download compiled PDF
GET    /documents/{id}/export/tex           → download assembled .tex source
```

#### Revisions
```
POST   /documents/{id}/fragments/{fid}/revise   → request AI revision (returns preview)
POST   /revisions/{rid}/apply                    → apply revision
POST   /revisions/{rid}/reject                   → reject revision
GET    /documents/{id}/revisions                 → list revision history
```

All routes require `X-Student-Id` header and validate document ownership.

### 5.3 LaTeX Sandboxing — Recommendation

**Recommendation for solo dev: Tectonic** over Dockerized TeX Live.

| Approach | Pros | Cons |
|---|---|---|
| **Tectonic** (Rust-based TeX) | Single static binary (~25MB), auto-downloads packages on first use, no TeX Live installation, fast cold-start, can run in existing process sandbox | Slightly less compatible with exotic packages (irrelevant for maths worksheets) |
| **Dockerized TeX Live** | Full compatibility, strong process isolation | Heavy image (~2GB+), Docker-in-Docker complexity on Render, cold-start latency, overkill for a solo dev |
| **Current `pdflatex`** | Already works | Requires TeX Live installed on host, no built-in sandboxing, large install footprint |

**Specific recommendation:**

1. **For V1 (Render deployment):** Keep `pdflatex` since it's already working. Add process-level constraints:
   - `subprocess.run(..., timeout=30)` (already 60s, tighten to 30)
   - Write to isolated temp directories (already done via `tempfile.mkdtemp`)
   - Set `--no-shell-escape` flag on pdflatex to prevent shell command injection from malicious LaTeX
   - Clean up temp dirs after serving PDF

2. **For V1.5 (when you need better DX):** Switch to **Tectonic**:
   - `pip install tectonic` or download the binary
   - Replace `pdflatex` calls with `tectonic worksheet.tex` — single-pass, no double-compile needed
   - Auto-fetches required packages (no manual TeX Live package management)

3. **For production scale:** Consider a compilation microservice (separate Render service with Tectonic) so LaTeX compilation doesn't block the main FastAPI process. But this is post-V1.

**Security hardening (both approaches):**
- Always pass `--no-shell-escape` / `-Z shell-escape=false` to prevent `\write18` attacks
- Set compile timeout to 30 seconds max
- Limit output file size (reject PDFs > 10MB)
- Run compilation in a temp dir with restrictive permissions

### 5.4 Build Status Updates — Recommendation

**Recommendation: Short-polling, not WebSockets.**

Rationale for a solo dev:
- WebSockets add connection management complexity, reconnection logic, and a new communication pattern to maintain.
- LaTeX compilation takes 2–8 seconds. A simple poll every 1 second for at most 30 seconds is perfectly adequate.
- Your existing frontend uses `fetch()` exclusively. Short-polling fits that pattern.
- Render's free tier has WebSocket limitations and timeout behaviors that would add debugging overhead.

**Implementation pattern:**

```
Frontend:                              Backend:
POST /documents/{id}/compile    →     Creates ArtifactBuild (status: "queued")
                                       Kicks off background compile task
                                       Returns { build_id }

GET /builds/{bid} (poll 1s)    →     Returns { status: "compiling" }
GET /builds/{bid} (poll 1s)    →     Returns { status: "compiling" }
GET /builds/{bid} (poll 1s)    →     Returns { status: "success", pdf_url: "..." }
                                       Frontend loads PDF into preview pane
```

Use `asyncio.create_task()` for the background compile. Store status in SQLite. Frontend polls with a simple `setInterval` that auto-clears on terminal status.

---

## 6. Frontend Design

### 6.1 State Management — Zustand

**Recommendation: Add Zustand** (`npm install zustand`). It's 1.1KB, zero-boilerplate, and avoids the prop-drilling / full-page re-render issues you'll hit with 1628 lines of `App.jsx`.

**Store architecture — slice pattern to prevent re-renders:**

```typescript
// stores/canvasStore.ts
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

interface CanvasState {
  // Document
  document: Document | null

  // Fragments — keyed by ID for O(1) lookup
  fragmentsById: Record<string, Fragment>
  fragmentOrder: string[]  // array of fragment IDs, sorted by sort_key

  // Build state
  activeBuild: ArtifactBuild | null

  // Revision state
  pendingRevision: Revision | null
  selectedFragmentId: string | null

  // Actions
  setDocument: (doc: Document) => void
  setFragments: (fragments: Fragment[]) => void
  updateFragment: (id: string, patch: Partial<Fragment>) => void
  reorderFragment: (id: string, newIndex: number) => void
  setActiveBuild: (build: ArtifactBuild | null) => void
  setPendingRevision: (rev: Revision | null) => void
  selectFragment: (id: string | null) => void
}
```

**Key pattern — granular selectors to prevent re-renders:**

```javascript
// Only re-renders when this specific fragment changes
const fragment = useCanvasStore(state => state.fragmentsById[fragmentId])

// Only re-renders when build status changes
const buildStatus = useCanvasStore(state => state.activeBuild?.status)

// Only re-renders when the order changes (drag-drop)
const fragmentOrder = useCanvasStore(state => state.fragmentOrder)
```

**Why this works:**
- `fragmentsById` is a flat map — updating one fragment doesn't trigger re-renders for other fragment cards.
- `fragmentOrder` is a separate array — only drag-and-drop touches it.
- Zustand's default shallow-compare on selectors means `useCanvasStore(s => s.fragmentsById[id])` only fires when that specific object reference changes.
- Use `immer` middleware for ergonomic nested updates without manual spread operators.

### 6.2 New Components

```
frontend/src/
├── pages/
│   └── CanvasWorkspace.jsx          ← Route-level page
├── components/
│   └── canvas/
│       ├── FragmentList.jsx          ← Left pane: ordered list of fragment cards
│       ├── FragmentCard.jsx          ← Single draggable fragment (collapsible)
│       ├── FragmentEditor.jsx        ← CodeMirror/textarea for one fragment's LaTeX
│       ├── PdfPreviewPane.jsx        ← Right pane: compiled PDF viewer
│       ├── CanvasToolbar.jsx         ← Top bar: compile, export, save, undo
│       ├── InsertFragmentMenu.jsx    ← "+ Insert" dropdown with template categories
│       ├── ScanQuestionModal.jsx     ← Image upload → OCR → TikZ → editable fragment
│       ├── RevisionPanel.jsx         ← Sidebar: AI instruction input per fragment
│       ├── RevisionTimeline.jsx      ← Drawer: revision history list
│       ├── BuildStatusIndicator.jsx  ← Toolbar badge: compiling/success/failed
│       └── CompileErrorBanner.jsx    ← Humanized error display (see §7)
├── stores/
│   └── canvasStore.js                ← Zustand store
├── hooks/
│   └── useCompilePoller.js           ← Poll build status with auto-cleanup
```

### 6.3 Fragment Card UX

Each `FragmentCard` shows:
- **Drag handle** (left edge) — for reordering via drag-and-drop
- **Kind badge** — colored pill: `PREAMBLE` (gray), `HEADER` (blue), `QUESTION` (green), `DIAGRAM` (purple), `INSTRUCTION` (orange), `WORKED_EXAMPLE` (cyan), `FOOTER` (gray), `TEXT` (yellow)
- **Label** — e.g. "Question 3 — Differentiation [4 marks]"
- **Collapsed preview** — first ~80 chars of LaTeX, syntax-highlighted
- **Expanded view** — full LaTeX editor (textarea or lightweight CodeMirror)
- **Action buttons** — "Revise with AI", "Delete", "Duplicate", "Move up/down"

### 6.4 Compilation Flow (Frontend)

1. Teacher clicks **"Preview"** button in toolbar (or `Ctrl+Shift+P`)
2. Frontend calls `POST /documents/{id}/compile`
3. `BuildStatusIndicator` shows spinner: "Compiling..."
4. `useCompilePoller` polls `GET /builds/{bid}` every 1s
5. On `success`: load PDF URL into `PdfPreviewPane` (use `<iframe>` or `<object>` for PDF)
6. On `failed`: show `CompileErrorBanner` with humanized error message

**Critical UX rule:** The PDF preview pane always shows the **last successful build**. A failed compile never clears the preview — it just shows an error banner above it.

### 6.5 Drag-and-Drop

Use a lightweight DnD library: **`@dnd-kit/core`** (12KB, React-native, accessible).

On drop:
1. Compute new `sort_key` using `fractional-indexing` between the sort keys of the new neighbors.
2. Optimistically update `canvasStore.fragmentOrder`.
3. Fire `PATCH /documents/{id}/fragments/{fid}` with new `sort_key`.
4. On error: revert optimistic update.

### 6.6 Insert Fragment Menu (Template System)

**This is a key differentiator over Gemini Canvas.** Teachers shouldn't have to know what's possible — the Insert Menu shows them.

#### Template Configuration

Static config file that maps directly to fragment creation in the Zustand store:

```javascript
// src/config/fragmentTemplates.js
export const FRAGMENT_TEMPLATES = {
  // ── Questions ──────────────────────────────────────────
  standard_question: {
    kind: "question",
    label: "Standard Question [2 Marks]",
    icon: "SquarePen",       // Lucide icon name
    category: "Questions",
    defaultContent: `\\item Solve the following equation for $x$:

\\[ 3x^2 - 12x + 9 = 0 \\]

\\hfill \\textbf{[2 Marks]}`,
    metadata_json: { marks: 2, spaceAfter: "4cm" }
  },

  multi_part_question: {
    kind: "question",
    label: "Multi-Part Question [6 Marks]",
    icon: "ListOrdered",
    category: "Questions",
    defaultContent: `\\item Consider the function $f(x) = x^3 - 3x + 2$.
\\begin{enumerate}[label=(\\alph*)]
  \\item Find $f'(x)$. \\hfill \\textbf{[2 Marks]}
  \\item Find the stationary points and determine their nature. \\hfill \\textbf{[3 Marks]}
  \\item Sketch the graph of $y = f(x)$. \\hfill \\textbf{[1 Mark]}
\\end{enumerate}`,
    metadata_json: { marks: 6, spaceAfter: "6cm" }
  },

  // ── Diagrams ───────────────────────────────────────────
  number_plane: {
    kind: "diagram",
    label: "Number Plane (TikZ)",
    icon: "Grid3X3",
    category: "Diagrams",
    defaultContent: `\\begin{center}
\\begin{tikzpicture}[scale=0.6]
  \\draw[step=1cm,gray!30,very thin] (-5,-5) grid (5,5);
  \\draw[thick,->] (-5,0) -- (5,0) node[right] {$x$};
  \\draw[thick,->] (0,-5) -- (0,5) node[above] {$y$};
  \\foreach \\x in {-4,-3,-2,-1,1,2,3,4}
    \\draw (\\x,0.1) -- (\\x,-0.1) node[below,font=\\tiny] {\\x};
  \\foreach \\y in {-4,-3,-2,-1,1,2,3,4}
    \\draw (0.1,\\y) -- (-0.1,\\y) node[left,font=\\tiny] {\\y};
\\end{tikzpicture}
\\end{center}`,
    metadata_json: { spaceAfter: "1cm" }
  },

  unit_circle: {
    kind: "diagram",
    label: "Unit Circle (Trig)",
    icon: "Circle",
    category: "Diagrams",
    defaultContent: `\\begin{center}
\\begin{tikzpicture}[scale=2]
  \\draw[thick] (0,0) circle (1);
  \\draw[thick,->] (-1.3,0) -- (1.3,0) node[right] {$x$};
  \\draw[thick,->] (0,-1.3) -- (0,1.3) node[above] {$y$};
  \\draw[dashed] (0,0) -- (30:1) node[midway,above] {$1$};
  \\draw (0.3,0) arc (0:30:0.3) node[midway,right,font=\\small] {$\\theta$};
\\end{tikzpicture}
\\end{center}`,
    metadata_json: { spaceAfter: "1cm" }
  },

  // ── Pedagogical Blocks ─────────────────────────────────
  sabotage_box: {
    kind: "instruction",
    label: "Spot the Error Box",
    icon: "AlertTriangle",
    category: "Pedagogical",
    defaultContent: `\\begin{tcolorbox}[colback=gray!10, colframe=black, title=\\textbf{SPOT THE ERROR}]
A student submitted this working. Find and correct the mistake:
\\[ (x+2)^2 = x^2 + 4 \\]
\\end{tcolorbox}`,
    metadata_json: { spaceAfter: "3cm" }
  },

  worked_example: {
    kind: "worked_example",
    label: "Worked Example",
    icon: "GraduationCap",
    category: "Pedagogical",
    defaultContent: `\\begin{tcolorbox}[colback=blue!5, colframe=blue!40, title=\\textbf{Worked Example}]
\\textbf{Find} $\\frac{d}{dx}(x^2 \\sin x)$

\\textbf{Solution:} Using the product rule, $\\frac{d}{dx}(uv) = u'v + uv'$:
\\begin{align*}
  u &= x^2, \\quad u' = 2x \\\\
  v &= \\sin x, \\quad v' = \\cos x \\\\
  \\frac{d}{dx}(x^2 \\sin x) &= 2x\\sin x + x^2\\cos x
\\end{align*}
\\end{tcolorbox}`,
    metadata_json: { spaceAfter: "2cm" }
  },

  // ── Layout ─────────────────────────────────────────────
  section_divider: {
    kind: "text_block",
    label: "Section Divider",
    icon: "Minus",
    category: "Layout",
    defaultContent: `\\vspace{12pt}
\\hrule
\\vspace{6pt}
{\\large\\bfseries Section B --- Extended Response}
\\vspace{6pt}
\\hrule
\\vspace{12pt}`,
    metadata_json: { spaceAfter: "0cm" }
  },

  self_check_footer: {
    kind: "footer",
    label: "AI Self-Check Footer",
    icon: "Bot",
    category: "Layout",
    defaultContent: `\\vfill
\\hrule
\\vspace{0.2cm}
{\\footnotesize \\textbf{SELF-CHECK PROTOCOL:} \\\\
\\textbf{Stuck?} Screenshot this question. \\\\
\\textbf{Ask AI:} \\textit{"Act as my tutor and coach me through this..."}}`,
    metadata_json: { isUnique: true }
  }
};

// Group templates by category for the Insert Menu UI
export const TEMPLATE_CATEGORIES = [
  { id: "Questions",   icon: "HelpCircle",    label: "Questions" },
  { id: "Diagrams",    icon: "PenTool",       label: "Diagrams" },
  { id: "Pedagogical", icon: "Lightbulb",     label: "Pedagogical" },
  { id: "Layout",      icon: "LayoutTemplate", label: "Layout" },
];
```

#### Insert Menu UX

The toolbar has an **"+ Insert"** button that opens a dropdown/popover grouped by category:

```
┌─────────────────────────────────┐
│  + Insert Fragment              │
├─────────────────────────────────┤
│  QUESTIONS                      │
│    ☐ Standard Question [2M]     │
│    ☐ Multi-Part Question [6M]   │
│  DIAGRAMS                       │
│    ☐ Number Plane (TikZ)        │
│    ☐ Unit Circle (Trig)         │
│  PEDAGOGICAL                    │
│    ☐ Spot the Error Box         │
│    ☐ Worked Example             │
│  LAYOUT                         │
│    ☐ Section Divider            │
│    ☐ AI Self-Check Footer       │
│─────────────────────────────────│
│  📸 FROM IMAGE                  │
│    ☐ Scan Question (Photo/File) │
└─────────────────────────────────┘
```

On click:
1. Create a new fragment with `defaultContent` from the template.
2. Generate a LexoRank `sort_key` placing it after the currently selected fragment (or at the end).
3. Inject into `canvasStore.fragmentsById` and `fragmentOrder`.
4. Fire `POST /documents/{id}/fragments` to persist.
5. Auto-expand the new fragment card for immediate editing.

#### Package Allowlist Update

The `tcolorbox` package is required for the Spot the Error and Worked Example templates. Add to the allowed packages in `artifact_engine.py`:

```python
allowed_packages = {
    "amsmath", "amssymb", "amsthm", "geometry", "enumitem",
    "fancyhdr", "lastpage", "tikz", "pgfplots",
    "tcolorbox",  # ← NEW: pedagogical template boxes
}
```

Also add `\usepackage{tcolorbox}` to the preamble fragment when any `instruction` or `worked_example` fragment is present in the document. The `compile_service.py` can auto-inject this during assembly.

---

## 7. Humanized LaTeX Errors

**Problem:** Raw pdflatex output like `! Runaway argument? \item Solve $\frac{d` is incomprehensible to teachers.

**Solution:** On compile failure, pass the error log through a fast, cheap LLM to produce a teacher-friendly message.

### Implementation

```python
# compile_service.py — on build failure

async def _humanize_latex_error(raw_log: str, fragments: list) -> str:
    """Pass raw pdflatex log through Gemini Flash to produce teacher-friendly error."""

    # Truncate log to last 60 lines (save tokens)
    log_tail = "\n".join(raw_log.split("\n")[-60:])

    prompt = f"""You are a helpful teaching assistant. A teacher's maths worksheet
failed to compile. Translate this LaTeX error into plain English that a teacher
(who does not know LaTeX) can understand.

RULES:
- Be specific: mention which question or section has the problem
- Suggest a concrete fix
- Keep it to 1-2 sentences
- Never show raw LaTeX error codes

ERROR LOG:
{log_tail}
"""

    # Use Gemini Flash (cheapest, fastest)
    response = await gemini_flash_call(prompt, max_tokens=150)
    return response
    # e.g. "There's a missing closing bracket in Question 3.
    #        Check that all your curly braces {{ }} are properly paired."
```

**Cost estimate:** ~150 input tokens + ~50 output tokens per error. At Gemini Flash pricing, this is effectively free (<$0.001 per error).

**Frontend display:**

```jsx
// CompileErrorBanner.jsx
<div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r">
  <p className="text-red-800 font-medium">Compilation failed</p>
  <p className="text-red-700 mt-1">{build.error_message_human}</p>
  <button onClick={toggleRawLog} className="text-red-500 text-sm mt-2 underline">
    Show technical details
  </button>
</div>
```

---

## 8. Fragment Parsing — Decomposing Monolithic LaTeX

When a teacher uses "Open in Canvas" from the existing Worksheet Generator, the A.G.E. returns a monolithic LaTeX document. We need to parse this into fragments.

### Parsing Strategy

```python
# fragment_service.py

def parse_monolithic_latex(latex_source: str) -> list[dict]:
    """
    Decompose a monolithic LaTeX document into ordered fragments.

    Heuristic parsing (not a full TeX parser — that's overkill):
    1. Everything before \begin{document} → PREAMBLE fragment
    2. Content between \begin{document} and first \item or \begin{enumerate} → HEADER fragment
    3. Each \item block → QUESTION fragment
    4. Content after last \item / \end{enumerate} to \end{document} → FOOTER fragment
    5. \newpage + "Answer Key" section → separate FOOTER fragment
    """
    fragments = []

    # Split on \begin{document}
    preamble_split = latex_source.split(r'\begin{document}', 1)
    if len(preamble_split) == 2:
        fragments.append({
            'kind': 'preamble',
            'content_latex': preamble_split[0] + r'\begin{document}',
            'label': 'Preamble',
        })
        body = preamble_split[1]
    else:
        body = latex_source

    # Extract individual \item blocks as questions
    # ... (regex-based extraction of enumerate items)

    # Answer key detection
    # ... (split on \newpage.*Answer Key)

    return fragments
```

This is intentionally simple regex-based parsing. A full TeX AST parser (like `plasTeX`) would be over-engineered for V1 where we control the LaTeX generation prompt.

---

## 8.5. Image-to-Fragment Pipeline (Photo → Editable LaTeX Question)

### The Feature

A teacher photographs a question from a textbook, past paper, or colleague's worksheet. MAIT OCRs the image, recreates any diagrams as TikZ, and inserts the result as an **editable fragment** in the canvas.

This is a significant differentiator: Gemini Canvas cannot do this within a worksheet-aware context.

### Architecture: Two-Stage Gemini Flash Pipeline (No External OCR Dependency)

**Why not Mathpix?** Adding a third-party OCR API means another dependency, another billing account, another point of failure. Gemini Flash multimodal already handles math OCR well, and you already have the SDK integrated. Keep the stack tight.

**Stage 1 — Structured Extraction** (Gemini Flash, `media_resolution: "high"`)

```python
# image_to_fragment_service.py

IMAGE_OCR_SYSTEM_PROMPT = r"""You are a maths worksheet digitizer for NSW HSC Mathematics.
You will receive a photograph of a maths question (from a textbook, past paper, or handwritten source).

Your job is to produce a STRUCTURED JSON description of the question. This will be used
in Stage 2 to generate compilable LaTeX.

OUTPUT FORMAT (JSON only, no commentary):
{
  "question_text": "The full text of the question, with inline math as LaTeX (e.g. $\\frac{1}{2}$)",
  "parts": [
    { "label": "a", "text": "Find the derivative of...", "marks": 2 }
  ],
  "diagram": {
    "present": true/false,
    "type": "number_plane | graph | geometric_figure | table | none",
    "description": "A parabola y=x^2-4 with shaded region between x=0 and x=2,
                     x-axis from -3 to 3, y-axis from -5 to 5, grid lines visible"
  },
  "marks_total": 6,
  "source_hint": "Appears to be from a Year 12 Advanced calculus context"
}
"""
```

**Stage 2 — LaTeX + TikZ Generation** (Gemini Flash, `thinking_level: "medium"`)

```python
TIKZ_GENERATION_SYSTEM_PROMPT = r"""You are a LaTeX/TikZ expert for NSW HSC Mathematics worksheets.
You will receive a structured JSON description of a maths question.
Generate a SINGLE compilable LaTeX fragment for this question.

RULES:
1. Output ONLY the LaTeX fragment. No \documentclass, no \begin{document}.
2. The fragment will be inserted into an existing enumerate environment.
3. Start with \item.
4. ALL math in proper LaTeX: \frac{}{}, \int_{}{}, \lim_{}, etc.
5. If a diagram is present, recreate it using TikZ with these guidelines:
   - Use \begin{center}\begin{tikzpicture}...\end{tikzpicture}\end{center}
   - For graphs: use pgfplots with \begin{axis}...\end{axis}
   - For number planes: draw grid, axes, labels, then plot features
   - For geometric figures: use coordinates, draw commands, labels
   - Match the spatial layout of the original as closely as possible
   - Add axis labels, tick marks, and annotations from the original
6. If the diagram is too complex to recreate accurately, insert a placeholder:
   \begin{center}\fbox{\parbox{8cm}{\centering [Diagram: <description>]\\
   \small Teacher: replace with actual diagram or use TikZ editor}}\end{center}
7. Place marks at the end: \hfill \textbf{[N Marks]}

ALLOWED PACKAGES (already in preamble): tikz, pgfplots, amsmath, amssymb, tcolorbox
"""
```

### Why Two Stages?

1. **Separation of concerns.** Stage 1 is pure perception (what's in the image?). Stage 2 is pure generation (turn description into LaTeX). If Stage 2 fails to compile, you can retry it without re-processing the image.
2. **Debuggability.** The structured JSON from Stage 1 is human-readable. If the TikZ is wrong, the teacher (or you debugging) can see exactly what the model "saw" vs. what it generated.
3. **Cost efficiency.** Stage 1 uses high-resolution vision (~1000 tokens for the image). Stage 2 is text-only (~300 input tokens). Total cost: ~$0.002 per image. If Stage 2 needs a retry, you don't re-pay for the image.

### Diagram Recreation Reliability

Based on current benchmarks:

| Diagram Type | Expected Reliability | Strategy |
|---|---|---|
| **Number planes** (axes, points, lines) | ~90% accurate | Direct TikZ generation |
| **Function graphs** (parabolas, trig, exponential) | ~85% accurate | Use pgfplots with `\addplot` |
| **Geometric figures** (triangles, circles, angles) | ~75% accurate | TikZ with coordinate geometry |
| **Complex annotated diagrams** (shaded regions, multiple curves, labels) | ~60% accurate | Generate best-effort + fallback placeholder |

**The key insight:** Because the result is an **editable fragment**, imperfect TikZ is acceptable. The teacher sees the generated diagram, tweaks if needed, and compiles. This is infinitely better than "re-type the whole question by hand."

### Frontend UX

#### Upload Flow

1. Teacher clicks **"Scan Question"** button in the toolbar (or in the Insert Menu under a new "From Image" category)
2. File picker opens (accept: `image/*`, also supports camera capture on mobile via `capture="environment"`)
3. Image thumbnail appears in a modal with a loading spinner: "Analyzing question..."
4. Stage 1 completes → show extracted JSON preview:
   ```
   ┌──────────────────────────────────────┐
   │  📸 Scanned Question                 │
   │                                      │
   │  "Find the area enclosed by          │
   │   y = x² and y = 2x for x ≥ 0"     │
   │                                      │
   │  Parts: (a) Sketch [2M] (b) Find [3M]│
   │  Diagram: ✅ Graph detected           │
   │                                      │
   │  [ ✏️ Edit Description ] [ Generate ] │
   └──────────────────────────────────────┘
   ```
5. Teacher can edit the structured description before Stage 2 (fix OCR mistakes)
6. Click "Generate" → Stage 2 runs → fragment inserted into canvas
7. Fragment auto-expands for immediate review/editing

#### "Edit Description" Escape Hatch

If the OCR gets something wrong (e.g., reads `x²` as `x?`), the teacher edits the structured description in a simple form, then Stage 2 regenerates the LaTeX from the corrected description. No need to re-upload the image.

### Backend API

```
POST /documents/{id}/scan-question
  Content-Type: multipart/form-data
  Body: image file + optional insert_after_fragment_id

  Response (Stage 1):
  {
    "scan_id": "uuid",
    "extracted": { ... structured JSON ... },
    "status": "extracted"
  }

POST /documents/{id}/scan-question/{scan_id}/generate
  Body: { "extracted": { ... optionally edited JSON ... } }

  Response (Stage 2):
  {
    "fragment": { ... new fragment object ... },
    "tikz_present": true,
    "confidence": "high" | "medium" | "low"
  }
```

Two endpoints so the teacher can review/edit between stages. The frontend can also auto-chain them for a one-click flow if the teacher prefers speed over review.

### Cost Per Scan

| Stage | Model | Input | Output | Cost |
|---|---|---|---|---|
| Stage 1 (OCR) | Gemini Flash | ~1,200 tokens (image + prompt) | ~200 tokens (JSON) | ~$0.001 |
| Stage 2 (TikZ gen) | Gemini Flash | ~400 tokens (JSON + prompt) | ~500 tokens (LaTeX) | ~$0.001 |
| **Total** | | | | **~$0.002 per scan** |

At 10 scans/day, that's $0.02/day — negligible.

### Phase Placement

This feature slots into **Phase 3** (Weeks 3–4), after fragment CRUD and compilation are stable. It reuses the same fragment insertion pipeline as the Insert Menu — the only new work is the two Gemini Flash calls and the upload modal UI.

---

## 9. AI Revision Prompt Strategy

### Per-Fragment Targeted Revision

When a teacher selects a fragment and types an instruction like "Make this question harder" or "Add a part (b)":

```python
FRAGMENT_REVISION_SYSTEM_PROMPT = r"""You are a LaTeX worksheet editor for NSW HSC Mathematics.
You will receive ONE fragment of a LaTeX worksheet and an editing instruction.

RULES:
1. Output ONLY the revised LaTeX fragment. No commentary, no markdown fences.
2. Preserve the exact LaTeX style, packages, and formatting conventions of the input.
3. Do NOT add \documentclass, \begin{document}, or \end{document} — you are editing a fragment.
4. ALL math must use proper LaTeX: \frac{}{}, \int_{}, \lim_{}, etc.
5. If the instruction asks to add content, add it seamlessly within the fragment.
6. If the instruction is ambiguous, err on the side of minimal change.
"""

FRAGMENT_REVISION_USER_PROMPT = """
FRAGMENT KIND: {kind}
FRAGMENT LABEL: {label}

CURRENT CONTENT:
{content_latex}

INSTRUCTION: {instruction}

Output the revised fragment only.
"""
```

**Key constraint:** The LLM never sees the full document — only the target fragment. This:
- Reduces token cost dramatically
- Prevents the LLM from "helpfully" rewriting untouched sections
- Makes revision diffs clean and auditable

---

## 10. Debounced Compilation Policy

**Explicit mandate: NO compile-on-keystroke.**

Compilation is triggered ONLY by:

1. **Manual "Preview" button** — teacher clicks it deliberately
2. **Keyboard shortcut** — `Ctrl+Shift+P` (Preview)
3. **Post-revision apply** — after a teacher accepts an AI revision, offer (don't auto-trigger) a "Preview updated?" prompt

**Why no auto-compile?**
- pdflatex takes 2–8 seconds — too slow for keystroke responsiveness
- Server cost: each compile is a subprocess spawn + temp file I/O
- UX friction: partial edits produce confusing error states
- Teachers may edit 5 fragments before wanting to see the result

**Fragment editing does NOT trigger compilation.** Teachers edit freely, then compile when ready.

**Auto-save (not auto-compile):**
- Fragment content auto-saves to the backend on a **2-second idle debounce** after the last keystroke.
- This saves work-in-progress, but never triggers compilation.
- Visual indicator: "Saved" / "Saving..." / "Unsaved changes" in toolbar.

---

## 11. Phased Rollout

### Phase 1 — Document & Fragment CRUD (Week 1)

**Backend:**
- [ ] Create `documents`, `document_fragments` tables in storage.py
- [ ] Implement `document_service.py` — CRUD for documents
- [ ] Implement `fragment_service.py` — CRUD for fragments, LexoRank ordering
- [ ] Implement `parse_monolithic_latex()` — decompose A.G.E. output into fragments
- [ ] Mount document/fragment API routes
- [ ] Add `--no-shell-escape` to existing pdflatex calls

**Frontend:**
- [ ] Install Zustand, `fractional-indexing`, `@dnd-kit/core`
- [ ] Create `canvasStore.js`
- [ ] Create `CanvasWorkspace.jsx` — basic dual-pane layout
- [ ] Create `FragmentList.jsx` + `FragmentCard.jsx` — display fragments
- [ ] Add "Open in Canvas" button to `WorksheetGenerator.jsx`
- [ ] Wire fragment CRUD to API

**Exit criteria:** Teacher can generate a worksheet, open it in the canvas, see it decomposed into fragments, edit fragment content, reorder fragments via drag-and-drop.

### Phase 2 — Compilation, Preview & Insert Menu (Week 2)

**Backend:**
- [ ] Create `artifact_builds` table
- [ ] Implement `compile_service.py` — assemble fragments → compile → store result
- [ ] Auto-inject `\usepackage{tcolorbox}` into preamble when `instruction`/`worked_example` fragments present
- [ ] Add `tcolorbox` to allowed packages in `_sanitize_latex()`
- [ ] Add build status polling endpoint
- [ ] Implement PDF export endpoint (.pdf + .tex download)
- [ ] Integrate humanized error messages (Gemini Flash)

**Frontend:**
- [ ] Create `PdfPreviewPane.jsx` — display compiled PDF
- [ ] Create `CanvasToolbar.jsx` — compile button, export, save state
- [ ] Create `InsertFragmentMenu.jsx` — template dropdown grouped by category
- [ ] Create `src/config/fragmentTemplates.js` — template definitions
- [ ] Create `BuildStatusIndicator.jsx` — compiling/success/failed badge
- [ ] Create `CompileErrorBanner.jsx` — humanized error display
- [ ] Implement `useCompilePoller.js` — poll build status
- [ ] Wire "Preview" button + Ctrl+Shift+P shortcut

**Exit criteria:** Teacher can edit fragments, insert pre-built templates (questions, diagrams, spot-the-error boxes), click Preview, see compiled PDF. Failed compiles show a teacher-friendly error message. Export to .pdf and .tex works.

### Phase 3 — AI Revision & Image-to-Fragment Scanner (Weeks 3–4)

**Backend:**
- [ ] Create `document_revisions` table
- [ ] Implement `revision_service.py` — targeted fragment revision via Gemini
- [ ] Add revision API routes (revise, apply, reject, list)
- [ ] Implement `image_to_fragment_service.py` — two-stage Gemini Flash pipeline (see §8.5)
- [ ] Add `POST /documents/{id}/scan-question` endpoint (Stage 1: image → structured JSON)
- [ ] Add `POST /documents/{id}/scan-question/{scan_id}/generate` endpoint (Stage 2: JSON → LaTeX/TikZ fragment)
- [ ] Add `pgfplots` to allowed packages in `_sanitize_latex()` (needed for scanned graph recreation)

**Frontend:**
- [ ] Create `RevisionPanel.jsx` — per-fragment instruction input
- [ ] Create `RevisionTimeline.jsx` — revision history drawer
- [ ] Implement revision preview/apply/reject flow
- [ ] Add "Revise with AI" button to each `FragmentCard`
- [ ] Add 2-second debounced auto-save for fragment content
- [ ] Create `ScanQuestionModal.jsx` — image upload → OCR preview → edit description → generate fragment
- [ ] Add "Scan Question" button to toolbar and Insert Menu ("From Image" category)
- [ ] Support camera capture on mobile (`<input accept="image/*" capture="environment">`)

**Exit criteria:** Teacher can select a fragment, type an instruction, preview the AI revision, and accept or reject it. Revision history is viewable. Teacher can photograph a textbook question, review the OCR extraction, and insert it as an editable LaTeX fragment with recreated TikZ diagrams.

### Phase 4 — Study Canvas (Post-V1, ~Week 5–6)

- [ ] Implement Study Canvas (Markdown block editor)
- [ ] "Send to Canvas" from tutor chat
- [ ] Study-specific actions: simplify, add worked example, convert to quiz

### Phase 5 — Provider Routing & BYOK (Post-V1, ~Week 7–8)

- [ ] Add `GeminiProvider` and `OpenAIProvider` adapters
- [ ] BYOK key management (reuse existing Google Drive encrypted pattern)
- [ ] Fallback routing (Gemini → OpenAI on 429)
- [ ] Provider metadata in revision history

### Phase 6 — Auto-Repair & Advanced Features (Post-V1)

- [ ] Auto-repair LLM loop: on compile failure, LLM attempts one fix pass automatically
- [ ] Stripe billing integration
- [ ] Usage metering and quotas
- [ ] Premium model routing

---

## 12. Migration Path from Current A.G.E.

The existing `artifact_engine.py` is not replaced — it's **wrapped**.

### Step 1: Keep A.G.E. as the generator
`generate_worksheet_latex()` continues to produce monolithic LaTeX.

### Step 2: Add fragment parser
`parse_monolithic_latex()` decomposes the output into fragments.

### Step 3: Canvas consumes fragments
The new canvas loads the fragments, not the raw monolithic LaTeX.

### Step 4: Canvas-side compilation replaces A.G.E. compilation
`compile_service.py` reassembles fragments and compiles. The A.G.E.'s `compile_latex_to_pdf()` becomes a utility used by the compile service.

This means **zero breaking changes** to the existing worksheet generation flow. Teachers who don't use the canvas get the same experience as before.

---

## 13. Security Considerations

### Document Access Control
- All document/fragment API routes validate `owner_student_id` matches the authenticated user
- No document is accessible without authentication
- SQLite queries always include `WHERE owner_student_id = ?`

### LaTeX Compilation Security
- **`--no-shell-escape` flag** on all pdflatex/tectonic invocations — prevents `\write18` command injection
- Compile timeout: 30 seconds max
- Isolated temp directories per build (already implemented)
- PDF size limit: reject > 10MB
- Clean up temp dirs after serving

### AI Revision Safety
- Fragment LaTeX is the only user content sent to the LLM
- System prompt is controlled server-side (no prompt injection from fragment content)
- Revision output is sanitized through the same `_sanitize_latex()` pipeline as A.G.E. output

---

## 14. Cost Analysis

### API Costs per Teacher Action

| Action | Model | Input Tokens | Output Tokens | Est. Cost |
|---|---|---|---|---|
| Generate worksheet | Gemini Flash | ~2,000 | ~4,000 | ~$0.003 |
| Revise one fragment | Gemini Flash | ~500 | ~300 | <$0.001 |
| Scan question (Stage 1+2) | Gemini Flash | ~1,600 | ~700 | ~$0.002 |
| Humanize error | Gemini Flash | ~200 | ~50 | <$0.001 |

### Compilation Costs
- CPU only (no API cost)
- ~2–8s of compute per compile on Render
- Temp disk usage: ~5MB per build (cleaned up)

### Summary
A teacher creating a worksheet, revising 3 questions, scanning 2 textbook questions, and compiling 4 times costs approximately **$0.010 in API fees**. The dominant cost is infrastructure (Render hosting), not AI.

---

## 15. Test Plan

### Phase 1 Tests (Fragment CRUD)
- Create document from Worksheet Studio → fragments parsed correctly
- Fragment CRUD: create, read, update, delete
- Fragment reorder via drag-and-drop → sort_keys update correctly
- LexoRank: 100 successive reorders don't produce collisions
- Document ownership: user A cannot access user B's documents

### Phase 2 Tests (Compilation)
- Compile valid document → PDF generated, status `success`
- Compile invalid LaTeX → status `failed`, humanized error present
- Failed compile preserves last successful PDF in preview
- Export .pdf and .tex downloads work
- `--no-shell-escape` prevents `\write18` commands

### Phase 3 Tests (Revision & Image Scanner)
- Revise single fragment → only that fragment changes
- Revision preview → accept → fragment updated, revision logged
- Revision preview → reject → fragment unchanged
- Revision history displays in chronological order
- Concurrent edits: two quick revisions don't corrupt state
- Scan photo of printed question → Stage 1 returns valid structured JSON
- Scan photo with diagram → Stage 2 generates compilable TikZ
- Edit OCR description → re-generate produces corrected LaTeX
- Scan question inserted as editable fragment at correct position
- Complex diagram fallback: placeholder box inserted when confidence is low

### UX Acceptance
- Worksheet Studio → "Open in Canvas" → fragments visible in < 2s
- Edit fragment → click Preview → PDF updates in < 10s
- Failed compile → teacher-friendly error displayed (no raw LaTeX logs)
- Existing worksheet generation flow works unchanged when canvas is not used
- Existing `/query` tutor flow works unchanged

---

## 16. File Inventory (New Files to Create)

### Backend
```
backend/app/services/document_service.py
backend/app/services/fragment_service.py
backend/app/services/compile_service.py
backend/app/services/revision_service.py
backend/app/services/image_to_fragment_service.py
backend/app/routers/canvas_router.py
```

### Frontend
```
frontend/src/stores/canvasStore.js
frontend/src/config/fragmentTemplates.js
frontend/src/pages/CanvasWorkspace.jsx
frontend/src/components/canvas/FragmentList.jsx
frontend/src/components/canvas/FragmentCard.jsx
frontend/src/components/canvas/FragmentEditor.jsx
frontend/src/components/canvas/InsertFragmentMenu.jsx
frontend/src/components/canvas/ScanQuestionModal.jsx
frontend/src/components/canvas/PdfPreviewPane.jsx
frontend/src/components/canvas/CanvasToolbar.jsx
frontend/src/components/canvas/RevisionPanel.jsx
frontend/src/components/canvas/RevisionTimeline.jsx
frontend/src/components/canvas/BuildStatusIndicator.jsx
frontend/src/components/canvas/CompileErrorBanner.jsx
frontend/src/hooks/useCompilePoller.js
```

### Dependencies to Add
```
# Backend (requirements.txt)
fractional-indexing        # Python LexoRank implementation (if needed server-side)

# Frontend (package.json)
zustand                    # State management (1.1KB)
immer                      # Immutable updates (used with Zustand)
fractional-indexing         # LexoRank sort keys
@dnd-kit/core              # Drag-and-drop (12KB)
@dnd-kit/sortable          # Sortable preset for dnd-kit
```

---

## 17. Decision Log

| Decision | Chosen | Rationale |
|---|---|---|
| Fragment ordering | LexoRank (string) | Float precision exhausts after ~52 reorders. Strings are infinite. |
| Compilation trigger | Manual "Preview" button | No auto-compile on keystroke. Saves server cost, prevents confusing partial-edit errors. |
| Build status updates | Short-polling (1s) | WebSockets add complexity for a 2-8s operation. Polling is simpler. |
| State management | Zustand + immer | 1.1KB, zero boilerplate, granular selectors prevent re-renders. |
| LaTeX sandboxing (V1) | pdflatex + `--no-shell-escape` | Already working. Tectonic for V1.5. |
| LaTeX sandboxing (V1.5) | Tectonic | Single binary, no TeX Live install, auto-fetches packages. |
| SyncTeX | Not in V1 | Over-engineering trap. Teachers click Preview. |
| Auto-repair loop | Phase 6 (Post-V1) | Focus sprint on CRUD + manual compile + targeted revision. |
| Error UX | LLM-humanized errors | Raw pdflatex logs are incomprehensible to teachers. Gemini Flash translation costs <$0.001. |
| Study Canvas | Phase 4 (Post-V1) | Artifact canvas is the core value prop. Ship it first. |
| Provider routing | Phase 5 (Post-V1) | Gemini-only for V1. Add OpenAI fallback after core is stable. |
| Billing | Phase 6 (Post-V1) | Ship free, monetize later. |
| Image OCR provider | Gemini Flash multimodal (no Mathpix) | Already integrated, ~$0.002/scan, no new dependency. |
| Image-to-TikZ pipeline | Two-stage (extract → generate) | Stage 1 (perception) separable from Stage 2 (generation). Retryable, debuggable, editable between stages. |
| Diagram fallback | Placeholder box for low-confidence | Imperfect TikZ is acceptable because fragments are editable. Placeholder prevents silent failures. |
| Insert Fragment templates | Static config + expanded FragmentKind | Zero API cost, instant insertion, teaches teachers what's possible. |

---

*End of plan. Ship it.*
