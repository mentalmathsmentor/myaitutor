# Worksheet acceptance repairs

Status: implemented locally on `codex/worksheet-compiler-fixes`; publication is not authorised or performed. This repairs the frontend failures recorded in the configuration audit. The separate backend/document-generation deliverable remains unmodified.

## Behaviour repaired

- Course lookup is explicit. Stage 4/5 maths includes both local year groups, labelled by year. Science/HSIE use their own flat lists. Year 12 Standard uses its flat list. Year 11 Physics is manual-only because this repository lacks a matching dataset. Senior extension prerequisites remain explicitly labelled.
- Flat and hierarchical topics share normalised records with course-scoped identifiers. Selecting a visible topic reaches the compiled packet; changing course clears incompatible selections. Restored legacy labels/IDs are accepted only when they resolve uniquely within the selected course.
- Per-topic include/exclude/style guidance is scoped to that topic. Selecting the Power Rule and Chain Rule together no longer turns the former's exclusion into a worksheet-wide ban. Unresolved selections cannot suppress a valid manual brief. Malformed labels cannot leak objects into prompt arrays.
- School/class heading, student Name and Date are independent. Worked solutions enable the answer key; disabling the answer key also disables worked solutions. Positive and negative marks, answers and watermark choices reach the prompt. Each pedagogy tool expands to its promised instruction, including the one-mark spot-error rule.
- First-time and Canvas help appear in the application instead of asking the model for a greeting that conflicts with worksheet output. Manual text and guidance-only packets both survive rendering.
- Generating instructions opens a selectable exact preview. Copy and Open Gemini are separate actions. There is no automatic launch timer or global Enter-to-launch behaviour. Clipboard failure leaves the preview available for manual copying. A late clipboard result cannot mark a newer preview as copied.
- The preview dialog has labelled controls, focus containment, Escape/close handling and focus return. Fallback copying selects the preview inside the dialog rather than fighting its focus trap. Module-title search retains its child topics; stage/subject/context choices expose their selected state.
- Browser-storage failures cannot prevent the worksheet from loading. The anonymous-ID startup reader and shared UI-store initialisation are guarded because they previously crashed before the worksheet's own recovery code could run. Authentication requests, permissions and account actions are unchanged.

## Draft format and rollback

This is a local frontend draft-format change, not a live data migration. No existing browser profile or production database was edited during testing.

| Storage | Read behaviour | Write behaviour |
|---|---|---|
| Existing `mait_ws_*` individual keys | Fallback when no recognised new draft is available; validate types, course, enum values, counts and selections | Preserved byte-for-byte; no deletion or overwriting by the new worksheet writer |
| `mait_ws_draft_v2` | Version 2 object containing `courseKey` and `values`; validate records before restoring | Saves the current course/custom name, scoped selections, brief and ordinary worksheet options |
| Syllabus context/upload declarations | Always Off/false at the start of a session | Not persisted; the interface explains the reset |
| School/class heading | Starts blank | Not persisted |

Malformed legacy selections recover with a visible notice and retained valid brief. An unknown/malformed newer draft, or denied read access, pauses automatic saving so unread content cannot be overwritten. Quota/write failure leaves in-memory editing and copying available with a notice. New drafts include worked-solutions and first-time options consistently.

Rollback is a local revert of this repair, followed by the separately authorised release process if a deployment ever occurs. An older build can read its unchanged legacy keys, but cannot read newer edits held only in `mait_ws_draft_v2` or reliably represent custom subjects. The new key remains available after rollback for re-upgrade recovery. Edits made in an older build will not automatically merge with the newer draft on re-upgrade. Copy current text/preview before downgrading; do not describe rollback as lossless or clear browser storage.

## Verification and interpretation

Verified: **2,093 frontend tests passed**, including all **83 acceptance-audit cases** (the original 80 plus three new regressions). The complete Chrome/WebKit run passed **158 browser cases**, with no skips, failures or flaky results. The final read-denial preservation guard was then retested against a rebuilt bundle in both engines: **2 passed**. Whitespace checks passed. Narrow-screen preview screenshots were inspected.

Final machine-readable results and source hashes are retained in `2026-09-17_worksheet_repair_evidence.json`. The former 80-case audit is part of the default frontend suite now; additional state-race and storage regressions extend it. No assertion is marked skipped or expected-to-fail to obtain a green result.

Intentional assertion updates match the reviewed behaviour: Year 11 Physics expects manual entry; preview and copy are separate actions; no automatic launch is expected; metadata is topic-scoped; watermark is explicit; setup/greeting guidance stays outside the model payload. Existing subject/context, text editing and configuration assertions remain active.

New coverage exercises every normalised catalogue point individually and all points together per course, course identity and junior-year inclusion, every output-flag combination, every pedagogy subset's actual instruction text, draft corruption/denial/quota behaviour, custom subject reload, stale and cross-course selections, clipboard API denial/absence/fallback, exact preview/copy equality, delayed clipboard completion, dialog focus, and narrow layouts. Chrome and WebKit use synthetic inputs, blocked external application requests and intercepted clipboard/Gemini actions.

The production build is checked through Playwright's build/preview prerequisite. Local tests use the existing frontend dependency installation. No package range or lockfile was changed. PR checks and the deployment workflow now require the default test suite; the PR workflow also runs Chromium browser acceptance. Those CI changes are staged code, not proof of a remote workflow run.

## Limits

Firefox could not launch in the preceding verification environment and was not counted as passing. Playwright WebKit does not certify installed Safari, physical touch devices, IME composition or assistive technologies. Existing local syllabus content is not certified NESA alignment. No real Gemini output, authenticated workflow, provider call, database or backend PDF/Canvas generation was exercised. The wire format remains version 2 with unchanged top-level fields; a complete shared frontend/backend fixture corpus and backend semantic parity remain part of the separate backend work. No claim is made that all possible bugs are absent.
