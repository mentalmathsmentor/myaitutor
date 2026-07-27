"""
Tests for the sentence-transformers embedding wrapper: lazy loading,
load-failure handling and float32 normalisation.
The transformer model is stubbed (see conftest.py) and patched per test.
"""
import importlib

import numpy as np
import pytest
from unittest.mock import MagicMock, patch

from app.services.rag.embeddings import EmbeddingService

embeddings_module = importlib.import_module("app.services.rag.embeddings")


class FakeModel:
    """Records encode() calls and returns float64 vectors."""

    def __init__(self, dimensions=4):
        self.dimensions = dimensions
        self.calls = []

    def encode(self, texts, convert_to_numpy=True, normalize_embeddings=True):
        self.calls.append({
            "texts": texts,
            "convert_to_numpy": convert_to_numpy,
            "normalize_embeddings": normalize_embeddings,
        })
        return np.ones((len(texts), self.dimensions), dtype=np.float64)


@pytest.fixture
def service():
    """The embedding singleton, reset to an uninitialized state."""
    instance = EmbeddingService()
    instance._initialized = False
    instance.model = None
    yield instance
    instance._initialized = False
    instance.model = None


class TestSingleton:
    """EmbeddingService is a process-wide singleton."""

    def test_constructor_returns_the_same_instance(self, service):
        """Constructing the service again yields the cached instance."""
        assert EmbeddingService() is service


class TestLazyLoading:
    """The model is loaded on first use and only once."""

    def test_model_is_loaded_on_first_embed(self, service):
        """The configured model name is passed to SentenceTransformer."""
        transformer_cls = MagicMock(return_value=FakeModel())
        with patch.dict(
            "sys.modules",
            {"sentence_transformers": MagicMock(SentenceTransformer=transformer_cls)},
        ):
            service.embed(["hello"])
        transformer_cls.assert_called_once_with(embeddings_module.EMBEDDING_MODEL)

    def test_model_is_not_reloaded_on_later_calls(self, service):
        """A second embed call reuses the loaded model."""
        transformer_cls = MagicMock(return_value=FakeModel())
        with patch.dict(
            "sys.modules",
            {"sentence_transformers": MagicMock(SentenceTransformer=transformer_cls)},
        ):
            service.embed(["hello"])
            service.embed(["again"])
        assert transformer_cls.call_count == 1

    def test_load_failure_is_surfaced_as_a_runtime_error(self, service):
        """A model that fails to load produces a clear runtime error."""
        transformer_cls = MagicMock(side_effect=OSError("no such model"))
        with patch.dict(
            "sys.modules",
            {"sentence_transformers": MagicMock(SentenceTransformer=transformer_cls)},
        ):
            with pytest.raises(RuntimeError, match="Embedding model not loaded"):
                service.embed(["hello"])

    def test_load_failure_leaves_the_service_uninitialized(self, service):
        """A failed load is retried on the next call rather than cached."""
        transformer_cls = MagicMock(side_effect=OSError("no such model"))
        with patch.dict(
            "sys.modules",
            {"sentence_transformers": MagicMock(SentenceTransformer=transformer_cls)},
        ):
            with pytest.raises(RuntimeError):
                service.embed(["hello"])
            with pytest.raises(RuntimeError):
                service.embed(["hello"])
        assert transformer_cls.call_count == 2


class TestEmbed:
    """embed() normalises and downcasts the model output."""

    def test_returns_float32_matrix(self, service):
        """Vectors are downcast to float32 for FAISS."""
        service.model = FakeModel()
        service._initialized = True
        embeddings = service.embed(["a", "b"])
        assert embeddings.dtype == np.float32
        assert embeddings.shape == (2, 4)

    def test_requests_normalized_numpy_embeddings(self, service):
        """The model is asked for normalized numpy vectors."""
        model = FakeModel()
        service.model = model
        service._initialized = True
        service.embed(["a"])
        assert model.calls[0]["convert_to_numpy"] is True
        assert model.calls[0]["normalize_embeddings"] is True

    def test_empty_input_produces_an_empty_matrix(self, service):
        """Embedding nothing yields a zero-row matrix."""
        service.model = FakeModel()
        service._initialized = True
        assert service.embed([]).shape[0] == 0


class TestEmbedQuery:
    """embed_query wraps a single string as a one-row matrix."""

    def test_returns_a_single_row(self, service):
        """A query embedding has exactly one row."""
        service.model = FakeModel()
        service._initialized = True
        assert service.embed_query("what is a derivative").shape == (1, 4)

    def test_passes_the_query_as_a_list(self, service):
        """The query is forwarded to the model as a one-element list."""
        model = FakeModel()
        service.model = model
        service._initialized = True
        service.embed_query("derivative")
        assert model.calls[0]["texts"] == ["derivative"]
