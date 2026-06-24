> ⚠️ SUPERSEDED 12/06/2026 by /MAIT_ARCHITECTURE_CANON.md — do not build against this document.

# Architectural State Audit
**Date:** 19th April 2026
**Target:** `main` Branch (MAIT MVP)

## 1. Overview & Health

The repository is exhibiting excellent overall health. The massive refactoring sprint has successfully decoupled the front-end architecture, transforming the application from a series of monolithic 'god components' into a scalable, modern React web application.

The transition toward a proper routing engine (`React Router v6`), robust chunk-splitting (`vite.config.js`), and centralized state management (`Zustand`) solves the most pressing friction points from earlier phases. The build sizes for ML models and core application logic are now properly segmented.

## 2. Dominant Architectural Patterns

### State Management: Zustand Migration
The migration away from prop-drilling and massive `useState` hooks inside `ChatPage` and `WorksheetStudio` is complete. The application now correctly leverages atomic Zustand stores within `/frontend/src/stores/`:
- **`chatStore.js`:** Handles real-time messaging, the prompt queue, and loading states.
- **`modelStore.js`:** Decouples the lifecycle of the WebGL models locally (download progress, caching logic, model switching) from the UI layer. 
- **`canvasStore.ts`:** Implements highly advanced state synchronization for UI blocks. It utilizes fractional indexing (`fractional-indexing`) for component sorting and handles debounced REST synchronization via `API_URL/canvas/elements`.
- **`uiStore.js` & `timerStore.js`:** Segregate ephemeral visual toggles and timers.

### Routing & Splitting: React Router & Vite
- `App.jsx` now uses standard `React Router v6` `<Routes>` layouts wrapped in `Suspense`. Heavy UI surfaces like `ChatPage` and `WorksheetStudio` are lazily loaded.
- `vite.config.js` properly configures Rollup `manualChunks` logic to isolate React vendors, Mathematical vendors (KaTeX/mathjs), Radix components, and WebLLM into separate vendor chunks, thereby alleviating critical `pdf-lib` and memory resolution issues during builds.

### UI Architecture: Shadcn (Radix) & Hybrid Stacked UI
- The old A/B toggle tabs in `WorksheetStudio.tsx` have been entirely gutted. You are now utilizing a stepped progression UI (Curriculum -> Topics -> Pedagogy -> Output) powered by Framer Motion. This greatly reduces cognitive load.
- Shadcn (Radix UI) headless primitives handle the heavy accessibility lifting seamlessly.

### AI Routing Architecture: Local vs. Gem
A clear bisection in AI generation has been mapped:
- **Local Conversational (WebLLM):** The `ModelService.js` intelligently wraps `@mlc-ai/web-llm` with dynamic importing and tracks initialization promises natively, preventing race conditions or browser out-of-memory errors on navigation.
- **Heavy Document Generation (Gemini):** For intense worksheet scaffolding, the application dynamically constructs a heavily structured instruction JSON block (`buildWorksheetRequest`), generating a strict LaTeX prompt designed specifically for a handoff to the custom *Gemini Canvas Gem*.

## 3. Tech Debt & Loose Ends Observed

While the architecture is vastly superior to the original Alpha, a few distinct points of technical debt warrant attention soon:

1. **`LegacyNavigate` Shim in `App.jsx`:**
   - You have a functioning router, but are preserving a shim: `const legacyNavigate = (targetPage) => ...` and passing `setCurrentSection={legacyNavigate}` directly into `WorksheetStudio.tsx`. This indicates that internal components within `WorksheetStudio` and other routes are still coupled to the legacy string-based navigation paradigm instead of relying uniformly on the native `useNavigate` hook. 
2. **Commented `InlineCanvas` Pipeline in `WorksheetStudio.tsx`:**
   - Line 31 of `WorksheetStudio.tsx` has `// import { InlineCanvas } from '../components/canvas/InlineCanvas';` commented out. While `canvasStore.ts` is running and the copy-to-clipboard "Gemini Handoff" UI works natively, the direct inline editing of that TikZ canvas inside the frontend (`WorksheetStudio`) feels either partially disabled or hidden behind feature flags temporarily.
3. **Fire-and-Forget Persistence in `canvasStore.ts`:**
   - The reordering/updating logic correctly optimizes optimistic UI responses, but makes use of `setTimeout` fetch blocks and simple `.catch((err) => console.warn(err))` handlers (e.g. `// Persist new sort key to backend (fire-and-forget)`). If a user experiences a network drop, their local block state might desync from the Postgres backend without surfacing a failure to the user interface.
4. **Hardcoded Initializer Blocks:**
   - WebGPU exception handlers in `ModelService.js` have manual error capturing via `try...catch(e) {}` and dispose mechanics which point to possible persistent memory-leak struggles previously. This logic may be fragile on Apple Silicon without standard error telemetry.
