"""
Tests for the R2 Privacy Airlock (app/services/security.py) and its
injection points in the generation engine — every payload bound for the
Gemini SDK is scrubbed first (Canon §8/§11, ratified 07/07/2026).
"""
import sys
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services import generation_engine
from app.services.security import REDACTION_TOKEN, apply_egress_airlock


# ---------------------------------------------------------------------------
# Unit: regex scrubbing
# ---------------------------------------------------------------------------

class TestAirlockScrubbing:
    def test_scrubs_dummy_string_with_aussie_mobile_and_email(self):
        payload = (
            "Ben struggled today — his mum (ben.smith@gmail.com) asked us to "
            "ring her on 0412 345 678 before Friday."
        )
        scrubbed = apply_egress_airlock(payload)
        assert "ben.smith@gmail.com" not in scrubbed
        assert "0412 345 678" not in scrubbed
        assert scrubbed.count(REDACTION_TOKEN) == 2
        assert "Ben struggled today" in scrubbed  # surrounding text intact

    @pytest.mark.parametrize(
        "phone",
        [
            "0412 345 678",
            "0412345678",
            "0412-345-678",
            "+61 412 345 678",
            "+61412345678",
            "02 9876 5432",
            "(02) 9876 5432",
            "+61 2 9876 5432",
            "0398765432",
        ],
    )
    def test_scrubs_australian_phone_formats(self, phone):
        scrubbed = apply_egress_airlock(f"Contact on {phone} after school.")
        assert phone not in scrubbed
        assert REDACTION_TOKEN in scrubbed

    @pytest.mark.parametrize(
        "email",
        ["darra@mmm.com.au", "ben.smith+tutor@gmail.com", "x_y-z@school.nsw.edu.au"],
    )
    def test_scrubs_email_formats(self, email):
        scrubbed = apply_egress_airlock(f"Send the report to {email} thanks.")
        assert email not in scrubbed
        assert REDACTION_TOKEN in scrubbed

    @pytest.mark.parametrize(
        "labelled_id",
        [
            "Student ID: 8123456",
            "student number 8123456",
            "Medicare: 2123 45670 1",
            "TFN: 123 456 789",
            "Tax File Number 123 456 789",
            "Licence no. 12345678",
            "ID #: 99887766",
        ],
    )
    def test_scrubs_labelled_identifiers(self, labelled_id):
        scrubbed = apply_egress_airlock(f"On file — {labelled_id} — confirmed.")
        digits = labelled_id.split(None, 2)[-1]
        assert REDACTION_TOKEN in scrubbed
        assert digits not in scrubbed

    def test_multiple_pii_items_all_scrubbed(self):
        payload = (
            "Mum: 0412 345 678, Dad: (02) 9876 5432, email jo@x.com, "
            "Student ID: 8123456."
        )
        scrubbed = apply_egress_airlock(payload)
        assert scrubbed.count(REDACTION_TOKEN) == 4

    def test_empty_and_none_safe(self):
        assert apply_egress_airlock("") == ""

    def test_idempotent(self):
        payload = "Ring 0412 345 678 or email a@b.co"
        once = apply_egress_airlock(payload)
        assert apply_egress_airlock(once) == once


class TestAirlockPreservesMathsContent:
    """The airlock must never eat legitimate maths (prefix-anchored phones;
    unlabelled digit runs are deliberately not treated as IDs)."""

    @pytest.mark.parametrize(
        "maths",
        [
            "Evaluate $2^{10} = 1024$ and simplify $x^{2} \\times x^{3}$.",
            "Write 123 456 789 in expanded form.",  # place value, not a TFN
            "Round 0.412 to two decimal places.",
            "The population grew from 4123 to 45678 between 2016 and 2026.",
            "A ticket costs 500 dollars; find 15% of 500.",
            "Add 1234 5678 to your working.",  # no 0/+61 prefix — not a phone
            "The sequence 4, 12, 345, 678 is not arithmetic.",
            "In 2026-07-01 format, dates use hyphens.",
        ],
    )
    def test_maths_strings_pass_untouched(self, maths):
        assert apply_egress_airlock(maths) == maths


# ---------------------------------------------------------------------------
# Integration: SDK choke points
# ---------------------------------------------------------------------------

def _fresh_gemini_client(response=None):
    genai_mod = MagicMock()
    fake_client = MagicMock()
    fake_client.aio.models.generate_content = AsyncMock(return_value=response)
    return genai_mod, fake_client


class TestAirlockChokePoints:
    @pytest.mark.asyncio
    async def test_prompt_scrubbed_before_generate_content(self):
        from app.models import ExoskeletonResponse

        parsed = ExoskeletonResponse(parts=[])
        genai_mod, client = _fresh_gemini_client(
            SimpleNamespace(parsed=parsed, text=None)
        )
        with patch.dict(
            sys.modules,
            {"google.genai": genai_mod, "google.genai.types": genai_mod.types},
        ), patch.object(generation_engine, "get_client", return_value=client):
            await generation_engine.generate_structured_response(
                "Plan around Ben's tutoring — mum's number is 0412 345 678, "
                "email ben@gmail.com."
            )

        contents = client.aio.models.generate_content.call_args.kwargs["contents"]
        assert "0412 345 678" not in contents
        assert "ben@gmail.com" not in contents
        assert contents.count(REDACTION_TOKEN) == 2

    @pytest.mark.asyncio
    async def test_embedding_text_scrubbed_before_embed_content(self):
        genai_mod = MagicMock()
        fake_client = MagicMock()
        fake_client.models.embed_content.return_value = SimpleNamespace(
            embeddings=[SimpleNamespace(values=[0.0] * 768)]
        )
        with patch.dict(
            sys.modules,
            {"google.genai": genai_mod, "google.genai.types": genai_mod.types},
        ), patch.object(generation_engine, "get_client", return_value=fake_client):
            await generation_engine.embed_query(
                "questions like the ones Ben's mum (0412 345 678) mentioned"
            )

        sent = fake_client.models.embed_content.call_args.kwargs["contents"]
        assert "0412 345 678" not in sent
        assert REDACTION_TOKEN in sent
