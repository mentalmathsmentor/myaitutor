# MAIT Native Canvas V1 — Priority Fixes Plan

> **For:** Sonnet (implementing agent)
> **By:** Opus (architecture review)
> **Branch:** `claude/architect-mait-transition-RWxti`
> **Date:** 2026-03-18

## Context

After reviewing the Kimi-implemented Native Canvas against `MAIT_NATIVE_CANVAS_IMPLEMENTATION_PLAN_Final.md`, the frontend UI and Zustand store are solid, but the **frontend-to-backend wiring is incomplete** — compile, save, and element CRUD all use mocks or no-ops. There are also a reorder bug, a SQL safety issue, missing DB tables, and missing schema columns.

---

## Task 1: Wire frontend compile to real backend

**Why:** `CanvasWorkspace.tsx` calls `mockCompile()` instead of the real `POST /canvas/compile` endpoint that already exists and works.

**File:** `mait-mvp/frontend/src/pages/CanvasWorkspace.tsx`

**Changes:**
- Remove `mockCompile` and `mockHumanizeError` functions
- Replace `handleCompile` to call `fetch` against the backend `POST /canvas/compile` with `{ latex_source: assembleLatex() }`
- Map the response `{ success, pdfUrl, error }` to the existing `setActiveBuild` flow
- For failed compiles, use the `error` string directly as `errorMessageHuman` (humanized error service is a Phase 2 item)
- Check how existing fetch calls determine the backend API base URL — look at `WorksheetGenerator` or `App.tsx` for the pattern

---

## Task 2: Wire element persistence (save + CRUD routes)

**Why:** Element edits in Zustand are never synced to the backend. `handleSave` is a no-op.

### 2a: Add missing backend routes

**File:** `mait-mvp/backend/app/main.py`

Add these routes (services already exist in `element_service.py` and `document_service.py`):

```
POST   /canvas/documents/{doc_id}/elements     → create_element(doc_id, ...)
DELETE /canvas/elements/{elem_id}              → delete_element(elem_id)
DELETE /canvas/documents/{doc_id}              → delete_document(doc_id)
```

Use `ElementUpdateRequest`-style Pydantic models for the create body. Keep the flat `/canvas/elements/{id}` pattern already established by the existing `PUT` route.

### 2b: Wire frontend to persist on edit

**File:** `mait-mvp/frontend/src/pages/CanvasWorkspace.tsx`

- Replace `handleSave` to iterate `getOrderedElements()` and `PUT` each changed element to `/canvas/elements/{id}`
- Alternatively (simpler): add a debounced auto-persist in `canvasStore.ts` — on `updateElement`, fire a debounced `PUT` after 1.5s of inactivity

**File:** `mait-mvp/frontend/src/stores/canvasStore.ts`

- In `addElement`: after inserting into store, fire `POST /canvas/documents/{docId}/elements` to persist
- In `deleteElement`: after removing from store, fire `DELETE /canvas/elements/{id}`
- Keep the Zustand store as source of truth (optimistic updates, no loading states needed for V1)

---

## Task 3: Fix `reorderElement` sort key recalculation

**Why:** Current implementation recalculates ALL sort keys on every reorder. This is both buggy (loop dependency on prior iteration's mutations inside Immer) and defeats LexoRank's purpose.

**File:** `mait-mvp/frontend/src/stores/canvasStore.ts` — `reorderElement` method (lines 232-249)

**Replace** the full-loop recalculation with:
```typescript
reorderElement: (id, newIndex) => {
  set((state) => {
    const currentIndex = state.elementOrder.indexOf(id);
    if (currentIndex === -1) return;

    // Remove from current position
    state.elementOrder.splice(currentIndex, 1);
    // Insert at new position
    state.elementOrder.splice(newIndex, 0, id);

    // Only recalculate sort key for the MOVED element
    const prevId = newIndex > 0 ? state.elementOrder[newIndex - 1] : null;
    const nextId = newIndex < state.elementOrder.length - 1 ? state.elementOrder[newIndex + 1] : null;
    const prevKey = prevId ? state.elementsById[prevId].sortKey : null;
    const nextKey = nextId ? state.elementsById[nextId].sortKey : null;
    state.elementsById[id].sortKey = generateKeyBetween(prevKey, nextKey);
  });
},
```

---

## Task 4: Add column whitelist to `update_element`

**Why:** Dynamic SQL column names from user input is fragile. Currently safe due to Pydantic gating, but defense-in-depth matters.

**File:** `mait-mvp/backend/app/services/element_service.py` — `update_element` function (line 70+)

**Add** after the `field_maps` translation block, before building the SET clause:
```python
ALLOWED_COLUMNS = {"content_latex", "sort_key", "is_locked", "is_collapsed", "label", "version_id", "updated_at"}
db_updates = {k: v for k, v in db_updates.items() if k in ALLOWED_COLUMNS}
if not db_updates:
    return None
```

---

## Task 5: Add `document_revisions` and `artifact_builds` tables

**Why:** Plan §4.4 and §4.5 specify these tables. Even with mock revision service for V1, the schema should exist so revision data can be persisted when the service is wired.

**File:** `mait-mvp/backend/app/services/storage.py` — inside `init_db()`, after the `document_elements` block

**Add:**
```sql
CREATE TABLE IF NOT EXISTS document_revisions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    element_id TEXT,
    instruction_text TEXT,
    provider TEXT DEFAULT 'manual',
    input_snapshot TEXT,
    output_snapshot TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
)
```

```sql
CREATE TABLE IF NOT EXISTS artifact_builds (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    pdf_path TEXT,
    error_message_human TEXT,
    build_log TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE
)
```

---

## Task 6: Add missing document schema columns + migration guards

**Why:** The `documents` table is missing `kind`, `source`, and `metadata_json` columns from the plan. Also the element migration doesn't guard `is_locked`/`is_collapsed`.

### 6a: Document columns

**File:** `mait-mvp/backend/app/services/storage.py` — inside `init_db()`, after the documents CREATE TABLE

**Add** migration logic:
```python
cursor = await db.execute("PRAGMA table_info(documents)")
doc_columns = [row[1] for row in await cursor.fetchall()]
if "kind" not in doc_columns:
    await db.execute("ALTER TABLE documents ADD COLUMN kind TEXT DEFAULT 'artifact'")
if "source" not in doc_columns:
    await db.execute("ALTER TABLE documents ADD COLUMN source TEXT DEFAULT 'manual'")
if "metadata_json" not in doc_columns:
    await db.execute("ALTER TABLE documents ADD COLUMN metadata_json TEXT DEFAULT '{}'")
```

### 6b: Update document_service.py

**File:** `mait-mvp/backend/app/services/document_service.py`

- `create_document` — accept optional `kind='artifact'`, `source='manual'`, `metadata_json='{}'` params, include in INSERT
- `get_document` / `get_documents_by_student` — add `kind`, `source`, `metadata_json` to SELECT and response dicts

### 6c: Element migration guard

**File:** `mait-mvp/backend/app/services/storage.py` — in the element migration block (after line 137)

**Add:**
```python
if "is_locked" not in columns:
    await db.execute("ALTER TABLE document_elements ADD COLUMN is_locked BOOLEAN DEFAULT 0")
if "is_collapsed" not in columns:
    await db.execute("ALTER TABLE document_elements ADD COLUMN is_collapsed BOOLEAN DEFAULT 0")
```

---

## Files to modify (summary)

| File | Tasks |
|---|---|
| `mait-mvp/frontend/src/pages/CanvasWorkspace.tsx` | 1, 2b |
| `mait-mvp/frontend/src/stores/canvasStore.ts` | 2b, 3 |
| `mait-mvp/backend/app/main.py` | 2a |
| `mait-mvp/backend/app/services/element_service.py` | 4 |
| `mait-mvp/backend/app/services/storage.py` | 5, 6a, 6c |
| `mait-mvp/backend/app/services/document_service.py` | 6b |

---

## Verification

1. **Backend starts:** `cd mait-mvp/backend && python -m uvicorn app.main:app` — no import errors, `init_db` creates new tables/columns
2. **New tables exist:** `sqlite3 data/mait.db ".tables"` should show `document_revisions` and `artifact_builds`
3. **New routes respond:** `curl -X POST localhost:8000/canvas/documents/test/elements` returns 200 (or 422 for missing body)
4. **Frontend compile:** Preview button hits real `/canvas/compile` → PDF renders (requires pdflatex; if unavailable, verify fetch fires and error displays)
5. **Element persistence:** Edit element → save fires PUT → refresh → edits persist
6. **Reorder:** Move element up/down → only moved element's sort key changes → no console errors
