"""Prompt-contract pins (Darra fix #2 + canon §6).

The misconception leak guard is a prompt-level instruction; these tests pin
its presence and the template placeholder contract so a prompt edit can't
silently drop them. The behavioural check (no meta-commentary in real model
output) is a manual gate in the Phase 4 mock-session smoke.
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.prompts import INTENT_TEMPLATES, SYSTEM_INSTRUCTION_CORE  # noqa: E402


def test_all_intent_templates_carry_student_context_placeholder():
    for intent, template in INTENT_TEMPLATES.items():
        assert "{student_context}" in template, f"{intent} template lost {{student_context}}"
        assert "{rag_chunks}" in template


def test_templates_format_with_full_placeholder_set():
    for template in INTENT_TEMPLATES.values():
        rendered = template.format(
            rag_chunks="CHUNKS",
            year_level=9,
            subject="Stage 5 Mathematics",
            ability_tier="Core",
            student_context="[STUDENT CONTEXT]x[END STUDENT CONTEXT]",
            refinements="",
        )
        assert "CHUNKS" in rendered


def test_misconception_leak_guard_is_pinned():
    """Misconceptions shape question DESIGN; no meta-commentary may reach
    output. If this instruction is reworded, keep the semantics and update
    this pin deliberately."""
    core = SYSTEM_INSTRUCTION_CORE
    assert "Misconceptions shape question DESIGN ONLY" in core
    assert "NEVER mention the misconception" in core
    assert "no meta-commentary" in core
    assert "as if no student profile exists" in core


def test_no_reteach_mastered_rule_is_pinned():
    assert "NEVER re-teach topics marked mastered" in SYSTEM_INSTRUCTION_CORE
