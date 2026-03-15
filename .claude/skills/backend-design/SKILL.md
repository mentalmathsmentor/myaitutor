---
name: backend-design
description: Design and implement FastAPI backend services for the MAIT platform. Use when adding new API endpoints, services, data models, or integrating AI/LLM providers. Ensures consistency with the existing architecture (wellness engine, Bloom's engine, RAG, SQLite storage).
---

This skill guides the design and implementation of backend services for the MAIT (MyAITutor) FastAPI application. It enforces architectural consistency, security best practices, and pedagogical constraints across all server-side code.

The user provides a feature request, endpoint to add, or service to modify. They may specify integration points (Gemini API, FAISS RAG, wellness engine, SQLite) or student-facing behaviours to implement.

## Architecture Overview

MAIT's backend follows a layered service architecture:

```
main.py (FastAPI routes)
    └── educational_agent.py  (orchestration layer)
            ├── wellness_engine.py     (fatigue gating)
            ├── blooms_engine.py       (cognitive level)
            ├── gemini_client.py       (LLM calls)
            ├── syllabus_service.py    (RAG retrieval)
            └── storage.py            (SQLite persistence)
```

Always respect this layering: routes call the agent/services, services call sub-services, never the reverse.

## Service Design Principles

### FastAPI Endpoints
- Use `async def` for all route handlers — the stack is fully async
- Validate all inputs with Pydantic models defined in `models.py`; never use raw `dict`
- Return structured Pydantic response models, not bare dicts
- Use `HTTPException` with appropriate status codes; never swallow exceptions silently
- Tag endpoints with logical groups: `students`, `content`, `auth`, `analytics`
- Add docstrings to every route — they appear in the auto-generated `/docs`

```python
@app.post("/new-endpoint", response_model=MyResponseModel, tags=["students"])
async def new_endpoint(request: MyRequestModel) -> MyResponseModel:
    """Brief description of what this endpoint does and when to use it."""
    ...
```

### Pydantic Models
- Define request and response models in `models.py`
- Use `Field(...)` for required fields with descriptions
- Use `Field(default=...)` with sensible defaults for optional fields
- Add `model_config = ConfigDict(str_strip_whitespace=True)` for text inputs
- Never expose internal fields (e.g., raw fatigue scores) in public response models

### Service Layer
- Each service is a class instantiated once at startup (singleton pattern)
- Services receive dependencies via constructor injection, not global imports
- Async methods for I/O-bound work; sync methods are acceptable for pure computation
- Wrap external API calls (Gemini, Google OAuth) in try/except with specific error types
- Log errors with `logger.error(...)` — never `print()` in production code

## Wellness & Pedagogical Constraints

**Every feature that affects student interaction must respect the wellness engine:**

```python
# Always check fatigue before processing student requests
fatigue_state = wellness_engine.get_state(student_id)
if fatigue_state == WellnessState.LOCKOUT:
    raise HTTPException(status_code=429, detail="Session locked: take a break")
```

**Bloom's level must inform response generation:**
- Inject the Bloom's teaching strategy into system prompts
- Advance the student's level when mastery signals are detected
- Never give direct answers at REMEMBER/UNDERSTAND levels — guide with hints

**Token budgets by fatigue state:**
- FRESH (0–59%): up to 1500 tokens
- WEARY (60–89%): up to 500 tokens — shorter, simpler responses
- LOCKOUT (90–100%): reject request, return rest message

## LLM Integration (Gemini)

When adding new Gemini API calls:
- Use `gemini_client.py`'s existing async client — never instantiate a new one
- Always include the system prompt with: persona + Bloom's strategy + fatigue modifier + syllabus RAG context
- Pass conversation history (trimmed to 6000 token budget) for context continuity
- Set `temperature=0.7` for tutoring; `temperature=0.2` for worksheet/structured generation
- Handle `google.api_core.exceptions.ResourceExhausted` (rate limit) with exponential backoff

## RAG Integration

```python
# Retrieve relevant syllabus context before calling Gemini
context_docs = await syllabus_service.retrieve(query=student_message, top_k=3)
rag_context = "\n\n".join([doc.content for doc in context_docs])
```

Always ground LLM responses in syllabus context for curriculum-sensitive topics.

## Storage Patterns

- Use `storage.py`'s async SQLite methods — never raw SQL strings (use parameterised queries)
- Store `student_id`, `session_id`, and `timestamp` on every record
- Conversation history: cap at last 20 turns before persisting; trim oldest first
- Never store PII beyond what's already in the auth flow (email, display name)

## Security Checklist

Before finalising any endpoint:
- [ ] Input validated with Pydantic (no raw user strings passed to SQL/shell)
- [ ] Authentication required for student-facing endpoints (`Depends(verify_token)`)
- [ ] No secrets in logs or response bodies
- [ ] Rate limiting considered (fatigue engine provides natural throttling for `/interact`)
- [ ] CORS policy unchanged unless explicitly required

## Testing New Services

For every new service:
1. Write a sync unit test for pure logic (Bloom's classification, wellness scoring)
2. Write an async integration test with a mock Gemini client for LLM-dependent paths
3. Test the unhappy path: invalid input, API timeout, LOCKOUT state

```python
# Example test pattern
async def test_new_service_lockout():
    wellness_engine.set_state(STUDENT_ID, WellnessState.LOCKOUT)
    response = await client.post("/new-endpoint", json=valid_payload)
    assert response.status_code == 429
```
