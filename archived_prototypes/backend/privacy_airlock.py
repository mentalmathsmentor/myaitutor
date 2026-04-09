import re
from typing import Dict, List

from fastapi import HTTPException


PII_PATTERNS = {
    "email": re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.IGNORECASE),
    "phone": re.compile(r"\b(?:\+?61|0)\d(?:[\s-]?\d){8,}\b"),
    "student_id": re.compile(r"\b(?:student|st(u)?dent|id)\s*[:#-]?\s*[A-Z0-9_-]{4,}\b", re.IGNORECASE),
    "street_address": re.compile(
        r"\b\d{1,5}\s+[A-Za-z0-9.'-]+\s+(?:street|st|road|rd|avenue|ave|drive|dr|close|cl|lane|ln|crescent|cres|court|ct)\b",
        re.IGNORECASE,
    ),
    "dob": re.compile(r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|date of birth[:\s]+\w+)\b", re.IGNORECASE),
}


REPLACEMENTS = {
    "email": "[EMAIL]",
    "phone": "[PHONE]",
    "student_id": "[STUDENT_ID]",
    "street_address": "[ADDRESS]",
    "dob": "[DOB]",
}


def scan_for_pii(text: str) -> List[Dict[str, str]]:
    findings: List[Dict[str, str]] = []
    if not text:
        return findings

    for pii_type, pattern in PII_PATTERNS.items():
        for match in pattern.finditer(text):
            findings.append(
                {
                    "type": pii_type,
                    "match": match.group(0)[:80],
                }
            )
    return findings


def sanitize_text(text: str) -> Dict[str, object]:
    sanitized = text or ""
    findings = scan_for_pii(sanitized)

    for pii_type, pattern in PII_PATTERNS.items():
        sanitized = pattern.sub(REPLACEMENTS[pii_type], sanitized)

    return {
        "sanitized_text": sanitized.strip(),
        "findings": findings,
        "blocked": bool(findings),
    }


def enforce_cloud_safe_text(raw_text: str, sanitized_text: str | None = None) -> Dict[str, object]:
    prepared = sanitize_text(raw_text)
    effective = (sanitized_text or prepared["sanitized_text"]).strip()
    residual_findings = scan_for_pii(effective)

    if residual_findings:
        raise HTTPException(
            status_code=400,
            detail={
                "error": "privacy_airlock_blocked",
                "message": "Potential personal information is still present. Remove it or switch to local mode.",
                "findings": residual_findings,
            },
        )

    return {
        "raw_findings": prepared["findings"],
        "sanitized_text": effective,
        "was_sanitized": bool(prepared["findings"]) or effective != (raw_text or "").strip(),
    }
