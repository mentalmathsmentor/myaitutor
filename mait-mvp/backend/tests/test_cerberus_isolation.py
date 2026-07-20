"""Cerberus isolation-contract tests (no network, no DB).

These pin the handoff-brief contract: input is exactly
{question_text, worked_solution, outcome_or_bloom_tag, student_level_tag};
no RAG context, student memory, or generator reasoning can reach the model
through any code path in the cerberus service.
"""

import asyncio
import os
import sys

import pytest
from pydantic import ValidationError

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.cerberus import (  # noqa: E402
    CERBERUS_SYSTEM_INSTRUCTION,
    CerberusItem,
    CerberusResult,
    CerberusSeverity,
    build_cerberus_prompt,
    verify_item,
)

CONTRACT_FIELDS = {
    "question_text",
    "worked_solution",
    "outcome_or_bloom_tag",
    "student_level_tag",
}


def _item(**overrides):
    payload = {
        "question_text": r"Solve $\sin(\theta) = 0.5$ for $0 \le \theta \le 90^\circ$.",
        "worked_solution": r"$\theta = \sin^{-1}(0.5) = 30^\circ$.",
        "outcome_or_bloom_tag": "apply",
        "student_level_tag": "Year 9 Core+Path",
    }
    payload.update(overrides)
    return CerberusItem(**payload)


def test_input_universe_is_exactly_the_four_contract_fields():
    assert set(CerberusItem.model_fields.keys()) == CONTRACT_FIELDS


def test_extra_fields_are_rejected_not_ignored():
    """A caller must not be able to smuggle RAG context or generator
    reasoning through the input model."""
    for forbidden in ("rag_chunks", "student_context", "generator_reasoning", "retrieval"):
        with pytest.raises(ValidationError):
            CerberusItem(
                question_text="q",
                worked_solution="s",
                outcome_or_bloom_tag="t",
                student_level_tag="l",
                **{forbidden: "leaked"},
            )


def test_prompt_is_pure_function_of_contract_fields():
    item = _item()
    prompt = build_cerberus_prompt(item)
    assert item.question_text in prompt
    assert item.worked_solution in prompt
    assert item.outcome_or_bloom_tag in prompt
    assert item.student_level_tag in prompt
    # Nothing else: strip out the four payloads + fixed scaffold labels and
    # verify nothing unexplained remains.
    residue = prompt
    for value in (
        item.question_text,
        item.worked_solution,
        item.outcome_or_bloom_tag,
        item.student_level_tag,
    ):
        residue = residue.replace(value, "")
    for label in ("Student level tag:", "Outcome/Bloom tag:", "QUESTION:", "WORKED SOLUTION:"):
        residue = residue.replace(label, "")
    assert residue.strip() == ""


def test_no_retrieval_or_memory_leakage_markers_in_static_prompt_surface():
    for banned in ("rag_chunks", "STUDENT CONTEXT", "Syllabus anchors", "vector_chunks"):
        assert banned not in CERBERUS_SYSTEM_INSTRUCTION
        assert banned not in build_cerberus_prompt(_item())


def test_service_module_does_not_import_retrieval_or_memory():
    """The cerberus module must stay structurally incapable of reaching the
    RAG or student-memory layers."""
    import app.services.cerberus as cerberus_module

    source = open(cerberus_module.__file__).read()
    for banned_import in ("student_memory", "syllabus_service", "services.rag", "vector_chunks"):
        assert banned_import not in source, f"cerberus imports forbidden layer: {banned_import}"


def test_no_pass_fail_gate_in_output_schema():
    fields = set(CerberusResult.model_fields.keys())
    assert fields == {"suggestions"}
    assert not fields & {"passed", "verdict", "score", "grade"}


def test_severity_enum_is_fix_warn_style():
    assert {s.value for s in CerberusSeverity} == {"fix", "warn", "style"}


def test_echo_mode_makes_no_external_call():
    os.environ["MAIT_PROMPT_ECHO"] = "1"
    try:
        result = asyncio.run(verify_item(_item()))
    finally:
        del os.environ["MAIT_PROMPT_ECHO"]
    assert isinstance(result, CerberusResult)
    assert result.suggestions[0].severity == CerberusSeverity.STYLE
