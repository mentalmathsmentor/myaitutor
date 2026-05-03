# Worksheet Studio Bug Fix Specification

Repo: `mentalmathsmentor/myaitutor`
Branch: `claude/fix-worksheet-studio-bugs-lXQTW`
Primary file under investigation: `mait-mvp/frontend/src/sections/WorksheetStudio.tsx`
Supporting prompt assembly: `mait-mvp/frontend/src/features/worksheet/utils/{buildWorksheetRequest.js, buildSyllabusPacket.js, renderGemHandoffPrompt.js}`
Data: `mait-mvp/frontend/src/{syllabus_data.json, syllabus_registry.json}`

> Constraint: Do **not** modify `syllabus_data.json` or `syllabus_registry.json`. The data is fine; the bugs are all in component state plumbing.

---

## Bug 1: Topic Injection (CRITICAL)

### Symptom (verified)
When the user selects topics that are NOT from Mathematics Advanced "Trigonometric Functions", the final Gemini handoff prompt still lists trigonometry dot-points under **SYLLABUS PACKET (NESA ALIGNED) → Relevant Dot-Points** (and pulls the corresponding outcomes / include / exclude / assessmentEmphasis / questionStyleNotes from `syllabus_registry.json`). The compile breaks because Gemini receives the user's selections plus contradictory trig topics.

### Root Cause
`selectedPoints` is initialised from a single, **unscoped** localStorage key (`mait_ws_selectedPoints`) and is **never pruned or cleared** when the user changes stage or subject. The result:

1. `WorksheetStudio.tsx:180-185` — initial state hydrates from localStorage:
   ```js
   const [selectedPoints, setSelectedPoints] = useState(() => {
     try {
       const saved = localStorage.getItem('mait_ws_selectedPoints');
       return saved ? JSON.parse(saved) : [];
     } catch { return []; }
   });
   ```
2. `WorksheetStudio.tsx:277-280` — every change re-persists the same global key:
   ```js
   useEffect(() => {
     localStorage.setItem('mait_ws_rawQuestions', rawQuestions);
     localStorage.setItem('mait_ws_selectedPoints', JSON.stringify(selectedPoints));
   }, [rawQuestions, selectedPoints]);
   ```
3. `WorksheetStudio.tsx:258-273` — the only stage-change effect resets `selectedSubject`; **it does not touch `selectedPoints`**. There is no comparable effect for `selectedSubject`.

So a teacher who once explored "Year 11 Advanced → Trigonometric Functions" leaves trig point ids (e.g. `y_11_advanced_trigonometric_functions_ambiguous_ca`, `…_3d_trigonome`, `…_radians`, `…_solving_trig`) sitting in the persisted array. When they later select non-trig points (in any subject), those stale ids are still in `selectedPoints`.

`buildSyllabusPacket.js` then dutifully serialises them into the prompt:
- `buildSyllabusPacket.js:43-53` looks every id up in `syllabus_registry` and unions the metadata into outcomes/include/exclude/assessmentEmphasis/questionStyleNotes.
- `buildSyllabusPacket.js:55` calls `extractLabels(selectedPoints, syllabusData)` which traverses the **current** merged syllabus (`currentSyllabus`) and resolves any id whose label exists there. Within the same subject (e.g. Year 11 Advanced) the trig ids will resolve to their full labels ("Ambiguous Case: …", "3D Trigonometry Problems: …", etc.). When the subject changes to one where the id is absent, it falls back to the raw id string but is **still emitted** — see `extractLabels` line 21 (`p => idToLabel[p] || p`).
- `renderGemHandoffPrompt.js:38-59` then writes `topicSummary`, `dotPoints`, and the registry-derived arrays into the prompt body verbatim.

The HIERARCHY_MAP prerequisite merge (`WorksheetStudio.tsx:40-72`) is **not** the cause: it only changes which dot-points are *visible*, never which are *selected*. There is also no hard-coded trig sample in the prompt template; the trig content comes exclusively from stale `selectedPoints` ids being re-resolved.

### Fix Specification

**Goal:** Stop stale ids from a previous stage/subject from leaking into the current selection.

**File:** `mait-mvp/frontend/src/sections/WorksheetStudio.tsx`

**Change A — prune `selectedPoints` against the current syllabus on every stage/subject change.**
- Insert a new `useEffect` immediately after the existing stage-change effect (i.e. after `WorksheetStudio.tsx:273`).
- It must walk `currentSyllabus` to collect the set of valid ids, then filter `selectedPoints`.

Pseudocode:
```js
useEffect(() => {
  if (!currentSyllabus || Object.keys(currentSyllabus).length === 0) {
    // For 'Other' / manual-only subjects, drop syllabus selections entirely.
    if (selectedPoints.length > 0) setSelectedPoints([]);
    return;
  }
  const validIds = new Set();
  const collect = (node) => {
    if (Array.isArray(node)) {
      node.forEach((p) => { const id = getId(p); if (id) validIds.add(id); });
    } else if (node && typeof node === 'object') {
      Object.values(node).forEach(collect);
    }
  };
  collect(currentSyllabus);

  // Also include flat-list subjects (currentTopicsList) for non-legacy subjects.
  if (currentTopicsList) {
    currentTopicsList.forEach((p) => { const id = getId(p); if (id) validIds.add(id); });
  }

  setSelectedPoints((prev) => {
    const filtered = prev.filter((id) => validIds.has(id));
    return filtered.length === prev.length ? prev : filtered;
  });
}, [currentSyllabus, currentTopicsList]);
```

Notes for the implementer:
- `getId`, `currentSyllabus`, and `currentTopicsList` are already in scope (defined at lines 336, 319-324, 326-334).
- Return `prev` unchanged when nothing was pruned to avoid extra renders / persistence churn from the existing `localStorage.setItem` effect on line 278.
- Do **not** clear `rawQuestions` — manual brief text is subject-agnostic and the user expects it to persist.

**Change B (defensive, recommended) — guard `extractLabels` so it never emits raw ids.**
- File: `mait-mvp/frontend/src/features/worksheet/utils/buildSyllabusPacket.js`, lines 4-22.
- Change the fallback `idToLabel[p] || p` (line 21) to filter out unresolved ids:
  ```js
  return points.map((p) => idToLabel[p]).filter(Boolean);
  ```
- And in `buildSyllabusPacket` itself (lines 43-53), skip registry lookups for ids that did not resolve to a label, so a stale id never produces phantom outcomes/include/exclude entries either:
  ```js
  const resolvedIds = new Set(selectedPoints.filter((id) => idToLabel[id]));
  resolvedIds.forEach((pointId) => { /* existing registry lookup */ });
  ```
  (Implementer: factor `idToLabel` out of `extractLabels` so both functions can share it, or recompute inline. Keep the change minimal — no new module-level helpers.)

Change A alone fixes the symptom; Change B is a belt-and-braces guarantee against any future code path that re-introduces stale ids (e.g. import/export of saved worksheets).

### Test Case
1. Open Worksheet Studio in a fresh browser (or run `localStorage.clear()` in devtools).
2. Set Stage = **Year 11**, Subject = **Mathematics Advanced**. Navigate to the Topics step.
3. Expand **Trigonometric Functions** and tick `Ambiguous Case`, `3D Trigonometry Problems`, and `Radians`. Confirm "3 selected" in the header.
4. Without touching anything else, click back to Step 1 (Curriculum) and switch Subject to **Mathematics Standard 2** (or any subject other than Advanced). Return to Topics.
5. **Expected after fix:** "0 selected" — the trig ids have been pruned because they don't exist in the new syllabus.
6. Tick a single non-trig topic in the new subject (e.g. an Algebra dot-point). Continue to Output → click **Generate Instructions & Launch Gemini**.
7. Paste the clipboard contents into a text editor. The `**SYLLABUS PACKET (NESA ALIGNED):**` section must contain **only** the algebra dot-point. No trig labels (`Ambiguous Case`, `3D Trigonometry`, `Radians`) and no MA11-1/MA11-2 outcomes from those entries.
8. Regression: repeat steps 1-3, but instead of changing subject, just click around the same Advanced syllabus and add a Calculus dot-point. The trig selections must still survive (we only prune on stage/subject change, not on every selection toggle).

---

## Bug 2: Watermark Default

### Symptom (verified)
On the Output step, the **"Remove watermark"** toggle is unchecked by default. The user reports that the watermark "appears off by default" — i.e. the UI signal they get from the unchecked toggle is "no watermark" and they want a positive, defaulted-on watermark control whose checked state means "watermark on, footer = `myaitutor.au/worksheets`".

### Root Cause
The control's polarity is inverted relative to user expectation, and the prompt never emits an *affirmative* watermark instruction — it only emits text when the watermark is being *suppressed*.

1. State is stored as a negative (`removeWatermark`):
   - `WorksheetStudio.tsx:173` —
     ```js
     const [removeWatermark, setRemoveWatermark] = useState(
       () => localStorage.getItem('mait_ws_removeWatermark') === 'true'
     );
     ```
     Default = `false` (toggle unchecked) → semantically watermark is "on" but the UI reads as "off" because the checkbox is unchecked.
2. UI label is the negative form:
   - `WorksheetStudio.tsx:1281` —
     ```js
     { label: 'Remove watermark', note: '(Link to this generator)', checked: removeWatermark, onChange: setRemoveWatermark },
     ```
3. Prompt assembly is asymmetric — only the OFF case is emitted:
   - `buildWorksheetRequest.js:80` — `watermark: !removeWatermark`
   - `renderGemHandoffPrompt.js:31` —
     ```js
     if (!settings.watermark) handoff += `- **WATERMARK:** OFF (Leave rfoot empty)\n`;
     ```
   With the default `removeWatermark = false`, `watermark = true`, and **no watermark line is emitted at all**. Gemini is left to infer behaviour from the Gem system prompt. That is fragile and is what the user perceives as "off by default".

### Fix Specification

**Files:** `mait-mvp/frontend/src/sections/WorksheetStudio.tsx`, `mait-mvp/frontend/src/features/worksheet/utils/renderGemHandoffPrompt.js`

**Change A — flip the state to a positive `showWatermark`, defaulting to `true`.**
- `WorksheetStudio.tsx:173` — replace with:
  ```js
  const [showWatermark, setShowWatermark] = useState(() => {
    const saved = localStorage.getItem('mait_ws_showWatermark');
    if (saved !== null) return saved === 'true';
    // Migration: if a legacy removeWatermark key exists, invert it; otherwise default true.
    const legacy = localStorage.getItem('mait_ws_removeWatermark');
    return legacy === null ? true : legacy !== 'true';
  });
  ```
- `WorksheetStudio.tsx:237` — replace persistence line:
  ```js
  localStorage.setItem('mait_ws_showWatermark', showWatermark.toString());
  ```
  And update the dep array on line 255 (`removeWatermark` → `showWatermark`).
- `WorksheetStudio.tsx:481` (inside `getWorksheetRequestParams`) — replace `removeWatermark` with `showWatermark` (and rename the param consumed downstream — see Change B).
- `WorksheetStudio.tsx:1281` — relabel and re-wire the toggle:
  ```js
  { label: 'Watermark', note: 'Footer link to myaitutor.au/worksheets', checked: showWatermark, onChange: setShowWatermark },
  ```

**Change B — make `buildWorksheetRequest` and the Gem prompt symmetric.**
- `buildWorksheetRequest.js:19` — change destructured param from `removeWatermark` to `showWatermark`.
- `buildWorksheetRequest.js:80` — replace `watermark: !removeWatermark` with `watermark: showWatermark`.
- `renderGemHandoffPrompt.js:31` — emit BOTH branches so the Gem never has to guess:
  ```js
  if (settings.watermark) {
    handoff += `- **WATERMARK:** ON (Set rfoot to "myaitutor.au/worksheets")\n`;
  } else {
    handoff += `- **WATERMARK:** OFF (Leave rfoot empty)\n`;
  }
  ```

**Do not** delete the legacy `mait_ws_removeWatermark` localStorage key in code — the migration shim in Change A handles existing users gracefully.

### Test Case
1. Open Worksheet Studio in an incognito window (no prior localStorage).
2. Click through to the **Output** step.
3. **Expected after fix:** the "Watermark" toggle is **checked** and shows the helper note "Footer link to myaitutor.au/worksheets".
4. Click **Generate Instructions & Launch Gemini**, paste the clipboard text into a text editor. Confirm the prompt contains the line `- **WATERMARK:** ON (Set rfoot to "myaitutor.au/worksheets")`.
5. Untick the toggle, regenerate, and confirm the prompt now contains `- **WATERMARK:** OFF (Leave rfoot empty)`.
6. Refresh the page — the toggle's checked state must persist.
7. Migration check: in devtools set `localStorage.setItem('mait_ws_removeWatermark', 'true')`, remove `mait_ws_showWatermark`, hard-reload. Toggle must come up **unchecked** (legacy "remove = true" → new "show = false").

---

## Bug 3: Topic Input Focus Loss

### Symptom (verified)
On Step 2 (Topics), typing into the syllabus search box (placeholder "Find a topic or syllabus point...") loses focus mid-typing or starts dropping characters. The user has to click the input again to resume.

### Root Cause
A redundant `useEffect` re-fires `setExpandedModules` and `setExpandedSubtopics` on **every keystroke**, triggering an extra render commit (a second pass through the entire syllabus tree) per character. Combined with the heavy syllabus rendering — `dangerouslySetInnerHTML` + a module-level `latexCache` mutation per point + framer-motion's reconciliation around `<AnimatePresence mode="wait">` — this second commit is what knocks focus off the controlled `<input>`.

Specifically:

1. `WorksheetStudio.tsx:342-362` — `filteredModules` is a `useMemo` over `[currentSyllabus, searchQuery]`. Every keystroke produces a **new array reference**.
2. `WorksheetStudio.tsx:364-383` — this `useEffect` depends on `[currentSyllabus, filteredModules, searchQuery]`. Because `filteredModules` is a new array on every keystroke, the effect runs on every keystroke and calls:
   ```js
   setExpandedModules((prev) => ({ ...prev, ...nextModules }));
   setExpandedSubtopics((prev) => ({ ...prev, ...nextSubtopics }));
   ```
   These setters always allocate a fresh object so React schedules another render even when the contents are identical.
3. The syllabus tree render (`WorksheetStudio.tsx:945-1024`) **already** uses `(expandedModules[moduleName] || searchQuery)` and `(expandedSubtopics[subtopic] || searchQuery)` to force-expand while a query is active — see lines 965, 982, 995. So the effect's writes are not load-bearing for visible behaviour: it is pure dead weight. Removing it eliminates the second render-and-commit per keystroke and the focus loss disappears.

(`MathInput.jsx:61-67` has its own selection-restoring `useEffect` that can move the cursor in the *manual brief* textarea, but that input is a separate `<textarea>` lower on the page; the user's reported reproduction targets the syllabus search box and is fully explained by the cascade above.)

### Fix Specification

**File:** `mait-mvp/frontend/src/sections/WorksheetStudio.tsx`

**Change A — delete the redundant auto-expand effect.**
- Lines 364-383 — remove the entire `useEffect` block. The render-time fallbacks at lines 965, 982, 995 already guarantee that matching modules and subtopics are visible while the search query is non-empty.

**Change B — make `filteredModules` stable when the query is empty.**
- Lines 342-362 — collapse the duplicated empty-query branch (lines 343-345 and 347-349 both early-return the same expression) and short-circuit cleanly:
  ```js
  const filteredModules = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    const moduleNames = Object.keys(currentSyllabus);
    if (!query) return moduleNames;
    return moduleNames.filter((moduleName) => {
      if (moduleName.toLowerCase().includes(query)) return true;
      return Object.entries(currentSyllabus[moduleName] || {}).some(
        ([subtopic, points]) =>
          subtopic.toLowerCase().includes(query) ||
          points.some((point) => getLabel(point).toLowerCase().includes(query))
      );
    });
  }, [currentSyllabus, searchQuery]);
  ```
  Keep the diff minimal — this only removes the dead duplicated branch; behaviour is unchanged.

**Change C (only if A + B are not sufficient on heavier syllabi) — defer the tree render with `useDeferredValue`.**
- Add `useDeferredValue` to the React import.
- Insert next to the `searchQuery` state:
  ```js
  const deferredSearchQuery = useDeferredValue(searchQuery);
  ```
- Use `deferredSearchQuery` (not `searchQuery`) inside `filteredModules` and inside the inline `query` recomputations at lines 969 and 996. Continue binding `value={searchQuery}` on the `<input>` itself so typing remains snappy.

Sonnet should attempt Changes A and B first, verify in browser, and only apply Change C if focus loss persists at high typing speed on the Year 12 Advanced syllabus.

### Test Case
1. Hard-reload the Worksheet Studio page in a normal browser tab.
2. Set Stage = **Year 12**, Subject = **Mathematics Advanced**. Click through to the Topics step.
3. Click into the search input (placeholder "Find a topic or syllabus point...").
4. Without clicking anywhere else, type the word **`different`** at a normal cadence.
5. **Expected after fix:** the input value is exactly `different` (9 characters, no missing letters), focus stays inside the input, and the syllabus tree below filters down to differentiation-related dot-points.
6. Backspace to empty the input — focus must remain in the input.
7. Repeat with a longer query (`differentiation rules`) to confirm no focus loss under sustained typing.

---

## Implementation Order
1. **Bug 1** first — highest user impact (broken Gemini compile). Stop the topic injection.
2. **Bug 3** second — eliminates the most painful UX friction in the same step that Bug 1 lives in, and the regression test for Bug 1 requires typing in the search box.
3. **Bug 2** last — cosmetic / semantic, easiest to verify visually.

## Constraints for the Implementing Agent
- Do not refactor unrelated code. Each change above is scoped to specific lines.
- Do not introduce new dependencies. `useDeferredValue` is already part of React 18 and does not require an install.
- Do not modify `syllabus_data.json` or `syllabus_registry.json`. The data is correct.
- Each bug fix gets its own commit on `claude/fix-worksheet-studio-bugs-lXQTW`, with a message of the form `fix(worksheet): <bug summary>`.
- Verify each fix manually in a browser using the test case above before moving to the next.
- For Bug 1, after the fix, also run `npm test -- buildWorksheetRequest` (the existing test file lives at `mait-mvp/frontend/src/features/worksheet/utils/__tests__/buildWorksheetRequest.test.js`) to ensure the request builder still passes; update it only if the renamed `removeWatermark` → `showWatermark` parameter from Bug 2 forces a corresponding test rename.
- Do **not** clear `rawQuestions` or any pedagogy toggles when pruning `selectedPoints`. They are subject-agnostic and persist intentionally.
