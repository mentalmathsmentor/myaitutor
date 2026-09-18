# Worksheet review follow-ups — 18/09/2026

Review target: `f3545828e7b9b7f01abf57af19ab00a09b626e16`, following the worksheet subject, syllabus-context, focus, course-routing and prompt-handoff repairs. Eight Claude Code source-review lanes returned reports: four Opus and four Sonnet, including approved task-only Digital Darra and Darra-Pilled perspectives. No personal canon was supplied, and workers had no tools or write permissions.

The reports were checked against source and deterministic tests. They are static reviews, several with partial evidence, not eight independent browser tests. The follow-up changes below were implemented by the controller after the reviewed snapshot.

## Changes

- Validate the v2 draft's course-key metadata before accepting it. Malformed or absent keys now pause saving and preserve the original record instead of clearing topic selections and overwriting it.
- Keep the slider and typed question count consistent across the supported 1–100 range.
- Scope subtopic expansion to its module; repeated names such as Engineering Studies' `Misc` now expand independently. Match the module chevron to search-implied expansion.
- Mark the unused legacy topic component clearly, and correct the stale audit-test comment. Acceptance tests remain included in the default blocking suite.
- Strengthen copied-prompt tests for real course-scoped topics, registry metadata, source-mode honesty and worked-answer rubrics. Add hierarchical maths selection/reload/browser coverage.
- Initialise corrupted-storage browser fixtures before the application mounts, eliminating an initial-autosave race in the test setup without weakening preservation assertions.

## Evidence and review resolution

The malformed-metadata regression first produced nine failures, then passed. The two control regressions first failed at slider value 50 versus 80 and coupled subtopic expansion, then passed. The final full frontend run passed 2,210 tests. Chrome passed all 84 browser cases. The initial WebKit run passed 83 with one timeout; the entire unchanged WebKit suite then passed all 84 without retries or increased timeouts. The initial timeout cause remains unconfirmed. Full results and source hashes are in the accompanying verification receipt.

The high-priority topic-identity claim in the Darra-Pilled report was disproved: every current course normalises records to truthy scoped IDs, so the compared identity expressions agree. Every current source ID also restores correctly. Ambiguous legacy selections intentionally remain unselected with a notice; arbitrarily selecting the first match was rejected. Several other review claims came from missing files or were withdrawn within the reports themselves.

The full local reconciliation, unedited reports, sessions, screened requests and route receipts are retained in the controller workspace's `artifacts/claude-reviews/2026-09-17_myaitutor-deep-review/recovery-v2/` directory. Review-execution success does not promote a partial review to complete coverage.

## Remaining suggestions and limits

1. Add cross-tab draft conflict detection and a deliberate in-app recovery/export action for paused saving. Independent tabs currently use whole-draft last-writer-wins storage; this was reproduced with the storage functions. Use one worksheet tab for manual acceptance.
2. Align the deployment workflow with PR checks (`npm ci` and production-build browser checks), and verify clean Linux installation before publication. No remote CI or deployment was performed here.
3. Manually assess one realistic copied prompt in Gemini. The app inserts NESA-search instructions; it does not retrieve or verify syllabus sources. Prompt readability, actual generated output and syllabus applicability remain outside local string-test certification.

Firefox, installed Safari, physical touch, IME and assistive technology remain uncertified. Dormant Canvas and backend/PDF paths were not enabled or redesigned. No dependency versions were changed. The initial reviewer runner exhausted its bounded requests on automatic output continuations and was stopped; all recovery executions completed with their requested models and no worker tools. Paid extra usage was disabled at dispatch; a later usage read was unavailable after authentication expired.

These are local branch changes ready for manual acceptance after verification. Push, PR publication, merge and deployment remain separate actions. Rollback is a revert of the bounded follow-up commit; no storage migration or deletion is needed.
