# Teaching Studio design candidate

Status: local review candidate, 21/10/2026. Existing application routes are unchanged. This is not a deployment or an account, purchase or AI-service integration.

## Result

A separate React entry explores a complete visual direction across a public landing page, relief-teacher working day and focused learner practice. Warm paper, dark ink, blue rules and a continuous lesson rail connect the surfaces. Browser-supported shared document transitions connect the specimen lesson, working document and practice sheet; reduced motion bypasses that transition, and unsupported browsers keep ordinary local navigation.

The candidate uses installed React and icon dependencies, system fonts and local prepared content. It requests no remote fonts, avatar, model service, analytics or other product network service. An optional mentor position starts hidden; its visible state explicitly identifies the missing final asset. The realistic asset specification and runtime research remain in `mentor-mate-2026-10-21.md`.

## Files and entry

- `mait-mvp/frontend/overhaul.html`: separate preview document.
- `mait-mvp/frontend/src/overhaul/OverhaulCandidate.jsx`: self-mounting candidate, explicit local state and interactions.
- `mait-mvp/frontend/src/overhaul/overhaul.css`: visual system, responsive layout and reduced-motion/print rules.

The existing Vite development environment can expose `/overhaul.html`. The controller's reviewed production preview uses an isolated build with `overhaul.html` as its sole input; normal application production configuration has not been changed to publish this entry. Build output and cache are temporary local artefacts, outside the source checkout. The measured candidate bundle must not be presented as a measurement of the complete existing website.

## Working behaviours

The landing specimen supports lesson selection and clearly labelled shorter/board-only examples. The day workspace supports lesson selection and reordering using buttons, explicit readiness, per-lesson notes, adaptation comparison and application, teaching mode, manually advanced instructions, a manually controlled elapsed timer and a plain-text handover download.

Applying an adjustment replaces the previous adjustment rather than combining them. The dialog compares the current plan with the proposal, identifies replacement and offers “Keep current plan”. Restoration and adaptation changes are disabled during teaching. Applying or restoring an adjustment reopens teacher review.

The timer derives elapsed seconds from a start timestamp plus accumulated paused milliseconds, rather than callback counts. Navigation, lesson selection and finishing pause it. Exiting and re-entering teaching preserves the selected instruction; changing lesson starts at its first instruction. The timer never changes instructions. Finishing moves keyboard focus to the handover note.

Practice contains a single equation with deterministic validation, inline feedback, bounded progressive hints and a reset action. It retains the checked value alongside feedback, so an edited answer is not mistaken for the previously checked answer. This does not establish a grading record, learner profile, account entitlement or curriculum alignment.

All class details are fictional. Notes and answers remain in page memory and clear on reload. The handover is generated locally as `text/plain`; it is downloaded only on request and sends nothing to a school or another person. Do not enter real learner information in this review candidate.

## Review and verification

Native direction and implementation contributions used the requested Astra and Sol routes. Separate approved cloud and interaction-design contributions informed the shared-document continuity; provider/account receipts are held locally outside this source commit. Model proposals were reviewed rather than copied wholesale. In particular, indefinite loading animation, unimplemented teacher reporting and automatic speech were not introduced.

An independent read-only source review found adaptation replacement/restoration, focus and timer issues. The controller corrected these, plus teaching-step continuity, before final browser checks.

Verification covered the isolated production build; landing example changes; per-lesson note retention; review/cancel/apply and Escape focus restoration; keyboard lesson reordering; teaching controls; elapsed timer start/pause/reset and instruction retention; focus after finishing; handover preview and actual `.txt` download with literal markup retained; invalid/incorrect/correct learner answers; bounded hints; navigation state retention; and measured narrow-screen layout. Working document text and mobile controls were enlarged after layout review.

Reduced-motion behaviour was checked in source. OS-level reduced-motion emulation, assistive-technology output, physical-phone performance, long device suspension, classroom projection and unsupported-browser transition fallback still need direct validation. The build emits a Browserslist metadata freshness warning; no dependency update or installation was performed for this candidate.

## Integration and rollback

Keep the pre-existing edits in `App.jsx`, `Navigation.jsx`, `practice.html` and `src/practice/` outside this commit. No existing learner route or progress ownership was rewritten.

Integration into the main application, real service wiring, purchase/account flows, final companion acquisition and publication require concrete follow-up scope and review. Reverting this candidate's scoped commit removes only the preview additions and this record; no live environment or data migration is involved.
