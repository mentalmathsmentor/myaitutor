# Worksheet release review

Compared the fix branch with release baseline `2d924e883796fa521c9024d6387f0abd9c2f5d26`. GitHub main still matched that baseline during this review. This is local review evidence, not publication approval.

## Standards review

A bounded read-only reviewer found no definite new correctness regression or hard repository-standard violation in the active frontend/CI changes. It checked scoped course IDs, syllabus identifier collisions, draft guards, prompt rendering, handoff lifecycle, package/lock agreement and CI wiring. The dormant `canvasConfig.topics` still contains scoped IDs rather than labels; resolve it before enabling Canvas, which remains disabled and outside this release.

No release-blocking findings on this axis. A fresh Linux dependency install and remote PR workflow have not yet been run; they remain release checks after the draft PR is authorised.

## Spec review

A separate bounded read-only reviewer found a preservation bug: the versioned draft reader checked its envelope but silently defaulted wrong-typed fields, allowing autosave to replace unread content. Six new regression cases failed before repair. The reader now rejects malformed recognised fields, falls back to recoverable legacy text, pauses saving and preserves the unread versioned record. The reviewer repeated its reproduction and confirmed the fix.

The same reviewer identified missing descriptions on the first-time and setup toggles. Both now explain that they show application guidance in the preview. The reviewer confirmed this correction. No residual concrete finding within the bounded follow-up.

## Verification

- Full frontend suite: 2,099 passed, zero failed or pending.
- Focused rebuilt Chrome/WebKit handoff suite: 22 passed, zero failed, skipped or flaky. Includes real-browser malformed-field recovery, exact unread-record retention, clipboard failure and keyboard focus.
- Prior full browser run remains 158 passing checks; only the affected handoff suite was rerun for this narrow review correction. These are distinct runs, not a claim of a single combined run.
- Production build passed as the browser-test prerequisite. No dependency or lockfile change.
- Both reviewers were read-only Codex subagents; this is same-family review, not independent cross-family verification. No external model/provider calls or publication occurred.

## Next publication boundary

The local preview is available on this Mac at `http://127.0.0.1:4175/worksheets`. It is not a public deployment. The prepared next action is to push the exact reviewed branch to the public `mentalmathsmentor/myaitutor` repository and open a draft PR against main. That requires approval of the final commit and PR text. A merge would trigger the existing Pages deployment workflow, so merging/deployment is a separate approval.

The configured Pages hostname is `www.myaitutor.au`. Backend generation, source-content certification, Firefox, physical touch and real Gemini output remain outside these results. Draft-format and downgrade limitations are recorded in the acceptance repair checkpoint.
