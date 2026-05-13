# TODO

## Bugs
- [ ] useEffect focus loss on topic search input in WorksheetStudio.tsx (partial fix in PR #66, root cause not fully resolved)

## Tech debt
- [ ] Replace X-Student-Id header trust with JWT auth (Google OAuth)
- [ ] Add tutor_id multi-tenancy to canvas tables
- [ ] Split DB transactions from Gemini API calls to prevent pool starvation under load

## Features
- [ ] Tutor account creation and dashboard
- [ ] Student invitation flow with tutor tethering
- [ ] Per-student AI context configuration
- [ ] Tutor activity dashboard (summary of student work between sessions)
- [ ] NSW HSC RAG corpus with pgvector
- [ ] Cerberus autonomous adversarial testing
