"""
Tests for the syllabus document processor: content/topic code chunking,
metadata enrichment and multi-file deduplication.
PDF and DOCX extraction are patched — no real documents are read.
"""
import importlib
from pathlib import Path

import pytest
from unittest.mock import MagicMock, patch

from app.services.rag.config import MAX_CHUNK_SIZE
from app.services.rag.document_processor import DocumentProcessor, SyllabusChunk

document_processor_module = importlib.import_module("app.services.rag.document_processor")


@pytest.fixture
def processor():
    """A fresh document processor."""
    return DocumentProcessor()


# ===========================================================================
# SyllabusChunk
# ===========================================================================

class TestSyllabusChunk:
    """Chunks serialise into the vector store payload shape."""

    def test_to_dict_nests_metadata(self):
        """to_dict() splits text from its metadata block."""
        chunk = SyllabusChunk(
            id="MA-C2.C2.1",
            text="Differentiate polynomials",
            topic_code="MA-C2",
            content_code="C2.1",
            topic_name="Differential Calculus",
            year="12",
            parent_topic="Calculus",
            source="syllabus.pdf",
        )
        assert chunk.to_dict() == {
            "id": "MA-C2.C2.1",
            "text": "Differentiate polynomials",
            "metadata": {
                "topic_code": "MA-C2",
                "content_code": "C2.1",
                "topic_name": "Differential Calculus",
                "year": "12",
                "parent_topic": "Calculus",
                "source": "syllabus.pdf",
            },
        }

    def test_missing_content_code_serialises_as_empty_string(self):
        """A None content code becomes "" so the metadata stays flat."""
        chunk = SyllabusChunk(
            id="MA-C2", text="t", topic_code="MA-C2", content_code=None,
            topic_name="n", year="12", parent_topic="Calculus", source="s",
        )
        assert chunk.to_dict()["metadata"]["content_code"] == ""


# ===========================================================================
# Topic code inference
# ===========================================================================

class TestInferTopicCode:
    """Content codes map back onto their parent topic code."""

    def test_infers_from_content_code(self, processor):
        """C2.1 belongs to MA-C2."""
        assert processor._infer_topic_code("C2.1") == "MA-C2"

    def test_infers_from_multi_digit_content_code(self, processor):
        """Only the leading letter and digit are used."""
        assert processor._infer_topic_code("F1.12") == "MA-F1"

    def test_short_code_falls_back_to_unknown(self, processor):
        """A one-character code cannot be mapped."""
        assert processor._infer_topic_code("C") == "MA-UNK"


# ===========================================================================
# Text extraction dispatch
# ===========================================================================

class TestProcessPdf:
    """PDF pages are concatenated, skipping blank pages."""

    def test_concatenates_page_text(self, processor):
        """Each page's text is joined with newlines."""
        reader = MagicMock(pages=[
            MagicMock(**{"extract_text.return_value": "page one"}),
            MagicMock(**{"extract_text.return_value": "page two"}),
        ])
        with patch.object(document_processor_module.pypdf, "PdfReader", return_value=reader):
            assert processor.process_pdf(Path("syllabus.pdf")) == "page one\npage two\n"

    def test_blank_pages_are_skipped(self, processor):
        """Pages with no extractable text contribute nothing."""
        reader = MagicMock(pages=[
            MagicMock(**{"extract_text.return_value": ""}),
            MagicMock(**{"extract_text.return_value": None}),
            MagicMock(**{"extract_text.return_value": "real content"}),
        ])
        with patch.object(document_processor_module.pypdf, "PdfReader", return_value=reader):
            assert processor.process_pdf(Path("syllabus.pdf")) == "real content\n"


class TestProcessDocx:
    """DOCX paragraphs and table cells are both extracted."""

    def test_extracts_paragraphs(self, processor):
        """Paragraph text is newline separated."""
        document = MagicMock(paragraphs=[MagicMock(text="first"), MagicMock(text="second")], tables=[])
        with patch.object(document_processor_module, "DocxDocument", return_value=document):
            assert processor.process_docx(Path("syllabus.docx")) == "first\nsecond\n"

    def test_extracts_table_cells(self, processor):
        """Table rows are flattened with spaces between cells."""
        row = MagicMock(cells=[MagicMock(text="C2.1"), MagicMock(text="Derivatives")])
        document = MagicMock(paragraphs=[], tables=[MagicMock(rows=[row])])
        with patch.object(document_processor_module, "DocxDocument", return_value=document):
            assert processor.process_docx(Path("syllabus.docx")) == "C2.1 Derivatives \n"


class TestExtractText:
    """extract_text dispatches on the file suffix."""

    def test_pdf_dispatches_to_pdf_reader(self, processor):
        """A .pdf path is routed to the PDF extractor."""
        with patch.object(processor, "process_pdf", return_value="pdf text") as pdf_mock:
            assert processor.extract_text(Path("syllabus.PDF")) == "pdf text"
        pdf_mock.assert_called_once()

    def test_docx_dispatches_to_docx_reader(self, processor):
        """A .docx path is routed to the DOCX extractor."""
        with patch.object(processor, "process_docx", return_value="docx text") as docx_mock:
            assert processor.extract_text(Path("syllabus.docx")) == "docx text"
        docx_mock.assert_called_once()

    def test_legacy_doc_extension_is_accepted(self, processor):
        """A legacy .doc extension also uses the DOCX extractor."""
        with patch.object(processor, "process_docx", return_value="docx text"):
            assert processor.extract_text(Path("syllabus.doc")) == "docx text"

    def test_unsupported_extension_raises(self, processor):
        """Any other extension is rejected."""
        with pytest.raises(ValueError, match="Unsupported file type: .txt"):
            processor.extract_text(Path("syllabus.txt"))


# ===========================================================================
# Content-code chunking
# ===========================================================================

class TestChunkByContentCode:
    """Text is split on content code headings such as 'C2.1'."""

    def test_splits_on_content_codes(self, processor):
        """Each content code starts a new chunk."""
        text = (
            "C2.1: Differentiation of polynomials\nSome content about derivatives.\n"
            "C2.2: Rules of differentiation\nChain, product and quotient rules.\n"
        )
        chunks = processor.chunk_by_content_code(text, "advanced.pdf")
        assert [chunk.content_code for chunk in chunks] == ["C2.1", "C2.2"]
        assert chunks[0].id == "MA-C2.C2.1"
        assert "derivatives" in chunks[0].text
        assert "Chain, product" in chunks[1].text

    def test_metadata_comes_from_the_topic_table(self, processor):
        """A known topic code is enriched from TOPIC_METADATA."""
        chunk = processor.chunk_by_content_code("C4.1: Integration\nAntiderivatives.", "advanced.pdf")[0]
        assert chunk.topic_code == "MA-C4"
        assert chunk.topic_name == "Integral Calculus"
        assert chunk.year == "12"
        assert chunk.parent_topic == "Calculus"

    def test_unknown_topic_falls_back_to_the_section_title(self, processor):
        """An unmapped code uses the heading text as its topic name."""
        chunk = processor.chunk_by_content_code("Z9.1: Mystery Topic\nBody.", "advanced.pdf")[0]
        assert chunk.topic_code == "MA-Z9"
        assert chunk.topic_name.startswith("Mystery Topic")
        assert chunk.year == "Unknown"
        assert chunk.parent_topic == "Mathematics"

    def test_source_is_recorded(self, processor):
        """The source filename is attached to each chunk."""
        chunk = processor.chunk_by_content_code("C2.1: Derivatives\nBody.", "advanced.pdf")[0]
        assert chunk.source == "advanced.pdf"

    def test_oversized_sections_are_truncated(self, processor):
        """Sections beyond the char budget are cut with an ellipsis."""
        text = (
            "C2.1: Derivatives\n" + ("x" * (MAX_CHUNK_SIZE * 5)) + "\n"
            "C2.2: Rules\nShort section.\n"
        )
        chunk = processor.chunk_by_content_code(text, "advanced.pdf")[0]
        assert chunk.text.endswith("...")
        assert len(chunk.text) == MAX_CHUNK_SIZE * 4 + 3

    def test_final_section_is_capped_at_3000_chars(self, processor):
        """The last section runs at most 3000 characters past its heading."""
        text = "C2.1: Derivatives\n" + ("x" * 10000)
        chunk = processor.chunk_by_content_code(text, "advanced.pdf")[0]
        assert len(chunk.text) == 3000
        assert not chunk.text.endswith("...")

    def test_falls_back_to_topic_codes(self, processor):
        """Without content codes, chunking falls back to MA-X# headings."""
        text = "MA-C2 Differential Calculus\nDerivative rules.\nMA-C4 Integral Calculus\nAntiderivatives.\n"
        chunks = processor.chunk_by_content_code(text, "advanced.pdf")
        assert [chunk.topic_code for chunk in chunks] == ["MA-C2", "MA-C4"]
        assert all(chunk.content_code is None for chunk in chunks)

    def test_falls_back_to_a_single_general_chunk(self, processor):
        """Text with no codes at all becomes one general chunk."""
        chunks = processor.chunk_by_content_code("Just some prose about maths.", "notes.pdf")
        assert len(chunks) == 1
        assert chunks[0].topic_code == "MA-GEN"
        assert chunks[0].topic_name == "General Mathematics"
        assert chunks[0].id == "DOC-notes.pdf"

    def test_general_chunk_id_is_truncated_for_long_filenames(self, processor):
        """Long source names are truncated inside the fallback chunk id."""
        source = "a-very-long-syllabus-filename.pdf"
        chunk = processor.chunk_by_content_code("prose", source)[0]
        assert chunk.id == f"DOC-{source[:20]}"


# ===========================================================================
# Multi-file processing
# ===========================================================================

class TestProcessAll:
    """process_all extracts, chunks and deduplicates across files."""

    def test_skips_missing_files(self, processor, tmp_path):
        """A non-existent path is warned about and skipped."""
        assert processor.process_all([tmp_path / "missing.pdf"]) == []

    def test_processes_each_existing_file(self, processor, tmp_path):
        """Chunks from every readable file are collected."""
        first = tmp_path / "a.pdf"
        second = tmp_path / "b.pdf"
        first.write_text("stub")
        second.write_text("stub")

        texts = {
            first: "C2.1: Derivatives\nContent A.",
            second: "C4.1: Integrals\nContent B.",
        }
        with patch.object(processor, "extract_text", side_effect=lambda p: texts[p]):
            chunks = processor.process_all([first, second])

        assert {chunk.content_code for chunk in chunks} == {"C2.1", "C4.1"}

    def test_extraction_errors_are_isolated(self, processor, tmp_path):
        """A file that fails to parse does not abort the whole run."""
        bad = tmp_path / "bad.pdf"
        good = tmp_path / "good.pdf"
        bad.write_text("stub")
        good.write_text("stub")

        def fake_extract(path):
            if path == bad:
                raise ValueError("corrupt pdf")
            return "C2.1: Derivatives\nContent."

        with patch.object(processor, "extract_text", side_effect=fake_extract):
            chunks = processor.process_all([bad, good])

        assert [chunk.content_code for chunk in chunks] == ["C2.1"]

    def test_duplicate_ids_keep_the_longest_text(self, processor, tmp_path):
        """When two files define the same chunk id, the richer text wins."""
        short = tmp_path / "short.pdf"
        long = tmp_path / "long.pdf"
        short.write_text("stub")
        long.write_text("stub")

        texts = {
            short: "C2.1: Derivatives\nBrief.",
            long: "C2.1: Derivatives\n" + ("detail " * 50),
        }
        with patch.object(processor, "extract_text", side_effect=lambda p: texts[p]):
            chunks = processor.process_all([short, long])

        assert len(chunks) == 1
        assert "detail" in chunks[0].text
