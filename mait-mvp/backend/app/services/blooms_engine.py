"""
Bloom's Taxonomy Adaptive Progression Engine.

Assesses student cognitive level from their queries, tracks mastery,
and provides teaching strategy instructions for the Gemini system prompt.
"""
import re
from app.models import BloomsLevel, StudentContext


# Ordered list for level progression (lowest to highest)
BLOOMS_ORDER = [
    BloomsLevel.REMEMBER,
    BloomsLevel.UNDERSTAND,
    BloomsLevel.APPLY,
    BloomsLevel.ANALYZE,
    BloomsLevel.EVALUATE,
    BloomsLevel.CREATE,
]

# Keyword/pattern sets for each cognitive level (checked from highest to lowest)
_LEVEL_PATTERNS: list[tuple[BloomsLevel, list[str]]] = [
    (BloomsLevel.CREATE, [
        r"\bdesign\b", r"\bcreate\b", r"\binvent\b", r"\bcompose\b",
        r"\bconstruct\b", r"\bdevelop\b", r"\bformulate\b", r"\bpropose\b",
        r"\bderive\b", r"\bprove\b", r"\bbuild\b", r"\bwrite your own\b",
        r"\bcome up with\b", r"\bgenerate\b", r"\boriginal\b",
    ]),
    (BloomsLevel.EVALUATE, [
        r"\bevaluate\b", r"\bjudge\b", r"\bjustify\b", r"\bcritique\b",
        r"\bwhich is better\b", r"\bwhich is best\b", r"\bis this correct\b",
        r"\bis this right\b", r"\bdo you agree\b", r"\bdefend\b",
        r"\bassess\b", r"\brate\b", r"\brank\b", r"\bprioritize\b",
        r"\bvalid\b", r"\bworth\b", r"\brecommend\b",
    ]),
    (BloomsLevel.ANALYZE, [
        r"\bcompare\b", r"\bcontrast\b", r"\bdistinguish\b",
        r"\bwhat would happen if\b", r"\bwhat happens when\b",
        r"\brelationship between\b", r"\bdifference between\b",
        r"\bbreak down\b", r"\bclassify\b", r"\bcategorize\b",
        r"\banalyze\b", r"\banalyse\b", r"\bexamine\b",
        r"\bwhy does\b", r"\bwhy do\b", r"\bhow does .+ relate\b",
        r"\bidentify the\b", r"\bdifferentiate\b",
    ]),
    (BloomsLevel.APPLY, [
        r"\bsolve\b", r"\bcalculate\b", r"\bcompute\b", r"\bapply\b",
        r"\buse .+ to\b", r"\bdemonstrate\b", r"\bshow how\b",
        r"\bfind the\b", r"\bdetermine\b", r"\bwork out\b",
        r"\bgive an example\b", r"\bimplement\b", r"\bexecute\b",
        r"\bhow would you\b", r"\bhow do i\b", r"\bhow do you\b",
    ]),
    (BloomsLevel.UNDERSTAND, [
        r"\bexplain\b", r"\bdescribe\b", r"\bsummarize\b", r"\bsummarise\b",
        r"\bparaphrase\b", r"\binterpret\b", r"\bin your own words\b",
        r"\bwhat does .+ mean\b", r"\bwhy is\b", r"\bwhy are\b",
        r"\bhow does\b", r"\bhow do\b", r"\billustrate\b",
        r"\bgive the meaning\b", r"\brestate\b",
    ]),
    (BloomsLevel.REMEMBER, [
        r"\bwhat is\b", r"\bwhat are\b", r"\bwhat was\b",
        r"\bdefine\b", r"\blist\b", r"\bname\b", r"\brecall\b",
        r"\bidentify\b", r"\bwho\b", r"\bwhen\b", r"\bwhere\b",
        r"\bstate\b", r"\blabel\b", r"\brecognize\b", r"\brecognise\b",
        r"\bwhich\b",
    ]),
]

# Teaching strategy instructions per Bloom's level
_TEACHING_STRATEGIES: dict[BloomsLevel, str] = {
    BloomsLevel.REMEMBER: (
        "The student is at the REMEMBER level of Bloom's Taxonomy. "
        "Ask the student to recall definitions and key facts. "
        "Provide memory aids, mnemonics, and clear lists. "
        "Keep explanations simple and factual."
    ),
    BloomsLevel.UNDERSTAND: (
        "The student is at the UNDERSTAND level of Bloom's Taxonomy. "
        "Ask the student to explain concepts in their own words. "
        "Use analogies and real-world examples to deepen comprehension. "
        "Check understanding by asking them to rephrase or summarize."
    ),
    BloomsLevel.APPLY: (
        "The student is at the APPLY level of Bloom's Taxonomy. "
        "Give the student a problem to solve. Guide them through the method step by step. "
        "Provide worked examples and then ask them to try a similar problem. "
        "Focus on procedural knowledge and correct application of formulas."
    ),
    BloomsLevel.ANALYZE: (
        "The student is at the ANALYZE level of Bloom's Taxonomy. "
        "Ask the student to compare approaches or break down complex problems into parts. "
        "Encourage them to identify patterns, relationships, and underlying structures. "
        "Present scenarios that require distinguishing between concepts."
    ),
    BloomsLevel.EVALUATE: (
        "The student is at the EVALUATE level of Bloom's Taxonomy. "
        "Present multiple solutions and ask the student to judge which is best and why. "
        "Encourage critical thinking about validity, efficiency, and trade-offs. "
        "Ask them to justify their reasoning and assess evidence."
    ),
    BloomsLevel.CREATE: (
        "The student is at the CREATE level of Bloom's Taxonomy. "
        "Challenge the student to derive proofs, create novel solutions, or design new approaches. "
        "Encourage original thinking and synthesis of multiple concepts. "
        "Pose open-ended problems that require inventive problem-solving."
    ),
}

# Mastery score increment per successful interaction at current level
_MASTERY_INCREMENT = 0.2
# Threshold to advance to the next Bloom's level
_MASTERY_THRESHOLD = 0.7


def assess_response_level(student_query: str, topic: str) -> BloomsLevel:
    """
    Analyze the student's query to determine what Bloom's cognitive level
    they are operating at.

    The function checks patterns from the highest level (CREATE) downward
    and returns the first match found.  If no pattern matches, it defaults
    to REMEMBER (the lowest level).

    Args:
        student_query: The raw text of the student's query.
        topic: The current topic (reserved for future topic-aware heuristics).

    Returns:
        The assessed BloomsLevel for this query.
    """
    query_lower = student_query.lower().strip()

    # Check from highest level down to lowest
    for level, patterns in _LEVEL_PATTERNS:
        for pattern in patterns:
            if re.search(pattern, query_lower):
                return level

    # Default to REMEMBER if no patterns matched
    return BloomsLevel.REMEMBER


def advance_bloom_level(context: StudentContext, demonstrated_level: BloomsLevel) -> StudentContext:
    """
    Track mastery and potentially advance the student's Bloom's level.

    Rules:
    - If the student demonstrates at or above their current Bloom's level,
      their mastery_score is incremented.
    - If the student demonstrates below their current level, the mastery_score
      is slightly decremented (but never below 0.0).
    - When mastery_score exceeds the threshold (0.7), the student is advanced
      to the next Bloom's level and mastery_score is reset.

    Args:
        context: The current StudentContext with pedagogical state.
        demonstrated_level: The Bloom's level assessed from the latest query.

    Returns:
        Updated StudentContext.
    """
    ped = context.pedagogical_state
    current_level = ped.blooms_level

    current_index = BLOOMS_ORDER.index(current_level)
    demonstrated_index = BLOOMS_ORDER.index(demonstrated_level)

    if demonstrated_index >= current_index:
        # Student is at or above their current tracked level -- reward mastery
        ped.mastery_score = round(min(1.0, ped.mastery_score + _MASTERY_INCREMENT), 2)
    else:
        # Student dropped below current level -- small penalty
        ped.mastery_score = round(max(0.0, ped.mastery_score - 0.1), 2)

    # Check for advancement
    if ped.mastery_score > _MASTERY_THRESHOLD and current_index < len(BLOOMS_ORDER) - 1:
        # Advance to the next level
        ped.blooms_level = BLOOMS_ORDER[current_index + 1]
        ped.mastery_score = 0.0  # Reset mastery for the new level
        print(f"BLOOM ADVANCE: {current_level.value} -> {ped.blooms_level.value}")

    context.pedagogical_state = ped
    return context


def get_bloom_teaching_strategy(level: BloomsLevel) -> str:
    """
    Return a teaching strategy instruction string to inject into the
    Gemini system prompt, tailored to the given Bloom's level.

    Args:
        level: The current BloomsLevel of the student.

    Returns:
        A string containing pedagogical instructions for the LLM.
    """
    return _TEACHING_STRATEGIES.get(level, _TEACHING_STRATEGIES[BloomsLevel.APPLY])
