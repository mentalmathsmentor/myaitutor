# MyAITutor classroom pilot and teacher build sequence

Status: local plan and verified code checkpoint, not a live release. Owner priority confirmed on 30/09/2026: a teacher workflow that can be tried with students now, including the worksheet loop.

## Classroom loop to try now

1. In the worksheet maker, choose the actual year, subject and topic; add a class-level brief without names, student work or identifiable details.
2. Preview the complete prompt. Copy it, open the chosen AI, **paste** it into the message box and send it. The app does not transmit the prompt or receive the generated worksheet automatically.
3. Check every question, worked solution, curriculum claim and answer. Make a separate student copy without the answer key and keep the teacher copy private. Print or export from the AI's output only after review.
4. Use the worksheet in one lesson. Record only aggregate observations outside MyAITutor for now: prep time, errors corrected before use, questions students stalled on, approximate completion, and the revision wanted next time. Do not put student names or responses in the prompt or local draft.
5. Reopen the saved browser draft, adjust the request and repeat. A successful classroom trial means the material was checked and actually used; a passing prompt test alone does not establish worksheet quality.

This is a manual pilot. The current free worksheet product creates a prompt and preserves its browser draft; it is not a native generator, a resource library, a markbook or a secure teacher account. The public deployment and external AI output have not been verified in this checkpoint. The pilot can begin in a verified local preview; publishing this branch requires a separate release review and approval.

## Build order

### 1. Make the existing loop reliable

- Complete and review the current worksheet and junior maths catalogue changes already in this worktree. Preserve the unrelated dirty files during any staging.
- Add a clear source/attachment checklist. Prompt download is now implemented locally; its file content is checked against the preview in a browser test.
- Test at least one realistic generated worksheet for mathematical accuracy, topic fit, answer quality, print layout and a student-safe version. Treat model output as draft material until teacher review.
- Fix draft conflict recovery so a second tab cannot silently replace the first; provide an explicit export when local saving fails.

Acceptance: a teacher can configure, preview, copy/download, produce, review, print and revise one worksheet without losing the request. Synthetic browser tests cover failure paths; a real-output review is recorded separately.

### 2. Save the lesson artifact and feedback

- Create a local-only teacher resource record linking the request, reviewed worksheet file/reference, answer policy, source references, revision and anonymous trial notes. Show storage scope and export/recovery plainly.
- Support save, reopen, duplicate, revise and archive. Keep original and revision distinct; allow a fresh class-level reflection to drive the next request.
- Keep the teacher home focused on `Continue preparing`, `Create worksheet` and `My resources` rather than an empty chat or invented analytics.

Acceptance: create → review → save → reopen → teach → record aggregate feedback → duplicate/revise works after reload and across two tabs without silent loss. The student handout never includes teacher answers by accident.

### 3. Make the teacher workspace account-safe

- Replace the shared development tutor identity with a verified session-to-teacher identity. Test unauthenticated, expired and cross-teacher class/thread access with synthetic accounts and an isolated database.
- Remove access-code value logging. Make API failure, empty account, demo data and successful saved data visibly different. The class-load failure fix in this checkpoint is the first narrow part of this work.
- Resolve the teacher route/navigation and API base contract, then connect account-scoped resources to the workspace. Any schema or live-data change gets its own exact review and approval.

Acceptance: Teacher A cannot access Teacher B's resources, and a failed request cannot masquerade as a created cohort or generated worksheet. Only after this gate should `/teach` accept real teacher or student records.

### 4. Native, syllabus-synced product

- Use the shared worksheet request contract, original topic summaries and source references. Verify edition, cohort and outcome coverage before claiming alignment.
- Add metered generation with quotas, cancellation, retries, provenance, teacher review and student/teacher export separation. No silent conversion of the free handoff into a paid call.
- Pilot student assignment, response collection and progress views only after identity, consent/privacy, retention and access controls are designed and tested.

## Current checkpoint

- Branch: `codex/worksheet-compiler-fixes`; unrelated worksheet/curriculum edits remain uncommitted and are not part of this class-load fix.
- Fixed locally: a class-load error or malformed response no longer opens the new-cohort wizard; retry is available and existing in-memory cohort state remains intact.
- Added locally: `Download prompt` in the handoff, with a browser check that its UTF-8 file matches the preview even without clipboard access.
- Frontend unit/component suite and production build pass. Worksheet handoff and prompt-download browser checks pass using installed Chrome. Bundled Playwright Chromium is missing on this host, so its launch failures are not product failures.
- Not verified: actual external-AI worksheet quality, public deployment, teacher identity isolation or safe collection of real student data.
