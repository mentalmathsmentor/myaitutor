# MAIT Native Canvas Implementation Plan

## Summary

This plan defines a safe, staged implementation for a MAIT-native canvas that replaces the current external Gemini-first editing flow with an in-product workspace. The v1 target is a dual-purpose system with:

- `Artifact Canvas` for worksheet and LaTeX artifact editing
- `Study Canvas` for tutor and study-note editing
- Hybrid provider routing from day one
- Managed subscriptions added after persistence and routing are stable

The plan is designed to fit the current MAIT codebase:

- `frontend/src/WorksheetGenerator.jsx` already assembles the worksheet prompt and launches Gemini externally
- `frontend/src/App.jsx` already owns the tutor chat flow and cloud/local orchestration
- `backend/app/main.py` already exposes session-bound tutor and worksheet endpoints
- `backend/app/services/artifact_engine.py` already handles LaTeX generation and PDF compilation
- `frontend/src/services/GoogleDriveService.js` already provides a usable pattern for client-side encrypted BYOK storage

## Product Shape

### Canvas v1

Ship one shared route-level workspace with two editors:

- `Artifact Canvas`
  - Canonical format: raw LaTeX
  - Use case: worksheet/artifact edits, compile, repair, export
  - View: source editor + rendered preview + revision timeline + instruction pane
- `Study Canvas`
  - Canonical format: Markdown/rich text
  - Use case: tutor outputs, revision sheets, structured study notes, quizzes
  - View: block editor + live preview + revision timeline + instruction pane

### Entry points

- Worksheet Studio gains `Open in Canvas`
- Tutor chat gains `Send to Canvas` on assistant outputs
- External Gemini launch remains available as fallback until artifact canvas is stable

### Non-goals for v1

- No attempt to fully clone Gemini Canvas UI or behavior
- No multi-user collaboration
- No Anthropic integration in v1
- No direct raw LaTeX editing for study documents

## Backend Changes

### New persistent models

Add backend models and storage support for:

#### `Document`

- `id`
- `owner_student_id`
- `title`
- `kind`: `artifact | study`
- `source`: `worksheet_generator | chat | manual`
- `current_revision_id`
- `metadata_json`
- `created_at`
- `updated_at`

#### `ArtifactDocumentBody`

- `document_id`
- `latex_source`
- `compiled_pdf_path`
- `compile_status`
- `last_compile_error`

#### `StudyDocumentBody`

- `document_id`
- `content_markdown`
- `rendered_html_cache`

#### `DocumentRevision`

- `id`
- `document_id`
- `parent_revision_id`
- `instruction_text`
- `selection_anchor_json`
- `provider`
- `model`
- `input_snapshot`
- `output_snapshot`
- `diff_summary`
- `status`: `pending | applied | failed`
- `created_at`

#### `ProviderKey`

- `id`
- `owner_student_id`
- `provider`
- `encrypted_blob_ref`
- `storage_backend`
- `created_at`
- `updated_at`

#### `SubscriptionEntitlement`

- `owner_student_id`
- `plan`
- `status`
- `billing_provider`
- `billing_customer_id`
- `billing_subscription_id`
- `managed_revision_limit`
- `premium_models_enabled`
- `retention_days`
- `updated_at`

### New services

Add:

- `document_service`
  - document creation, load/save, revision persistence, export bookkeeping
- `provider_router`
  - chooses provider/model, handles fallback, records usage
- `billing_service`
  - checkout creation, webhook handling, entitlement syncing
- `revision_service`
  - document-kind-aware prompt building and apply/preview flow

### New API routes

Add a new document router under FastAPI.

#### Documents

- `POST /documents`
  - create `artifact` or `study` document
  - for `artifact`, accept worksheet seed content and metadata
  - for `study`, accept selected tutor output or manual seed content
- `GET /documents/{id}`
- `GET /documents/{id}/revisions`
- `POST /documents/{id}/revise`
  - request:
    - `instruction`
    - `selection_anchor`
    - `provider_preference`
    - `model_preference`
    - `apply_mode`: `preview | apply`
  - response:
    - updated document snapshot
    - revision record
    - diff summary
    - provider/model metadata
- `POST /documents/{id}/compile`
  - artifact only
  - compile current LaTeX to PDF
- `POST /documents/{id}/export`
  - artifact: `.pdf` and `.tex`
  - study: `.md` and copy-ready text

#### Provider keys

- `GET /provider-keys/me`
- `POST /provider-keys`
- `DELETE /provider-keys/{provider}`

#### Usage and billing

- `GET /usage/me`
- `POST /billing/checkout`
- `POST /billing/webhook`

All document, provider-key, usage, and billing routes must bind to the current signed session token and the authenticated student identity.

## Provider Routing

### Providers

Implement provider adapters for:

- `GeminiProvider`
- `OpenAIProvider`

Do not add Anthropic in v1.

### Routing policy

- If a BYOK credential exists for the selected provider, use BYOK first
- Otherwise use MAIT-managed credentials
- Default managed model:
  - worksheet revision: Gemini Flash-class model
  - study revision: Gemini Flash-class or GPT mini-class model
- Premium escalation:
  - compile repair
  - high-complexity rewrite
  - long-document edit

### Fallback policy

- Retry same provider once on 429 or transient upstream error
- If fallback is allowed for that task, switch provider once
- Never silently overwrite the chosen provider in the UI; surface the fallback event in revision history

### Provider response contract

Every adapter returns:

- `text_output`
- `structured_meta`
- `usage_tokens`
- `latency_ms`
- `provider`
- `model`
- `finish_reason`
- `error_type`

## Frontend Changes

### New workspace

Add:

- `frontend/src/pages/CanvasWorkspace.jsx`
- `frontend/src/components/canvas/ArtifactCanvasEditor.jsx`
- `frontend/src/components/canvas/StudyCanvasEditor.jsx`
- `frontend/src/components/canvas/RevisionTimeline.jsx`
- `frontend/src/components/canvas/ProviderSelector.jsx`
- `frontend/src/components/canvas/DocumentSaveState.jsx`
- `frontend/src/components/canvas/CompilePreviewPane.jsx`

### Shared shell behavior

The canvas shell must include:

- left editor pane
- right instruction/revision pane
- top toolbar with:
  - provider/model selector
  - save state
  - compile/run status
  - export
  - revert
- revision timeline drawer
- selection-aware “edit this section” controls

### Artifact canvas behavior

- canonical source is raw LaTeX
- support range-based selection anchor:
  - `{ type: "latex-range", start, end, label }`
- edits are applied as preview first, then optionally committed
- compile status is visible in-toolbar and in preview pane
- failed compile never overwrites last known-good compiled revision

### Study canvas behavior

- canonical source is Markdown/rich text
- support block-based selection anchor:
  - `{ type: "block", block_id, offset_start, offset_end }`
- expose actions such as:
  - simplify
  - add worked example
  - convert to scaffolded notes
  - turn into quiz
  - make more HSC-style

### Existing MAIT entry point changes

#### Worksheet Studio

In `frontend/src/WorksheetGenerator.jsx`:

- preserve current syllabus/topic/pedagogy setup
- add `Open in Canvas`
- create `artifact` document from generated prompt context and initial LaTeX seed
- retain external Gemini launch as fallback until v1 is stable

#### Tutor chat

In `frontend/src/App.jsx`:

- add `Send to Canvas` action on assistant responses
- create `study` document from the selected tutor output
- preserve current chat behavior when canvas is unused

## Revision and Prompt Strategy

### Artifact edits

Do not regenerate whole worksheets by default.

Artifact revision requests must include:

- current LaTeX snapshot
- selected range or labeled section anchor
- explicit user instruction
- a hard directive to preserve untouched content verbatim

Artifact revision pipeline:

1. Generate revision preview
2. Sanitize revised LaTeX
3. Compile dry run
4. If compile fails, run one repair pass
5. If still failing, store failed revision as failed and keep prior applied revision active

### Study edits

Revise Markdown/rich-text blocks, not arbitrary full documents.

Study revision pipeline:

1. Identify selected block(s)
2. Build targeted revision prompt
3. Apply preview response to selected blocks only
4. Record diff summary
5. Commit on accept

## Subscription and Billing

### Release order

Do not build billing first.

Billing comes after:

1. document persistence
2. revision history
3. provider router

### Plans

#### Free

- limited document count
- limited managed revisions per day
- low-tier managed models only

#### Paid

- higher monthly revision quota
- premium model routing
- longer revision retention
- export features for both canvases

#### BYOK users

- still counted for platform usage and feature gating
- may be assigned a lower platform-fee tier
- must not bypass entitlement checks for premium canvas features

### Billing implementation

Use Stripe for:

- checkout session creation
- customer portal later if needed
- webhook-driven entitlement state

Frontend gates premium actions from server-returned entitlement state only, never from local UI state.

## Security and Storage

- document content must always bind to authenticated student identity
- provider keys must never be stored in plaintext
- BYOK storage must reuse the existing client-encrypted Google Drive/AppData pattern where practical
- privacy airlock applies to student-originated tutor content before cloud revision
- worksheet documents are academic artifacts, but any imported student-specific content still passes safety checks

## Rollout

1. Add document persistence and revision timeline
2. Ship artifact canvas behind a feature flag using managed Gemini only
3. Add compile/repair and export
4. Add study canvas in the same shell
5. Add hybrid provider routing and BYOK support
6. Add Stripe entitlements and usage metering
7. Keep external Gemini as fallback until artifact canvas is stable in production

## Test Plan

### Core canvas

- create worksheet document from Worksheet Studio
- create study document from tutor output
- edit selected LaTeX section without mutating untouched content
- edit selected Markdown block without mutating unrelated blocks
- revision history restore works

### Provider routing

- managed Gemini success
- BYOK Gemini success
- managed OpenAI fallback after Gemini 429
- fallback event recorded in revision timeline

### Artifact safety

- valid compile after targeted edit
- compile failure triggers one repair pass
- irreparable compile does not replace last good revision
- export returns `.pdf` and `.tex`

### Auth and billing

- user cannot access another user’s documents
- free-tier quota blocks managed premium actions
- paid entitlement unlocks premium routing
- webhook updates entitlement state correctly

### UX acceptance

- worksheet canvas opens in one extra click
- tutor `Send to Canvas` creates editable study document
- current worksheet flow still works when canvas is not used
- current `/query` tutor flow still works when canvas is not used
