# Worksheet fixes — first implementation checkpoint

Status: implemented and tested locally on `codex/worksheet-compiler-fixes`. Not pushed, merged or deployed.

## Baseline and isolation

The original checkout was on `docs/AugState`, at the same commit as local `main`, with unrelated dirty work. It was left intact. This branch uses a separate worktree based on freshly fetched `origin/main`, `2d924e883796fa521c9024d6387f0abd9c2f5d26`. Worksheet source matched the audited checkout. The latest successful Pages workflow inspected was [run 30262000913](https://github.com/mentalmathsmentor/myaitutor/actions/runs/30262000913), with that same source SHA; the Pages configuration identified `www.myaitutor.au`. No publication action occurred.

## Changes

- F19: Math/Clear now occupy a separate row below the textarea. Long text no longer scrolls underneath those buttons. The shared input preserves token insertion into selected text and returns the caret afterwards.
- F18, bounded portion: the worksheet brief label now focuses its field; shared focus/blur callbacks are forwarded; the other MathInput caller has an accessible name. Disabled fields disable Clear and token controls, and queued caret restoration ignores detached/disabled inputs.
- F01: the copied prompt contains an explicit Subject line, including custom subjects.
- F02: Off, Provide and Search have distinct instructions in the existing `customInstructions` string. Search names the selected stage/subject and asks Gemini to consult official NESA sources, verify cohort/edition applicability and request clarification when necessary. Textbook notes remain independent. UI wording makes clear that MyAITutor itself has not fetched a syllabus.
- Prompt wording no longer labels the local packet as verified NESA alignment and allows source clarification before worksheet generation.
- Added focused component/compiler regressions and production-build browser acceptance, with all external application requests blocked and Gemini opening intercepted.

No request fields or version were added; the existing v2 shape and legacy context-source values remain. Package changes only add a browser-test script; no dependency ranges or lockfile changed. This is a bounded first patch, not completion of the full compiler refactor or backend plan.

## Verification

| Check | Result |
|---|---|
| Original frontend baseline | 32 tests passed |
| New MathInput regressions before repair | 2 failed (label/focus and disabled controls), 2 passed |
| Original browser editing regression | 3 failed (label and selection interception at both widths), 1 passed |
| New subject/context regressions before repair | 9 failed |
| Final frontend suite | 45 tests passed |
| Production build | Passed with Vite 5.4.21 |
| Production-build browser suite | 7 passed using installed Chrome, desktop and 390px narrow layout |
| Diff whitespace check | Passed |

Browser acceptance checks label focus, toolbar non-overlap, actual lower-left drag selection at top/middle/bottom scroll positions, character-by-character typing, token replacement/caret position, step return, select-all, and actual application clipboard output for Off/Provide/Search. Desktop and narrow screenshots were inspected. The first test draft used a platform-dependent Home key; its cursor setup was made deterministic before final verification. The absent Playwright-managed browser was handled by selecting installed Chrome, without downloading or upgrading dependencies.

Build warnings concern existing stale Browserslist data; Vitest reports existing Vite-plugin option deprecations. Tests used existing local dependencies, not a fresh dependency install. These checks do not certify Safari/touch behaviour, NESA content correctness or Gemini's generated output. No provider requests, database operations or student data were used.

## Remaining work

The broader audit remains open: explicit course routing, flat topics and scoped metadata, draft restoration/validation, answer/header/pedagogy settings, the first-time/setup instruction conflict, selectable preview and removal of automatic launch timers, remaining topic-search/accessibility issues, and the separately staged backend work. The complete shared v2 fixture corpus belongs to the next compiler-refactor tranche; this first patch does not claim that wider compatibility gate is complete. Previous plan reviewers have not reviewed this implementation.

Rollback is local and bounded: revert this patch on the fix branch. The original checkout, legacy storage format and public deployment have not been changed by this work.
