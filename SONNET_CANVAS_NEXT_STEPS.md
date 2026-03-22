# Sonnet Implementation Plan — Canvas Phase 2.5 / Phase 3 Completion

> **Context:** Reviewed branch `claude/architect-mait-transition-RWxti` as of commit `e022554`.
> **Reference:** `MAIT_NATIVE_CANVAS_IMPLEMENTATION_PLAN_Final.md` (V3)
> **Goal:** Close the remaining gaps between what's built and what Phase 1–3 specifies.

---

## Current Status Summary

### DONE (Phase 1 & 2 — ~85% complete)
- Document & Element CRUD — backend services + API routes ✓
- Zustand store with fractional indexing (Immer middleware) ✓
- CanvasWorkspace three-pane layout ✓
- ElementList with collapsible cards, kind badges, inline label editing ✓
- ElementEditor with LaTeX symbol palette + cursor tracking ✓
- CanvasToolbar (Insert, Scan, AI Revision toggles) ✓
- InsertElementMenu with 15+ templates across 6 categories ✓
- `/canvas/compile` endpoint (pdflatex → base64 PDF) ✓
- CompileErrorBanner with raw log toggle ✓
- Export to .tex and .pdf ✓
- `latex_decomposer.py` — monolithic LaTeX → elements ✓
- Backend router split (6 routers) + App.jsx split ✓
- `@dnd-kit/core`, `@dnd-kit/sortable` installed in package.json ✓
- RevisionTimeline UI (drawer with apply/reject buttons) ✓
- Keyboard shortcuts (Ctrl+Shift+P compile, Ctrl+S save) ✓

### BROKEN / STUBBED (Needs immediate fix)
1. **PdfPreviewPane renders mock HTML, ignores real `pdfUrl`** — line 181 calls `renderMockPdf()` even when `pdfUrl` is a valid `data:application/pdf;base64,...` string
2. **RevisionPanel uses `mockRequestRevision()`** — hardcoded string manipulation instead of calling backend
3. **ScanQuestionModal uses `mockVisionParse()`** — hardcoded static response instead of calling backend
4. **No `--no-shell-escape` on pdflatex** — security gap per plan §5.3

### NOT IMPLEMENTED (Phase 3 items)
5. No backend `/canvas/elements/{id}/revise` endpoint
6. No backend `/canvas/documents/{id}/vision-parse` endpoint
7. No `revision_service.py`
8. No `image_to_fragment_service.py`
9. No `document_revisions` service layer (table exists in schema)
10. Drag-and-drop is visual-only — `@dnd-kit` not wired into `ElementList`

---

## Implementation Tasks (in priority order)

### Task 1: Fix PdfPreviewPane to render real PDFs
**File:** `mait-mvp/frontend/src/components/canvas/PdfPreviewPane.tsx`

**Problem:** When `pdfUrl` is provided (a `data:application/pdf;base64,...` string from the compile endpoint), the component still renders `renderMockPdf()` (line 181). The actual PDF is never displayed.

**Fix:**
- When `pdfUrl` is truthy, render an `<iframe>` or `<object>` element with `src={pdfUrl}` and `type="application/pdf"` instead of calling `renderMockPdf()`.
- Apply zoom via CSS `transform: scale()` on the iframe container.
- Keep the mock content as a fallback ONLY when `pdfUrl` is falsy AND the user hasn't compiled yet (or remove it entirely — the "No preview yet" empty state already handles that).

**Implementation:**
```tsx
// Replace line 179-183:
) : pdfUrl ? (
  <div className="flex justify-center">
    <iframe
      src={pdfUrl}
      title="PDF Preview"
      className="bg-white shadow-lg"
      style={{
        width: '210mm',
        minHeight: '297mm',
        transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
        transformOrigin: 'top center',
        border: 'none',
      }}
    />
  </div>
) : (
  // Keep existing "No preview yet" empty state (lines 184-196)
```

- Delete the entire `renderMockPdf()` function (lines 30-93).

---

### Task 2: Add `--no-shell-escape` to pdflatex
**File:** `mait-mvp/backend/app/services/artifact_engine.py`

**What:** Find the `subprocess.run` or `subprocess.Popen` call that invokes `pdflatex` and add `--no-shell-escape` to the command arguments. Also tighten timeout from 60s to 30s per plan §5.3.

**Search for:** `pdflatex` in `artifact_engine.py`, find the subprocess call, add the flag.

---

### Task 3: Create `revision_service.py` backend
**File:** `mait-mvp/backend/app/services/revision_service.py` (NEW)

**Implements:** Plan §5.1 `revision_service.py` and §9 AI Revision Prompt Strategy.

**Functions:**
```python
async def create_revision(doc_id: str, element_id: str, instruction: str) -> dict:
    """
    1. Fetch the element by ID
    2. Snapshot current content_latex as input_snapshot
    3. Build prompt using FRAGMENT_REVISION_SYSTEM_PROMPT + FRAGMENT_REVISION_USER_PROMPT
       from plan §9 (kind, label, content_latex, instruction)
    4. Call Gemini Flash via existing gemini_client
    5. Store revision in document_revisions table with status='pending'
    6. Return revision dict with id, inputSnapshot, outputSnapshot, status
    """

async def apply_revision(revision_id: str) -> dict:
    """
    1. Fetch revision from document_revisions
    2. Update the element's content_latex to revision's output_snapshot
    3. Update revision status to 'applied'
    4. Return updated revision
    """

async def reject_revision(revision_id: str) -> dict:
    """
    1. Update revision status to 'rejected'
    2. Return updated revision
    """

async def list_revisions(doc_id: str, element_id: str = None) -> list:
    """
    Fetch revisions for a document, optionally filtered by element_id.
    Ordered by created_at DESC.
    """
```

**Prompt constants** (from plan §9):
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
```

**Database:** The `document_revisions` table already exists in `storage.py`. Use the same `aiosqlite` pattern as `element_service.py`.

---

### Task 4: Add revision API routes to canvas router
**File:** `mait-mvp/backend/app/routers/canvas.py`

**Add these endpoints:**

```python
# POST /canvas/elements/{elem_id}/revise
# Body: { "instruction": "Make this harder" }
# Returns: { "revision": { id, elementId, instruction, inputSnapshot, outputSnapshot, status } }

# POST /canvas/revisions/{rev_id}/apply
# Returns: { "revision": { ... status: "applied" } }

# POST /canvas/revisions/{rev_id}/reject
# Returns: { "revision": { ... status: "rejected" } }

# GET /canvas/documents/{doc_id}/revisions
# Returns: { "revisions": [...] }
```

Import and call the functions from `revision_service.py`.

---

### Task 5: Wire RevisionPanel to real backend
**File:** `mait-mvp/frontend/src/components/canvas/RevisionPanel.tsx`

**Changes:**
1. Delete the `mockRequestRevision` function (lines 16-48).
2. Replace `handleRequestRevision` to call `fetch(\`${API_URL}/canvas/elements/${selectedElement.id}/revise\`, { method: 'POST', body: JSON.stringify({ instruction }) })`.
3. Parse the response and create the revision object from the server response.
4. Wire `handleApply` to call `POST /canvas/revisions/${rev.id}/apply`.
5. Wire `handleReject` to call `POST /canvas/revisions/${rev.id}/reject`.
6. Import `API_URL` from `@/config/api`.

---

### Task 6: Create `image_to_fragment_service.py` backend
**File:** `mait-mvp/backend/app/services/image_to_fragment_service.py` (NEW)

**Implements:** Plan §8.5 Tier 2 — Optical Extraction Protocol.

**Single function:**
```python
async def vision_parse(image_base64: str, doc_id: str, insert_after_sort_key: str = None) -> list[dict]:
    """
    1. Call Gemini Flash with VISION_PARSE_SYSTEM_PROMPT (from plan §8.5) + the base64 image
    2. Parse the JSON array response
    3. Generate sort_keys for each fragment (after insert_after_sort_key or at end)
    4. Persist each fragment to document_elements via element_service.create_element()
    5. Return the saved fragment list
    """
```

Use the `VISION_PARSE_SYSTEM_PROMPT` from plan §8.5 (lines 799-841).

Call Gemini via the existing `gemini_client.py` — use `google.genai` with `media_resolution="high"` and include the base64 image as inline data.

---

### Task 7: Add vision-parse API route
**File:** `mait-mvp/backend/app/routers/canvas.py`

```python
# POST /canvas/documents/{doc_id}/vision-parse
# Body: { "image_base64": "...", "insert_after_element_id": "optional" }
# Returns: { "elements": [...], "placeholders_used": N, "total_elements": N }
```

---

### Task 8: Wire ScanQuestionModal to real backend
**File:** `mait-mvp/frontend/src/components/canvas/ScanQuestionModal.tsx`

**Changes:**
1. Delete `mockVisionParse` function.
2. Replace the call with `fetch(\`${API_URL}/canvas/documents/${documentId}/vision-parse\`, { method: 'POST', body: JSON.stringify({ image_base64: base64 }) })`.
3. On success, inject returned elements into the Zustand store via `setElements` or individual `addElement` calls.
4. Import `API_URL` from `@/config/api`.
5. Get `documentId` from the canvas store.

---

### Task 9: Wire drag-and-drop with @dnd-kit
**File:** `mait-mvp/frontend/src/components/canvas/ElementList.tsx`

**Changes:**
1. Import `DndContext`, `closestCenter`, `KeyboardSensor`, `PointerSensor`, `useSensor`, `useSensors` from `@dnd-kit/core`.
2. Import `SortableContext`, `verticalListSortingStrategy`, `useSortable` from `@dnd-kit/sortable`.
3. Import `CSS` from `@dnd-kit/utilities`.
4. Wrap the element list in `<DndContext>` + `<SortableContext>`.
5. Make each element card a sortable item using `useSortable`.
6. On `handleDragEnd`:
   - Get the old and new indices.
   - Compute new `sort_key` using `generateKeyBetween` from `fractional-indexing` between the new neighbors.
   - Call `reorderElement(elementId, newSortKey)` from the store.
   - Fire `PUT /canvas/elements/${id}` with the new `sortKey` to persist.

The existing `GripVertical` icon (line 5) is already rendered as the drag handle — attach `{...attributes} {...listeners}` from `useSortable` to it.

---

### Task 10: Add `tcolorbox` and `pgfplots` to allowed packages
**File:** `mait-mvp/backend/app/services/artifact_engine.py`

**What:** Find the `_sanitize_latex()` function's allowed packages list (or any package filtering logic) and add `tcolorbox` and `pgfplots` to the allowlist. Per plan §6.6 and §8.5:
- `tcolorbox` is needed for Spot the Error Box, Worked Example templates, and Smart Image Placeholders
- `pgfplots` is needed for scanned graph recreation

---

## Execution Order

**Critical path (do these first — they fix broken functionality):**
1. Task 1 — Fix PDF preview (users can't see compiled output)
2. Task 2 — Add `--no-shell-escape` (security)
3. Task 10 — Allow `tcolorbox`/`pgfplots` packages

**Core Phase 3 features (AI revision — highest value):**
4. Task 3 — Create `revision_service.py`
5. Task 4 — Add revision API routes
6. Task 5 — Wire RevisionPanel to backend

**Phase 3 features (vision scanning):**
7. Task 6 — Create `image_to_fragment_service.py`
8. Task 7 — Add vision-parse route
9. Task 8 — Wire ScanQuestionModal to backend

**Polish (drag-and-drop):**
10. Task 9 — Wire @dnd-kit into ElementList

---

## Files to Create
```
mait-mvp/backend/app/services/revision_service.py       (NEW)
mait-mvp/backend/app/services/image_to_fragment_service.py (NEW)
```

## Files to Modify
```
mait-mvp/frontend/src/components/canvas/PdfPreviewPane.tsx   (replace mock with iframe)
mait-mvp/frontend/src/components/canvas/RevisionPanel.tsx    (remove mock, wire to API)
mait-mvp/frontend/src/components/canvas/ScanQuestionModal.tsx (remove mock, wire to API)
mait-mvp/frontend/src/components/canvas/ElementList.tsx      (add @dnd-kit)
mait-mvp/backend/app/routers/canvas.py                       (add 4 endpoints)
mait-mvp/backend/app/services/artifact_engine.py             (--no-shell-escape, packages)
```

---

## Important Implementation Notes

1. **Gemini client:** Use the existing `gemini_client.py` or the pattern in `artifact_engine.py` for calling Gemini. The SDK is `google-genai` (not `google-generativeai`). Check the actual import and call pattern before writing new service code.

2. **Database pattern:** Follow `element_service.py`'s pattern exactly — it uses `aiosqlite` via `get_db()` from `storage.py`. The `document_revisions` table schema is already defined in `storage.py`.

3. **API_URL:** Frontend imports from `@/config/api` — this is already set up.

4. **Zustand store:** The store already has `setPendingRevision`, `addRevision`, `applyRevision`, `rejectRevision` actions. The revision service wire-up should use these existing actions.

5. **Auth pattern:** Canvas routes use `verify_student_auth(request, student_id)` from `deps.py`. The revision and vision-parse endpoints should follow the same pattern.

6. **Naming:** The plan uses "Fragment" but the codebase was refactored to "Element". Use "Element" consistently in code. The plan's `fragment_service.py` is already `element_service.py`, etc.

---

*Generated by Opus architect review — commit `e022554`*
