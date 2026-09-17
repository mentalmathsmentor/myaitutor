# Worksheet configuration verification

Application under test: `e19ca12` on `codex/worksheet-compiler-fixes`. This follow-up adds tests and browser configuration only; no further application changes, dependency upgrades, push or deployment.

The repaired subject/context and text-input behaviour passes the expanded checks. The whole worksheet workflow does **not** pass its broader acceptance audit. “All possible meaningful configurations” is bounded below by finite UI choices and targeted interactions; this is not an exhaustive Cartesian product of arbitrary text, browser versions, stored data and topic combinations.

## Verified results

| Suite | Result | Scope |
|---|---|---|
| Frontend regression suite | 1,694 passed; no failures or pending tests | Components, builder and renderer |
| Chrome browser cases | 69 unique cases passed across matrix and final input runs | Production build, actual controls and captured clipboard |
| Playwright WebKit browser cases | 69 unique cases passed after correcting the drag coordinates | Same production build and configuration matrix |
| Open acceptance audit | 38 passed, 42 failed, none pending | 80 ordinary assertions for the remaining reviewed plan |
| Firefox | Unverified | Browser failed to launch before application testing; repeated launch attempts stopped |

Counts and receipt hashes are retained in [configuration evidence](2026-09-17_worksheet_configuration_evidence.json). Browser totals are deduplicated by project/file/test title, with the latest result taking precedence; they are not a claim of a single 138-test run. The production build succeeds as the browser test prerequisite.

## Coverage boundaries

| Dimension | Exercised configurations | Assertions and limits |
|---|---|---|
| Stage and subject | All 8 stages, 40 built-in course pairs and a custom subject at each stage | Explicit stage/subject in copied output; does not certify course routing or syllabus accuracy |
| Context and resources | All 48 course choices × Off/Provide/Search × resources on/off: 288 UI configurations per tested engine | Exactly selected context, selected course in source instructions, independent resource note |
| First-time and setup toggles | Full subject/context/resource matrix crossed with both binary toggles | 1,152 compiler cases verify subject/context preservation; the unfinished greeting semantics remain in the failing audit |
| Structured/manual input | Representative real record from each of 13 hierarchical datasets, all context modes, with/without manual text | 78 compiler cases verify preservation; flat lists, stale selections and wrong routing are separately audited |
| Pedagogy | Every subset of the 6 flags, crossed with context modes and question counts 1/100 | 192 cases verify context and count survive; full pedagogy meaning is not certified |
| Output layout | All 5 offered difficulties × 5 layouts × counts 1/50/100 | 75 cases verify exact settings survive into copied text |
| Maths editing | All 24 keys × 6 caret/selection states | 144 token cases, plus paste/newline, disabled/detached focus restoration, multiple inputs and keyboard toggling |
| Browser editing | Label focus, typing, replacement, step return, select-all; top/middle/bottom textarea scrolling; 320/390/768/1280/1440px layouts across relevant tests | Real mouse selection, keyboard navigation, open maths keyboard, programmatic textarea resize and Clear/refocus; not physical touch or native resize-handle certification |
| State transitions | Every direct context-mode switch; reload with source declarations reset | Actual browser clipboard checks; deeper course/draft/malformed storage cases remain in the acceptance audit |
| Remaining semantics | Answer/worked combinations, heading independence, negative options, topic metadata, custom subjects, malformed storage, launch timers, search and dialog semantics | Failing assertions are retained openly rather than skipped or inverted |

## Cross-browser investigation

The initial WebKit run passed 67 cases and failed the two lower-edge drag cases. Their final, fully scrolled gesture landed in the padding beneath the last line: WebKit collapsed that selection to end-of-text. The test now derives its position from computed border, padding and line height, keeping the drag in the bottom visible line. All three scroll positions still require non-empty selection and focus, and toolbar non-overlap remains mandatory. The final Chrome/WebKit input run passed all 28 cases. Gesture coordinates and selected text are attached to browser results. No product change was needed for this test-coordinate correction.

Firefox launch timed out with local macOS sandbox-extension/graphics errors before a page could open. Its interrupted run is retained in the evidence as unverified, not converted into passing application tests. WebKit testing does not certify the installed Safari application or mobile devices.

## Running and maintaining the suites

The existing `test` script runs green regression tests under `src`. `test:e2e` runs the production-build browser suite; the Playwright configuration supports installed Chrome through `PLAYWRIGHT_CHANNEL=chrome`, and optional WebKit/Firefox projects through `PLAYWRIGHT_CROSS_BROWSER=1`. Compatible browser binaries must be available. This verification used temporary Playwright browser downloads outside the repository and the existing local frontend dependencies.

The new `test:audit` script runs `audit/` separately. It intentionally exits nonzero until the remaining repairs land. A green default test run alone is **not** release acceptance. Do not skip failing audit assertions or use expected-failure inversion to create a green release signal. Correct or promote each assertion when its repair is implemented. These failures represent overlapping configurations, not 42 independent bugs.

All browser tests use synthetic text, intercept external application requests, and capture clipboard/window-opening calls. They do not evaluate Gemini, retrieve NESA content, test a real account, use student data or exercise the backend. Physical touch, IME composition, assistive technology, actual clipboard permission denial, arbitrary topic combinations and the full shared frontend/backend v2 fixture corpus remain outside this completed verification. Add targeted cases as those paths are repaired; no finite test run can prove the absence of all bugs.

## Next repair order

Continue the reviewed plan: establish the full v2 fixture contract; fix explicit course routing and flat/scoped topic metadata; repair restored-draft validation and custom subjects; repair answer/header/pedagogy semantics; then preview/launch and remaining search/accessibility behaviour. The separate backend deliverable remains staged. Keep the current patch isolated until the relevant acceptance gates pass and publication is approved.

Rollback for this verification change is a local revert of the test/documentation commit. The original checkout and public site are unaffected.
