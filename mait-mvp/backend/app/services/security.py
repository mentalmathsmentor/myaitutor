"""
R2 Privacy Airlock — strict regex egress scrub (Canon §7 / §8 / §11,
RATIFIED 07/07/2026).

Every payload leaving the backend for the Gemini SDK must pass through
`apply_egress_airlock()` first. Choke points live in
`generation_engine.generate_structured_response` (final compiled prompt)
and `generation_engine._embed_query_sync` (embedding text), so nothing the
teach pipeline sends can carry PII regardless of which caller assembled it.

Targets (Australian formats):
- Email addresses.
- Mobile numbers: 04XX XXX XXX / 04XXXXXXXX / +61 4XX XXX XXX.
- Landlines: 0X XXXX XXXX / (0X) XXXX XXXX / +61 X XXXX XXXX.
- Labelled identifiers: "Student ID/number", "Medicare", "TFN"/"Tax File
  Number", "Licence number", "ID no." etc., followed by a digit run.

Precision on a maths surface (deliberate design):
- Phone patterns are prefix-anchored (leading 0 or +61) with digit-boundary
  guards, so arithmetic, place value, dates, and decimals never match.
- Bare unlabelled digit runs (e.g. "123 456 789") are NOT treated as IDs —
  a Stage 4 place-value question looks exactly like a TFN. Identifiers are
  scrubbed only when introduced by an identifying label; anything beyond
  that is Phase 2 airlock work (named-entity pass), not regex work.

All patterns are precompiled at import; the function is a short chain of
compiled `re.sub` calls — safe to run on every request.
"""

import re

REDACTION_TOKEN = "[REDACTED_PII]"

_EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

_AU_MOBILE = re.compile(
    r"(?<!\d)(?:\+?61[\s-]?4|04)\d{2}[\s-]?\d{3}[\s-]?\d{3}(?!\d)"
)

_AU_LANDLINE = re.compile(
    r"(?<!\d)(?:\+?61[\s-]?[2378]|\(0[2378]\)|0[2378])[\s-]?\d{4}[\s-]?\d{4}(?!\d)"
)

_LABELLED_ID = re.compile(
    r"""(?ix)
    (?P<label>
        \b(?:student|licence|license|centrelink|customer)\s*(?:id|number|no\.?|\#)
      | \bmedicare(?:\s*(?:number|no\.?))?
      | \btfn
      | \btax\s+file\s+number
      | \bid\s*(?:number|no\.?|\#)
    )
    \s*[:\#]?\s*
    (?P<value>[A-Z]?\d[\d\s-]{3,}\d)
    """
)


def apply_egress_airlock(payload: str) -> str:
    """Redact Australian-format PII from an outbound payload string.

    Returns the payload with each match replaced by [REDACTED_PII].
    Labelled identifiers keep their label (useful for prompt coherence);
    the value is redacted.
    """
    if not payload:
        return payload
    scrubbed = _EMAIL.sub(REDACTION_TOKEN, payload)
    scrubbed = _LABELLED_ID.sub(
        lambda m: f"{m.group('label')} {REDACTION_TOKEN}", scrubbed
    )
    scrubbed = _AU_MOBILE.sub(REDACTION_TOKEN, scrubbed)
    scrubbed = _AU_LANDLINE.sub(REDACTION_TOKEN, scrubbed)
    return scrubbed
