"""Phase 4 mock-session smoke — the Done-line gate, timed.

Drives the FULL loop over HTTP against a running backend:
  pick S1 -> open session -> generate with memory context -> corpus gate ->
  Cerberus inline (incl. a planted-wrong item so a real `fix` increments
  sessions.cerberus_catch_count) -> misconception-leak scan -> deck-export ->
  compile via /canvas/compile -> save PDF -> check-in -> verify session row.

Run modes:
  REAL (ship gate):  backend on the real Neon DB with a real GEMINI_API_KEY.
      python scripts/mock_session_smoke.py --base-url http://127.0.0.1:8000
  ECHO (mechanics only): backend started with MAIT_PROMPT_ECHO=1. Skips the
      corpus and Cerberus-catch gates (no model calls happen).
      python scripts/mock_session_smoke.py --echo

Exit codes: 0 = Done line met; 2 = a ship-blocking gate failed.
"""

from __future__ import annotations

import argparse
import re
import sys
import time

import httpx

FALLBACK_ANCHOR = "No exact topic chunks were retrieved"
DONE_LINE_SECONDS = 600
# Meta-commentary that must never reach the exported worksheet (fix #2).
LEAK_PATTERNS = [
    re.compile(r"misconception", re.IGNORECASE),
    re.compile(r"targets? your", re.IGNORECASE),
    re.compile(r"your (common |usual |past )?(error|mistake|weakness)", re.IGNORECASE),
    re.compile(r"student context", re.IGNORECASE),
    re.compile(r"\bS[0-9]+\b"),  # alias slugs must not surface
]

PLANTED_WRONG_ITEM = {
    "question_log_id": None,
    "question_text": "Calculate $2 + 2$.",
    "worked_solution": "$2 + 2 = 5$.",
    "outcome_or_bloom_tag": "recall",
    "student_level_tag": "Year 9 Core",
}


class Gate(Exception):
    pass


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--echo", action="store_true", help="mechanics-only run against MAIT_PROMPT_ECHO=1 backend")
    parser.add_argument("--topic", default=None, help="override topic (default: first corpus topic for the subject)")
    parser.add_argument("--pdf-out", default="mock_session_smoke.pdf")
    args = parser.parse_args()

    timings: list[tuple[str, float]] = []
    t_total = time.monotonic()

    def step(name: str):
        class _Timer:
            def __enter__(self):
                self.start = time.monotonic()
                print(f"→ {name} ...", flush=True)
                return self

            def __exit__(self, exc_type, exc, tb):
                elapsed = time.monotonic() - self.start
                timings.append((name, elapsed))
                if exc_type is None:
                    print(f"  ✓ {name} ({elapsed:.1f}s)")

        return _Timer()

    client = httpx.Client(base_url=args.base_url, timeout=180.0)

    try:
        with step("pick student S1"):
            students = client.get("/api/students").json()["students"]
            s1 = next((s for s in students if s["name"] == "S1"), None)
            if s1 is None:
                s1 = client.post(
                    "/api/students/init",
                    json={
                        "name": "S1",
                        "subject": "Stage 5 Mathematics",
                        "year_level": 9,
                        "profile": {"ability_tier": "Core+Path"},
                    },
                ).json()["student"]

        with step("open session"):
            session = client.post(f"/api/students/{s1['id']}/session").json()["session"]
            session_id = session["id"]
            catch_before = session["cerberus_catch_count"]

        with step("generate question set (memory context injected)"):
            topic = args.topic
            if topic is None:
                topics = client.get("/api/topics", params={"subject": s1["subject"]}).json()["topics"]
                topic = topics[0] if topics else "Trigonometry"
            gen = client.post(
                "/api/chat/generate",
                json={
                    "student_id": s1["id"],
                    "session_id": session_id,
                    "intent": "practice_set",
                    "topic": topic,
                },
            )
            if gen.status_code != 200:
                raise Gate(f"generate failed: HTTP {gen.status_code}: {gen.text[:300]}")
            payload = gen.json()
            question_items = [
                q
                for part in payload["parts"]
                if part.get("type") == "question_set"
                for q in (part.get("questions") or [])
            ]
            if not question_items:
                raise Gate("generator returned no question items")

        with step("corpus gate: real syllabus chunks retrieved"):
            citations = payload.get("retrieval_citations") or []
            if args.echo:
                print("  (echo mode: corpus gate SKIPPED — no retrieval performed)")
            elif not citations:
                raise Gate(
                    "SHIP BLOCKER: no vector_chunks retrieved — the syllabus-anchor "
                    "fallback would be in the prompt. Corpus ingestion is broken "
                    f"for subject={s1['subject']!r} topic={topic!r}."
                )
            else:
                print(f"  retrieved {len(citations)} chunks, e.g. {citations[0].get('content_code')}")

        with step("misconception-leak scan on question text"):
            leaks = []
            for q in question_items:
                text = f"{q.get('question_latex', '')}\n{q.get('teacher_answer_latex', '')}"
                for pattern in LEAK_PATTERNS:
                    if pattern.search(text):
                        leaks.append((pattern.pattern, text[:80]))
            if leaks and not args.echo:
                raise Gate(f"SHIP BLOCKER: meta-commentary leaked into worksheet output: {leaks[:3]}")
            if leaks:
                print(f"  (echo mode: leak patterns matched {leaks} — verify on real run)")
            print("  MANUAL GATE: eyeball the exported PDF — no 'this targets your ...' phrasing.")

        with step("Cerberus verify (incl. planted wrong solution)"):
            question_ids = payload.get("question_ids") or []
            items = [
                {
                    "question_log_id": question_ids[i] if i < len(question_ids) else None,
                    "question_text": q["question_latex"],
                    "worked_solution": q.get("teacher_answer_latex") or "(none provided)",
                    "outcome_or_bloom_tag": "apply",
                    "student_level_tag": f"Year {s1['year_level']} {s1['profile'].get('ability_tier', 'Core')}",
                }
                for i, q in enumerate(question_items)
            ] + [PLANTED_WRONG_ITEM]
            verify = client.post(
                "/api/cerberus/verify",
                json={"session_id": session_id, "items": items},
            )
            if verify.status_code != 200:
                raise Gate(f"cerberus verify failed: {verify.status_code}: {verify.text[:300]}")
            catch_count = verify.json()["catch_count"]
            if args.echo:
                print("  (echo mode: catch gate SKIPPED — echo returns style-only)")
            elif catch_count < 1:
                raise Gate(
                    "SHIP BLOCKER: planted wrong solution (2+2=5) produced no `fix` "
                    "suggestion — Cerberus is not catching real errors."
                )
            else:
                print(f"  catch_count={catch_count} (planted error caught)")

        with step("deck-export -> Canvas elements"):
            export = client.post(f"/api/sessions/{session_id}/deck-export")
            if export.status_code != 200:
                raise Gate(f"deck-export failed: {export.status_code}: {export.text[:300]}")
            elements = export.json()["elements"]
            latex_source = "\n\n".join(element["content_latex"] for element in elements)

        with step("compile LaTeX -> PDF (existing /canvas/compile)"):
            compile_resp = client.post("/canvas/compile", json={"latex_source": latex_source})
            if compile_resp.status_code != 200 or not compile_resp.json().get("success"):
                raise Gate(f"compile failed: {compile_resp.status_code}: {compile_resp.text[:300]}")
            pdf_data_url = compile_resp.json()["pdfUrl"]
            import base64

            pdf_bytes = base64.b64decode(pdf_data_url.split(",", 1)[1])
            with open(args.pdf_out, "wb") as fh:
                fh.write(pdf_bytes)
            if len(pdf_bytes) < 5000:
                raise Gate(f"suspiciously small PDF ({len(pdf_bytes)} bytes)")
            print(f"  PDF saved: {args.pdf_out} ({len(pdf_bytes) // 1024} KB)")

        with step("post-session check-in (three fields)"):
            checkin = client.post(
                f"/api/sessions/{session_id}/checkin",
                json={
                    "context_relevance": 4,
                    "cerberus_usefulness": 4,
                    "friction_note": "mock session — smoke run",
                    "dump": "Mock session complete. Deck exported and compiled.",
                },
            )
            if checkin.status_code != 200:
                raise Gate(f"check-in failed: {checkin.status_code}: {checkin.text[:300]}")

        with step("verify session row"):
            final = client.get(f"/api/sessions/{session_id}").json()["session"]
            problems = []
            if final["status"] != "completed":
                problems.append(f"status={final['status']}")
            if final["context_relevance"] != 4 or final["cerberus_usefulness"] != 4:
                problems.append("check-in scores not written")
            if final["questions_generated"] < len(question_items):
                problems.append(f"questions_generated={final['questions_generated']}")
            if not args.echo and final["cerberus_catch_count"] <= catch_before:
                problems.append("cerberus_catch_count did not increment")
            if not (final.get("deck") or {}).get("exported_to_canvas"):
                problems.append("export event missing from session row")
            if problems:
                raise Gate(f"session-row verification failed: {problems}")
            print(
                f"  session row OK: generated={final['questions_generated']} "
                f"catches={final['cerberus_catch_count']} checkin=4/4"
            )

    except Gate as gate:
        print(f"\n✗ GATE FAILED: {gate}")
        return 2
    finally:
        total = time.monotonic() - t_total
        print("\n=== Mock-session timing ===")
        for name, elapsed in timings:
            print(f"  {elapsed:7.1f}s  {name}")
        print(f"  {total:7.1f}s  TOTAL (Done line: < {DONE_LINE_SECONDS}s)")
        if timings:
            verdict = "DONE LINE MET" if total < DONE_LINE_SECONDS else "OVER THE DONE LINE"
            print(f"  → {verdict}{' (echo mode — rerun with real creds for the ship gate)' if args.echo else ''}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
