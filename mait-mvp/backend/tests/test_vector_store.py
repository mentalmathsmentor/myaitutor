"""
Tests for the FAISS vector store: upsert behaviour, metadata filtering,
similarity scoring, persistence and topic lookups.
The embedding model is replaced with a deterministic one-hot encoder.
"""
import importlib
import json

import numpy as np
import pytest

from app.services.rag.config import EMBEDDING_DIMENSIONS, FAISS_INDEX_FILE, FAISS_METADATA_FILE
from app.services.rag.document_processor import SyllabusChunk
from app.services.rag.vector_store import VectorStore

# The package re-exports the singleton under this name, so reach for the module.
vector_store_module = importlib.import_module("app.services.rag.vector_store")

# Deterministic "topics": each keyword owns one axis of the embedding space.
_AXES = ["derivative", "integral", "probability"]


def _encode(text: str) -> np.ndarray:
    """One-hot encode text on the first matching keyword axis."""
    vector = np.zeros(EMBEDDING_DIMENSIONS, dtype=np.float32)
    for axis, keyword in enumerate(_AXES):
        if keyword in text.lower():
            vector[axis] = 1.0
            return vector
    vector[len(_AXES)] = 1.0
    return vector


class FakeEmbeddingService:
    """Stand-in for the sentence-transformers wrapper."""

    def embed(self, texts):
        return np.vstack([_encode(text) for text in texts])

    def embed_query(self, query):
        return self.embed([query])


def _chunk(chunk_id, text, topic_code="MA-C2", year="12"):
    return SyllabusChunk(
        id=chunk_id,
        text=text,
        topic_code=topic_code,
        content_code=None,
        topic_name="Topic",
        year=year,
        parent_topic="Mathematics",
        source="syllabus.pdf",
    )


@pytest.fixture
def store(tmp_path, monkeypatch):
    """A vector store persisting to a temp dir with fake embeddings."""
    monkeypatch.setattr(vector_store_module, "FAISS_INDEX_DIR", str(tmp_path))
    monkeypatch.setattr(vector_store_module, "embedding_service", FakeEmbeddingService())
    instance = VectorStore()
    instance._initialized = False
    instance._initialize()
    yield instance
    instance._initialized = False


# ===========================================================================
# Initialization and persistence
# ===========================================================================

class TestInitialization:
    """The index is created lazily and reloaded from disk when present."""

    def test_starts_empty(self, store):
        """A fresh store has no vectors."""
        assert store.count() == 0

    def test_creates_the_index_directory(self, store, tmp_path):
        """The persist directory is created during initialization."""
        assert tmp_path.exists()

    def test_add_persists_index_and_metadata(self, store, tmp_path):
        """Adding chunks writes both the index and the metadata sidecar."""
        store.add_chunks([_chunk("c1", "The derivative of x^2")])
        assert (tmp_path / FAISS_INDEX_FILE).exists()
        metadata = json.loads((tmp_path / FAISS_METADATA_FILE).read_text())
        assert metadata["ids"] == ["c1"]
        assert metadata["documents"] == ["The derivative of x^2"]
        assert metadata["metadatas"][0]["topic_code"] == "MA-C2"

    def test_reload_restores_state_from_disk(self, store, tmp_path):
        """A re-initialized store recovers its vectors and metadata."""
        store.add_chunks([_chunk("c1", "The derivative of x^2")])
        store._initialized = False
        store._initialize()
        assert store.count() == 1
        assert store._ids == ["c1"]

    def test_corrupt_metadata_falls_back_to_an_empty_index(self, store, tmp_path):
        """Unreadable metadata is reported and a new empty index is used."""
        store.add_chunks([_chunk("c1", "The derivative of x^2")])
        (tmp_path / FAISS_METADATA_FILE).write_text("{not json")
        store._initialized = False
        store._initialize()
        assert store.count() == 0

    def test_initialize_is_idempotent(self, store):
        """Re-initializing an initialized store does not clear it."""
        store.add_chunks([_chunk("c1", "The derivative of x^2")])
        store._initialize()
        assert store.count() == 1


# ===========================================================================
# Adding chunks
# ===========================================================================

class TestAddChunks:
    """add_chunks appends new chunks and rebuilds on updates."""

    def test_returns_the_number_of_chunks_submitted(self, store):
        """The submitted chunk count is returned."""
        assert store.add_chunks([_chunk("c1", "derivative"), _chunk("c2", "integral")]) == 2
        assert store.count() == 2

    def test_empty_list_is_a_no_op(self, store):
        """Adding nothing leaves the index untouched."""
        assert store.add_chunks([]) == 0
        assert store.count() == 0

    def test_repeated_ids_upsert_instead_of_duplicating(self, store):
        """Re-adding an id replaces its content rather than duplicating it."""
        store.add_chunks([_chunk("c1", "derivative old"), _chunk("c2", "integral")])
        store.add_chunks([_chunk("c1", "derivative new")])
        assert store.count() == 2
        assert sorted(store._ids) == ["c1", "c2"]
        assert "derivative new" in store._documents
        assert "derivative old" not in store._documents

    def test_upsert_can_add_and_update_together(self, store):
        """A mixed batch of new and existing ids is handled in one rebuild."""
        store.add_chunks([_chunk("c1", "derivative old")])
        store.add_chunks([_chunk("c1", "derivative new"), _chunk("c2", "integral")])
        assert store.count() == 2
        assert set(store._ids) == {"c1", "c2"}


# ===========================================================================
# Search
# ===========================================================================

class TestSearch:
    """search returns scored, optionally filtered results."""

    def test_empty_index_returns_no_results(self, store):
        """Searching an empty index short-circuits."""
        assert store.search("derivative") == []

    def test_finds_the_semantically_closest_chunk(self, store):
        """The chunk sharing the query's axis ranks first."""
        store.add_chunks([
            _chunk("c1", "The derivative measures change"),
            _chunk("c2", "The integral accumulates area"),
        ])
        results = store.search("derivative", n_results=1)
        assert [result["id"] for result in results] == ["c1"]

    def test_result_shape_includes_relevance_and_distance(self, store):
        """Each hit carries id, text, metadata, relevance and distance."""
        store.add_chunks([_chunk("c1", "The derivative measures change")])
        result = store.search("derivative", n_results=1)[0]
        assert result["id"] == "c1"
        assert result["text"] == "The derivative measures change"
        assert result["metadata"]["topic_code"] == "MA-C2"
        assert result["relevance"] == pytest.approx(1.0)
        assert result["distance"] == pytest.approx(0.0)

    def test_orthogonal_match_scores_zero_relevance(self, store):
        """An unrelated chunk scores zero rather than a negative relevance."""
        store.add_chunks([_chunk("c1", "The integral accumulates area")])
        assert store.search("derivative", n_results=1)[0]["relevance"] == pytest.approx(0.0)

    def test_respects_the_result_limit(self, store):
        """No more than n_results hits are returned."""
        store.add_chunks([_chunk(f"c{i}", "derivative") for i in range(5)])
        assert len(store.search("derivative", n_results=2)) == 2

    def test_metadata_filter_excludes_non_matching_chunks(self, store):
        """A year filter drops chunks from other years."""
        store.add_chunks([
            _chunk("y11", "derivative for year 11", year="11"),
            _chunk("y12", "derivative for year 12", year="12"),
        ])
        results = store.search("derivative", n_results=5, filter_dict={"year": "11"})
        assert [result["id"] for result in results] == ["y11"]

    def test_filter_with_no_matches_returns_empty(self, store):
        """A filter that matches nothing returns no results."""
        store.add_chunks([_chunk("c1", "derivative", year="12")])
        assert store.search("derivative", filter_dict={"year": "9"}) == []


# ===========================================================================
# Topic lookup, count and clear
# ===========================================================================

class TestTopicLookup:
    """get_by_topic_code scans metadata rather than the vector index."""

    def test_returns_matching_chunks(self, store):
        """All chunks sharing a topic code are returned."""
        store.add_chunks([
            _chunk("c1", "derivative", topic_code="MA-C2"),
            _chunk("c2", "integral", topic_code="MA-C4"),
            _chunk("c3", "probability", topic_code="MA-C2"),
        ])
        results = store.get_by_topic_code("MA-C2")
        assert sorted(result["id"] for result in results) == ["c1", "c3"]
        assert "relevance" not in results[0]

    def test_unknown_topic_returns_empty(self, store):
        """An unmatched topic code yields no chunks."""
        store.add_chunks([_chunk("c1", "derivative")])
        assert store.get_by_topic_code("MA-ZZ") == []


class TestClear:
    """clear empties the index and rewrites the persisted state."""

    def test_removes_all_vectors_and_metadata(self, store, tmp_path):
        """After clearing, the store and its sidecar are empty."""
        store.add_chunks([_chunk("c1", "derivative")])
        store.clear()
        assert store.count() == 0
        assert store.get_by_topic_code("MA-C2") == []
        metadata = json.loads((tmp_path / FAISS_METADATA_FILE).read_text())
        assert metadata == {"ids": [], "documents": [], "metadatas": []}

    def test_search_after_clear_returns_nothing(self, store):
        """A cleared store answers searches with no results."""
        store.add_chunks([_chunk("c1", "derivative")])
        store.clear()
        assert store.search("derivative") == []


class TestSingleton:
    """VectorStore is a process-wide singleton."""

    def test_constructor_returns_the_same_instance(self, store):
        """Constructing the store again yields the cached instance."""
        assert VectorStore() is store
