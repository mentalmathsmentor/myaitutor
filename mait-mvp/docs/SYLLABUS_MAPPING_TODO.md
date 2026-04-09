# Implementation Backlog

## Top Priority — Quick Wins

- [ ] **Send Feedback / Contact form** — Add a "Send Feedback" or "Help / Contact" form in two places: (1) inside the worksheet generator (e.g. sidebar or below the generate button), and (2) in the site-wide footer. Should be a simple contact form (name, email, message) or mailto link. High value for collecting teacher input early.
- [ ] **Send Feedback button (quick)** — As a quick-win interim, add a simple mailto link or feedback button before building the full form.

---

# Syllabus Dot-Point Mapping — Future Work

This file tracks which subjects have their syllabus dot-points mapped in `syllabus_data.json` and `syllabus_registry.json`, enabling the structured dot-point selection UI in the worksheet generator.

## Current Status

| Stage | Subject | Status |
|-------|---------|--------|
| Years 7-10 | Mathematics | ✅ Mapped |
| Year 11-12 | Maths Advanced | ✅ Mapped |
| Year 11-12 | Maths Extension 1 | ✅ Mapped |
| Year 12 | Maths Extension 2 | ✅ Mapped |
| Year 11-12 | Maths Standard | ✅ Mapped |
| Years 7-10 | English | ❌ Manual only |
| Years 7-10 | Science | ❌ Manual only |
| Years 7-10 | HSIE | ❌ Manual only |
| Year 11-12 | Physics | ❌ Manual only |
| Year 11-12 | Chemistry | ❌ Manual only |
| Year 11-12 | Biology | ❌ Manual only |
| Year 11-12 | Engineering Studies | ❌ Manual only |
| Early Stage - Stage 3 | All subjects | ❌ Manual only |

## Priority Order for Mapping

1. **Physics (Year 11-12)** — High demand, well-structured NESA syllabus
2. **Chemistry (Year 11-12)** — Similar structure to Physics
3. **Biology (Year 11-12)** — Completes the senior science trio
4. **Science (Years 7-10)** — Stage 4/5 science syllabus
5. **English (all years)** — Complex syllabus structure, may need different approach
6. **Primary (K-6)** — Requires NSW curriculum mapping for all KLAs

## What Each Mapping Requires

1. Obtain the official NESA syllabus PDF for the subject
2. Extract all dot-points with stable IDs (e.g., `y_11_physics_mechanics_forces`)
3. Create outcome mappings (syllabus outcome codes → dot-point groups)
4. Populate entries in `frontend/src/syllabus_data.json` (hierarchical structure: modules → subtopics → points)
5. Populate metadata in `frontend/src/syllabus_registry.json` (outcomes, include/exclude, assessment emphasis, question style notes)
6. Update `frontend/src/stage_subjects.json` if new subjects need to be added
7. Test the dot-point selection UI with the new data

## Notes

- Subjects without mapping fall back to manual-entry only in the worksheet generator
- The unified topic mode (introduced Apr 2026) always shows a manual text box alongside syllabus checkboxes, so teachers can add notes even for mapped subjects
- `MANUAL_ONLY_SUBJECTS` set in `WorksheetGenerator.jsx` controls which subjects skip the syllabus tree entirely
