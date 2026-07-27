"""
Tests for the RAG retrieval service: query expansion, fatigue-aware
result counts, relevance filtering and context formatting.
The FAISS vector store is replaced with an in-memory stub.
"""
import pytest

from app.services.rag.config import FRESH_TOP_K, SIMILARITY_THRESHOLD, WEARY_TOP_K
from app.services.rag.retrieval_service import FatigueLevel, RetrievalService


def _chunk(chunk_id, text="Syllabus content", relevance=0.9, topic_code="MA-C2",
           topic_name="Differential Calculus", content_code="", year="12"):
    return {
        "id": chunk_id,
        "text": text,
        "relevance": relevance,
        "metadata": {
            "topic_code": topic_code,
            "topic_name": topic_name,
            "content_code": content_code,
            "year": year,
        },
    }


class FakeVectorStore:
    """Minimal stand-in for the FAISS-backed vector store."""

    def __init__(self, search_results=None, topic_results=None, count=1):
        self.search_results = search_results if search_results is not None else []
        self.topic_results = topic_results or {}
        self._count = count
        self.search_calls = []
        self.topic_calls = []

    def search(self, query, n_results, filter_dict=None):
        self.search_calls.append({"query": query, "n_results": n_results, "filter_dict": filter_dict})
        return [dict(chunk) for chunk in self.search_results]

    def get_by_topic_code(self, topic_code):
        self.topic_calls.append(topic_code)
        return [dict(chunk) for chunk in self.topic_results.get(topic_code, [])]

    def count(self):
        if isinstance(self._count, Exception):
            raise self._count
        return self._count


@pytest.fixture
def service():
    """A retrieval service wired to a fake vector store."""
    svc = RetrievalService()
    svc.vector_store = FakeVectorStore()
    return svc


# ===========================================================================
# Query analysis helpers
# ===========================================================================

class TestTopicCodeExtraction:
    """Explicit topic codes in the query are detected."""

    def test_extracts_uppercase_code(self, service):
        """A code written in the query is returned as-is."""
        assert service._extract_topic_code("Explain MA-C2 for me") == "MA-C2"

    def test_extraction_is_case_insensitive(self, service):
        """Lowercase codes are upper-cased before matching."""
        assert service._extract_topic_code("what is ma-f1 about") == "MA-F1"

    def test_returns_none_without_a_code(self, service):
        """A query with no topic code yields None."""
        assert service._extract_topic_code("how do I differentiate x^2") is None


class TestTopicHints:
    """Keyword hints expand a query into candidate topic codes."""

    def test_derivative_maps_to_calculus_topics(self, service):
        """'derivative' suggests the differentiation topics."""
        assert set(service._get_topic_hints("find the derivative")) == {"MA-C1", "MA-C2", "MA-C3"}

    def test_hints_are_case_insensitive(self, service):
        """Hint matching lowercases the query."""
        assert service._get_topic_hints("INTEGRAL of 2x") == ["MA-C4"]

    def test_multiple_keywords_are_merged_without_duplicates(self, service):
        """Overlapping keyword sets are deduplicated."""
        hints = service._get_topic_hints("use the chain rule to differentiate")
        assert sorted(hints) == ["MA-C1", "MA-C2", "MA-C3"]

    def test_unknown_query_returns_no_hints(self, service):
        """A query with no known keywords produces no hints."""
        assert service._get_topic_hints("hello there") == []


class TestTopKSelection:
    """Fatigue level controls how much context is retrieved."""

    def test_fresh_uses_the_larger_budget(self, service):
        """A FRESH student gets the full context budget."""
        assert service._get_top_k(FatigueLevel.FRESH) == FRESH_TOP_K

    def test_weary_uses_the_smaller_budget(self, service):
        """A WEARY student gets a reduced context budget."""
        assert service._get_top_k(FatigueLevel.WEARY) == WEARY_TOP_K

    def test_lockout_defaults_to_the_fresh_budget(self, service):
        """LOCKOUT is not special-cased here and falls back to FRESH."""
        assert service._get_top_k(FatigueLevel.LOCKOUT) == FRESH_TOP_K


# ===========================================================================
# retrieve()
# ===========================================================================

class TestRetrieve:
    """retrieve() merges, filters, sorts and formats vector store results."""

    def test_formats_context_with_topic_header(self, service):
        """Each chunk is prefixed with its topic code, name and year."""
        service.vector_store = FakeVectorStore(search_results=[
            _chunk("c1", text="The derivative measures rate of change."),
        ])
        result = service.retrieve("what is a derivative")
        assert "[MA-C2 - Differential Calculus (Year 12)]" in result["context"]
        assert "The derivative measures rate of change." in result["context"]
        assert result["topic_codes"] == ["MA-C2"]

    def test_content_code_is_included_in_the_header(self, service):
        """A chunk with a content code gets the finer-grained header."""
        service.vector_store = FakeVectorStore(search_results=[_chunk("c1", content_code="C2.1")])
        assert "[MA-C2.C2.1 - Differential Calculus (Year 12)]" in service.retrieve("q")["context"]

    def test_year_filter_is_passed_to_the_vector_store(self, service):
        """A year filter becomes a metadata filter on the search."""
        store = FakeVectorStore(search_results=[_chunk("c1")])
        service.vector_store = store
        service.retrieve("q", year_filter="11")
        assert store.search_calls[0]["filter_dict"] == {"year": "11"}

    def test_no_filter_is_passed_when_year_is_omitted(self, service):
        """Without a year filter the search is unfiltered."""
        store = FakeVectorStore(search_results=[_chunk("c1")])
        service.vector_store = store
        service.retrieve("q")
        assert store.search_calls[0]["filter_dict"] is None

    def test_weary_requests_fewer_chunks(self, service):
        """The WEARY budget is forwarded as n_results."""
        store = FakeVectorStore(search_results=[_chunk("c1")])
        service.vector_store = store
        service.retrieve("q", fatigue_level=FatigueLevel.WEARY)
        assert store.search_calls[0]["n_results"] == WEARY_TOP_K

    def test_low_relevance_chunks_are_dropped(self, service):
        """Chunks below the similarity threshold are filtered out."""
        service.vector_store = FakeVectorStore(search_results=[
            _chunk("keep", text="relevant", relevance=0.8),
            _chunk("drop", text="noise", relevance=SIMILARITY_THRESHOLD - 0.1),
        ])
        result = service.retrieve("q")
        assert [chunk["id"] for chunk in result["chunks"]] == ["keep"]
        assert "noise" not in result["context"]

    def test_chunks_are_sorted_by_relevance(self, service):
        """Results are ordered most relevant first."""
        service.vector_store = FakeVectorStore(search_results=[
            _chunk("low", relevance=0.4),
            _chunk("high", relevance=0.99),
            _chunk("mid", relevance=0.7),
        ])
        assert [c["id"] for c in service.retrieve("q")["chunks"]] == ["high", "mid", "low"]

    def test_explicit_topic_code_adds_up_to_two_chunks(self, service):
        """An explicitly named topic contributes extra high-relevance chunks."""
        service.vector_store = FakeVectorStore(
            search_results=[_chunk("c1")],
            topic_results={"MA-F1": [
                _chunk("f1a", topic_code="MA-F1"),
                _chunk("f1b", topic_code="MA-F1"),
                _chunk("f1c", topic_code="MA-F1"),
            ]},
        )
        result = service.retrieve("summarise MA-F1")
        ids = [chunk["id"] for chunk in result["chunks"]]
        assert "f1a" in ids and "f1b" in ids
        assert "f1c" not in ids
        assert all(chunk["relevance"] == 0.95 for chunk in result["chunks"] if chunk["id"].startswith("f1"))

    def test_explicit_topic_chunks_are_not_duplicated(self, service):
        """A chunk already returned by search is not added twice."""
        service.vector_store = FakeVectorStore(
            search_results=[_chunk("f1a", topic_code="MA-F1")],
            topic_results={"MA-F1": [_chunk("f1a", topic_code="MA-F1")]},
        )
        assert len(service.retrieve("explain MA-F1")["chunks"]) == 1

    def test_keyword_hints_top_up_a_thin_result_set(self, service):
        """When search returns too little, the first keyword hint is queried."""
        store = FakeVectorStore(
            search_results=[_chunk("c1")],
            topic_results={code: [_chunk(f"{code}-a", topic_code=code)] for code in ("MA-C1", "MA-C2", "MA-C3")},
        )
        service.vector_store = store
        result = service.retrieve("find the derivative of x^2")
        assert len(store.topic_calls) == 1
        assert len(result["chunks"]) == 2

    def test_hints_are_skipped_when_enough_results_exist(self, service):
        """A full result set does not trigger hint expansion."""
        store = FakeVectorStore(search_results=[_chunk(f"c{i}") for i in range(FRESH_TOP_K)])
        service.vector_store = store
        service.retrieve("find the derivative of x^2")
        assert store.topic_calls == []

    def test_weary_context_is_truncated(self, service):
        """Long context is cut down for weary students."""
        service.vector_store = FakeVectorStore(search_results=[_chunk("c1", text="x" * 4000)])
        context = service.retrieve("q", fatigue_level=FatigueLevel.WEARY)["context"]
        assert context.endswith("[Content truncated for brevity]")
        assert len(context) < 1600

    def test_fresh_context_is_not_truncated(self, service):
        """FRESH students receive the full context."""
        service.vector_store = FakeVectorStore(search_results=[_chunk("c1", text="x" * 4000)])
        context = service.retrieve("q", fatigue_level=FatigueLevel.FRESH)["context"]
        assert "[Content truncated for brevity]" not in context
        assert len(context) > 4000

    def test_chunks_are_joined_with_a_separator(self, service):
        """Multiple chunks are separated by a horizontal rule."""
        service.vector_store = FakeVectorStore(search_results=[
            _chunk("c1", text="first"),
            _chunk("c2", text="second"),
        ])
        assert "\n\n---\n\n" in service.retrieve("q")["context"]

    def test_empty_store_returns_empty_context(self, service):
        """No results means an empty context and no topic codes."""
        result = service.retrieve("q")
        assert result == {"context": "", "chunks": [], "topic_codes": []}


# ===========================================================================
# Topic summaries and readiness
# ===========================================================================

class TestTopicSummary:
    """get_topic_summary condenses a topic's chunks for quick reference."""

    def test_summarises_first_three_chunks(self, service):
        """At most three chunks are combined into the summary."""
        service.vector_store = FakeVectorStore(topic_results={
            "MA-C2": [_chunk(f"c{i}", text=f"chunk {i}") for i in range(5)]
        })
        summary = service.get_topic_summary("MA-C2")
        assert summary.count("\n---\n") == 2
        assert "chunk 3" not in summary

    def test_chunk_text_is_truncated_to_500_chars(self, service):
        """Each summarised chunk is limited to 500 characters."""
        service.vector_store = FakeVectorStore(topic_results={"MA-C2": [_chunk("c1", text="y" * 900)]})
        assert len(service.get_topic_summary("MA-C2")) == 500

    def test_unknown_topic_returns_a_message(self, service):
        """An unknown topic code returns an explanatory string."""
        assert service.get_topic_summary("MA-ZZ") == "No content found for topic code: MA-ZZ"


class TestIsReady:
    """is_ready reflects whether the vector store has been populated."""

    def test_populated_store_is_ready(self, service):
        """A non-empty index means the service is ready."""
        service.vector_store = FakeVectorStore(count=42)
        assert service.is_ready() is True

    def test_empty_store_is_not_ready(self, service):
        """An empty index means the service is not ready."""
        service.vector_store = FakeVectorStore(count=0)
        assert service.is_ready() is False

    def test_store_error_is_swallowed(self, service):
        """A failing count() is reported as 'not ready' rather than raising."""
        service.vector_store = FakeVectorStore(count=RuntimeError("index missing"))
        assert service.is_ready() is False
