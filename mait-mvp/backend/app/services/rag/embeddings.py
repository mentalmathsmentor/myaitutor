"""
Embedding model wrapper using sentence-transformers directly.
No ChromaDB dependency - works with FAISS vector store.
"""
import logging
from typing import List
import numpy as np

from .config import EMBEDDING_MODEL
from app.logging_config import log_event

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Wrapper for sentence-transformers embedding model."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def _initialize(self):
        """Initialize the embedding model (lazy loading)."""
        if self._initialized:
            return
        log_event(logger, "embedding_model_loading", model=EMBEDDING_MODEL)
        try:
            from sentence_transformers import SentenceTransformer
            self.model = SentenceTransformer(EMBEDDING_MODEL)
            self._initialized = True
            log_event(logger, "embedding_model_loaded", model=EMBEDDING_MODEL)
        except Exception as e:
            log_event(
                logger,
                "embedding_model_load_failed",
                level=logging.WARNING,
                model=EMBEDDING_MODEL,
                error_type=type(e).__name__,
                error_message=str(e),
            )
            self.model = None
            self._initialized = False

    def embed(self, texts: List[str]) -> np.ndarray:
        """
        Generate embeddings for a list of texts.

        Args:
            texts: List of text strings to embed.

        Returns:
            numpy array of shape (len(texts), embedding_dim).
        """
        self._initialize()
        if self.model is None:
            raise RuntimeError("Embedding model not loaded")
        embeddings = self.model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.astype(np.float32)

    def embed_query(self, query: str) -> np.ndarray:
        """
        Generate embedding for a single query string.

        Args:
            query: Query text to embed.

        Returns:
            numpy array of shape (1, embedding_dim).
        """
        return self.embed([query])


# Singleton instance (lazy initialization)
embedding_service = EmbeddingService()
